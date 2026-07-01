// File: app/admin/products/page.tsx
import { Suspense } from 'react';
import Link from 'next/link';
import { Plus, Search, Filter } from 'lucide-react';
import { getProducts } from '@/server/queries/products';
import { ProductsDataTable } from '@/components/products-data-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export const dynamic = 'force-dynamic';

interface AdminProductsSearchParams {
  search?: string;
  category?: string;
  status?: string;
  page?: string;
}

interface AdminProductsPageProps {
  searchParams: Promise<AdminProductsSearchParams>;
}

async function ProductsList({
  searchParams,
}: {
  searchParams: AdminProductsSearchParams;
}) {
  const page = parseInt(searchParams.page || '1');
  const search = searchParams.search || '';
  const category = searchParams.category || '';
  const status = searchParams.status || '';

  const result = await getProducts({
    page,
    limit: 20,
    search,
    category,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          전체 {result.pagination.total}개 중 {(page - 1) * 20 + 1}-
          {Math.min(page * 20, result.pagination.total)}개 표시
        </p>
        <div className="flex items-center space-x-2">
          <Badge variant="outline">전체 {result.pagination.total}개</Badge>
          <Badge variant="secondary">
            판매중{' '}
            {result.products.filter(p => p.status === 'PUBLISHED').length}개
          </Badge>
          <Badge variant="destructive">
            초안 {result.products.filter(p => p.status === 'DRAFT').length}개
          </Badge>
        </div>
      </div>

      <ProductsDataTable
        data={result.products.map((p: any) => ({
          id: p.id,
          name: p.name,
          sku: p.sku || '',
          price: Number(p.price),
          stock: 0,
          status: p.status === 'PUBLISHED' ? 'active' : 'inactive',
        }))}
        isLoading={false}
      />
    </div>
  );
}

export default async function AdminProductsPage({
  searchParams,
}: AdminProductsPageProps) {
  const resolvedSearchParams = await searchParams;
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">상품 관리</h1>
          <p className="text-muted-foreground">
            상품 목록을 등록하고 관리합니다
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/products/new">
            <Plus className="mr-2 h-4 w-4" />
            상품 등록
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center space-x-4">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="상품명 검색..."
            defaultValue={resolvedSearchParams.search}
            className="pl-9"
          />
        </div>

        <Select defaultValue={resolvedSearchParams.category}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="전체 카테고리" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">전체 카테고리</SelectItem>
            <SelectItem value="electronics">전자제품</SelectItem>
            <SelectItem value="clothing">의류</SelectItem>
            <SelectItem value="books">도서</SelectItem>
            <SelectItem value="home">홈/리빙</SelectItem>
            <SelectItem value="sports">스포츠</SelectItem>
          </SelectContent>
        </Select>

        <Select defaultValue={resolvedSearchParams.status}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="상태" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">전체 상태</SelectItem>
            <SelectItem value="published">판매중</SelectItem>
            <SelectItem value="draft">초안</SelectItem>
            <SelectItem value="archived">보관</SelectItem>
          </SelectContent>
        </Select>

        <Button variant="outline" size="sm">
          <Filter className="mr-2 h-4 w-4" />
          상세 필터
        </Button>
      </div>

      {/* Products Table */}
      <div className="rounded-md border bg-white">
        <Suspense
          fallback={
            <div className="p-8 text-center">
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-gray-900"></div>
              <p className="mt-2 text-sm text-muted-foreground">
                상품을 불러오는 중...
              </p>
            </div>
          }
        >
          <ProductsList searchParams={resolvedSearchParams} />
        </Suspense>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-lg border bg-white p-6">
          <div className="flex items-center">
            <div className="mr-3 h-8 w-2 rounded bg-blue-500" />
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                전체 상품
              </p>
              <p className="text-2xl font-bold">1,234</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border bg-white p-6">
          <div className="flex items-center">
            <div className="mr-3 h-8 w-2 rounded bg-green-500" />
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                판매중
              </p>
              <p className="text-2xl font-bold">1,089</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border bg-white p-6">
          <div className="flex items-center">
            <div className="mr-3 h-8 w-2 rounded bg-yellow-500" />
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                재고 부족
              </p>
              <p className="text-2xl font-bold">23</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border bg-white p-6">
          <div className="flex items-center">
            <div className="mr-3 h-8 w-2 rounded bg-red-500" />
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                품절
              </p>
              <p className="text-2xl font-bold">8</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
