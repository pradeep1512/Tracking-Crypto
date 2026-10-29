import { type NextRequest } from 'next/server';
import { liveTradingService } from '@/services/LiveTradingService';
import { apiSuccess, handleUnknownError } from '@/lib/utils/api';

export async function POST(request: NextRequest) {
  try {
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
