import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Edit3, 
  Trash2, 
  Sliders, 
  Check, 
  X, 
  Loader2, 
  AlertCircle, 
  CheckCircle2, 
  Upload, 
  Image as ImageIcon 
} from 'lucide-react';
import { doc, setDoc, deleteDoc, updateDoc, collection, getDocs, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { uploadProductImage } from '../../lib/storage';
import { SliderBanner } from '../../types';

export const AdminSlidersTab: React.FC = () => {
  const [sliders, setSliders] = useState<SliderBanner[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSlider, setEditingSlider] = useState<SliderBanner | null>(null);

  // Form fields
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [image, setImage] = useState('');
  const [buttonText, setButtonText] = useState('Shop Now');
  const [buttonLink, setButtonLink] = useState('');
  const [sortOrder, setSortOrder] = useState<number>(1);
  const [active, setActive] = useState(true);

  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const fetchSliders = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'sliders'));
      const list: SliderBanner[] = [];
      snap.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() } as SliderBanner);
      });
      list.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
      setSliders(list);
    } catch (err) {
      console.warn('Error fetching sliders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSliders();
  }, []);

  const handleOpenAdd = () => {
    setEditingSlider(null);
    setTitle('');
    setSubtitle('');
    setImage('');
    setButtonText('Shop Now');
    setButtonLink('');
    setSortOrder(sliders.length + 1);
    setActive(true);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (slider: SliderBanner) => {
    setEditingSlider(slider);
    setTitle(slider.title || '');
    setSubtitle(slider.subtitle || '');
    setImage(slider.image);
    setButtonText(slider.buttonText || 'Shop Now');
    setButtonLink(slider.buttonLink || '');
    setSortOrder(slider.sortOrder || 1);
    setActive(slider.active);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const uploaded = await uploadProductImage(file, 'sliders');
      setImage(uploaded.url);
    } catch (err: any) {
      setFormError('Image upload failed: ' + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (slider: SliderBanner) => {
    if (!window.confirm('Delete this banner?')) return;
    try {
      await deleteDoc(doc(db, 'sliders', slider.id));
      setSliders((prev) => prev.filter((s) => s.id !== slider.id));
      setFeedback('Banner removed.');
      setTimeout(() => setFeedback(null), 3000);
    } catch (err: any) {
      alert('Delete error: ' + err.message);
    }
  };

  const handleToggleActive = async (slider: SliderBanner) => {
    try {
      await updateDoc(doc(db, 'sliders', slider.id), {
        active: !slider.active,
      });
      setSliders((prev) =>
        prev.map((s) => (s.id === slider.id ? { ...s, active: !s.active } : s))
      );
    } catch (err: any) {
      alert('Update error: ' + err.message);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!image.trim()) {
      setFormError('Please provide or upload a banner image.');
      return;
    }

    setIsSaving(true);
    try {
      const sliderId = editingSlider ? editingSlider.id : `slider-${Date.now()}`;
      const payload: SliderBanner = {
        id: sliderId,
        title: title.trim(),
        subtitle: subtitle.trim(),
        image: image.trim(),
        buttonText: buttonText.trim(),
        buttonLink: buttonLink.trim(),
        sortOrder: Number(sortOrder) || 1,
        active: active,
        createdAt: editingSlider?.createdAt || serverTimestamp(),
      };

      await setDoc(doc(db, 'sliders', sliderId), payload, { merge: true });
      setIsModalOpen(false);
      setFeedback('Banner saved successfully!');
      fetchSliders();
      setTimeout(() => setFeedback(null), 3000);
    } catch (err: any) {
      setFormError('Save failed: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight">
            Homepage Hero Banners & Sliders
          </h2>
          <p className="text-xs text-stone-500">
            Control the high-impact promotional carousel on the customer storefront.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-stone-950 font-bold rounded-xl text-xs flex items-center gap-2 shadow-md transition-all shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Banner</span>
        </button>
      </div>

      {feedback && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Sliders Grid */}
      {loading ? (
        <div className="py-16 flex flex-col items-center justify-center text-stone-400 gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
          <p className="text-xs">Loading banners...</p>
        </div>
      ) : sliders.length === 0 ? (
        <div className="py-16 text-center text-stone-400 space-y-2 text-xs bg-white rounded-3xl border border-stone-200">
          <Sliders className="w-10 h-10 mx-auto text-stone-300" />
          <p className="font-bold text-stone-700">No sliders configured</p>
          <p className="text-stone-500">Add a banner to feature special campaigns.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sliders.map((s) => (
            <div
              key={s.id}
              className="bg-white rounded-3xl border border-stone-200/80 shadow-xs overflow-hidden flex flex-col justify-between"
            >
              <div className="relative h-44 bg-stone-900 overflow-hidden">
                <img
                  src={s.image}
                  alt={s.title || 'Slider'}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover opacity-80"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent p-4 flex flex-col justify-end text-white">
                  <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">
                    Banner #{s.sortOrder}
                  </span>
                  <h3 className="font-extrabold text-base leading-tight text-white">{s.title || 'Untitled Banner'}</h3>
                  <p className="text-xs text-stone-300 line-clamp-1">{s.subtitle}</p>
                </div>
              </div>

              <div className="p-3.5 flex items-center justify-between bg-stone-50 border-t border-stone-100">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggleActive(s)}
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      s.active ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-200 text-stone-600'
                    }`}
                  >
                    {s.active ? 'Active' : 'Hidden'}
                  </button>
                  {s.buttonText && (
                    <span className="text-[11px] text-stone-500">CTA: "{s.buttonText}"</span>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleOpenEdit(s)}
                    className="p-1.5 text-stone-600 hover:text-amber-700 hover:bg-stone-200 rounded-lg transition-colors"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(s)}
                    className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 overflow-y-auto animate-in fade-in duration-200"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden border border-stone-200 animate-in zoom-in-95 duration-250 p-5 space-y-4"
          >
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h3 className="font-bold text-base text-stone-900">
                {editingSlider ? 'Edit Slider Banner' : 'New Slider Banner'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-stone-400 hover:text-stone-900">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3.5">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Banner Headline</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Eid Mega Sale • Up to 40% Off"
                  className="w-full px-3 py-2 bg-white border border-stone-300 focus:border-amber-500 rounded-xl text-xs text-stone-900 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Subtitle / Campaign Pitch</label>
                <input
                  type="text"
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
                  placeholder="e.g. Fast delivery in Dhaka & across 64 districts."
                  className="w-full px-3 py-2 bg-white border border-stone-300 focus:border-amber-500 rounded-xl text-xs text-stone-900 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Banner Image URL / Upload *</label>
                <div className="flex gap-2 items-center">
                  <input
                    type="text"
                    required
                    value={image}
                    onChange={(e) => setImage(e.target.value)}
                    placeholder="https://... or click Upload"
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
                  <label className="block text-xs font-bold text-stone-700 mb-1">Button Text</label>
                  <input
                    type="text"
                    value={buttonText}
                    onChange={(e) => setButtonText(e.target.value)}
                    placeholder="Shop Now"
                    className="w-full px-3 py-2 bg-white border border-stone-300 focus:border-amber-500 rounded-xl text-xs text-stone-900 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Display Order</label>
                  <input
                    type="number"
                    value={sortOrder}
                    onChange={(e) => setSortOrder(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white border border-stone-300 focus:border-amber-500 rounded-xl text-xs text-stone-900 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-stone-50 rounded-xl border border-stone-200 text-xs">
                <span className="font-bold text-stone-800">Banner Visibility</span>
                <button
                  type="button"
                  onClick={() => setActive(!active)}
                  className={`px-3 py-1 rounded-lg font-bold ${
                    active ? 'bg-emerald-600 text-white' : 'bg-stone-300 text-stone-700'
                  }`}
                >
                  {active ? 'Visible' : 'Hidden'}
                </button>
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
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Banner'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
