
import { describe, expect, test } from "bun:test";
import { resolvePath } from '../utils/path-resolver';
import { matches } from './match';
import type { MatchContext } from './match';

describe("Engine Interpolation", () => {
    const context = {
        state: {
            users: [{ id: 1, name: "Alice" }],
            deep: { nested: { val: "ok" } }
        },
        tables: {
            items: [{ id: 100, name: "Item1" }]
        },
        input: {
            body: {
                tags: ["a", "b"],
                complex: { id: 99 }
            },
            query: {},
            params: {},
            headers: {}
        }
    } as unknown as MatchContext;

    test("resolvePath: simple state access", () => {
        expect(resolvePath("state.deep.nested.val", context)).toBe("ok");
    });

    test("resolvePath: state array access", () => {
        expect(resolvePath("state.users[0].name", context)).toBe("Alice");
    });

    test("resolvePath: input nested array access", () => {
        expect(resolvePath("input.body.tags[0]", context)).toBe("a");
        expect(resolvePath("input.body.tags[1]", context)).toBe("b");
    });

    // Test alias logic handled in matches/resolveOp?
    // match.ts handles the db alias. Let's test matches() to verify alias.
    test("matches: db alias and array index in conditions", () => {
        const result = matches(
            { "db.items[0].name": "Item1" }, 
            context
        );
        expect(result).toBe(true);
    });

    test("matches: deep nested input check", () => {
         const result = matches(
            { "input.body.complex.id": 99 },
            context
         );
         expect(result).toBe(true);
    });

    test("matches: array contains with deep path", () => {
        const result = matches(
             [{ 
                 type: 'contains',
                 field: 'input.body.tags',
                 value: 'a'
             }],
             context
        );
        expect(result).toBe(true);
    });

});
