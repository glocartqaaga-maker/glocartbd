import { collection, getDocs, doc, getDoc, setDoc, writeBatch, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import { Category, Product, SliderBanner, StoreSettings } from '../types';

export const DEFAULT_SETTINGS: StoreSettings = {
  storeName: 'GloCart BD',
  phone: '+880 1711-223344',
  email: 'support@glocartbd.com',
  facebook: 'https://facebook.com/glocartbd',
  instagram: 'https://www.instagram.com/glocart_bd',
  address: 'Level 4, House 28, Road 11, Banani, Dhaka-1213, Bangladesh',
  promoBar: '🎉 Grand Opening Offer! Free Shipping inside Dhaka on orders over ৳1,999 with code GLOCART10',
  heroText: 'Premium Shopping Delivered Across Bangladesh',
  heroSubtitle: 'Authentic electronics, trendy fashion, and lifestyle essentials with fast home delivery & easy returns.',
  homepageBanner: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?auto=format&fit=crop&w=1400&q=80',
  footerDescription: 'GloCart BD is your trusted online shopping destination in Bangladesh. We bring you 100% genuine products with Cash on Delivery, instant bKash/Nagad checkout, and reliable Steadfast courier delivery to every district.',
  supportHours: 'Everyday: 9:00 AM - 10:00 PM',
  deliveryChargeDhaka: 60,
  deliveryChargeOutside: 120,
  freeShippingThreshold: 2000,
  couponCode: 'GLOCART10',
  couponDiscountPercent: 10,
  lowStockThreshold: 5,
  steadfastApiKey: 'emud5zhwfadjuyljkwxvqan2czrqn8si',
  steadfastSecretKey: 'igkruxuikw9ykrbkftr9qgme',
  autoBookSteadfast: true,
};

export const DEFAULT_CATEGORIES: Category[] = [
  {
    id: 'cat-smartphones',
    name: 'Smartphones & Gadgets',
    slug: 'smartphones-gadgets',
    image: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=600&q=80',
    active: true,
    sortOrder: 1,
  },
  {
    id: 'cat-fashion',
    name: 'Fashion & Apparel',
    slug: 'fashion-apparel',
    image: 'https://images.unsplash.com/photo-1445205170230-053b83016050?auto=format&fit=crop&w=600&q=80',
    active: true,
    sortOrder: 2,
  },
  {
    id: 'cat-audio',
    name: 'Audio & Wearables',
    slug: 'audio-wearables',
    image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=600&q=80',
    active: true,
    sortOrder: 3,
  },
  {
    id: 'cat-beauty',
    name: 'Beauty & Skincare',
    slug: 'beauty-skincare',
    image: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=600&q=80',
    active: true,
    sortOrder: 4,
  },
  {
    id: 'cat-home',
    name: 'Home & Living',
    slug: 'home-living',
    image: 'https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?auto=format&fit=crop&w=600&q=80',
    active: true,
    sortOrder: 5,
  },
  {
    id: 'cat-accessories',
    name: 'Computer & Office',
    slug: 'computer-office',
    image: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=600&q=80',
    active: true,
    sortOrder: 6,
  }
];

export const DEFAULT_SLIDERS: SliderBanner[] = [
  {
    id: 'slide-1',
    title: 'Super Sound Experience',
    subtitle: 'Noise-Cancelling Wireless Headphones with up to 40% Off',
    image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=1600&q=80',
    buttonText: 'Shop Gadgets',
    buttonTarget: 'cat-audio',
    active: true,
    sortOrder: 1,
  },
  {
    id: 'slide-2',
    title: 'Summer Fashion Drop 2026',
    subtitle: 'Breathable linen shirts, premium panjabis and trendsetter fits',
    image: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=1600&q=80',
    buttonText: 'Explore Styles',
    buttonTarget: 'cat-fashion',
    active: true,
    sortOrder: 2,
  },
  {
    id: 'slide-3',
    title: 'Smart Living & Tech Deals',
    subtitle: 'Next-gen smartwatches, fitness trackers & fast power banks',
    image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=1600&q=80',
    buttonText: 'View Deals',
    buttonTarget: 'cat-smartphones',
    active: true,
    sortOrder: 3,
  }
];

export const DEFAULT_PRODUCTS: Omit<Product, 'createdAt' | 'updatedAt'>[] = [
  {
    id: 'prod-anc-headphones',
    name: 'AcousticPro Wireless ANC Headphones',
    categoryId: 'cat-audio',
    categoryName: 'Audio & Wearables',
    price: 3450,
    oldPrice: 4800,
    stock: 24,
    rating: 4.8,
    reviews: 142,
    badge: 'Best Seller',
    description: 'Experience studio-grade active noise cancellation with 40mm titanium drivers. Up to 45 hours battery life with ultra-low latency gaming mode and plush memory foam ear cushions.',
    active: true,
    primaryImage: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80',
    images: [
      { url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80', name: 'Front View', isPrimary: true },
      { url: 'https://images.unsplash.com/photo-1484704849700-f032a568e944?auto=format&fit=crop&w=800&q=80', name: 'Side Angle', isPrimary: false },
      { url: 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=800&q=80', name: 'Folded View', isPrimary: false },
    ]
  },
  {
    id: 'prod-smartwatch-ultra',
    name: 'ApexFit AMOLED Ultra Smartwatch (BD Edition)',
    categoryId: 'cat-audio',
    categoryName: 'Audio & Wearables',
    price: 2890,
    oldPrice: 3800,
    stock: 18,
    rating: 4.9,
    reviews: 98,
    badge: 'Hot',
    description: '1.96-inch HD AMOLED Always-On Display with Bluetooth Calling, Bangla UI Support, SpO2 & 24/7 Heart Rate monitoring, and IP68 water resistance.',
    active: true,
    primaryImage: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80',
    images: [
      { url: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80', name: 'Main Dial', isPrimary: true },
      { url: 'https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?auto=format&fit=crop&w=800&q=80', name: 'Wrist Shot', isPrimary: false },
      { url: 'https://images.unsplash.com/photo-1579586337278-3befd40fd17a?auto=format&fit=crop&w=800&q=80', name: 'Strap Detail', isPrimary: false },
    ]
  },
  {
    id: 'prod-linen-shirt',
    name: 'Imperial Oxford Casual Linen Shirt',
    categoryId: 'cat-fashion',
    categoryName: 'Fashion & Apparel',
    price: 1250,
    oldPrice: 1650,
    stock: 35,
    rating: 4.7,
    reviews: 64,
    badge: 'New',
    description: '100% pure organic breathable cotton linen blend. Specially treated for tropical Bangladesh climate with anti-wrinkle comfort and structured modern fit collar.',
    active: true,
    primaryImage: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=800&q=80',
    images: [
      { url: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=800&q=80', name: 'Front Profile', isPrimary: true },
      { url: 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?auto=format&fit=crop&w=800&q=80', name: 'Fabric Texture', isPrimary: false },
    ]
  },
  {
    id: 'prod-mechanic-keyboard',
    name: 'KeyCraft RGB Hot-Swappable Mechanical Keyboard',
    categoryId: 'cat-accessories',
    categoryName: 'Computer & Office',
    price: 4150,
    oldPrice: 5200,
    stock: 12,
    rating: 4.9,
    reviews: 87,
    badge: 'Popular',
    description: '75% compact layout with pre-lubed Gateron Yellow switches, sound-dampening foam, South-facing RGB backlighting, and Bluetooth 5.0 + 2.4G + Type-C Tri-Mode connectivity.',
    active: true,
    primaryImage: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=800&q=80',
    images: [
      { url: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=800&q=80', name: 'Top Down', isPrimary: true },
      { url: 'https://images.unsplash.com/photo-1618384887929-16ec33fab9ef?auto=format&fit=crop&w=800&q=80', name: 'RGB Glow', isPrimary: false },
    ]
  },
  {
    id: 'prod-hydra-serum',
    name: 'GlowRevive Hyaluronic Acid & Niacinamide Serum (50ml)',
    categoryId: 'cat-beauty',
    categoryName: 'Beauty & Skincare',
    price: 1390,
    oldPrice: 1950,
    stock: 45,
    rating: 4.8,
    reviews: 112,
    badge: 'Trending',
    description: 'Dermatologist tested moisture lock formula with 2% pure hyaluronic acid, 5% niacinamide, and Centella Asiatica for radiant glass skin and deep barrier repair.',
    active: true,
    primaryImage: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&w=800&q=80',
    images: [
      { url: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&w=800&q=80', name: 'Bottle Front', isPrimary: true },
      { url: 'https://images.unsplash.com/photo-1608248597359-07b469599557?auto=format&fit=crop&w=800&q=80', name: 'Packaging', isPrimary: false },
    ]
  },
  {
    id: 'prod-fast-powerbank',
    name: 'VoltStream 20000mAh 65W PD Fast Power Bank',
    categoryId: 'cat-smartphones',
    categoryName: 'Smartphones & Gadgets',
    price: 2650,
    oldPrice: 3400,
    stock: 22,
    rating: 4.8,
    reviews: 73,
    badge: 'Essential',
    description: 'Ultra-fast laptop & phone charging with dual USB-C Power Delivery, digital LED percentage meter, and aircraft-grade aluminum alloy casing.',
    active: true,
    primaryImage: 'https://images.unsplash.com/photo-1609592424361-9ebfa9bb42bd?auto=format&fit=crop&w=800&q=80',
    images: [
      { url: 'https://images.unsplash.com/photo-1609592424361-9ebfa9bb42bd?auto=format&fit=crop&w=800&q=80', name: 'Device View', isPrimary: true },
      { url: 'https://images.unsplash.com/photo-1585338107529-13afc5f02586?auto=format&fit=crop&w=800&q=80', name: 'Ports Display', isPrimary: false },
    ]
  },
  {
    id: 'prod-coffee-mug',
    name: 'ThermoFlask Double-Wall Vacuum Coffee Tumbler',
    categoryId: 'cat-home',
    categoryName: 'Home & Living',
    price: 850,
    oldPrice: 1200,
    stock: 50,
    rating: 4.6,
    reviews: 51,
    badge: 'Sale',
    description: 'Keeps drinks steaming hot for 12 hours or icy cold for 24 hours. Leakproof 360-degree flip lid with food-grade 304 stainless steel interior.',
    active: true,
    primaryImage: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=800&q=80',
    images: [
      { url: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=800&q=80', name: 'Tumbler', isPrimary: true },
      { url: 'https://images.unsplash.com/photo-1577937927133-66ef06acdf18?auto=format&fit=crop&w=800&q=80', name: 'Lid Detail', isPrimary: false },
    ]
  },
  {
    id: 'prod-canvas-sneakers',
    name: 'UrbanStride Casual Street Sneakers',
    categoryId: 'cat-fashion',
    categoryName: 'Fashion & Apparel',
    price: 1850,
    oldPrice: 2450,
    stock: 15,
    rating: 4.7,
    reviews: 82,
    badge: 'Popular',
    description: 'Lightweight cushioned memory foam insoles with durable rubber traction grip. Stylish minimal silhouette designed for all-day urban comfort.',
    active: true,
    primaryImage: 'https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?auto=format&fit=crop&w=800&q=80',
    images: [
      { url: 'https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?auto=format&fit=crop&w=800&q=80', name: 'Side Pair', isPrimary: true },
      { url: 'https://images.unsplash.com/photo-1560769629-975ec94e6a86?auto=format&fit=crop&w=800&q=80', name: 'Sole Angle', isPrimary: false },
    ]
  }
];

export async function initializeDatabaseIfNeeded() {
  try {
    // If already verified as seeded in this client session, skip entirely
    if (typeof window !== 'undefined' && localStorage.getItem('glocart_db_seeded') === 'true') {
      return;
    }

    const settingsDocRef = doc(db, 'settings', 'store');
    const settingsSnap = await getDoc(settingsDocRef);

    // If store settings already exist in Firestore, the database is live and active.
    // NEVER overwrite or tamper with existing store settings, products, or categories.
    if (settingsSnap.exists()) {
      if (typeof window !== 'undefined') {
        localStorage.setItem('glocart_db_seeded', 'true');
      }
      return;
    }

    // Only if the database is completely fresh and has no store settings:
    const categoriesSnap = await getDocs(collection(db, 'categories'));
    if (categoriesSnap.empty) {
      console.log('Seeding initial categories...');
      const batch = writeBatch(db);
      DEFAULT_CATEGORIES.forEach(cat => {
        batch.set(doc(db, 'categories', cat.id), {
          ...cat,
          createdAt: serverTimestamp()
        });
      });
      await batch.commit();
    }

    const productsSnap = await getDocs(collection(db, 'products'));
    if (productsSnap.empty) {
      console.log('Seeding initial products catalog...');
      const batch = writeBatch(db);
      DEFAULT_PRODUCTS.forEach(prod => {
        batch.set(doc(db, 'products', prod.id), {
          ...prod,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      });
      await batch.commit();
    }

    const slidersSnap = await getDocs(collection(db, 'sliders'));
    if (slidersSnap.empty) {
      console.log('Seeding initial sliders...');
      const batch = writeBatch(db);
      DEFAULT_SLIDERS.forEach(slide => {
        batch.set(doc(db, 'sliders', slide.id), {
          ...slide,
          createdAt: serverTimestamp()
        });
      });
      await batch.commit();
    }

    // Initialize default store settings for fresh database
    console.log('Seeding initial default store settings...');
    await setDoc(settingsDocRef, {
      ...DEFAULT_SETTINGS,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    if (typeof window !== 'undefined') {
      localStorage.setItem('glocart_db_seeded', 'true');
    }

    console.log('Database initialization check completed successfully.');
  } catch (error) {
    console.warn('Database initialization note:', error);
  }
}

export const seedInitialDataIfNeeded = initializeDatabaseIfNeeded;
