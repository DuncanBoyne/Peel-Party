"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { X, Trash2, Plus, Minus, ShoppingBag, Tag } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { formatPrice } from "@/lib/utils";
import Button from "@/components/ui/Button";

export default function CartDrawer() {
  const { state, closeCart, removeItem, updateQty, subtotal, totalItems, discountAmount, applyPromo, removePromo } = useCart();
  const overlayRef = useRef<HTMLDivElement>(null);

  const [promoInput, setPromoInput] = useState("");
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoError, setPromoError] = useState("");

  useEffect(() => {
    if (state.isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [state.isOpen]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") closeCart();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [closeCart]);

  async function handleApplyPromo(e: React.FormEvent) {
    e.preventDefault();
    if (!promoInput.trim()) return;
    setPromoLoading(true);
    setPromoError("");
    try {
      const res = await fetch("/api/promo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: promoInput.trim(), subtotalPence: Math.round(subtotal * 100) }),
      });
      const data = await res.json();
      if (data.valid) {
        applyPromo({ code: data.code, discountType: data.discountType, discountValue: data.discountValue, description: data.description });
        setPromoInput("");
      } else {
        setPromoError(data.error ?? "Invalid code.");
      }
    } catch {
      setPromoError("Could not check code. Please try again.");
    } finally {
      setPromoLoading(false);
    }
  }

  function handleRemovePromo() {
    removePromo();
    setPromoError("");
  }

  if (!state.isOpen) return null;

  const discountedSubtotal = subtotal - discountAmount;

  return (
    <>
      {/* Overlay */}
      <div
        ref={overlayRef}
        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
        onClick={closeCart}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        className="fixed top-0 right-0 z-50 h-full w-full max-w-md bg-white shadow-2xl flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-label="Shopping cart"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#e5e1d8]">
          <div className="flex items-center gap-2">
            <ShoppingBag size={20} className="text-[#ef8733]" />
            <h2 className="font-display font-700 text-[#111111] text-lg">
              Your Cart
              {totalItems > 0 && (
                <span className="ml-2 text-sm font-semibold text-[#6b7280]">({totalItems})</span>
              )}
            </h2>
          </div>
          <button
            onClick={closeCart}
            className="w-9 h-9 rounded-full hover:bg-[#f0ede8] flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Close cart"
          >
            <X size={18} />
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {state.items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
              <div className="w-20 h-20 bg-[#f9f7f4] rounded-full flex items-center justify-center">
                <ShoppingBag size={32} className="text-[#d1c8bc]" />
              </div>
              <div>
                <p className="font-display font-700 text-[#111111] text-lg">Your cart is empty</p>
                <p className="text-sm text-[#6b7280] mt-1">Add something to get started.</p>
              </div>
              <Button onClick={closeCart} variant="outline" size="sm">
                Continue Shopping
              </Button>
            </div>
          ) : (
            <ul className="flex flex-col gap-4">
              {state.items.map((item) => (
                <li key={item.id} className="flex gap-4 py-4 border-b border-[#f0ede8] last:border-0">
                  <div className="w-16 h-16 bg-[#f9f7f4] rounded-xl flex items-center justify-center shrink-0">
                    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                      <rect width="28" height="28" rx="4" fill="#e5e1d8"/>
                      <circle cx="10" cy="10" r="3" fill="#d1c8bc"/>
                      <path d="M6 20L10 15L14 18L18 14L22 20H6Z" fill="#d1c8bc"/>
                    </svg>
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#111111] truncate">{item.product.name}</p>
                    {Object.entries(item.selectedOptions).map(([k, v]) => (
                      <p key={k} className="text-xs text-[#6b7280]">{k}: {v}</p>
                    ))}
                    {item.customText && (
                      <p className="text-xs text-[#6b7280] truncate">Text: &ldquo;{item.customText}&rdquo;</p>
                    )}
                    {(item.artworks?.length || item.artworkUrl) && (
                      <p className="text-xs text-[#ef8733]">
                        {(item.artworks?.length ?? 0) > 1 ? `${item.artworks!.length} designs attached` : "Artwork attached"} ✓
                      </p>
                    )}

                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateQty(item.id, Math.max(1, item.quantity - 1))}
                          className="w-6 h-6 rounded-full border border-[#e5e1d8] flex items-center justify-center hover:border-[#ef8733] transition-colors cursor-pointer"
                          aria-label="Decrease quantity"
                        >
                          <Minus size={12} />
                        </button>
                        <span className="text-sm font-semibold w-6 text-center">{item.quantity}</span>
                        <button
                          onClick={() => updateQty(item.id, item.quantity + 1)}
                          className="w-6 h-6 rounded-full border border-[#e5e1d8] flex items-center justify-center hover:border-[#ef8733] transition-colors cursor-pointer"
                          aria-label="Increase quantity"
                        >
                          <Plus size={12} />
                        </button>
                      </div>
                      <p className="text-sm font-bold text-[#111111]">
                        {formatPrice(item.linePrice)}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => removeItem(item.id)}
                    className="text-[#d1c8bc] hover:text-red-500 transition-colors cursor-pointer self-start mt-1"
                    aria-label="Remove item"
                  >
                    <Trash2 size={16} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer */}
        {state.items.length > 0 && (
          <div className="border-t border-[#e5e1d8] px-6 pt-4 pb-5 flex flex-col gap-3">
            {/* Promo code */}
            {state.appliedPromo ? (
              <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <Tag size={14} className="text-emerald-600 shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-emerald-700">{state.appliedPromo.code} applied</p>
                    <p className="text-xs text-emerald-600">{state.appliedPromo.description}</p>
                  </div>
                </div>
                <button
                  onClick={handleRemovePromo}
                  className="text-emerald-600 hover:text-emerald-800 text-xs font-medium cursor-pointer ml-2 shrink-0"
                >
                  Remove
                </button>
              </div>
            ) : (
              <div>
                <form onSubmit={handleApplyPromo} className="flex gap-2">
                  <input
                    type="text"
                    value={promoInput}
                    onChange={(e) => { setPromoInput(e.target.value.toUpperCase()); setPromoError(""); }}
                    placeholder="Promo code"
                    className="flex-1 h-9 px-3 rounded-xl border-2 border-[#e5e1d8] text-sm focus:outline-none focus:border-[#ef8733] transition-colors uppercase placeholder:normal-case"
                  />
                  <button
                    type="submit"
                    disabled={promoLoading || !promoInput.trim()}
                    className="h-9 px-3 bg-[#111111] text-white rounded-xl text-sm font-semibold hover:bg-[#333] transition-colors disabled:opacity-40 cursor-pointer shrink-0"
                  >
                    {promoLoading ? "…" : "Apply"}
                  </button>
                </form>
                {promoError && <p className="text-xs text-red-500 mt-1.5">{promoError}</p>}
              </div>
            )}

            {/* Totals */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-sm text-[#6b7280]">
                <span>Subtotal</span>
                <span>{formatPrice(subtotal)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex items-center justify-between text-sm text-emerald-600 font-medium">
                  <span>Discount ({state.appliedPromo?.code})</span>
                  <span>−{formatPrice(discountAmount)}</span>
                </div>
              )}
              <div className="flex items-center justify-between pt-1.5 border-t border-[#e5e1d8]">
                <span className="font-display font-700 text-[#111111]">
                  {discountAmount > 0 ? "After discount" : "Subtotal"}
                </span>
                <span className="font-display font-700 text-xl text-[#111111]">
                  {formatPrice(discountedSubtotal)}
                </span>
              </div>
            </div>

            <p className="text-xs text-[#6b7280] -mt-1">Shipping calculated at checkout.</p>

            <Link href="/checkout" onClick={closeCart}>
              <Button fullWidth size="lg">Checkout</Button>
            </Link>
            <Button variant="ghost" fullWidth onClick={closeCart} className="text-sm">
              Continue Shopping
            </Button>
          </div>
        )}
      </div>
    </>
  );
}
