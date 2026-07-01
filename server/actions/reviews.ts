// server/actions/reviews.ts
'use server';

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { getCurrentUser } from '@/lib/roles';

export interface ReviewSummary {
  average: number; // 평균 별점 (소수 1자리)
  count: number; // 총 리뷰 수
  distribution: Record<number, number>; // 별점별 개수 {5: n, 4: n, ...}
}

/** 상품의 리뷰 목록 + 통계 조회 */
export async function getProductReviews(productId: string) {
  const reviews = await prisma.review.findMany({
    where: { productId },
    include: { user: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
  });

  const count = reviews.length;
  const distribution: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  let sum = 0;
  for (const r of reviews) {
    sum += r.rating;
    distribution[r.rating] = (distribution[r.rating] || 0) + 1;
  }
  const average = count > 0 ? Math.round((sum / count) * 10) / 10 : 0;

  const summary: ReviewSummary = { average, count, distribution };
  return { reviews, summary };
}

/** 리뷰 작성 (로그인 필요, 상품당 1회 — 기존이면 수정) */
export async function createReview(formData: FormData) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: '로그인이 필요합니다.' };
    }

    const productId = formData.get('productId') as string;
    const rating = Number(formData.get('rating'));
    const title = ((formData.get('title') as string) || '').trim() || null;
    const content = ((formData.get('content') as string) || '').trim() || null;

    if (!productId) {
      return { success: false, error: '상품 정보가 올바르지 않습니다.' };
    }
    if (!rating || rating < 1 || rating > 5) {
      return { success: false, error: '별점을 선택해 주세요.' };
    }
    if (!content) {
      return { success: false, error: '리뷰 내용을 입력해 주세요.' };
    }

    // 구매 확인 (해당 상품을 결제완료 이상으로 주문했는지)
    const purchased = await prisma.orderItem.findFirst({
      where: {
        productId,
        order: {
          userId: user.id,
          status: { in: ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'] },
        },
      },
    });

    // 상품당 1회 — 이미 있으면 수정(upsert)
    await prisma.review.upsert({
      where: { userId_productId: { userId: user.id, productId } },
      update: { rating, title, content, verified: !!purchased },
      create: {
        rating,
        title,
        content,
        verified: !!purchased,
        userId: user.id,
        productId,
      },
    });

    // 상품 상세 경로 재검증
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { slug: true },
    });
    if (product) revalidatePath(`/products/${product.slug}`);

    return { success: true };
  } catch (error) {
    console.error('리뷰 작성 오류:', error);
    return { success: false, error: '리뷰 등록에 실패했습니다.' };
  }
}
