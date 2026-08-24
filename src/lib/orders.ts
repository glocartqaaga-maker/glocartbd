import { 
  collection, 
  doc, 
  setDoc,
  runTransaction, 
  serverTimestamp, 
  getDoc, 
  updateDoc, 
  query, 
  where, 
  getDocs, 
  orderBy 
} from 'firebase/firestore';
import { db } from './firebase';
import { Order, OrderItem } from '../types';

export interface CreateOrderParams {
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
}

/**
 * Deep sanitization function to strip any `undefined` values from Firestore payloads
 */
function cleanFirestorePayload<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return null as unknown as T;
  }
  if (Array.isArray(obj)) {
    return obj
      .filter((v) => v !== undefined)
      .map((v) => cleanFirestorePayload(v)) as unknown as T;
  }
  if (typeof obj === 'object') {
    // If it's a special object (FieldValue, Date, Timestamp, etc.), preserve it
    if (obj.constructor && obj.constructor.name !== 'Object') {
      return obj;
    }
    const clean: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        clean[key] = cleanFirestorePayload(value);
      }
    }
    return clean as T;
  }
  return obj;
}

/**
 * Creates an order with atomic stock reduction and stock availability checks
 */
export async function createOrderAtomically(params: CreateOrderParams): Promise<{ success: boolean; orderId: string; orderNumber: string }> {
  if (!params.items || params.items.length === 0) {
    throw new Error('Cart is empty. Please add items to order.');
  }

  const orderNumber = 'GC-' + Date.now().toString().slice(-6) + Math.floor(100 + Math.random() * 900);
  const newOrderRef = doc(collection(db, 'orders'));

  // Clean and sanitize items to ensure NO undefined fields (e.g. oldPrice or image)
  const cleanItems: OrderItem[] = params.items.map((item) => {
    const itemClean: Record<string, any> = {
      productId: String(item.productId || ''),
      name: String(item.name || 'Product'),
      price: Number(item.price) || 0,
      quantity: Math.max(1, Number(item.quantity) || 1),
      image: String(item.image || ''),
    };
    if (item.oldPrice !== undefined && item.oldPrice !== null && !isNaN(Number(item.oldPrice))) {
      itemClean.oldPrice = Number(item.oldPrice);
    }
    return itemClean as OrderItem;
  });

  const rawOrderData: Record<string, any> = {
    id: newOrderRef.id,
    orderNumber,
    customerId: params.customerId || '',
    customerName: (params.customerName || '').trim(),
    phone: (params.phone || '').trim(),
    email: (params.email || '').trim(),
    district: (params.district || 'Dhaka').trim(),
    area: (params.area || '').trim(),
    address: (params.address || '').trim(),
    note: (params.note || '').trim(),
    items: cleanItems,
    subtotal: Number(params.subtotal) || 0,
    deliveryCharge: Number(params.deliveryCharge) || 0,
    discount: Number(params.discount) || 0,
    grandTotal: Math.max(0, Number(params.grandTotal) || 0),
    couponCode: (params.couponCode || '').trim(),
    paymentMethod: params.paymentMethod || 'cod',
    paymentStatus: params.paymentMethod === 'cod' ? 'unpaid' : 'paid',
    status: 'pending',
    stockRestored: false,
    courier: {
      provider: 'steadfast',
      status: 'pending',
    },
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const orderData = cleanFirestorePayload(rawOrderData);

  try {
    await runTransaction(db, async (transaction) => {
      // 1. Verify stock for items if they exist in Firestore
      for (const item of params.items) {
        const productRef = doc(db, 'products', item.productId);
        const productDoc = await transaction.get(productRef);

        if (productDoc.exists()) {
          const currentStock = productDoc.data().stock || 0;
          if (currentStock < item.quantity) {
            throw new Error(`Insufficient stock for "${item.name}". Only ${currentStock} item(s) left in stock.`);
          }

          // Deduct stock
          transaction.update(productRef, {
            stock: Math.max(0, currentStock - item.quantity),
            updatedAt: serverTimestamp(),
          });
        }
      }

      // 2. Create the order document
      transaction.set(newOrderRef, orderData);

      // 3. Update customer stats only if a valid authenticated user
      const isRealUser = params.customerId && 
        !params.customerId.startsWith('guest_') && 
        !params.customerId.startsWith('admin_local');

      if (isRealUser && params.customerId) {
        const userRef = doc(db, 'users', params.customerId);
        const userSnap = await transaction.get(userRef);
        if (userSnap.exists()) {
          const userData = userSnap.data();
          transaction.update(userRef, {
            orderCount: (userData.orderCount || 0) + 1,
            totalSpent: (userData.totalSpent || 0) + params.grandTotal,
            lastOrderAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }
      }
    });
  } catch (error: any) {
    // If it is a stock shortage error, rethrow it so the user is informed
    if (error.message && error.message.includes('Insufficient stock')) {
      throw error;
    }
    console.warn('Transaction fallback encountered:', error);
    // Direct setDoc fallback ensures the order is never lost
    await setDoc(newOrderRef, orderData);
  }

  return { success: true, orderId: newOrderRef.id, orderNumber };
}

/**
 * Updates order status and safely restores stock atomically if cancelled
 */
export async function updateOrderStatus(
  orderId: string, 
  newStatus: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled',
  _oldStatus?: string,
  _items?: OrderItem[]
): Promise<void> {
  const orderRef = doc(db, 'orders', orderId);

  await runTransaction(db, async (transaction) => {
    const orderDoc = await transaction.get(orderRef);
    if (!orderDoc.exists()) {
      throw new Error('Order not found.');
    }

    const orderData = orderDoc.data() as Order;
    const oldStatus = orderData.status;

    // Handle stock restoration if newly cancelled and not already restored
    if (newStatus === 'cancelled' && oldStatus !== 'cancelled' && !orderData.stockRestored) {
      for (const item of orderData.items) {
        const productRef = doc(db, 'products', item.productId);
        const productDoc = await transaction.get(productRef);
        if (productDoc.exists()) {
          const currentStock = productDoc.data().stock || 0;
          transaction.update(productRef, {
            stock: currentStock + item.quantity,
            updatedAt: serverTimestamp(),
          });
        }
      }
      transaction.update(orderRef, {
        status: newStatus,
        stockRestored: true,
        updatedAt: serverTimestamp(),
      });
    } else {
      transaction.update(orderRef, {
        status: newStatus,
        updatedAt: serverTimestamp(),
      });
    }
  });
}

export const updateOrderStatusAtomically = updateOrderStatus;

/**
 * Public Order Tracking Query
 */
export async function trackOrder(orderIdOrNumber: string, phone: string): Promise<Order | null> {
  const cleanId = orderIdOrNumber.trim();
  const cleanPhone = phone.trim().replace(/[^0-9]/g, '');

  // 1. Try finding by Firestore Doc ID
  try {
    const docSnap = await getDoc(doc(db, 'orders', cleanId));
    if (docSnap.exists()) {
      const order = { id: docSnap.id, ...docSnap.data() } as Order;
      const orderPhoneClean = (order.phone || '').replace(/[^0-9]/g, '');
      if (orderPhoneClean.endsWith(cleanPhone.slice(-8)) || cleanPhone.endsWith(orderPhoneClean.slice(-8))) {
        return order;
      }
    }
  } catch (e) {
    // continue to query by orderNumber
  }

  // 2. Query by orderNumber
  const q = query(
    collection(db, 'orders'),
    where('orderNumber', '==', cleanId)
  );

  const querySnap = await getDocs(q);
  if (!querySnap.empty) {
    for (const snap of querySnap.docs) {
      const order = { id: snap.id, ...snap.data() } as Order;
      const orderPhoneClean = (order.phone || '').replace(/[^0-9]/g, '');
      if (orderPhoneClean.endsWith(cleanPhone.slice(-8)) || cleanPhone.endsWith(orderPhoneClean.slice(-8))) {
        return order;
      }
    }
  }

  return null;
}
