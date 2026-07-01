// File: app/admin/orders/page.tsx
import { Suspense } from 'react';
import { Search, Filter, Download } from 'lucide-react';
import { getOrders } from '@/server/queries/orders';
import { OrdersDataTable } from '@/components/orders-data-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export const dynamic = 'force-dynamic';
import { formatPrice } from '@/lib/utils';

interface AdminOrdersSearchParams {
  search?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: string;
}

interface AdminOrdersPageProps {
  searchParams: Promise<AdminOrdersSearchParams>;
}

async function OrdersList({
  searchParams,
}: {
  searchParams: AdminOrdersSearchParams;
}) {
  const page = parseInt(searchParams.page || '1');
  const search = searchParams.search || '';
  const status = searchParams.status || '';
  const dateFrom = searchParams.dateFrom
    ? new Date(searchParams.dateFrom)
    : undefined;
  const dateTo = searchParams.dateTo
    ? new Date(searchParams.dateTo)
    : undefined;

  const result = await getOrders({
    page,
    limit: 20,
    search,
    status,
    dateFrom,
    dateTo,
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
          <Badge className="bg-yellow-100 text-yellow-800">
            입금대기 {result.orders.filter(o => o.status === 'PENDING').length}개
          </Badge>
          <Badge className="bg-blue-100 text-blue-800">
            배송준비중{' '}
            {result.orders.filter(o => o.status === 'PROCESSING').length}개
          </Badge>
        </div>
      </div>

      <OrdersDataTable
        data={result.orders.map((order: any) => ({
          id: order.id,
          orderNumber: order.orderNumber,
          customer: order.user?.name || order.email || '비회원',
          total: Number(order.total),
          status: order.status,
          date: new Date(order.createdAt).toLocaleDateString('ko-KR'),
        }))}
        isLoading={false}
      />
    </div>
  );
}

export default async function AdminOrdersPage({
  searchParams,
}: AdminOrdersPageProps) {
  const resolvedSearchParams = await searchParams;
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">주문 관리</h1>
          <p className="text-muted-foreground">
            고객 주문과 배송 처리를 관리합니다
          </p>
        </div>
        <Button variant="outline">
          <Download className="mr-2 h-4 w-4" />
          내보내기
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center space-x-4">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="주문번호/고객 검색..."
            defaultValue={resolvedSearchParams.search}
            className="pl-9"
          />
        </div>

        <Select defaultValue={resolvedSearchParams.status}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="전체 상태" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">전체 상태</SelectItem>
            <SelectItem value="PENDING">입금대기</SelectItem>
            <SelectItem value="PROCESSING">배송준비중</SelectItem>
            <SelectItem value="SHIPPED">배송중</SelectItem>
            <SelectItem value="DELIVERED">배송완료</SelectItem>
            <SelectItem value="CANCELLED">취소</SelectItem>
          </SelectContent>
        </Select>

        <DatePickerWithRange />

        <Button variant="outline" size="sm">
          <Filter className="mr-2 h-4 w-4" />
          상세 필터
        </Button>
      </div>

      {/* Orders Table */}
      <div className="rounded-md border bg-white">
        <Suspense
          fallback={
            <div className="p-8 text-center">
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-gray-900"></div>
              <p className="mt-2 text-sm text-muted-foreground">
                주문을 불러오는 중...
              </p>
            </div>
          }
        >
          <OrdersList searchParams={resolvedSearchParams} />
        </Suspense>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-5">
        <div className="rounded-lg border bg-white p-6">
          <div className="flex items-center">
            <div className="mr-3 h-8 w-2 rounded bg-blue-500" />
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                전체 주문
              </p>
              <p className="text-2xl font-bold">2,847</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border bg-white p-6">
          <div className="flex items-center">
            <div className="mr-3 h-8 w-2 rounded bg-yellow-500" />
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                입금대기
              </p>
              <p className="text-2xl font-bold">42</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border bg-white p-6">
          <div className="flex items-center">
            <div className="mr-3 h-8 w-2 rounded bg-purple-500" />
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                배송준비중
              </p>
              <p className="text-2xl font-bold">128</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border bg-white p-6">
          <div className="flex items-center">
            <div className="mr-3 h-8 w-2 rounded bg-green-500" />
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                배송완료
              </p>
              <p className="text-2xl font-bold">2,651</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border bg-white p-6">
          <div className="flex items-center">
            <div className="mr-3 h-8 w-2 rounded bg-gray-500" />
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                매출
              </p>
              <p className="text-2xl font-bold">{formatPrice(284750)}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
