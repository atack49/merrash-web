import { auth } from '@/auth';
import { NextResponse } from 'next/server';

export async function requireAdmin() {
    const session = await auth();

    if (!session?.user) {
        return {
            isAuthorized: false,
            response: NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            ),
        };
    }

    if ((session.user as any).role !== 'admin') {
        return {
            isAuthorized: false,
            response: NextResponse.json(
                { error: 'Forbidden' },
                { status: 403 }
            ),
        };
    }

    return { isAuthorized: true };
}
