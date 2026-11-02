import { NextResponse, type NextRequest } from 'next/server';
import { auth } from '@/lib/auth/auth';
import { walletService } from '@/services/WalletService';
import { paymentGatewayService } from '@/services/PaymentGatewayService';

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const userId = session?.user?.id || 'dev_user';

    const body = await req.json();
    const amount = Number(body.amountUSD || body.amount || body.amountINR);
    const paymentMethod = body.paymentMethod || 'SANDBOX';

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { success: false, error: 'A valid deposit amount is required.' },
        { status: 400 }
      );
    }

    const result = await walletService.initiateAddMoney({
      userId,
      amountINR: amount,
      paymentMethod,
    });

    const checkoutOptions = paymentGatewayService.getRazorpayCheckoutOptions(result.order.orderId, {
      name: session?.user?.name || undefined,
      email: session?.user?.email || undefined,
    });

    return NextResponse.json({
      success: true,
      data: {
        ...result,
        checkoutOptions,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to initiate wallet topup';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
