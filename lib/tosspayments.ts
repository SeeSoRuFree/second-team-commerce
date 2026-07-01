// Location: lib/tosspayments.ts
// 토스페이먼츠 서버측 결제 승인(confirm) 헬퍼.
// 테스트 키는 토스가 문서용으로 공개한 범용 키 — 학생 전원이 그대로 사용 가능(실제 차감 없음).
// 실 운영 시 .env의 TOSS_SECRET_KEY / NEXT_PUBLIC_TOSS_CLIENT_KEY 로 교체.

const TOSS_CONFIRM_URL = 'https://api.tosspayments.com/v1/payments/confirm';

// 공개 테스트 키 (결제위젯용). 클라이언트 키는 NEXT_PUBLIC_ 으로 브라우저 노출 OK.
export const TOSS_CLIENT_KEY =
  process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY ||
  'test_gck_docs_Ovk5rk1EwkEbP0W43n07xlzm';

const TOSS_SECRET_KEY =
  process.env.TOSS_SECRET_KEY || 'test_gsk_docs_OaPz8L5KdmQXkzRz3y47BMw6';

export interface TossConfirmParams {
  paymentKey: string;
  orderId: string;
  amount: number;
}

export interface TossPayment {
  paymentKey: string;
  orderId: string;
  orderName: string;
  status: string; // DONE, CANCELED 등
  totalAmount: number;
  method?: string; // 카드/가상계좌/간편결제 등
  approvedAt?: string;
  [key: string]: unknown;
}

/**
 * 결제 승인 — 브라우저에서 결제 성공 후 successUrl로 넘어온
 * paymentKey/orderId/amount 로 실제 승인을 요청한다.
 * secretKey 뒤에 ':' 를 붙여 base64 인코딩한 Basic 인증을 사용.
 */
export async function confirmTossPayment(
  params: TossConfirmParams
): Promise<TossPayment> {
  const encryptedSecret = Buffer.from(`${TOSS_SECRET_KEY}:`).toString('base64');

  const res = await fetch(TOSS_CONFIRM_URL, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${encryptedSecret}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      paymentKey: params.paymentKey,
      orderId: params.orderId,
      amount: params.amount,
    }),
  });

  const data = await res.json();

  if (!res.ok) {
    // 토스는 실패 시 { code, message } 를 반환
    throw new Error(data?.message || '결제 승인에 실패했습니다.');
  }

  return data as TossPayment;
}

// 결제수단 코드 → 한글 라벨
export function tossMethodLabel(method?: string): string {
  switch (method) {
    case '카드':
      return '신용/체크카드';
    case '가상계좌':
      return '가상계좌';
    case '계좌이체':
      return '계좌이체';
    case '휴대폰':
      return '휴대폰 결제';
    case '간편결제':
      return '간편결제';
    default:
      return method || '결제';
  }
}
