import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, ShoppingBag, ArrowRight } from 'lucide-react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { SliderBanner } from '../types';

interface HeroSliderProps {
  onShopNowClick: () => void;
}

export const HeroSlider: React.FC<HeroSliderProps> = ({ onShopNowClick }) => {
  const [sliders, setSliders] = useState<SliderBanner[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const fetchSliders = async () => {
      try {
        const snap = await getDocs(collection(db, 'sliders'));
        const list: SliderBanner[] = [];
        snap.forEach((d) => {
          const s = { id: d.id, ...d.data() } as SliderBanner;
          if (s.active) list.push(s);
        });
        list.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
        if (list.length > 0) {
          setSliders(list);
        } else {
          // Fallback banner
          setSliders([
            {
              id: 'default-1',
              title: 'Mega Gadget & Lifestyle Festival 2025',
              subtitle: 'Exclusive discounts on smart devices, audio gear, and electronics across 64 districts.',
              image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=1400&q=80',
              buttonText: 'Explore Hot Deals',
              buttonLink: '',
              sortOrder: 1,
              active: true,
            },
            {
              id: 'default-2',
              title: 'Premium Smart Watches & Fitness Bands',
              subtitle: 'Waterproof AMOLED displays, health sensors & instant cash on delivery in Bangladesh.',
              image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=1400&q=80',
              buttonText: 'Shop Wearables',
              buttonLink: '',
              sortOrder: 2,
              active: true,
            },
          ]);
        }
      } catch (err) {
        console.warn('Slider fetch fallback:', err);
      }
    };

    fetchSliders();
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

  const current = sliders[currentIndex];

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev === 0 ? sliders.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % sliders.length);
  };

  return (
    <div className="relative w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4 sm:mt-6">
      <div className="relative h-[220px] sm:h-[320px] md:h-[400px] lg:h-[440px] rounded-3xl overflow-hidden shadow-xl border border-stone-200/80 bg-stone-900">
        {/* Background Image */}
        <img
          src={current.image}
          alt={current.title || 'GloCart BD Banner'}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover transition-all duration-700 brightness-75 scale-100 hover:scale-102"
        />

        {/* Gradient Overlay & Content */}
        <div className="absolute inset-0 bg-gradient-to-r from-stone-950/90 via-stone-950/60 to-transparent flex items-center p-6 sm:p-10 md:p-14">
          <div className="max-w-xl space-y-3 sm:space-y-4">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500 text-stone-950 font-black text-[10px] sm:text-xs rounded-full uppercase tracking-wider shadow-sm">
              Featured Campaign
            </span>

            <h2 className="text-xl sm:text-3xl md:text-4xl lg:text-5xl font-black text-white leading-tight sm:leading-none tracking-tight">
              {current.title}
            </h2>

            {current.subtitle && (
              <p className="text-xs sm:text-sm md:text-base text-stone-300 line-clamp-2 max-w-lg">
                {current.subtitle}
              </p>
            )}

            <div className="pt-2">
              <button
                onClick={onShopNowClick}
                className="px-5 sm:px-7 py-2.5 sm:py-3.5 bg-amber-500 hover:bg-amber-600 active:scale-98 text-stone-950 font-black text-xs sm:text-sm rounded-2xl shadow-lg shadow-amber-500/25 transition-all flex items-center gap-2"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>{current.buttonText || 'Shop Now'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Carousel arrows (visible on md+) */}
        {sliders.length > 1 && (
          <>
            <button
              onClick={handlePrev}
              className="absolute left-4 top-1/2 -translate-y-1/2 w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-black/40 hover:bg-black/80 text-white backdrop-blur-xs flex items-center justify-center transition-all"
              aria-label="Previous banner"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={handleNext}
              className="absolute right-4 top-1/2 -translate-y-1/2 w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-black/40 hover:bg-black/80 text-white backdrop-blur-xs flex items-center justify-center transition-all"
              aria-label="Next banner"
            >
              <ChevronRight className="w-5 h-5" />
            </button>

            {/* Dot Indicators */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2">
              {sliders.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentIndex(idx)}
                  className={`h-2 rounded-full transition-all ${
                    currentIndex === idx
                      ? 'w-7 bg-amber-500'
                      : 'w-2 bg-white/50 hover:bg-white/80'
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
