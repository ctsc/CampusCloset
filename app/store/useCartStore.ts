import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

export interface CartItem {
  listingId: string;
  sellerId: string;
  title: string;
  price: number;
  imageUrl: string;
}

interface CartState {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (listingId: string) => void;
  clear: () => void;
  getTotal: () => number;
  getCount: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (item) => {
        const { items } = get();
        // Single-seller enforcement: if cart has items from a different seller, block
        if (items.length > 0 && items[0].sellerId !== item.sellerId) {
          return; // Caller should show warning before calling
        }
        // Don't add duplicates
        if (items.some((i) => i.listingId === item.listingId)) return;
        set({ items: [...items, item] });
      },

      removeItem: (listingId) =>
        set((state) => ({
          items: state.items.filter((i) => i.listingId !== listingId),
        })),

      clear: () => set({ items: [] }),

      getTotal: () => get().items.reduce((sum, i) => sum + i.price, 0),

      getCount: () => get().items.length,
    }),
    {
      name: "cart-storage",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
