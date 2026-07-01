// server/actions/checkout.ts
'use server';

import prisma from '@/lib/prisma';
import { sendOrderConfirmation } from '@/lib/emails';
import { checkoutSchema } from '@/lib/validators';
import { getCurrentUser } from '@/lib/roles';
import { revalidateTag } from 'next/cache';
import { getCart, clearCart } from './cart';
import { calculateShippingFee, generateOrderNumber } from '@/lib/utils';
import { confirmTossPayment } from '@/lib/tosspayments';

/**
 * 주문 생성 (PENDING) — 토스 결제위젯이 이 주문 정보로 결제를 요청한다.
 * 결제 승인(confirmPayment)은 결제 성공 후 successUrl에서 별도로 호출된다.
 */
export async function createOrder(formData: FormData) {
  try {
    const checkoutData = {
      items: JSON.parse(formData.get('items') as string),
      shippingAddress: JSON.parse(formData.get('shippingAddress') as string),
      billingAddress: JSON.parse(
        (formData.get('billingAddress') as string) || 'null'
      ),
      customerInfo: JSON.parse(formData.get('customerInfo') as string),
      deliveryRequest:
        (formData.get('deliveryRequest') as string) || undefined,
      notes: (formData.get('notes') as string) || undefined,
    };

    const validatedData = checkoutSchema.parse(checkoutData);
    const user = await getCurrentUser();

    // 장바구니·재고 확인
    const cart = await getCart();
    if (cart.items.length === 0) {
      return { success: false, error: '장바구니가 비어 있습니다.' };
    }

    for (const item of validatedData.items) {
      const product = await prisma.product.findUnique({
        where: { id: item.productId },
        include: { inventory: true },
      });

      if (!product || product.status !== 'PUBLISHED') {
        return { success: false, error: '판매 중이 아닌 상품이 포함되어 있습니다.' };
      }

      const totalAvailable = product.inventory.reduce(
        (sum, inv) => sum + inv.available,
        0
      );
      if (totalAvailable < item.quantity) {
        return { success: false, error: '재고가 부족한 상품이 있습니다.' };
      }
    }

    // 금액 계산 (한국식: 조건부 무료배송, 부가세는 상품가 포함)
    const subtotal = cart.total;
    const shippingCost = calculateShippingFee(subtotal);
    const total = subtotal + shippingCost;

    // 토스 orderId — 영문/숫자 6~64자 (주문번호 재사용)
    const tossOrderId = generateOrderNumber();

    const order = await prisma.order.create({
      data: {
        orderNumber: tossOrderId,
        tossOrderId,
        userId: user?.id,
        status: 'PENDING',
        subtotal: Number(subtotal),
        shipping: Number(shippingCost),
        tax: 0,
        total: Number(total),
        currency: 'KRW',
        customerEmail: validatedData.customerInfo.email,
        shippingName: validatedData.customerInfo.name,
        shippingPostcode: validatedData.shippingAddress.postcode,
        shippingAddress: validatedData.shippingAddress.address,
        shippingAddressDetail: validatedData.shippingAddress.addressDetail,
        customerPhone: validatedData.customerInfo.phone,
        billingName: validatedData.billingAddress?.address
          ? validatedData.customerInfo.name
          : undefined,
        billingPostcode: validatedData.billingAddress?.postcode,
        billingAddress: validatedData.billingAddress?.address,
        billingAddressDetail: validatedData.billingAddress?.addressDetail,
        deliveryRequest: validatedData.deliveryRequest,
        notes: validatedData.notes,
        orderItems: {
          create: validatedData.items.map(item => ({
            productId: item.productId,
            quantity: item.quantity,
            price: item.price,
            productName: item.productId,
          })),
        },
      },
      include: {
        orderItems: {
          include: { product: { select: { name: true } } },
        },
      },
    });

    revalidateTag('orders');

    // 결제위젯에 넘길 주문 정보
    const orderName =
      order.orderItems.length > 1
        ? `${order.orderItems[0]!.product.name} 외 ${order.orderItems.length - 1}건`
        : order.orderItems[0]!.product.name;

    return {
      success: true,
      orderId: order.id,
      tossOrderId,
      amount: Number(total),
      orderName,
      customerName: order.shippingName,
      customerEmail: order.customerEmail,
    };
  } catch (error) {
    console.error('주문 생성 오류:', error);
    return { success: false, error: '주문 생성에 실패했습니다.' };
  }
}

/**
 * 결제 승인 — 결제 성공 후 successUrl에서 넘어온 값으로 토스 승인을 요청하고,
 * 주문 확정(CONFIRMED) + 재고 차감 + 장바구니 비우기 + 확인 메일을 처리한다.
 */
export async function confirmPayment(params: {
  paymentKey: string;
  tossOrderId: string;
  amount: number;
}) {
  try {
    // 주문 조회 (금액 위변조 검증)
    const order = await prisma.order.findFirst({
      where: { tossOrderId: params.tossOrderId },
      include: {
        orderItems: {
          include: {
            product: { select: { id: true, name: true, images: true } },
          },
        },
      },
    });

    if (!order) {
      return { success: false, error: '주문을 찾을 수 없습니다.' };
    }

    // successUrl로 넘어온 금액과 주문 금액이 일치하는지 확인 (변조 방지)
    if (Number(order.total) !== params.amount) {
      return { success: false, error: '결제 금액이 일치하지 않습니다.' };
    }

    // 이미 결제 완료된 주문이면 중복 승인 방지
    if (order.status !== 'PENDING') {
      return { success: true, orderId: order.id, alreadyPaid: true };
    }

    // 토스 결제 승인
    const payment = await confirmTossPayment({
      paymentKey: params.paymentKey,
      orderId: params.tossOrderId,
      amount: params.amount,
    });

    // 주문 확정
    await prisma.order.update({
      where: { id: order.id },
      data: {
        status: 'CONFIRMED',
        tossPaymentKey: payment.paymentKey,
        paymentMethod: payment.method,
        paidAt: new Date(),
      },
    });

    // 재고 차감
    for (const item of order.orderItems) {
      const inventory = await prisma.inventory.findUnique({
        where: { productId: item.productId },
      });
      if (inventory) {
        await prisma.inventory.update({
          where: { productId: item.productId },
          data: {
            available: Math.max(0, inventory.available - item.quantity),
            reserved: inventory.reserved + item.quantity,
          },
        });
      }
    }

    // 장바구니 비우기
    await clearCart();

    // 주문 확인 메일
    await sendOrderConfirmation({
      orderId: order.id,
      customerName: order.shippingName,
      customerEmail: order.customerEmail,
      orderTotal: Number(order.total),
      items: order.orderItems.map(item => ({
        name: item.product.name,
        quantity: item.quantity,
        price: Number(item.price),
        image: item.product.images[0],
      })),
      shippingAddress: {
        name: order.shippingName,
        address: `${order.shippingAddress}${
          order.shippingAddressDetail ? ` ${order.shippingAddressDetail}` : ''
        }`,
        city: '',
        state: '',
        zip: order.shippingPostcode || '',
        country: '대한민국',
      },
    });

    revalidateTag('orders');
    revalidateTag('products');

    return { success: true, orderId: order.id };
  } catch (error) {
    console.error('결제 승인 오류:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '결제 승인에 실패했습니다.',
    };
  }
}

export async function cancelOrder(orderId: string) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: '로그인이 필요합니다.' };
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { orderItems: true },
    });

    if (!order) {
      return { success: false, error: '주문을 찾을 수 없습니다.' };
    }

    if (order.userId !== user.id) {
      return { success: false, error: '권한이 없습니다.' };
    }

    // 배송 시작 전(입금대기/결제완료)까지만 취소 가능
    if (!['PENDING', 'CONFIRMED'].includes(order.status)) {
      return { success: false, error: '배송이 시작되어 취소할 수 없습니다.' };
    }

    // 결제완료 상태였으면 차감된 재고 복구
    if (order.status === 'CONFIRMED') {
      for (const item of order.orderItems) {
        const inventory = await prisma.inventory.findUnique({
          where: { productId: item.productId },
        });
        if (inventory) {
          await prisma.inventory.update({
            where: { productId: item.productId },
            data: {
              available: inventory.available + item.quantity,
              reserved: Math.max(0, inventory.reserved - item.quantity),
            },
          });
        }
      }
    }

    await prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
      },
    });

    revalidateTag('orders');
    revalidateTag('products');

    return { success: true };
  } catch (error) {
    console.error('주문 취소 오류:', error);
    return { success: false, error: '주문 취소에 실패했습니다.' };
  }
}
