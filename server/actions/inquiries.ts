// server/actions/inquiries.ts
'use server';

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { getCurrentUser } from '@/lib/roles';

/**
 * 상품 문의 목록 조회. 비밀글은 작성자·관리자만 내용 열람 가능(그 외엔 잠금 표시).
 */
export async function getProductInquiries(productId: string) {
  const user = await getCurrentUser();
  const inquiries = await prisma.inquiry.findMany({
    where: { productId },
    include: { user: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'desc' },
  });

  const isAdmin = user?.role === 'ADMIN';

  // 비밀글은 권한 없으면 내용/답변 마스킹
  return inquiries.map(q => {
    const canView = isAdmin || (!!user && user.id === q.userId);
    if (q.isSecret && !canView) {
      return {
        ...q,
        title: '비밀글입니다.',
        content: null,
        answer: null,
        locked: true,
      };
    }
    return { ...q, locked: false };
  });
}

/** 문의 작성 (로그인 필요) */
export async function createInquiry(formData: FormData) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: '로그인이 필요합니다.' };
    }

    const productId = formData.get('productId') as string;
    const title = ((formData.get('title') as string) || '').trim();
    const content = ((formData.get('content') as string) || '').trim();
    const isSecret = formData.get('isSecret') === 'on' || formData.get('isSecret') === 'true';

    if (!productId) {
      return { success: false, error: '상품 정보가 올바르지 않습니다.' };
    }
    if (!title) {
      return { success: false, error: '문의 제목을 입력해 주세요.' };
    }
    if (!content) {
      return { success: false, error: '문의 내용을 입력해 주세요.' };
    }

    await prisma.inquiry.create({
      data: {
        title,
        content,
        isSecret,
        status: 'PENDING',
        userId: user.id,
        productId,
      },
    });

    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { slug: true },
    });
    if (product) revalidatePath(`/products/${product.slug}`);

    return { success: true };
  } catch (error) {
    console.error('문의 작성 오류:', error);
    return { success: false, error: '문의 등록에 실패했습니다.' };
  }
}

/** 관리자 답변 등록 */
export async function answerInquiry(formData: FormData) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'ADMIN') {
      return { success: false, error: '권한이 없습니다.' };
    }

    const inquiryId = formData.get('inquiryId') as string;
    const answer = ((formData.get('answer') as string) || '').trim();

    if (!inquiryId || !answer) {
      return { success: false, error: '답변 내용을 입력해 주세요.' };
    }

    const inquiry = await prisma.inquiry.update({
      where: { id: inquiryId },
      data: { answer, status: 'ANSWERED', answeredAt: new Date() },
      include: { product: { select: { slug: true } } },
    });

    revalidatePath(`/products/${inquiry.product.slug}`);
    revalidatePath('/admin/inquiries');

    return { success: true };
  } catch (error) {
    console.error('문의 답변 오류:', error);
    return { success: false, error: '답변 등록에 실패했습니다.' };
  }
}
