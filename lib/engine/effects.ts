import { interpolate } from './interpolation';
import type { Effect, MatchContext } from './match';

export { interpolate };

export function applyEffects(
	effects: Record<string, unknown> | Effect[],
	context: MatchContext,
): void {
	const effectsList: Effect[] = Array.isArray(effects)
		? effects
		: Object.entries(effects).map(([k, v]): Effect => {
				if (k.startsWith('$')) {
					const parts = k.substring(1).split('.');
					if (parts[0] === 'state' && parts[1] === 'set') {
						return { type: 'state.set', raw: v as Record<string, unknown> };
					}
					if (parts[0] === 'db' && parts[2] === 'push') {
						return { type: 'db.push', table: parts[1], value: v };
					}
					if (parts[0] === 'db' && parts[2] === 'update') {
						const val = v as {
							match: Record<string, unknown>;
							set: Record<string, unknown>;
						};
						return {
							type: 'db.update',
							table: parts[1],
							match: val.match,
							set: val.set,
						};
					}
					if (parts[0] === 'db' && parts[2] === 'remove') {
						return {
							type: 'db.remove',
							table: parts[1],
							match: v as Record<string, unknown>,
						};
					}
				}
				return { type: 'unknown', raw: { [k]: v } };
			});

	for (const effect of effectsList) {
		if (effect.type === 'state.set') {
			if (effect.raw) {
				for (const [key, val] of Object.entries(effect.raw)) {
					context.state[key] = interpolate(val, context);
				}
			} else if (effect.key) {
				context.state[effect.key] = interpolate(effect.value, context);
			}
		} else if (effect.type === 'db.push') {
			if (!context.tables[effect.table]) {
				context.tables[effect.table] = [];
			}
			const table = context.tables[effect.table];
			const resolvedValue = interpolate(effect.value, context);
			table.push(resolvedValue);
		} else if (effect.type === 'db.update') {
			const table = context.tables[effect.table] || [];
			for (let i = 0; i < table.length; i++) {
				const row = table[i] as Record<string, unknown>;
				let matches = true;
				for (const [mk, mv] of Object.entries(effect.match)) {
					if (row[mk] != interpolate(mv, context)) {
						matches = false;
						break;
					}
				}
				if (matches) {
					for (const [sk, sv] of Object.entries(effect.set)) {
						row[sk] = interpolate(sv, context);
					}
				}
			}
			context.tables[effect.table] = table;
		} else if (effect.type === 'db.remove') {
			let table = context.tables[effect.table] || [];
			table = table.filter((item) => {
				const row = item as Record<string, unknown>;
				for (const [mk, mv] of Object.entries(effect.match)) {
					if (row[mk] == interpolate(mv, context)) {
						return false; // remove
					}
				}
				return true;
			});
			context.tables[effect.table] = table;
		}
	}
}
