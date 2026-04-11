import { describe, expect, test } from "bun:test";
import {
  wildcardToRegex,
  matchWildcard,
  queryParamsMatch,
  findBestMatch,
  extractCaptureKey,
  selectVariant,
} from "../../lib/utils/mock-matcher";
import type { MockCandidate, MockVariant } from "../../lib/utils/mock-matcher";

// -------------------------------------------------------
// wildcardToRegex
// -------------------------------------------------------
describe("wildcardToRegex", () => {
  test("converts simple wildcard with single star", () => {
    const re = wildcardToRegex("/api/users/*");
    expect(re.test("/api/users/123")).toBe(true);
    expect(re.test("/api/users/abc")).toBe(true);
    expect(re.test("/api/users/")).toBe(false);
    expect(re.test("/api/users")).toBe(false);
  });

  test("converts wildcard with multiple stars", () => {
    const re = wildcardToRegex("/api/*/search?*");
    expect(re.test("/api/users/search?q=test")).toBe(true);
    expect(re.test("/api/items/search?q=foo")).toBe(true);
    expect(re.test("/api/search?q=test")).toBe(false);
  });

  test("escapes regex special characters", () => {
    const re = wildcardToRegex("/api/v1.0/users?status=active");
    // The dot should be escaped (not match any character)
    expect(re.test("/api/v1X0/users?status=active")).toBe(false);
    expect(re.test("/api/v1.0/users?status=active")).toBe(true);
  });

  test("anchors URLs with protocol", () => {
    const re = wildcardToRegex("https://example.com/api/*");
    expect(re.test("https://example.com/api/v1")).toBe(true);
    expect(re.test("http://example.com/api/v1")).toBe(false);
    expect(re.test("https://evil.com/api/v1")).toBe(false);
  });

  test("non-protocol patterns are not anchored at start", () => {
    const re = wildcardToRegex("/api/*");
    expect(re.test("/api/v1")).toBe(true);
    expect(re.test("https://example.com/api/v1")).toBe(true);
  });
});

// -------------------------------------------------------
// matchWildcard
// -------------------------------------------------------
describe("matchWildcard", () => {
  test("matches and captures wildcard segments", () => {
    const result = matchWildcard("/api/users/123", "/api/users/*");
    expect(result.ok).toBe(true);
    expect(result.captures).toEqual(["123"]);
  });

  test("returns ok false when no match", () => {
    const result = matchWildcard("/api/users", "/api/users/*");
    expect(result.ok).toBe(false);
  });

  test("captures multiple wildcard segments", () => {
    const result = matchWildcard(
      "/api/users/alice/status/active",
      "/api/users/*/status/*"
    );
    expect(result.ok).toBe(true);
    expect(result.captures).toEqual(["alice", "active"]);
  });
});

// -------------------------------------------------------
// queryParamsMatch
// -------------------------------------------------------
describe("queryParamsMatch", () => {
  test("empty required params always matches", () => {
    expect(queryParamsMatch({}, {})).toBe(true);
    expect(queryParamsMatch(null, {})).toBe(true);
    expect(queryParamsMatch(undefined, {})).toBe(true);
  });

  test("matches when all required query params are present", () => {
    const urlParams = { status: "active", page: "1" };
    const required = { status: "active" };
    expect(queryParamsMatch(required, urlParams)).toBe(true);
  });

  test("matches multiple required params", () => {
    const urlParams = { status: "active", page: "1", limit: "10" };
    const required = { status: "active", page: "1" };
    expect(queryParamsMatch(required, urlParams)).toBe(true);
  });

  test("fails when a required param is missing", () => {
    const urlParams = { page: "1" };
    const required = { status: "active" };
    expect(queryParamsMatch(required, urlParams)).toBe(false);
  });

  test("fails when a required param value differs", () => {
    const urlParams = { status: "banned" };
    const required = { status: "active" };
    expect(queryParamsMatch(required, urlParams)).toBe(false);
  });

  test("extra url params do not affect match", () => {
    const urlParams = { status: "active", extra: "foo" };
    const required = { status: "active" };
    expect(queryParamsMatch(required, urlParams)).toBe(true);
  });
});

// -------------------------------------------------------
// findBestMatch
// -------------------------------------------------------
describe("findBestMatch", () => {
  const makeCandidate = (
    endpoint: string,
    matchType: string,
    queryParams: Record<string, string> | null = null
  ): MockCandidate => ({
    endpoint,
    matchType: matchType as "exact" | "substring" | "wildcard",
    queryParams,
    _score: 0,
  });

  test("exact match beats substring", () => {
    const candidates: MockCandidate[] = [
      makeCandidate("/api/users", "exact"),
      makeCandidate("/api", "substring"),
    ];
    const result = findBestMatch("/api/users", {}, candidates);
    expect(result).toBe(candidates[0]);
  });

  test("exact + query params is most specific", () => {
    const candidates: MockCandidate[] = [
      makeCandidate("/api/users", "exact"),
      makeCandidate("/api/users", "exact", { status: "active" }),
    ];
    const result = findBestMatch(
      "/api/users",
      { status: "active" },
      candidates
    );
    expect(result).toBe(candidates[1]);
  });

  test("wildcard match when no exact match", () => {
    const candidates: MockCandidate[] = [
      makeCandidate("/api/users/*", "wildcard"),
    ];
    const result = findBestMatch("/api/users/123", {}, candidates);
    expect(result).toBe(candidates[0]);
  });

  test("wildcard + query params beats wildcard alone", () => {
    const candidates: MockCandidate[] = [
      makeCandidate("/api/users/*", "wildcard"),
      makeCandidate("/api/users/*", "wildcard", { status: "active" }),
    ];
    const result = findBestMatch(
      "/api/users/123",
      { status: "active" },
      candidates
    );
    expect(result).toBe(candidates[1]);
  });

  test("substring match as fallback", () => {
    const candidates: MockCandidate[] = [
      makeCandidate("/api", "substring"),
    ];
    const result = findBestMatch("/api/users/123", {}, candidates);
    expect(result).toBe(candidates[0]);
  });

  test("returns null when nothing matches", () => {
    const candidates: MockCandidate[] = [
      makeCandidate("/api/other", "exact"),
    ];
    const result = findBestMatch("/api/users", {}, candidates);
    expect(result).toBeNull();
  });

  test("wildcard does not match when endpoint is shorter than pattern", () => {
    const candidates: MockCandidate[] = [
      makeCandidate("/api/users/*/posts", "wildcard"),
    ];
    const result = findBestMatch("/api/users/123", {}, candidates);
    expect(result).toBeNull();
  });
});

// -------------------------------------------------------
// extractCaptureKey
// -------------------------------------------------------
describe("extractCaptureKey", () => {
  test("extracts single capture key", () => {
    const key = extractCaptureKey("/api/users/123", "/api/users/*");
    expect(key).toBe("123");
  });

  test("extracts multiple capture keys joined by |", () => {
    const key = extractCaptureKey(
      "/api/users/alice/status/active",
      "/api/users/*/status/*"
    );
    expect(key).toBe("alice|active");
  });

  test("returns null when pattern has no wildcards", () => {
    const key = extractCaptureKey("/api/users/123", "/api/users/123");
    expect(key).toBeNull();
  });

  test("returns null when URL doesn't match pattern", () => {
    const key = extractCaptureKey("/api/users", "/api/users/*");
    expect(key).toBeNull();
  });
});

// -------------------------------------------------------
// selectVariant
// -------------------------------------------------------
describe("selectVariant", () => {
  const variants: MockVariant[] = [
    { key: "123", body: '{"id": 123}', statusCode: 200, bodyType: "json" },
    { key: "456", body: '{"id": 456}', statusCode: 200, bodyType: "json" },
  ];

  test("selects variant by captured key", () => {
    const result = selectVariant(variants, "/api/users/123", "/api/users/*");
    expect(result).toEqual(variants[0]);
  });

  test("selects correct variant for different key", () => {
    const result = selectVariant(variants, "/api/users/456", "/api/users/*");
    expect(result).toEqual(variants[1]);
  });

  test("returns null when no variant matches the capture key and no wildcard fallback", () => {
    const result = selectVariant(variants, "/api/users/789", "/api/users/*");
    expect(result).toBeNull();
  });

  test("falls back to * wildcard variant when no exact match", () => {
    const variantsWithWildcard: MockVariant[] = [
      { key: "123", body: '{"id": 123}', statusCode: 200, bodyType: "json" },
      { key: "*", body: '{"error": "not found"}', statusCode: 404, bodyType: "json" },
    ];
    const result = selectVariant(variantsWithWildcard, "/api/users/789", "/api/users/*");
    expect(result).toEqual(variantsWithWildcard[1]);
  });

  test("exact match takes priority over wildcard fallback", () => {
    const variantsWithWildcard: MockVariant[] = [
      { key: "123", body: '{"id": 123}', statusCode: 200, bodyType: "json" },
      { key: "*", body: '{"error": "not found"}', statusCode: 404, bodyType: "json" },
    ];
    const result = selectVariant(variantsWithWildcard, "/api/users/123", "/api/users/*");
    expect(result).toEqual(variantsWithWildcard[0]);
  });

  test("returns null when variants array is empty", () => {
    const result = selectVariant([], "/api/users/123", "/api/users/*");
    expect(result).toBeNull();
  });

  test("returns null when variants is null", () => {
    const result = selectVariant(null, "/api/users/123", "/api/users/*");
    expect(result).toBeNull();
  });

  test("returns null when URL doesn't match pattern", () => {
    const result = selectVariant(variants, "/api/users", "/api/users/*");
    expect(result).toBeNull();
  });

  test("handles multi-segment captures", () => {
    const multiVariants: MockVariant[] = [
      {
        key: "alice|active",
        body: '{"user": "alice"}',
        statusCode: 200,
        bodyType: "json",
      },
      {
        key: "bob|inactive",
        body: '{"user": "bob"}',
        statusCode: 200,
        bodyType: "json",
      },
    ];
    const result = selectVariant(
      multiVariants,
      "/api/users/alice/status/active",
      "/api/users/*/status/*"
    );
    expect(result).toEqual(multiVariants[0]);
  });

  test("wildcard fallback works with multi-segment captures", () => {
    const multiVariants: MockVariant[] = [
      {
        key: "alice|active",
        body: '{"user": "alice"}',
        statusCode: 200,
        bodyType: "json",
      },
      {
        key: "*",
        body: '{"error": "not found"}',
        statusCode: 404,
        bodyType: "json",
      },
    ];
    const result = selectVariant(
      multiVariants,
      "/api/users/bob/status/pending",
      "/api/users/*/status/*"
    );
    expect(result).toEqual(multiVariants[1]);
  });
});
