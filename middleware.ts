import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

const DEPLOY_MODE = process.env.DEPLOY_MODE || 'full';

// Routes that are always accessible
const PUBLIC_ROUTES = ['/', '/docs', '/docsv2'];

// Routes blocked in landing-only mode
const BLOCKED_PREFIXES = ['/app', '/api'];

function isPublicRoute(pathname: string): boolean {
	return PUBLIC_ROUTES.some(route => {
		if (route === '/') return pathname === '/';
		return pathname === route || pathname.startsWith(`${route}/`);
	});
}

function isBlockedRoute(pathname: string): boolean {
	return BLOCKED_PREFIXES.some(prefix => pathname.startsWith(prefix));
}

// Global CORS middleware for all /api/* routes
export function middleware(request: NextRequest) {
	const pathname = new URL(request.url).pathname;

	// Landing-only mode: block app and API routes
	if (DEPLOY_MODE === 'landing' && isBlockedRoute(pathname)) {
		return new NextResponse('Not Found', { status: 404 });
	}

	// If not an API route, pass through
	if (!pathname.startsWith('/api/')) {
		return NextResponse.next();
	}

	const origin = request.headers.get('origin') || '*';

	const allowedMethods = 'GET,POST,PUT,PATCH,DELETE,OPTIONS';
	const allowedHeaders =
		request.headers.get('access-control-request-headers') ||
		'Content-Type, Authorization';

	// Preflight request
	if (request.method === 'OPTIONS') {
		return new NextResponse(null, {
			status: 204,
			headers: {
				'Access-Control-Allow-Origin': origin,
				'Access-Control-Allow-Credentials': 'true',
				'Access-Control-Allow-Methods': allowedMethods,
				'Access-Control-Allow-Headers': allowedHeaders,
				'Access-Control-Max-Age': '86400',
			},
		});
	}

	// Actual request: pass through and add CORS headers
	const response = NextResponse.next();
	response.headers.set('Access-Control-Allow-Origin', origin);
	response.headers.set('Access-Control-Allow-Credentials', 'true');
	response.headers.set('Access-Control-Allow-Methods', allowedMethods);
	response.headers.set('Access-Control-Allow-Headers', allowedHeaders);
	response.headers.set('Access-Control-Max-Age', '86400');

	return response;
}

// Run middleware on all routes except static assets
export const config = {
	matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:css|js|png|jpg|jpeg|gif|svg|ico|woff2|ttf|json)$).*)'],
};
