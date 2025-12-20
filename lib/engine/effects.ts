
import type { Effect, MatchContext } from './match';

/**
 * Interpolates a string value using context.
 * e.g. "{{input.sku}}" -> "SKU_123"
 */
function interpolate(value: unknown, context: MatchContext): unknown {
	if (typeof value === 'string' && value.startsWith('{{') && value.endsWith('}}')) {
		const path = value.slice(2, -2).trim();
		const parts = path.split('.');
		let current: unknown = context;
		for (const part of parts) {
			if (current === undefined || current === null || typeof current !== 'object') {
				return undefined;
			}
			current = (current as Record<string, unknown>)[part];
		}
		return current;
	}
	// Deep interpolation for objects
	if (typeof value === 'object' && value !== null) {
		if (Array.isArray(value)) {
			return value.map((v) => interpolate(v, context));
		}
		const result: Record<string, unknown> = {};
		for (const k in value) {
			if (Object.prototype.hasOwnProperty.call(value, k)) {
				result[k] = interpolate((value as Record<string, unknown>)[k], context);
			}
		}
		return result;
	}
	return value;
}

export function applyEffects(
	effects: Record<string, unknown> | Effect[],
	context: MatchContext,
): void {
	const effectsList: Effect[] = Array.isArray(effects)
		? effects
		: Object.entries(effects).map(([k, v]): Effect => {
				// Convert simple map syntax to strictly typed effects if possible
				// Case: "$db.cartItems.push": { ... }
				if (k.startsWith('$')) {
					const parts = k.substring(1).split('.');
					if (parts[0] === 'state' && parts[1] === 'set') {
						// "$state.set": { "key": "val" } -> multiple sets
						return { type: 'state.set', raw: v as Record<string, unknown> };
					}
					if (parts[0] === 'db' && parts[2] === 'push') {
						return { type: 'db.push', table: parts[1], value: v };
					}
					if (parts[0] === 'db' && parts[2] === 'update') {
						const val = v as { match: Record<string, unknown>; set: Record<string, unknown> };
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
			const table = context.tables[effect.table] || [];
			const resolvedValue = interpolate(effect.value, context);
			table.push(resolvedValue);
			context.tables[effect.table] = table;
		} else if (effect.type === 'db.update') {
			const table = context.tables[effect.table] || [];
			for (let i = 0; i < table.length; i++) {
				let matches = true;
				for (const [mk, mv] of Object.entries(effect.match)) {
					const row = table[i] as Record<string, unknown>;
					if (row[mk] != interpolate(mv, context)) {
						matches = false;
						break;
					}
				}
				if (matches) {
					for (const [sk, sv] of Object.entries(effect.set)) {
						const row = table[i] as Record<string, unknown>;
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
