// File: app/admin/inventory/page.tsx
import { Suspense } from 'react';
import {
  Search,
  Filter,
  AlertTriangle,
  TrendingUp,
  Package,
} from 'lucide-react';
import { getInventoryData } from '@/server/queries/inventory';
import { InventoryDataTable } from '@/components/inventory-data-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export const dynamic = 'force-dynamic';

interface AdminInventorySearchParams {
  search?: string;
  category?: string;
  stockLevel?: string;
  page?: string;
}

interface AdminInventoryPageProps {
  searchParams: Promise<AdminInventorySearchParams>;
}

async function InventoryList({
  searchParams,
}: {
  searchParams: AdminInventorySearchParams;
}) {
  const page = parseInt(searchParams.page || '1');
  const search = searchParams.search || '';
  const category = searchParams.category || '';
  const stockLevel = searchParams.stockLevel || '';

  const result = await getInventoryData({
    page,
    limit: 20,
    search,
    stockLevel,
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
        </div>
      </div>

      <InventoryDataTable data={result.items} isLoading={false} />
    </div>
  );
}

export default async function AdminInventoryPage({
  searchParams,
}: AdminInventoryPageProps) {
  const resolvedSearchParams = await searchParams;
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">재고 관리</h1>
          <p className="text-muted-foreground">
            재고 수량을 확인하고 관리합니다
          </p>
        </div>
        <Button>재고 업데이트</Button>
      </div>

      {/* Alerts */}
      <div className="space-y-4">
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertTitle className="text-red-800">재고 부족 알림</AlertTitle>
          <AlertDescription className="text-red-700">
            재고가 부족해 확인이 필요한 상품이 23개 있습니다.
          </AlertDescription>
        </Alert>

        <Alert className="border-yellow-200 bg-yellow-50">
          <Package className="h-4 w-4 text-yellow-600" />
          <AlertTitle className="text-yellow-800">재입고 추천</AlertTitle>
          <AlertDescription className="text-yellow-700">
            판매 속도를 기준으로 재입고가 권장되는 상품이 8개 있습니다.
          </AlertDescription>
        </Alert>
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

        <Select defaultValue={resolvedSearchParams.stockLevel}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="재고 수준" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">전체 수준</SelectItem>
            <SelectItem value="in-stock">재고 있음</SelectItem>
            <SelectItem value="low-stock">재고 부족</SelectItem>
            <SelectItem value="out-of-stock">품절</SelectItem>
            <SelectItem value="overstock">재고 과다</SelectItem>
          </SelectContent>
        </Select>

        <Button variant="outline" size="sm">
          <Filter className="mr-2 h-4 w-4" />
          상세 필터
        </Button>
      </div>

      {/* Inventory Table */}
      <div className="rounded-md border bg-white">
        <Suspense
          fallback={
            <div className="p-8 text-center">
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-gray-900"></div>
              <p className="mt-2 text-sm text-muted-foreground">
                재고를 불러오는 중...
              </p>
            </div>
          }
        >
          <InventoryList searchParams={resolvedSearchParams} />
        </Suspense>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-lg border bg-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                전체 품목
              </p>
              <p className="text-2xl font-bold">1,234</p>
              <p className="text-xs text-muted-foreground">
                전월 대비 +12%
              </p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
              <Package className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="rounded-lg border bg-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                재고 부족
              </p>
              <p className="text-2xl font-bold text-yellow-600">23</p>
              <p className="text-xs text-muted-foreground">확인 필요</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100">
              <AlertTriangle className="h-6 w-6 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="rounded-lg border bg-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                품절
              </p>
              <p className="text-2xl font-bold text-red-600">8</p>
              <p className="text-xs text-muted-foreground">긴급</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
          </div>
        </div>

        <div className="rounded-lg border bg-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                재고 자산가치
              </p>
              <p className="text-2xl font-bold">4.86억</p>
              <p className="flex items-center text-xs text-green-600">
                <TrendingUp className="mr-1 h-3 w-3" />
                +8.2%
              </p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
              <TrendingUp className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
