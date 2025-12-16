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
