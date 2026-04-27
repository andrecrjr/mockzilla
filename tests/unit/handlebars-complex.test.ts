import { describe, expect, it } from 'bun:test';
import { replaceTemplates } from '../../lib/engine/interpolation';
import { faker } from '@faker-js/faker';

describe('Handlebars Complex Interpolation', () => {
	const context = {
		input: {
			query: { name: 'Gemini', count: 42, active: true, items: ['apple', 'banana'] },
			params: { '0': 'test-path' },
			headers: { 'user-agent': 'bun-test' },
		},
		$: {
			query: { name: 'Gemini', count: 42, active: true, items: ['apple', 'banana'] },
			params: { '0': 'test-path' },
			headers: { 'user-agent': 'bun-test' },
		},
		query: { name: 'Gemini', count: 42, active: true, items: ['apple', 'banana'] },
		params: { '0': 'test-path' },
		headers: { 'user-agent': 'bun-test' },
		faker,
	};

	describe('Simple Interpolation', () => {
		it('should handle simple path interpolation with $. syntax', () => {
			const data = 'Hello {{$.query.name}}';
			const result = replaceTemplates(data, context);
			expect(result).toBe('Hello Gemini');
		});

		it('should handle nested path interpolation', () => {
			const data = 'Path is {{$.params.[0]}}';
			const result = replaceTemplates(data, context);
			expect(result).toBe('Path is test-path');
		});

		it('should handle headers with special characters', () => {
			const data = 'UA: {{$.headers.[user-agent]}}';
			const result = replaceTemplates(data, context);
			expect(result).toBe('UA: bun-test');
		});
	});

	describe('Handlebars Logic', () => {
		it('should handle #if logic (true case)', () => {
			const data = '{{#if $.query.name}}Has Name{{else}}No Name{{/if}}';
			const result = replaceTemplates(data, context);
			expect(result).toBe('Has Name');
		});

		it('should handle #if logic (false case)', () => {
			const data = '{{#if $.query.nonexistent}}Exists{{else}}Not Found{{/if}}';
			const result = replaceTemplates(data, context);
			expect(result).toBe('Not Found');
		});

		it('should handle #each logic', () => {
			const data = 'Items: {{#each $.query.items}}{{@index}}:{{this}} {{/each}}';
			const result = replaceTemplates(data, context);
			expect(result).toBe('Items: 0:apple 1:banana ');
		});
	});

	describe('Complex JSON with Handlebars', () => {
		it('should handle Handlebars logic inside valid JSON string and return parsed object', () => {
			// Using raw string to control quoting
			const data = `{
				"message": "Hello {{#if $.query.name}}{{$.query.name}}{{else}}Stranger{{/if}}!",
				"count": {{$.query.count}}
			}`;
			const result = replaceTemplates(data, context) as { message: string; count: number };
			
			expect(typeof result).toBe('object');
			expect(result.message).toBe('Hello Gemini!');
			expect(result.count).toBe(42); 
		});

		it('should preserve types for numbers and booleans inside Handlebars logic', () => {
			const data = `{
				"isActive": {{#if $.query.active}}true{{else}}false{{/if}},
				"val": {{#if $.query.name}}100{{else}}0{{/if}}
			}`;
			const result = replaceTemplates(data, context) as { isActive: boolean; val: number };

			expect(typeof result).toBe('object');
			expect(result.isActive).toBe(true);
			expect(result.val).toBe(100);
		});

		it('should handle complex nested structures with #each and logic', () => {
			const data = `{
				"user": "{{$.query.name}}",
				"items": [
					{{#each $.query.items}}
					{
						"id": {{@index}},
						"name": "{{this}}",
						"isFirst": {{#if @first}}true{{else}}false{{/if}}
					}{{#unless @last}},{{/unless}}
					{{/each}}
				]
			}`;
			const result = replaceTemplates(data, context) as { 
				user: string; 
				items: Array<{ id: number; name: string; isFirst: boolean }> 
			};

			expect(result.user).toBe('Gemini');
			expect(result.items).toHaveLength(2);
			expect(result.items[0].id).toBe(0);
			expect(result.items[0].name).toBe('apple');
			expect(result.items[0].isFirst).toBe(true);
			expect(result.items[1].id).toBe(1);
			expect(result.items[1].name).toBe('banana');
			expect(result.items[1].isFirst).toBe(false);
		});
	});

	describe('Faker Helpers', () => {
		it('should work with faker helper', () => {
			const data = '{{faker "string.uuid"}}';
			const result = replaceTemplates(data, context) as string;
			expect(result).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
		});

		it('should work with direct faker access', () => {
			const data = '{{faker.string.uuid}}';
			const result = replaceTemplates(data, context) as string;
			expect(result).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
		});
	});

	describe('Advanced Logic Helpers', () => {
		it('should handle and', () => {
			expect(replaceTemplates('{{#if (and true true)}}YES{{else}}NO{{/if}}', context)).toBe('YES');
			expect(replaceTemplates('{{#if (and true false)}}YES{{else}}NO{{/if}}', context)).toBe('NO');
		});

		it('should handle or', () => {
			expect(replaceTemplates('{{#if (or false true)}}YES{{else}}NO{{/if}}', context)).toBe('YES');
			expect(replaceTemplates('{{#if (or false false)}}YES{{else}}NO{{/if}}', context)).toBe('NO');
		});

		it('should handle not', () => {
			expect(replaceTemplates('{{#if (not false)}}YES{{else}}NO{{/if}}', context)).toBe('YES');
		});

		it('should handle default', () => {
			expect(replaceTemplates('{{default undefined "fallback"}}', context)).toBe('fallback');
			expect(replaceTemplates('{{default "actual" "fallback"}}', context)).toBe('actual');
		});
	});

	describe('Temporal Helpers', () => {
		it('should handle now', () => {
			const result = replaceTemplates('{{now}}', context) as string;
			expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/);
		});

		it('should handle dateFormat', () => {
			const result = replaceTemplates('{{dateFormat "2024-01-01T12:00:00Z" "yyyy-MM-dd"}}', context);
			expect(result).toBe('2024-01-01');
		});

		it('should handle dateAdd', () => {
			const result = replaceTemplates('{{dateFormat (dateAdd "2024-01-01T12:00:00Z" 5 "days") "yyyy-MM-dd"}}', context);
			expect(result).toBe('2024-01-06');
		});

		it('should handle dateSub', () => {
			const result = replaceTemplates('{{dateFormat (dateSub "2024-01-10T12:00:00Z" 5 "days") "yyyy-MM-dd"}}', context);
			expect(result).toBe('2024-01-05');
		});
	});

	describe('Collection Wizards', () => {
		const ctx = {
			...context,
			db: {
				users: [
					{ id: 2, role: 'admin' },
					{ id: 1, role: 'user' },
					{ id: 3, role: 'admin' }
				]
			}
		};

		it('should filter arrays', () => {
			const data = '{{#each (filter db.users "role" "admin")}}{{this.id}},{{/each}}';
			expect(replaceTemplates(data, ctx)).toBe('2,3,');
		});

		it('should sort arrays', () => {
			const data = '{{#each (sort db.users "id" "asc")}}{{this.id}},{{/each}}';
			expect(replaceTemplates(data, ctx)).toBe('1,2,3,');
		});

		it('should slice arrays', () => {
			const data = '{{#each (slice (sort db.users "id" "asc") 0 2)}}{{this.id}},{{/each}}';
			expect(replaceTemplates(data, ctx)).toBe('1,2,');
		});

		it('should join arrays', () => {
			const data = '{{join $.query.items " | "}}';
			expect(replaceTemplates(data, ctx)).toBe('apple | banana');
		});
	});

	describe('String & Number Stylists', () => {
		it('should slugify', () => {
			expect(replaceTemplates('{{slugify " Hello World! 123 "}}', context)).toBe('hello-world-123');
		});

		it('should truncate', () => {
			expect(replaceTemplates('{{truncate "Hello World" 5}}', context)).toBe('Hello...');
			expect(replaceTemplates('{{truncate "Hi" 5}}', context)).toBe('Hi');
		});

		it('should format currency', () => {
			expect(replaceTemplates('{{currency 1234.56 "USD" "en-US"}}', context)).toBe('$1,234.56');
			expect(replaceTemplates('{{currency 1234.56 "EUR" "de-DE"}}', context)).toBe('1.234,56 €');
		});

		it('should format toFixed', () => {
			expect(replaceTemplates('{{toFixed 12.3456 2}}', context)).toBe(12.35);
			// String context
			expect(replaceTemplates('Result: {{toFixed 12.3456 2}}', context)).toBe('Result: 12.35');
		});
	});
});
