import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  Package, 
  Layers, 
  Sliders, 
  ShoppingBag, 
  Users, 
  Settings, 
  Store, 
  Menu, 
  X, 
  LogOut,
  ShieldCheck,
  Truck
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import glocartLogo from '../../assets/images/glocart_drive_logo.png';

export type AdminTab = 'dashboard' | 'products' | 'categories' | 'sliders' | 'orders' | 'customers' | 'settings';

interface AdminLayoutProps {
  currentTab: AdminTab;
  onSelectTab: (tab: AdminTab) => void;
  onExitAdmin: () => void;
  children: React.ReactNode;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({
  currentTab,
  onSelectTab,
  onExitAdmin,
  children,
}) => {
  const { userProfile, logout } = useAuth();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const navItems: { id: AdminTab; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'products', label: 'Products Catalog', icon: Package },
    { id: 'categories', label: 'Categories', icon: Layers },
    { id: 'sliders', label: 'Sliders & Banners', icon: Sliders },
    { id: 'orders', label: 'Orders & Courier', icon: ShoppingBag },
    { id: 'customers', label: 'Customers', icon: Users },
    { id: 'settings', label: 'Store Settings', icon: Settings },
  ];

  const handleNavClick = (tab: AdminTab) => {
    onSelectTab(tab);
    setIsMobileSidebarOpen(false);
  };

  return (
    <div className="min-h-screen bg-stone-100 flex flex-col md:flex-row font-sans">
      {/* Mobile Top Header */}
      <div className="md:hidden bg-stone-900 text-white p-4 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
            className="p-1.5 rounded-lg bg-stone-800 text-stone-200"
          >
            {isMobileSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <span className="font-bold text-base">GloCart BD Admin</span>
        </div>

        <button
          onClick={onExitAdmin}
          className="px-2.5 py-1 text-xs font-bold bg-amber-500 text-stone-950 rounded-lg flex items-center gap-1"
        >
          <Store className="w-3.5 h-3.5" />
          <span>Storefront</span>
        </button>
      </div>

      {/* Sidebar (Desktop & Mobile Drawer) */}
      <aside
        className={`fixed md:sticky top-0 h-screen w-64 bg-stone-900 text-stone-300 flex flex-col justify-between z-50 transition-transform duration-200 ${
          isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Top brand */}
        <div className="p-5 border-b border-stone-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <img
                src={glocartLogo}
                alt="GloCart BD Logo"
                referrerPolicy="no-referrer"
                className="w-9 h-9 rounded-xl object-cover shadow-md shadow-amber-500/20 shrink-0"
              />
              <div>
                <h1 className="font-extrabold text-white text-base leading-tight">GloCart BD</h1>
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                  Control Center
                </span>
              </div>
            </div>
            <button
              onClick={() => setIsMobileSidebarOpen(false)}
              className="md:hidden text-stone-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation list */}
        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                id={`admin-nav-${item.id}`}
                onClick={() => handleNavClick(item.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  isActive
                    ? 'bg-amber-500 text-stone-950 shadow-md shadow-amber-500/10'
                    : 'text-stone-400 hover:text-stone-100 hover:bg-stone-800'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-stone-950' : 'text-stone-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Bottom User info & Exit */}
        <div className="p-4 border-t border-stone-800 space-y-2.5 bg-stone-950/40">
          <button
            id="btn-admin-exit-store"
            onClick={onExitAdmin}
            className="w-full py-2 px-3 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors"
          >
            <Store className="w-4 h-4 text-amber-400" />
            <span>Go to Public Store</span>
          </button>

          <div className="flex items-center justify-between pt-2 border-t border-stone-800/80 text-xs">
            <div className="truncate min-w-0 pr-2">
              <p className="font-bold text-stone-200 truncate">{userProfile?.name || 'Admin User'}</p>
              <p className="text-[10px] text-stone-500 truncate">{userProfile?.email || 'admin@glocartbd.com'}</p>
            </div>
            <button
              onClick={() => {
                logout();
                onExitAdmin();
              }}
              className="p-1.5 text-stone-400 hover:text-rose-400 rounded-lg transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Viewport */}
      <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 overflow-y-auto">
        <div className="max-w-6xl mx-auto">{children}</div>
      </main>
    </div>
  );
};
