// File: app/(store)/checkout/success/page.tsx
import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { CheckCircle2 } from 'lucide-react';
import prisma from '@/lib/prisma';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { formatPrice } from '@/lib/utils';
import { tossMethodLabel } from '@/lib/tosspayments';

interface SuccessPageProps {
  searchParams: Promise<{ orderId?: string }>;
}

export default async function CheckoutSuccessPage({
  searchParams,
}: SuccessPageProps) {
  const { orderId } = await searchParams;
  if (!orderId) {
    notFound();
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      orderItems: {
        include: {
          product: {
            select: { id: true, name: true, images: true, slug: true },
          },
        },
      },
    },
  });

  if (!order) {
    notFound();
  }

  const fullAddress = [order.shippingAddress, order.shippingAddressDetail]
    .filter(Boolean)
    .join(' ');

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      {/* 축하 헤더 */}
      <div className="text-center">
        <CheckCircle2 className="mx-auto h-16 w-16 text-green-500" />
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-gray-900">
          주문이 완료되었습니다 🎉
        </h1>
        <p className="mt-3 text-lg text-muted-foreground">
          결제가 정상적으로 처리되었어요. 주문 확인 메일을 보내드렸습니다.
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          주문번호{' '}
          <span className="font-semibold text-gray-900">
            {order.orderNumber}
          </span>
        </p>
      </div>

      {/* 주문 상품 */}
      <div className="mt-10 rounded-lg border p-6">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">주문 상품</h2>
        <div className="space-y-4">
          {order.orderItems.map(item => (
            <div key={item.id} className="flex items-center gap-4">
              <Image
                src={item.product.images[0]?.url || '/images/placeholder.png'}
                alt={item.product.name}
                width={64}
                height={64}
                className="h-16 w-16 flex-shrink-0 rounded-md object-cover"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-gray-900">
                  {item.product.name}
                </p>
                <p className="text-sm text-muted-foreground">
                  수량 {item.quantity}개
                </p>
              </div>
              <p className="font-semibold text-gray-900">
                {formatPrice(Number(item.price) * item.quantity)}
              </p>
            </div>
          ))}
        </div>

        <Separator className="my-4" />

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>상품금액</span>
            <span>{formatPrice(Number(order.subtotal))}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>배송비</span>
            <span
              className={Number(order.shipping) === 0 ? 'text-green-600' : ''}
            >
              {Number(order.shipping) === 0
                ? '무료'
                : formatPrice(Number(order.shipping))}
            </span>
          </div>
          <Separator />
          <div className="flex justify-between text-lg font-semibold">
            <span>총 결제금액</span>
            <span>{formatPrice(Number(order.total))}</span>
          </div>
          {order.paymentMethod && (
            <p className="pt-1 text-right text-xs text-muted-foreground">
              {tossMethodLabel(order.paymentMethod)}로 결제
            </p>
          )}
        </div>
      </div>

      {/* 배송지 */}
      <div className="mt-6 rounded-lg border p-6">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">배송지</h2>
        <dl className="space-y-2 text-sm">
          <div className="flex gap-3">
            <dt className="w-20 flex-shrink-0 text-muted-foreground">수령인</dt>
            <dd className="text-gray-900">{order.shippingName}</dd>
          </div>
          {order.customerPhone && (
            <div className="flex gap-3">
              <dt className="w-20 flex-shrink-0 text-muted-foreground">
                연락처
              </dt>
              <dd className="text-gray-900">{order.customerPhone}</dd>
            </div>
          )}
          <div className="flex gap-3">
            <dt className="w-20 flex-shrink-0 text-muted-foreground">주소</dt>
            <dd className="text-gray-900">
              {order.shippingPostcode ? `(${order.shippingPostcode}) ` : ''}
              {fullAddress}
            </dd>
          </div>
          {order.deliveryRequest && (
            <div className="flex gap-3">
              <dt className="w-20 flex-shrink-0 text-muted-foreground">
                요청사항
              </dt>
              <dd className="text-gray-900">{order.deliveryRequest}</dd>
            </div>
          )}
        </dl>
      </div>

      {/* 액션 버튼 */}
      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Button asChild size="lg">
          <Link href={`/orders/${order.id}`}>주문 내역 보기</Link>
        </Button>
        <Button asChild variant="outline" size="lg">
          <Link href="/">쇼핑 계속하기</Link>
        </Button>
      </div>
    </div>
  );
}
