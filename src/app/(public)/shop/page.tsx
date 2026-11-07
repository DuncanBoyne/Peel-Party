export const dynamic = "force-dynamic";

import { Metadata } from "next";
import Link from "next/link";
import { getProducts } from "@/lib/server-data";
import ProductCard from "@/components/ui/ProductCard";

interface PageProps {
  searchParams: Promise<{ season?: string | string[] }>;
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const { season } = await searchParams;
  if (typeof season === "string" && season) {
    return { title: `${season} Collection`, description: `Personalised ${season} stickers, gifts and party decor. Made with love in the UK.` };
  }
  return {
    title: "Shop All Products",
    description: "Browse our full range of personalised stickers, mugs, keyrings, sweet bags and party decor. Made with love in the UK.",
  };
}

const categories = [
  { label: "All", value: "all" },
  { label: "Stickers", value: "stickers" },
  { label: "Vinyl", value: "vinyl" },
  { label: "Mugs", value: "mugs" },
  { label: "Keyrings", value: "keyrings" },
  { label: "Coasters", value: "coasters" },
  { label: "Magnets", value: "magnets" },
  { label: "T-Shirts", value: "tshirts" },
  { label: "Hoodies", value: "hoodies" },
  { label: "Polo Shirts", value: "polos" },
  { label: "Hats", value: "hats" },
  { label: "Bookmarks", value: "bookmarks" },
  { label: "Personalised Glasses", value: "personalised-glasses" },
  { label: "Bows", value: "bows" },
  { label: "Cake Toppers", value: "cake-toppers" },
  { label: "Party Favours", value: "party-favours" },
];

export default async function ShopPage({ searchParams }: PageProps) {
  const { season: seasonParam } = await searchParams;
  const season = typeof seasonParam === "string" ? seasonParam : "";
  const allProducts = await getProducts();
  const products = season ? allProducts.filter((p) => p.season === season) : allProducts;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
      <div className="mb-10">
        <p className="text-[#ef8733] text-sm font-semibold uppercase tracking-wider mb-1">{season ? "Seasonal" : "Our Products"}</p>
        <h1 className="font-display font-800 text-4xl sm:text-5xl text-[#111111] mb-3">{season ? season : "Shop Everything"}</h1>
        <p className="text-[#6b7280] text-lg max-w-xl">
          {season
            ? `Personalised ${season} favourites. Buy instantly or request a tailored quote.`
            : "Custom-printed merchandise for any occasion. Buy instantly or request a tailored quote."}
        </p>
      </div>

      <div className="flex flex-wrap gap-2 mb-10">
        {categories.map((cat) => (
          <Link
            key={cat.value}
            href={cat.value === "all" ? "/shop" : `/shop/${cat.value}`}
            className="px-4 py-2 rounded-full border border-[#e5e1d8] text-sm font-medium hover:border-[#ef8733] hover:text-[#ef8733] transition-colors"
          >
            {cat.label}
          </Link>
        ))}
      </div>

      {products.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-[#6b7280]">No {season} products yet. <Link href="/shop" className="text-[#ef8733] hover:underline">See everything</Link></p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}

      <div className="mt-16 p-8 bg-[#f9f7f4] rounded-2xl border border-[#e5e1d8] text-center">
        <h2 className="font-display font-700 text-2xl text-[#111111] mb-2">Can&apos;t find what you need?</h2>
        <p className="text-[#6b7280] mb-4">We do fully custom work. Tell us what you&apos;re after and we&apos;ll quote you.</p>
        <Link
          href="/custom-order"
          className="inline-flex items-center h-11 px-6 bg-[#ef8733] text-white rounded-full text-sm font-semibold hover:bg-[#ea7316] transition-colors"
        >
          Request a Custom Quote
        </Link>
      </div>
    </div>
  );
}
