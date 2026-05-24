import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { NextRequest } from 'next/server';

// 1. Mock Data
const mockScenario = {
    id: 'test-scenario',
    name: 'Test Scenario',
    description: 'A test scenario description',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
};

const mockTransition = {
    id: 1,
    scenarioId: 'test-scenario',
    name: 'Initial Step',
    description: 'First step of workflow',
    path: '/start',
    method: 'POST',
    conditions: [],
    effects: [{ type: 'state.set', raw: { step: 1 } }],
    response: { status: 200, body: { message: 'Started' } },
    meta: {},
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
};

// 2. Chainable mock builder
const createMockBuilder = (resolvedValue: unknown) => {
    const builder = {
        from: mock(() => builder),
        where: mock(() => builder),
        orderBy: mock(() => builder),
        groupBy: mock(() => builder),
        limit: mock(() => builder),
        values: mock(() => builder),
        set: mock(() => builder),
        returning: mock(() => builder),
        onConflictDoUpdate: mock(() => builder),
        onConflictDoNothing: mock(() => builder),
        then: (resolve: (val: unknown) => void) => resolve(resolvedValue),
    } as any;
    return builder;
};

let mockDbResults: any = {
    scenarios: [mockScenario],
    transitions: [mockTransition],
    counts: [{ scenarioId: 'test-scenario', count: 1 }],
};

const mockDb = {
    select: mock((args: any) => {
        if (args && args.scenarioId && args.count) {
            return createMockBuilder(mockDbResults.counts);
        }
        // In the scenarios GET, it first selects from scenarios, then from transitions for counts
        // We'll handle this in the test cases if needed by re-mocking
        return createMockBuilder(mockDbResults.scenarios);
    }),
    insert: mock(() => createMockBuilder([mockScenario])),
    update: mock(() => createMockBuilder([mockScenario])),
    delete: mock(() => createMockBuilder([])),
};

mock.module('@/lib/db', () => ({ db: mockDb }));

// Import route handlers
import * as scenariosRoute from '../../app/api/workflow/scenarios/route';
import * as scenarioItemRoute from '../../app/api/workflow/scenarios/[slug]/route';
import * as transitionsRoute from '../../app/api/workflow/transitions/route';
import * as transitionItemRoute from '../../app/api/workflow/transitions/[id]/route';
import * as execRoute from '../../app/api/workflow/exec/[scenarioSlug]/[...path]/route';

describe('Workflow API Integration', () => {
    beforeEach(() => {
        mockDb.select.mockClear();
        mockDb.insert.mockClear();
        mockDb.update.mockClear();
        mockDb.delete.mockClear();
        mockDbResults = {
            scenarios: [mockScenario],
            transitions: [mockTransition],
            counts: [{ scenarioId: 'test-scenario', count: 1 }],
        };
    });

    describe('Scenarios API', () => {
        it('GET /api/workflow/scenarios returns all scenarios with counts', async () => {
            let callCount = 0;
            mockDb.select = mock(() => {
                callCount++;
                if (callCount === 1) return createMockBuilder(mockDbResults.scenarios);
                if (callCount === 2) return createMockBuilder(mockDbResults.counts);
                return createMockBuilder([]);
            });

            const req = new NextRequest('http://localhost:3000/api/workflow/scenarios');
            const res = await scenariosRoute.GET(req);
            const body = await res.json();

            expect(res.status).toBe(200);
            expect(body).toBeArray();
            expect(body[0].id).toBe('test-scenario');
            expect(body[0].count).toBe(1);
        });

        it('POST /api/workflow/scenarios creates a new scenario', async () => {
            mockDb.select = mock(() => createMockBuilder([])); // Check uniqueness: not found
            mockDb.insert = mock(() => createMockBuilder([{ ...mockScenario, id: 'new-scenario', name: 'New Scenario' }]));

            const payload = { name: 'New Scenario', description: 'New Desc' };
            const req = new NextRequest('http://localhost:3000/api/workflow/scenarios', {
                method: 'POST',
                body: JSON.stringify(payload),
            });

            const res = await scenariosRoute.POST(req);
            const body = await res.json();

            expect(res.status).toBe(201);
            expect(body.id).toBe('new-scenario');
            expect(mockDb.insert).toHaveBeenCalled();
        });

        it('PUT /api/workflow/scenarios/[slug] updates a scenario', async () => {
            mockDb.select = mock(() => createMockBuilder([mockScenario])); // Exists check
            mockDb.update = mock(() => createMockBuilder([{ ...mockScenario, name: 'Updated Name' }]));

            const payload = { name: 'Updated Name' };
            const req = new NextRequest('http://localhost:3000/api/workflow/scenarios/test-scenario', {
                method: 'PUT',
                body: JSON.stringify(payload),
            });
            const params = Promise.resolve({ slug: 'test-scenario' });

            const res = await scenarioItemRoute.PUT(req, { params });
            const body = await res.json();

            expect(res.status).toBe(200);
            expect(body.name).toBe('Updated Name');
        });

        it('DELETE /api/workflow/scenarios/[slug] deletes scenario and its transitions', async () => {
            mockDb.select = mock(() => createMockBuilder([mockScenario])); // Exists check
            
            const req = new NextRequest('http://localhost:3000/api/workflow/scenarios/test-scenario', {
                method: 'DELETE',
            });
            const params = Promise.resolve({ slug: 'test-scenario' });

            const res = await scenarioItemRoute.DELETE(req, { params });
            const body = await res.json();

            expect(res.status).toBe(200);
            expect(body.message).toContain('deleted successfully');
            expect(mockDb.delete).toHaveBeenCalledTimes(2); // One for transitions, one for scenario
        });
    });

    describe('Transitions API', () => {
        it('GET /api/workflow/transitions?scenarioId=... returns transitions', async () => {
            mockDb.select = mock(() => createMockBuilder(mockDbResults.transitions));

            const req = new NextRequest('http://localhost:3000/api/workflow/transitions?scenarioId=test-scenario');
            const res = await transitionsRoute.GET(req);
            const body = await res.json();

            expect(res.status).toBe(200);
            expect(body).toBeArray();
            expect(body[0].scenarioId).toBe('test-scenario');
        });

        it('POST /api/workflow/transitions creates a new transition', async () => {
            mockDb.insert = mock(() => createMockBuilder([mockTransition]));
            mockDb.update = mock(() => createMockBuilder([mockScenario])); // Update scenario updatedAt

            const payload = {
                scenarioId: 'test-scenario',
                name: 'New Step',
                path: '/next',
                method: 'GET',
                response: { status: 200, body: { ok: true } }
            };
            const req = new NextRequest('http://localhost:3000/api/workflow/transitions', {
                method: 'POST',
                body: JSON.stringify(payload),
            });

            const res = await transitionsRoute.POST(req);
            const body = await res.json();

            expect(res.status).toBe(201);
            expect(body.path).toBe('/start'); // From mockTransition
        });
    });

    describe('Workflow Execution', () => {
        it('executes a workflow transition successfully', async () => {
            // This is the most complex one to mock because execRoute.POST calls findTransition 
            // and processWorkflowRequest, which both call db.
            
            // findTransition calls: db.select().from(transitions).where(...)
            // processWorkflowRequest calls: 
            // 1. db.select().from(workflowState).where(...)
            // 2. (if effects) db.insert/update/select on workflowState/mini-db
            
            let callCount = 0;
            mockDb.select = mock(() => {
                callCount++;
                if (callCount === 1) return createMockBuilder([mockTransition]); // findTransition candidates
                if (callCount === 2) return createMockBuilder([]); // processWorkflowRequest: no state yet
                return createMockBuilder([]);
            });
            
            mockDb.insert = mock(() => createMockBuilder([])); // Initialize state or apply effects

            const req = new NextRequest('http://localhost:3000/api/workflow/exec/test-scenario/start', {
                method: 'POST',
                body: JSON.stringify({ data: 'test' }),
            });
            const params = Promise.resolve({ scenarioSlug: 'test-scenario', path: ['start'] });

            const res = await execRoute.POST(req, { params });
            const body = await res.json();

            expect(res.status).toBe(200);
            expect(body).toEqual({ message: 'Started' });
        });

        it('returns 404 if no transition found', async () => {
            mockDb.select = mock(() => createMockBuilder([])); // No candidates

            const req = new NextRequest('http://localhost:3000/api/workflow/exec/test-scenario/unknown');
            const params = Promise.resolve({ scenarioSlug: 'test-scenario', path: ['unknown'] });

            const res = await execRoute.POST(req, { params });
            expect(res.status).toBe(404);
        });

        it('maintains state between multiple requests', async () => {
            // First request: sets state step=1
            // Second request: depends on step=1, sets step=2
            
            const transition1 = {
                ...mockTransition,
                id: 1,
                path: '/step1',
                effects: [{ type: 'state.set', raw: { step: 1 } }],
                response: { status: 200, body: { step: 1 } }
            };

            const transition2 = {
                ...mockTransition,
                id: 2,
                path: '/step2',
                conditions: [{ field: 'state.step', type: 'eq', value: 1 }],
                effects: [{ type: 'state.set', raw: { step: 2 } }],
                response: { status: 200, body: { step: 2 } }
            };

            // Mock DB for first request
            let callCount = 0;
            mockDb.select = mock(() => {
                callCount++;
                if (callCount === 1) return createMockBuilder([transition1]); // findTransition
                if (callCount === 2) return createMockBuilder([]); // loadState (empty)
                return createMockBuilder([]);
            });

            const req1 = new NextRequest('http://localhost:3000/api/workflow/exec/test-scenario/step1', { method: 'POST' });
            const params1 = Promise.resolve({ scenarioSlug: 'test-scenario', path: ['step1'] });
            const res1 = await execRoute.POST(req1, { params: params1 });
            expect(res1.status).toBe(200);
            expect(await res1.json()).toEqual({ step: 1 });

            // Mock DB for second request
            callCount = 0;
            mockDb.select = mock(() => {
                callCount++;
                if (callCount === 1) return createMockBuilder([transition2]); // findTransition
                if (callCount === 2) return createMockBuilder([{ data: { state: { step: 1 }, tables: {} } }]); // loadState (with state from step 1)
                return createMockBuilder([]);
            });

            const req2 = new NextRequest('http://localhost:3000/api/workflow/exec/test-scenario/step2', { method: 'POST' });
            const params2 = Promise.resolve({ scenarioSlug: 'test-scenario', path: ['step2'] });
            const res2 = await execRoute.POST(req2, { params: params2 });
            expect(res2.status).toBe(200);
            expect(await res2.json()).toEqual({ step: 2 });
        });

        it('handles path parameters correctly', async () => {
            const paramTransition = {
                ...mockTransition,
                path: '/users/:id',
                response: { status: 200, body: { userId: '{{params.id}}' } }
            };

            let callCount = 0;
            mockDb.select = mock(() => {
                callCount++;
                if (callCount === 1) return createMockBuilder([]); // exactMatch select: none
                if (callCount === 2) return createMockBuilder([paramTransition]); // allTransitions select
                if (callCount === 3) return createMockBuilder([]); // loadState select
                return createMockBuilder([]);
            });

            const req = new NextRequest('http://localhost:3000/api/workflow/exec/test-scenario/users/123', { method: 'GET' });
            const params = Promise.resolve({ scenarioSlug: 'test-scenario', path: ['users', '123'] });

            const res = await execRoute.GET(req, { params });
            const body = await res.json();

            expect(res.status).toBe(200);
            expect(body.userId).toBe('123');
        });

        it('returns 400 if transition conditions are not met', async () => {
            const conditionTransition = {
                ...mockTransition,
                conditions: [{ field: 'state.is_admin', type: 'eq', value: true }],
                response: { status: 200, body: { secret: 'top-secret' } }
            };

            let callCount = 0;
            mockDb.select = mock(() => {
                callCount++;
                if (callCount === 1) return createMockBuilder([conditionTransition]); // findTransition
                if (callCount === 2) return createMockBuilder([{ data: { state: { is_admin: false }, tables: {} } }]); // loadState (not admin)
                return createMockBuilder([]);
            });

            const req = new NextRequest('http://localhost:3000/api/workflow/exec/test-scenario/start', { method: 'POST' });
            const params = Promise.resolve({ scenarioSlug: 'test-scenario', path: ['start'] });

            const res = await execRoute.POST(req, { params });
            expect(res.status).toBe(400);
            const body = await res.json();
            expect(body.error).toBe('Transition conditions not met');
        });

        it('handles complex condition operators (neq, exists, gt, lt, contains)', async () => {
            const complexTransition = {
                ...mockTransition,
                conditions: [
                    { field: 'state.status', type: 'neq', value: 'inactive' },
                    { field: 'input.body.id', type: 'exists' },
                    { field: 'input.query.age', type: 'gt', value: 18 },
                    { field: 'input.query.limit', type: 'lt', value: 100 },
                    { field: 'input.headers.x-role', type: 'contains', value: 'admin' }
                ],
                response: { status: 200, body: { ok: true } }
            };

            let callCount = 0;
            mockDb.select = mock(() => {
                callCount++;
                if (callCount === 1) return createMockBuilder([complexTransition]);
                if (callCount === 2) return createMockBuilder([{ 
                    data: { 
                        state: { status: 'active' }, 
                        tables: {} 
                    } 
                }]);
                return createMockBuilder([]);
            });

            const req = new NextRequest('http://localhost:3000/api/workflow/exec/test-scenario/start?age=20&limit=50', {
                method: 'POST',
                body: JSON.stringify({ id: '123' }),
                headers: { 'x-role': 'super-admin' }
            });
            const params = Promise.resolve({ scenarioSlug: 'test-scenario', path: ['start'] });

            const res = await execRoute.POST(req, { params });
            expect(res.status).toBe(200);
            expect(await res.json()).toEqual({ ok: true });
        });
    });

    describe('State API', () => {
        const stateHandler = require('../../app/api/workflow/state/[scenario]/route');

        it('GET /api/workflow/state/[scenario] returns current state', async () => {
            mockDb.select = mock(() => createMockBuilder([{ data: { state: { foo: 'bar' }, tables: {} } }]));

            const req = new NextRequest('http://localhost:3000/api/workflow/state/test-scenario');
            const params = Promise.resolve({ scenario: 'test-scenario' });

            const res = await stateHandler.GET(req, { params });
            const body = await res.json();

            expect(res.status).toBe(200);
            expect(body.data.state.foo).toBe('bar');
        });

        it('POST /api/workflow/state/[scenario] initializes state', async () => {
            const payload = { state: { initialized: true } };
            const req = new NextRequest('http://localhost:3000/api/workflow/state/test-scenario', {
                method: 'POST',
                body: JSON.stringify(payload),
            });
            const params = Promise.resolve({ scenario: 'test-scenario' });

            const res = await stateHandler.POST(req, { params });
            expect(res.status).toBe(200);
            expect(mockDb.insert).toHaveBeenCalled();
        });

        it('DELETE /api/workflow/state/[scenario] resets state', async () => {
            const req = new NextRequest('http://localhost:3000/api/workflow/state/test-scenario', {
                method: 'DELETE',
            });
            const params = Promise.resolve({ scenario: 'test-scenario' });

            const res = await stateHandler.DELETE(req, { params });
            expect(res.status).toBe(200);
            expect(mockDb.delete).toHaveBeenCalled();
        });
    });

    describe('Export/Import API', () => {
        const exportHandler = require('../../app/api/workflow/export/route');
        const importHandler = require('../../app/api/workflow/import/route');

        it('GET /api/workflow/export returns all workflow data', async () => {
            let callCount = 0;
            mockDb.select = mock(() => {
                callCount++;
                if (callCount === 1) return createMockBuilder([mockScenario]);
                if (callCount === 2) return createMockBuilder([mockTransition]);
                return createMockBuilder([]);
            });

            const req = new NextRequest('http://localhost:3000/api/workflow/export');
            const res = await exportHandler.GET(req);
            const body = await res.json();

            expect(res.status).toBe(200);
            expect(body.scenarios).toHaveLength(1);
            expect(body.transitions).toHaveLength(1);
            expect(res.headers.get('Content-Disposition')).toContain('attachment');
        });

        it('POST /api/workflow/import imports workflow data', async () => {
            mockDb.select = mock(() => createMockBuilder([])); // Uniqueness check (none found -> insert)
            mockDb.insert = mock(() => createMockBuilder([mockScenario]));
            mockDb.delete = mock(() => createMockBuilder([]));

            const payload = {
                scenarios: [mockScenario],
                transitions: [mockTransition]
            };
            const req = new NextRequest('http://localhost:3000/api/workflow/import', {
                method: 'POST',
                body: JSON.stringify(payload),
            });

            const res = await importHandler.POST(req);
            const body = await res.json();

            expect(res.status).toBe(200);
            expect(body.success).toBe(true);
            expect(body.importedScenarios).toBe(1);
            expect(mockDb.insert).toHaveBeenCalled();
        });
    });
});
