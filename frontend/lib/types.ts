export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
export const STORE_NAME = process.env.NEXT_PUBLIC_STORE_NAME || "Forma";
export const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "hello@forma.local";

export type ProductImage = {
  id: string;
  url: string;
  alt: string | null;
  sortOrder: number;
};

export type Product = {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: string;
  salePrice: string | null;
  effectivePrice: string;
  stockQuantity: number;
  inStock: boolean;
  status?: "ACTIVE" | "INACTIVE";
  featured: boolean;
  category: string | null;
  sizes: string[];
  specifications: Array<{ label: string; value: string }>;
  meeshoProductId?: string | null;
  pid?: string | null;
  meeshoUrl?: string | null;
  meeshoPrice?: string | null;
  images: ProductImage[];
};

export type Category = { name: string; count: number };

export type Pagination = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type Address = {
  house: string;
  street: string;
  locality: string;
  city: string;
  state: string;
  pincode: string;
  landmark?: string | null;
  country: string;
};

export type PublicOrder = {
  orderNumber: string;
  orderStatus: string;
  paymentStatus: string;
  currency: string;
  subtotal: string;
  shippingAmount: string;
  total: string;
  items: Array<{
    productId: string | null;
    productName: string;
    size?: string | null;
    specifications?: Array<{ label: string; value: string }>;
    quantity: number;
    unitPrice: string;
    lineTotal: string;
    meeshoProductId?: string | null;
    pid?: string | null;
    meeshoUrl?: string | null;
    meeshoPrice?: string | null;
    margin?: string | null;
  }>;
  address: Address;
  createdAt: string;
};

export type PaymentRecord = {
  id: string;
  razorpayOrderId: string;
  razorpayPaymentId: string | null;
  amount: string;
  currency: string;
  method: string | null;
  status: string;
  createdAt: string;
  orderId?: string;
  orderNumber?: string;
};

export type Attribution = {
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmContent: string | null;
  utmTerm: string | null;
  fbclid: string | null;
  eventId: string | null;
  landingPath: string | null;
  capturedAt: string;
};

export type AdminOrder = PublicOrder & {
  id: string;
  meeshoOrderId: string | null;
  meeshoPlacedAt: string | null;
  customer: { id: string; name: string; email: string; phone: string };
  payments: PaymentRecord[];
  attribution: Attribution | null;
  customerEmailSentAt: string | null;
  ownerEmailSentAt: string | null;
  updatedAt: string;
};

export type Customer = {
  id: string;
  name: string;
  email: string;
  phone: string;
  orders: number;
  createdAt: string;
};

export type CustomerDetail = {
  id: string;
  name: string;
  email: string;
  phone: string;
  createdAt: string;
  orders: Array<{
    id: string;
    orderNumber: string;
    orderStatus: string;
    paymentStatus: string;
    total: string;
    createdAt: string;
    items: Array<{ productName: string; size?: string | null; quantity: number; lineTotal: string }>;
  }>;
};

export type Dashboard = {
  totalOrders: number;
  revenue: string;
  paidOrders: number;
  pendingOrders: number;
  products: number;
};

export type Analytics = {
  from: string;
  to: string;
  paidOrders: number;
  revenue: string;
  revenueByDay: Array<{ date: string; orders: number; revenue: string }>;
  campaigns: Array<{ source: string; medium: string | null; campaign: string; orders: number; revenue: string }>;
  topProducts: Array<{ name: string; quantity: number; revenue: string }>;
  ordersByStatus: Array<{ status: string; count: number }>;
};

export type Settings = {
  storeName: string;
  supportEmail: string;
  currency: string;
  shippingFee: string;
  freeShippingThreshold: string;
  states: string[];
};

export type ApiErrorBody = {
  error?: { code?: string; message?: string; details?: Array<{ path: string; message: string }> };
};
