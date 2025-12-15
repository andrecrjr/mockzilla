import { describe, it, expect, mock, beforeEach } from "bun:test";
import { NextRequest } from "next/server";

// 1. Define mock data
const mockFolder = {
  id: "123",
  name: "Test Folder",
  slug: "test-folder",
  description: "Description",
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-01"),
};

// 2. Define the chainable mock builder
const createMockBuilder = (resolvedValue: any) => {
  const builder: any = {
    // Chainable methods return the builder itself
    from: mock(() => builder),
    where: mock(() => builder),
    orderBy: mock(() => builder),
    limit: mock(() => builder),
    offset: mock(() => builder),
    values: mock(() => builder),
    set: mock(() => builder),
    returning: mock(() => builder),
    
    // Make it thenable to simulate a Promise
    then: (resolve: any) => resolve(resolvedValue),
  };
  return builder;
};

// Default response is array of folders, but we might need to vary it
let mockResolvedValue: any = [mockFolder];

const mockDb = {
  select: mock((args) => {
      // If args present (count query), return count mock
      if (args && args.count) {
          return createMockBuilder([{ count: 10 }]);
      }
      return createMockBuilder(mockResolvedValue)
  }),
  insert: mock(() => createMockBuilder([mockFolder])),
  update: mock(() => createMockBuilder([mockFolder])),
  delete: mock(() => createMockBuilder([])),
};

// 3. Mock the module
mock.module("@/lib/db", () => ({
  db: mockDb
}));

// 4. Import the route handler (must be AFTER mock.module)
import { GET, POST, PUT, DELETE } from "../../app/api/folders/route";

describe("API /api/folders", () => {
    beforeEach(() => {
        // Reset default
        mockResolvedValue = [mockFolder];
    });

    it("GET (all=true) returns all folders", async () => {
        const req = new NextRequest("http://localhost:3000/api/folders?all=true");
        const res = await GET(req);
        const body = await res.json();
        
        expect(res.status).toBe(200);
        expect(body).toBeArray();
        expect(body[0].slug).toBe("test-folder");
        expect(mockDb.select).toHaveBeenCalled();
    });

    it("GET (pagination) returns paginated result", async () => {
         const req = new NextRequest("http://localhost:3000/api/folders?page=1&limit=5");
         const res = await GET(req);
         const body = await res.json();

         expect(res.status).toBe(200);
         expect(body.data).toBeArray();
         expect(body.meta.total).toBe(10); 
    });

    it("GET (slug) returns specific folder", async () => {
        const req = new NextRequest("http://localhost:3000/api/folders?slug=test-folder");
        
        // Mock returning found folder
        mockResolvedValue = [{ ...mockFolder, slug: "test-folder" }];

        const res = await GET(req);
        const body = await res.json();
        
        expect(res.status).toBe(200);
        expect(body.slug).toBe("test-folder");
    });

    it("GET (slug) returns 404 if not found", async () => {
        const req = new NextRequest("http://localhost:3000/api/folders?slug=unknown");
        
        mockResolvedValue = []; // No folder found

        const res = await GET(req);
        const body = await res.json();
        
        expect(res.status).toBe(404);
        expect(body.error).toBe("Folder not found");
    });

    it("POST creates a new folder", async () => {
        const payload = { name: "New Folder", description: "Desc" };
        const req = new NextRequest("http://localhost:3000/api/folders", {
            method: "POST",
            body: JSON.stringify(payload)
        });

        const res = await POST(req);
        const body = await res.json();

        expect(res.status).toBe(201);
        expect(body.name).toBe("Test Folder");
        expect(mockDb.insert).toHaveBeenCalled();
    });

    it("PUT updates a folder", async () => {
        const payload = { name: "Updated Name", description: "Updated Desc" };
        const req = new NextRequest("http://localhost:3000/api/folders?id=123", {
            method: "PUT",
            body: JSON.stringify(payload)
        });

        const res = await PUT(req);
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(mockDb.update).toHaveBeenCalled();
    });

    it("DELETE removes a folder", async () => {
        const req = new NextRequest("http://localhost:3000/api/folders?id=123", {
            method: "DELETE"
        });

        const res = await DELETE(req);
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body.success).toBe(true);
        expect(mockDb.delete).toHaveBeenCalled();
    });
});
