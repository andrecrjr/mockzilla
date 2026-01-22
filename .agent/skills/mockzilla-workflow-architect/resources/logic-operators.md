# Logic Operators Reference

Mockzilla uses a structured JSON format for conditions.

## Supported Operators

### `eq` (Equals)
Matches exactly (case-sensitive for strings).
```json
{ "type": "eq", "field": "input.body.type", "value": "admin" }
```

### `neq` (Not Equals)
Fires if the values are different.
```json
{ "type": "neq", "field": "state.status", "value": "locked" }
```

### `exists` (Field Exists)
Checks if a field is present and not null.
```json
{ "type": "exists", "field": "input.headers.x-api-key" }
```

### `gt` / `lt` (Greater/Less Than)
Numeric comparisons.
```json
{ "type": "gt", "field": "input.query.limit", "value": 100 }
```

### `contains` (Contains)
Checks if a string contains a substring or an array contains an element.
```json
{ "type": "contains", "field": "input.body.roles", "value": "editor" }
```

## Available Context Fields
- `input.body.*`: Request body fields
- `input.query.*`: Query string parameters
- `input.params.*`: URL path parameters (e.g., `:id`)
- `input.headers.*`: Lowercase header names
- `state.*`: Current scenario state
- `db.tableName`: Access the first item or use `{{db.table[0].id}}` interpolation patterns.
