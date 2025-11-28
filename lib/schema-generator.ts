import { faker } from "@faker-js/faker"
import jsf from "json-schema-faker"

// Configure json-schema-faker to use faker.js
jsf.extend("faker", () => faker)

// Configure default options
jsf.option({
  alwaysFakeOptionals: true,
  useDefaultValue: true,
  useExamplesValue: true,
  fixedProbabilities: true,
  minItems: 1,
  maxItems: 5,
})

/**
 * Validates if a string is valid JSON Schema
 */
export function validateSchema(schemaString: string): { valid: boolean; error?: string } {
  try {
    const schema = JSON.parse(schemaString)
    
    // Basic validation - check if it has type or properties
    if (!schema.type && !schema.properties && !schema.$ref) {
      return {
        valid: false,
        error: "Schema must have at least a 'type', 'properties', or '$ref' field",
      }
    }
    
    return { valid: true }
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : "Invalid JSON",
    }
  }
}

/**
 * Generates sample JSON data from a JSON Schema
 */
export function generateFromSchema(schema: object): string {
  try {
    const generated = jsf.generate(schema)
    return JSON.stringify(generated, null, 2)
  } catch (error) {
    throw new Error(
      `Failed to generate from schema: ${error instanceof Error ? error.message : "Unknown error"}`
    )
  }
}

/**
 * Generates sample JSON data from a JSON Schema string
 */
export function generateFromSchemaString(schemaString: string): string {
  const validation = validateSchema(schemaString)
  
  if (!validation.valid) {
    throw new Error(`Invalid schema: ${validation.error}`)
  }
  
  const schema = JSON.parse(schemaString)
  return generateFromSchema(schema)
}
