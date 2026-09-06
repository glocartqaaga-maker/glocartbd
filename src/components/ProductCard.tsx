import React from 'react';
import { ShoppingBag, Star, Eye } from 'lucide-react';
import { Product } from '../types';
import { useCart } from '../context/CartContext';

interface ProductCardProps {
  product: Product;
  onSelectProduct: (product: Product) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onSelectProduct }) => {
  const { addToCart, storeSettings } = useCart();
  const [addedAnimation, setAddedAnimation] = React.useState(false);

  const displayImage = product.primaryImage || product.images?.[0]?.url || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=600&q=80';
  const isContain = storeSettings.productImageFit !== 'cover';

  const discountPercent = product.oldPrice && product.oldPrice > product.price
    ? Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100)
    : 0;

  const isOutOfStock = product.stock <= 0;
  const isLowStock = product.stock > 0 && product.stock <= 5;

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isOutOfStock) return;
    const success = addToCart(product, 1);
    if (success) {
      setAddedAnimation(true);
      setTimeout(() => setAddedAnimation(false), 1200);
    }
  };

  return (
    <div
      id={`product-card-${product.id}`}
      onClick={() => onSelectProduct(product)}
      className="group relative bg-white rounded-2xl border border-stone-200/80 hover:border-amber-400/80 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between overflow-hidden cursor-pointer"
    >
      {/* Product Image Container - Full photo show without cropping */}
      <div className={`relative aspect-square w-full overflow-hidden ${isContain ? 'bg-stone-50/90 flex items-center justify-center p-2.5' : 'bg-stone-100'}`}>
        <img
          src={displayImage}
          alt={product.name}
          referrerPolicy="no-referrer"
          loading="lazy"
          className={`w-full h-full transition-transform duration-300 group-hover:scale-105 ${
            isContain ? 'object-contain object-center' : 'object-cover object-center'
          }`}
        />

        {/* Badges Overlay */}
        <div className="absolute top-2 left-2 flex flex-col gap-1 z-10">
          {product.badge && (
            <span className="px-2 py-0.5 text-[10px] sm:text-xs font-bold uppercase tracking-wider bg-amber-500 text-stone-950 rounded-md shadow-xs">
              {product.badge}
            </span>
          )}
          {discountPercent > 0 && (
            <span className="px-1.5 py-0.5 text-[10px] sm:text-xs font-black bg-rose-600 text-white rounded-md shadow-xs">
              -{discountPercent}%
            </span>
          )}
        </div>

        {/* Out of Stock Banner */}
        {isOutOfStock && (
          <div className="absolute inset-0 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-2 z-20">
            <span className="px-3 py-1 bg-rose-600 text-white text-xs font-bold uppercase tracking-wider rounded-lg shadow-md">
              Out of Stock
            </span>
          </div>
        )}

        {/* Quick View Button on Desktop Hover */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onSelectProduct(product);
          }}
          className="hidden sm:flex absolute bottom-2 right-2 p-2 bg-white/90 hover:bg-white text-stone-800 rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
          title="Quick View"
          aria-label="Quick View Product"
        >
          <Eye className="w-4 h-4 text-stone-700" />
        </button>
      </div>

      {/* Product Content Details */}
      <div className="p-3 sm:p-4 flex flex-col flex-1 justify-between gap-2">
        <div className="space-y-1">
          {product.categoryName && (
            <p className="text-[10px] sm:text-[11px] font-semibold text-amber-700 uppercase tracking-wider truncate">
              {product.categoryName}
            </p>
          )}

          <h3 className="text-xs sm:text-sm font-semibold text-stone-900 line-clamp-2 leading-snug group-hover:text-amber-700 transition-colors">
            {product.name}
          </h3>

          {/* Rating Stars */}
          <div className="flex items-center gap-1">
            <div className="flex items-center text-amber-400">
              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
            </div>
            <span className="text-[11px] font-bold text-stone-800">
              {product.rating || 4.8}
            </span>
            <span className="text-[10px] text-stone-400">
              ({product.reviews || 42})
            </span>
          </div>
        </div>

        {/* Pricing & Add to Cart Action */}
        <div className="pt-2 border-t border-stone-100 flex items-center justify-between gap-2">
          <div className="flex flex-col">
            <div className="flex items-baseline gap-1.5 flex-wrap">
              <span className="text-sm sm:text-base font-extrabold text-stone-950">
                ৳{product.price.toLocaleString('en-BD')}
              </span>
              {product.oldPrice && product.oldPrice > product.price && (
                <span className="text-[11px] sm:text-xs text-stone-400 line-through">
                  ৳{product.oldPrice.toLocaleString('en-BD')}
                </span>
              )}
            </div>
            {isLowStock && (
              <span className="text-[9px] font-bold text-amber-600">
                Only {product.stock} left!
              </span>
            )}
          </div>

          <button
            id={`btn-add-cart-${product.id}`}
            onClick={handleQuickAdd}
            disabled={isOutOfStock}
            className={`p-2 sm:px-3 sm:py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
              isOutOfStock
                ? 'bg-stone-100 text-stone-400 cursor-not-allowed'
                : addedAnimation
                ? 'bg-emerald-600 text-white scale-105'
                : 'bg-amber-500 hover:bg-amber-600 text-stone-950 shadow-xs active:scale-95'
            }`}
            aria-label={`Add ${product.name} to cart`}
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">
              {addedAnimation ? 'Added' : 'Add'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
