import { type NextRequest } from 'next/server';
import { liveTradingService } from '@/services/LiveTradingService';
import { apiSuccess, handleUnknownError } from '@/lib/utils/api';
import { requireAuthUser } from '@/lib/auth/server-auth';

export async function POST(request: NextRequest) {
  try {
    const authCheck = await requireAuthUser();
    if (authCheck.errorResponse) return authCheck.errorResponse;

    const body = await request.json();
    const { active } = body as { active: boolean };

    const updated = liveTradingService.setKillSwitch(Boolean(active));
    return apiSuccess({
      killSwitchActive: updated.killSwitchActive,
      isLiveTradingEnabled: updated.isLiveTradingEnabled,
      message: updated.killSwitchActive
        ? 'EMERGENCY KILL SWITCH ENGAGED: All live trading is immediately halted.'
        : 'Emergency Kill Switch disengaged.',
    });
  } catch (err) {
    return handleUnknownError(err);
  }
}
