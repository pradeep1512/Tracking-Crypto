import { NextRequest } from 'next/server';
import { authService } from '@/lib/auth/auth-service';
import { apiSuccess, apiError } from '@/lib/utils/api';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1';

    const result = await authService.registerUser(body, ip);

    if (!result.success) {
      const statusCode =
        result.code === 'EMAIL_EXISTS'
          ? 409
          : result.code === 'RATE_LIMITED'
          ? 429
          : 400;
      return apiError(result.error ?? 'Registration failed', statusCode, result.code, result.details);
    }

    return apiSuccess(
      {
        user: result.data,
        message: 'Account registered successfully. You may now sign in.',
      },
      201
    );
  } catch (err) {
    console.error('[Register] Error:', err);
    return apiError('An unexpected server error occurred during registration', 500, 'INTERNAL_ERROR');
  }
}
