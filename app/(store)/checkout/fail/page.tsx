// File: app/(store)/checkout/fail/page.tsx
import Link from 'next/link';
import { XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FailPageProps {
  searchParams: Promise<{ message?: string; code?: string }>;
}

export default async function CheckoutFailPage({ searchParams }: FailPageProps) {
  const { message } = await searchParams;

  return (
    <div className="mx-auto max-w-lg px-4 py-16 sm:px-6 lg:px-8">
      <div className="text-center">
        <XCircle className="mx-auto h-16 w-16 text-red-500" />
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-gray-900">
          결제가 완료되지 않았습니다
        </h1>
        <p className="mt-3 text-lg text-muted-foreground">
          결제 도중 문제가 발생했어요. 결제 금액은 청구되지 않으니 안심하세요.
        </p>

        {message && (
          <div className="mt-6 rounded-md bg-red-50 p-4 text-left">
            <p className="text-sm text-red-700">사유: {message}</p>
          </div>
        )}

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button asChild size="lg">
            <Link href="/checkout">다시 시도</Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/cart">장바구니로</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
