import { NextResponse, type NextRequest } from 'next/server';
import { auth } from '@/lib/auth/auth';
import { walletService } from '@/services/WalletService';
import type { WalletTransactionStatus, WalletTransactionType } from '@/types';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    const userId = session?.user?.id || 'dev_user';

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') as WalletTransactionStatus | undefined;
    const type = searchParams.get('type') as WalletTransactionType | undefined;
    const search = searchParams.get('search') || undefined;
    const limit = searchParams.get('limit') ? Number(searchParams.get('limit')) : undefined;

    const wallet = await walletService.getWallet(userId);
    const transactions = await walletService.getTransactions(userId, { status, type, search, limit });

    return NextResponse.json({
      success: true,
      data: {
        wallet,
        transactions,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to retrieve wallet data';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
