import { NextRequest } from 'next/server';
import { deltaExchangeService } from '@/services/DeltaExchangeService';
import { apiSuccess, apiError, handleUnknownError } from '@/lib/utils/api';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const underlying = searchParams.get('underlying');
    const expiryIso = searchParams.get('expiry');
    const strikePrice = Number(searchParams.get('strike'));
    const optionType = searchParams.get('type') as 'CE' | 'PE';

    if (!underlying || !expiryIso || isNaN(strikePrice) || !optionType) {
      return apiError(
        'Missing parameters: underlying, expiry, strike, and type (CE|PE) are required.',
        400,
        'INVALID_PARAMETERS'
      );
    }

    const { product, ticker } = await deltaExchangeService.resolveOptionProduct({
      underlying,
      expiryIso,
      strikePrice,
      optionType,
    });

    return apiSuccess({
      productId: product.id,
      symbol: product.symbol,
      underlyingAsset: product.underlying_asset?.symbol,
      settlementTime: product.settlement_time,
      strikePrice: Number(product.strike_price),
      contractType: product.contract_type,
      contractValue: Number(product.contract_value || 0.001),
      tickSize: Number(product.tick_size || 0.1),
      state: product.state,
      tradingStatus: product.trading_status,
      quotingAsset: product.quoting_asset?.symbol || 'USD',
      ticker: ticker
        ? {
            lastPrice: Number(ticker.close || ticker.mark_price || 0),
            markPrice: Number(ticker.mark_price || 0),
            bestBid: Number(ticker.quotes?.best_bid || 0),
            bestAsk: Number(ticker.quotes?.best_ask || 0),
            greeks: ticker.greeks,
            iv: Number(ticker.quotes?.mark_iv || 0),
          }
        : null,
    });
  } catch (err) {
    return handleUnknownError(err);
  }
}
