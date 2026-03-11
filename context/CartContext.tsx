"use client";

import { ReactNode, createContext, startTransition, useContext, useEffect, useState } from "react";

import { clamp } from "@/lib/utils";
import { CartLineItem, GroceryProduct } from "@/types/product";

interface CartContextValue {
  items: CartLineItem[];
  itemCount: number;
  subtotal: number;
  isHydrated: boolean;
  isCartOpen: boolean;
  addToCart: (product: GroceryProduct, weight?: string, quantity?: number) => void;
  setItemQuantity: (product: GroceryProduct, weight: string, quantity: number) => void;
  getItemQuantity: (productId: number, weight: string) => number;
  removeFromCart: (lineId: string) => void;
  updateQuantity: (lineId: string, quantity: number) => void;
  clearCart: () => void;
  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;
}

const STORAGE_KEY = "quickbasket-cart";

const CartContext = createContext<CartContextValue | undefined>(undefined);

function buildLineId(productId: number, weight: string) {
  return `${productId}-${weight.toLowerCase()}`;
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartLineItem[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);

  useEffect(() => {
    const storedCart = window.localStorage.getItem(STORAGE_KEY);

    if (storedCart) {
      try {
        setItems(JSON.parse(storedCart) as CartLineItem[]);
      } catch {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    }

    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [isHydrated, items]);

  const updateQuantity = (lineId: string, quantity: number) => {
    startTransition(() => {
      setItems((currentItems) => {
        const existingItem = currentItems.find((item) => item.lineId === lineId);

        if (!existingItem) {
          return currentItems;
        }

        if (quantity <= 0) {
          return currentItems.filter((item) => item.lineId !== lineId);
        }

        const nextQuantity = clamp(quantity, 1, existingItem.stock);

        return currentItems.map((item) => (item.lineId === lineId ? { ...item, quantity: nextQuantity } : item));
      });
    });
  };

  const removeFromCart = (lineId: string) => {
    startTransition(() => {
      setItems((currentItems) => currentItems.filter((item) => item.lineId !== lineId));
    });
  };

  const setItemQuantity = (product: GroceryProduct, weight: string, quantity: number) => {
    startTransition(() => {
      setItems((currentItems) => {
        const lineId = buildLineId(product.id, weight);
        const existingItem = currentItems.find((item) => item.lineId === lineId);
        const nextQuantity = clamp(quantity, 0, product.stock);

        if (nextQuantity <= 0) {
          return currentItems.filter((item) => item.lineId !== lineId);
        }

        if (existingItem) {
          return currentItems.map((item) => (item.lineId === lineId ? { ...item, quantity: nextQuantity } : item));
        }

        return currentItems.concat({
          lineId,
          productId: product.id,
          slug: product.slug,
          name: product.name,
          brand: product.brand,
          image: product.image,
          price: product.price,
          weight,
          quantity: nextQuantity,
          stock: product.stock
        });
      });
    });
  };

  const addToCart = (product: GroceryProduct, weight = product.weight, quantity = 1) => {
    startTransition(() => {
      setItems((currentItems) => {
        const lineId = buildLineId(product.id, weight);
        const existingItem = currentItems.find((item) => item.lineId === lineId);
        const nextQuantity = clamp((existingItem?.quantity ?? 0) + quantity, 0, product.stock);

        if (nextQuantity <= 0) {
          return currentItems.filter((item) => item.lineId !== lineId);
        }

        if (existingItem) {
          return currentItems.map((item) => (item.lineId === lineId ? { ...item, quantity: nextQuantity } : item));
        }

        return currentItems.concat({
          lineId,
          productId: product.id,
          slug: product.slug,
          name: product.name,
          brand: product.brand,
          image: product.image,
          price: product.price,
          weight,
          quantity: nextQuantity,
          stock: product.stock
        });
      });
    });
  };

  const getItemQuantity = (productId: number, weight: string) => {
    return items.find((item) => item.lineId === buildLineId(productId, weight))?.quantity ?? 0;
  };

  const clearCart = () => {
    startTransition(() => {
      setItems([]);
    });
  };

  const openCart = () => setIsCartOpen(true);
  const closeCart = () => setIsCartOpen(false);
  const toggleCart = () => setIsCartOpen((currentValue) => !currentValue);

  const itemCount = items.reduce((total, item) => total + item.quantity, 0);
  const subtotal = items.reduce((total, item) => total + item.price * item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        itemCount,
        subtotal,
        isHydrated,
        isCartOpen,
        addToCart,
        setItemQuantity,
        getItemQuantity,
        removeFromCart,
        updateQuantity,
        clearCart,
        openCart,
        closeCart,
        toggleCart
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);

  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }

  return context;
}
