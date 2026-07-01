// File: app/(store)/checkout/page.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ShoppingBag } from 'lucide-react';
import {
  loadTossPayments,
  ANONYMOUS,
  type TossPaymentsWidgets,
} from '@tosspayments/tosspayments-sdk';
import { useCart } from '@/components/cart-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { formatPrice, calculateShippingFee } from '@/lib/utils';
import { TOSS_CLIENT_KEY } from '@/lib/tosspayments';
import { createOrder } from '@/server/actions/checkout';
import { useToast } from '@/components/ui/use-toast';

// 배송 요청사항 프리셋
const DELIVERY_PRESETS = [
  '문 앞에 놔주세요',
  '경비실에 맡겨주세요',
  '부재 시 연락주세요',
  '직접입력',
] as const;

export default function CheckoutPage() {
  const { items, totalAmount } = useCart();
  const router = useRouter();
  const { toast } = useToast();

  // 배송지/주문자 폼 상태
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [postcode, setPostcode] = useState('');
  const [address, setAddress] = useState('');
  const [addressDetail, setAddressDetail] = useState('');
  const [deliveryPreset, setDeliveryPreset] = useState<string>(
    DELIVERY_PRESETS[0]
  );
  const [deliveryCustom, setDeliveryCustom] = useState('');

  // 위젯 상태
  const widgetsRef = useRef<TossPaymentsWidgets | null>(null);
  const [widgetReady, setWidgetReady] = useState(false);
  const [isPaying, setIsPaying] = useState(false);

  // 금액 계산 (한국식: 조건부 무료배송, 세금은 상품가 포함)
  const shippingFee = calculateShippingFee(totalAmount);
  const totalPayable = totalAmount + shippingFee;

  // 장바구니가 비어 있으면 안내
  const isEmpty = items.length === 0;

  // 결제 위젯 초기화 (1회)
  useEffect(() => {
    if (isEmpty) return;

    let cancelled = false;

    (async () => {
      try {
        const tossPayments = await loadTossPayments(TOSS_CLIENT_KEY);
        const widgets = tossPayments.widgets({ customerKey: ANONYMOUS });

        await widgets.setAmount({ currency: 'KRW', value: totalPayable });
        await Promise.all([
          widgets.renderPaymentMethods({
            selector: '#payment-method',
            variantKey: 'DEFAULT',
          }),
          widgets.renderAgreement({
            selector: '#agreement',
            variantKey: 'AGREEMENT',
          }),
        ]);

        if (cancelled) return;
        widgetsRef.current = widgets;
        setWidgetReady(true);
      } catch (error) {
        console.error('결제 위젯 초기화 오류:', error);
        toast({
          title: '결제창을 불러오지 못했습니다',
          description: '잠시 후 다시 시도해 주세요.',
        });
      }
    })();

    return () => {
      cancelled = true;
    };
    // 위젯은 최초 1회만 초기화. 금액 변경은 아래 effect에서 setAmount로 반영.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEmpty]);

  // 금액이 바뀌면 setAmount만 다시 호출
  useEffect(() => {
    if (!widgetReady || !widgetsRef.current) return;
    widgetsRef.current
      .setAmount({ currency: 'KRW', value: totalPayable })
      .catch(err => console.error('결제 금액 갱신 오류:', err));
  }, [totalPayable, widgetReady]);

  const validateForm = (): string | null => {
    if (!name.trim()) return '수령인 이름을 입력해 주세요.';
    if (!phone.trim()) return '연락처를 입력해 주세요.';
    if (!email.trim()) return '이메일을 입력해 주세요.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
      return '올바른 이메일 형식이 아닙니다.';
    if (!postcode.trim()) return '우편번호를 입력해 주세요.';
    if (!address.trim()) return '주소를 입력해 주세요.';
    return null;
  };

  const handlePayment = async () => {
    if (isPaying) return;

    const validationError = validateForm();
    if (validationError) {
      toast({ title: '입력 확인', description: validationError });
      return;
    }
    if (!widgetReady || !widgetsRef.current) {
      toast({
        title: '잠시만요',
        description: '결제창을 준비 중입니다. 잠시 후 다시 시도해 주세요.',
      });
      return;
    }

    setIsPaying(true);

    try {
      const deliveryRequest =
        deliveryPreset === '직접입력'
          ? deliveryCustom.trim()
          : deliveryPreset;

      // 서버 액션에 넘길 formData 구성
      const formData = new FormData();
      formData.append(
        'items',
        JSON.stringify(
          items.map(item => ({
            productId: item.productId,
            quantity: item.quantity,
            price: item.price,
          }))
        )
      );
      formData.append(
        'shippingAddress',
        JSON.stringify({
          postcode: postcode.trim(),
          address: address.trim(),
          addressDetail: addressDetail.trim(),
        })
      );
      formData.append(
        'customerInfo',
        JSON.stringify({
          email: email.trim(),
          name: name.trim(),
          phone: phone.trim(),
        })
      );
      if (deliveryRequest) {
        formData.append('deliveryRequest', deliveryRequest);
      }

      const result = await createOrder(formData);

      if (!result.success) {
        toast({
          title: '주문에 실패했습니다',
          description: result.error ?? '잠시 후 다시 시도해 주세요.',
        });
        setIsPaying(false);
        return;
      }

      // 결제 요청 — 성공 시 토스가 successUrl(/api/payments/confirm)로 리다이렉트
      await widgetsRef.current.requestPayment({
        orderId: result.tossOrderId ?? '',
        orderName: result.orderName ?? '주문',
        successUrl: `${window.location.origin}/api/payments/confirm`,
        failUrl: `${window.location.origin}/checkout/fail`,
        customerEmail: result.customerEmail ?? email.trim(),
        customerName: result.customerName ?? name.trim(),
      });
      // requestPayment는 리다이렉트되므로 이후 코드는 실행되지 않음.
    } catch (error) {
      console.error('결제 요청 오류:', error);
      toast({
        title: '결제를 진행하지 못했습니다',
        description:
          error instanceof Error ? error.message : '잠시 후 다시 시도해 주세요.',
      });
      setIsPaying(false);
    }
  };

  // 장바구니가 비어 있을 때
  if (isEmpty) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="text-center">
          <ShoppingBag className="mx-auto h-24 w-24 text-muted-foreground" />
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-gray-900">
            장바구니가 비어 있습니다
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            결제할 상품을 먼저 담아주세요.
          </p>
          <div className="mt-8">
            <Button asChild size="lg">
              <Link href="/cart">장바구니로 이동</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">
          주문/결제
        </h1>
        <p className="mt-2 text-lg text-muted-foreground">
          배송지 정보를 입력하고 결제를 진행해 주세요.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* 왼쪽: 배송지 폼 + 결제수단 */}
        <div className="space-y-8 lg:col-span-2">
          {/* 배송지 정보 */}
          <section className="rounded-lg border p-6">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">
              배송지 정보
            </h2>
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">수령인</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="홍길동"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">연락처</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="010-1234-5678"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">이메일</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="example@email.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="postcode">우편번호</Label>
                <div className="flex gap-2">
                  <Input
                    id="postcode"
                    value={postcode}
                    onChange={e => setPostcode(e.target.value)}
                    placeholder="04524"
                    className="max-w-[160px]"
                  />
                  {/* TODO: 카카오 우편번호 팝업 연동 (다음 단계) */}
                  <Button type="button" variant="outline" disabled>
                    주소 검색
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">주소</Label>
                <Input
                  id="address"
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  placeholder="서울시 중구 세종대로 110"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="addressDetail">상세주소</Label>
                <Input
                  id="addressDetail"
                  value={addressDetail}
                  onChange={e => setAddressDetail(e.target.value)}
                  placeholder="101동 1001호"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="deliveryRequest">배송 요청사항</Label>
                <select
                  id="deliveryRequest"
                  value={deliveryPreset}
                  onChange={e => setDeliveryPreset(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  {DELIVERY_PRESETS.map(preset => (
                    <option key={preset} value={preset}>
                      {preset}
                    </option>
                  ))}
                </select>
                {deliveryPreset === '직접입력' && (
                  <Input
                    value={deliveryCustom}
                    onChange={e => setDeliveryCustom(e.target.value)}
                    placeholder="배송 시 요청사항을 입력해 주세요"
                  />
                )}
              </div>
            </div>
          </section>

          {/* 결제수단 */}
          <section className="rounded-lg border p-6">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">
              결제수단
            </h2>
            <div id="payment-method" />
            <div id="agreement" className="mt-4" />
          </section>
        </div>

        {/* 오른쪽: 주문 요약 */}
        <div className="lg:col-span-1">
          <div className="sticky top-8 rounded-lg border bg-gray-50 p-6">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">
              주문 상품
            </h2>

            <div className="space-y-4">
              {items.map(item => (
                <div key={item.id} className="flex items-center gap-3">
                  <Image
                    src={item.product.images[0]?.url || '/images/placeholder.png'}
                    alt={item.product.name}
                    width={56}
                    height={56}
                    className="h-14 w-14 flex-shrink-0 rounded-md object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-900">
                      {item.product.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      수량 {item.quantity}개
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-gray-900">
                    {formatPrice(item.product.price * item.quantity)}
                  </p>
                </div>
              ))}
            </div>

            <Separator className="my-4" />

            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span>상품금액</span>
                <span>{formatPrice(totalAmount)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>배송비</span>
                <span className={shippingFee === 0 ? 'text-green-600' : ''}>
                  {shippingFee === 0 ? '무료' : formatPrice(shippingFee)}
                </span>
              </div>

              <Separator />

              <div className="flex justify-between text-lg font-semibold">
                <span>총 결제금액</span>
                <span>{formatPrice(totalPayable)}</span>
              </div>
            </div>

            {shippingFee === 0 && (
              <p className="mt-3 text-xs text-green-600">
                5만원 이상 구매로 무료배송이 적용되었습니다.
              </p>
            )}

            <Button
              onClick={handlePayment}
              disabled={isPaying || !widgetReady}
              className="mt-6 w-full"
              size="lg"
            >
              {isPaying
                ? '결제 진행 중...'
                : `${formatPrice(totalPayable)} 결제하기`}
            </Button>

            <div className="mt-4">
              <Button asChild variant="ghost" size="sm" className="w-full">
                <Link href="/cart">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  장바구니로 돌아가기
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
