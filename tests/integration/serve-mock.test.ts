import { describe, it, expect, mock, beforeEach } from "bun:test";
import { NextRequest } from "next/server";

// 1. Mock Data
const mockFolder = {
    id: "folder-1",
    name: "API",
    slug: "api"
};

const mockResponse = {
    id: "mock-1",
    folderId: "folder-1",
    name: "Get Users",
    endpoint: "/users",
    method: "GET",
    statusCode: 200,
    response: JSON.stringify({ users: [] }),
    bodyType: "json",
    useDynamicResponse: false,
    echoRequestBody: false,
    enabled: true
};

// 2. Chainable mock builder
const createMockBuilder = (resolvedValue: any) => {
  const builder: any = {
    from: mock(() => builder),
    where: mock(() => builder),
    limit: mock(() => builder),
    then: (resolve: any) => resolve(resolvedValue),
  };
  return builder;
};

// State for mocks
let folderResult: any[] = [mockFolder];
let mockResult: any[] = [mockResponse];

const mockDb = {
  select: mock(() => createMockBuilder(folderResult)), // Simplified: first call is folder, second is mock
};

// We need to differentiate select returns based on what table is being queried?
// Or we can rely on call order?
// In `handleRequest`:
// 1. select from folders where slug = ...
// 2. select from mockResponses where folderId = ...

// Let's make mockDb.select smart enough or just mock specific returns in tests
// Since `drizzle-orm` isn't fully mocked here to distinguish tables easily without more complex setup,
// we will intercept the calls in test cases.

mock.module("@/lib/db", () => ({ db: mockDb }));

// Import handler
// Since it's a dynamic route [...path], the exports are GET, POST, etc.
// But the logic is in handleRequest which is not exported...
// We have to call GET/POST etc.

import { GET, POST } from "../../app/api/mock/[...path]/route";

describe("Mock Serving /mock/[folder]/[path]", () => {
    beforeEach(() => {
        // Reset default behavior
        mockDb.select = mock(() => {
            // This is tricky because we chain .from().where()...
            // We can return a builder that returns folders first, then mocks?
            // Actually, `db.select()` returns the builder.
            return createMockBuilder([mockFolder]); 
        });
    });

    it("serves a static JSON mock", async () => {
        // Setup distinct returns for the two queries
        let callCount = 0;
        mockDb.select = mock(() => {
            callCount++;
            if (callCount === 1) return createMockBuilder([mockFolder]); // Folder query
            if (callCount === 2) return createMockBuilder([mockResponse]); // Mock query
            return createMockBuilder([]);
        });

        const req = new NextRequest("http://localhost:3000/api/mock/api/users", { method: "GET" });
        const params = Promise.resolve({ path: ["api", "users"] });

        const res = await GET(req, { params });
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body).toEqual({ users: [] });
    });

    it("returns 404 if folder not found", async () => {
        mockDb.select = mock(() => createMockBuilder([])); // No folder found

        const req = new NextRequest("http://localhost:3000/api/mock/unknown/users");
        const params = Promise.resolve({ path: ["unknown", "users"] });

        const res = await GET(req, { params });
        expect(res.status).toBe(404);
        const body = await res.json();
        expect(body.error).toBe("Folder not found");
    });

   it("returns 404 if mock not found in folder", async () => {
        let callCount = 0;
        mockDb.select = mock(() => {
            callCount++;
            if (callCount === 1) return createMockBuilder([mockFolder]); // Folder found
            if (callCount === 2) return createMockBuilder([]); // Mock NOT found
            return createMockBuilder([]);
        });

        const req = new NextRequest("http://localhost:3000/api/mock/api/unknown");
        const params = Promise.resolve({ path: ["api", "unknown"] });

        const res = await GET(req, { params });
        expect(res.status).toBe(404);
        const body = await res.json();
        expect(body.error).toBe("Mock endpoint not found");
    });

    it("serves echo request body", async () => {
        const echoMock = { ...mockResponse, echoRequestBody: true, statusCode: 201 };
        
        // Mock chain
        let callCount = 0;
        mockDb.select = mock(() => {
            callCount++;
            if (callCount === 1) return createMockBuilder([mockFolder]);
            if (callCount === 2) return createMockBuilder([echoMock]);
            return createMockBuilder([]);
        });

        const payload = { foo: "bar" };
        const req = new NextRequest("http://localhost:3000/api/mock/api/users", {
            method: "POST",
            body: JSON.stringify(payload),
            headers: { "Content-Type": "application/json" }
        });
        const params = Promise.resolve({ path: ["api", "users"] });

        const res = await POST(req, { params });
        
        expect(res.status).toBe(201);
        const body = await res.json();
        expect(body).toEqual(payload);
    });

    it("serves static text mock", async () => {
         const textMock = { 
             ...mockResponse, 
             bodyType: "text", 
             response: "Hello World",
             statusCode: 200 
         };

        let callCount = 0;
         mockDb.select = mock(() => {
            callCount++;
            if (callCount === 1) return createMockBuilder([mockFolder]);
            if (callCount === 2) return createMockBuilder([textMock]);
            return createMockBuilder([]);
        });

        const req = new NextRequest("http://localhost:3000/api/mock/api/text");
        const params = Promise.resolve({ path: ["api", "text"] });
        
        const res = await GET(req, { params });
        expect(res.status).toBe(200);
        const text = await res.text();
        expect(text).toBe("Hello World");
    });
});
