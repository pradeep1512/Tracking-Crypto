import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth/auth';
import { authService } from '@/lib/auth/auth-service';
import { apiSuccess, apiError } from '@/lib/utils/api';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return apiError('Unauthorized', 401, 'UNAUTHORIZED');
    }

    const userRole = (session.user as { role?: string })?.role?.toUpperCase();
    if (userRole !== 'ADMIN') {
      return apiError('Forbidden: Administrator privileges required', 403, 'FORBIDDEN');
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const result = await authService.getAuditLogs(session.user.id, limit);
    if (!result.success || !result.data) {
      return apiError(result.error ?? 'Failed to load audit logs', 403, result.code);
    }

    return apiSuccess({ logs: result.data });
  } catch (err) {
    console.error('[AdminAuditLogs] Error:', err);
    return apiError('Internal server error loading audit logs', 500, 'INTERNAL_ERROR');
  }
}
