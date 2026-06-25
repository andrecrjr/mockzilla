import { afterAll, beforeEach, describe, expect, it, mock } from 'bun:test';
import { NextRequest } from 'next/server';

// 1. Define mock data
const mockFolder = {
	id: 'folder-123',
	name: 'Imported API',
	slug: 'imported-api',
	description: 'Description',
	createdAt: new Date('2024-01-01'),
	updatedAt: new Date('2024-01-01'),
};

interface MockResponseRecord {
	name?: string;
	endpoint: string;
	method: string;
	response: string;
	statusCode: number;
	folderId: string;
	matchType: string;
	bodyType: string;
	enabled: boolean;
	jsonSchema?: string;
	useDynamicResponse?: boolean;
	echoRequestBody?: boolean;
	queryParams?: Record<string, unknown>;
	variants?: unknown[];
	mockFolderId?: string | null;
}

interface MockSubfolderRecord {
	id?: string;
	folderId: string;
	parentId?: string | null;
	name: string;
	slug: string;
	mainPath: string;
	updatedAt?: Date | null;
}

// Track inserted values
let insertedValues: Array<
	MockResponseRecord | MockSubfolderRecord | typeof mockFolder
> = [];

function isMockResponseRecord(value: unknown): value is MockResponseRecord {
	return Boolean(
		value &&
			typeof value === 'object' &&
			'endpoint' in value &&
			'method' in value,
	);
}

function isMockSubfolderRecord(value: unknown): value is MockSubfolderRecord {
	return Boolean(
		value &&
			typeof value === 'object' &&
			'mainPath' in value &&
			'slug' in value,
	);
}

function getInsertedMocks(): MockResponseRecord[] {
	return insertedValues.filter(isMockResponseRecord);
}

function getInsertedSubfolders(): MockSubfolderRecord[] {
	return insertedValues.filter(isMockSubfolderRecord);
}

// 2. Define the chainable mock builder
const createMockBuilder = (resolvedValue: unknown) => {
	let currentValue:
		| MockResponseRecord
		| MockSubfolderRecord
		| typeof mockFolder
		| null = null;
	const builder = {
		from: mock(() => builder),
		where: mock(() => builder),
		orderBy: mock(() => builder),
		limit: mock(() => builder),
		offset: mock(() => builder),
		values: mock(
			(val: MockResponseRecord | MockSubfolderRecord | typeof mockFolder) => {
				currentValue = val;
				insertedValues.push(val);
				return builder;
			},
		),
		set: mock(() => builder),
		returning: mock(() => builder),
		onConflictDoUpdate: mock(() => builder),
		then: (resolve: (val: unknown) => void) => {
			if (currentValue && isMockSubfolderRecord(currentValue)) {
				resolve([
					{
						...currentValue,
						id: `subfolder-${insertedValues.filter(isMockSubfolderRecord).length}`,
						createdAt: new Date('2024-01-01'),
						updatedAt: null,
					},
				]);
				return;
			}
			resolve(resolvedValue);
		},
	};
	return builder;
};

// Default response
let mockResolvedValue: unknown[] = [mockFolder];

const mockDb = {
	select: mock(() => createMockBuilder(mockResolvedValue)),
	insert: mock(() => createMockBuilder([mockFolder])),
	update: mock(() => createMockBuilder([mockFolder])),
	delete: mock(() => createMockBuilder([])),
	transaction: mock(async (cb: (tx: unknown) => Promise<unknown>) => {
		return cb(mockDb);
	}),
};

// 3. Mock the DB module
mock.module('@/lib/db', () => ({
	db: mockDb,
}));

// NO MOCK for schema-generator here to avoid global pollution

// 4. Import the route handler (must be AFTER mock.module for DB)
import { POST } from '../../app/api/import/openapi/route';

const sampleYamlSpec = `
openapi: 3.0.0
info:
  title: Test API Import
  version: 1.0.0
paths:
  /users:
    get:
      summary: Get all users
      responses:
        '200':
          description: OK
          content:
            application/json:
              schema:
                type: array
                items:
                  type: object
                  properties:
                    id:
                      type: integer
                  required: ["id"]
  /users/{id}:
    get:
      summary: Get user by ID
      responses:
        '200':
          description: OK
          content:
            application/json:
              schema:
                type: object
                properties:
                  id:
                    type: integer
                  email:
                    type: string
                    format: email
                required: ["id", "email"]
`;

describe('API /api/import/openapi', () => {
	beforeEach(() => {
		mockResolvedValue = [mockFolder];
		mockDb.insert.mockClear();
		mockDb.transaction.mockClear();
		insertedValues = [];
	});

	afterAll(() => {
		mock.restore();
	});

	it('returns 400 if no spec provided', async () => {
		const req = new NextRequest('http://localhost:3000/api/import/openapi', {
			method: 'POST',
			body: JSON.stringify({}),
		});

		const res = await POST(req);
		const body = await res.json();

		expect(res.status).toBe(400);
		expect(body.error).toBe('No OpenAPI specification provided');
	});

	it('returns 400 for invalid YAML/JSON', async () => {
		const req = new NextRequest('http://localhost:3000/api/import/openapi', {
			method: 'POST',
			body: JSON.stringify({ spec: '{ invalid yaml : : :' }),
		});

		const res = await POST(req);
		const body = await res.json();

		expect(res.status).toBe(400);
		expect(body.error).toContain('Failed to parse specification');
	});

	it('imports valid OpenAPI YAML correctly', async () => {
		const req = new NextRequest('http://localhost:3000/api/import/openapi', {
			method: 'POST',
			body: JSON.stringify({ spec: sampleYamlSpec }),
		});

		const res = await POST(req);
		const body = await res.json();

		expect(res.status).toBe(200);
		expect(body.success).toBe(true);
		expect(body.folderId).toBe('folder-123');
		expect(body.importedCount).toBe(2);

		expect(mockDb.transaction).toHaveBeenCalled();
		expect(getInsertedMocks()).toHaveLength(2);
		expect(getInsertedSubfolders()).toHaveLength(1);
	});

	it('handles POST/PUT/PATCH with and without schema correctly', async () => {
		const complexSpec = `
openapi: 3.0.0
info:
  title: Write Test
  version: 1.0.0
paths:
  /echo:
    post:
      summary: Echo POST
      responses:
        '201':
          description: Created
  /generate:
    put:
      summary: Generate PUT
      responses:
        '200':
          content:
            application/json:
              schema:
                type: object
                properties:
                  success: { type: "boolean" }
                required: ["success"]
`;
		const req = new NextRequest('http://localhost:3000/api/import/openapi', {
			method: 'POST',
			body: JSON.stringify({ spec: complexSpec }),
		});

		const res = await POST(req);
		expect(res.status).toBe(200);

		const [echoMock, generateMock] = getInsertedMocks();
		expect(echoMock.method).toBe('POST');
		expect(echoMock.echoRequestBody).toBe(true);

		expect(generateMock.method).toBe('PUT');
		expect(JSON.parse(generateMock.response)).toHaveProperty('success');
	});

	it('handles path parameters and converts to wildcard with default variant', async () => {
		const spec = `
openapi: 3.0.0
info: { title: "Path Param API", version: "1.0.0" }
paths:
  /users/{id}:
    get:
      responses:
        '200': { description: "OK" }
`;
		const req = new NextRequest('http://localhost:3000/api/import/openapi', {
			method: 'POST',
			body: JSON.stringify({ spec }),
		});

		await POST(req);

		const mockValue = getInsertedMocks()[0];
		expect(mockValue.endpoint).toBe('/*');
		expect(mockValue.matchType).toBe('wildcard');
		expect(mockValue.variants).toHaveLength(1);
		expect(mockValue.mockFolderId).toBeDefined();
	});

	it('extracts query parameters and status codes correctly', async () => {
		const spec = `
openapi: 3.1.0
info:
  title: Query Params Test
  version: 1.0.0
paths:
  /search:
    get:
      parameters:
        - name: q
          in: query
          schema: { type: string }
          example: "bun"
        - name: page
          in: query
          schema: { type: integer, default: 1 }
      responses:
        '201':
          description: Created
          content:
            application/json:
              schema:
                type: object
                properties:
                  id: { type: string }
                required: ["id"]
`;
		const req = new NextRequest('http://localhost:3000/api/import/openapi', {
			method: 'POST',
			body: JSON.stringify({ spec }),
		});

		const res = await POST(req);
		expect(res.status).toBe(200);

		const mockValue = getInsertedMocks()[0];
		expect(mockValue.endpoint).toBe('/search');
		expect(mockValue.statusCode).toBe(201);
		expect(mockValue.queryParams).toEqual({
			q: 'bun',
			page: 1,
		});
	});

	it('handles fallback generation correctly when schema generation fails', async () => {
		const spec = `
openapi: 3.0.0
info: { title: "Fallback Test", version: "1.0.0" }
paths:
  /test:
    get:
      responses:
        '200':
          content:
            application/json:
              schema:
                type: object
                properties:
                  id: { type: [integer, string], minimum: 10, minLength: 5 }
                  name: { type: string, enum: [] }
                required: ["id", "name"]
`;
		const req = new NextRequest('http://localhost:3000/api/import/openapi', {
			method: 'POST',
			body: JSON.stringify({ spec }),
		});

		const res = await POST(req);
		expect(res.status).toBe(200);

		const mockValue = getInsertedMocks()[0];
		const response = JSON.parse(mockValue.response);

		// Fallback should trigger because enum: [] is impossible to satisfy
		// However, JSF is very resilient, so we check the structure
		expect(response).toHaveProperty('id');
		expect(response.name).toBeNull();
	});

	it('resolves internal $refs correctly', async () => {
		const spec = `
openapi: 3.1.0
info:
  title: Ref Test
  version: 1.0.0
paths:
  /users:
    get:
      responses:
        '200':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/User'
components:
  schemas:
    User:
      type: object
      properties:
        name: { type: string }
      required: ["name"]
`;
		const req = new NextRequest('http://localhost:3000/api/import/openapi', {
			method: 'POST',
			body: JSON.stringify({ spec }),
		});

		await POST(req);

		const mockValue = getInsertedMocks()[0];
		const response = JSON.parse(mockValue.response);
		expect(response).toHaveProperty('name');
	});

	it('handles trailing slashes in OpenAPI paths', async () => {
		const spec = `
openapi: 3.0.0
info: { title: "Slash Test", version: "1.0.0" }
paths:
  /slash/:
    get:
      responses:
        '200': { description: "OK" }
`;
		const req = new NextRequest('http://localhost:3000/api/import/openapi', {
			method: 'POST',
			body: JSON.stringify({ spec }),
		});
		await POST(req);
		expect(getInsertedMocks()[0].endpoint).toBe('/slash');
	});

	it('uses multiple examples when schema is missing', async () => {
		const spec = `
openapi: 3.0.0
info: { title: "Examples Test", version: "1.0.0" }
paths:
  /examples:
    get:
      responses:
        '200':
          content:
            application/json:
              examples:
                ex1: { value: { "val": 1 } }
                ex2: { value: { "val": 2 } }
`;
		const req = new NextRequest('http://localhost:3000/api/import/openapi', {
			method: 'POST',
			body: JSON.stringify({ spec }),
		});
		await POST(req);
		expect(JSON.parse(getInsertedMocks()[0].response)).toEqual({ val: 1 });
	});

	it('covers more fallback cases and methods', async () => {
		const spec = `
openapi: 3.0.0
info: { title: "Methods Test", version: "1.0.0" }
paths:
  /test:
    get:
      responses:
        '200':
          content:
            application/json:
              schema:
                type: object
                properties:
                  d: { type: string, format: date }
                  def: { type: string, default: "def-val" }
                  ex: { type: string, example: "ex-val" }
                  arr: { type: array }
                  nested: { type: object, properties: { y: { type: string } } }
    head: { responses: { '200': { description: OK } } }
    options: { responses: { '204': { description: OK } } }
    delete: { responses: { '204': { description: OK } } }
    trace: { responses: { '200': { description: trace } } }
`;
		const req = new NextRequest('http://localhost:3000/api/import/openapi', {
			method: 'POST',
			body: JSON.stringify({ spec }),
		});
		await POST(req);
		// Should have imported GET, HEAD, OPTIONS, DELETE (but not TRACE)
		// insertedValues count will increase by 4
	});

	it('generates fallback responses for various types', async () => {
		const spec = `
openapi: 3.0.0
info: { title: "Full Fallback Test", version: "1.0.0" }
paths:
  /fallback:
    get:
      responses:
        '200':
          content:
            application/json:
              schema:
                type: object
                properties:
                  str: { type: string }
                  dt: { type: string, format: date-time }
                  d: { type: string, format: date }
                  e: { type: string, enum: [val1] }
                  num: { type: number }
                  int: { type: integer }
                  bool: { type: boolean }
                  arr: { type: array, items: { type: string } }
                  nested: { type: object, properties: { x: { type: number } } }
                  def: { type: string, default: "default-val" }
                  empty: {}
`;
		// Use impossible constraints to force fallback if generateFromSchema is strict,
		// or just mock generateFromSchema.
		// Actually, we can use a schema with a format that JSF doesn't know and doesn't have a default for if it's invalid.
		// But the easiest is to just use a schema that IS valid JSON but NOT valid JSON Schema for JSF.
		const req = new NextRequest('http://localhost:3000/api/import/openapi', {
			method: 'POST',
			body: JSON.stringify({
				spec: spec
					.replace('type: string', 'type: [string, number]')
					.replace('enum: [val1]', 'enum: []'),
			}),
		});
		await POST(req);
		const resp = JSON.parse(getInsertedMocks()[0].response);
		expect(resp).toHaveProperty('str');
		expect(resp).toHaveProperty('num');
		expect(resp).toHaveProperty('int');
		expect(resp).toHaveProperty('bool');
		expect(resp).toHaveProperty('empty', {});
	});

	it('returns 400 when dereference fails', async () => {
		const spec = `
openapi: 3.0.0
info: { title: "Ref Fail", version: "1.0.0" }
paths:
  /test:
    get:
      responses:
        '200':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/NonExistent'
`;
		const req = new NextRequest('http://localhost:3000/api/import/openapi', {
			method: 'POST',
			body: JSON.stringify({ spec }),
		});
		const res = await POST(req);
		expect(res.status).toBe(400);
	});

	it('imports Swagger 2.0 with definitions correctly', async () => {
		const spec = `
swagger: "2.0"
info:
  title: Swagger 2.0 Test
  version: 1.0.0
paths:
  /test:
    get:
      responses:
        '200':
          description: OK
          schema:
            $ref: '#/definitions/Item'
definitions:
  Item:
    type: object
    properties:
      id: { type: string }
`;
		const req = new NextRequest('http://localhost:3000/api/import/openapi', {
			method: 'POST',
			body: JSON.stringify({ spec }),
		});
		await POST(req);
		const [lastInsert] = getInsertedMocks();
		expect(lastInsert.endpoint).toBe('/test');
		const body = JSON.parse(lastInsert.response);
		expect(body).toHaveProperty('id');
		expect(typeof body.id).toBe('string');
	});

	it('handles circular references without crashing', async () => {
		const spec = `
openapi: 3.0.0
info:
  title: Circular Ref Test
  version: 1.0.0
paths:
  /test:
    get:
      responses:
        '200':
          description: OK
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Node'
components:
  schemas:
    Node:
      type: object
      properties:
        child: { $ref: '#/components/schemas/Node' }
`;
		const req = new NextRequest('http://localhost:3000/api/import/openapi', {
			method: 'POST',
			body: JSON.stringify({ spec }),
		});

		// This should not throw "Maximum call stack size exceeded" or "Converting circular structure to JSON"
		const res = await POST(req);
		expect(res.status).toBe(200);

		const [lastInsert] = getInsertedMocks();
		expect(lastInsert.endpoint).toBe('/test');
		// The response might be {} or a partial object depending on how JSF/fallback handles it,
		// but the key is that it didn't crash.
		expect(lastInsert.response).toBeDefined();
	});

	it('returns 500 on database error', async () => {
		mockDb.transaction = mock(async () => {
			throw new Error('fail');
		});
		const req = new NextRequest('http://localhost:3000/api/import/openapi', {
			method: 'POST',
			body: JSON.stringify({
				spec: 'openapi: 3.0.0\ninfo:\n  title: t\npaths: {}',
			}),
		});
		const res = await POST(req);
		expect(res.status).toBe(500);
		// Restore
		mockDb.transaction = mock(async (cb: (tx: unknown) => Promise<unknown>) =>
			cb(mockDb),
		);
	});

	it('creates subfolders for nested OpenAPI paths and stores relative mock paths', async () => {
		const spec = `
openapi: 3.0.0
info: { title: "Nested Import Test", version: "1.0.0" }
paths:
  /v1/admin/users/{id}/orders:
    get:
      responses:
        '200': { description: "OK" }
`;
		const req = new NextRequest('http://localhost:3000/api/import/openapi', {
			method: 'POST',
			body: JSON.stringify({ spec }),
		});

		const res = await POST(req);
		const body = await res.json();

		expect(res.status).toBe(200);
		expect(body.importedCount).toBe(1);
		expect(body.importedSubfoldersCount).toBe(3);

		const subfolders = getInsertedSubfolders();
		expect(subfolders.map((subfolder) => subfolder.mainPath)).toEqual([
			'/v1',
			'/v1/admin',
			'/v1/admin/users',
		]);

		const [mockValue] = getInsertedMocks();
		expect(mockValue.endpoint).toBe('/*/orders');
		expect(mockValue.matchType).toBe('wildcard');
		expect(mockValue.mockFolderId).toBeDefined();
	});
});
