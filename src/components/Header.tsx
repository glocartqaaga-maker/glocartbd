import React, { useState } from 'react';
import { 
  ShoppingBag, 
  Search, 
  User as UserIcon, 
  Truck, 
  Menu, 
  X, 
  ShieldCheck, 
  LogOut, 
  PhoneCall, 
  Layers,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { Category } from '../types';
import glocartLogo from '../assets/images/glocart_drive_logo.png';

interface HeaderProps {
  categories: Category[];
  selectedCategory: string;
  onSelectCategory: (categoryId: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onOpenAuth: (initialTab?: 'login' | 'register' | 'admin') => void;
  onOpenProfile: () => void;
  onOpenTracking: () => void;
  onOpenCart?: () => void;
  onOpenAdmin?: () => void;
  onToggleAdmin?: () => void;
  isAdminView?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  categories,
  selectedCategory,
  onSelectCategory,
  searchQuery,
  onSearchChange,
  onOpenAuth,
  onOpenProfile,
  onOpenTracking,
  onOpenCart,
  onOpenAdmin,
  onToggleAdmin,
  isAdminView = false,
}) => {
  const { currentUser, userProfile, isAdmin, logout } = useAuth();
  const { totalItems, setIsCartOpen, storeSettings } = useCart();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);

  const handleAdminClick = () => {
    if (typeof onToggleAdmin === 'function') {
      onToggleAdmin();
    } else if (typeof onOpenAdmin === 'function') {
      onOpenAdmin();
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-stone-200/80 shadow-xs">
      {/* Top Promotional Bar */}
      {storeSettings.promoBar && (
        <div id="promo-top-bar" className="bg-stone-900 text-stone-100 text-xs py-1.5 px-4 text-center font-medium tracking-wide flex items-center justify-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span className="truncate max-w-3xl">{storeSettings.promoBar}</span>
          <div className="hidden md:flex items-center gap-3 ml-4 text-stone-400 pl-4 border-l border-stone-700">
            <span className="flex items-center gap-1">
              <PhoneCall className="w-3 h-3 text-emerald-400" /> {storeSettings.phone}
            </span>
          </div>
        </div>
      )}

      {/* Main Navbar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20 gap-3 md:gap-6">
          {/* Mobile Menu Button & Brand */}
          <div className="flex items-center gap-3">
            <button
              id="btn-mobile-menu-toggle"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 rounded-lg text-stone-700 hover:bg-stone-100 transition-colors"
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>

            <a
              id="brand-logo"
              href="#"
              onClick={(e) => {
                e.preventDefault();
                onSelectCategory('all');
              }}
              className="flex items-center gap-2.5 group"
            >
              <img
                src={storeSettings.logoUrl || glocartLogo}
                alt={`${storeSettings.storeName || 'GloCart BD'} Logo`}
                referrerPolicy="no-referrer"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  if (target.src !== glocartLogo) {
                    target.src = glocartLogo;
                  } else if (!target.src.endsWith('/logo.png')) {
                    target.src = '/logo.png';
                  }
                }}
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl object-cover shadow-md shadow-amber-500/20 group-hover:scale-105 transition-transform shrink-0"
              />
              <div className="flex flex-col">
                <span className="font-bold text-lg sm:text-xl text-stone-900 tracking-tight leading-none">
                  {storeSettings.storeName ? (
                    storeSettings.storeName
                  ) : (
                    <>GloCart<span className="text-amber-600 ml-0.5">BD</span></>
                  )}
                </span>
                <span className="text-[10px] text-stone-500 font-medium tracking-wider uppercase">
                  Online Store
                </span>
              </div>
            </a>
          </div>

          {/* Search Bar - Desktop & Tablet */}
          <div className="hidden sm:flex flex-1 max-w-lg mx-2">
            <div className="relative w-full">
              <input
                id="header-search-input"
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search genuine electronics, fashion, beauty..."
                className="w-full pl-10 pr-4 py-2 sm:py-2.5 bg-stone-100/80 hover:bg-stone-100 focus:bg-white border border-stone-200 focus:border-amber-500 rounded-full text-sm text-stone-900 placeholder-stone-400 focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 transition-all"
              />
              <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              {searchQuery && (
                <button
                  id="btn-clear-search"
                  onClick={() => onSearchChange('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-stone-400 hover:text-stone-700 bg-stone-200 hover:bg-stone-300 w-5 h-5 rounded-full flex items-center justify-center"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Right Action Icons */}
          <div className="flex items-center gap-1 sm:gap-2">
            {/* Track Order Button */}
            <button
              id="btn-track-order-header"
              onClick={onOpenTracking}
              className="hidden lg:flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-stone-700 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition-colors"
            >
              <Truck className="w-4 h-4 text-amber-600" />
              <span>Track Order</span>
            </button>

            {/* Admin Dashboard Switch Button (Only shown when already logged in as Admin) */}
            {isAdmin && (
              <button
                id="btn-admin-portal-switch"
                onClick={handleAdminClick}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all shadow-xs ${
                  isAdminView
                    ? 'bg-amber-600 text-white shadow-amber-600/30'
                    : 'bg-stone-900 text-amber-400 hover:bg-black'
                }`}
              >
                <ShieldCheck className="w-4 h-4" />
                <span className="hidden sm:inline">{isAdminView ? 'Storefront' : 'Admin Panel'}</span>
              </button>
            )}

            {/* Customer Account / Login */}
            <div className="relative">
              {(currentUser || userProfile) ? (
                <button
                  id="btn-user-profile-menu"
                  onClick={() => setIsAccountMenuOpen(!isAccountMenuOpen)}
                  className="flex items-center gap-2 p-1.5 sm:px-3 sm:py-2 rounded-lg text-stone-800 hover:bg-stone-100 transition-colors"
                >
                  {(currentUser?.photoURL || userProfile?.photoURL) ? (
                    <img
                      src={currentUser?.photoURL || userProfile?.photoURL}
                      alt={userProfile?.name || 'User'}
                      referrerPolicy="no-referrer"
                      className="w-8 h-8 rounded-full object-cover border border-amber-400 shadow-2xs shrink-0"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-800 font-bold flex items-center justify-center text-xs border border-amber-300">
                      {userProfile?.name?.charAt(0).toUpperCase() || currentUser?.displayName?.charAt(0).toUpperCase() || currentUser?.email?.charAt(0).toUpperCase() || 'U'}
                    </div>
                  )}
                  <div className="hidden md:flex flex-col text-left">
                    <span className="text-xs font-semibold leading-tight truncate max-w-[100px]">
                      {userProfile?.name?.split(' ')[0] || currentUser?.displayName?.split(' ')[0] || 'My Account'}
                    </span>
                    <span className="text-[10px] text-stone-500">
                      {userProfile?.role === 'admin' ? 'Admin' : 'Customer'}
                    </span>
                  </div>
                </button>
              ) : (
                <button
                  id="btn-login-header"
                  onClick={() => onOpenAuth('login')}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-stone-700 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition-colors"
                >
                  <UserIcon className="w-4 h-4 text-stone-600" />
                  <span className="hidden sm:inline">Sign In</span>
                </button>
              )}

              {/* Account Dropdown Menu */}
              {isAccountMenuOpen && (currentUser || userProfile) && (
                <div 
                  id="account-dropdown-popup"
                  className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-stone-200 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150"
                >
                  <div className="px-4 py-2 border-b border-stone-100">
                    <p className="text-xs font-bold text-stone-900 truncate">{userProfile?.name || 'Customer'}</p>
                    <p className="text-[11px] text-stone-500 truncate">{userProfile?.phone || currentUser?.email || userProfile?.email || 'Active Member'}</p>
                  </div>

                  <button
                    id="btn-dropdown-my-orders"
                    onClick={() => {
                      setIsAccountMenuOpen(false);
                      onOpenProfile();
                    }}
                    className="w-full text-left px-4 py-2.5 text-xs text-stone-700 hover:bg-stone-50 hover:text-amber-600 flex items-center gap-2 font-medium"
                  >
                    <ShoppingBag className="w-4 h-4 text-stone-400" /> My Profile & Orders
                  </button>

                  <button
                    id="btn-dropdown-track-order"
                    onClick={() => {
                      setIsAccountMenuOpen(false);
                      onOpenTracking();
                    }}
                    className="w-full text-left px-4 py-2.5 text-xs text-stone-700 hover:bg-stone-50 hover:text-amber-600 flex items-center gap-2 font-medium"
                  >
                    <Truck className="w-4 h-4 text-stone-400" /> Track Parcel
                  </button>

                  {isAdmin && (
                    <button
                      id="btn-dropdown-admin"
                      onClick={() => {
                        setIsAccountMenuOpen(false);
                        handleAdminClick();
                      }}
                      className="w-full text-left px-4 py-2.5 text-xs text-amber-700 hover:bg-amber-50 flex items-center gap-2 font-semibold border-t border-stone-100"
                    >
                      <ShieldCheck className="w-4 h-4 text-amber-600" /> Admin Dashboard
                    </button>
                  )}

                  <button
                    id="btn-dropdown-logout"
                    onClick={() => {
                      setIsAccountMenuOpen(false);
                      logout();
                    }}
                    className="w-full text-left px-4 py-2.5 text-xs text-rose-600 hover:bg-rose-50 flex items-center gap-2 font-medium border-t border-stone-100"
                  >
                    <LogOut className="w-4 h-4 text-rose-500" /> Sign Out
                  </button>
                </div>
              )}
            </div>

            {/* Cart Button with Count Badge */}
            <button
              id="btn-cart-toggle"
              onClick={() => setIsCartOpen(true)}
              className="relative flex items-center gap-2 p-2 sm:px-3.5 sm:py-2 bg-stone-900 hover:bg-black text-white rounded-xl font-medium text-xs shadow-md shadow-stone-900/10 transition-all hover:scale-102"
              aria-label="Open Shopping Cart"
            >
              <ShoppingBag className="w-4 h-4 text-amber-400" />
              <span className="hidden sm:inline font-bold">Cart</span>
              <span className="flex items-center justify-center min-w-[20px] h-5 px-1.5 bg-amber-500 text-stone-950 font-black text-xs rounded-full">
                {totalItems}
              </span>
            </button>
          </div>
        </div>

        {/* Mobile Search Bar */}
        <div className="sm:hidden pb-3">
          <div className="relative w-full">
            <input
              id="mobile-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search products in Bangladesh..."
              className="w-full pl-9 pr-8 py-2 bg-stone-100 border border-stone-200 rounded-lg text-xs text-stone-900 focus:outline-hidden focus:border-amber-500"
            />
            <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            {searchQuery && (
              <button
                onClick={() => onSearchChange('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-stone-400"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Category Horizontal Navigation Scroll */}
        {!isAdminView && (
          <div className="flex items-center gap-2 overflow-x-auto py-2.5 scrollbar-none border-t border-stone-100 text-xs font-medium">
            <button
              id="category-pill-all"
              onClick={() => onSelectCategory('all')}
              className={`shrink-0 px-3.5 py-1.5 rounded-full transition-all flex items-center gap-1.5 ${
                selectedCategory === 'all'
                  ? 'bg-amber-600 text-white font-bold shadow-xs'
                  : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" /> All Products
            </button>
            {categories.filter(c => c.active).map((category) => (
              <button
                key={category.id}
                id={`category-pill-${category.id}`}
                onClick={() => onSelectCategory(category.id)}
                className={`shrink-0 px-3.5 py-1.5 rounded-full transition-all whitespace-nowrap ${
                  selectedCategory === category.id
                    ? 'bg-amber-600 text-white font-bold shadow-xs'
                    : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                }`}
              >
                {category.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Mobile Drawer Menu */}
      {isMobileMenuOpen && (
        <div id="mobile-navigation-drawer" className="md:hidden border-t border-stone-200 bg-white px-4 py-4 space-y-3 shadow-lg">
          <div className="space-y-1">
            <p className="text-[11px] font-bold text-stone-400 uppercase tracking-wider">Navigation</p>
            <button
              onClick={() => {
                onSelectCategory('all');
                setIsMobileMenuOpen(false);
              }}
              className="w-full text-left py-2 text-sm font-semibold text-stone-800 flex items-center justify-between"
            >
              <span>Explore All Products</span>
            </button>
            <button
              onClick={() => {
                setIsMobileMenuOpen(false);
                onOpenTracking();
              }}
              className="w-full text-left py-2 text-sm font-semibold text-stone-800 flex items-center gap-2"
            >
              <Truck className="w-4 h-4 text-amber-600" /> Track My Parcel
            </button>
          </div>

          <div className="pt-3 border-t border-stone-100 space-y-2">
            <p className="text-[11px] font-bold text-stone-400 uppercase tracking-wider">Account</p>
            {currentUser ? (
              <>
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onOpenProfile();
                  }}
                  className="w-full text-left py-2 text-sm font-semibold text-stone-800"
                >
                  My Profile & Orders
                </button>
                {isAdmin && (
                  <button
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      handleAdminClick();
                    }}
                    className="w-full text-left py-2 text-sm font-semibold text-amber-700 flex items-center gap-2"
                  >
                    <ShieldCheck className="w-4 h-4 text-amber-600" />
                    Admin Panel
                  </button>
                )}
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    logout();
                  }}
                  className="w-full text-left py-2 text-sm font-semibold text-rose-600"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <div className="space-y-2">
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      onOpenAuth('login');
                    }}
                    className="flex-1 py-2.5 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-stone-950 rounded-lg text-center shadow-xs"
                  >
                    Sign In
                  </button>
                  <button
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      onOpenAuth('register');
                    }}
                    className="flex-1 py-2.5 text-xs font-bold bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-lg text-center"
                  >
                    Register
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
