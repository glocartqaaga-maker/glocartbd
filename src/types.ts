export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  phone: string;
  photoURL?: string;
  district?: string;
  area?: string;
  address?: string;
  role: 'admin' | 'customer';
  status: 'active' | 'suspended';
  orderCount?: number;
  totalSpent?: number;
  lastOrderAt?: any;
  createdAt: any;
  updatedAt?: any;
}

export interface ProductImage {
  url: string;
  storagePath?: string;
  name?: string;
  isPrimary?: boolean;
}

export interface Product {
  id: string;
  name: string;
  categoryId: string;
  categoryName?: string;
  price: number;
  oldPrice?: number;
  stock: number;
  rating?: number;
  reviews?: number;
  badge?: string;
  description: string;
  active: boolean;
  primaryImage: string;
  images: ProductImage[];
  createdAt: any;
  updatedAt?: any;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  image?: string;
  active: boolean;
  sortOrder: number;
  createdAt?: any;
}

export interface SliderBanner {
  id: string;
  title: string;
  subtitle?: string;
  image: string;
  storagePath?: string;
  badge?: string;
  badgeColor?: 'amber' | 'emerald' | 'rose' | 'indigo' | 'purple' | 'blue';
  buttonText?: string;
  buttonTarget?: string;
  buttonLink?: string;
  categorySlug?: string;
  overlayStyle?: 'dark' | 'subtle' | 'vibrant' | 'minimal';
  active: boolean;
  sortOrder: number;
  createdAt?: any;
  updatedAt?: any;
}

export type OrderStatus = 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

export interface OrderItem {
  productId: string;
  name: string;
  price: number;
  oldPrice?: number;
  quantity: number;
  image: string;
}

export interface CourierInfo {
  provider: 'steadfast' | 'manual';
  consignmentId?: string;
  trackingCode?: string;
  status?: string;
  syncedAt?: any;
  notes?: string;
  autoBooked?: boolean;
}

export interface Order {
  id: string;
  orderNumber: string;
  customerId?: string;
  customerName: string;
  phone: string;
  email?: string;
  district: string;
  area: string;
  address: string;
  note?: string;
  items: OrderItem[];
  subtotal: number;
  deliveryCharge: number;
  discount: number;
  grandTotal: number;
  couponCode?: string;
  paymentMethod: 'cod' | 'bkash' | 'nagad';
  paymentStatus: 'unpaid' | 'paid';
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  stockRestored?: boolean;
  courier?: CourierInfo;
  createdAt: any;
  updatedAt?: any;
}

export interface CartItem {
  productId: string;
  name: string;
  price: number;
  oldPrice?: number;
  quantity: number;
  image: string;
  stock: number;
  categoryName?: string;
}

export interface StoreSettings {
  id?: string;
  storeName: string;
  logoUrl?: string;
  logoStoragePath?: string;
  phone: string;
  email: string;
  facebook: string;
  instagram?: string;
  address: string;
  promoBar: string;
  heroText: string;
  heroSubtitle?: string;
  homepageBanner?: string;
  footerDescription: string;
  supportHours: string;
  deliveryChargeDhaka: number;
  deliveryChargeOutside: number;
  freeShippingThreshold: number;
  couponCode: string;
  couponDiscountPercent: number;
  lowStockThreshold: number;
  steadfastApiKey?: string;
  steadfastSecretKey?: string;
  autoBookSteadfast?: boolean;
}
