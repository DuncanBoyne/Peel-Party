import { NextResponse } from "next/server";
import { getSettings, getProducts } from "@/lib/server-data";

export async function GET() {
  const [settings, products] = await Promise.all([getSettings(), getProducts()]);
  return NextResponse.json({
    sections: settings.shopNavSections,
    // Only seasons with at least one product, so the menu never links to an empty page
    seasons: settings.seasons.filter((s) => products.some((p) => p.season === s)),
  });
}
