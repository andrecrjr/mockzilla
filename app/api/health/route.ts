import { NextResponse } from 'next/server';
import { MOCKZILLA_VERSION } from '@/lib/version';

export async function GET() {
	return NextResponse.json({
		ok: true,
		service: 'mockzilla',
		version: MOCKZILLA_VERSION,
		desktop: process.env.MOCKZILLA_DESKTOP === '1',
	});
}
