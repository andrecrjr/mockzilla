import { pgTable, text, uuid, timestamp, integer, boolean, pgEnum } from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm"

// Enums
export const httpMethodEnum = pgEnum("http_method", [
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "HEAD",
  "OPTIONS",
])

export const matchTypeEnum = pgEnum("match_type", ["exact", "substring"])

export const bodyTypeEnum = pgEnum("body_type", ["json", "text"])

// Tables
export const folders = pgTable("folders", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at"),
})

export const mockResponses = pgTable("mock_responses", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  endpoint: text("endpoint").notNull(),
  method: httpMethodEnum("method").notNull().default("GET"),
  statusCode: integer("status_code").notNull().default(200),
  response: text("response").notNull(),
  folderId: uuid("folder_id")
    .notNull()
    .references(() => folders.id, { onDelete: "cascade" }),
  matchType: matchTypeEnum("match_type").default("exact"),
  bodyType: bodyTypeEnum("body_type").default("json"),
  enabled: boolean("enabled").default(true).notNull(),
  jsonSchema: text("json_schema"),
  useDynamicResponse: boolean("use_dynamic_response").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at"),
})

// Relations
export const foldersRelations = relations(folders, ({ many }) => ({
  mocks: many(mockResponses),
}))

export const mockResponsesRelations = relations(mockResponses, ({ one }) => ({
  folder: one(folders, {
    fields: [mockResponses.folderId],
    references: [folders.id],
  }),
}))
