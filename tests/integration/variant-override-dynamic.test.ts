import { describe, it, expect, mock, beforeEach } from "bun:test";
import { NextRequest } from "next/server";

// -------------------------------------------------------
// Database mock setup
// -------------------------------------------------------

const mockFolder = {
  id: "folder-1",
  name: "API",
  slug: "api",
};

const createMockBuilder = (resolvedValue: any) => {
  const builder: any = {
    from: mock(() => builder),
    where: mock(() => builder),
    orderBy: mock(() => builder),
    limit: mock(() => builder),
    then: (resolve: any) => resolve(resolvedValue),
  };
  return builder;
};

let folderResult: any[] = [mockFolder];
let mocksResult: any[] = [];

const mockDb = {
  select: mock(() => {
    if (mockDb.select.mock.calls.length === 1) {
      return createMockBuilder(folderResult);
    }
    return createMockBuilder(mocksResult);
  }),
};

mock.module("@/lib/db", () => ({ db: mockDb }));

// Mock the schema generator to see if it's called
const mockGenerateFromSchema = mock(() => JSON.stringify({ dynamic: true }));
mock.module("@/lib/schema-generator", () => ({
  generateFromSchema: mockGenerateFromSchema,
  replaceTemplates: (body: string) => body,
}));

import { GET } from "../../app/api/mock/[...path]/route";

// -------------------------------------------------------
// Tests
// -------------------------------------------------------

describe("Mock Serving — variant override dynamic", () => {
  beforeEach(() => {
    mockDb.select.mockClear();
    mockGenerateFromSchema.mockClear();
  });

  it("returns static variant body even if main mock is dynamic", async () => {
    const dynamicMockWithVariant = {
      id: "m1",
      folderId: "folder-1",
      endpoint: "/users/*",
      method: "GET",
      statusCode: 200,
      response: JSON.stringify({ static_default: true }),
      bodyType: "json",
      matchType: "wildcard",
      enabled: true,
      queryParams: null,
      jsonSchema: JSON.stringify({ type: "object" }),
      useDynamicResponse: true, // Main mock is dynamic
      variants: [
        { key: "123", body: JSON.stringify({ variant: 123 }), statusCode: 200, bodyType: "json" },
      ],
    };

    let selectCall = 0;
    mockDb.select = mock(() => {
      selectCall++;
      if (selectCall === 1) return createMockBuilder([mockFolder]);
      if (selectCall === 2) return createMockBuilder([]);
      return createMockBuilder([dynamicMockWithVariant]);
    });

    const req = new NextRequest(
      "http://localhost:3000/api/mock/api/users/123"
    );
    const params = Promise.resolve({ path: ["api", "users", "123"] });

    const res = await GET(req, { params });
    expect(res.status).toBe(200);
    const body = await res.json();
    
    // Should return the variant's body
    expect(body).toEqual({ variant: 123 });
    
    // Should NOT have called generateFromSchema because useDynamicResponse was overridden to false
    expect(mockGenerateFromSchema).not.toHaveBeenCalled();
  });

  it("returns dynamic response if no variant matches", async () => {
    const dynamicMockWithVariant = {
      id: "m1",
      folderId: "folder-1",
      endpoint: "/users/*",
      method: "GET",
      statusCode: 200,
      response: JSON.stringify({ static_default: true }),
      bodyType: "json",
      matchType: "wildcard",
      enabled: true,
      queryParams: null,
      jsonSchema: JSON.stringify({ type: "object" }),
      useDynamicResponse: true, // Main mock is dynamic
      variants: [
        { key: "123", body: JSON.stringify({ variant: 123 }), statusCode: 200, bodyType: "json" },
      ],
    };

    let selectCall = 0;
    mockDb.select = mock(() => {
      selectCall++;
      if (selectCall === 1) return createMockBuilder([mockFolder]);
      if (selectCall === 2) return createMockBuilder([]);
      return createMockBuilder([dynamicMockWithVariant]);
    });

    const req = new NextRequest(
      "http://localhost:3000/api/mock/api/users/999"
    );
    const params = Promise.resolve({ path: ["api", "users", "999"] });

    const res = await GET(req, { params });
    expect(res.status).toBe(200);
    const body = await res.json();
    
    // Should return dynamic response from schema
    expect(body).toEqual({ dynamic: true });
    expect(mockGenerateFromSchema).toHaveBeenCalled();
  });
});
