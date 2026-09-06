import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  Check, 
  X, 
  Upload, 
  Image as ImageIcon, 
  Star, 
  AlertCircle, 
  Loader2, 
  CheckCircle2, 
  Sparkles,
  Package,
  ToggleLeft,
  ToggleRight,
  Eye,
  Maximize2
} from 'lucide-react';
import { 
  collection, 
  getDocs, 
  onSnapshot,
  doc, 
  setDoc, 
  deleteDoc, 
  updateDoc, 
  serverTimestamp, 
  query, 
  orderBy,
  deleteField
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { uploadProductImage, uploadMultipleProductImages, deleteStorageImage } from '../../lib/storage';
import { Product, ProductImage, Category } from '../../types';

interface AdminProductsTabProps {
  categories: Category[];
}

export const AdminProductsTab: React.FC<AdminProductsTabProps> = ({ categories }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Product Form Fields
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [price, setPrice] = useState<number | ''>('');
  const [oldPrice, setOldPrice] = useState<number | ''>('');
  const [stock, setStock] = useState<number | ''>('');
  const [rating, setRating] = useState<number | ''>(4.8);
  const [reviews, setReviews] = useState<number | ''>(45);
  const [badge, setBadge] = useState('');
  const [description, setDescription] = useState('');
  const [active, setActive] = useState(true);

  // MULTIPLE PHOTOS STATE
  const [images, setImages] = useState<ProductImage[]>([]);
  const [primaryImageUrl, setPrimaryImageUrl] = useState<string>('');
  const [isUploadingPhotos, setIsUploadingPhotos] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [currentUploadingFile, setCurrentUploadingFile] = useState<string>('');

  // Quick Rating Modal State (Allows editing rating directly from product list)
  const [quickRatingProduct, setQuickRatingProduct] = useState<Product | null>(null);
  const [quickRatingScore, setQuickRatingScore] = useState<number | ''>(4.8);
  const [quickRatingReviews, setQuickRatingReviews] = useState<number | ''>(45);
  const [isSavingQuickRating, setIsSavingQuickRating] = useState(false);

  // Form submit state
  const [isSaving, setIsSaving] = useState(false);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [feedbackSuccess, setFeedbackSuccess] = useState<string | null>(null);

  // In-App Modals for Delete Confirmation & Image URL (Iframe friendly)
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [isUrlModalOpen, setIsUrlModalOpen] = useState(false);
  const [customImageUrl, setCustomImageUrl] = useState('');
  const [previewFullPhotoUrl, setPreviewFullPhotoUrl] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Real-time products listener
  useEffect(() => {
    setLoading(true);
    const unsub = onSnapshot(
      collection(db, 'products'),
      (snap) => {
        const list: Product[] = [];
        snap.forEach((docSnap) => {
          list.push({ id: docSnap.id, ...docSnap.data() } as Product);
        });
        // Sort by newest
        list.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
        setProducts(list);
        setLoading(false);
      },
      (err) => {
        console.error('Error listening to products:', err);
        setLoading(false);
      }
    );

    return () => unsub();
  }, []);

  const resetForm = () => {
    setName('');
    setCategoryId(categories[0]?.id || '');
    setPrice('');
    setOldPrice('');
    setStock(20);
    setRating(4.8);
    setReviews(45);
    setBadge('');
    setDescription('');
    setActive(true);
    setImages([]);
    setPrimaryImageUrl('');
    setFormError(null);
    setEditingProduct(null);
  };

  const handleOpenAddModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (prod: Product) => {
    setEditingProduct(prod);
    setName(prod.name);
    setCategoryId(prod.categoryId);
    setPrice(prod.price);
    setOldPrice(prod.oldPrice || '');
    setStock(prod.stock);
    setRating(prod.rating !== undefined ? prod.rating : 4.8);
    setReviews(prod.reviews !== undefined ? prod.reviews : 45);
    setBadge(prod.badge || '');
    setDescription(prod.description);
    setActive(prod.active);
    
    // Set photos
    const prodImages = prod.images || [];
    setImages(prodImages);
    setPrimaryImageUrl(prod.primaryImage || prodImages[0]?.url || '');
    
    setFormError(null);
    setIsModalOpen(true);
  };

  // Quick Rating Modal Handlers (Allows 1-click rating edit directly from products table)
  const handleOpenQuickRating = (e: React.MouseEvent, prod: Product) => {
    e.stopPropagation();
    setQuickRatingProduct(prod);
    setQuickRatingScore(prod.rating !== undefined ? prod.rating : 4.8);
    setQuickRatingReviews(prod.reviews !== undefined ? prod.reviews : 45);
  };

  const handleSaveQuickRating = async () => {
    if (!quickRatingProduct) return;
    setIsSavingQuickRating(true);
    try {
      const finalRating = quickRatingScore === '' ? 4.8 : Math.min(5, Math.max(1, parseFloat(Number(quickRatingScore).toFixed(1))));
      const finalReviews = quickRatingReviews === '' ? 0 : Math.max(0, Number(quickRatingReviews));
      const prodRef = doc(db, 'products', quickRatingProduct.id);
      await setDoc(prodRef, {
        rating: finalRating,
        reviews: finalReviews,
        updatedAt: serverTimestamp(),
      }, { merge: true });
      setFeedbackSuccess(`Rating for "${quickRatingProduct.name}" updated to ${finalRating} ★!`);
      setQuickRatingProduct(null);
    } catch (err: any) {
      console.error('Error updating rating:', err);
      alert('Failed to update rating. Please try again.');
    } finally {
      setIsSavingQuickRating(false);
    }
  };

  // MULTIPLE PHOTO SELECTION HANDLER (Laptop, Desktop, Android, iPhone)
  const handlePhotoFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setFormError(null);
    setIsUploadingPhotos(true);
    setUploadProgress(0);

    try {
      const fileList = Array.from(files) as File[];
      const newUploadedImages: ProductImage[] = [];

      for (let i = 0; i < fileList.length; i++) {
        const file = fileList[i];
        setCurrentUploadingFile(file.name);
        
        const uploaded = await uploadProductImage(file, 'products', (progress) => {
          const overall = Math.round(((i + progress / 100) / fileList.length) * 100);
          setUploadProgress(overall);
        });

        newUploadedImages.push(uploaded);
      }

      setImages((prev) => {
        const combined = [...prev, ...newUploadedImages];
        if (!primaryImageUrl && combined.length > 0) {
          setPrimaryImageUrl(combined[0].url);
        }
        return combined;
      });

      // Clear input so same file can be re-selected if needed
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err: any) {
      setFormError(`Product photo upload failed: ${err.message}`);
    } finally {
      setIsUploadingPhotos(false);
      setUploadProgress(0);
      setCurrentUploadingFile('');
    }
  };

  // Remove individual photo
  const handleRemovePhoto = (e: React.MouseEvent, indexToRemove: number) => {
    e.preventDefault();
    e.stopPropagation();
    
    const photoToRemove = images[indexToRemove];
    const newImages = images.filter((_, idx) => idx !== indexToRemove);
    setImages(newImages);

    // If removed photo was primary, assign the first available
    if (primaryImageUrl === photoToRemove?.url) {
      setPrimaryImageUrl(newImages[0]?.url || '');
    }

    if (photoToRemove?.storagePath) {
      deleteStorageImage(photoToRemove.storagePath);
    }
  };

  // Remove all photos
  const handleClearAllPhotos = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (images.length === 0) return;
    images.forEach((img) => {
      if (img.storagePath) deleteStorageImage(img.storagePath);
    });
    setImages([]);
    setPrimaryImageUrl('');
  };

  // Open in-app dialog to add photo via URL
  const handleOpenUrlModal = () => {
    setCustomImageUrl('');
    setIsUrlModalOpen(true);
  };

  // Submit in-app URL
  const handleConfirmAddUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customImageUrl.trim()) return;
    const cleanUrl = customImageUrl.trim();
    const newImg: ProductImage = {
      url: cleanUrl,
      name: 'External Image',
      isPrimary: images.length === 0,
    };
    setImages((prev) => {
      const updated = [...prev, newImg];
      if (!primaryImageUrl) {
        setPrimaryImageUrl(cleanUrl);
      }
      return updated;
    });
    setIsUrlModalOpen(false);
    setCustomImageUrl('');
  };

  // Select primary photo
  const handleSetPrimaryPhoto = (url: string) => {
    setPrimaryImageUrl(url);
    setImages((prev) =>
      prev.map((img) => ({
        ...img,
        isPrimary: img.url === url,
      }))
    );
  };

  // Toggle active status in list
  const handleToggleActive = async (prod: Product) => {
    try {
      const docRef = doc(db, 'products', prod.id);
      await updateDoc(docRef, {
        active: !prod.active,
        updatedAt: serverTimestamp(),
      });
      setProducts((prev) =>
        prev.map((p) => (p.id === prod.id ? { ...p, active: !p.active } : p))
      );
    } catch (err: any) {
      setFeedbackSuccess('Error updating status: ' + err.message);
      setTimeout(() => setFeedbackSuccess(null), 3500);
    }
  };

  // Trigger delete modal for a product
  const handleDeleteProductClick = (prod: Product) => {
    setProductToDelete(prod);
  };

  // Execute confirmed product deletion
  const handleConfirmDeleteProduct = async () => {
    if (!productToDelete) return;
    const target = productToDelete;
    setIsDeletingId(target.id);
    try {
      await deleteDoc(doc(db, 'products', target.id));
      // Delete images from storage if available
      target.images?.forEach((img) => {
        if (img.storagePath) deleteStorageImage(img.storagePath);
      });
      setProducts((prev) => prev.filter((p) => p.id !== target.id));
      setProductToDelete(null);
      setFeedbackSuccess(`Product "${target.name}" deleted successfully.`);
      setTimeout(() => setFeedbackSuccess(null), 3500);
    } catch (err: any) {
      alert('Failed to delete product: ' + err.message);
    } finally {
      setIsDeletingId(null);
    }
  };

  // Save / Submit Product Form
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!name.trim()) {
      setFormError('Please provide a product name.');
      return;
    }
    if (price === '' || Number(price) <= 0) {
      setFormError('Please set a valid selling price in BDT (৳).');
      return;
    }
    if (stock === '' || Number(stock) < 0) {
      setFormError('Please enter available stock quantity.');
      return;
    }
    if (images.length === 0) {
      setFormError('Please upload at least one product photo.');
      return;
    }

    setIsSaving(true);

    try {
      const selectedCategoryObj = categories.find((c) => c.id === categoryId);
      const chosenPrimary = primaryImageUrl || images[0]?.url || '';

      const productPayload: Record<string, any> = {
        name: name.trim(),
        categoryId: categoryId || categories[0]?.id || 'cat-general',
        categoryName: selectedCategoryObj?.name || 'General',
        price: Number(price),
        stock: Number(stock),
        rating: rating === '' ? 4.8 : Math.min(5, Math.max(1, parseFloat(Number(rating).toFixed(1)))),
        reviews: reviews === '' ? 0 : Math.max(0, Number(reviews)),
        description: description.trim() || 'Genuine product with warranty & nationwide delivery.',
        active: active,
        primaryImage: chosenPrimary,
        images: images.map((img) => {
          const item: Record<string, any> = {
            url: img.url,
            name: img.name || 'Product Photo',
            isPrimary: img.url === chosenPrimary,
          };
          if (img.storagePath) {
            item.storagePath = img.storagePath;
          }
          return item;
        }),
        createdAt: editingProduct?.createdAt || serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      if (oldPrice !== '' && !isNaN(Number(oldPrice))) {
        productPayload.oldPrice = Number(oldPrice);
      } else if (editingProduct) {
        productPayload.oldPrice = deleteField();
      }

      if (badge.trim()) {
        productPayload.badge = badge.trim();
      } else if (editingProduct) {
        productPayload.badge = deleteField();
      }

      if (editingProduct) {
        // Update existing
        const prodRef = doc(db, 'products', editingProduct.id);
        await setDoc(prodRef, productPayload, { merge: true });
        setFeedbackSuccess(`Product "${name}" updated successfully!`);
      } else {
        // Create new
        const newRef = doc(collection(db, 'products'));
        await setDoc(newRef, productPayload);
        setFeedbackSuccess(`New product "${name}" added to catalog!`);
      }

      setIsModalOpen(false);
      resetForm();
      setTimeout(() => setFeedbackSuccess(null), 3000);
    } catch (err: any) {
      setFormError('Failed to save product: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const filteredProducts = products.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.categoryName?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat = filterCategory === 'all' || p.categoryId === filterCategory;
    return matchesSearch && matchesCat;
  });

  return (
    <div className="space-y-6">
      {/* Top action bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight">
            Product Management
          </h2>
          <p className="text-xs text-stone-500">
            Add products with multiple photos, stock counts, and promotional badges.
          </p>
        </div>

        <button
          id="btn-add-product-modal"
          onClick={handleOpenAddModal}
          className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-stone-950 font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-md transition-all shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Product</span>
        </button>
      </div>

      {feedbackSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{feedbackSuccess}</span>
        </div>
      )}

      {/* Filter & Search Controls */}
      <div className="flex flex-col sm:flex-row gap-3 bg-white p-3.5 rounded-2xl border border-stone-200/80 shadow-xs">
        <div className="relative flex-1">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by product title or category..."
            className="w-full pl-9 pr-3 py-2 bg-stone-50 border border-stone-200 focus:border-amber-500 rounded-xl text-xs text-stone-900 focus:outline-hidden"
          />
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
        </div>

        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:outline-hidden"
        >
          <option value="all">All Categories ({products.length})</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-3xl border border-stone-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center text-stone-400 gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
            <p className="text-xs">Loading products...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="py-16 text-center text-stone-400 space-y-2 text-xs">
            <Package className="w-10 h-10 mx-auto text-stone-300" />
            <p className="font-bold text-stone-700">No products found</p>
            <p className="text-stone-500">Click "Add New Product" to create your first item.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-stone-700">
              <thead className="bg-stone-50/80 border-b border-stone-200 text-[11px] font-bold text-stone-500 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Product</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Price</th>
                  <th className="py-3 px-4">Stock</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredProducts.map((prod) => (
                  <tr key={prod.id} className="hover:bg-stone-50/60 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div 
                          onClick={() => setPreviewFullPhotoUrl(prod.primaryImage || prod.images?.[0]?.url || null)}
                          className="w-12 h-12 rounded-xl bg-stone-50 border border-stone-200 overflow-hidden shrink-0 flex items-center justify-center p-1 cursor-pointer hover:border-amber-400 transition-colors"
                          title="Click to view full photo"
                        >
                          <img
                            src={prod.primaryImage || prod.images?.[0]?.url}
                            alt={prod.name}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-contain"
                          />
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-stone-900 truncate max-w-xs">{prod.name}</p>
                          <div className="flex items-center gap-2 text-[11px] text-stone-400 flex-wrap mt-0.5">
                            {/* Clickable quick rating badge with edit button */}
                            <button
                              type="button"
                              onClick={(e) => handleOpenQuickRating(e, prod)}
                              className="inline-flex items-center gap-1 font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 px-1.5 py-0.5 rounded-md border border-amber-200 transition-all hover:scale-105 cursor-pointer shadow-2xs group/rate"
                              title="Click to quickly edit rating & reviews"
                            >
                              <Star className="w-3 h-3 fill-amber-400 text-amber-500" />
                              <span>{prod.rating !== undefined ? prod.rating : 4.8}</span>
                              <span className="text-stone-400 font-normal">({prod.reviews !== undefined ? prod.reviews : 45})</span>
                              <Edit3 className="w-2.5 h-2.5 text-amber-600 opacity-60 group-hover/rate:opacity-100 ml-0.5" />
                            </button>
                            <span>•</span>
                            <span>{prod.images?.length || 1} photo(s)</span>
                            {prod.badge && (
                              <span className="px-1.5 py-0.2 bg-amber-100 text-amber-800 font-bold rounded-md text-[10px]">
                                {prod.badge}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-medium text-stone-600">
                      {prod.categoryName || 'General'}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-extrabold text-stone-950">৳{prod.price.toLocaleString('en-BD')}</span>
                      {prod.oldPrice && (
                        <span className="block text-[10px] text-stone-400 line-through">
                          ৳{prod.oldPrice.toLocaleString('en-BD')}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`font-bold px-2 py-0.5 rounded-md text-[11px] ${
                          prod.stock <= 0
                            ? 'bg-rose-100 text-rose-800'
                            : prod.stock <= 5
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {prod.stock <= 0 ? 'Out of Stock' : `${prod.stock} in stock`}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => handleToggleActive(prod)}
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition-all ${
                          prod.active
                            ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                            : 'bg-stone-200 text-stone-600 hover:bg-stone-300'
                        }`}
                      >
                        {prod.active ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleOpenEditModal(prod)}
                          className="p-1.5 text-stone-600 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-colors"
                          title="Edit Product"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteProductClick(prod)}
                          disabled={isDeletingId === prod.id}
                          className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors disabled:opacity-50"
                          title="Delete Product"
                        >
                          {isDeletingId === prod.id ? (
                            <Loader2 className="w-4 h-4 animate-spin text-rose-600" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
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

      {/* ADD / EDIT PRODUCT MODAL */}
      {isModalOpen && (
        <div
          id="product-form-modal-backdrop"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-200"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            id="product-form-card"
            onClick={(e) => e.stopPropagation()}
            className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden border border-stone-200 animate-in zoom-in-95 duration-250 my-6 max-h-[90vh] flex flex-col"
          >
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-stone-100 flex items-center justify-between bg-stone-50/80">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-stone-900">
                  {editingProduct ? 'Edit Product' : 'Add New Product'}
                </h3>
                <p className="text-xs text-stone-500">
                  Configure title, category, pricing, and upload multiple high-res product photos
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-full hover:bg-stone-200 text-stone-400 hover:text-stone-900 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveProduct} className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Product Title */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Product Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Wireless ANC Gaming Headphones"
                  className="w-full px-3 py-2 bg-white border border-stone-300 focus:border-amber-500 rounded-xl text-xs text-stone-900 focus:outline-hidden"
                />
              </div>

              {/* Category & Badge */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Category <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-stone-300 focus:border-amber-500 rounded-xl text-xs text-stone-900 focus:outline-hidden"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Badge / Tag (Optional)
                  </label>
                  <input
                    type="text"
                    value={badge}
                    onChange={(e) => setBadge(e.target.value)}
                    placeholder="e.g. Hot, Best Seller, New, Sale"
                    className="w-full px-3 py-2 bg-white border border-stone-300 focus:border-amber-500 rounded-xl text-xs text-stone-900 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Pricing & Stock */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Selling Price (৳ BDT) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={price}
                    onChange={(e) => setPrice(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="e.g. 2450"
                    className="w-full px-3 py-2 bg-white border border-stone-300 focus:border-amber-500 rounded-xl text-xs text-stone-900 focus:outline-hidden font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Old / Strike Price (৳ BDT)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={oldPrice}
                    onChange={(e) => setOldPrice(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="e.g. 3200"
                    className="w-full px-3 py-2 bg-white border border-stone-300 focus:border-amber-500 rounded-xl text-xs text-stone-900 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Stock Quantity <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={stock}
                    onChange={(e) => setStock(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="e.g. 25"
                    className="w-full px-3 py-2 bg-white border border-stone-300 focus:border-amber-500 rounded-xl text-xs text-stone-900 focus:outline-hidden font-bold"
                  />
                </div>
              </div>

              {/* Rating & Reviews Section (User Request: add korar somoy rating add kora jabe and edit kora jabe) */}
              <div className="p-3 bg-amber-50/60 rounded-2xl border border-amber-200/90 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                    <span>Product Rating & Reviews (প্রোডাক্ট রেটিং এবং রিভিউ সংখ্যা)</span>
                  </label>
                  <span className="text-[11px] text-amber-800 font-bold bg-amber-100/80 px-2 py-0.5 rounded-md">
                    {rating !== '' ? Number(rating).toFixed(1) : '4.8'} ★ ({reviews !== '' ? reviews : 0} reviews)
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Rating Input & Star Selector */}
                  <div>
                    <label className="block text-[11px] font-bold text-stone-700 mb-1">
                      Rating Score (১.০ থেকে ৫.০ এর মধ্যে)
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        step="0.1"
                        min="1"
                        max="5"
                        value={rating}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === '') {
                            setRating('');
                          } else {
                            const num = parseFloat(val);
                            setRating(isNaN(num) ? '' : num);
                          }
                        }}
                        placeholder="e.g. 4.8"
                        className="w-full px-3 py-2 bg-white border border-stone-300 focus:border-amber-500 rounded-xl text-xs text-stone-900 focus:outline-hidden font-bold"
                      />
                      {/* Clickable 5 Stars */}
                      <div className="flex items-center gap-0.5 shrink-0 bg-white px-2 py-1 rounded-xl border border-stone-200 shadow-2xs">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => setRating(s)}
                            className="p-0.5 hover:scale-125 transition-transform cursor-pointer"
                            title={`Set to ${s}.0 Star`}
                          >
                            <Star
                              className={`w-3.5 h-3.5 ${
                                (Number(rating) || 0) >= s
                                  ? 'fill-amber-400 text-amber-500'
                                  : 'text-stone-300'
                              }`}
                            />
                          </button>
                        ))}
                      </div>
                    </div>
                    {/* Quick Rating Presets */}
                    <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                      <span className="text-[10px] text-stone-500">Preset:</span>
                      {[5.0, 4.9, 4.8, 4.7, 4.5, 4.0].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setRating(preset)}
                          className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold transition-all ${
                            Number(rating) === preset
                              ? 'bg-amber-500 text-stone-950 shadow-2xs'
                              : 'bg-white border border-stone-200 text-stone-700 hover:border-amber-400'
                          }`}
                        >
                          {preset}★
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Reviews Count Input */}
                  <div>
                    <label className="block text-[11px] font-bold text-stone-700 mb-1">
                      Total Reviews Count (রিভিউ সংখ্যা)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={reviews}
                      onChange={(e) => {
                        const val = e.target.value;
                        setReviews(val === '' ? '' : parseInt(val, 10));
                      }}
                      placeholder="e.g. 45"
                      className="w-full px-3 py-2 bg-white border border-stone-300 focus:border-amber-500 rounded-xl text-xs text-stone-900 focus:outline-hidden font-bold"
                    />
                    {/* Quick Reviews Count Presets */}
                    <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                      <span className="text-[10px] text-stone-500">Preset:</span>
                      {[15, 32, 45, 88, 120, 250].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setReviews(preset)}
                          className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold transition-all ${
                            Number(reviews) === preset
                              ? 'bg-amber-500 text-stone-950 shadow-2xs'
                              : 'bg-white border border-stone-200 text-stone-700 hover:border-amber-400'
                          }`}
                        >
                          {preset}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* MULTIPLE PHOTO UPLOAD SECTION (Extremely Important requirement) */}
              <div className="space-y-3 pt-2 border-t border-stone-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <label className="block text-xs font-bold text-stone-900">
                      Product Photos (Multiple Supported) <span className="text-rose-500">*</span>
                    </label>
                    <p className="text-[11px] text-stone-500">
                      Select photos from Laptop, Desktop, Android, or iPhone. Max 5 MB each.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {images.length > 0 && (
                      <button
                        type="button"
                        onClick={handleClearAllPhotos}
                        className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-xl flex items-center gap-1 transition-colors border border-rose-200"
                        title="Remove all uploaded photos"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Clear All ({images.length})</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={handleOpenUrlModal}
                      className="px-2.5 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold text-xs rounded-xl flex items-center gap-1 transition-colors border border-stone-300"
                      title="Add photo using a link/URL"
                    >
                      <ImageIcon className="w-3.5 h-3.5 text-stone-600" />
                      <span>Add via Link</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploadingPhotos}
                      className="px-3 py-1.5 bg-stone-900 hover:bg-black text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors shadow-xs"
                    >
                      <Upload className="w-3.5 h-3.5 text-amber-400" />
                      <span>Upload Photos</span>
                    </button>
                  </div>
                </div>

                {/* Hidden Multi-file input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handlePhotoFilesSelected}
                  className="hidden"
                />

                {/* Upload Progress feedback */}
                {isUploadingPhotos && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-1.5">
                    <div className="flex items-center justify-between text-xs text-amber-900 font-semibold">
                      <span className="flex items-center gap-2">
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-600" />
                        Uploading {currentUploadingFile}...
                      </span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-amber-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-amber-600 rounded-full transition-all duration-200"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Photos Grid & Primary Selector - Full uncropped photo preview */}
                {images.length > 0 ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[11px] text-stone-500 font-medium px-1">
                      <span>{images.length} photo(s) uploaded • All photos show in 100% full view without cropping</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 p-3 bg-stone-50 rounded-2xl border border-stone-200">
                      {images.map((img, index) => {
                        const isPrimary = primaryImageUrl === img.url;
                        return (
                          <div
                            key={index}
                            className={`relative group aspect-square rounded-xl overflow-hidden border-2 bg-stone-100/60 shadow-xs flex flex-col justify-between p-1 ${
                              isPrimary ? 'border-amber-500 ring-2 ring-amber-400/30' : 'border-stone-200'
                            }`}
                          >
                            {/* Uncropped Full Photo Container */}
                            <div className="w-full h-full bg-white rounded-lg flex items-center justify-center p-1 overflow-hidden">
                              <img
                                src={img.url}
                                alt={`Product Photo ${index + 1}`}
                                referrerPolicy="no-referrer"
                                className="w-full h-full object-contain rounded-md"
                              />
                            </div>

                            {/* Top Badges & Controls */}
                            <div className="absolute top-2 left-2 right-2 flex items-center justify-between pointer-events-none">
                              {/* Primary status badge */}
                              {isPrimary ? (
                                <span className="bg-amber-500 text-stone-950 font-black text-[10px] px-2 py-0.5 rounded-md shadow-md pointer-events-auto">
                                  Primary
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleSetPrimaryPhoto(img.url)}
                                  className="bg-stone-900/90 hover:bg-amber-500 hover:text-stone-950 text-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow-md pointer-events-auto transition-colors"
                                >
                                  Make Primary
                                </button>
                              )}

                              <div className="flex items-center gap-1 pointer-events-auto">
                                {/* Preview Full Photo button */}
                                <button
                                  type="button"
                                  onClick={() => setPreviewFullPhotoUrl(img.url)}
                                  className="p-1.5 bg-stone-900/80 hover:bg-stone-900 text-white rounded-lg shadow-md transition-all flex items-center justify-center cursor-pointer"
                                  title="View 100% full photo"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>

                                {/* Prominent Red Remove Photo Button */}
                                <button
                                  type="button"
                                  onClick={(e) => handleRemovePhoto(e, index)}
                                  className="p-1.5 bg-rose-600 hover:bg-rose-700 active:scale-90 text-white rounded-lg shadow-md pointer-events-auto transition-all flex items-center justify-center cursor-pointer"
                                  title="Remove / Delete this photo"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>

                            {/* Bottom Photo Number */}
                            <div className="absolute bottom-2 left-2 bg-black/60 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md backdrop-blur-xs flex items-center gap-1">
                              <span>Photo #{index + 1}</span>
                              <span className="text-[8px] text-amber-300 font-normal">(Full)</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="p-6 border-2 border-dashed border-stone-300 hover:border-amber-500 rounded-2xl text-center text-stone-500 cursor-pointer bg-stone-50/60 hover:bg-amber-50/30 transition-colors space-y-1"
                  >
                    <ImageIcon className="w-8 h-8 mx-auto text-stone-400" />
                    <p className="text-xs font-bold text-stone-700">Click to select product photos</p>
                    <p className="text-[11px] text-stone-400">Supports JPG, PNG, WEBP from any device</p>
                  </div>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Product Description
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Key features, specifications, and warranty details..."
                  className="w-full px-3 py-2 bg-white border border-stone-300 focus:border-amber-500 rounded-xl text-xs text-stone-900 focus:outline-hidden"
                />
              </div>

              {/* Active Toggle */}
              <div className="flex items-center justify-between p-3 bg-stone-50 rounded-2xl border border-stone-200 text-xs">
                <div>
                  <p className="font-bold text-stone-900">Publish Immediately</p>
                  <p className="text-[11px] text-stone-500">Show this product live in the storefront</p>
                </div>
                <button
                  type="button"
                  onClick={() => setActive(!active)}
                  className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-colors ${
                    active ? 'bg-emerald-600 text-white' : 'bg-stone-300 text-stone-700'
                  }`}
                >
                  {active ? 'Active ✓' : 'Draft / Inactive'}
                </button>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-bold transition-colors"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSaving || isUploadingPhotos}
                  className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-stone-950 font-extrabold rounded-xl text-xs shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  <span>{editingProduct ? 'Save Changes' : 'Create Product'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* IN-APP CONFIRMATION MODAL FOR DELETING PRODUCT (Iframe-safe) */}
      {productToDelete && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => !isDeletingId && setProductToDelete(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white max-w-md w-full rounded-3xl p-6 shadow-2xl border border-stone-200 space-y-4 animate-in zoom-in-95 duration-150"
          >
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-lg font-black text-stone-900">Delete Product?</h3>
              <p className="text-xs text-stone-600">
                Are you sure you want to permanently delete{' '}
                <strong className="text-stone-900 font-bold">"{productToDelete.name}"</strong>? This will remove the item from your store catalog and database immediately.
              </p>
            </div>

            {/* Product mini preview */}
            <div className="flex items-center gap-3 p-2.5 bg-stone-50 rounded-2xl border border-stone-200">
              <div className="w-12 h-12 bg-white rounded-xl border border-stone-200 overflow-hidden shrink-0 flex items-center justify-center p-0.5">
                <img
                  src={productToDelete.primaryImage || productToDelete.images?.[0]?.url || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=100'}
                  alt={productToDelete.name}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-stone-900 truncate">{productToDelete.name}</p>
                <p className="text-[11px] font-extrabold text-amber-600">৳{productToDelete.price.toLocaleString('en-BD')}</p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
              <button
                type="button"
                disabled={isDeletingId === productToDelete.id}
                onClick={() => setProductToDelete(null)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-stone-600 hover:bg-stone-100 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeletingId === productToDelete.id}
                onClick={handleConfirmDeleteProduct}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black shadow-md transition-all flex items-center gap-1.5 disabled:opacity-50"
              >
                {isDeletingId === productToDelete.id ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Yes, Delete Product</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* IN-APP MODAL FOR ADDING PHOTO BY LINK/URL */}
      {isUrlModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setIsUrlModalOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white max-w-md w-full rounded-3xl p-5 shadow-2xl border border-stone-200 space-y-4 animate-in zoom-in-95 duration-150"
          >
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-100 text-amber-800 rounded-xl">
                  <ImageIcon className="w-4 h-4" />
                </div>
                <h4 className="text-sm font-bold text-stone-900">Add Photo via Link</h4>
              </div>
              <button
                type="button"
                onClick={() => setIsUrlModalOpen(false)}
                className="p-1 text-stone-400 hover:text-stone-700 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmAddUrl} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Image Direct URL (JPG, PNG, WEBP)
                </label>
                <input
                  type="url"
                  required
                  autoFocus
                  value={customImageUrl}
                  onChange={(e) => setCustomImageUrl(e.target.value)}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-300 focus:border-amber-500 rounded-xl text-xs text-stone-900 focus:outline-hidden"
                />
              </div>

              {customImageUrl.trim() && (
                <div className="aspect-video w-full rounded-xl overflow-hidden border border-stone-200 bg-stone-50 flex items-center justify-center">
                  <img
                    src={customImageUrl.trim()}
                    alt="Preview"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setIsUrlModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-stone-600 hover:bg-stone-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!customImageUrl.trim()}
                  className="px-4 py-2 bg-stone-900 hover:bg-black text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50"
                >
                  Add to Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Rating & Reviews Modal (Directly update rating without opening full modal) */}
      {quickRatingProduct && (
        <div
          id="quick-rating-modal"
          onClick={() => setQuickRatingProduct(null)}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white w-full max-w-md rounded-3xl p-5 shadow-2xl border border-stone-200 space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-50 text-amber-600 rounded-xl border border-amber-200/80">
                  <Star className="w-5 h-5 fill-amber-400 text-amber-500" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-stone-900">Edit Rating & Reviews</h3>
                  <p className="text-[11px] text-stone-500">রেটিং এবং রিভিউ সংখ্যা পরিবর্তন করুন</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setQuickRatingProduct(null)}
                className="p-1.5 text-stone-400 hover:text-stone-700 rounded-xl hover:bg-stone-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Product Mini Preview */}
            <div className="flex items-center gap-2.5 p-2 bg-stone-50 rounded-2xl border border-stone-200/80">
              <div className="w-10 h-10 bg-white rounded-xl border border-stone-200 overflow-hidden shrink-0 flex items-center justify-center p-0.5">
                <img
                  src={quickRatingProduct.primaryImage || quickRatingProduct.images?.[0]?.url}
                  alt={quickRatingProduct.name}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-stone-900 truncate">{quickRatingProduct.name}</p>
                <p className="text-[11px] text-stone-500 font-medium">৳{quickRatingProduct.price.toLocaleString('en-BD')}</p>
              </div>
            </div>

            {/* Inputs */}
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-stone-800 mb-1">
                  Rating Score (১.০ থেকে ৫.০)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    max="5"
                    value={quickRatingScore}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '') {
                        setQuickRatingScore('');
                      } else {
                        const num = parseFloat(val);
                        setQuickRatingScore(isNaN(num) ? '' : num);
                      }
                    }}
                    placeholder="e.g. 4.9"
                    className="w-full px-3 py-2 bg-white border border-stone-300 focus:border-amber-500 rounded-xl text-sm font-bold text-stone-900 focus:outline-hidden"
                  />
                  <div className="flex items-center gap-0.5 bg-stone-50 px-2 py-1.5 rounded-xl border border-stone-200 shrink-0">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setQuickRatingScore(star)}
                        className="p-0.5 hover:scale-125 transition-transform"
                      >
                        <Star
                          className={`w-4 h-4 ${
                            (Number(quickRatingScore) || 0) >= star
                              ? 'fill-amber-400 text-amber-500'
                              : 'text-stone-300'
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </div>
                {/* Presets */}
                <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                  <span className="text-[10px] text-stone-500 font-medium">Preset:</span>
                  {[5.0, 4.9, 4.8, 4.7, 4.5, 4.0].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setQuickRatingScore(preset)}
                      className={`px-2 py-0.5 rounded-md text-[11px] font-bold transition-all ${
                        Number(quickRatingScore) === preset
                          ? 'bg-amber-500 text-stone-950 shadow-2xs'
                          : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
                      }`}
                    >
                      {preset}★
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-800 mb-1">
                  Reviews Count (রিভিউ সংখ্যা)
                </label>
                <input
                  type="number"
                  min="0"
                  value={quickRatingReviews}
                  onChange={(e) => {
                    const val = e.target.value;
                    setQuickRatingReviews(val === '' ? '' : parseInt(val, 10));
                  }}
                  placeholder="e.g. 64"
                  className="w-full px-3 py-2 bg-white border border-stone-300 focus:border-amber-500 rounded-xl text-sm font-bold text-stone-900 focus:outline-hidden"
                />
                {/* Review count presets */}
                <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                  <span className="text-[10px] text-stone-500 font-medium">Preset:</span>
                  {[12, 28, 45, 84, 150, 240].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setQuickRatingReviews(preset)}
                      className={`px-2 py-0.5 rounded-md text-[11px] font-bold transition-all ${
                        Number(quickRatingReviews) === preset
                          ? 'bg-amber-500 text-stone-950 shadow-2xs'
                          : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setQuickRatingProduct(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-stone-600 hover:bg-stone-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveQuickRating}
                disabled={isSavingQuickRating}
                className="px-5 py-2 bg-amber-500 hover:bg-amber-600 active:scale-95 text-stone-950 font-bold rounded-xl text-xs transition-all shadow-md flex items-center gap-1.5 disabled:opacity-50"
              >
                {isSavingQuickRating ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Save Rating</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Full Photo Preview Lightbox (100% uncropped view) */}
      {previewFullPhotoUrl && (
        <div
          id="admin-photo-preview-modal"
          onClick={() => setPreviewFullPhotoUrl(null)}
          className="fixed inset-0 z-60 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4 animate-in fade-in duration-150"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-4xl flex items-center justify-between text-white pb-3 border-b border-white/10"
          >
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold px-2 py-0.5 bg-amber-500 text-stone-950 rounded-md">100% Full View</span>
              <p className="text-xs text-stone-300">Uncropped Photo Quality Check</p>
            </div>
            <button
              type="button"
              onClick={() => setPreviewFullPhotoUrl(null)}
              className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative flex-1 w-full max-w-4xl flex items-center justify-center p-4 overflow-hidden"
          >
            <img
              src={previewFullPhotoUrl}
              alt="Full Preview"
              referrerPolicy="no-referrer"
              className="max-w-full max-h-[82vh] object-contain rounded-2xl shadow-2xl"
            />
          </div>
        </div>
      )}
    </div>
  );
};
