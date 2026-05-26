import React, { createContext, useContext, useEffect, useState } from "react";
import type { CartItem, Wine } from "./types";
import { wineDefaultImage } from "./types";

interface CartContextType {
  items: CartItem[];
  addToCart: (wine: Wine, quantity?: number) => void;
  removeFromCart: (wineId: number | string) => void;
  updateQuantity: (wineId: number | string, quantity: number) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    if (typeof window === "undefined") return [];
    const saved = localStorage.getItem("lemberg_cart");
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem("lemberg_cart", JSON.stringify(items));
  }, [items]);

  const addToCart = (wine: Wine, quantity = 1) => {
    setItems((prev) => {
      const existing = prev.find((item) => item.wineId === wine.id);
      if (existing) {
        return prev.map((item) =>
          item.wineId === wine.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [
        ...prev,
        {
          wineId: wine.id,
          name: wine.name,
          vintage: wine.vintage,
          price: wine.price || 0,
          quantity,
          image: wineDefaultImage(wine),
        },
      ];
    });
  };

  const removeFromCart = (wineId: number | string) => {
    setItems((prev) => prev.filter((item) => item.wineId !== wineId));
  };

  const updateQuantity = (wineId: number | string, quantity: number) => {
    if (quantity < 1) {
      removeFromCart(wineId);
      return;
    }
    setItems((prev) =>
      prev.map((item) =>
        item.wineId === wineId ? { ...item, quantity } : item
      )
    );
  };

  const clearCart = () => setItems([]);

  const totalItems = items.reduce((acc, item) => acc + item.quantity, 0);
  const totalPrice = items.reduce((acc, item) => acc + item.quantity * item.price, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        totalItems,
        totalPrice,
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
