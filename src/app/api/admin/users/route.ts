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

    const result = await authService.getAdminUsers(session.user.id);
    if (!result.success || !result.data) {
      return apiError(result.error ?? 'Failed to load users', 403, result.code);
    }

    const totalUsers = result.data.length;
    const activeUsers = result.data.filter((u) => u.isActive).length;
    const adminCount = result.data.filter((u) => u.role === 'ADMIN').length;

    return apiSuccess({
      users: result.data,
      stats: {
        totalUsers,
        activeUsers,
        adminCount,
      },
    });
  } catch (err) {
    console.error('[AdminUsers] Error:', err);
    return apiError('Internal server error loading admin users', 500, 'INTERNAL_ERROR');
  }
}
