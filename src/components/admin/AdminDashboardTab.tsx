import React, { useState, useEffect } from 'react';
import { 
  DollarSign, 
  ShoppingBag, 
  Users, 
  Package, 
  AlertTriangle, 
  TrendingUp, 
  CheckCircle2, 
  Clock, 
  ArrowUpRight,
  Eye,
  Loader2,
  Calendar
} from 'lucide-react';
import { collection, onSnapshot, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Order, Product, UserProfile } from '../../types';

interface AdminDashboardTabProps {
  onNavigateTab: (tab: 'products' | 'orders' | 'customers') => void;
}

export const AdminDashboardTab: React.FC<AdminDashboardTabProps> = ({ onNavigateTab }) => {
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customersCount, setCustomersCount] = useState(0);

  useEffect(() => {
    // Real-time listener for orders
    const unsubOrders = onSnapshot(
      collection(db, 'orders'),
      (snap) => {
        const ordersList: Order[] = [];
        snap.forEach((doc) => {
          ordersList.push({ id: doc.id, ...doc.data() } as Order);
        });
        setOrders(ordersList);
        setLoading(false);
      },
      (err) => {
        console.warn('Dashboard orders listener note:', err);
        setLoading(false);
      }
    );

    // Real-time listener for products
    const unsubProducts = onSnapshot(
      collection(db, 'products'),
      (snap) => {
        const prodList: Product[] = [];
        snap.forEach((doc) => {
          prodList.push({ id: doc.id, ...doc.data() } as Product);
        });
        setProducts(prodList);
      },
      (err) => {
        console.warn('Dashboard products listener note:', err);
      }
    );

    // Real-time listener for users / customers
    const unsubUsers = onSnapshot(
      collection(db, 'users'),
      (snap) => {
        setCustomersCount(snap.size);
      },
      (err) => {
        console.warn('Dashboard users listener note:', err);
      }
    );

    return () => {
      unsubOrders();
      unsubProducts();
      unsubUsers();
    };
  }, []);

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-stone-400 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
        <p className="text-sm font-semibold">Calculating real-time store analytics...</p>
      </div>
    );
  }

  // Calculate metrics
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

  let todaySales = 0;
  let todayOrdersCount = 0;
  let totalSales = 0;
  let completedOrdersCount = 0;

  const validOrders = orders.filter((o) => o.status !== 'cancelled');

  orders.forEach((o) => {
    const orderTime = o.createdAt?.toMillis?.() || 0;
    if (o.status !== 'cancelled') {
      totalSales += o.grandTotal || 0;
      if (orderTime >= startOfToday) {
        todaySales += o.grandTotal || 0;
        todayOrdersCount++;
      }
    }
    if (o.status === 'delivered') {
      completedOrdersCount++;
    }
  });

  const totalOrdersCount = orders.length;
  const avgOrderValue = validOrders.length > 0 ? Math.round(totalSales / validOrders.length) : 0;

  const activeProducts = products.filter((p) => p.active).length;
  const lowStockProducts = products.filter((p) => p.stock > 0 && p.stock <= 5).length;
  const outOfStockProducts = products.filter((p) => p.stock <= 0).length;

  // Recent 6 orders
  const recentOrders = [...orders]
    .sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0))
    .slice(0, 6);

  // Status breakdown
  const statusCounts = {
    pending: orders.filter((o) => o.status === 'pending').length,
    processing: orders.filter((o) => o.status === 'processing').length,
    shipped: orders.filter((o) => o.status === 'shipped').length,
    delivered: orders.filter((o) => o.status === 'delivered').length,
    cancelled: orders.filter((o) => o.status === 'cancelled').length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight">
            Store Performance Overview
          </h2>
          <p className="text-xs text-stone-500">
            Real-time sales, order fulfillment, and inventory analytics across Bangladesh.
          </p>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Today's Sales */}
        <div className="p-4 bg-white rounded-2xl border border-stone-200/80 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs text-stone-500 font-semibold">
            <span>Today's Sales</span>
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
              ৳
            </div>
          </div>
          <p className="text-lg sm:text-2xl font-black text-stone-900">
            ৳{todaySales.toLocaleString('en-BD')}
          </p>
          <p className="text-[11px] text-stone-400 font-medium">
            {todayOrdersCount} order(s) today
          </p>
        </div>

        {/* Total Sales */}
        <div className="p-4 bg-white rounded-2xl border border-stone-200/80 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs text-stone-500 font-semibold">
            <span>Total Lifetime Sales</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <p className="text-lg sm:text-2xl font-black text-emerald-900">
            ৳{totalSales.toLocaleString('en-BD')}
          </p>
          <p className="text-[11px] text-stone-400 font-medium">
            From {validOrders.length} valid orders
          </p>
        </div>

        {/* Total Orders */}
        <div className="p-4 bg-white rounded-2xl border border-stone-200/80 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs text-stone-500 font-semibold">
            <span>Total Orders</span>
            <div className="w-8 h-8 rounded-xl bg-sky-100 text-sky-800 flex items-center justify-center">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <p className="text-lg sm:text-2xl font-black text-stone-900">
            {totalOrdersCount}
          </p>
          <p className="text-[11px] text-stone-400 font-medium">
            {completedOrdersCount} Delivered
          </p>
        </div>

        {/* Average Order Value */}
        <div className="p-4 bg-white rounded-2xl border border-stone-200/80 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs text-stone-500 font-semibold">
            <span>Avg. Order Value</span>
            <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center font-bold">
              AOV
            </div>
          </div>
          <p className="text-lg sm:text-2xl font-black text-stone-900">
            ৳{avgOrderValue.toLocaleString('en-BD')}
          </p>
          <p className="text-[11px] text-stone-400 font-medium">
            Per customer cart
          </p>
        </div>
      </div>

      {/* Secondary Stats Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div 
          onClick={() => onNavigateTab('customers')}
          className="p-3 bg-white hover:bg-stone-50 rounded-2xl border border-stone-200/80 flex items-center gap-3 cursor-pointer transition-colors"
        >
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-stone-500">Customers</span>
            <p className="text-base font-black text-stone-900">{customersCount}</p>
          </div>
        </div>

        <div 
          onClick={() => onNavigateTab('products')}
          className="p-3 bg-white hover:bg-stone-50 rounded-2xl border border-stone-200/80 flex items-center gap-3 cursor-pointer transition-colors"
        >
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <Package className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-stone-500">Active Products</span>
            <p className="text-base font-black text-stone-900">{activeProducts}</p>
          </div>
        </div>

        <div 
          onClick={() => onNavigateTab('products')}
          className="p-3 bg-white hover:bg-stone-50 rounded-2xl border border-stone-200/80 flex items-center gap-3 cursor-pointer transition-colors"
        >
          <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-stone-500">Low Stock</span>
            <p className="text-base font-black text-amber-700">{lowStockProducts}</p>
          </div>
        </div>

        <div 
          onClick={() => onNavigateTab('products')}
          className="p-3 bg-white hover:bg-stone-50 rounded-2xl border border-stone-200/80 flex items-center gap-3 cursor-pointer transition-colors"
        >
          <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-stone-500">Out of Stock</span>
            <p className="text-base font-black text-rose-700">{outOfStockProducts}</p>
          </div>
        </div>
      </div>

      {/* Order Status Breakdown & Fulfillment Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Status Distribution */}
        <div className="p-5 bg-white rounded-3xl border border-stone-200/80 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-stone-900 uppercase tracking-wider">
            Order Status Breakdown
          </h3>

          <div className="space-y-2.5 text-xs">
            <div className="flex items-center justify-between p-2 rounded-xl bg-amber-50/60 border border-amber-200/60">
              <span className="font-bold text-amber-900">Pending Orders</span>
              <span className="font-black px-2 py-0.5 bg-amber-200 text-amber-900 rounded-md">
                {statusCounts.pending}
              </span>
            </div>

            <div className="flex items-center justify-between p-2 rounded-xl bg-blue-50/60 border border-blue-200/60">
              <span className="font-bold text-blue-900">Processing</span>
              <span className="font-black px-2 py-0.5 bg-blue-200 text-blue-900 rounded-md">
                {statusCounts.processing}
              </span>
            </div>

            <div className="flex items-center justify-between p-2 rounded-xl bg-sky-50/60 border border-sky-200/60">
              <span className="font-bold text-sky-900">Shipped (Steadfast)</span>
              <span className="font-black px-2 py-0.5 bg-sky-200 text-sky-900 rounded-md">
                {statusCounts.shipped}
              </span>
            </div>

            <div className="flex items-center justify-between p-2 rounded-xl bg-emerald-50/60 border border-emerald-200/60">
              <span className="font-bold text-emerald-900">Delivered</span>
              <span className="font-black px-2 py-0.5 bg-emerald-200 text-emerald-900 rounded-md">
                {statusCounts.delivered}
              </span>
            </div>

            <div className="flex items-center justify-between p-2 rounded-xl bg-rose-50/60 border border-rose-200/60">
              <span className="font-bold text-rose-900">Cancelled / Restored</span>
              <span className="font-black px-2 py-0.5 bg-rose-200 text-rose-900 rounded-md">
                {statusCounts.cancelled}
              </span>
            </div>
          </div>
        </div>

        {/* Recent Orders Stream */}
        <div className="lg:col-span-2 p-5 bg-white rounded-3xl border border-stone-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-stone-900 uppercase tracking-wider">
              Recent Orders
            </h3>
            <button
              onClick={() => onNavigateTab('orders')}
              className="text-xs font-bold text-amber-700 hover:text-amber-800 flex items-center gap-1"
            >
              <span>Manage All</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {recentOrders.length === 0 ? (
            <div className="py-8 text-center text-stone-400 text-xs">
              No orders registered yet. New customer orders will show here in real-time.
            </div>
          ) : (
            <div className="space-y-2 overflow-x-auto">
              {recentOrders.map((ord) => (
                <div
                  key={ord.id}
                  className="p-3 bg-stone-50 hover:bg-stone-100 rounded-2xl border border-stone-200/80 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="min-w-0">
                    <p className="font-black text-stone-900">{ord.orderNumber}</p>
                    <p className="text-[11px] text-stone-500 truncate">
                      {ord.customerName} • {ord.district}
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <p className="font-extrabold text-stone-950">৳{ord.grandTotal.toLocaleString('en-BD')}</p>
                    <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-md capitalize ${
                      ord.status === 'delivered' ? 'bg-emerald-100 text-emerald-800' :
                      ord.status === 'cancelled' ? 'bg-rose-100 text-rose-800' :
                      ord.status === 'shipped' ? 'bg-sky-100 text-sky-800' :
                      'bg-amber-100 text-amber-800'
                    }`}>
                      {ord.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
