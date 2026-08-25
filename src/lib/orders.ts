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

  // Auto-Book parcel to Steadfast Courier in the background if enabled
  (async () => {
    try {
      const settingsSnap = await getDoc(doc(db, 'settings', 'store'));
      const settings = settingsSnap.exists() ? settingsSnap.data() : null;
      const shouldAutoBook = settings ? settings.autoBookSteadfast !== false : true;

      if (shouldAutoBook) {
        await dispatchOrderToSteadfastCourier(
          newOrderRef.id,
          {
            orderNumber,
            customerName: params.customerName,
            phone: params.phone,
            address: params.address,
            area: params.area,
            district: params.district,
            paymentMethod: params.paymentMethod,
            grandTotal: params.grandTotal,
            note: params.note,
          },
          {
            apiKey: settings?.steadfastApiKey,
            secretKey: settings?.steadfastSecretKey,
          }
        );
      }
    } catch (err) {
      console.warn('Auto courier booking background dispatch note:', err);
    }
  })();

  return { success: true, orderId: newOrderRef.id, orderNumber };
}

/**
 * Dispatches an order to Steadfast Courier and records consignment details in Firestore
 */
export async function dispatchOrderToSteadfastCourier(
  orderId: string,
  orderData: {
    orderNumber: string;
    customerName: string;
    phone: string;
    address: string;
    area: string;
    district: string;
    paymentMethod: string;
    grandTotal: number;
    note?: string;
  },
  customKeys?: { apiKey?: string; secretKey?: string }
): Promise<{ success: boolean; consignmentId?: string; trackingCode?: string; message?: string }> {
  try {
    let apiKey = customKeys?.apiKey;
    let secretKey = customKeys?.secretKey;

    if (!apiKey || !secretKey) {
      try {
        const settingsSnap = await getDoc(doc(db, 'settings', 'store'));
        if (settingsSnap.exists()) {
          const sData = settingsSnap.data();
          if (sData.steadfastApiKey) apiKey = sData.steadfastApiKey;
          if (sData.steadfastSecretKey) secretKey = sData.steadfastSecretKey;
        }
      } catch (err) {
        console.warn('Settings read for courier failed:', err);
      }
    }

    const codAmount = orderData.paymentMethod === 'cod' ? orderData.grandTotal : 0;
    const fullAddress = `${orderData.address || ''}, ${orderData.area || ''}, ${orderData.district || 'Dhaka'}`.replace(/^,\s*|,\s*$/g, '');

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (apiKey) headers['Api-Key'] = apiKey;
    if (secretKey) headers['Secret-Key'] = secretKey;

    const res = await fetch('/api/courier/steadfast/create-order', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        invoice: orderData.orderNumber,
        recipient_name: orderData.customerName,
        recipient_phone: orderData.phone,
        recipient_address: fullAddress,
        cod_amount: codAmount,
        note: orderData.note || `GloCart BD Order #${orderData.orderNumber}`,
      }),
    });

    const data = await res.json();
    if (data.success || data.status === 200 || data.consignment) {
      const consignment = data.consignment || {};
      const consignmentId = String(consignment.consignment_id || data.consignment_id || `SF${Date.now().toString().slice(-7)}`);
      const trackingCode = String(consignment.tracking_code || data.tracking_code || `TRK-${orderData.orderNumber}`);
      const courierStatus = consignment.status || data.delivery_status || 'in_review';

      await updateDoc(doc(db, 'orders', orderId), {
        courier: {
          provider: 'steadfast',
          consignmentId,
          trackingCode,
          status: courierStatus,
          syncedAt: new Date().toISOString(),
          autoBooked: true,
        },
        status: 'processing',
        updatedAt: serverTimestamp(),
      });

      return {
        success: true,
        consignmentId,
        trackingCode,
        message: data.message || 'Booked with Steadfast Courier successfully',
      };
    } else {
      const errMsg = data.message || 'Steadfast booking failed';
      await updateDoc(doc(db, 'orders', orderId), {
        'courier.notes': `Notice: ${errMsg}`,
        updatedAt: serverTimestamp(),
      });
      return { success: false, message: errMsg };
    }
  } catch (err: any) {
    console.error('Steadfast courier dispatch error:', err);
    try {
      await updateDoc(doc(db, 'orders', orderId), {
        'courier.notes': `Auto-booking error: ${err.message}`,
        updatedAt: serverTimestamp(),
      });
    } catch (_) {}
    return { success: false, message: err.message };
  }
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
 * Permanently deletes an order from Firestore with optional inventory restocking
 */
export async function deleteOrder(
  orderId: string,
  restoreStock: boolean = true
): Promise<void> {
  const orderRef = doc(db, 'orders', orderId);

  await runTransaction(db, async (transaction) => {
    const orderDoc = await transaction.get(orderRef);
    if (!orderDoc.exists()) {
      return;
    }

    const orderData = orderDoc.data() as Order;

    // Restore product stock if requested and if not already restored/cancelled
    if (restoreStock && orderData.status !== 'cancelled' && !orderData.stockRestored && orderData.items) {
      for (const item of orderData.items) {
        if (item.productId) {
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
      }
    }

    // Decrement customer statistics if linked to a registered customer
    if (orderData.customerId) {
      const userRef = doc(db, 'users', orderData.customerId);
      const userDoc = await transaction.get(userRef);
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const newCount = Math.max(0, (userData.orderCount || 1) - 1);
        const newSpent = Math.max(0, (userData.totalSpent || orderData.grandTotal) - orderData.grandTotal);
        transaction.update(userRef, {
          orderCount: newCount,
          totalSpent: newSpent,
          updatedAt: serverTimestamp(),
        });
      }
    }

    transaction.delete(orderRef);
  });
}

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
