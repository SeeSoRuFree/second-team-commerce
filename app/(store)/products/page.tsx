// File: app/(store)/products/page.tsx
import { Metadata } from 'next';
import { getProducts } from '@/server/queries/products';
import { ProductGrid } from '@/components/product-grid';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: '전체 상품',
  description: '세컨팀 커머스의 전체 상품을 둘러보세요.',
};

export default async function ProductsPage() {
  const { products } = await getProducts({ limit: 60 });

  // ProductGrid가 기대하는 형태로 매핑 (Decimal -> number 변환)
  const mapped = products.map(p => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    price: Number(p.price),
    comparePrice: p.comparePrice != null ? Number(p.comparePrice) : null,
    status: p.status,
    images: [],
    category: p.category ?? null,
  }));

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">
          전체 상품
        </h1>
        <p className="mt-2 text-muted-foreground">
          총 {mapped.length}개의 상품이 있습니다.
        </p>
      </div>

      {mapped.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-muted-foreground">등록된 상품이 없습니다.</p>
        </div>
      ) : (
        <ProductGrid products={mapped} />
      )}
    </div>
  );
}
