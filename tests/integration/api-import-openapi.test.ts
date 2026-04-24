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

// Track inserted values
let insertedValues: any[] = [];

// 2. Define the chainable mock builder
const createMockBuilder = (resolvedValue: unknown) => {
	const builder = {
		from: mock(() => builder),
		where: mock(() => builder),
		orderBy: mock(() => builder),
		limit: mock(() => builder),
		offset: mock(() => builder),
		values: mock((val: unknown) => {
			insertedValues.push(val);
			return builder;
		}),
		set: mock(() => builder),
		returning: mock(() => builder),
		onConflictDoUpdate: mock(() => builder),
		then: (resolve: (val: unknown) => void) => resolve(resolvedValue),
	} as any;
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
		expect(mockDb.insert).toHaveBeenCalledTimes(3);
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

		const echoMock = insertedValues[1] as any;
		expect(echoMock.method).toBe('POST');
		expect(echoMock.echoRequestBody).toBe(true);

		const generateMock = insertedValues[2] as any;
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

		const mockValue = insertedValues[1];
		expect(mockValue.endpoint).toBe('/users/*');
		expect(mockValue.matchType).toBe('wildcard');
		expect(mockValue.variants).toHaveLength(1);
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

		const mockValue = insertedValues[1];
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

		const mockValue = insertedValues[1];
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

		const mockValue = insertedValues[1];
		const response = JSON.parse(mockValue.response);
		expect(response).toHaveProperty('name');
	});
});
