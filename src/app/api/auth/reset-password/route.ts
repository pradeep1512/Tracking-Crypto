import { NextRequest } from 'next/server';
import { authService } from '@/lib/auth/auth-service';
import { apiSuccess, apiError } from '@/lib/utils/api';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1';
    const userAgent = request.headers.get('user-agent') || 'Unknown';

    const result = await authService.resetPassword(body, ip, userAgent);

    if (!result.success) {
      const statusCode =
        result.code === 'INVALID_TOKEN' || result.code === 'TOKEN_EXPIRED' || result.code === 'TOKEN_ALREADY_USED'
          ? 400
          : 400;
      return apiError(result.error ?? 'Password reset failed', statusCode, result.code, result.details);
    }

    return apiSuccess({
      message: result.data?.message ?? 'Password updated successfully.',
    });
  } catch (err) {
    console.error('[ResetPassword] Error:', err);
    return apiError('Unable to reset password. Please request a new link.', 500, 'INTERNAL_ERROR');
  }
}
