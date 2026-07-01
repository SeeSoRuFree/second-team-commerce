// Location: lib/inquiry-status.ts
// 상품 문의(Q&A) 상태 — 값(key)은 영문, 화면 표기는 한글 라벨.

export type InquiryStatus = 'PENDING' | 'ANSWERED';

const LABELS: Record<InquiryStatus, string> = {
  PENDING: '답변대기',
  ANSWERED: '답변완료',
};

export function inquiryStatusLabel(status: string): string {
  return LABELS[status as InquiryStatus] ?? status;
}
