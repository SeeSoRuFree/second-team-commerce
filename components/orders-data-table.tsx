// components/orders-data-table.tsx

'use client';

import { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/data-table';
import { formatPrice } from '@/lib/utils';
import { orderStatusLabel, orderStatusColor } from '@/lib/order-status';

export interface OrderItem {
  id: string;
  orderNumber: string;
  customer: string;
  total: number;
  // DB 상태 key(영문 대문자) 유지 — 화면 표기는 orderStatusLabel로
  status: string;
  date: string;
}

// 상태 뱃지 색상(tailwind 계열) → 실제 클래스 매핑
const STATUS_BADGE_STYLES: Record<string, string> = {
  yellow: 'bg-yellow-100 text-yellow-800',
  blue: 'bg-blue-100 text-blue-800',
  indigo: 'bg-indigo-100 text-indigo-800',
  purple: 'bg-purple-100 text-purple-800',
  green: 'bg-green-100 text-green-800',
  red: 'bg-red-100 text-red-800',
  gray: 'bg-gray-100 text-gray-800',
};

interface OrdersDataTableProps {
  data: OrderItem[];
  isLoading?: boolean;
}

export function OrdersDataTable({ data, isLoading }: OrdersDataTableProps) {
  const columns: ColumnDef<OrderItem>[] = [
    {
      accessorKey: 'orderNumber',
      header: '주문번호',
    },
    {
      accessorKey: 'customer',
      header: '고객',
    },
    {
      accessorKey: 'date',
      header: '주문일자',
    },
    {
      accessorKey: 'total',
      header: '금액',
      cell: ({ row }) => formatPrice(row.getValue('total')),
    },
    {
      accessorKey: 'status',
      header: '상태',
      cell: ({ row }) => {
        const value = row.getValue('status') as string;
        const badgeStyle =
          STATUS_BADGE_STYLES[orderStatusColor(value)] ??
          STATUS_BADGE_STYLES.gray;
        return (
          <span
            className={`rounded-full px-2 py-1 text-xs font-medium ${badgeStyle}`}
          >
            {orderStatusLabel(value)}
          </span>
        );
      },
    },
  ];

  if (isLoading) {
    return <div className="py-8 text-center">주문을 불러오는 중...</div>;
  }

  return <DataTable columns={columns} data={data} />;
}
