// File: app/admin/inquiries/page.tsx
// 관리자 — 상품 문의 관리 (답변 등록)
import prisma from '@/lib/prisma';
import { InquiryAnswerForm } from '@/components/inquiry-answer-form';
import { Badge } from '@/components/ui/badge';
import { inquiryStatusLabel } from '@/lib/inquiry-status';

export const dynamic = 'force-dynamic';

export default async function AdminInquiriesPage() {
  const inquiries = await prisma.inquiry.findMany({
    include: {
      user: { select: { name: true, email: true } },
      product: { select: { name: true, slug: true } },
    },
    orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
  });

  const pendingCount = inquiries.filter(q => q.status === 'PENDING').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">상품 문의 관리</h1>
          <p className="mt-1 text-sm text-gray-500">
            총 {inquiries.length}건 · 답변대기 {pendingCount}건
          </p>
        </div>
      </div>

      {inquiries.length === 0 ? (
        <div className="rounded-lg border bg-white py-16 text-center text-gray-500">
          등록된 문의가 없습니다.
        </div>
      ) : (
        <div className="space-y-4">
          {inquiries.map(q => (
            <div key={q.id} className="rounded-lg border bg-white p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-center gap-2">
                    <Badge
                      variant={q.status === 'ANSWERED' ? 'default' : 'secondary'}
                    >
                      {inquiryStatusLabel(q.status)}
                    </Badge>
                    {q.isSecret && (
                      <span className="text-xs text-gray-400">🔒 비밀글</span>
                    )}
                    <span className="truncate text-sm text-gray-500">
                      {q.product.name}
                    </span>
                  </div>
                  <p className="font-semibold text-gray-900">{q.title}</p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-gray-700">
                    {q.content}
                  </p>
                  <p className="mt-2 text-xs text-gray-400">
                    {q.user.name || q.user.email} ·{' '}
                    {new Date(q.createdAt).toLocaleDateString('ko-KR')}
                  </p>
                </div>
              </div>

              {q.answer ? (
                <div className="mt-4 rounded-md bg-gray-50 p-4">
                  <p className="mb-1 text-xs font-medium text-gray-500">
                    답변
                    {q.answeredAt &&
                      ` · ${new Date(q.answeredAt).toLocaleDateString('ko-KR')}`}
                  </p>
                  <p className="whitespace-pre-wrap text-sm text-gray-700">
                    {q.answer}
                  </p>
                </div>
              ) : (
                <div className="mt-4">
                  <InquiryAnswerForm inquiryId={q.id} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
