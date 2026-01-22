# Complex Workflow Scenarios

Real-world patterns for multi-step interactions.

## 🔑 OAuth2 Flow

### 1. Authorize (`POST /oauth/token`)
- **Action**: First-time login or refresh.
- **Effect**: `state.set` `{ "token": "jwt-{{input.body.username}}" }`.
- **Response**: `{ "access_token": "{{state.token}}", "expires_in": 3600 }`.

### 2. Access Profile (`GET /user/profile`)
- **Condition**: `eq` `input.headers.authorization` to `Bearer {{state.token}}`.
- **Response**: `{ "id": 1, "username": "admin" }`.

## 🛒 Checkout with Inventory

### 1. Add to Cart (`POST /cart`)
- **Effect**: `db.push` to `cart` table.
- **Response**: `{ "status": "added", "itemCount": "{{db.cart.length}}" }`.

### 2. Verify Stock (`POST /checkout`)
- **Condition**: `exists` `db.cart` AND `state.outOfStock` is `false`.
- **Effect**: `db.push` to `orders`.
- **Response**: `{ "orderId": "{{faker:string.uuid}}", "status": "confirmed" }`.

---

## 🏗️ Tips for Success
- Use `db.push` for anything you need to list later.
- Use `state.set` for flags and session-specific data only focused on UI states (like React states).
- Always include a fallback transition (no conditions) for generic 404/400 responses.
