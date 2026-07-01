// app/access-denied/page.tsx
import Link from 'next/link';
import { ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function AccessDeniedPage() {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center px-4 py-24 text-center">
      <ShieldAlert className="mb-4 h-12 w-12 text-gray-400" />
      <h1 className="text-2xl font-bold text-gray-900">접근 권한이 없습니다</h1>
      <p className="mt-2 text-sm text-gray-500">
        이 페이지는 관리자만 접근할 수 있습니다.
      </p>
      <div className="mt-6 flex gap-3">
        <Button asChild variant="outline">
          <Link href="/">홈으로</Link>
        </Button>
        <Button asChild>
          <Link href="/auth/signin">로그인</Link>
        </Button>
      </div>
    </div>
  );
}
