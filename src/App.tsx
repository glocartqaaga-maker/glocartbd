import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  collection, 
  onSnapshot, 
  query, 
  where, 
  orderBy 
} from 'firebase/firestore';
import { db } from './lib/firebase';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider, useCart } from './context/CartContext';
import { seedInitialDataIfNeeded } from './lib/seed';
import { Header } from './components/Header';
import { HeroSlider } from './components/HeroSlider';
import { ProductCard } from './components/ProductCard';
import { ProductModal } from './components/ProductModal';
import { CartDrawer } from './components/CartDrawer';
import { AuthModal } from './components/AuthModal';
import { CheckoutModal } from './components/CheckoutModal';
import { OrderSuccessModal } from './components/OrderSuccessModal';
import { OrderTrackingModal } from './components/OrderTrackingModal';
import { CustomerProfile } from './components/CustomerProfile';
import { AdminPortal } from './components/admin/AdminPortal';
import { Footer } from './components/Footer';
import { Product, Category } from './types';
import { 
  Sparkles, 
  Layers, 
  ShoppingBag, 
  Search, 
  X, 
  Filter, 
  Loader2, 
  CheckCircle2, 
  SlidersHorizontal,
  Flame,
  Truck
} from 'lucide-react';

function StorefrontApp() {
  const { currentUser, userProfile, isAdmin } = useAuth();
  const { cartItems, storeSettings, appliedCoupon, discount } = useCart();

  // Store data states
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [priceSort, setPriceSort] = useState<'default' | 'low-high' | 'high-low'>('default');

  // Modals state
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authDefaultTab, setAuthDefaultTab] = useState<'login' | 'register' | 'forgot' | 'admin'>('login');
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isOrderSuccessOpen, setIsOrderSuccessOpen] = useState(false);
  const [successOrderInfo, setSuccessOrderInfo] = useState<{ orderId: string; orderNumber: string } | null>(null);
  const [isTrackingOpen, setIsTrackingOpen] = useState(false);
  const [trackingOrderNumber, setTrackingOrderNumber] = useState('');
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isAdminView, setIsAdminView] = useState(false);

  const productSectionRef = useRef<HTMLDivElement>(null);

  // Initial Seed & Real-time Listeners
  useEffect(() => {
    // Check & seed database if initial startup
    seedInitialDataIfNeeded();

    // Listen to active products in real-time
    const unsubProducts = onSnapshot(collection(db, 'products'), (snapshot) => {
      const list: Product[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() } as Product);
      });
      // Sort in memory
      list.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
      setProducts(list);
      setLoading(false);
    }, (err) => {
      console.warn('Products snapshot error:', err);
      setLoading(false);
    });

    // Listen to categories in real-time
    const unsubCategories = onSnapshot(collection(db, 'categories'), (snapshot) => {
      const list: Category[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() } as Category);
      });
      list.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
      setCategories(list);
    });

    return () => {
      unsubProducts();
      unsubCategories();
    };
  }, []);

  // Filter & Search Logic
  const filteredProducts = useMemo(() => {
    let result = products.filter((p) => p.active !== false);

    if (selectedCategory !== 'all') {
      result = result.filter((p) => p.categoryId === selectedCategory);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.categoryName?.toLowerCase().includes(q) ||
          p.description?.toLowerCase().includes(q)
      );
    }

    if (priceSort === 'low-high') {
      result = [...result].sort((a, b) => a.price - b.price);
    } else if (priceSort === 'high-low') {
      result = [...result].sort((a, b) => b.price - a.price);
    }

    return result;
  }, [products, selectedCategory, searchQuery, priceSort]);

  const scrollToProducts = () => {
    productSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleOpenTrackingModal = (orderNumber = '') => {
    setTrackingOrderNumber(orderNumber);
    setIsTrackingOpen(true);
  };

  const handleOrderSuccess = (orderInfo: { orderId: string; orderNumber: string }) => {
    setSuccessOrderInfo(orderInfo);
    setIsOrderSuccessOpen(true);
  };

  const handleRequireLogin = () => {
    setIsCheckoutOpen(false);
    setAuthDefaultTab('login');
    setIsAuthOpen(true);
  };

  // If Admin View is active, render full Admin Portal
  if (isAdminView) {
    return <AdminPortal onExitAdmin={() => setIsAdminView(false)} />;
  }

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 flex flex-col font-sans selection:bg-amber-400 selection:text-stone-950">
      {/* Top Header */}
      <Header
        categories={categories}
        selectedCategory={selectedCategory}
        onSelectCategory={(catId) => {
          setSelectedCategory(catId);
          scrollToProducts();
        }}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onOpenCart={() => setIsCartOpen(true)}
        onOpenAuth={(tab = 'login') => {
          setAuthDefaultTab(tab);
          setIsAuthOpen(true);
        }}
        onOpenProfile={() => setIsProfileOpen(true)}
        onOpenAdmin={() => setIsAdminView(true)}
        onToggleAdmin={() => setIsAdminView(!isAdminView)}
        isAdminView={isAdminView}
        onOpenTracking={() => handleOpenTrackingModal()}
      />

      {/* Main Storefront Body */}
      <main className="flex-1">
        {/* Promotional Hero Slider */}
        <HeroSlider onShopNowClick={scrollToProducts} />

        {/* Categories Bar */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
          <div className="flex items-center justify-between mb-3.5">
            <h3 className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-stone-900 flex items-center gap-2">
              <Layers className="w-4 h-4 text-amber-600" />
              Featured Categories
            </h3>
            {selectedCategory !== 'all' && (
              <button
                onClick={() => setSelectedCategory('all')}
                className="text-xs text-amber-600 hover:text-amber-700 font-bold flex items-center gap-1"
              >
                <span>Reset Category</span>
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2.5 overflow-x-auto pb-2 scrollbar-none">
            <button
              id="cat-pill-all"
              onClick={() => setSelectedCategory('all')}
              className={`px-4 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 shrink-0 ${
                selectedCategory === 'all'
                  ? 'bg-amber-500 text-stone-950 shadow-md shadow-amber-500/20'
                  : 'bg-white text-stone-700 hover:bg-stone-100 border border-stone-200/80'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>All Products ({products.length})</span>
            </button>

            {categories
              .filter((c) => c.active !== false)
              .map((cat) => {
                const isSelected = selectedCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    id={`cat-pill-${cat.id}`}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-4 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 shrink-0 ${
                      isSelected
                        ? 'bg-amber-500 text-stone-950 shadow-md shadow-amber-500/20'
                        : 'bg-white text-stone-700 hover:bg-stone-100 border border-stone-200/80'
                    }`}
                  >
                    {cat.image && (
                      <img
                        src={cat.image}
                        alt=""
                        referrerPolicy="no-referrer"
                        className="w-4 h-4 rounded-full object-cover"
                      />
                    )}
                    <span>{cat.name}</span>
                  </button>
                );
              })}
          </div>
        </section>

        {/* Products Grid Section */}
        <section ref={productSectionRef} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 sm:mt-10">
          {/* Section Header & Filters */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-stone-200">
            <div>
              <h2 className="text-lg sm:text-2xl font-black text-stone-950 tracking-tight flex items-center gap-2">
                <Flame className="w-5 h-5 text-amber-500" />
                {selectedCategory === 'all'
                  ? 'Explore Trending Collection'
                  : categories.find((c) => c.id === selectedCategory)?.name || 'Catalog'}
              </h2>
              <p className="text-xs text-stone-500">
                {filteredProducts.length} product(s) available for immediate delivery
              </p>
            </div>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <span className="text-xs text-stone-500 font-semibold flex items-center gap-1">
                <SlidersHorizontal className="w-3.5 h-3.5" /> Sort:
              </span>
              <select
                value={priceSort}
                onChange={(e) => setPriceSort(e.target.value as any)}
                className="px-3 py-1.5 bg-white border border-stone-300 rounded-xl text-xs text-stone-800 font-semibold focus:outline-hidden focus:border-amber-500 shadow-2xs"
              >
                <option value="default">Featured / Newest</option>
                <option value="low-high">Price: Low to High</option>
                <option value="high-low">Price: High to Low</option>
              </select>
            </div>
          </div>

          {/* Product Cards Grid: Exactly 2 per row on mobile as required */}
          {loading ? (
            <div className="py-24 flex flex-col items-center justify-center text-stone-400 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
              <p className="text-xs font-semibold">Loading authentic products from GloCart BD...</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="py-20 text-center text-stone-400 space-y-3">
              <ShoppingBag className="w-12 h-12 mx-auto text-stone-300" />
              <h3 className="text-base font-bold text-stone-800">No products found</h3>
              <p className="text-xs text-stone-500 max-w-sm mx-auto">
                No items match your search "{searchQuery}" or selected category filter.
              </p>
              <button
                onClick={() => {
                  setSelectedCategory('all');
                  setSearchQuery('');
                }}
                className="px-4 py-2 bg-amber-500 text-stone-950 font-bold rounded-xl text-xs hover:bg-amber-600 transition-colors"
              >
                View All Products
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4 mt-6">
              {filteredProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onSelectProduct={(p) => setSelectedProduct(p)}
                />
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Footer */}
      <Footer
        onOpenTracking={() => handleOpenTrackingModal()}
        onSelectCategory={(catId) => {
          setSelectedCategory(catId);
          scrollToProducts();
        }}
        onOpenAdmin={() => {
          if (isAdmin) {
            setIsAdminView(true);
          } else {
            setAuthDefaultTab('admin');
            setIsAuthOpen(true);
          }
        }}
      />

      {/* MODALS */}
      {/* Product Details Modal / Bottom Sheet */}
      <ProductModal
        product={selectedProduct}
        isOpen={!!selectedProduct}
        onClose={() => setSelectedProduct(null)}
        onInstantBuy={() => {
          setSelectedProduct(null);
          setIsCheckoutOpen(true);
        }}
        onCheckoutNow={() => {
          setSelectedProduct(null);
          setIsCheckoutOpen(true);
        }}
      />

      {/* Cart Drawer */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        onProceedToCheckout={() => {
          setIsCartOpen(false);
          setIsCheckoutOpen(true);
        }}
      />

      {/* Authentication Modal */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        initialTab={authDefaultTab}
        onOpenAdmin={() => setIsAdminView(true)}
      />

      {/* Checkout Modal */}
      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        onOrderSuccess={handleOrderSuccess}
        onRequireLogin={handleRequireLogin}
      />

      {/* Order Success Celebration Modal */}
      <OrderSuccessModal
        isOpen={isOrderSuccessOpen}
        onClose={() => setIsOrderSuccessOpen(false)}
        orderInfo={successOrderInfo}
        onOpenTracking={(orderNumber) => handleOpenTrackingModal(orderNumber)}
      />

      {/* Order Tracking Modal */}
      <OrderTrackingModal
        isOpen={isTrackingOpen}
        onClose={() => setIsTrackingOpen(false)}
        initialOrderNumber={trackingOrderNumber}
      />

      {/* Customer Profile & History Modal */}
      <CustomerProfile
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        onTrackSpecificOrder={(orderNumber) => handleOpenTrackingModal(orderNumber)}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <StorefrontApp />
      </CartProvider>
    </AuthProvider>
  );
}
