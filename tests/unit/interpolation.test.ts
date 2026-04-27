import { describe, expect, it } from 'bun:test';
import { replaceTemplates, interpolate } from '../../lib/engine/interpolation';

describe('interpolation engine', () => {
    const context = {
        state: { count: 10, user: { name: 'Gemini' } },
        tables: { items: [1, 2, 3] },
        input: {
            query: { id: 'abc' },
            body: { active: true }
        },
        // Shortcuts like in processor.ts
        query: { id: 'abc' },
        body: { active: true },
        $: {
            query: { id: 'abc' },
            body: { active: true }
        }
    };

    describe('replaceTemplates', () => {
        it('should return raw data for non-string non-object', () => {
            expect(replaceTemplates(123)).toBe(123);
            expect(replaceTemplates(true)).toBe(true);
        });

        it('should handle object input', () => {
            const data = { msg: 'Hello {{state.user.name}}' };
            expect(replaceTemplates(data, context)).toEqual({ msg: 'Hello Gemini' });
        });

        it('should handle Handlebars resulting in non-JSON string', () => {
            const result = replaceTemplates('User: {{state.user.name}}', context);
            expect(result).toBe('User: Gemini');
        });

        it('should handle Handlebars resulting in valid JSON string', () => {
            const result = replaceTemplates('{"active": {{{input.body.active}}} }', context);
            expect(result).toEqual({ active: true });
        });

        it('should preserve types for JSON strings without Handlebars', () => {
            expect(replaceTemplates('123')).toBe(123);
            expect(replaceTemplates('{"a":1}')).toEqual({ a: 1 });
        });

        it('should fallback to interpolate for non-JSON strings', () => {
            expect(replaceTemplates('Plain text', context)).toBe('Plain text');
        });
    });

    describe('interpolate', () => {
        it('should handle arrays', () => {
            const result = interpolate(['{{state.count}}', 'fixed'], context);
            expect(result).toEqual([10, 'fixed']);
        });

        it('should handle objects', () => {
            const result = interpolate({ count: '{{state.count}}', name: '{{state.user.name}}' }, context);
            expect(result).toEqual({ count: 10, name: 'Gemini' });
        });

        it('should handle embedded templates', () => {
            const result = interpolate('Count: {{state.count}}, ID: {{$.query.id}}', context);
            expect(result).toBe('Count: 10, ID: abc');
        });

        it('should handle exact match for $ syntax', () => {
            expect(interpolate('{{$.query.id}}', context)).toBe('abc');
        });
    });

    describe('resolveTemplatePath', () => {
        it('should handle basic arithmetic', () => {
            expect(interpolate('{{state.count + 5}}', context)).toBe(15);
            expect(interpolate('{{state.count - 2}}', context)).toBe(8);
        });

        it('should handle arithmetic with literals', () => {
            expect(interpolate('{{5 + 5}}', context)).toBe(10);
        });

        it('should handle arithmetic with string numbers', () => {
            const ctx = { state: { val: "10" } };
            expect(interpolate('{{state.val + 1}}', ctx as any)).toBe(11);
        });

        it('should return raw template if arithmetic fails (NaN)', () => {
            expect(interpolate('{{state.count + "not-a-number"}}', context)).toBe('{{state.count + "not-a-number"}}');
        });
    });

    describe('resolveSinglePath', () => {
        it('should handle numeric literals', () => {
            expect(interpolate('{{123.45}}', context)).toBe(123.45);
            expect(interpolate('{{-10}}', context)).toBe(-10);
        });

        it('should handle string literals', () => {
            expect(interpolate('{{"hello"}}', context)).toBe('hello');
            expect(interpolate('{{\'world\'}}', context)).toBe('world');
        });

        it('should normalize db to tables', () => {
            expect(interpolate('{{db.items.length}}', context)).toBe(3);
            expect(interpolate('{{db.items[0]}}', context)).toBe(1);
        });

        it('should normalize $. prefix', () => {
            expect(interpolate('{{$.query.id}}', context)).toBe('abc');
        });

        it('should handle function calls (faker style)', () => {
            const ctx = {
                faker: {
                    test: (args: any) => args !== undefined ? (typeof args === 'object' ? args.val : args) : 'default'
                }
            };
            expect(interpolate('{{faker.test()}}', ctx as any)).toBe('default');
            expect(interpolate('{{faker.test({"val": "hi"})}}', ctx as any)).toBe('hi');
            expect(interpolate('{{faker.test(123)}}', ctx as any)).toBe(123);
            expect(interpolate('{{faker.test("string")}}', ctx as any)).toBe('string');
            expect(interpolate('{{faker.test(true)}}', ctx as any)).toBe(true);
        });

        it('should handle function calls with non-JSON arguments', () => {
            const ctx = {
                faker: {
                    test: (args: any) => args
                }
            };
            // This will fail JSON.parse and hit the fallback
            expect(interpolate('{{faker.test(just-a-string)}}', ctx as any)).toBe('just-a-string');
            // This will fail JSON.parse (octal) but pass numeric regex
            expect(interpolate('{{faker.test(0123)}}', ctx as any)).toBe(123);
        });

        it('should fallback to resolving directly from context if path not found in standard roots', () => {
            const ctx = {
                "flat-key": "flat-val"
            };
            expect(interpolate('{{flat-key}}', ctx as any)).toBe('flat-val');
        });
    });
});
