import React, { useState } from 'react';
import { 
  X, 
  Star, 
  ShoppingBag, 
  Zap, 
  CheckCircle2, 
  Truck, 
  ShieldCheck, 
  RotateCcw, 
  Plus, 
  Minus,
  Sparkles,
  Maximize2
} from 'lucide-react';
import { Product } from '../types';
import { useCart } from '../context/CartContext';

interface ProductModalProps {
  product: Product | null;
  isOpen?: boolean;
  onClose: () => void;
  onInstantBuy?: (product: Product, quantity: number) => void;
  onCheckoutNow?: () => void;
}

export const ProductModal: React.FC<ProductModalProps> = ({
  product,
  isOpen,
  onClose,
  onInstantBuy,
  onCheckoutNow,
}) => {
  if (!product || isOpen === false) return null;

  const { addToCart, setIsCartOpen } = useCart();
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [addFeedback, setAddFeedback] = useState(false);
  const [isZoomOpen, setIsZoomOpen] = useState(false);

  // Combine primaryImage and all images array
  const allImages = React.useMemo(() => {
    const list: string[] = [];
    if (product.primaryImage) list.push(product.primaryImage);
    if (product.images && product.images.length > 0) {
      product.images.forEach((img) => {
        if (img.url && !list.includes(img.url)) {
          list.push(img.url);
        }
      });
    }
    if (list.length === 0) {
      list.push('https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80');
    }
    return list;
  }, [product]);

  const currentImage = allImages[selectedImageIndex] || allImages[0];
  const isOutOfStock = product.stock <= 0;

  const discountPercent = product.oldPrice && product.oldPrice > product.price
    ? Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100)
    : 0;

  const handleAddToCart = () => {
    if (isOutOfStock) return;
    const success = addToCart(product, quantity);
    if (success) {
      setAddFeedback(true);
      setTimeout(() => setAddFeedback(false), 1500);
    }
  };

  const handleBuyNow = () => {
    if (isOutOfStock) return;
    addToCart(product, quantity);
    if (typeof onInstantBuy === 'function') {
      onInstantBuy(product, quantity);
    }
    if (typeof onCheckoutNow === 'function') {
      onCheckoutNow();
    }
  };

  return (
    <div 
      id="product-details-modal-overlay"
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        id="product-details-modal-content"
        onClick={(e) => e.stopPropagation()}
        className="bg-white w-full sm:max-w-3xl md:max-w-4xl rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] sm:max-h-[85vh] flex flex-col animate-in slide-in-from-bottom-8 duration-300 border border-stone-200"
      >
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-stone-100 bg-stone-50/50">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">
              {product.categoryName || 'Product Details'}
            </span>
            {product.badge && (
              <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-500 text-stone-950 rounded-full">
                {product.badge}
              </span>
            )}
          </div>
          <button
            id="btn-close-product-modal"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-stone-200 text-stone-500 hover:text-stone-900 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="overflow-y-auto p-4 sm:p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left Column: Multi-Photo Gallery */}
          <div className="space-y-3">
            {/* Main Stage Image - Full uncropped photo show */}
            <div className="relative aspect-square w-full rounded-2xl bg-stone-50 overflow-hidden border border-stone-200 shadow-inner flex items-center justify-center p-3 group">
              <img
                src={currentImage}
                alt={product.name}
                referrerPolicy="no-referrer"
                className="w-full h-full object-contain object-center transition-all duration-300"
              />
              {discountPercent > 0 && (
                <div className="absolute top-3 left-3 bg-rose-600 text-white font-black text-xs px-2.5 py-1 rounded-lg shadow-md">
                  SAVE {discountPercent}%
                </div>
              )}
              {/* Full Photo Zoom Button */}
              <button
                type="button"
                onClick={() => setIsZoomOpen(true)}
                className="absolute bottom-3 right-3 px-2.5 py-1.5 bg-white/90 hover:bg-white text-stone-700 hover:text-stone-950 rounded-xl shadow-md transition-all opacity-85 hover:opacity-100 flex items-center gap-1.5 text-xs font-semibold border border-stone-200/80 cursor-pointer"
                title="Click to view full photo in full screen"
              >
                <Maximize2 className="w-3.5 h-3.5 text-amber-600" />
                <span>Full Photo</span>
              </button>
            </div>

            {/* Thumbnail Carousel (Mobile & Desktop) */}
            {allImages.length > 1 && (
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
                {allImages.map((imgUrl, index) => (
                  <button
                    key={index}
                    id={`thumb-photo-${index}`}
                    onClick={() => setSelectedImageIndex(index)}
                    className={`relative w-16 h-16 sm:w-20 sm:h-20 shrink-0 rounded-xl overflow-hidden border-2 transition-all p-1 bg-stone-50 flex items-center justify-center ${
                      selectedImageIndex === index
                        ? 'border-amber-600 scale-95 shadow-md bg-amber-50/40'
                        : 'border-stone-200 hover:border-stone-300 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img
                      src={imgUrl}
                      alt={`Photo ${index + 1}`}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-contain"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right Column: Information & Actions */}
          <div className="flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <h2 className="text-lg sm:text-2xl font-bold text-stone-900 leading-snug">
                {product.name}
              </h2>

              {/* Rating & Reviews */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 bg-amber-50 px-2 py-1 rounded-lg border border-amber-200">
                  <Star className="w-4 h-4 fill-amber-400 text-amber-500" />
                  <span className="text-xs font-bold text-stone-900">{product.rating || 4.8}</span>
                </div>
                <span className="text-xs text-stone-500">
                  ({product.reviews || 42} Customer Reviews)
                </span>
                <span className="text-stone-300">•</span>
                <span className={`text-xs font-bold ${product.stock > 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                  {product.stock > 0 ? `In Stock (${product.stock} available)` : 'Out of Stock'}
                </span>
              </div>

              {/* Price Details */}
              <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200/80 flex items-baseline gap-3">
                <span className="text-2xl sm:text-3xl font-black text-stone-950">
                  ৳{product.price.toLocaleString('en-BD')}
                </span>
                {product.oldPrice && product.oldPrice > product.price && (
                  <span className="text-sm sm:text-base text-stone-400 line-through">
                    ৳{product.oldPrice.toLocaleString('en-BD')}
                  </span>
                )}
                {discountPercent > 0 && (
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">
                    ৳{(product.oldPrice! - product.price).toLocaleString('en-BD')} Off
                  </span>
                )}
              </div>

              {/* Description */}
              <div>
                <p className="text-xs font-bold text-stone-900 uppercase tracking-wider mb-1">
                  Product Overview
                </p>
                <p className="text-xs sm:text-sm text-stone-600 leading-relaxed whitespace-pre-line">
                  {product.description || 'Premium genuine product with official warranty and nationwide delivery.'}
                </p>
              </div>

              {/* Quantity Selector */}
              {!isOutOfStock && (
                <div className="flex items-center gap-3 pt-2">
                  <span className="text-xs font-bold text-stone-800">Quantity:</span>
                  <div className="flex items-center border border-stone-300 rounded-xl overflow-hidden bg-white shadow-xs">
                    <button
                      id="btn-modal-qty-decrease"
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                      className="px-3 py-1.5 hover:bg-stone-100 text-stone-600 transition-colors"
                      disabled={quantity <= 1}
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="px-4 py-1 text-xs font-bold text-stone-900 min-w-[32px] text-center">
                      {quantity}
                    </span>
                    <button
                      id="btn-modal-qty-increase"
                      onClick={() => setQuantity((q) => Math.min(product.stock, q + 1))}
                      className="px-3 py-1.5 hover:bg-stone-100 text-stone-600 transition-colors"
                      disabled={quantity >= product.stock}
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="space-y-2.5 pt-4 border-t border-stone-100">
              <div className="grid grid-cols-2 gap-3">
                <button
                  id="btn-modal-add-cart"
                  onClick={handleAddToCart}
                  disabled={isOutOfStock}
                  className={`py-3 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                    isOutOfStock
                      ? 'bg-stone-100 text-stone-400 cursor-not-allowed'
                      : addFeedback
                      ? 'bg-emerald-600 text-white'
                      : 'bg-stone-900 hover:bg-black text-white shadow-md'
                  }`}
                >
                  <ShoppingBag className="w-4 h-4 text-amber-400" />
                  <span>{addFeedback ? 'Added to Cart ✓' : 'Add to Cart'}</span>
                </button>

                <button
                  id="btn-modal-buy-now"
                  onClick={handleBuyNow}
                  disabled={isOutOfStock}
                  className={`py-3 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-md transition-all ${
                    isOutOfStock
                      ? 'bg-stone-200 text-stone-400 cursor-not-allowed'
                      : 'bg-amber-500 hover:bg-amber-600 text-stone-950 hover:scale-102'
                  }`}
                >
                  <Zap className="w-4 h-4 fill-stone-950" />
                  <span>Buy Now</span>
                </button>
              </div>

              {/* Bangladesh Trust Badges */}
              <div className="grid grid-cols-3 gap-2 pt-2 text-stone-600 text-[11px]">
                <div className="flex items-center gap-1.5 bg-stone-50 p-2 rounded-lg border border-stone-200/60">
                  <Truck className="w-4 h-4 text-amber-600 shrink-0" />
                  <span className="leading-tight">Cash on Delivery</span>
                </div>
                <div className="flex items-center gap-1.5 bg-stone-50 p-2 rounded-lg border border-stone-200/60">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="leading-tight">100% Genuine</span>
                </div>
                <div className="flex items-center gap-1.5 bg-stone-50 p-2 rounded-lg border border-stone-200/60">
                  <RotateCcw className="w-4 h-4 text-sky-600 shrink-0" />
                  <span className="leading-tight">7 Days Return</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Full-Screen Zoom Photo Modal (Full Show 100% Uncropped) */}
      {isZoomOpen && (
        <div
          id="product-photo-zoom-modal"
          onClick={() => setIsZoomOpen(false)}
          className="fixed inset-0 z-60 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4 animate-in fade-in duration-200"
        >
          {/* Top Bar */}
          <div 
            onClick={(e) => e.stopPropagation()} 
            className="w-full max-w-4xl flex items-center justify-between text-white pb-3 border-b border-white/10"
          >
            <div>
              <p className="text-sm font-bold truncate">{product.name}</p>
              <p className="text-xs text-stone-400">
                Photo {selectedImageIndex + 1} of {allImages.length} (Full High-Resolution View)
              </p>
            </div>
            <button
              onClick={() => setIsZoomOpen(false)}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              title="Close Full Photo"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Full Photo Container */}
          <div 
            onClick={(e) => e.stopPropagation()}
            className="relative flex-1 w-full max-w-4xl flex items-center justify-center p-2 sm:p-6 overflow-hidden"
          >
            <img
              src={currentImage}
              alt={product.name}
              referrerPolicy="no-referrer"
              className="max-w-full max-h-[80vh] object-contain rounded-xl shadow-2xl drop-shadow-2xl"
            />
          </div>

          {/* Bottom Thumbnails */}
          {allImages.length > 1 && (
            <div 
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-2 overflow-x-auto py-2 px-3 bg-white/10 backdrop-blur-md rounded-2xl max-w-full"
            >
              {allImages.map((imgUrl, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedImageIndex(index)}
                  className={`relative w-12 h-12 rounded-lg overflow-hidden border-2 transition-all p-0.5 bg-black/40 ${
                    selectedImageIndex === index ? 'border-amber-400 scale-105' : 'border-transparent opacity-60 hover:opacity-100'
                  }`}
                >
                  <img
                    src={imgUrl}
                    alt={`Photo ${index + 1}`}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-contain"
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
