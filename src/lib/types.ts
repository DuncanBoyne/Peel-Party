export type Category = "stickers" | "vinyl" | "mugs" | "keyrings" | "coasters" | "magnets" | "tshirts" | "hoodies" | "polos" | "hats" | "bookmarks" | "personalised-glasses" | "bows" | "cake-toppers" | "party-favours";

export type ProductType = "sticker" | "sticker-sheet" | "cup" | "tshirt" | "other";

export interface ProductCostConfig {
  productType: ProductType;
  materialIds?: string[];
  widthCm?: number;
  heightCm?: number;
  itemsPerSheet?: number; // for sublimation products: how many items fit on one sheet
  batchSize: number;
  batchMinutes: number;
  inkCostPence?: number;
  postagePence?: number;
  profitPercent?: number; // overrides global targetProfitPercent when set
  maxOrderQty?: number;   // overrides global maxOrderQty when set; undefined = no cap beyond global
}

export interface PriceTier {
  qty: number;
  totalPence: number;
  unitPence: number;
}

export interface SizeVariant {
  name: string;
  widthCm: number;
  heightCm: number;
  stickersPerSheet: number;
  perSheetOverride?: number; // typed by admin (e.g. what Cricut really fits); Sync Sizes keeps it
}

export type OrderType = "buy-now" | "request-quote";

export interface ProductOption {
  name: string;
  values: string[];
  priceMap?: Record<string, number>; // value → absolute price in pence (overrides product.price when set)
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  category: Category;
  price: number; // pence
  originalPrice?: number;
  description: string;
  longDescription: string;
  images: string[];
  options: ProductOption[];
  supportsTextInput: boolean;
  supportsFileUpload: boolean;
  orderType: OrderType;
  badge?: string;
  season?: string; // one of SiteSettings.seasons, "" = not seasonal
  featured?: boolean;
  inStock: boolean;
  reviewCount: number;
  rating: number;
  sizeVariants?: SizeVariant[];
  costConfig?: ProductCostConfig;
  priceMatrix?: { [sizeName: string]: PriceTier[] };
}

export interface ArtworkFile {
  placement: string; // e.g. "Front", "Back", "Artwork"
  url: string;
}

export interface OrderItem {
  name: string;
  unitAmountPence: number;
  quantity: number;
  selectedOptions?: Record<string, string>;
  customText?: string;
  artworkUrl?: string;  // legacy single-file orders
  artworks?: ArtworkFile[];
}

export type OrderStatus = "paid" | "processing" | "dispatched";

export interface Order {
  id: string;           // Stripe checkout session ID
  createdAt: string;    // ISO timestamp
  status: OrderStatus;
  customer: {
    email: string;
    firstName: string;
    lastName: string;
    phone: string;
    address1: string;
    address2: string;
    city: string;
    postcode: string;
  };
  items: OrderItem[];
  subtotalPence: number;
  postagePence: number;
  totalPence: number;
}

export interface CartItem {
  id: string;
  product: Product;
  quantity: number;
  linePrice: number; // total for this line as shown at time of adding
  selectedOptions: Record<string, string>;
  customText?: string;
  artworkUrl?: string;  // legacy
  artworks?: ArtworkFile[];
}

export interface PromoCode {
  id: string;
  code: string;
  discountType: "percent" | "fixed";
  discountValue: number; // percent: 0–100, fixed: pence
  active: boolean;
  expiresAt?: string;      // ISO date string
  usageLimit?: number;     // undefined = unlimited
  usageCount: number;
  minOrderPence?: number;  // undefined = no minimum
}

export interface AppliedPromo {
  code: string;
  discountType: "percent" | "fixed";
  discountValue: number;
  description: string;
}

export interface CartState {
  items: CartItem[];
  isOpen: boolean;
  appliedPromo: AppliedPromo | null;
}

export interface VolumeDiscountTier {
  minQty: number;
  discountPercent: number;
}

export interface PostageSettings {
  flatRate: number;       // pounds, e.g. 3.95
  freeThreshold: number;  // pounds, e.g. 50.00 (0 = disabled)
}

export interface QuoteFormData {
  productSlug: string;
  quantity: number;
  selectedOptions: Record<string, string>;
  customText: string;
  artworkFile: File | null;
  name: string;
  email: string;
  company?: string;
  notes: string;
}
