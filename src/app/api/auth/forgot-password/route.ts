import { NextRequest } from 'next/server';
import { authService } from '@/lib/auth/auth-service';
import { apiSuccess, apiError } from '@/lib/utils/api';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = body?.email;

    if (!email || typeof email !== 'string') {
      return apiError('A valid email address is required', 400, 'INVALID_EMAIL');
    }

    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1';
    const userAgent = request.headers.get('user-agent') || 'Unknown';

    const result = await authService.requestPasswordReset(email, ip, userAgent);

    return apiSuccess({
      message: result.message,
      ...(result.devResetUrl ? { devResetUrl: result.devResetUrl } : {}),
    });
  } catch (err) {
    console.error('[ForgotPassword] Error:', err);
    return apiError('Unable to process password recovery request', 500, 'INTERNAL_ERROR');
  }
}
