// components/inventory-data-table.tsx

'use client';

import { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/data-table';

export interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  quantity: number;
  reorderLevel: number;
  status: 'in-stock' | 'low-stock' | 'out-of-stock';
}

interface InventoryDataTableProps {
  data: InventoryItem[];
  isLoading?: boolean;
}

export function InventoryDataTable({
  data,
  isLoading,
}: InventoryDataTableProps) {
  const columns: ColumnDef<InventoryItem>[] = [
    {
      accessorKey: 'name',
      header: '상품명',
    },
    {
      accessorKey: 'sku',
      header: 'SKU',
    },
    {
      accessorKey: 'quantity',
      header: '재고수량',
    },
    {
      accessorKey: 'reorderLevel',
      header: '재주문 기준',
    },
    {
      accessorKey: 'status',
      header: '상태',
      cell: ({ row }) => {
        const value = row.getValue('status') as string;
        const statusStyles = {
          'in-stock': 'bg-green-100 text-green-800',
          'low-stock': 'bg-yellow-100 text-yellow-800',
          'out-of-stock': 'bg-red-100 text-red-800',
        };
        const statusLabels = {
          'in-stock': '재고 있음',
          'low-stock': '재고 부족',
          'out-of-stock': '품절',
        };
        return (
          <span
            className={`rounded-full px-2 py-1 text-xs font-medium ${statusStyles[value as keyof typeof statusStyles]}`}
          >
            {statusLabels[value as keyof typeof statusLabels] ?? value}
          </span>
        );
      },
    },
  ];

  if (isLoading) {
    return <div className="py-8 text-center">재고를 불러오는 중...</div>;
  }

  return <DataTable columns={columns} data={data} />;
}
