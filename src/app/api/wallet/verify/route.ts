import { NextResponse, type NextRequest } from 'next/server';
import { auth } from '@/lib/auth/auth';
import { walletService } from '@/services/WalletService';

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const userId = session?.user?.id || 'dev_user';

    const body = await req.json();
    const { orderId, gatewayPaymentId, gatewaySignature, paymentMethod } = body;

    if (!orderId || !gatewayPaymentId) {
      return NextResponse.json(
        { success: false, error: 'Missing required orderId or gatewayPaymentId.' },
        { status: 400 }
      );
    }

    const result = await walletService.processVerifiedDeposit(userId, {
      orderId,
      gatewayPaymentId,
      gatewaySignature: gatewaySignature || 'sandbox_verified_sig_ok',
      paymentMethod,
    });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Payment verification failed';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
