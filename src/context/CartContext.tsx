import React, { createContext, useContext, useState, useEffect } from 'react';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
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
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const LOCAL_STORAGE_KEY = 'glocart_bd_cart_v1';

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
  const [storeSettings, setStoreSettings] = useState<StoreSettings>(DEFAULT_SETTINGS);
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);

  // Fetch live store settings from Firestore
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const snap = await getDoc(doc(db, 'settings', 'store'));
        if (snap.exists()) {
          const cloudData = snap.data() as Partial<StoreSettings>;
          // If Firestore contains old placeholder data, upgrade to new contact details
          const merged: StoreSettings = { ...DEFAULT_SETTINGS, ...cloudData };
          if (!merged.instagram) {
            merged.instagram = DEFAULT_SETTINGS.instagram;
          }
          if (
            merged.phone === '+880 1711-223344' ||
            merged.email === 'support@glocartbd.com' ||
            merged.address?.includes('Banani')
          ) {
            merged.phone = DEFAULT_SETTINGS.phone;
            merged.email = DEFAULT_SETTINGS.email;
            merged.address = DEFAULT_SETTINGS.address;
            try {
              await setDoc(doc(db, 'settings', 'store'), merged, { merge: true });
            } catch (e) {
              console.warn('Note updating legacy store settings in Firestore:', e);
            }
          }
          setStoreSettings(merged);
        } else {
          try {
            await setDoc(doc(db, 'settings', 'store'), DEFAULT_SETTINGS, { merge: true });
          } catch (e) {
            console.warn('Note writing initial store settings in Firestore:', e);
          }
        }
      } catch (err) {
        console.warn('Could not fetch store settings, using defaults:', err);
      }
    };
    fetchSettings();
  }, []);

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
    if (product.stock <= 0) {
      return false;
    }

    let success = true;
    setCartItems((prev) => {
      const existing = prev.find((item) => item.productId === product.id);
      let updated: CartItem[];

      if (existing) {
        const newQty = Math.min(existing.quantity + quantity, product.stock);
        if (existing.quantity >= product.stock) {
          success = false;
          return prev;
        }
        updated = prev.map((item) =>
          item.productId === product.id ? { ...item, quantity: newQty } : item
        );
      } else {
        const initialQty = Math.min(quantity, product.stock);
        const newItem: CartItem = {
          productId: product.id,
          name: product.name,
          price: product.price,
          oldPrice: product.oldPrice,
          quantity: initialQty,
          image: product.primaryImage || (product.images?.[0]?.url ?? ''),
          stock: product.stock,
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
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }

    setCartItems((prev) => {
      const updated = prev.map((item) => {
        if (item.productId === productId) {
          const validQty = Math.min(quantity, item.stock);
          return { ...item, quantity: validQty };
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

  const updateStoreSettingsState = (settings: StoreSettings) => {
    setStoreSettings(settings);
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
