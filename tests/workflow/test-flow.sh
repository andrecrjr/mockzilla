
#!/bin/bash

# Base URL
API_URL="http://localhost:36666/api"
SCENARIO="cart-flow"

echo "1. Reset State"
curl -X DELETE "$API_URL/workflow/state/$SCENARIO"
echo -e "\n"

echo "2. Define Transition (Add to Cart)"
# In a real scenario, this would be done via MCP or DB seed.
# potentially we can insert it via SQL or just rely on manual DB insertion for now.
# For this verify script, we might assume the DB is seeded OR we can use the MCP tool if exposed via HTTP?
# The MCP tools are exposed via /api/transport/route.ts but that's for MCP clients.
# Let's assume we can't easily create transitions via HTTP without MCP client.
# So I will seed the DB directly using a SQL command if possible, or just print what to do.

# Actually, I can use the `bun` CLI to seed it:
echo "Seeding DB..."
docker compose exec -T postgres psql -U mockzilla -d mockzilla -c "
INSERT INTO transitions (scenario_id, name, path, method, conditions, effects, response, meta)
VALUES (
    '$SCENARIO', 
    'Add Item', 
    '/cart/add', 
    'POST', 
    '{}', 
    jsonb_build_array(
        jsonb_build_object('type', 'db.push', 'table', 'items', 'value', '{{input.body}}'),
        jsonb_build_object('type', 'state.set', 'raw', jsonb_build_object('lastAdded', '{{input.body.sku}}'))
    ), 
    jsonb_build_object('status', 200, 'body', jsonb_build_object('success', true)), 
    '{}'
) ON CONFLICT DO NOTHING;
"

echo "3. Trigger Transition (POST /cart/add)"
curl -X POST "$API_URL/workflow/cart/add" \
  -H "Content-Type: application/json" \
  -d '{"sku": "SKU_123", "qty": 1}'
echo -e "\n"

echo "4. Inspect State"
curl "$API_URL/workflow/state/$SCENARIO"
echo -e "\n"
