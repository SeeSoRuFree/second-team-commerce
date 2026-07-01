// components/admin-nav.tsx

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const adminNavItems = [
  {
    href: '/admin/products',
    label: '상품 관리',
  },
  {
    href: '/admin/orders',
    label: '주문 관리',
  },
  {
    href: '/admin/inventory',
    label: '재고 관리',
  },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-6 border-b">
      {adminNavItems.map(item => (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            '-mb-[2px] border-b-2 px-4 py-2 text-sm font-medium transition-colors',
            pathname.startsWith(item.href)
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          )}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
