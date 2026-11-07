"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { Menu, X, ShoppingCart, Search, ChevronDown } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { defaultShopNavSections } from "@/lib/shop-nav";
import type { ShopNavSection } from "@/lib/shop-nav";
import { cn } from "@/lib/utils";

const topNav = [
  { label: "Our Work", href: "/gallery" },
  { label: "Custom Order", href: "/custom-order" },
  { label: "About", href: "/about" },
];

export default function Header() {
  const { totalItems, openCart } = useCart();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [shopOpen, setShopOpen] = useState(false);
  const [shopNavSections, setShopNavSections] = useState<ShopNavSection[]>(defaultShopNavSections);
  const [seasons, setSeasons] = useState<string[]>([]);
  const [seasonOpen, setSeasonOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const shopRef = useRef<HTMLDivElement>(null);
  const seasonRef = useRef<HTMLDivElement>(null);
  const seasonLinks = seasons.map((s) => ({ id: s, label: s, href: `/shop?season=${encodeURIComponent(s)}` }));

  useEffect(() => {
    function onScroll() { setScrolled(window.scrollY > 10); }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadShopNav() {
      try {
        const res = await fetch("/api/shop-nav");
        if (!res.ok) return;
        const data = (await res.json()) as { sections?: ShopNavSection[]; seasons?: string[] };
        if (cancelled) return;
        if (data.sections?.length) setShopNavSections(data.sections);
        setSeasons(data.seasons ?? []);
      } catch {
        // Keep the built-in menu if settings cannot be loaded.
      }
    }

    loadShopNav();
    return () => { cancelled = true; };
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (shopRef.current && !shopRef.current.contains(e.target as Node)) {
        setShopOpen(false);
      }
      if (seasonRef.current && !seasonRef.current.contains(e.target as Node)) {
        setSeasonOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  return (
    <>
      <header
        className={cn(
          "fixed top-0 left-0 right-0 z-40 transition-all duration-300",
          scrolled
            ? "bg-white/95 backdrop-blur-sm shadow-sm border-b border-[#e5e1d8]"
            : "bg-white border-b border-[#e5e1d8]"
        )}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center h-20 gap-4">
          {/* Logo */}
          <Link href="/" className="flex items-center shrink-0">
            <Image src="/logo.png" alt="Peel & Party Co." width={160} height={160} className="h-14 w-auto max-w-[140px]" priority />
          </Link>

          {/* Desktop nav */}
          <nav className="hidden xl:flex items-center gap-1 flex-1">
            {/* Shop dropdown */}
            <div ref={shopRef} className="relative">
              <button
                onClick={() => setShopOpen((v) => !v)}
                className={cn(
                  "flex items-center gap-1 px-3 py-2 text-sm font-medium rounded-lg transition-colors cursor-pointer",
                  shopOpen ? "bg-[#f0ede8] text-[#ef8733]" : "text-[#111111] hover:bg-[#f0ede8] hover:text-[#ef8733]"
                )}
              >
                Shop
                <ChevronDown size={14} className={cn("transition-transform duration-200", shopOpen && "rotate-180")} />
              </button>

              {shopOpen && (
                <div className="absolute top-full left-0 mt-1 w-60 bg-white rounded-xl border border-[#e5e1d8] shadow-lg py-1 z-50">
                  <Link href="/shop" onClick={() => setShopOpen(false)}
                    className="block px-4 py-1.5 text-sm text-[#111111] hover:bg-[#f0ede8] hover:text-[#ef8733] transition-colors">
                    All Products
                  </Link>
                  {shopNavSections.map((section) => (
                    <div key={section.id}>
                      <p className="px-4 pt-3 pb-0.5 text-[10px] font-bold uppercase tracking-widest text-[#9ca3af]">
                        {section.title}
                      </p>
                      {section.links.map((link) => (
                        <Link key={link.id} href={link.href} onClick={() => setShopOpen(false)}
                        className="block px-4 py-1.5 text-sm text-[#111111] hover:bg-[#f0ede8] hover:text-[#ef8733] transition-colors">
                          {link.label}
                        </Link>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Seasonal dropdown — seasons are managed in Admin → Settings */}
            {seasonLinks.length > 0 && (
              <div ref={seasonRef} className="relative">
                <button
                  onClick={() => setSeasonOpen((v) => !v)}
                  className={cn(
                    "flex items-center gap-1 px-3 py-2 text-sm font-medium rounded-lg transition-colors cursor-pointer",
                    seasonOpen ? "bg-[#f0ede8] text-[#ef8733]" : "text-[#111111] hover:bg-[#f0ede8] hover:text-[#ef8733]"
                  )}
                >
                  Seasonal
                  <ChevronDown size={14} className={cn("transition-transform duration-200", seasonOpen && "rotate-180")} />
                </button>

                {seasonOpen && (
                  <div className="absolute top-full left-0 mt-1 w-48 bg-white rounded-xl border border-[#e5e1d8] shadow-lg py-1 z-50">
                    {seasonLinks.map((link) => (
                      <Link key={link.id} href={link.href} onClick={() => setSeasonOpen(false)}
                        className="block px-4 py-1.5 text-sm text-[#111111] hover:bg-[#f0ede8] hover:text-[#ef8733] transition-colors">
                        {link.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}

            {topNav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "px-3 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap",
                  item.label === "Custom Order"
                    ? "text-[#ef8733] font-semibold hover:bg-[#fff7ed]"
                    : "text-[#111111] hover:bg-[#f0ede8] hover:text-[#ef8733]"
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Right actions */}
          <div className="flex items-center gap-2 ml-auto">
            <button
              className="hidden sm:flex items-center justify-center w-10 h-10 rounded-full hover:bg-[#f0ede8] transition-colors cursor-pointer"
              aria-label="Search"
            >
              <Search size={18} className="text-[#111111]" />
            </button>

            <Link
              href="/contact"
              className="hidden md:inline-flex items-center h-9 px-4 text-sm font-semibold border-2 border-[#111111] rounded-full hover:bg-[#111111] hover:text-white transition-colors"
            >
              Contact
            </Link>

            <button
              onClick={openCart}
              className="relative flex items-center justify-center w-10 h-10 rounded-full hover:bg-[#f0ede8] transition-colors cursor-pointer"
              aria-label={`Cart, ${totalItems} items`}
            >
              <ShoppingCart size={18} className="text-[#111111]" />
              {totalItems > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-[#ef8733] text-white text-xs font-bold rounded-full flex items-center justify-center">
                  {totalItems > 9 ? "9+" : totalItems}
                </span>
              )}
            </button>

            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="xl:hidden flex items-center justify-center w-10 h-10 rounded-full hover:bg-[#f0ede8] transition-colors cursor-pointer"
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="xl:hidden border-t border-[#e5e1d8] bg-white px-4 pb-4">
            <nav className="flex flex-col pt-2 gap-1">
              <Link href="/shop" onClick={() => setMobileOpen(false)}
                className="px-3 py-2.5 text-sm font-medium rounded-lg text-[#111111] hover:bg-[#f0ede8] transition-colors block">
                All Products
              </Link>
              {[...shopNavSections, ...(seasonLinks.length ? [{ id: "seasonal", title: "Seasonal", links: seasonLinks }] : [])].map((section) => (
                <div key={section.id}>
                  <p className="px-3 pt-3 pb-0.5 text-[10px] font-bold uppercase tracking-widest text-[#9ca3af]">
                    {section.title}
                  </p>
                  {section.links.map((link) => (
                    <Link key={link.id} href={link.href} onClick={() => setMobileOpen(false)}
                      className="px-3 py-2.5 text-sm font-medium rounded-lg text-[#111111] hover:bg-[#f0ede8] transition-colors block">
                      {link.label}
                    </Link>
                  ))}
                </div>
              ))}
              <div className="my-1 border-t border-[#f0ede8]" />
              {topNav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "px-3 py-2.5 text-sm font-medium rounded-lg transition-colors",
                    item.label === "Custom Order"
                      ? "text-[#ef8733] font-semibold hover:bg-[#fff7ed]"
                      : "text-[#111111] hover:bg-[#f0ede8]"
                  )}
                >
                  {item.label}
                </Link>
              ))}
              <Link
                href="/contact"
                onClick={() => setMobileOpen(false)}
                className="mt-2 flex items-center justify-center h-11 bg-[#111111] text-white rounded-full text-sm font-semibold"
              >
                Contact Us
              </Link>
            </nav>
          </div>
        )}
      </header>
      {/* Spacer for fixed header */}
      <div className="h-20" />
    </>
  );
}
