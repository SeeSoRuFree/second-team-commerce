// Location: components/add-to-cart.tsx

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Minus, Plus, ShoppingCart, Check, CreditCard } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useCart } from '@/components/cart-provider';
import type { ButtonProps } from '@/components/ui/button';

interface AddToCartProps extends Omit<ButtonProps, 'onClick'> {
  productId: string;
  maxQuantity?: number;
  showQuantitySelector?: boolean;
  showBuyNow?: boolean; // "바로 구매" 버튼 노출
  onAddToCart?: () => void;
}

export function AddToCart({
  productId,
  maxQuantity = 10,
  showQuantitySelector = false,
  showBuyNow = false,
  onAddToCart,
  disabled,
  children,
  ...props
}: AddToCartProps) {
  const router = useRouter();
  const { addItem } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isBuying, setIsBuying] = useState(false);
  const [isAdded, setIsAdded] = useState(false);

  const handleQuantityChange = (newQuantity: number) => {
    if (newQuantity >= 1 && newQuantity <= maxQuantity) {
      setQuantity(newQuantity);
    }
  };

  const handleAddToCart = async () => {
    setIsLoading(true);
    try {
      const ok = await addItem(productId, quantity);
      if (ok) {
        toast.success(`장바구니에 ${quantity}개 담았습니다.`);
        setIsAdded(true);
        onAddToCart?.();
        setTimeout(() => setIsAdded(false), 2000);
      } else {
        toast.error('장바구니 담기에 실패했습니다. 로그인 후 다시 시도해 주세요.');
      }
    } catch {
      toast.error('오류가 발생했습니다. 다시 시도해 주세요.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBuyNow = async () => {
    setIsBuying(true);
    try {
      const ok = await addItem(productId, quantity);
      if (ok) {
        router.push('/checkout');
      } else {
        toast.error('구매를 진행할 수 없습니다. 로그인 후 다시 시도해 주세요.');
        setIsBuying(false);
      }
    } catch {
      toast.error('오류가 발생했습니다. 다시 시도해 주세요.');
      setIsBuying(false);
    }
  };

  if (showQuantitySelector) {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="quantity">수량</Label>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => handleQuantityChange(quantity - 1)}
              disabled={quantity <= 1 || disabled}
              className="h-8 w-8"
            >
              <Minus className="h-3 w-3" />
            </Button>
            <Input
              id="quantity"
              type="number"
              min="1"
              max={maxQuantity}
              value={quantity}
              onChange={e => handleQuantityChange(parseInt(e.target.value) || 1)}
              disabled={disabled}
              className="h-8 w-16 text-center"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={() => handleQuantityChange(quantity + 1)}
              disabled={quantity >= maxQuantity || disabled}
              className="h-8 w-8"
            >
              <Plus className="h-3 w-3" />
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            {maxQuantity > 0 ? `재고 ${maxQuantity}개` : '품절'}
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={handleAddToCart}
            disabled={disabled || isLoading || isBuying || maxQuantity <= 0}
            variant="outline"
            className="flex-1"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                담는 중...
              </span>
            ) : isAdded ? (
              <span className="flex items-center gap-2">
                <Check className="h-4 w-4" /> 담기 완료
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <ShoppingCart className="h-4 w-4" /> 장바구니
              </span>
            )}
          </Button>
          {showBuyNow && (
            <Button
              onClick={handleBuyNow}
              disabled={disabled || isLoading || isBuying || maxQuantity <= 0}
              className="flex-1"
            >
              {isBuying ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  이동 중...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4" /> 바로 구매
                </span>
              )}
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <Button
      onClick={handleAddToCart}
      disabled={disabled || isLoading || maxQuantity <= 0}
      {...props}
    >
      {isLoading ? (
        <span className="flex items-center gap-2">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          {props.size === 'sm' ? '담는 중...' : '담는 중...'}
        </span>
      ) : isAdded ? (
        <span className="flex items-center gap-2">
          <Check className="h-4 w-4" />
          {props.size === 'sm' ? '완료' : '담기 완료'}
        </span>
      ) : (
        <span className="flex items-center gap-2">
          <ShoppingCart className="h-4 w-4" />
          {children || '장바구니 담기'}
        </span>
      )}
    </Button>
  );
}

// 간단 담기 버튼 (아이콘)
export function QuickAddToCart({
  productId,
  className,
}: {
  productId: string;
  className?: string;
}) {
  return (
    <AddToCart
      productId={productId}
      size="icon"
      variant="secondary"
      className={className}
    >
      <ShoppingCart className="h-4 w-4" />
      <span className="sr-only">장바구니 담기</span>
    </AddToCart>
  );
}
