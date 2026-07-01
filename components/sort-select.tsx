// components/sort-select.tsx

'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface SortSelectProps {
  value?: string;
  onValueChange?: (value: string) => void;
}

export function SortSelect({
  value = 'newest',
  onValueChange,
}: SortSelectProps) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="정렬" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="newest">최신순</SelectItem>
        <SelectItem value="price-low">낮은 가격순</SelectItem>
        <SelectItem value="price-high">높은 가격순</SelectItem>
        <SelectItem value="popular">인기순</SelectItem>
        <SelectItem value="rating">평점순</SelectItem>
      </SelectContent>
    </Select>
  );
}
