'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { ShoppingCart, Search, User } from 'lucide-react';
import { useCart } from '@/components/cart-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const NAV_ITEMS = [
  { label: '전체상품', href: '/products' },
  { label: '디지털/가전', href: '/category/electronics' },
  { label: '패션의류', href: '/category/clothing' },
  { label: '홈/리빙', href: '/category/home-living' },
];

export function Header() {
  const router = useRouter();
  const { data: session } = useSession();
  const { totalItems } = useCart();
  const [query, setQuery] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    router.push(q ? `/search?q=${encodeURIComponent(q)}` : '/search');
  };

  return (
    <header className="sticky top-0 z-40 border-b bg-background">
      <div className="mx-auto flex max-w-7xl items-center gap-6 px-4 py-4 sm:px-6 lg:px-8">
        {/* 로고 */}
        <Link href="/" className="shrink-0 text-xl font-bold tracking-tight">
          세컨팀 커머스
        </Link>

        {/* 네비게이션 */}
        <nav className="hidden items-center gap-5 md:flex">
          {NAV_ITEMS.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* 검색 */}
        <form onSubmit={handleSearch} className="ml-auto hidden lg:block">
          <div className="relative w-64">
            <Input
              type="search"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="상품 검색"
              className="pr-9"
            />
            <button
              type="submit"
              aria-label="검색"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <Search className="h-4 w-4" />
            </button>
          </div>
        </form>

        {/* 우측 액션 */}
        <div className="ml-auto flex items-center gap-2 lg:ml-0">
          {/* 모바일 검색 아이콘 */}
          <Button asChild variant="ghost" size="icon" className="lg:hidden">
            <Link href="/search" aria-label="검색">
              <Search className="h-5 w-5" />
            </Link>
          </Button>

          {/* 장바구니 */}
          <Button asChild variant="ghost" size="icon" className="relative">
            <Link href="/cart" aria-label="장바구니">
              <ShoppingCart className="h-5 w-5" />
              {totalItems > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-xs font-semibold text-primary-foreground">
                  {totalItems}
                </span>
              )}
            </Link>
          </Button>

          {/* 인증 상태 */}
          {session?.user ? (
            <div className="flex items-center gap-2">
              <Link
                href="/profile"
                className="hidden items-center gap-1 text-sm font-medium hover:text-primary sm:flex"
              >
                <User className="h-4 w-4" />
                {session.user.name || '마이페이지'}
              </Link>
              {session.user.role === 'ADMIN' && (
                <Button asChild variant="outline" size="sm">
                  <Link href="/admin">관리자</Link>
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => signOut({ callbackUrl: '/' })}
              >
                로그아웃
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <Button asChild variant="ghost" size="sm">
                <Link href="/auth/signin">로그인</Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/auth/signup">회원가입</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
