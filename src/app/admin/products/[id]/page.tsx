import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getProducts, getCostSettings, getSettings } from "@/lib/server-data";
import ProductForm from "../ProductForm";

export const dynamic = "force-dynamic";

interface Props { params: Promise<{ id: string }> }

export default async function EditProductPage({ params }: Props) {
  const { id } = await params;
  const [products, costSettings, settings] = await Promise.all([getProducts(), getCostSettings(), getSettings()]);
  const product = products.find((p) => p.id === id);
  if (!product) notFound();

  return (
    <div>
      <Link href="/admin/products" className="inline-flex items-center gap-2 text-sm text-[#6b7280] hover:text-[#111111] transition-colors mb-6">
        <ArrowLeft size={14} /> Back to Products
      </Link>
      <div className="mb-8">
        <h1 className="font-display font-800 text-3xl text-[#111111]">Edit Product</h1>
        <p className="text-[#6b7280] mt-1">{product.name}</p>
      </div>
      <ProductForm
        product={product}
        standardSizes={costSettings.standardSizes}
        standardColours={costSettings.standardColours}
        standardPlacements={costSettings.standardPlacements}
        sheetWidthCm={costSettings.sheetWidthCm}
        sheetHeightCm={costSettings.sheetHeightCm}
        maxOrderQty={costSettings.maxOrderQty}
        materials={costSettings.materials}
        defaultProfitPercent={costSettings.targetProfitPercent}
        seasons={settings.seasons}
      />
    </div>
  );
}
