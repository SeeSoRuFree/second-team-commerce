// Location: components/product-reviews.tsx

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { createReview } from '@/server/actions/reviews';
import { cn } from '@/lib/utils';

interface ReviewItem {
  id: string;
  rating: number;
  title: string | null;
  content: string | null;
  verified: boolean;
  userName: string | null;
  createdAt: string;
}

interface ReviewSummary {
  average: number;
  count: number;
  distribution: Record<number, number>;
}

interface ProductReviewsProps {
  productId: string;
  reviews: ReviewItem[];
  summary: ReviewSummary;
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

// 채워진 별 rating개 + 나머지 빈 별 (총 5개)
function StarRating({ value, size = 16 }: { value: number; size?: number }) {
  return (
    <div className="flex items-center" aria-label={`별점 ${value}점`}>
      {[1, 2, 3, 4, 5].map(n => (
        <Star
          key={n}
          style={{ width: size, height: size }}
          className={cn(
            n <= value
              ? 'fill-yellow-400 text-yellow-400'
              : 'fill-none text-muted-foreground/40'
          )}
        />
      ))}
    </div>
  );
}

export function ProductReviews({
  productId,
  reviews,
  summary,
}: ProductReviewsProps) {
  const router = useRouter();
  const { toast } = useToast();

  const [showForm, setShowForm] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (rating < 1) {
      toast({ description: '별점을 선택해 주세요.', variant: 'destructive' });
      return;
    }
    if (!content.trim()) {
      toast({
        description: '리뷰 내용을 입력해 주세요.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('productId', productId);
      formData.append('rating', String(rating));
      formData.append('title', title);
      formData.append('content', content);

      const result = await createReview(formData);

      if (result.success) {
        toast({ description: '리뷰가 등록되었습니다' });
        setShowForm(false);
        setRating(0);
        setHoverRating(0);
        setTitle('');
        setContent('');
        router.refresh();
      } else {
        toast({
          description: result.error || '리뷰 등록에 실패했습니다.',
          variant: 'destructive',
        });
      }
    } catch {
      toast({
        description: '리뷰 등록에 실패했습니다.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const displayRating = hoverRating || rating;
  const maxDist = Math.max(
    1,
    ...[5, 4, 3, 2, 1].map(n => summary.distribution[n] || 0)
  );

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">
          상품 리뷰{' '}
          <span className="text-muted-foreground">({summary.count})</span>
        </h2>
        <Button
          variant={showForm ? 'outline' : 'default'}
          size="sm"
          onClick={() => setShowForm(v => !v)}
        >
          {showForm ? '닫기' : '리뷰 작성하기'}
        </Button>
      </div>

      {/* 요약 */}
      <div className="flex flex-col gap-6 rounded-lg border bg-card p-6 sm:flex-row sm:items-center">
        <div className="flex flex-col items-center justify-center sm:w-40">
          <div className="text-4xl font-bold">{summary.average.toFixed(1)}</div>
          <StarRating value={Math.round(summary.average)} size={18} />
          <div className="mt-1 text-sm text-muted-foreground">
            총 {summary.count}개 리뷰
          </div>
        </div>

        <div className="flex-1 space-y-1.5">
          {[5, 4, 3, 2, 1].map(n => {
            const cnt = summary.distribution[n] || 0;
            const pct = summary.count > 0 ? (cnt / summary.count) * 100 : 0;
            const barPct = (cnt / maxDist) * 100;
            return (
              <div key={n} className="flex items-center gap-2 text-sm">
                <span className="w-8 shrink-0 text-muted-foreground">
                  {n}점
                </span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-yellow-400"
                    style={{ width: `${barPct}%` }}
                  />
                </div>
                <span className="w-16 shrink-0 text-right text-muted-foreground">
                  {cnt}개 ({Math.round(pct)}%)
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 작성 폼 */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-lg border bg-card p-6"
        >
          <div className="space-y-2">
            <Label>별점</Label>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map(n => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setRating(n)}
                  onMouseEnter={() => setHoverRating(n)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="p-0.5"
                  aria-label={`별점 ${n}점 선택`}
                >
                  <Star
                    className={cn(
                      'h-7 w-7 transition-colors',
                      n <= displayRating
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'fill-none text-muted-foreground/40'
                    )}
                  />
                </button>
              ))}
              {rating > 0 && (
                <span className="ml-2 text-sm text-muted-foreground">
                  {rating}점
                </span>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="review-title">제목 (선택)</Label>
            <Input
              id="review-title"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="리뷰 제목을 입력하세요"
              maxLength={100}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="review-content">내용</Label>
            <textarea
              id="review-content"
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="상품에 대한 솔직한 리뷰를 남겨주세요"
              rows={4}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              required
            />
          </div>

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
              {isSubmitting ? '등록 중...' : '리뷰 등록'}
            </Button>
          </div>
        </form>
      )}

      {/* 목록 */}
      {reviews.length === 0 ? (
        <div className="rounded-lg border border-dashed py-12 text-center text-muted-foreground">
          아직 리뷰가 없습니다. 첫 번째 리뷰를 남겨주세요.
        </div>
      ) : (
        <ul className="divide-y">
          {reviews.map(review => (
            <li key={review.id} className="space-y-2 py-5">
              <div className="flex flex-wrap items-center gap-2">
                <StarRating value={review.rating} />
                {review.verified && (
                  <Badge variant="secondary">구매확인</Badge>
                )}
                <span className="text-sm font-medium">
                  {review.userName || '익명'}
                </span>
                <span className="text-sm text-muted-foreground">
                  {formatKoreanDate(review.createdAt)}
                </span>
              </div>
              {review.title && (
                <div className="font-bold">{review.title}</div>
              )}
              {review.content && (
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                  {review.content}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
