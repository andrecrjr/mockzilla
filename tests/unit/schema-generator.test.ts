import { describe, it, expect } from "bun:test";
import { generateFromSchema, validateSchema } from "../../lib/schema-generator";

describe("lib/schema-generator", () => {
    describe("validateSchema", () => {
        it("returns valid for correct JSON schema", () => {
            const schema = JSON.stringify({ type: "string" });
            const result = validateSchema(schema);
            expect(result.valid).toBe(true);
        });

        it("returns invalid for malformed JSON", () => {
            const result = validateSchema("{ invalid json }");
            expect(result.valid).toBe(false);
            expect(result.error).toBeDefined();
        });
    });

    describe("generateFromSchema", () => {
        it("generates simple types", () => {
            const schema = {
                type: "object",
                properties: {
                    name: { type: "string" },
                    age: { type: "integer" }
                },
                required: ["name", "age"]
            };
            const json = generateFromSchema(schema);
            const data = JSON.parse(json);
            
            expect(data).toHaveProperty("name");
            expect(typeof data.name).toBe("string");
            expect(data).toHaveProperty("age");
            expect(typeof data.age).toBe("number");
        });

        it("does not generate unwanted additional properties (fillProperties: false)", () => {
            const schema = {
                type: "object",
                properties: {
                    exact_field: { type: "string", const: "value" }
                }
            };
            const json = generateFromSchema(schema);
            const data = JSON.parse(json);
            
            expect(data).toHaveProperty("exact_field", "value");
            // No other random keys should be generated
            expect(Object.keys(data).length).toBe(1);
        });

        it("generates data using x-faker extension", () => {
            const schema = {
                type: "object",
                properties: {
                    email: { type: "string", "x-faker": "internet.email" }
                }
            };
            const json = generateFromSchema(schema);
            const data = JSON.parse(json);
            
            expect(data).toHaveProperty("email");
            expect(data.email).toMatch(/@/); // Simple validation that an email was generated
            expect(Object.keys(data).length).toBe(1);
        });

        it("handles post-processing templates {$.field}", () => {
            const schema = {
                type: "object",
                properties: {
                    firstName: { type: "string" },
                    fullName: { 
                        type: "string", 
                        const: "full name: {$.firstName}" 
                    }
                },
                required: ["firstName", "fullName"]
            };

            const json = generateFromSchema(schema);
            const data = JSON.parse(json);

            expect(data.fullName).toContain("full name:");
            expect(data.fullName).toContain(data.firstName);
        });
    });
});
