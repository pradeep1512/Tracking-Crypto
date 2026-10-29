import { type NextRequest } from 'next/server';
import { exchangeCredentialService } from '@/services/ExchangeCredentialService';
import { apiSuccess, apiError, handleUnknownError } from '@/lib/utils/api';

export async function GET(request: NextRequest) {
  try {
    const creds = await exchangeCredentialService.listCredentials();
    return apiSuccess(creds);
  } catch (err) {
    return handleUnknownError(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { exchangeId, label, apiKey, apiSecret, permissions } = body as {
      exchangeId: string;
      label: string;
      apiKey: string;
      apiSecret: string;
      permissions?: 'READ_ONLY' | 'TRADE';
    };

    if (!exchangeId || !label || !apiKey || !apiSecret) {
      return apiError('Missing required credential fields', 400, 'INVALID_BODY');
    }

    // Least Privilege Guardrail: Strictly reject any API key with withdrawal permissions
    if ((body as any).canWithdraw === true || (permissions as string) === 'WITHDRAW') {
      return apiError(
        'LEAST PRIVILEGE VIOLATION: TrackingCrypt strictly prohibits API keys with withdrawal permissions enabled. Only READ_ONLY or TRADE permissions are permitted.',
        400,
        'WITHDRAWAL_PERMISSION_REJECTED'
      );
    }

    const created = await exchangeCredentialService.storeCredential({
      exchangeId,
      label,
      apiKey,
      apiSecret,
      permissions,
    });

    return apiSuccess(created, 201);
  } catch (err) {
    return handleUnknownError(err);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return apiError('Missing id query parameter', 400, 'INVALID_ID');
    }

    await exchangeCredentialService.deleteCredential(id);
    return apiSuccess({ id, deleted: true });
  } catch (err) {
    return handleUnknownError(err);
  }
}
