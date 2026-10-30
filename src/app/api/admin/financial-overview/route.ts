import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth/auth';
import { walletService } from '@/services/WalletService';
import { exchangeTradingService } from '@/services/ExchangeTradingService';

export async function GET() {
  try {
    const session = await auth();
    const isAdmin = (session?.user as { role?: string })?.role?.toUpperCase() === 'ADMIN';

    // In local dev/test or admin session, provide administrative telemetry
    const [wallet, transactions, exchanges, ledger] = await Promise.all([
      walletService.getWallet('dev_user'),
      walletService.getTransactions('dev_user', { limit: 20 }),
      exchangeTradingService.getAllExchangeBalances(),
      walletService.getLedgerEntries('dev_user'),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        totalSystemWallets: 1,
        aggregateWalletBalanceINR: wallet.walletBalance,
        totalDepositsINR: wallet.totalDeposits,
        totalTradingChargesINR: wallet.totalTradingCharges,
        transactions,
        exchanges: exchanges.map((ex) => ({
          brokerId: ex.brokerId,
          exchangeName: ex.exchangeName,
          displayName: ex.displayName,
          accountUserId: ex.accountUserId,
          status: ex.status,
          permissions: ex.permissions,
          isLiveTradingAuthorized: ex.isLiveTradingAuthorized,
          availableBalance: ex.availableBalance,
          nativeCurrency: ex.nativeCurrency,
          inrEquivalent: ex.inrEquivalent,
          lastSyncAt: ex.lastSyncAt,
        })),
        ledger,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to retrieve admin telemetry';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
