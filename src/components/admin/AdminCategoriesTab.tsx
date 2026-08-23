import React, { useState } from 'react';
import { 
  Plus, 
  Edit3, 
  Trash2, 
  Layers, 
  Check, 
  X, 
  Loader2, 
  AlertCircle, 
  CheckCircle2, 
  Upload,
  Image as ImageIcon
} from 'lucide-react';
import { doc, setDoc, deleteDoc, updateDoc, collection, getDocs, where, query, writeBatch, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { uploadProductImage } from '../../lib/storage';
import { Category } from '../../types';

interface AdminCategoriesTabProps {
  categories: Category[];
  onRefreshCategories: () => void;
}

export const AdminCategoriesTab: React.FC<AdminCategoriesTabProps> = ({
  categories,
  onRefreshCategories,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<Category | null>(null);

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [image, setImage] = useState('');
  const [sortOrder, setSortOrder] = useState<number>(1);
  const [active, setActive] = useState(true);

  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleOpenAdd = () => {
    setEditingCat(null);
    setName('');
    setSlug('');
    setImage('');
    setSortOrder(categories.length + 1);
    setActive(true);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (cat: Category) => {
    setEditingCat(cat);
    setName(cat.name);
    setSlug(cat.slug);
    setImage(cat.image || '');
    setSortOrder(cat.sortOrder || 1);
    setActive(cat.active);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const uploaded = await uploadProductImage(file, 'categories');
      setImage(uploaded.url);
    } catch (err: any) {
      setFormError('Image upload failed: ' + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleToggleActive = async (cat: Category) => {
    try {
      await updateDoc(doc(db, 'categories', cat.id), {
        active: !cat.active,
      });
      onRefreshCategories();
    } catch (err: any) {
      alert('Error updating category: ' + err.message);
    }
  };

  const handleDeleteCategory = async (cat: Category) => {
    if (!window.confirm(`Delete category "${cat.name}"?`)) return;
    try {
      await deleteDoc(doc(db, 'categories', cat.id));
      setFeedback(`Category "${cat.name}" deleted.`);
      onRefreshCategories();
      setTimeout(() => setFeedback(null), 3000);
    } catch (err: any) {
      alert('Failed to delete category: ' + err.message);
    }
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!name.trim()) {
      setFormError('Category name is required.');
      return;
    }

    const calculatedSlug = slug.trim() || name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    setIsSaving(true);

    try {
      const catId = editingCat ? editingCat.id : `cat-${Date.now()}`;
      const payload: Category = {
        id: catId,
        name: name.trim(),
        slug: calculatedSlug,
        image: image.trim() || undefined,
        sortOrder: Number(sortOrder) || 1,
        active: active,
        createdAt: editingCat?.createdAt || serverTimestamp(),
      };

      await setDoc(doc(db, 'categories', catId), payload, { merge: true });

      // If category name changed, update product categoryNames in Firestore
      if (editingCat && editingCat.name !== name.trim()) {
        const prodQuery = query(collection(db, 'products'), where('categoryId', '==', editingCat.id));
        const prodsSnap = await getDocs(prodQuery);
        if (!prodsSnap.empty) {
          const batch = writeBatch(db);
          prodsSnap.forEach((pDoc) => {
            batch.update(pDoc.ref, { categoryName: name.trim() });
          });
          await batch.commit();
        }
      }

      setIsModalOpen(false);
      setFeedback(`Category "${name}" saved successfully!`);
      onRefreshCategories();
      setTimeout(() => setFeedback(null), 3000);
    } catch (err: any) {
      setFormError('Save error: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight">
            Categories Management
          </h2>
          <p className="text-xs text-stone-500">
            Organize catalog categories, visual icons, and storefront display order.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-stone-950 font-bold rounded-xl text-xs flex items-center gap-2 shadow-md transition-all shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Category</span>
        </button>
      </div>

      {feedback && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Category Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map((cat) => (
          <div
            key={cat.id}
            className="p-4 bg-white rounded-2xl border border-stone-200/80 shadow-xs flex items-center justify-between gap-3 hover:border-amber-300 transition-all"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-12 h-12 rounded-xl bg-stone-100 border border-stone-200 overflow-hidden shrink-0">
                {cat.image ? (
                  <img
                    src={cat.image}
                    alt={cat.name}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-stone-400">
                    <Layers className="w-5 h-5" />
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <h4 className="font-bold text-xs sm:text-sm text-stone-900 truncate">{cat.name}</h4>
                <p className="text-[11px] text-stone-400 font-mono truncate">slug: {cat.slug}</p>
                <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded-md">
                  Order: #{cat.sortOrder}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={() => handleToggleActive(cat)}
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  cat.active ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-200 text-stone-600'
                }`}
              >
                {cat.active ? 'Active' : 'Off'}
              </button>
              <button
                onClick={() => handleOpenEdit(cat)}
                className="p-1.5 text-stone-500 hover:text-amber-700 hover:bg-stone-100 rounded-lg transition-colors"
                title="Edit"
              >
                <Edit3 className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleDeleteCategory(cat)}
                className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                title="Delete"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 overflow-y-auto animate-in fade-in duration-200"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-stone-200 animate-in zoom-in-95 duration-250 p-5 space-y-4"
          >
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h3 className="font-bold text-base text-stone-900">
                {editingCat ? 'Edit Category' : 'New Category'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-stone-400 hover:text-stone-900">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCategory} className="space-y-3.5">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Category Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (!editingCat) {
                      setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-'));
                    }
                  }}
                  placeholder="e.g. Smart Watches"
                  className="w-full px-3 py-2 bg-white border border-stone-300 focus:border-amber-500 rounded-xl text-xs text-stone-900 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Slug URL</label>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="smart-watches"
                  className="w-full px-3 py-2 bg-white border border-stone-300 focus:border-amber-500 rounded-xl text-xs text-stone-900 focus:outline-hidden font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Category Banner Image</label>
                <div className="flex gap-2 items-center">
                  <input
                    type="text"
                    value={image}
                    onChange={(e) => setImage(e.target.value)}
                    placeholder="https://... or upload"
                    className="w-full px-3 py-2 bg-white border border-stone-300 focus:border-amber-500 rounded-xl text-xs text-stone-900 focus:outline-hidden"
                  />
                  <label className="px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-bold cursor-pointer shrink-0">
                    <Upload className="w-4 h-4 inline mr-1" />
                    Upload
                    <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                  </label>
                </div>
                {isUploading && <p className="text-[11px] text-amber-600 mt-1">Uploading image...</p>}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Sort Order</label>
                  <input
                    type="number"
                    value={sortOrder}
                    onChange={(e) => setSortOrder(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white border border-stone-300 focus:border-amber-500 rounded-xl text-xs text-stone-900 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Status</label>
                  <button
                    type="button"
                    onClick={() => setActive(!active)}
                    className={`w-full py-2 rounded-xl text-xs font-bold ${
                      active ? 'bg-emerald-600 text-white' : 'bg-stone-200 text-stone-700'
                    }`}
                  >
                    {active ? 'Active' : 'Inactive'}
                  </button>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-stone-100 text-stone-700 rounded-xl text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving || isUploading}
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-stone-950 rounded-xl text-xs font-bold shadow-md"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
