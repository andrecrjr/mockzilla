
import { type MatchContext } from './match';

type Effect = 
  | { type: 'state.set'; key: string; value: any }
  | { type: 'db.push'; table: string; value: any }
  | { type: 'db.update'; table: string; match: Record<string, any>; set: Record<string, any> }
  | { type: 'db.remove'; table: string; match: Record<string, any> };

/**
 * Interpolates a string value using context.
 * e.g. "{{input.sku}}" -> "SKU_123"
 */
function interpolate(value: any, context: MatchContext): any {
	if (typeof value === 'string' && value.startsWith('{{') && value.endsWith('}}')) {
		const path = value.slice(2, -2).trim();
		const parts = path.split('.');
		let current: any = context;
		for (const part of parts) {
			if (current === undefined || current === null) return undefined;
			current = current[part];
		}
		return current;
	}
	// Deep interpolation for objects
	if (typeof value === 'object' && value !== null) {
		if (Array.isArray(value)) {
			return value.map(v => interpolate(v, context));
		}
		const result: any = {};
		for (const k in value) {
			result[k] = interpolate(value[k], context);
		}
		return result;
	}
	return value;
}

export function applyEffects(effects: Record<string, any> | any[], context: MatchContext): void {
	const effectsList = Array.isArray(effects) ? effects : Object.entries(effects).map(([k, v]) => {
		// Convert simple map syntax to strictly typed effects if possible
		// Case: "$db.cartItems.push": { ... }
		if (k.startsWith('$')) {
			const parts = k.substring(1).split('.');
			if (parts[0] === 'state' && parts[1] === 'set') {
				// "$state.set": { "key": "val" } -> multiple sets
				return { type: 'state.set', raw: v };
			}
			if (parts[0] === 'db' && parts[2] === 'push') {
				return { type: 'db.push', table: parts[1], value: v };
			}
			if (parts[0] === 'db' && parts[2] === 'update') {
				return { type: 'db.update', table: parts[1], match: v.match, set: v.set };
			}
			if (parts[0] === 'db' && parts[2] === 'remove') {
				return { type: 'db.remove', table: parts[1], match: v };
			}
		}
		return { type: 'unknown', raw: { [k]: v } }; 
	});

	for (const effect of effectsList) {
		if ((effect as any).type === 'state.set' && (effect as any).raw) {
			const sets = (effect as any).raw; 
			for (const [key, val] of Object.entries(sets)) {
				context.state[key] = interpolate(val, context);
			}
		} 
		else if (effect.type === 'db.push') {
			const table = context.db[effect.table] || [];
			const resolvedValue = interpolate(effect.value, context);
			table.push(resolvedValue);
			context.db[effect.table] = table;
		}
		else if (effect.type === 'db.update') {
			const table = context.db[effect.table] || [];
			// Iterate and update matching items
			for (let i = 0; i < table.length; i++) {
				let matches = true;
				for (const [mk, mv] of Object.entries(effect.match)) {
					if (table[i][mk] != interpolate(mv, context)) {
						matches = false;
						break;
					}
				}
				if (matches) {
					for (const [sk, sv] of Object.entries(effect.set)) {
						table[i][sk] = interpolate(sv, context);
					}
				}
			}
			context.db[effect.table] = table;
		}
		else if (effect.type === 'db.remove') {
			let table = context.db[effect.table] || [];
			table = table.filter((item: any) => {
				for (const [mk, mv] of Object.entries(effect.match)) {
					if (item[mk] == interpolate(mv, context)) {
						return false; // remove
					}
				}
				return true;
			});
			context.db[effect.table] = table;
		}
	}
}
