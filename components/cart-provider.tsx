'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';
import {
  addToCart as addToCartAction,
  updateCartItem as updateCartItemAction,
  removeFromCart as removeFromCartAction,
  clearCart as clearCartAction,
  getCart,
} from '@/server/actions/cart';

// DB(Cart/CartItem) 기반 장바구니. 서버 액션으로 저장하고, getCart로 상태를 동기화한다.
interface CartItem {
  id: string;
  productId: string;
  quantity: number;
  price: number;
  product: {
    id: string;
    name: string;
    slug: string;
    sku: string;
    price: number;
    stock: number;
    images: Array<{ url: string }>;
  };
}

interface CartContextType {
  items: CartItem[];
  isLoading: boolean;
  addItem: (productId: string, quantity?: number) => Promise<boolean>;
  removeItem: (id: string) => Promise<void>;
  updateItem: (id: string, quantity: number) => Promise<void>;
  updateQuantity: (id: string, quantity: number) => Promise<void>;
  clearCart: () => Promise<void>;
  refresh: () => Promise<void>;
  total: number;
  totalAmount: number;
  totalItems: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const refresh = useCallback(async () => {
    const cart = await getCart();
    // getCart 반환을 소비처(cart/checkout 페이지)가 기대하는 형태로 매핑
    const mapped: CartItem[] = cart.items.map((it: any) => ({
      id: it.id,
      productId: it.productId,
      quantity: it.quantity,
      price: Number(it.product?.price ?? 0),
      product: {
        id: it.product?.id ?? it.productId,
        name: it.product?.name ?? '',
        slug: it.product?.slug ?? '',
        sku: it.product?.sku ?? '',
        price: Number(it.product?.price ?? 0),
        stock: it.product?.stock ?? 99,
        images: it.product?.images ?? [],
      },
    }));
    setItems(mapped);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addItem = useCallback(
    async (productId: string, quantity: number = 1) => {
      setIsLoading(true);
      try {
        const fd = new FormData();
        fd.append('productId', productId);
        fd.append('quantity', String(quantity));
        const result = await addToCartAction(fd);
        if (result?.success) {
          await refresh();
          return true;
        }
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [refresh]
  );

  const updateItem = useCallback(
    async (id: string, quantity: number) => {
      const fd = new FormData();
      fd.append('quantity', String(quantity));
      await updateCartItemAction(id, fd);
      await refresh();
    },
    [refresh]
  );

  const removeItem = useCallback(
    async (id: string) => {
      const fd = new FormData();
      fd.append('itemId', id);
      await removeFromCartAction(fd);
      await refresh();
    },
    [refresh]
  );

  const clearCart = useCallback(async () => {
    await clearCartAction();
    await refresh();
  }, [refresh]);

  const total = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  return (
    <CartContext.Provider
      value={{
        items,
        isLoading,
        addItem,
        removeItem,
        updateItem,
        updateQuantity: updateItem,
        clearCart,
        refresh,
        total,
        totalAmount: total,
        totalItems: items.reduce((sum, item) => sum + item.quantity, 0),
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within CartProvider');
  }
  return context;
}
