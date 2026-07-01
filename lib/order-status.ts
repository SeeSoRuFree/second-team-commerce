// Location: lib/order-status.ts
// 주문 상태 — 값(key)은 영문 유지, 화면 표기는 한국식 라벨로 매핑.
// 한국 쇼핑몰(카페24·아임웹) 주문 흐름에 맞춘 상태 정의.

export type OrderStatus =
  | 'PENDING' // 입금대기 (무통장 등 결제 전)
  | 'CONFIRMED' // 결제완료
  | 'PROCESSING' // 배송준비중 (상품 준비·포장)
  | 'SHIPPED' // 배송중 (택배 발송)
  | 'DELIVERED' // 배송완료
  | 'CANCELLED' // 취소
  | 'REFUNDED'; // 환불

interface OrderStatusMeta {
  label: string; // 한글 라벨
  color: string; // 뱃지 색상 (tailwind 계열)
  step?: number; // 배송 진행 단계 (타임라인용, 취소/환불은 없음)
}

export const ORDER_STATUS: Record<OrderStatus, OrderStatusMeta> = {
  PENDING: { label: '입금대기', color: 'yellow', step: 0 },
  CONFIRMED: { label: '결제완료', color: 'blue', step: 1 },
  PROCESSING: { label: '배송준비중', color: 'indigo', step: 2 },
  SHIPPED: { label: '배송중', color: 'purple', step: 3 },
  DELIVERED: { label: '배송완료', color: 'green', step: 4 },
  CANCELLED: { label: '취소', color: 'red' },
  REFUNDED: { label: '환불', color: 'gray' },
};

// 배송 진행 타임라인에 노출할 상태 순서 (취소/환불 제외)
export const ORDER_TIMELINE: OrderStatus[] = [
  'PENDING',
  'CONFIRMED',
  'PROCESSING',
  'SHIPPED',
  'DELIVERED',
];

export function orderStatusLabel(status: string): string {
  return ORDER_STATUS[status as OrderStatus]?.label ?? status;
}

export function orderStatusColor(status: string): string {
  return ORDER_STATUS[status as OrderStatus]?.color ?? 'gray';
}

// 주문 취소 가능 여부 (배송 시작 전까지만)
export function isCancellable(status: string): boolean {
  return status === 'PENDING' || status === 'CONFIRMED';
}
