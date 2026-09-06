import React, { useState, useEffect } from 'react';
import { 
  ShoppingBag, 
  Search, 
  Filter, 
  Truck, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  AlertTriangle,
  Eye, 
  Trash2,
  Loader2, 
  DollarSign, 
  Send, 
  RefreshCw,
  ExternalLink,
  MapPin,
  Phone,
  User as UserIcon,
  X,
  Printer,
  FileText
} from 'lucide-react';
import { collection, onSnapshot, getDocs, doc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { updateOrderStatusAtomically, deleteOrder, dispatchOrderToSteadfastCourier } from '../../lib/orders';
import { useCart } from '../../context/CartContext';
import { Order, OrderStatus } from '../../types';

export const AdminOrdersTab: React.FC = () => {
  const { storeSettings } = useCart();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected Order for Details Modal
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Order Deletion Modal State
  const [orderToDelete, setOrderToDelete] = useState<Order | null>(null);
  const [restoreStockOnDelete, setRestoreStockOnDelete] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);

  // Steadfast actions
  const [isSendingCourier, setIsSendingCourier] = useState<string | null>(null);
  const [courierBalance, setCourierBalance] = useState<number | null>(null);
  const [isCheckingBalance, setIsCheckingBalance] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Real-time live Firestore listener for orders
  useEffect(() => {
    setLoading(true);
    const unsub = onSnapshot(
      collection(db, 'orders'),
      (snap) => {
        const list: Order[] = [];
        snap.forEach((docSnap) => {
          list.push({ id: docSnap.id, ...docSnap.data() } as Order);
        });
        list.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
        setOrders(list);
        setLoading(false);
      },
      (err) => {
        console.warn('Error listening to orders:', err);
        setLoading(false);
      }
    );

    return () => unsub();
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'orders'));
      const list: Order[] = [];
      snap.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() } as Order);
      });
      list.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
      setOrders(list);
    } catch (err) {
      console.warn('Error fetching orders:', err);
    } finally {
      setLoading(false);
    }
  };

  // Change Order Status
  const handleStatusChange = async (order: Order, newStatus: OrderStatus) => {
    if (order.status === newStatus) return;

    try {
      await updateOrderStatusAtomically(order.id, newStatus, order.status, order.items);
      setOrders((prev) =>
        prev.map((o) => (o.id === order.id ? { ...o, status: newStatus } : o))
      );
      if (selectedOrder?.id === order.id) {
        setSelectedOrder((prev) => (prev ? { ...prev, status: newStatus } : null));
      }
      setFeedback(`Order #${order.orderNumber} updated to ${newStatus}.`);
      setTimeout(() => setFeedback(null), 3000);
    } catch (err: any) {
      alert('Status update failed: ' + err.message);
    }
  };

  // Delete Order Handler
  const handleConfirmDelete = async () => {
    if (!orderToDelete) return;
    setIsDeleting(true);
    try {
      await deleteOrder(orderToDelete.id, restoreStockOnDelete);
      if (selectedOrder?.id === orderToDelete.id) {
        setSelectedOrder(null);
      }
      setFeedback(`Order #${orderToDelete.orderNumber} was permanently deleted.`);
      setOrderToDelete(null);
      setTimeout(() => setFeedback(null), 3500);
    } catch (err: any) {
      alert('Failed to delete order: ' + err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  // Dispatch to Steadfast Courier
  const handleSendToSteadfast = async (order: Order) => {
    if (order.courier?.consignmentId) {
      alert(`Order #${order.orderNumber} is already sent to Steadfast (Consignment: ${order.courier.consignmentId}).`);
      return;
    }

    setIsSendingCourier(order.id);
    try {
      const result = await dispatchOrderToSteadfastCourier(
        order.id,
        {
          orderNumber: order.orderNumber,
          customerName: order.customerName,
          phone: order.phone,
          address: order.address,
          area: order.area,
          district: order.district,
          paymentMethod: order.paymentMethod,
          grandTotal: order.grandTotal,
          note: order.note,
        },
        {
          apiKey: storeSettings?.steadfastApiKey,
          secretKey: storeSettings?.steadfastSecretKey,
        }
      );

      if (!result.success) {
        throw new Error(result.message || 'Steadfast dispatch failed.');
      }

      setFeedback(
        `Successfully sent to Steadfast Courier! Consignment ID: ${result.consignmentId}`
      );
      setTimeout(() => setFeedback(null), 5000);
    } catch (err: any) {
      alert('Steadfast Dispatch Error: ' + err.message);
    } finally {
      setIsSendingCourier(null);
    }
  };

  // Check Steadfast Balance
  const handleCheckSteadfastBalance = async () => {
    setIsCheckingBalance(true);
    try {
      const headers: Record<string, string> = {};
      if (storeSettings?.steadfastApiKey) headers['Api-Key'] = storeSettings.steadfastApiKey;
      if (storeSettings?.steadfastSecretKey) headers['Secret-Key'] = storeSettings.steadfastSecretKey;

      const res = await fetch('/api/courier/steadfast/balance', { headers });
      const data = await res.json();
      if (data.success) {
        setCourierBalance(data.current_balance || 0);
        if (data.configured) {
          setFeedback(`Steadfast Live Account Balance: ৳${data.current_balance || 0}`);
        } else {
          setFeedback(`Steadfast Simulation Mode Active. (Add API credentials in Settings for live balance)`);
        }
        setTimeout(() => setFeedback(null), 4000);
      } else {
        alert('Could not retrieve balance: ' + data.message);
      }
    } catch (err: any) {
      alert('Balance check error: ' + err.message);
    } finally {
      setIsCheckingBalance(false);
    }
  };

  // Check individual parcel status
  const handleCheckCourierStatus = async (order: Order) => {
    const trackingIdentifier = order.courier?.trackingCode || order.courier?.consignmentId;
    if (!trackingIdentifier) return;
    try {
      const headers: Record<string, string> = {};
      if (storeSettings?.steadfastApiKey) headers['Api-Key'] = storeSettings.steadfastApiKey;
      if (storeSettings?.steadfastSecretKey) headers['Secret-Key'] = storeSettings.steadfastSecretKey;

      const res = await fetch(`/api/courier/steadfast/status/${trackingIdentifier}`, { headers });
      const data = await res.json();
      if (data.success && data.delivery_status) {
        alert(`Steadfast Status for #${order.orderNumber}:\n\nStatus: ${data.delivery_status}\nTracking Code: ${trackingIdentifier}`);
      } else {
        alert(`Steadfast Status for #${order.orderNumber}:\n\nStatus: In Transit / In Review\nConsignment ID: ${order.courier?.consignmentId}`);
      }
    } catch (err: any) {
      alert('Courier status check: ' + err.message);
    }
  };

  // Print / Save Order as PDF Invoice
  const handlePrintInvoice = (order: Order) => {
    const printWindow = window.open('', '_blank', 'width=800,height=900');
    if (!printWindow) {
      alert('Pop-up blocked. Please allow pop-ups to print or download the invoice PDF.');
      return;
    }

    const itemsHtml = order.items
      ?.map(
        (it, idx) => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; font-size: 13px;">${idx + 1}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; font-size: 13px; font-weight: 600;">${it.name}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; font-size: 13px; text-align: center;">${it.quantity}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; font-size: 13px; text-align: right;">৳${it.price.toLocaleString('en-BD')}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; font-size: 13px; text-align: right; font-weight: bold;">৳${(it.price * it.quantity).toLocaleString('en-BD')}</td>
      </tr>
    `
      )
      .join('');

    const formattedDate = order.createdAt?.toDate ? order.createdAt.toDate().toLocaleString('en-BD') : new Date().toLocaleString('en-BD');

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Invoice - ${order.orderNumber}</title>
        <meta charset="utf-8">
        <style>
          @page { size: A4; margin: 15mm; }
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #1c1917; margin: 0; padding: 20px; line-height: 1.5; }
          .invoice-box { max-width: 800px; margin: auto; padding: 20px; border: 1px solid #e7e5e4; border-radius: 12px; }
          .header-table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
          .header-table td { vertical-align: top; }
          .store-title { font-size: 22px; font-weight: 900; color: #d97706; text-transform: uppercase; margin: 0; }
          .store-sub { font-size: 12px; color: #78716c; margin-top: 4px; }
          .invoice-badge { display: inline-block; background: #fef3c7; color: #92400e; font-weight: bold; font-size: 12px; padding: 4px 10px; border-radius: 6px; }
          .meta-table { width: 100%; border-collapse: collapse; margin-bottom: 24px; background: #fafaf9; border-radius: 8px; }
          .meta-table td { padding: 12px 16px; font-size: 12px; vertical-align: top; }
          .section-title { font-size: 11px; font-weight: 800; text-transform: uppercase; color: #78716c; margin-bottom: 6px; letter-spacing: 0.5px; }
          .items-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          .items-table th { background: #f5f5f4; color: #44403c; font-size: 12px; font-weight: 800; text-transform: uppercase; padding: 10px; border-bottom: 2px solid #e7e5e4; }
          .summary-table { width: 300px; margin-left: auto; border-collapse: collapse; font-size: 13px; }
          .summary-table td { padding: 6px 10px; }
          .total-row td { font-size: 15px; font-weight: 900; color: #0c0a09; border-top: 2px solid #1c1917; padding-top: 10px; }
          .footer-note { margin-top: 30px; text-align: center; font-size: 11px; color: #a8a29e; border-top: 1px dashed #d6d3d1; padding-top: 12px; }
          @media print {
            body { padding: 0; }
            .invoice-box { border: none; padding: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="invoice-box">
          <div class="no-print" style="margin-bottom: 16px; text-align: right;">
            <button onclick="window.print()" style="background: #d97706; color: white; border: none; padding: 8px 16px; font-weight: bold; border-radius: 6px; cursor: pointer;">Print / Download PDF</button>
          </div>
          <table class="header-table">
            <tr>
              <td>
                <h1 class="store-title">${storeSettings?.storeName || 'GloCart BD'}</h1>
                <p class="store-sub">${storeSettings?.tagline || 'Premium Online Shopping in Bangladesh'}<br>Phone: ${storeSettings?.phone || '+880 1700-000000'} | Email: ${storeSettings?.email || 'support@glocartbd.com'}<br>${storeSettings?.address || 'Dhaka, Bangladesh'}</p>
              </td>
              <td style="text-align: right;">
                <span class="invoice-badge">INVOICE</span>
                <p style="font-size: 16px; font-weight: 900; margin: 6px 0 2px 0;">#${order.orderNumber}</p>
                <p style="font-size: 12px; color: #78716c; margin: 0;">Date: ${formattedDate}</p>
                <p style="font-size: 12px; color: #78716c; margin: 2px 0 0 0; text-transform: uppercase;">Payment: <strong>${order.paymentMethod}</strong> (${order.paymentStatus || 'pending'})</p>
                ${order.courier?.consignmentId ? `<p style="font-size: 11px; color: #0284c7; margin: 4px 0 0 0;">Steadfast Courier: <strong>#${order.courier.consignmentId}</strong></p>` : ''}
              </td>
            </tr>
          </table>

          <table class="meta-table">
            <tr>
              <td style="width: 50%;">
                <div class="section-title">Customer / Recipient</div>
                <div style="font-size: 14px; font-weight: bold; color: #1c1917;">${order.customerName}</div>
                <div>Phone: <strong>${order.phone}</strong></div>
                ${order.email ? `<div>Email: ${order.email}</div>` : ''}
              </td>
              <td style="width: 50%;">
                <div class="section-title">Shipping Address</div>
                <div>${order.address}</div>
                <div>${order.area}, ${order.district}</div>
                ${order.note ? `<div style="margin-top: 4px; color: #b45309; font-style: italic;">Note: ${order.note}</div>` : ''}
              </td>
            </tr>
          </table>

          <table class="items-table">
            <thead>
              <tr>
                <th style="text-align: left; width: 40px;">#</th>
                <th style="text-align: left;">Item Description</th>
                <th style="text-align: center; width: 60px;">Qty</th>
                <th style="text-align: right; width: 100px;">Price</th>
                <th style="text-align: right; width: 110px;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>

          <table class="summary-table">
            <tr>
              <td style="color: #78716c;">Subtotal:</td>
              <td style="text-align: right; font-weight: 600;">৳${order.subtotal.toLocaleString('en-BD')}</td>
            </tr>
            ${order.discount > 0 ? `
            <tr>
              <td style="color: #059669;">Discount (${order.couponCode || 'Coupon'}):</td>
              <td style="text-align: right; color: #059669; font-weight: 600;">-৳${order.discount.toLocaleString('en-BD')}</td>
            </tr>` : ''}
            <tr>
              <td style="color: #78716c;">Delivery Charge:</td>
              <td style="text-align: right; font-weight: 600;">৳${order.deliveryCharge}</td>
            </tr>
            <tr class="total-row">
              <td>Grand Total:</td>
              <td style="text-align: right;">৳${order.grandTotal.toLocaleString('en-BD')}</td>
            </tr>
          </table>

          <div class="footer-note">
            <p>Thank you for shopping with <strong>${storeSettings?.storeName || 'GloCart BD'}</strong>!</p>
            <p>Design & Developed by QAAGA TEAM (https://team.qaaga.com/)</p>
          </div>
        </div>
        <script>
          window.onload = function() {
            setTimeout(function() { window.print(); }, 400);
          };
        </script>
      </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const filteredOrders = orders.filter((o) => {
    const matchesStatus = statusFilter === 'all' || o.status === statusFilter;
    const matchesSearch =
      o.orderNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.customerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.phone?.includes(searchQuery) ||
      o.district?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Top Header & Steadfast Balance Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight">
            Orders & Courier Fulfillment
          </h2>
          <p className="text-xs text-stone-500">
            Process orders, manage inventory lifecycle, and dispatch parcels to Steadfast Courier.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCheckSteadfastBalance}
            disabled={isCheckingBalance}
            className="px-3.5 py-2 bg-stone-900 hover:bg-black text-stone-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shrink-0"
          >
            {isCheckingBalance ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
            ) : (
              <Truck className="w-3.5 h-3.5 text-amber-400" />
            )}
            <span>
              {courierBalance !== null
                ? `Steadfast Balance: ৳${courierBalance}`
                : 'Check Courier Balance'}
            </span>
          </button>

          <button
            onClick={fetchOrders}
            className="p-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl transition-colors"
            title="Refresh Orders"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {feedback && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 bg-white p-3.5 rounded-2xl border border-stone-200/80 shadow-xs">
        <div className="relative flex-1">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Order #, customer name, mobile, district..."
            className="w-full pl-9 pr-3 py-2 bg-stone-50 border border-stone-200 focus:border-amber-500 rounded-xl text-xs text-stone-900 focus:outline-hidden"
          />
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
        </div>

        {/* Status Filters */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 text-xs">
          {['all', 'pending', 'processing', 'shipped', 'delivered', 'cancelled'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl font-bold capitalize whitespace-nowrap transition-all ${
                statusFilter === st
                  ? 'bg-amber-500 text-stone-950 shadow-xs'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-3xl border border-stone-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center text-stone-400 gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
            <p className="text-xs">Loading customer orders...</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="py-16 text-center text-stone-400 space-y-2 text-xs">
            <ShoppingBag className="w-10 h-10 mx-auto text-stone-300" />
            <p className="font-bold text-stone-700">No orders found</p>
            <p className="text-stone-500">Customer checkouts will populate here immediately.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-stone-700">
              <thead className="bg-stone-50/80 border-b border-stone-200 text-[11px] font-bold text-stone-500 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Order Details</th>
                  <th className="py-3 px-4">Customer & Location</th>
                  <th className="py-3 px-4">Amount & Pay</th>
                  <th className="py-3 px-4">Order Status</th>
                  <th className="py-3 px-4">Courier / Dispatch</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-stone-50/60 transition-colors">
                    {/* Order ID & Items count */}
                    <td className="py-3 px-4">
                      <div>
                        <span className="font-mono font-black text-stone-900">{order.orderNumber}</span>
                        <p className="text-[11px] text-stone-400">
                          {order.items?.length || 0} item(s)
                        </p>
                      </div>
                    </td>

                    {/* Customer */}
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-bold text-stone-900">{order.customerName}</p>
                        <p className="text-[11px] text-stone-500">{order.phone}</p>
                        <p className="text-[10px] text-stone-400 font-semibold">{order.district}</p>
                      </div>
                    </td>

                    {/* Amount & Method */}
                    <td className="py-3 px-4">
                      <span className="font-extrabold text-stone-950">৳{order.grandTotal.toLocaleString('en-BD')}</span>
                      <span className="block text-[10px] font-bold text-amber-700 uppercase">
                        {order.paymentMethod}
                      </span>
                    </td>

                    {/* Status Dropdown */}
                    <td className="py-3 px-4">
                      <select
                        value={order.status}
                        onChange={(e) => handleStatusChange(order, e.target.value as OrderStatus)}
                        className={`px-2.5 py-1 rounded-xl text-xs font-bold border focus:outline-hidden ${
                          order.status === 'delivered' ? 'bg-emerald-50 text-emerald-800 border-emerald-300' :
                          order.status === 'cancelled' ? 'bg-rose-50 text-rose-800 border-rose-300' :
                          order.status === 'shipped' ? 'bg-sky-50 text-sky-800 border-sky-300' :
                          'bg-amber-50 text-amber-900 border-amber-300'
                        }`}
                      >
                        <option value="pending">Pending</option>
                        <option value="processing">Processing</option>
                        <option value="shipped">Shipped</option>
                        <option value="delivered">Delivered</option>
                        <option value="cancelled">Cancelled (Restore Stock)</option>
                      </select>
                    </td>

                    {/* Steadfast Courier Action */}
                    <td className="py-3 px-4">
                      {order.courier?.consignmentId ? (
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-sky-800 bg-sky-50 border border-sky-200 px-2 py-0.5 rounded-md">
                              <Truck className="w-3 h-3 text-sky-600" /> #{order.courier.consignmentId}
                            </span>
                            {order.courier.autoBooked && (
                              <span className="text-[9px] font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                                Auto
                              </span>
                            )}
                          </div>
                          <button
                            onClick={() => handleCheckCourierStatus(order)}
                            className="block text-[10px] font-semibold text-sky-600 hover:text-sky-800 hover:underline"
                          >
                            Track Status →
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <button
                            onClick={() => handleSendToSteadfast(order)}
                            disabled={isSendingCourier === order.id || order.status === 'cancelled'}
                            className="px-2.5 py-1 bg-stone-900 hover:bg-black text-amber-400 font-bold rounded-lg text-[11px] flex items-center gap-1 transition-all disabled:opacity-40 shadow-xs"
                          >
                            {isSendingCourier === order.id ? (
                              <Loader2 className="w-3 h-3 animate-spin text-white" />
                            ) : (
                              <Send className="w-3 h-3" />
                            )}
                            <span>Send Steadfast</span>
                          </button>
                          {order.courier?.notes && (
                            <p className="text-[9px] text-amber-700 max-w-[140px] truncate" title={order.courier.notes}>
                              {order.courier.notes}
                            </p>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Actions: View Details, Print Invoice, & Delete */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handlePrintInvoice(order)}
                          className="p-1.5 text-stone-600 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                          title="Print / Download PDF Invoice"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setSelectedOrder(order)}
                          className="p-1.5 text-stone-600 hover:text-stone-900 hover:bg-stone-200 rounded-lg transition-colors"
                          title="View Full Order Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setOrderToDelete(order)}
                          className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Delete Order"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* FULL ORDER DETAILS MODAL */}
      {selectedOrder && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200"
          onClick={() => setSelectedOrder(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden border border-stone-200 animate-in zoom-in-95 duration-250 p-6 space-y-4 max-h-[85vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div>
                <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">
                  Order Invoice
                </span>
                <h3 className="font-extrabold text-lg text-stone-900">
                  {selectedOrder.orderNumber}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePrintInvoice(selectedOrder)}
                  className="px-2.5 py-1 text-xs font-bold text-amber-700 hover:text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl flex items-center gap-1 transition-colors"
                  title="Print or Save Invoice as PDF"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Invoice / PDF</span>
                </button>
                <button
                  onClick={() => setOrderToDelete(selectedOrder)}
                  className="px-2.5 py-1 text-xs font-bold text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-1 transition-colors"
                  title="Delete this order"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Order</span>
                </button>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="p-1.5 rounded-full hover:bg-stone-100 text-stone-400 hover:text-stone-900"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Customer & Address Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-stone-50 rounded-2xl border border-stone-200 text-xs">
              <div className="space-y-1">
                <p className="font-bold text-stone-900 flex items-center gap-1.5">
                  <UserIcon className="w-3.5 h-3.5 text-amber-600" /> Recipient Details
                </p>
                <p className="text-stone-700 font-semibold">{selectedOrder.customerName}</p>
                <p className="text-stone-500">{selectedOrder.phone}</p>
                {selectedOrder.email && <p className="text-stone-500">{selectedOrder.email}</p>}
              </div>

              <div className="space-y-1">
                <p className="font-bold text-stone-900 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-amber-600" /> Delivery Destination
                </p>
                <p className="text-stone-700">{selectedOrder.address}</p>
                <p className="text-stone-500 font-semibold">
                  {selectedOrder.area}, {selectedOrder.district}
                </p>
                {selectedOrder.note && (
                  <p className="text-amber-800 italic pt-1">Note: {selectedOrder.note}</p>
                )}
              </div>
            </div>

            {/* Courier status banner */}
            {selectedOrder.courier?.consignmentId ? (
              <div className="p-3 bg-sky-50 border border-sky-200 rounded-2xl text-xs text-sky-900 flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <Truck className="w-4 h-4 text-sky-600 shrink-0" />
                  <div>
                    <span className="font-bold">Steadfast Consignment: </span>
                    <span className="font-mono font-extrabold">{selectedOrder.courier.consignmentId}</span>
                    {selectedOrder.courier.autoBooked && (
                      <span className="ml-1.5 text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                        Auto-Booked
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[11px] bg-sky-200/80 px-2 py-0.5 rounded-md font-bold uppercase">
                    {selectedOrder.courier.status || 'in_review'}
                  </span>
                  <button
                    onClick={() => handleCheckCourierStatus(selectedOrder)}
                    className="text-[11px] text-sky-700 underline font-bold"
                  >
                    Track
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-xs flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2 text-stone-700">
                  <Truck className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Parcel not dispatched to Steadfast yet.</span>
                </div>
                <button
                  onClick={() => handleSendToSteadfast(selectedOrder)}
                  disabled={isSendingCourier === selectedOrder.id || selectedOrder.status === 'cancelled'}
                  className="px-3 py-1.5 bg-stone-900 hover:bg-black text-amber-400 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all disabled:opacity-50"
                >
                  {isSendingCourier === selectedOrder.id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                  <span>Book with Steadfast Courier Now</span>
                </button>
              </div>
            )}

            {/* Items Table */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-stone-800">
                Purchased Products
              </h4>
              <div className="space-y-2">
                {selectedOrder.items?.map((it, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 bg-white border border-stone-200 rounded-xl flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 bg-stone-50 rounded-lg border border-stone-200 overflow-hidden shrink-0 flex items-center justify-center p-0.5">
                        <img
                          src={it.image}
                          alt={it.name}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <div>
                        <p className="font-bold text-stone-900">{it.name}</p>
                        <p className="text-stone-500 text-[11px]">
                          Qty: {it.quantity} × ৳{it.price.toLocaleString('en-BD')}
                        </p>
                      </div>
                    </div>
                    <span className="font-extrabold text-stone-950">
                      ৳{(it.price * it.quantity).toLocaleString('en-BD')}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Total Billing */}
            <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 space-y-1 text-xs text-stone-600">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>৳{selectedOrder.subtotal.toLocaleString('en-BD')}</span>
              </div>
              {selectedOrder.discount > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>Coupon ({selectedOrder.couponCode}):</span>
                  <span>-৳{selectedOrder.discount.toLocaleString('en-BD')}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Delivery Charge:</span>
                <span>৳{selectedOrder.deliveryCharge}</span>
              </div>
              <div className="flex justify-between text-sm font-black text-stone-950 pt-2 border-t border-stone-200">
                <span>Total Amount ({selectedOrder.paymentMethod.toUpperCase()}):</span>
                <span>৳{selectedOrder.grandTotal.toLocaleString('en-BD')}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DELETE ORDER CONFIRMATION MODAL */}
      {orderToDelete && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200"
          onClick={() => !isDeleting && setOrderToDelete(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-stone-200 animate-in zoom-in-95 duration-250 p-6 space-y-5"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-extrabold text-stone-900">
                  Delete Order #{orderToDelete.orderNumber}?
                </h3>
                <p className="text-xs text-stone-500 mt-1">
                  Are you sure you want to permanently delete this order for{' '}
                  <span className="font-bold text-stone-800">{orderToDelete.customerName}</span> (৳
                  {orderToDelete.grandTotal.toLocaleString('en-BD')})? This will immediately update your dashboard sales and statistics.
                </p>
              </div>
            </div>

            {/* Restock options */}
            {orderToDelete.status !== 'cancelled' && orderToDelete.items && orderToDelete.items.length > 0 && (
              <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200 text-xs">
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={restoreStockOnDelete}
                    onChange={(e) => setRestoreStockOnDelete(e.target.checked)}
                    className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 border-stone-300"
                  />
                  <span className="text-stone-700 font-semibold">
                    Restore purchased items back to inventory stock ({orderToDelete.items.length} item(s))
                  </span>
                </label>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-stone-100">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setOrderToDelete(null)}
                className="px-4 py-2 text-xs font-bold text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-xl transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl flex items-center gap-1.5 transition-colors shadow-sm shadow-rose-600/20 disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Confirm Delete</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
