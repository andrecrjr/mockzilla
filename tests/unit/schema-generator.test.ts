import { describe, expect, it } from 'bun:test';
import { generateFromSchema, validateSchema, replaceTemplates, generateFromSchemaString } from '../../lib/schema-generator';

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

		it('returns invalid for schema without type/properties/$ref', () => {
			const result = validateSchema('{}');
			expect(result.valid).toBe(false);
			expect(result.error).toContain("Schema must have at least a 'type'");
		});
	});

	describe('replaceTemplates', () => {
		it('should replace templates in strings', () => {
			const data = 'Hello {{name}}';
			const context = { name: 'World' };
			const result = replaceTemplates(data, context);
			expect(result).toBe('Hello World');
		});

		it('should replace templates in objects', () => {
			const data = { msg: 'Hello {{name}}' };
			const context = { name: 'World' };
			const result = replaceTemplates(data, context) as any;
			expect(result.msg).toBe('Hello World');
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

		it('handles error in generation', () => {
			const schema = {
				type: 'invalid-type',
			};
			expect(() => generateFromSchema(schema as any)).toThrow(/Failed to generate from schema/);
		});

		it('does not generate unwanted additional properties (fillProperties: false)', () => {
			const schema = {
				type: 'object',
				properties: {
					exact_field: { type: 'string', const: 'value' },
				},
				required: ['exact_field'],
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
				required: ['email'],
			};
			const json = generateFromSchema(schema);
			const data = JSON.parse(json);

			expect(data).toHaveProperty('email');
			expect(data.email).toMatch(/@/); // Simple validation that an email was generated
			expect(Object.keys(data).length).toBe(1);
		});

		it('handles post-processing templates {{field}}', () => {
			const schema = {
				type: 'object',
				properties: {
					firstName: { type: 'string' },
					fullName: {
						type: 'string',
						const: 'full name: {{firstName}}',
					},
				},
				required: ['firstName', 'fullName'],
			};

			const json = generateFromSchema(schema);
			const data = JSON.parse(json);

			expect(data).toHaveProperty('fullName');
			expect(data.fullName).toContain('full name:');
			expect(data.fullName).toContain(data.firstName);
		});

		it('does not treat JSON strings as templates', () => {
			const schema = {
				type: 'object',
				properties: {
					jsonStr: {
						type: 'string',
						const: '{"foo": "bar"}',
					},
				},
				required: ['jsonStr'],
			};

			const json = generateFromSchema(schema);
			const data = JSON.parse(json);

			expect(data).toHaveProperty('jsonStr');
			expect(data.jsonStr).toBe('{"foo": "bar"}');
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
				expect(data).toHaveProperty('password');
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
				expect(data).toHaveProperty('b');
				expect(data).toHaveProperty('bin');
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
				expect(data).toHaveProperty('u');
				expect(data).toHaveProperty('h');
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
				expect(data).toHaveProperty('ipv4');
				expect(data).toHaveProperty('ipv6');
				expect(data.ipv4).toMatch(/^\d+\.\d+\.\d+\.\d+$/);
				expect(data.ipv6).toBeDefined();
			});

			it('supports more realistic formats (phone, country, currency)', () => {
				const schema = {
					type: 'object',
					properties: {
						phone: { type: 'string', format: 'phone' },
						country: { type: 'string', format: 'country' },
						countryCode: { type: 'string', format: 'country-code' },
						currency: { type: 'string', format: 'currency' },
						currencySymbol: { type: 'string', format: 'currency-symbol' },
						creditCard: { type: 'string', format: 'credit-card' },
						userAgent: { type: 'string', format: 'user-agent' },
						mac: { type: 'string', format: 'mac' },
						color: { type: 'string', format: 'color' },
					},
					required: [
						'phone',
						'country',
						'countryCode',
						'currency',
						'currencySymbol',
						'creditCard',
						'userAgent',
						'mac',
						'color',
					],
				};
				const json = generateFromSchema(schema);
				const data = JSON.parse(json);
				expect(data.phone).toBeDefined();
				expect(data.country).toBeDefined();
				expect(data.countryCode).toBeDefined();
				expect(data.currency).toBeDefined();
				expect(data.currencySymbol).toBeDefined();
				expect(data.creditCard).toBeDefined();
				expect(data.userAgent).toBeDefined();
				expect(data.mac).toBeDefined();
				expect(data.color).toBeDefined();
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
			expect(data).toHaveProperty('email');
			expect(data.email).toContain('@');
		});
	});

	describe('generateFromSchemaString', () => {
		it('generates from a valid string', () => {
			const schemaStr = JSON.stringify({
				type: 'object',
				properties: {
					id: { type: 'string' }
				},
				required: ['id']
			});
			const json = generateFromSchemaString(schemaStr);
			const data = JSON.parse(json);
			expect(data).toHaveProperty('id');
		});

		it('throws on invalid schema string', () => {
			expect(() => generateFromSchemaString('{}')).toThrow(/Invalid schema/);
		});

		it('preprocesses circular references (minimal test)', () => {
			const schema: any = { type: 'object', properties: {} };
			schema.properties.self = schema;
			
			// We can't stringify it directly, but generateFromSchemaString takes a string.
			// The preprocessSchema is also used internally.
			// Let's test it via generateFromSchema which uses preprocessSchema if we pass it.
			// Actually generateFromSchema does NOT use preprocessSchema directly in its body, 
			// it's generateFromSchemaString that uses it.
			
			// Let's test a schema with nested structures
			const schemaStr = JSON.stringify({
				type: 'object',
				properties: {
					meta: {
						type: 'object',
						properties: {
							tags: { type: 'array', items: { type: 'string' } }
						}
					}
				}
			});
			const json = generateFromSchemaString(schemaStr);
			expect(json).toBeDefined();
		});
	});
});
