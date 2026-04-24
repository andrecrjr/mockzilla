import { describe, expect, test } from 'bun:test';
import { resolvePath } from '../../lib/utils/path-resolver';

describe('Path Resolver Utility', () => {
	const data = {
		user: {
			id: 1,
			name: 'John',
			address: {
				city: 'San Francisco'
			}
		},
		orders: [
			{ id: 'ord_1', total: 100, items: [{ sku: 'A', qty: 1 }] },
			{ id: 'ord_2', total: 200, items: [{ sku: 'B', qty: 2 }] }
		],
		input: {
			params: { orderId: 'ord_2' }
		}
	};

	test('should resolve simple paths', () => {
		expect(resolvePath('user.name', data)).toBe('John');
		expect(resolvePath('user.address.city', data)).toBe('San Francisco');
	});

	test('should resolve numeric array indices', () => {
		expect(resolvePath('orders[0].id', data)).toBe('ord_1');
		expect(resolvePath('orders[1].total', data)).toBe(200);
	});

	test('should resolve property-based lookups', () => {
		expect(resolvePath('orders[id=ord_1].total', data)).toBe(100);
		expect(resolvePath('orders[id=ord_2].total', data)).toBe(200);
	});

	test('should resolve dynamic lookups from context', () => {
		expect(resolvePath('orders[id=input.params.orderId].total', data)).toBe(200);
	});

	test('should resolve nested lookups', () => {
		expect(resolvePath('orders[id=ord_1].items[sku=A].qty', data)).toBe(1);
	});

	test('should handle missing paths gracefully', () => {
		expect(resolvePath('user.age', data)).toBeUndefined();
		expect(resolvePath('orders[id=missing]', data)).toBeUndefined();
	});

	test('should handle dots inside predicates', () => {
		const complex = {
			meta: { 'field.name': 'value' },
			list: [{ 'key.id': '123', status: 'active' }]
		};
		expect(resolvePath('list[key.id=123].status', complex)).toBe('active');
	});

	test('should handle leading $. and $', () => {
		expect(resolvePath('$.user.id', data)).toBe(1);
		expect(resolvePath('$user.id', data)).toBe(1);
	});
});
