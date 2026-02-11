import { describe, it, expect } from "bun:test";
import { isOpenApiFormat, convertOpenApiToMockzilla } from "../../lib/openapi-import";
import type { OpenAPIV3 } from "openapi-types";

describe("lib/openapi-import", () => {
    describe("isOpenApiFormat", () => {
        it("returns true for valid OpenAPI 3.0 document", () => {
            const doc = {
                openapi: "3.0.0",
                info: { title: "Test API", version: "1.0.0" },
                paths: {}
            };
            expect(isOpenApiFormat(doc)).toBe(true);
        });

        it("returns false for missing required fields", () => {
            const doc = {
                info: { title: "Test API" }
            };
            expect(isOpenApiFormat(doc)).toBe(false);
        });

        it("returns false for null or non-object", () => {
            expect(isOpenApiFormat(null)).toBe(false);
            expect(isOpenApiFormat("string")).toBe(false);
        });
    });

    describe("convertOpenApiToMockzilla", () => {
        it("converts basic info to folder", async () => {
            const doc: OpenAPIV3.Document = {
                openapi: "3.0.0",
                info: { title: "My Cool API", version: "1.0.0" },
                paths: {}
            };
            
            const result = await convertOpenApiToMockzilla(doc);
            
            expect(result.folders).toHaveLength(1);
            expect(result.folders[0].name).toBe("My Cool API");
            expect(result.folders[0].slug).toBe("my-cool-api");
            expect(result.folders[0].description).toContain("v1.0.0");
        });

        it("converts paths and methods to mocks", async () => {
            const doc: OpenAPIV3.Document = {
                openapi: "3.0.0",
                info: { title: "Test API", version: "1.0.0" },
                paths: {
                    "/users": {
                        get: {
                            operationId: "getUsers",
                            responses: {
                                "200": {
                                    content: {
                                        "application/json": {
                                            schema: { type: "array" }
                                        }
                                    }
                                }
                            }
                        },
                        post: {
                            responses: {
                                "201": {
                                    description: "Created"
                                }
                            }
                        }
                    }
                }
            };

            const result = await convertOpenApiToMockzilla(doc);
            
            expect(result.mocks).toHaveLength(2);
            
            const getMock = result.mocks.find(m => m.method === "GET");
            expect(getMock).toBeDefined();
            expect(getMock?.path).toBe("/users");
            expect(getMock?.name).toBe("getUsers");
            expect(getMock?.statusCode).toBe(200);
            expect(getMock?.useDynamicResponse).toBe(true);
            expect(getMock?.jsonSchema).toBeDefined();

            const postMock = result.mocks.find(m => m.method === "POST");
            expect(postMock).toBeDefined();
            expect(postMock?.path).toBe("/users");
            expect(postMock?.name).toBe("POST /users"); // Fallback name
            expect(postMock?.statusCode).toBe(201);
        });

        it("handles paths with parameters", async () => {
             const doc: OpenAPIV3.Document = {
                openapi: "3.0.0",
                info: { title: "Test API", version: "1.0.0" },
                paths: {
                    "/users/{id}": {
                        get: {
                            responses: { "200": { description: "OK" } }
                        }
                    }
                }
            };

            const result = await convertOpenApiToMockzilla(doc);
            const mock = result.mocks[0];
            
            expect(mock.path).toBe("/users/{id}");
        });
        
        it("skips non-http methods", async () => {
            const doc = {
                openapi: "3.0.0",
                info: { title: "Test API", version: "1.0.0" },
                paths: {
                    "/users": {
                        "x-custom-field": "some value",
                        parameters: []
                    }
                }
            } as unknown as OpenAPIV3.Document;

            const result = await convertOpenApiToMockzilla(doc);
            expect(result.mocks).toHaveLength(0);
        });
    });
});
