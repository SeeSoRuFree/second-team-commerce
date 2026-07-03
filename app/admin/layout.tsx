// File: app/admin/layout.tsx
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import Link from 'next/link';
import { authOptions } from '@/lib/auth';
import { requireAdmin } from '@/lib/roles';
import { AdminNav } from '@/components/admin-nav';
import { Button } from '@/components/ui/button';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  Settings,
  LogOut,
  MessageCircle,
} from 'lucide-react';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAdmin();

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-lg">
        <div className="p-6">
          <Link href="/admin" className="text-xl font-bold text-gray-900">
            관리자
          </Link>
        </div>

        <nav className="mt-6">
          <div className="space-y-1 px-3">
            <Link
              href="/admin"
              className="flex items-center rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
            >
              <LayoutDashboard className="mr-3 h-4 w-4" />
              대시보드
            </Link>

            <Link
              href="/admin/products"
              className="flex items-center rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
            >
              <Package className="mr-3 h-4 w-4" />
              상품 관리
            </Link>

            <Link
              href="/admin/orders"
              className="flex items-center rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
            >
              <ShoppingCart className="mr-3 h-4 w-4" />
              주문 관리
            </Link>

            <Link
              href="/admin/inventory"
              className="flex items-center rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
            >
              <Package className="mr-3 h-4 w-4" />
              재고 관리
            </Link>

            <Link
              href="/admin/inquiries"
              className="flex items-center rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
            >
              <MessageCircle className="mr-3 h-4 w-4" />
              문의 관리
            </Link>

            <Link
              href="/admin/cs"
              className="flex items-center rounded-md px-3 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-50"
            >
              <MessageCircle className="mr-3 h-4 w-4" />
              🤖 AI CS 데스크
            </Link>

            <Link
              href="/admin/customers"
              className="flex items-center rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
            >
              <Users className="mr-3 h-4 w-4" />
              고객 관리
            </Link>

            <Link
              href="/admin/settings"
              className="flex items-center rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
            >
              <Settings className="mr-3 h-4 w-4" />
              설정
            </Link>
          </div>
        </nav>

        <div className="absolute bottom-0 w-64 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-700">
                {user.name || '관리자'}
              </p>
              <p className="text-xs text-gray-500">{user.email}</p>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/api/auth/signout">
                <LogOut className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="border-b bg-white shadow-sm">
          <div className="px-6 py-4">
            <AdminNav />
          </div>
        </header>

        <main className="flex-1 overflow-auto">
          <div className="p-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
