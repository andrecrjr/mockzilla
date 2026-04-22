import { describe, expect, it } from 'bun:test';
import { generateFromSchema, validateSchema } from '../../lib/schema-generator';

describe('lib/schema-generator', () => {
	describe('validateSchema', () => {
		it('returns valid for correct JSON schema', () => {
			const schema = JSON.stringify({ type: 'string' });
			const result = validateSchema(schema);
			expect(result.valid).toBe(true);
		});

		it('returns invalid for malformed JSON', () => {
			const result = validateSchema('{ invalid json }');
			expect(result.valid).toBe(false);
			expect(result.error).toBeDefined();
		});
	});

	describe('generateFromSchema', () => {
		it('generates simple types', () => {
			const schema = {
				type: 'object',
				properties: {
					name: { type: 'string' },
					age: { type: 'integer' },
				},
				required: ['name', 'age'],
			};
			const json = generateFromSchema(schema);
			const data = JSON.parse(json);

			expect(data).toHaveProperty('name');
			expect(typeof data.name).toBe('string');
			expect(data).toHaveProperty('age');
			expect(typeof data.age).toBe('number');
		});

		it('does not generate unwanted additional properties (fillProperties: false)', () => {
			const schema = {
				type: 'object',
				properties: {
					exact_field: { type: 'string', const: 'value' },
				},
			};
			const json = generateFromSchema(schema);
			const data = JSON.parse(json);

			expect(data).toHaveProperty('exact_field', 'value');
			// No other random keys should be generated
			expect(Object.keys(data).length).toBe(1);
		});

		it('generates data using x-faker extension', () => {
			const schema = {
				type: 'object',
				properties: {
					email: { type: 'string', 'x-faker': 'internet.email' },
				},
			};
			const json = generateFromSchema(schema);
			const data = JSON.parse(json);

			expect(data).toHaveProperty('email');
			expect(data.email).toMatch(/@/); // Simple validation that an email was generated
			expect(Object.keys(data).length).toBe(1);
		});

		it('handles post-processing templates {$.field}', () => {
			const schema = {
				type: 'object',
				properties: {
					firstName: { type: 'string' },
					fullName: {
						type: 'string',
						const: 'full name: {$.firstName}',
					},
				},
				required: ['firstName', 'fullName'],
			};

			const json = generateFromSchema(schema);
			const data = JSON.parse(json);

			expect(data.fullName).toContain('full name:');
			expect(data.fullName).toContain(data.firstName);
		});

		describe('formats', () => {
			it('supports password format', () => {
				const schema = {
					type: 'object',
					properties: {
						password: { type: 'string', format: 'password' },
					},
					required: ['password'],
				};
				const json = generateFromSchema(schema);
				const data = JSON.parse(json);
				expect(data.password).toBeDefined();
				expect(typeof data.password).toBe('string');
			});

			it('supports byte and binary formats', () => {
				const schema = {
					type: 'object',
					properties: {
						b: { type: 'string', format: 'byte' },
						bin: { type: 'string', format: 'binary' },
					},
					required: ['b', 'bin'],
				};
				const json = generateFromSchema(schema);
				const data = JSON.parse(json);
				expect(data.b).toBeDefined();
				expect(data.bin).toBeDefined();
			});

			it('supports uri and hostname formats', () => {
				const schema = {
					type: 'object',
					properties: {
						u: { type: 'string', format: 'uri' },
						h: { type: 'string', format: 'hostname' },
					},
					required: ['u', 'h'],
				};
				const json = generateFromSchema(schema);
				const data = JSON.parse(json);
				expect(data.u).toMatch(/^http/);
				expect(data.h).toBeDefined();
			});

			it('supports ip formats', () => {
				const schema = {
					type: 'object',
					properties: {
						ipv4: { type: 'string', format: 'ipv4' },
						ipv6: { type: 'string', format: 'ipv6' },
					},
					required: ['ipv4', 'ipv6'],
				};
				const json = generateFromSchema(schema);
				const data = JSON.parse(json);
				expect(data.ipv4).toMatch(/^\d+\.\d+\.\d+\.\d+$/);
				expect(data.ipv6).toBeDefined();
			});

			it('supports more realistic formats (phone, country, currency)', () => {
				const schema = {
					type: 'object',
					properties: {
						phone: { type: 'string', format: 'phone' },
						country: { type: 'string', format: 'country' },
						currency: { type: 'string', format: 'currency' },
					},
					required: ['phone', 'country', 'currency'],
				};
				const json = generateFromSchema(schema);
				const data = JSON.parse(json);
				expect(data.phone).toBeDefined();
				expect(data.country).toBeDefined();
				expect(data.currency).toBeDefined();
			});
		});

		it('supports faker direct calls in templates', () => {
			const schema = {
				type: 'object',
				properties: {
					email: { type: 'string', const: '{{faker.internet.email}}' },
				},
				required: ['email'],
			};
			const json = generateFromSchema(schema);
			const data = JSON.parse(json);
			expect(data.email).toContain('@');
		});
	});
});
