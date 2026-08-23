import React from 'react';
import { 
  PhoneCall, 
  Mail, 
  MapPin, 
  Clock, 
  Facebook, 
  ShieldCheck, 
  Truck, 
  RotateCcw,
  Sparkles,
  CreditCard
} from 'lucide-react';
import { useCart } from '../context/CartContext';

interface FooterProps {
  onOpenTracking: () => void;
  onSelectCategory: (categoryId: string) => void;
  onOpenAdmin?: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onOpenTracking, onSelectCategory, onOpenAdmin }) => {
  const { storeSettings } = useCart();

  return (
    <footer className="bg-stone-900 text-stone-300 border-t border-stone-800 pt-12 pb-8 mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Top 3 Value Props */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pb-8 border-b border-stone-800 text-stone-200">
          <div className="flex items-center gap-3.5 p-4 rounded-2xl bg-stone-800/50 border border-stone-700/60">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">Fast Nationwide Delivery</h4>
              <p className="text-xs text-stone-400">Steadfast Courier to 64 Districts across Bangladesh</p>
            </div>
          </div>

          <div className="flex items-center gap-3.5 p-4 rounded-2xl bg-stone-800/50 border border-stone-700/60">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">100% Genuine Guarantee</h4>
              <p className="text-xs text-stone-400">Authentic products with official warranty & cash on delivery</p>
            </div>
          </div>

          <div className="flex items-center gap-3.5 p-4 rounded-2xl bg-stone-800/50 border border-stone-700/60">
            <div className="w-10 h-10 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center shrink-0">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">Hassle-Free Returns</h4>
              <p className="text-xs text-stone-400">7-day replacement for any verified defect or issue</p>
            </div>
          </div>
        </div>

        {/* Main Footer Links & Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand Col */}
          <div className="space-y-4 md:col-span-1">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-amber-500 text-stone-950 font-black flex items-center justify-center text-base">
                G
              </div>
              <span className="font-bold text-lg text-white tracking-tight">
                GloCart<span className="text-amber-500">BD</span>
              </span>
            </div>
            <p className="text-xs text-stone-400 leading-relaxed">
              {storeSettings.footerDescription ||
                'GloCart BD is your trusted online shopping destination in Bangladesh, delivering quality products with reliability.'}
            </p>
            {storeSettings.facebook && (
              <a
                href={storeSettings.facebook}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-medium transition-colors"
              >
                <Facebook className="w-4 h-4 text-blue-400" />
                <span>Follow on Facebook</span>
              </a>
            )}
          </div>

          {/* Quick Links */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Quick Services</h4>
            <ul className="space-y-2 text-xs text-stone-400">
              <li>
                <button
                  onClick={onOpenTracking}
                  className="hover:text-amber-400 transition-colors flex items-center gap-1.5"
                >
                  <Truck className="w-3.5 h-3.5" /> Track Shipment
                </button>
              </li>
              <li>
                <button
                  onClick={() => onSelectCategory('all')}
                  className="hover:text-amber-400 transition-colors"
                >
                  All Products
                </button>
              </li>
              <li>
                <span className="text-stone-500">Cash on Delivery Available</span>
              </li>
              <li>
                <span className="text-stone-500">Official Brand Warranty</span>
              </li>
            </ul>
          </div>

          {/* Contact & Support */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Customer Support</h4>
            <ul className="space-y-2.5 text-xs text-stone-400">
              <li className="flex items-start gap-2">
                <PhoneCall className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <span className="text-stone-200 font-semibold">{storeSettings.phone}</span>
              </li>
              <li className="flex items-start gap-2">
                <Mail className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <span>{storeSettings.email}</span>
              </li>
              <li className="flex items-start gap-2">
                <Clock className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <span>{storeSettings.supportHours}</span>
              </li>
            </ul>
          </div>

          {/* Store Address & Logistics */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Store Location</h4>
            <div className="flex items-start gap-2 text-xs text-stone-400">
              <MapPin className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <p className="leading-relaxed">{storeSettings.address}</p>
            </div>

            <div className="pt-3">
              <p className="text-[11px] font-bold text-stone-400 uppercase tracking-wider mb-2">
                Accepted Payment Methods
              </p>
              <div className="flex items-center gap-2 flex-wrap text-xs">
                <span className="px-2.5 py-1 bg-stone-800 text-stone-200 font-bold rounded-md border border-stone-700">
                  Cash on Delivery
                </span>
                <span className="px-2.5 py-1 bg-pink-950 text-pink-300 font-bold rounded-md border border-pink-800">
                  bKash
                </span>
                <span className="px-2.5 py-1 bg-orange-950 text-orange-300 font-bold rounded-md border border-orange-800">
                  Nagad
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom copyright */}
        <div className="pt-8 border-t border-stone-800 flex items-center justify-between flex-wrap gap-4 text-xs text-stone-500">
          <p>© {new Date().getFullYear()} {storeSettings.storeName}. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <span className="text-stone-400">Steadfast Courier Delivery 64 Districts</span>
            {onOpenAdmin && (
              <button
                id="btn-footer-admin-portal"
                onClick={onOpenAdmin}
                className="text-stone-400 hover:text-amber-400 underline transition-colors"
              >
                Admin Portal
              </button>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
};
