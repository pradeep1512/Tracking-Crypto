import { z } from 'zod';

// ─── Auth Schemas ─────────────────────────────────────────────────────────────

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const registerSchema = z
  .object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Invalid email address'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        'Password must contain uppercase, lowercase, and a number'
      ),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

// ─── Market / Trading Schemas ─────────────────────────────────────────────────

export const priceGapRequestSchema = z.object({
  exchangeId: z.string().cuid(),
  tradingPairId: z.string().cuid(),
  referencePrice: z.number().positive(),
  side: z.enum(['BUY', 'SELL']),
  quantity: z.number().positive().optional(),
  tolerancePercentage: z.number().min(0).max(100).optional(),
});

export const orderSimulateSchema = z.object({
  exchangeId: z.string().cuid(),
  tradingPairId: z.string().cuid(),
  side: z.enum(['BUY', 'SELL']),
  orderType: z.enum(['MARKET', 'LIMIT', 'POST_ONLY', 'IOC', 'FOK']),
  quantity: z.number().positive(),
  limitPrice: z.number().positive().optional(),
});

export const orderSubmitSchema = orderSimulateSchema.extend({
  isPaperTrade: z.boolean().default(true),
  clientOrderId: z.string().uuid().optional(),
  confirmLiveTrading: z.boolean().optional(),
});

export const alertCreateSchema = z.object({
  alertType: z.enum([
    'PRICE_TARGET',
    'MAX_BUY_EXCEEDED',
    'MIN_SELL_BELOW',
    'GAP_EXCEEDED',
    'DATA_STALE',
    'WS_DISCONNECT',
    'ORDER_FAIL',
    'FILL',
  ]),
  exchangeId: z.string().cuid().optional(),
  tradingPairId: z.string().cuid().optional(),
  triggerValue: z.number().optional(),
  thresholdValue: z.number().optional(),
  cooldownSeconds: z.number().min(0).max(86400).default(300),
});

export const userSettingsSchema = z.object({
  preferredCurrency: z.string().default('INR'),
  preferredExchangeId: z.string().cuid().optional(),
  preferredTradingPairId: z.string().cuid().optional(),
  maximumBuyPrice: z.number().positive().optional(),
  minimumSellPrice: z.number().positive().optional(),
  maximumAllowedGapPct: z.number().min(0).max(100).default(2.0),
  enablePriceAlerts: z.boolean().default(true),
  enableEmailAlerts: z.boolean().default(false),
  enablePaperTrading: z.boolean().default(true),
  defaultOrderQuantity: z.number().positive().optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type PriceGapRequestInput = z.infer<typeof priceGapRequestSchema>;
export type OrderSimulateInput = z.infer<typeof orderSimulateSchema>;
export type OrderSubmitInput = z.infer<typeof orderSubmitSchema>;
export type AlertCreateInput = z.infer<typeof alertCreateSchema>;
export type UserSettingsInput = z.infer<typeof userSettingsSchema>;
