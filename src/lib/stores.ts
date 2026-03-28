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

/** Currency store — tracks user's preferred display currency */
const CURRENCIES = ["DKK", "EUR", "SEK", "NOK", "GBP", "USD"] as const;
type Currency = typeof CURRENCIES[number];

interface CurrencyStore {
  currency: Currency;
  rates: Record<string, number>;
  setCurrency: (currency: Currency) => void;
  setRates: (rates: Record<string, number>) => void;
  convert: (amountDKK: number) => number;
  currencies: readonly string[];
}

export const useCurrencyStore = create<CurrencyStore>((set, get) => ({
  currency: "DKK",
  rates: { DKK: 1, EUR: 0.134, SEK: 1.54, NOK: 1.56, GBP: 0.115, USD: 0.145 },
  currencies: CURRENCIES,
  setCurrency: (currency) => set({ currency }),
  setRates: (rates) => set({ rates }),
  convert: (amountDKK) => {
    const { currency, rates } = get();
    const rate = rates[currency] ?? 1;
    return Math.round(amountDKK * rate * 100) / 100;
  },
}));
