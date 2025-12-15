import { describe, it, expect, mock, beforeEach } from "bun:test";
import { NextRequest } from "next/server";

const mockMockData = {
  id: "mock-123",
  name: "Test Mock",
  endpoint: "/api/test",
  method: "GET",
  folderId: "folder-123",
  response: '{"data": "test"}',
  statusCode: 200,
  matchType: "exact",
  bodyType: "json",
  enabled: true,
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-01"),
};

// Chainable mock builder
const createMockBuilder = (resolvedValue: any) => {
  const builder: any = {
    from: mock(() => builder),
    where: mock(() => builder),
    orderBy: mock(() => builder),
    limit: mock(() => builder),
    offset: mock(() => builder),
    values: mock(() => builder),
    set: mock(() => builder),
    returning: mock(() => builder),
    then: (resolve: any) => resolve(resolvedValue),
  };
  return builder;
};

let mockResolvedValue: any = [mockMockData];

const mockDb = {
  select: mock((args) => {
      if (args && args.count) {
          return createMockBuilder([{ count: 5 }]);
      }
      return createMockBuilder(mockResolvedValue);
  }),
  insert: mock(() => createMockBuilder([mockMockData])),
  update: mock(() => createMockBuilder([mockMockData])),
  delete: mock(() => createMockBuilder([])),
};

mock.module("@/lib/db", () => ({ db: mockDb }));

import { GET, POST, PUT, DELETE } from "../../app/api/mocks/route";

describe("API /api/mocks", () => {
    beforeEach(() => {
        mockResolvedValue = [mockMockData];
    });

    it("GET (by folderId) returns mocks", async () => {
        const req = new NextRequest("http://localhost:3000/api/mocks?folderId=folder-123");
        
        const res = await GET(req);
        const body = await res.json();
        
        expect(res.status).toBe(200);
        expect(body.data).toBeArray();
        expect(body.data[0].id).toBe("mock-123");
        expect(body.meta.total).toBe(5);
    });

    it("GET (by id) returns single mock", async () => {
        const req = new NextRequest("http://localhost:3000/api/mocks?id=mock-123");
        
        const res = await GET(req);
        const body = await res.json();
        
        expect(res.status).toBe(200);
        expect(body.id).toBe("mock-123");
    });

    it("POST creates a mock", async () => {
        const payload = { 
            name: "New Mock", 
            path: "/new", 
            method: "POST",
            statusCode: 201,
            response: "{}",
            folderId: "folder-123"
        };
        const req = new NextRequest("http://localhost:3000/api/mocks", {
            method: "POST",
            body: JSON.stringify(payload)
        });

        const res = await POST(req);
        const body = await res.json();

        expect(res.status).toBe(201);
        expect(mockDb.insert).toHaveBeenCalled();
    });

    it("PUT updates a mock", async () => {
        const payload = { name: "Updated Mock" };
        const req = new NextRequest("http://localhost:3000/api/mocks?id=mock-123", {
            method: "PUT",
            body: JSON.stringify(payload)
        });

        const res = await PUT(req);
        expect(res.status).toBe(200);
        expect(mockDb.update).toHaveBeenCalled();
    });

    it("DELETE removes a mock", async () => {
        const req = new NextRequest("http://localhost:3000/api/mocks?id=mock-123", {
            method: "DELETE"
        });

        const res = await DELETE(req);
        expect(res.status).toBe(200);
        expect(mockDb.delete).toHaveBeenCalled();
    });
});
