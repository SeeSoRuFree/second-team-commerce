// components/inquiry-answer-form.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { answerInquiry } from '@/server/actions/inquiries';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';

export function InquiryAnswerForm({ inquiryId }: { inquiryId: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [answer, setAnswer] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!answer.trim()) return;
    setSubmitting(true);

    const formData = new FormData();
    formData.append('inquiryId', inquiryId);
    formData.append('answer', answer.trim());

    const result = await answerInquiry(formData);
    setSubmitting(false);

    if (result.success) {
      toast({ title: '답변이 등록되었습니다.' });
      setAnswer('');
      router.refresh();
    } else {
      toast({
        title: result.error || '답변 등록에 실패했습니다.',
        variant: 'destructive',
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <textarea
        value={answer}
        onChange={e => setAnswer(e.target.value)}
        placeholder="답변을 입력하세요"
        rows={3}
        className="w-full rounded-md border px-3 py-2 text-sm"
      />
      <div className="flex justify-end">
        <Button type="submit" size="sm" disabled={submitting}>
          {submitting ? '등록 중...' : '답변 등록'}
        </Button>
      </div>
    </form>
  );
}
