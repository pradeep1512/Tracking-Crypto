import { type NextRequest } from 'next/server';
import { alertService } from '@/services/AlertService';
import { apiSuccess, apiError, handleUnknownError } from '@/lib/utils/api';
import { requireAuthUser } from '@/lib/auth/server-auth';
import type { AlertType, AlertSeverity } from '@/types';

export async function GET(request: NextRequest) {
  try {
    const authCheck = await requireAuthUser();
    if (authCheck.errorResponse) return authCheck.errorResponse;
    const { user } = authCheck;

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') ?? user.id;

    const alerts = await alertService.getAlerts(userId);
    const unreadCount = alerts.filter((a) => !a.isRead).length;

    return apiSuccess({
      alerts,
      unreadCount,
    });
  } catch (err) {
    return handleUnknownError(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const authCheck = await requireAuthUser();
    if (authCheck.errorResponse) return authCheck.errorResponse;
    const { user } = authCheck;

    const body = await request.json();
    const { alertType, symbol, thresholdValue, severity, cooldownSeconds, message } = body as {
      alertType: AlertType;
      symbol: string;
      thresholdValue?: number;
      severity?: AlertSeverity;
      cooldownSeconds?: number;
      message?: string;
    };

    if (!alertType || !symbol) {
      return apiError('Missing alertType or symbol', 400, 'INVALID_BODY');
    }

    const created = await alertService.createAlert({
      userId: user.id,
      alertType,
      symbol,
      thresholdValue,
      severity,
      cooldownSeconds,
      message,
    });

    return apiSuccess(created, 201);
  } catch (err) {
    return handleUnknownError(err);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const authCheck = await requireAuthUser();
    if (authCheck.errorResponse) return authCheck.errorResponse;

    const body = await request.json();
    const { id, isRead, isEnabled, markAllRead } = body as {
      id?: string;
      isRead?: boolean;
      isEnabled?: boolean;
      markAllRead?: boolean;
    };

    if (markAllRead) {
      await alertService.markAllAsRead();
      return apiSuccess({ message: 'All alerts marked as read' });
    }

    if (!id) {
      return apiError('Missing id in request body', 400, 'INVALID_ID');
    }

    if (isRead !== undefined) {
      await alertService.markAsRead(id);
    }

    if (isEnabled !== undefined) {
      await alertService.toggleAlert(id, isEnabled);
    }

    return apiSuccess({ id, success: true });
  } catch (err) {
    return handleUnknownError(err);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const authCheck = await requireAuthUser();
    if (authCheck.errorResponse) return authCheck.errorResponse;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return apiError('Missing id query parameter', 400, 'INVALID_ID');
    }

    await alertService.deleteAlert(id);
    return apiSuccess({ id, deleted: true });
  } catch (err) {
    return handleUnknownError(err);
  }
}
