import { NextResponse } from 'next/server';

export async function GET() {
	return NextResponse.json({
		ok: true,
		service: 'mockzilla',
		desktop: process.env.MOCKZILLA_DESKTOP === '1',
	});
}
