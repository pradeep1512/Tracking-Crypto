import { NextResponse, type NextRequest } from 'next/server';
import { auth } from '@/lib/auth/auth';
import { walletService } from '@/services/WalletService';
import { paymentGatewayService } from '@/services/PaymentGatewayService';

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const userId = session?.user?.id || 'dev_user';

    const body = await req.json();
    const { amountINR, paymentMethod } = body;

    if (!amountINR || Number(amountINR) <= 0) {
      return NextResponse.json(
        { success: false, error: 'A valid amount in INR is required.' },
        { status: 400 }
      );
    }

    const result = await walletService.initiateAddMoney({
      userId,
      amountINR: Number(amountINR),
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
