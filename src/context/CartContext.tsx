"use client";

import {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { CartItem, CartState, Product, AppliedPromo, VolumeDiscountTier, ArtworkFile } from "@/lib/types";
import { resolveProductMatrixPrice, resolveProductOptionUnitPrice } from "@/lib/pricing";

type CartAction =
  | { type: "ADD_ITEM"; payload: CartItem }
  | { type: "REMOVE_ITEM"; payload: string }
  | { type: "UPDATE_QTY"; payload: { id: string; quantity: number; newLinePrice?: number } }
  | { type: "CLEAR" }
  | { type: "OPEN" }
  | { type: "CLOSE" }
  | { type: "APPLY_PROMO"; payload: AppliedPromo }
  | { type: "REMOVE_PROMO" };

const initialState: CartState = {
  items: [],
  isOpen: false,
  appliedPromo: null,
};

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case "ADD_ITEM": {
      const existing = state.items.find((i) => i.id === action.payload.id);
      if (existing) {
        return {
          ...state,
          isOpen: true,
          items: state.items.map((i) =>
            i.id === action.payload.id
              ? { ...i, quantity: i.quantity + action.payload.quantity, linePrice: i.linePrice + action.payload.linePrice }
              : i
          ),
        };
      }
      return { ...state, isOpen: true, items: [...state.items, action.payload] };
    }
    case "REMOVE_ITEM":
      return { ...state, items: state.items.filter((i) => i.id !== action.payload) };
    case "UPDATE_QTY":
      return {
        ...state,
        items: state.items.map((i) => {
          if (i.id !== action.payload.id) return i;
          const newQty = action.payload.quantity;
          const newLinePrice = action.payload.newLinePrice ?? (i.product.price > 0 ? i.product.price * newQty : i.linePrice);
          return { ...i, quantity: newQty, linePrice: newLinePrice };
        }),
      };
    case "CLEAR":
      return { ...state, items: [], appliedPromo: null };
    case "OPEN":
      return { ...state, isOpen: true };
    case "CLOSE":
      return { ...state, isOpen: false };
    case "APPLY_PROMO":
      return { ...state, appliedPromo: action.payload };
    case "REMOVE_PROMO":
      return { ...state, appliedPromo: null };
    default:
      return state;
  }
}

interface CartContextValue {
  state: CartState;
  addItem: (product: Product, options: Record<string, string>, qty?: number, text?: string, artworks?: ArtworkFile[], linePrice?: number) => void;
  removeItem: (id: string) => void;
  updateQty: (id: string, qty: number) => void;
  clearCart: () => void;
  openCart: () => void;
  closeCart: () => void;
  applyPromo: (promo: AppliedPromo) => void;
  removePromo: () => void;
  totalItems: number;
  subtotal: number;
  discountAmount: number;
  volumeDiscounts: VolumeDiscountTier[];
}

const CartContext = createContext<CartContextValue | null>(null);

function applyVolumeDiscount(tiers: VolumeDiscountTier[], unitPrice: number, qty: number): number {
  if (!tiers.length || unitPrice <= 0) return unitPrice * qty;
  const tier = [...tiers].sort((a, b) => b.minQty - a.minQty).find((t) => qty >= t.minQty);
  return unitPrice * qty * (1 - (tier?.discountPercent ?? 0) / 100);
}

const CART_STORAGE_KEY = "emma_cart";

function loadCartFromStorage(): Pick<CartState, "items" | "appliedPromo"> {
  if (typeof window === "undefined") return { items: [], appliedPromo: null };
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return { items: [], appliedPromo: null };
    const parsed = JSON.parse(raw);
    return { items: parsed.items ?? [], appliedPromo: parsed.appliedPromo ?? null };
  } catch {
    return { items: [], appliedPromo: null };
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, initialState, (init) => ({
    ...init,
    ...loadCartFromStorage(),
  }));
  const [volumeDiscounts, setVolumeDiscounts] = useState<VolumeDiscountTier[]>([]);

  // Persist cart to localStorage whenever items or promo change
  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify({ items: state.items, appliedPromo: state.appliedPromo }));
    } catch { /* quota exceeded or private browsing — fail silently */ }
  }, [state.items, state.appliedPromo]);

  useEffect(() => {
    fetch("/api/volume-discounts")
      .then((r) => r.json())
      .then((d: VolumeDiscountTier[]) => setVolumeDiscounts(d))
      .catch(() => {});
  }, []);

  const addItem = useCallback(
    (product: Product, options: Record<string, string>, qty = 1, text?: string, artworks?: ArtworkFile[], linePrice?: number) => {
      // Artwork is part of the line identity: merging two lines would keep only the first line's designs
      const id = `${product.id}-${Object.values(options).join("-")}-${text ?? ""}-${(artworks ?? []).map((a) => a.url).join("|")}`;
      const resolvedLinePrice = linePrice ?? product.price * qty;
      dispatch({
        type: "ADD_ITEM",
        payload: { id, product, quantity: qty, linePrice: resolvedLinePrice, selectedOptions: options, customText: text, artworks },
      });
    },
    []
  );

  const removeItem = useCallback((id: string) => dispatch({ type: "REMOVE_ITEM", payload: id }), []);
  const updateQty = useCallback((id: string, quantity: number) => {
    const item = state.items.find((i) => i.id === id);
    let newLinePrice: number | undefined;
    const optionUnitPrice = item ? resolveProductOptionUnitPrice(item.product, item.selectedOptions) : null;
    if (item && optionUnitPrice !== null) {
      newLinePrice = applyVolumeDiscount(volumeDiscounts, optionUnitPrice, quantity);
    } else if (item?.product.priceMatrix && Object.keys(item.product.priceMatrix).length > 0) {
      const resolved = resolveProductMatrixPrice(item.product, item.selectedOptions, quantity);
      newLinePrice = resolved ? resolved.totalPence / 100 : undefined;
    } else if (item && item.product.price > 0) {
      newLinePrice = applyVolumeDiscount(volumeDiscounts, item.product.price, quantity);
    }
    dispatch({ type: "UPDATE_QTY", payload: { id, quantity, newLinePrice } });
  }, [state.items, volumeDiscounts]);
  const clearCart = useCallback(() => dispatch({ type: "CLEAR" }), []);
  const openCart = useCallback(() => dispatch({ type: "OPEN" }), []);
  const closeCart = useCallback(() => dispatch({ type: "CLOSE" }), []);
  const applyPromo = useCallback((promo: AppliedPromo) => dispatch({ type: "APPLY_PROMO", payload: promo }), []);
  const removePromo = useCallback(() => dispatch({ type: "REMOVE_PROMO" }), []);

  const totalItems = state.items.reduce((sum, i) => sum + i.quantity, 0);
  const subtotal = state.items.reduce((sum, i) => sum + i.linePrice, 0);

  const discountAmount = state.appliedPromo
    ? state.appliedPromo.discountType === "percent"
      ? Math.round(subtotal * state.appliedPromo.discountValue) / 100
      : Math.min(state.appliedPromo.discountValue / 100, subtotal)
    : 0;

  return (
    <CartContext.Provider value={{ state, addItem, removeItem, updateQty, clearCart, openCart, closeCart, applyPromo, removePromo, totalItems, subtotal, discountAmount, volumeDiscounts }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
