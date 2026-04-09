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

// Chainable mock builder
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

let callLog: string[] = [];
let folderResult: any[] = [mockFolder];
let mocksResult: any[] = [];

const mockDb = {
  select: mock(() => {
    callLog.push("select");
    if (callLog.filter((c) => c === "select").length === 1) {
      return createMockBuilder(folderResult);
    }
    return createMockBuilder(mocksResult);
  }),
};

mock.module("@/lib/db", () => ({ db: mockDb }));

import { GET } from "../../app/api/mock/[...path]/route";

// -------------------------------------------------------
// Tests
// -------------------------------------------------------

describe("Mock Serving — matchType & search params", () => {
  beforeEach(() => {
    callLog = [];
    folderResult = [mockFolder];
    mocksResult = [];
  });

  // --- Exact match (existing behavior, must not break) ---

  it("exact match: serves mock by path + method", async () => {
    const exactMock = {
      id: "m1",
      folderId: "folder-1",
      endpoint: "/users",
      method: "GET",
      statusCode: 200,
      response: JSON.stringify({ users: [] }),
      bodyType: "json",
      matchType: "exact",
      queryParams: null,
      enabled: true,
      echoRequestBody: false,
      useDynamicResponse: false,
    };

    let selectCall = 0;
    mockDb.select = mock(() => {
      selectCall++;
      if (selectCall === 1) return createMockBuilder([mockFolder]);
      return createMockBuilder([exactMock]);
    });

    const req = new NextRequest("http://localhost:3000/api/mock/api/users");
    const params = Promise.resolve({ path: ["api", "users"] });

    const res = await GET(req, { params });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ users: [] });
  });

  // --- Query params filtering ---

  it("exact match with queryParams: matches only when params match", async () => {
    const activeMock = {
      id: "m1",
      folderId: "folder-1",
      endpoint: "/users",
      method: "GET",
      statusCode: 200,
      response: JSON.stringify({ status: "active" }),
      bodyType: "json",
      matchType: "exact",
      queryParams: { status: "active" },
      enabled: true,
      echoRequestBody: false,
      useDynamicResponse: false,
    };
    const bannedMock = {
      id: "m2",
      folderId: "folder-1",
      endpoint: "/users",
      method: "GET",
      statusCode: 200,
      response: JSON.stringify({ status: "banned" }),
      bodyType: "json",
      matchType: "exact",
      queryParams: { status: "banned" },
      enabled: true,
      echoRequestBody: false,
      useDynamicResponse: false,
    };

    let selectCall = 0;
    mockDb.select = mock(() => {
      selectCall++;
      if (selectCall === 1) return createMockBuilder([mockFolder]);
      // Return both mocks — handler should pick the right one by query params
      return createMockBuilder([activeMock, bannedMock]);
    });

    // Request with status=active should get the active mock
    const req = new NextRequest(
      "http://localhost:3000/api/mock/api/users?status=active"
    );
    const params = Promise.resolve({ path: ["api", "users"] });

    const res = await GET(req, { params });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ status: "active" });
  });

  it("exact match: no queryParams mock matches any query params", async () => {
    const noParamsMock = {
      id: "m1",
      folderId: "folder-1",
      endpoint: "/users",
      method: "GET",
      statusCode: 200,
      response: JSON.stringify({ generic: true }),
      bodyType: "json",
      matchType: "exact",
      queryParams: null,
      enabled: true,
      echoRequestBody: false,
      useDynamicResponse: false,
    };

    let selectCall = 0;
    mockDb.select = mock(() => {
      selectCall++;
      if (selectCall === 1) return createMockBuilder([mockFolder]);
      return createMockBuilder([noParamsMock]);
    });

    // Request with extra params — mock has no queryParams requirement so it matches
    const req = new NextRequest(
      "http://localhost:3000/api/mock/api/users?any=thing"
    );
    const params = Promise.resolve({ path: ["api", "users"] });

    const res = await GET(req, { params });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ generic: true });
  });

  // --- Wildcard match ---

  it("wildcard match: matches path with wildcard", async () => {
    const wildcardMock = {
      id: "m1",
      folderId: "folder-1",
      endpoint: "/users/*",
      method: "GET",
      statusCode: 200,
      response: JSON.stringify({ wildcard: true }),
      bodyType: "json",
      matchType: "wildcard",
      queryParams: null,
      enabled: true,
      echoRequestBody: false,
      useDynamicResponse: false,
    };

    let selectCall = 0;
    mockDb.select = mock(() => {
      selectCall++;
      if (selectCall === 1) return createMockBuilder([mockFolder]);
      // Exact match returns empty, then fallback fetches all mocks
      if (selectCall === 2) return createMockBuilder([]);
      return createMockBuilder([wildcardMock]);
    });

    const req = new NextRequest(
      "http://localhost:3000/api/mock/api/users/123"
    );
    const params = Promise.resolve({ path: ["api", "users", "123"] });

    const res = await GET(req, { params });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ wildcard: true });
  });

  it("wildcard match with queryParams: matches path and params", async () => {
    const wildcardActive = {
      id: "m1",
      folderId: "folder-1",
      endpoint: "/users/*",
      method: "GET",
      statusCode: 200,
      response: JSON.stringify({ status: "active" }),
      bodyType: "json",
      matchType: "wildcard",
      queryParams: { status: "active" },
      enabled: true,
      echoRequestBody: false,
      useDynamicResponse: false,
    };
    const wildcardBanned = {
      id: "m2",
      folderId: "folder-1",
      endpoint: "/users/*",
      method: "GET",
      statusCode: 200,
      response: JSON.stringify({ status: "banned" }),
      bodyType: "json",
      matchType: "wildcard",
      queryParams: { status: "banned" },
      enabled: true,
      echoRequestBody: false,
      useDynamicResponse: false,
    };

    let selectCall = 0;
    mockDb.select = mock(() => {
      selectCall++;
      if (selectCall === 1) return createMockBuilder([mockFolder]);
      if (selectCall === 2) return createMockBuilder([]);
      return createMockBuilder([wildcardActive, wildcardBanned]);
    });

    const req = new NextRequest(
      "http://localhost:3000/api/mock/api/users/456?status=banned"
    );
    const params = Promise.resolve({ path: ["api", "users", "456"] });

    const res = await GET(req, { params });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ status: "banned" });
  });

  // --- Substring match ---

  it("substring match: matches when path contains endpoint", async () => {
    const substringMock = {
      id: "m1",
      folderId: "folder-1",
      endpoint: "/users",
      method: "GET",
      statusCode: 200,
      response: JSON.stringify({ substring: true }),
      bodyType: "json",
      matchType: "substring",
      queryParams: null,
      enabled: true,
      echoRequestBody: false,
      useDynamicResponse: false,
    };

    let selectCall = 0;
    mockDb.select = mock(() => {
      selectCall++;
      if (selectCall === 1) return createMockBuilder([mockFolder]);
      if (selectCall === 2) return createMockBuilder([]);
      return createMockBuilder([substringMock]);
    });

    const req = new NextRequest(
      "http://localhost:3000/api/mock/api/users/list"
    );
    const params = Promise.resolve({ path: ["api", "users", "list"] });

    const res = await GET(req, { params });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ substring: true });
  });

  // --- Priority: exact beats wildcard beats substring ---

  it("priority: exact match beats wildcard when both match", async () => {
    const exactMock = {
      id: "m1",
      folderId: "folder-1",
      endpoint: "/users/123",
      method: "GET",
      statusCode: 200,
      response: JSON.stringify({ exact: true }),
      bodyType: "json",
      matchType: "exact",
      queryParams: null,
      enabled: true,
      echoRequestBody: false,
      useDynamicResponse: false,
    };
    const wildcardMock = {
      id: "m2",
      folderId: "folder-1",
      endpoint: "/users/*",
      method: "GET",
      statusCode: 200,
      response: JSON.stringify({ wildcard: true }),
      bodyType: "json",
      matchType: "wildcard",
      queryParams: null,
      enabled: true,
      echoRequestBody: false,
      useDynamicResponse: false,
    };

    let selectCall = 0;
    mockDb.select = mock(() => {
      selectCall++;
      if (selectCall === 1) return createMockBuilder([mockFolder]);
      if (selectCall === 2) return createMockBuilder([]);
      return createMockBuilder([exactMock, wildcardMock]);
    });

    const req = new NextRequest(
      "http://localhost:3000/api/mock/api/users/123"
    );
    const params = Promise.resolve({ path: ["api", "users", "123"] });

    const res = await GET(req, { params });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ exact: true });
  });

  // --- 404 when nothing matches ---

  it("returns 404 when no mock matches at all", async () => {
    let selectCall = 0;
    mockDb.select = mock(() => {
      selectCall++;
      if (selectCall === 1) return createMockBuilder([mockFolder]);
      if (selectCall === 2) return createMockBuilder([]);
      return createMockBuilder([]);
    });

    const req = new NextRequest(
      "http://localhost:3000/api/mock/api/nonexistent"
    );
    const params = Promise.resolve({ path: ["api", "nonexistent"] });

    const res = await GET(req, { params });
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("Mock endpoint not found");
  });
});
