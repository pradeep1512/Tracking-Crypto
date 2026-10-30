import { NextResponse, type NextRequest } from 'next/server';
import { paymentGatewayService } from '@/services/PaymentGatewayService';
import { walletService } from '@/services/WalletService';

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature =
      req.headers.get('x-razorpay-signature') ||
      req.headers.get('stripe-signature') ||
      '';

    const check = paymentGatewayService.verifyWebhookSignature(rawBody, signature);
    if (!check.isValid) {
      return NextResponse.json({ error: check.error || 'Invalid signature' }, { status: 400 });
    }

    // Process event based on provider payload
    if (check.event === 'payment.captured' && check.paymentId && check.orderId) {
      await walletService.processVerifiedDeposit('dev_user', {
        orderId: check.orderId,
        gatewayPaymentId: check.paymentId,
        gatewaySignature: signature,
      });
    }

    return NextResponse.json({ status: 'ok', received: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Webhook processing error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
