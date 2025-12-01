/**
 * Test script for string interpolation feature
 * Run with: npx tsx test-interpolation.ts
 */

import { generateFromSchema } from "./lib/schema-generator"

console.log("🧪 Testing String Interpolation Feature\n")

// Test 1: Simple field reference
console.log("Test 1: Simple Field Reference")
console.log("=" .repeat(50))
const schema1 = {
  type: "object",
  properties: {
    id: {
      type: "string",
      format: "uuid",
    },
    message: {
      const: "Your ticket ID is {$.id}",
    },
  },
}
const result1 = generateFromSchema(schema1)
console.log(result1)
const parsed1 = JSON.parse(result1)
const test1Pass = parsed1.message.includes(parsed1.id)
console.log(`✅ Test 1: ${test1Pass ? "PASS" : "FAIL"} - Message contains ID\n`)

// Test 2: Nested object reference
console.log("Test 2: Nested Object Reference")
console.log("=".repeat(50))
const schema2 = {
  type: "object",
  properties: {
    user: {
      type: "object",
      properties: {
        firstName: {
          type: "string",
          faker: "person.firstName",
        },
        lastName: {
          type: "string",
          faker: "person.lastName",
        },
      },
    },
    greeting: {
      const: "Hello, {$.user.firstName} {$.user.lastName}!",
    },
  },
}
const result2 = generateFromSchema(schema2)
console.log(result2)
const parsed2 = JSON.parse(result2)
const test2Pass =
  parsed2.greeting.includes(parsed2.user.firstName) && parsed2.greeting.includes(parsed2.user.lastName)
console.log(`✅ Test 2: ${test2Pass ? "PASS" : "FAIL"} - Greeting contains user names\n`)

// Test 3: Multiple references
console.log("Test 3: Multiple References")
console.log("=".repeat(50))
const schema3 = {
  type: "object",
  properties: {
    orderId: {
      type: "string",
      format: "uuid",
    },
    customerId: {
      type: "string",
      format: "uuid",
    },
    statusMessage: {
      const: "Order {$.orderId} for customer {$.customerId} is being processed",
    },
  },
}
const result3 = generateFromSchema(schema3)
console.log(result3)
const parsed3 = JSON.parse(result3)
const test3Pass = parsed3.statusMessage.includes(parsed3.orderId) && parsed3.statusMessage.includes(parsed3.customerId)
console.log(`✅ Test 3: ${test3Pass ? "PASS" : "FAIL"} - Status message contains both IDs\n`)

// Test 4: Custom formats (x-store-as and x-ref)
console.log("Test 4: Custom Formats (x-store-as and x-ref)")
console.log("=".repeat(50))
const schema4 = {
  type: "object",
  properties: {
    userId: {
      type: "string",
      format: "x-store-as",
      "x-key": "mainUserId",
    },
    createdBy: {
      type: "string",
      format: "x-ref",
      "x-key": "mainUserId",
    },
    modifiedBy: {
      type: "string",
      format: "x-ref",
      "x-key": "mainUserId",
    },
  },
}
const result4 = generateFromSchema(schema4)
console.log(result4)
const parsed4 = JSON.parse(result4)
const test4Pass = parsed4.userId === parsed4.createdBy && parsed4.userId === parsed4.modifiedBy
console.log(`✅ Test 4: ${test4Pass ? "PASS" : "FAIL"} - All IDs match\n`)


// Test 5: Array element reference
console.log("Test 5: Array Element Reference")
console.log("=".repeat(50))
const schema5 = {
  type: "object",
  properties: {
    items: {
      type: "array",
      minItems: 2,
      maxItems: 2,
      items: {
        type: "object",
        properties: {
          id: {
            type: "string",
            format: "uuid",
          },
          name: {
            type: "string",
            faker: "commerce.productName",
          },
        },
      },
    },
    featuredProduct: {
      const: "{$.items[0].name}",
    },
  },
}
const result5 = generateFromSchema(schema5)
console.log(result5)
const parsed5 = JSON.parse(result5)
const test5Pass = parsed5.featuredProduct === parsed5.items[0].name
console.log(`✅ Test 5: ${test5Pass ? "PASS" : "FAIL"} - Featured product matches first item\n`)

// Summary
console.log("\n" + "=".repeat(50))
console.log("📊 Test Summary")
console.log("=".repeat(50))
const allTests = [test1Pass, test2Pass, test3Pass, test4Pass, test5Pass]
const passCount = allTests.filter((t) => t).length
console.log(`Total: ${allTests.length} tests`)
console.log(`Passed: ${passCount}`)
console.log(`Failed: ${allTests.length - passCount}`)

if (passCount === allTests.length) {
  console.log("\n🎉 All tests passed!")
} else {
  console.log("\n❌ Some tests failed")
  process.exit(1)
}
