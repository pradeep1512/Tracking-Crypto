import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/database/prisma';
import { registerSchema } from '@/lib/validation/schemas';
import { apiSuccess, apiError } from '@/lib/utils/api';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return apiError('Validation failed', 400, 'VALIDATION_ERROR', parsed.error.issues);
    }

    const { name, email, password } = parsed.data;

    // Check existing user
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return apiError('An account with this email already exists.', 409, 'EMAIL_EXISTS');
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role: 'USER',
        userSettings: {
          create: {
            preferredCurrency: 'INR',
            enablePaperTrading: true,
            enablePriceAlerts: true,
            maximumAllowedGapPct: 2.0,
          },
        },
      },
      select: { id: true, email: true, name: true, createdAt: true },
    });

    return apiSuccess(
      { id: user.id, email: user.email, name: user.name },
      201
    );
  } catch (err) {
    console.error('[Register] Error:', err);
    return apiError('Registration failed', 500, 'INTERNAL_ERROR');
  }
}
