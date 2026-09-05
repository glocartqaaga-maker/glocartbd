import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { doc, getDoc, setDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from './AuthContext';
import { CartItem, Product, StoreSettings } from '../types';
import { DEFAULT_SETTINGS } from '../lib/seed';

interface CartContextType {
  cartItems: CartItem[];
  addToCart: (product: Product, quantity?: number) => boolean;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  totalItems: number;
  subtotal: number;
  discount: number;
  appliedCoupon: string | null;
  applyCoupon: (code: string) => { success: boolean; message: string };
  removeCoupon: () => void;
  calculateDeliveryCharge: (districtName: string) => number;
  storeSettings: StoreSettings;
  updateStoreSettingsState: (settings: StoreSettings) => void;
  refreshStoreSettings: () => Promise<void>;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const LOCAL_STORAGE_KEY = 'glocart_bd_cart_v1';
const SETTINGS_STORAGE_KEY = 'glocart_store_settings_cache';

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();
  const [cartItems, setCartItems] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [storeSettings, setStoreSettings] = useState<StoreSettings>(() => {
    try {
      const cached = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        // Clear any old stale Gulshan address from legacy cache
        if (parsed.address && parsed.address.toLowerCase().includes('gulshan')) {
          localStorage.removeItem(SETTINGS_STORAGE_KEY);
        } else {
          return { ...DEFAULT_SETTINGS, ...parsed };
        }
      }
    } catch {}
    return DEFAULT_SETTINGS;
  });
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);

  // Real-time live listener for store settings from Firestore
  useEffect(() => {
    const settingsDocRef = doc(db, 'settings', 'store');
    const unsub = onSnapshot(
      settingsDocRef,
      (snap) => {
        if (snap.exists()) {
          const cloudData = snap.data() as Partial<StoreSettings>;
          const merged: StoreSettings = {
            ...DEFAULT_SETTINGS,
            ...cloudData,
          };
          setStoreSettings(merged);
          try {
            localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(merged));
          } catch {}
        }
      },
      (err) => {
        console.warn('Real-time settings listener warning:', err);
      }
    );

    return () => unsub();
  }, []);

  const refreshStoreSettings = useCallback(async () => {
    try {
      const snap = await getDoc(doc(db, 'settings', 'store'));
      if (snap.exists()) {
        const cloudData = snap.data() as Partial<StoreSettings>;
        const merged: StoreSettings = {
          ...DEFAULT_SETTINGS,
          ...cloudData,
        };
        setStoreSettings(merged);
        try {
          localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(merged));
        } catch {}
      }
    } catch (err) {
      console.warn('Manual refresh settings error:', err);
    }
  }, []);

  const updateStoreSettingsState = (newSettings: StoreSettings) => {
    const merged = { ...storeSettings, ...newSettings };
    setStoreSettings(merged);
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(merged));
    } catch {}
  };

  // Update browser tab favicon & title dynamically when store settings change
  useEffect(() => {
    try {
      if (storeSettings.logoUrl) {
        const linkIcons = document.querySelectorAll<HTMLLinkElement>("link[rel*='icon'], link[rel='apple-touch-icon']");
        linkIcons.forEach((el) => {
          el.href = storeSettings.logoUrl!;
        });
      }
      if (storeSettings.storeName) {
        document.title = `${storeSettings.storeName} | Premium Online Shopping Bangladesh`;
      }
    } catch {
      // safe fallback in SSR/sandbox
    }
  }, [storeSettings.logoUrl, storeSettings.storeName]);

  // Save to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(cartItems));
    } catch (e) {
      console.error('LocalStorage write failed:', e);
    }
  }, [cartItems]);

  // Sync with Firestore for logged-in users
  useEffect(() => {
    if (!currentUser) return;

    const syncCartWithCloud = async () => {
      try {
        const cartRef = doc(db, 'carts', currentUser.uid);
        const cartSnap = await getDoc(cartRef);

        if (cartSnap.exists()) {
          const cloudItems = cartSnap.data().items as CartItem[];
          if (cloudItems && cloudItems.length > 0 && cartItems.length === 0) {
            setCartItems(cloudItems);
          } else if (cartItems.length > 0) {
            await setDoc(cartRef, {
              items: cartItems,
              updatedAt: serverTimestamp(),
            });
          }
        } else if (cartItems.length > 0) {
          await setDoc(cartRef, {
            items: cartItems,
            updatedAt: serverTimestamp(),
          });
        }
      } catch (err) {
        console.warn('Firestore cart sync note:', err);
      }
    };

    syncCartWithCloud();
  }, [currentUser]);

  // Push updates to Firestore when cart items change and user is logged in
  const persistCloudCart = async (newItems: CartItem[]) => {
    if (!currentUser) return;
    try {
      await setDoc(doc(db, 'carts', currentUser.uid), {
        items: newItems,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      console.warn('Cloud cart update note:', err);
    }
  };

  const addToCart = (product: Product, quantity = 1): boolean => {
    const availableStock = typeof product.stock === 'number' ? product.stock : 99;
    if (availableStock <= 0) {
      return false;
    }

    const addQty = Math.max(1, Math.floor(quantity));
    let success = true;

    setCartItems((prev) => {
      const existing = prev.find((item) => item.productId === product.id);
      let updated: CartItem[];

      if (existing) {
        const newQty = Math.min(existing.quantity + addQty, availableStock);
        if (existing.quantity >= availableStock) {
          success = false;
          return prev;
        }
        updated = prev.map((item) =>
          item.productId === product.id ? { ...item, quantity: newQty, stock: availableStock } : item
        );
      } else {
        const initialQty = Math.min(addQty, availableStock);
        const newItem: CartItem = {
          productId: product.id,
          name: product.name,
          price: product.price,
          oldPrice: product.oldPrice,
          quantity: initialQty,
          image: product.primaryImage || (product.images?.[0]?.url ?? ''),
          stock: availableStock,
          categoryName: product.categoryName,
        };
        updated = [...prev, newItem];
      }

      persistCloudCart(updated);
      return updated;
    });

    return success;
  };

  const removeFromCart = (productId: string) => {
    setCartItems((prev) => {
      const updated = prev.filter((item) => item.productId !== productId);
      persistCloudCart(updated);
      return updated;
    });
  };

  const updateQuantity = (productId: string, quantity: number) => {
    const validQty = Math.floor(quantity);
    if (validQty <= 0) {
      removeFromCart(productId);
      return;
    }

    setCartItems((prev) => {
      const updated = prev.map((item) => {
        if (item.productId === productId) {
          const maxStock = typeof item.stock === 'number' && item.stock > 0 ? item.stock : 99;
          const clampedQty = Math.min(validQty, maxStock);
          return { ...item, quantity: clampedQty };
        }
        return item;
      });
      persistCloudCart(updated);
      return updated;
    });
  };

  const clearCart = () => {
    setCartItems([]);
    setAppliedCoupon(null);
    if (currentUser) {
      persistCloudCart([]);
    }
  };

  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

  // Apply coupon
  const applyCoupon = (code: string): { success: boolean; message: string } => {
    const cleanCode = code.trim().toUpperCase();
    if (!cleanCode) {
      return { success: false, message: 'Please enter a valid coupon code.' };
    }

    const validCoupon = (storeSettings.couponCode || 'GLOCART10').toUpperCase();
    if (cleanCode === validCoupon) {
      setAppliedCoupon(cleanCode);
      return { 
        success: true, 
        message: `Coupon ${cleanCode} applied! You received a ${storeSettings.couponDiscountPercent || 10}% discount.` 
      };
    }

    return { success: false, message: 'Invalid or expired coupon code.' };
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
  };

  const discount = appliedCoupon
    ? Math.round((subtotal * (storeSettings.couponDiscountPercent || 10)) / 100)
    : 0;

  const calculateDeliveryCharge = (districtName: string): number => {
    if (subtotal >= (storeSettings.freeShippingThreshold || 2000)) {
      return 0; // Free shipping threshold met
    }
    const isDhaka = districtName.trim().toLowerCase() === 'dhaka';
    return isDhaka 
      ? (storeSettings.deliveryChargeDhaka ?? 60) 
      : (storeSettings.deliveryChargeOutside ?? 120);
  };

  return (
    <CartContext.Provider
      value={{
        cartItems,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        totalItems,
        subtotal,
        discount,
        appliedCoupon,
        applyCoupon,
        removeCoupon,
        calculateDeliveryCharge,
        storeSettings,
        updateStoreSettingsState,
        refreshStoreSettings,
        isCartOpen,
        setIsCartOpen,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
