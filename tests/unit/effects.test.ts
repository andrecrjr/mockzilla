import { describe, expect, it } from 'bun:test';
import { applyEffects } from '../../lib/engine/effects';
import type { MatchContext } from '../../lib/engine/match';

describe('applyEffects', () => {
    it('should handle state.set with key/value', () => {
        const context: MatchContext = {
            state: {},
            tables: {},
            input: {}
        };
        applyEffects([{ type: 'state.set', key: 'foo', value: 'bar' }], context);
        expect(context.state.foo).toBe('bar');
    });

    it('should handle state.set with raw object', () => {
        const context: MatchContext = {
            state: {},
            tables: {},
            input: {}
        };
        applyEffects([{ type: 'state.set', raw: { a: 1, b: '{{input.body.name}}' } }], {
            ...context,
            input: { body: { name: 'Gemini' } }
        } as any);
        expect(context.state.a).toBe(1);
        expect(context.state.b).toBe('Gemini');
    });

    it('should handle db.push', () => {
        const context: MatchContext = {
            state: {},
            tables: {},
            input: {}
        };
        applyEffects([{ type: 'db.push', table: 'users', value: { id: 1, name: 'A' } }], context);
        expect(context.tables.users).toHaveLength(1);
        expect(context.tables.users[0]).toEqual({ id: 1, name: 'A' });

        // Push to existing table
        applyEffects([{ type: 'db.push', table: 'users', value: { id: 2, name: 'B' } }], context);
        expect(context.tables.users).toHaveLength(2);
    });

    it('should handle db.update with non-matching rows and multiple conditions', () => {
        const context: MatchContext = {
            state: {},
            tables: {
                users: [
                    { id: 1, name: 'A', role: 'user' },
                    { id: 2, name: 'B', role: 'admin' }
                ]
            },
            input: {}
        };
        applyEffects([{ 
            type: 'db.update', 
            table: 'users', 
            match: { id: 1, role: 'admin' }, // Won't match because role is user
            set: { name: 'Updated' } 
        }], context);
        
        expect(context.tables.users[0].name).toBe('A');
    });

    it('should handle db.remove with multiple conditions', () => {
        const context: MatchContext = {
            state: {},
            tables: {
                users: [
                    { id: 1, name: 'A', role: 'user' },
                    { id: 2, name: 'B', role: 'admin' }
                ]
            },
            input: {}
        };
        applyEffects([{ 
            type: 'db.remove', 
            table: 'users', 
            match: { id: 2, role: 'admin' }
        }], context);
        
        expect(context.tables.users).toHaveLength(1);
        expect(context.tables.users[0].id).toBe(1);
    });

    it('should handle legacy object-style effects', () => {
        const context: MatchContext = {
            state: {},
            tables: {
                items: [{ id: 1, status: 'old' }]
            },
            input: {}
        };

        const effects = {
            '$state.set': { theme: 'dark' },
            '$db.users.push': { id: 10 },
            '$db.items.update': {
                match: { id: 1 },
                set: { status: 'new' }
            },
            '$db.items.remove': { id: 1 },
            'unknown.key': 'val'
        };

        applyEffects(effects as any, context);

        expect(context.state.theme).toBe('dark');
        expect(context.tables.users).toHaveLength(1);
        expect(context.tables.users[0].id).toBe(10);
        // items: 1 record, updated then removed.
        // Wait, the order in Object.entries might matter, but usually it's insertion order.
        // items[0] was {id:1, status:'old'}
        // update matches id:1 -> {id:1, status:'new'}
        // remove matches id:1 -> []
        expect(context.tables.items).toHaveLength(0);
    });
});
