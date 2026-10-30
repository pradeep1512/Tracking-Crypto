import { NextResponse, type NextRequest } from 'next/server';
import { auth } from '@/lib/auth/auth';
import { walletService } from '@/services/WalletService';

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const userId = session?.user?.id || 'dev_user';

    const body = await req.json();
    const { action, amountINR, referenceId, narration } = body;

    const amount = Number(amountINR);
    if (!amount || amount <= 0) {
      return NextResponse.json(
        { success: false, error: 'A valid amount in INR is required.' },
        { status: 400 }
      );
    }

    if (action === 'RESERVE') {
      const result = await walletService.reserveTradingFunds(
        userId,
        amount,
        referenceId || `alloc_${Date.now()}`,
        narration || 'Allocated wallet funds to trading margin reserve'
      );
      return NextResponse.json({ success: true, data: result });
    } else if (action === 'RELEASE') {
      await walletService.releaseTradingReservation(
        userId,
        amount,
        referenceId || `rel_${Date.now()}`,
        narration || 'Released trading reservation back to available wallet balance'
      );
      const wallet = await walletService.getWallet(userId);
      return NextResponse.json({ success: true, data: wallet });
    } else {
      return NextResponse.json(
        { success: false, error: 'Invalid action. Supported: RESERVE | RELEASE.' },
        { status: 400 }
      );
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Wallet allocation operation failed';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
