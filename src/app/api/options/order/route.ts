import { NextRequest } from 'next/server';
import { deltaExchangeService } from '@/services/DeltaExchangeService';
import { apiSuccess, apiError, handleUnknownError } from '@/lib/utils/api';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'margin_summary';
    const productId = searchParams.get('productId');

    if (action === 'leverage_brackets' && productId) {
      const brackets = await deltaExchangeService.getProductLeverageBrackets(Number(productId));
      return apiSuccess(brackets);
    }

    if (action === 'margin_summary') {
      const summary = await deltaExchangeService.getExchangeMarginSummary();
      return apiSuccess(summary);
    }

    return apiError(`Unsupported action: ${action}`, 400, 'BAD_REQUEST');
  } catch (err) {
    return handleUnknownError(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      action = 'preview',
      productId,
      size,
      side,
      orderType,
      limitPrice,
      stopPrice,
      leverage,
      isTestnet,
    } = body;

    if (action === 'margin_summary') {
      const summary = await deltaExchangeService.getExchangeMarginSummary();
      return apiSuccess(summary);
    }

    if (action === 'leverage_brackets') {
      if (!productId) {
        return apiError('productId is required for leverage_brackets.', 400, 'INVALID_INPUT');
      }
      const brackets = await deltaExchangeService.getProductLeverageBrackets(Number(productId));
      return apiSuccess(brackets);
    }

    if (action === 'set_leverage') {
      if (!productId || leverage === undefined) {
        return apiError('productId and leverage are required for set_leverage.', 400, 'INVALID_INPUT');
      }
      const res = await deltaExchangeService.setProductLeverage(Number(productId), Number(leverage));
      return apiSuccess(res);
    }

    if (!productId || !size || !side || !orderType) {
      return apiError(
        'Missing order fields: productId, size, side (buy|sell), and orderType are required.',
        400,
        'INVALID_ORDER'
      );
    }

    if (action === 'preview') {
      const preview = await deltaExchangeService.previewOptionOrder({
        productId: Number(productId),
        size: Number(size),
        side: side.toLowerCase(),
        orderType: orderType.toLowerCase(),
        limitPrice: limitPrice ? Number(limitPrice) : undefined,
        leverage: leverage ? Number(leverage) : undefined,
      });

      return apiSuccess(preview);
    }

    if (action === 'submit') {
      const result = await deltaExchangeService.submitOrder('session_user', {
        productId: Number(productId),
        size: Number(size),
        side: side.toLowerCase(),
        orderType: orderType.toLowerCase(),
        limitPrice: limitPrice ? Number(limitPrice) : undefined,
        stopPrice: stopPrice ? Number(stopPrice) : undefined,
        leverage: leverage ? Number(leverage) : undefined,
        isTestnet: Boolean(isTestnet),
      });

      return apiSuccess(result);
    }

    return apiError(`Unsupported action: ${action}`, 400, 'BAD_REQUEST');
  } catch (err) {
    return handleUnknownError(err);
  }
}
