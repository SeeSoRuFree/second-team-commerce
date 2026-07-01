// app/api/payments/confirm/route.ts
// 토스 결제 성공 시 successUrl(GET)로 진입 → 서버에서 결제 승인 → 결과 페이지로 리다이렉트.

import { NextRequest, NextResponse } from 'next/server';
import { confirmPayment } from '@/server/actions/checkout';

export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url);
  const paymentKey = searchParams.get('paymentKey');
  const orderId = searchParams.get('orderId'); // 토스 orderId (= tossOrderId)
  const amount = searchParams.get('amount');

  if (!paymentKey || !orderId || !amount) {
    return NextResponse.redirect(
      `${origin}/checkout/fail?message=${encodeURIComponent('결제 정보가 올바르지 않습니다.')}`
    );
  }

  const result = await confirmPayment({
    paymentKey,
    tossOrderId: orderId,
    amount: Number(amount),
  });

  if (!result.success) {
    return NextResponse.redirect(
      `${origin}/checkout/fail?message=${encodeURIComponent(result.error || '결제 승인 실패')}`
    );
  }

  return NextResponse.redirect(
    `${origin}/checkout/success?orderId=${result.orderId}`
  );
}
