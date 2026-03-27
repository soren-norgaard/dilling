import { create } from "zustand";

export interface CartItemState {
  productId: string;
  productName: string;
  slug: string;
  size: string;
  color: string;
  quantity: number;
  price: number;
  currency: string;
  image?: string;
}

interface CartStore {
  items: CartItemState[];
  isOpen: boolean;
  setItems: (items: CartItemState[]) => void;
  addItem: (item: CartItemState) => void;
  removeItem: (productId: string, size: string, color: string) => void;
  updateQuantity: (productId: string, size: string, color: string, quantity: number) => void;
  clearCart: () => void;
  toggleCart: () => void;
  openCart: () => void;
  closeCart: () => void;
  totalItems: () => number;
  totalPrice: () => number;
}

export const useCartStore = create<CartStore>((set, get) => ({
  items: [],
  isOpen: false,

  setItems: (items) => set({ items }),

  addItem: (item) =>
    set((state) => {
      const existing = state.items.find(
        (i) =>
          i.productId === item.productId &&
          i.size === item.size &&
          i.color === item.color
      );
      if (existing) {
        return {
          items: state.items.map((i) =>
            i.productId === item.productId &&
            i.size === item.size &&
            i.color === item.color
              ? { ...i, quantity: i.quantity + item.quantity }
              : i
          ),
        };
      }
      return { items: [...state.items, item] };
    }),

  removeItem: (productId, size, color) =>
    set((state) => ({
      items: state.items.filter(
        (i) =>
          !(i.productId === productId && i.size === size && i.color === color)
      ),
    })),

  updateQuantity: (productId, size, color, quantity) =>
    set((state) => ({
      items: state.items.map((i) =>
        i.productId === productId && i.size === size && i.color === color
          ? { ...i, quantity }
          : i
      ),
    })),

  clearCart: () => set({ items: [] }),
  toggleCart: () => set((state) => ({ isOpen: !state.isOpen })),
  openCart: () => set({ isOpen: true }),
  closeCart: () => set({ isOpen: false }),
  totalItems: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
  totalPrice: () => get().items.reduce((sum, i) => sum + i.price * i.quantity, 0),
}));
