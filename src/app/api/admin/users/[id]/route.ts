import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth/auth';
import { authService } from '@/lib/auth/auth-service';
import { apiSuccess, apiError } from '@/lib/utils/api';

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return apiError('Unauthorized', 401, 'UNAUTHORIZED');
    }

    const userRole = (session.user as { role?: string })?.role?.toUpperCase();
    if (userRole !== 'ADMIN') {
      return apiError('Forbidden: Administrator privileges required', 403, 'FORBIDDEN');
    }

    const { id } = await context.params;
    const body = await request.json();

    if (body.isActive !== undefined) {
      const res = await authService.setAccountStatus(
        session.user.id,
        id,
        Boolean(body.isActive)
      );
      if (!res.success) {
        return apiError(res.error ?? 'Failed to update status', 400, res.code);
      }
      return apiSuccess({ message: 'User status updated successfully', user: res.data });
    }

    if (body.role !== undefined) {
      if (!['USER', 'ADMIN'].includes(body.role)) {
        return apiError('Invalid role specified', 400, 'INVALID_ROLE');
      }
      const res = await authService.setAccountRole(
        session.user.id,
        id,
        body.role as 'USER' | 'ADMIN'
      );
      if (!res.success) {
        return apiError(res.error ?? 'Failed to update role', 400, res.code);
      }
      return apiSuccess({ message: 'User role updated successfully', user: res.data });
    }

    return apiError('No valid update fields provided', 400, 'NO_UPDATES');
  } catch (err) {
    console.error('[AdminUserUpdate] Error:', err);
    return apiError('Internal server error updating user', 500, 'INTERNAL_ERROR');
  }
}
