// Location: components/product-inquiries.tsx

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { createInquiry } from '@/server/actions/inquiries';
import { inquiryStatusLabel } from '@/lib/inquiry-status';
import { cn } from '@/lib/utils';

interface InquiryItem {
  id: string;
  title: string;
  content: string | null;
  isSecret: boolean;
  locked: boolean;
  status: string;
  answer: string | null;
  userName: string | null;
  createdAt: string;
}

interface ProductInquiriesProps {
  productId: string;
  inquiries: InquiryItem[];
}

// ISO 문자열 → 한국식 YYYY.MM.DD
function formatKoreanDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}.${m}.${day}`;
}

function StatusBadge({ status }: { status: string }) {
  const answered = status === 'ANSWERED';
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold',
        answered
          ? 'bg-green-100 text-green-700'
          : 'bg-muted text-muted-foreground'
      )}
    >
      {inquiryStatusLabel(status)}
    </span>
  );
}

function InquiryRow({ inquiry }: { inquiry: InquiryItem }) {
  const [open, setOpen] = useState(false);

  return (
    <li className="py-1">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="flex w-full items-center gap-3 py-3 text-left"
        aria-expanded={open}
      >
        <StatusBadge status={inquiry.status} />
        <span className="flex min-w-0 flex-1 items-center gap-1.5">
          {inquiry.locked && (
            <Lock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          )}
          <span className="truncate font-medium">{inquiry.title}</span>
        </span>
        <span className="hidden shrink-0 text-sm text-muted-foreground sm:inline">
          {inquiry.userName || '익명'}
        </span>
        <span className="shrink-0 text-sm text-muted-foreground">
          {formatKoreanDate(inquiry.createdAt)}
        </span>
        <ChevronDown
          className={cn(
            'h-4 w-4 shrink-0 text-muted-foreground transition-transform',
            open && 'rotate-180'
          )}
        />
      </button>

      {open && (
        <div className="space-y-3 pb-4 pl-1 text-sm">
          <div className="rounded-md bg-muted/50 px-4 py-3 text-muted-foreground">
            {inquiry.locked ? (
              <span className="flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5" />
                비밀글은 작성자와 관리자만 볼 수 있습니다.
              </span>
            ) : (
              <p className="whitespace-pre-wrap leading-relaxed">
                {inquiry.content || '내용이 없습니다.'}
              </p>
            )}
          </div>

          {!inquiry.locked && inquiry.answer && (
            <div className="ml-4 rounded-md border-l-2 border-primary bg-primary/5 px-4 py-3">
              <div className="mb-1 font-semibold text-primary">[답변]</div>
              <p className="whitespace-pre-wrap leading-relaxed text-foreground">
                {inquiry.answer}
              </p>
            </div>
          )}
        </div>
      )}
    </li>
  );
}

export function ProductInquiries({
  productId,
  inquiries,
}: ProductInquiriesProps) {
  const router = useRouter();
  const { toast } = useToast();

  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isSecret, setIsSecret] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast({
        description: '문의 제목을 입력해 주세요.',
        variant: 'destructive',
      });
      return;
    }
    if (!content.trim()) {
      toast({
        description: '문의 내용을 입력해 주세요.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('productId', productId);
      formData.append('title', title);
      formData.append('content', content);
      if (isSecret) formData.append('isSecret', 'on');

      const result = await createInquiry(formData);

      if (result.success) {
        toast({ description: '문의가 등록되었습니다' });
        setShowForm(false);
        setTitle('');
        setContent('');
        setIsSecret(false);
        router.refresh();
      } else {
        toast({
          description: result.error || '문의 등록에 실패했습니다.',
          variant: 'destructive',
        });
      }
    } catch {
      toast({
        description: '문의 등록에 실패했습니다.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">
          상품 문의{' '}
          <span className="text-muted-foreground">({inquiries.length})</span>
        </h2>
        <Button
          variant={showForm ? 'outline' : 'default'}
          size="sm"
          onClick={() => setShowForm(v => !v)}
        >
          {showForm ? '닫기' : '문의하기'}
        </Button>
      </div>

      {/* 작성 폼 */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-lg border bg-card p-6"
        >
          <div className="space-y-2">
            <Label htmlFor="inquiry-title">제목</Label>
            <Input
              id="inquiry-title"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="문의 제목을 입력하세요"
              maxLength={100}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="inquiry-content">내용</Label>
            <textarea
              id="inquiry-content"
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="문의 내용을 입력하세요"
              rows={4}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              required
            />
          </div>

          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="isSecret"
              checked={isSecret}
              onChange={e => setIsSecret(e.target.checked)}
              className="h-4 w-4 rounded border-input"
            />
            비밀글로 문의
          </label>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowForm(false)}
              disabled={isSubmitting}
            >
              취소
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? '등록 중...' : '문의 등록'}
            </Button>
          </div>
        </form>
      )}

      {/* 목록 */}
      {inquiries.length === 0 ? (
        <div className="rounded-lg border border-dashed py-12 text-center text-muted-foreground">
          등록된 문의가 없습니다.
        </div>
      ) : (
        <ul className="divide-y border-y">
          {inquiries.map(inquiry => (
            <InquiryRow key={inquiry.id} inquiry={inquiry} />
          ))}
        </ul>
      )}
    </section>
  );
}
