import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, ShoppingBag, ArrowRight, Sparkles } from 'lucide-react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { SliderBanner } from '../types';

interface HeroSliderProps {
  onShopNowClick: () => void;
  onSelectCategory?: (categoryId: string) => void;
}

export const HeroSlider: React.FC<HeroSliderProps> = ({ onShopNowClick, onSelectCategory }) => {
  const [sliders, setSliders] = useState<SliderBanner[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    // Real-time listener for sliders so admin changes reflect immediately without page reload
    const unsub = onSnapshot(
      collection(db, 'sliders'),
      (snap) => {
        const list: SliderBanner[] = [];
        snap.forEach((d) => {
          const s = { id: d.id, ...d.data() } as SliderBanner;
          if (s.active !== false) list.push(s);
        });
        list.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

        if (list.length > 0) {
          setSliders(list);
        } else {
          // Fallback banners if none in database
          setSliders([
            {
              id: 'default-1',
              title: 'Mega Gadget & Lifestyle Festival 2026',
              subtitle: 'Exclusive discounts on smart devices, audio gear, and electronics across 64 districts.',
              image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=1400&q=80',
              badge: '🔥 HOT DEALS • 40% OFF',
              badgeColor: 'amber',
              buttonText: 'Explore Hot Deals',
              buttonTarget: 'cat-audio',
              buttonLink: '',
              sortOrder: 1,
              active: true,
            },
            {
              id: 'default-2',
              title: 'Premium Smart Watches & Fitness Bands',
              subtitle: 'Waterproof AMOLED displays, health sensors & instant cash on delivery in Bangladesh.',
              image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=1400&q=80',
              badge: '⚡ FLASH SALE',
              badgeColor: 'emerald',
              buttonText: 'Shop Wearables',
              buttonTarget: 'cat-smartphones',
              buttonLink: '',
              sortOrder: 2,
              active: true,
            },
          ]);
        }
      },
      (err) => {
        console.warn('Slider fetch fallback:', err);
      }
    );

    return () => unsub();
  }, []);

  // Auto rotate every 5 seconds
  useEffect(() => {
    if (sliders.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % sliders.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [sliders.length]);

  if (sliders.length === 0) return null;

  // Safe index bounds
  const activeIndex = currentIndex >= sliders.length ? 0 : currentIndex;
  const current = sliders[activeIndex];

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev === 0 ? sliders.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % sliders.length);
  };

  const handleActionClick = () => {
    if (current.categorySlug || current.buttonTarget) {
      const targetCat = current.categorySlug || current.buttonTarget;
      if (targetCat && onSelectCategory) {
        onSelectCategory(targetCat);
        return;
      }
    }

    if (current.buttonLink && current.buttonLink.startsWith('http')) {
      window.open(current.buttonLink, '_blank', 'noopener,noreferrer');
      return;
    }

    onShopNowClick();
  };

  const getBadgeClass = (color?: string) => {
    switch (color) {
      case 'emerald':
        return 'bg-emerald-500 text-white';
      case 'rose':
        return 'bg-rose-500 text-white';
      case 'indigo':
        return 'bg-indigo-600 text-white';
      case 'purple':
        return 'bg-purple-600 text-white';
      case 'blue':
        return 'bg-blue-600 text-white';
      case 'amber':
      default:
        return 'bg-amber-500 text-stone-950';
    }
  };

  const getOverlayClass = (style?: string) => {
    switch (style) {
      case 'subtle':
        return 'from-stone-950/70 via-stone-950/40 to-transparent';
      case 'vibrant':
        return 'from-stone-950/95 via-amber-950/50 to-transparent';
      case 'minimal':
        return 'from-stone-950/60 via-stone-950/20 to-transparent';
      case 'dark':
      default:
        return 'from-stone-950/90 via-stone-950/60 to-transparent';
    }
  };

  return (
    <div className="relative w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4 sm:mt-6">
      <div className="relative h-[240px] sm:h-[340px] md:h-[400px] lg:h-[450px] rounded-3xl overflow-hidden shadow-xl border border-stone-200/80 bg-stone-900 group">
        {/* Background Image */}
        <img
          src={current.image}
          alt={current.title || 'GloCart BD Banner'}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover transition-all duration-700 brightness-80 scale-100 group-hover:scale-102"
        />

        {/* Gradient Overlay & Content */}
        <div
          className={`absolute inset-0 bg-gradient-to-r ${getOverlayClass(
            current.overlayStyle
          )} flex items-center p-6 sm:p-10 md:p-14`}
        >
          <div className="max-w-xl space-y-3 sm:space-y-4">
            {/* Banner Badge */}
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 font-black text-[10px] sm:text-xs rounded-full uppercase tracking-wider shadow-sm ${getBadgeClass(
                current.badgeColor
              )}`}
            >
              <Sparkles className="w-3 h-3 shrink-0" />
              <span>{current.badge || 'Featured Campaign'}</span>
            </span>

            {/* Headline */}
            <h2 className="text-xl sm:text-3xl md:text-4xl lg:text-5xl font-black text-white leading-tight sm:leading-tight tracking-tight drop-shadow-sm">
              {current.title}
            </h2>

            {/* Subtitle */}
            {current.subtitle && (
              <p className="text-xs sm:text-sm md:text-base text-stone-200 line-clamp-2 max-w-lg font-medium drop-shadow-xs">
                {current.subtitle}
              </p>
            )}

            {/* CTA Button */}
            <div className="pt-2">
              <button
                onClick={handleActionClick}
                className="px-5 sm:px-7 py-2.5 sm:py-3.5 bg-amber-500 hover:bg-amber-600 active:scale-98 text-stone-950 font-black text-xs sm:text-sm rounded-2xl shadow-lg shadow-amber-500/25 transition-all flex items-center gap-2"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>{current.buttonText || 'Shop Now'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Carousel arrows */}
        {sliders.length > 1 && (
          <>
            <button
              onClick={handlePrev}
              className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-black/40 hover:bg-black/80 text-white backdrop-blur-xs flex items-center justify-center transition-all opacity-80 hover:opacity-100 shadow-md"
              aria-label="Previous banner"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={handleNext}
              className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-black/40 hover:bg-black/80 text-white backdrop-blur-xs flex items-center justify-center transition-all opacity-80 hover:opacity-100 shadow-md"
              aria-label="Next banner"
            >
              <ChevronRight className="w-5 h-5" />
            </button>

            {/* Dot Indicators */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/30 backdrop-blur-xs px-3 py-1.5 rounded-full">
              {sliders.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentIndex(idx)}
                  className={`h-2 rounded-full transition-all ${
                    activeIndex === idx
                      ? 'w-7 bg-amber-500'
                      : 'w-2 bg-white/50 hover:bg-white/90'
                  }`}
                  aria-label={`Go to slide ${idx + 1}`}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
