// components/products-data-table.tsx

'use client';

import { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/data-table';
import { Button } from '@/components/ui/button';
import { Edit2, Trash2 } from 'lucide-react';
import { formatPrice } from '@/lib/utils';

export interface ProductItem {
  id: string;
  name: string;
  sku: string;
  price: number;
  stock: number;
  status: 'active' | 'inactive' | 'discontinued';
}

interface ProductsDataTableProps {
  data: ProductItem[];
  isLoading?: boolean;
  onEdit?: (product: ProductItem) => void;
  onDelete?: (productId: string) => void;
}

export function ProductsDataTable({
  data,
  isLoading,
  onEdit,
  onDelete,
}: ProductsDataTableProps) {
  const columns: ColumnDef<ProductItem>[] = [
    {
      accessorKey: 'name',
      header: '상품명',
    },
    {
      accessorKey: 'sku',
      header: 'SKU',
    },
    {
      accessorKey: 'price',
      header: '판매가',
      cell: ({ row }) => {
        const price = row.getValue('price') as number;
        return formatPrice(price);
      },
    },
    {
      accessorKey: 'stock',
      header: '재고',
    },
    {
      accessorKey: 'status',
      header: '상태',
      cell: ({ row }) => {
        const value = row.getValue('status') as string;
        const statusStyles = {
          active: 'bg-green-100 text-green-800',
          inactive: 'bg-gray-100 text-gray-800',
          discontinued: 'bg-red-100 text-red-800',
        };
        const statusLabels = {
          active: '판매중',
          inactive: '비공개',
          discontinued: '판매중단',
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
    {
      id: 'actions',
      header: '관리',
      cell: ({ row }) => (
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onEdit?.(row.original)}
          >
            <Edit2 className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onDelete?.(row.original.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  if (isLoading) {
    return <div className="py-8 text-center">상품을 불러오는 중...</div>;
  }

  return <DataTable columns={columns} data={data} />;
}
