import React, { useState, useEffect, useRef } from 'react';
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
  Image as ImageIcon,
  Link as LinkIcon,
  Sparkles,
  Eye,
  ArrowUp,
  ArrowDown,
  Copy,
  Layers,
  ShoppingBag,
  ArrowRight,
  Palette,
  ExternalLink,
  Flame,
  Zap,
  Tag,
  Wand2
} from 'lucide-react';
import { 
  doc, 
  setDoc, 
  deleteDoc, 
  updateDoc, 
  collection, 
  getDocs, 
  onSnapshot,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { uploadSliderBannerImage, deleteStorageImage } from '../../lib/storage';
import { SliderBanner, Category } from '../../types';

interface BannerPreset {
  id: string;
  name: string;
  categoryTag: string;
  image: string;
  suggestedTitle: string;
  suggestedSubtitle: string;
  suggestedBadge: string;
  suggestedBadgeColor: 'amber' | 'emerald' | 'rose' | 'indigo' | 'purple' | 'blue';
  suggestedButtonText: string;
  suggestedTarget?: string;
  overlayStyle: 'dark' | 'subtle' | 'vibrant' | 'minimal';
}

const BANNER_PRESETS: BannerPreset[] = [
  {
    id: 'preset-audio',
    name: 'Audio & Gadgets',
    categoryTag: 'Gadgets',
    image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=1600&q=80',
    suggestedTitle: 'Super Sound & Wireless ANC',
    suggestedSubtitle: 'Noise-cancelling wireless headphones, earbuds & smart speakers with up to 40% discount.',
    suggestedBadge: '🔥 HOT DEALS • 40% OFF',
    suggestedBadgeColor: 'amber',
    suggestedButtonText: 'Shop Gadgets',
    suggestedTarget: 'cat-audio',
    overlayStyle: 'dark',
  },
  {
    id: 'preset-watch',
    name: 'Smartwatches & Fitness',
    categoryTag: 'Wearables',
    image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=1600&q=80',
    suggestedTitle: 'Next-Gen AMOLED Smartwatches',
    suggestedSubtitle: 'Waterproof fitness tracking, Bluetooth calling & long battery life with instant delivery in BD.',
    suggestedBadge: '⚡ FLASH SALE',
    suggestedBadgeColor: 'emerald',
    suggestedButtonText: 'Shop Wearables',
    suggestedTarget: 'cat-smartphones',
    overlayStyle: 'dark',
  },
  {
    id: 'preset-fashion',
    name: 'Men & Women Fashion',
    categoryTag: 'Fashion',
    image: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=1600&q=80',
    suggestedTitle: 'Summer & Festive Collection 2026',
    suggestedSubtitle: 'Premium panjabis, stylish polo tees, casual shirts and denim wear for every celebration.',
    suggestedBadge: '✨ NEW ARRIVAL',
    suggestedBadgeColor: 'rose',
    suggestedButtonText: 'Explore Fashion',
    suggestedTarget: 'cat-fashion',
    overlayStyle: 'dark',
  },
  {
    id: 'preset-eid',
    name: 'Eid Special Festival',
    categoryTag: 'Festive',
    image: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?auto=format&fit=crop&w=1600&q=80',
    suggestedTitle: 'Eid Mubarak Grand Mega Sale',
    suggestedSubtitle: 'Huge discounts, gift hampers & free home delivery across 64 districts.',
    suggestedBadge: '🎉 EID SPECIAL 2026',
    suggestedBadgeColor: 'amber',
    suggestedButtonText: 'Grab Eid Offers',
    overlayStyle: 'vibrant',
  },
  {
    id: 'preset-tech',
    name: 'Smartphones & Tech Gear',
    categoryTag: 'Smartphones',
    image: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=1600&q=80',
    suggestedTitle: 'Mega Smartphone & Accessories Deals',
    suggestedSubtitle: 'GaN fast chargers, magnetic power banks, camera lenses & cases at unbeatable prices.',
    suggestedBadge: '💥 MEGA DISCOUNTS',
    suggestedBadgeColor: 'indigo',
    suggestedButtonText: 'View Tech Deals',
    suggestedTarget: 'cat-smartphones',
    overlayStyle: 'dark',
  },
  {
    id: 'preset-beauty',
    name: 'Beauty & Skincare',
    categoryTag: 'Beauty',
    image: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=1600&q=80',
    suggestedTitle: 'Luxury Fragrance & Organic Skincare',
    suggestedSubtitle: '100% authentic imported perfumes, moisturizers and gentle beauty essentials.',
    suggestedBadge: '🌟 100% AUTHENTIC',
    suggestedBadgeColor: 'purple',
    suggestedButtonText: 'Shop Beauty',
    suggestedTarget: 'cat-beauty',
    overlayStyle: 'subtle',
  },
  {
    id: 'preset-gaming',
    name: 'Gaming & Work Setup',
    categoryTag: 'Electronics',
    image: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=1600&q=80',
    suggestedTitle: 'Pro Gaming & Desk Setup Upgrades',
    suggestedSubtitle: 'RGB mechanical keyboards, precision mice, monitor arms and ergonomic accessories.',
    suggestedBadge: '🚀 LEVEL UP YOUR SETUP',
    suggestedBadgeColor: 'blue',
    suggestedButtonText: 'Gear Up Now',
    suggestedTarget: 'cat-accessories',
    overlayStyle: 'dark',
  },
  {
    id: 'preset-home',
    name: 'Modern Home & Living',
    categoryTag: 'Home',
    image: 'https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?auto=format&fit=crop&w=1600&q=80',
    suggestedTitle: 'Modern Comfort for Home & Office',
    suggestedSubtitle: 'Smart LED ambient lights, organizers, desk clocks and lifestyle innovations.',
    suggestedBadge: '🌿 TRENDING NOW',
    suggestedBadgeColor: 'emerald',
    suggestedButtonText: 'Explore Living',
    suggestedTarget: 'cat-home',
    overlayStyle: 'dark',
  },
];

const BADGE_SUGGESTIONS = [
  '🔥 HOT DEALS • 40% OFF',
  '⚡ FLASH SALE',
  '🎉 EID SPECIAL 2026',
  '✨ NEW ARRIVAL',
  '💥 MEGA SAVINGS',
  '🌟 BESTSELLER',
  '🚚 FREE HOME DELIVERY',
  '🏷️ 10% OFF WITH CODE',
];

const CTA_SUGGESTIONS = [
  'Shop Now',
  'Explore Hot Deals',
  'Order Now (COD)',
  'Claim Discount',
  'View Collection',
  'Shop Gadgets',
  'Grab Deal',
];

export const AdminSlidersTab: React.FC = () => {
  const [sliders, setSliders] = useState<SliderBanner[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSlider, setEditingSlider] = useState<SliderBanner | null>(null);

  // Photo Source Selection Tab: 'upload' | 'url' | 'presets'
  const [photoSourceTab, setPhotoSourceTab] = useState<'upload' | 'url' | 'presets'>('upload');

  // Form Fields
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [image, setImage] = useState('');
  const [storagePath, setStoragePath] = useState<string | undefined>(undefined);
  const [badge, setBadge] = useState('🔥 HOT DEALS • 40% OFF');
  const [badgeColor, setBadgeColor] = useState<'amber' | 'emerald' | 'rose' | 'indigo' | 'purple' | 'blue'>('amber');
  const [buttonText, setButtonText] = useState('Shop Now');
  const [targetType, setTargetType] = useState<'all' | 'category' | 'custom'>('all');
  const [buttonTarget, setButtonTarget] = useState('');
  const [buttonLink, setButtonLink] = useState('');
  const [overlayStyle, setOverlayStyle] = useState<'dark' | 'subtle' | 'vibrant' | 'minimal'>('dark');
  const [sortOrder, setSortOrder] = useState<number>(1);
  const [active, setActive] = useState(true);

  // Upload State
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Modal / Action State
  const [isSaving, setIsSaving] = useState(false);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
  const [sliderToDelete, setSliderToDelete] = useState<SliderBanner | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    // Real-time listener for sliders
    const unsubSliders = onSnapshot(
      collection(db, 'sliders'),
      (snap) => {
        const list: SliderBanner[] = [];
        snap.forEach((docSnap) => {
          list.push({ id: docSnap.id, ...docSnap.data() } as SliderBanner);
        });
        list.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
        setSliders(list);
        setLoading(false);
      },
      (err) => {
        console.warn('Error listening to sliders:', err);
        setLoading(false);
      }
    );

    // Real-time listener for categories
    const unsubCategories = onSnapshot(
      collection(db, 'categories'),
      (snap) => {
        const catList: Category[] = [];
        snap.forEach((c) => {
          catList.push({ id: c.id, ...c.data() } as Category);
        });
        catList.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
        setCategories(catList);
      },
      (err) => {
        console.warn('Error listening to categories in sliders tab:', err);
      }
    );

    return () => {
      unsubSliders();
      unsubCategories();
    };
  }, []);

  const handleOpenAdd = () => {
    setEditingSlider(null);
    setTitle('Mega Gadget & Lifestyle Festival 2026');
    setSubtitle('Exclusive discounts on smart devices, audio gear, and electronics across 64 districts.');
    setImage('');
    setStoragePath(undefined);
    setBadge('🔥 HOT DEALS • 40% OFF');
    setBadgeColor('amber');
    setButtonText('Shop Now');
    setTargetType('all');
    setButtonTarget('');
    setButtonLink('');
    setOverlayStyle('dark');
    setSortOrder(sliders.length + 1);
    setActive(true);
    setPhotoSourceTab('upload');
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (slider: SliderBanner) => {
    setEditingSlider(slider);
    setTitle(slider.title || '');
    setSubtitle(slider.subtitle || '');
    setImage(slider.image || '');
    setStoragePath(slider.storagePath);
    setBadge(slider.badge || 'Featured Campaign');
    setBadgeColor(slider.badgeColor || 'amber');
    setButtonText(slider.buttonText || 'Shop Now');

    if (slider.buttonLink && slider.buttonLink.startsWith('http')) {
      setTargetType('custom');
      setButtonLink(slider.buttonLink);
      setButtonTarget('');
    } else if (slider.buttonTarget || slider.categorySlug) {
      setTargetType('category');
      setButtonTarget(slider.buttonTarget || slider.categorySlug || '');
      setButtonLink('');
    } else {
      setTargetType('all');
      setButtonTarget('');
      setButtonLink('');
    }

    setOverlayStyle(slider.overlayStyle || 'dark');
    setSortOrder(slider.sortOrder || 1);
    setActive(slider.active !== false);
    setPhotoSourceTab(slider.image.startsWith('http') ? 'url' : 'upload');
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleFileUpload = async (file: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setFormError('Please select a valid image file (PNG, JPG, WEBP, or SVG).');
      return;
    }

    setIsUploading(true);
    setUploadProgress(15);
    setFormError(null);

    try {
      const uploaded = await uploadSliderBannerImage(file, (progress) => {
        setUploadProgress(progress);
      });

      // If old storage path existed and changed, schedule cleanup
      if (storagePath && storagePath !== uploaded.storagePath) {
        deleteStorageImage(storagePath);
      }

      setImage(uploaded.url);
      setStoragePath(uploaded.storagePath);
      setFeedback('Banner photo uploaded successfully!');
      setTimeout(() => setFeedback(null), 3000);
    } catch (err: any) {
      setFormError('Photo upload failed: ' + err.message);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleApplyPreset = (preset: BannerPreset, applyText = false) => {
    setImage(preset.image);
    setStoragePath(undefined);
    setOverlayStyle(preset.overlayStyle);

    if (applyText || !title.trim()) {
      setTitle(preset.suggestedTitle);
      setSubtitle(preset.suggestedSubtitle);
      setBadge(preset.suggestedBadge);
      setBadgeColor(preset.suggestedBadgeColor);
      setButtonText(preset.suggestedButtonText);
      if (preset.suggestedTarget) {
        setTargetType('category');
        setButtonTarget(preset.suggestedTarget);
      }
    }

    setFeedback(`Applied "${preset.name}" preset background!`);
    setTimeout(() => setFeedback(null), 2500);
  };

  const handleToggleActive = async (slider: SliderBanner) => {
    try {
      const newActive = !slider.active;
      await updateDoc(doc(db, 'sliders', slider.id), {
        active: newActive,
        updatedAt: serverTimestamp(),
      });
      setSliders((prev) =>
        prev.map((s) => (s.id === slider.id ? { ...s, active: newActive } : s))
      );
    } catch (err: any) {
      alert('Toggle error: ' + err.message);
    }
  };

  const handleMoveOrder = async (slider: SliderBanner, direction: 'up' | 'down') => {
    const currentIndex = sliders.findIndex((s) => s.id === slider.id);
    if (currentIndex === -1) return;
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= sliders.length) return;

    const currentItem = sliders[currentIndex];
    const targetItem = sliders[targetIndex];

    const currentOrder = currentItem.sortOrder || currentIndex + 1;
    const targetOrder = targetItem.sortOrder || targetIndex + 1;

    try {
      await updateDoc(doc(db, 'sliders', currentItem.id), {
        sortOrder: targetOrder,
        updatedAt: serverTimestamp(),
      });
      await updateDoc(doc(db, 'sliders', targetItem.id), {
        sortOrder: currentOrder,
        updatedAt: serverTimestamp(),
      });

      const updatedList = [...sliders];
      updatedList[currentIndex] = { ...currentItem, sortOrder: targetOrder };
      updatedList[targetIndex] = { ...targetItem, sortOrder: currentOrder };
      updatedList.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
      setSliders(updatedList);
    } catch (err: any) {
      alert('Reorder failed: ' + err.message);
    }
  };

  const handleDuplicate = async (slider: SliderBanner) => {
    try {
      const newId = `slider-${Date.now()}`;
      const payload: SliderBanner = {
        ...slider,
        id: newId,
        title: `${slider.title || 'Banner'} (Copy)`,
        sortOrder: sliders.length + 1,
        active: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      await setDoc(doc(db, 'sliders', newId), payload);
      setFeedback('Banner duplicated successfully!');
      setTimeout(() => setFeedback(null), 3000);
    } catch (err: any) {
      alert('Duplicate failed: ' + err.message);
    }
  };

  const handleSeedSampleBanners = async () => {
    try {
      setLoading(true);
      const sample1: SliderBanner = {
        id: `slider-${Date.now()}-1`,
        title: 'Super Sound & Wireless ANC',
        subtitle: 'Noise-cancelling wireless headphones, earbuds & smart speakers with up to 40% discount.',
        image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=1600&q=80',
        badge: '🔥 HOT DEALS • 40% OFF',
        badgeColor: 'amber',
        buttonText: 'Shop Gadgets',
        buttonTarget: 'cat-audio',
        overlayStyle: 'dark',
        sortOrder: 1,
        active: true,
        createdAt: serverTimestamp(),
      };

      const sample2: SliderBanner = {
        id: `slider-${Date.now()}-2`,
        title: 'Summer Fashion Drop 2026',
        subtitle: 'Breathable linen shirts, premium panjabis and trendsetter fits with fast Cash on Delivery.',
        image: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=1600&q=80',
        badge: '✨ NEW ARRIVAL',
        badgeColor: 'rose',
        buttonText: 'Explore Styles',
        buttonTarget: 'cat-fashion',
        overlayStyle: 'dark',
        sortOrder: 2,
        active: true,
        createdAt: serverTimestamp(),
      };

      const sample3: SliderBanner = {
        id: `slider-${Date.now()}-3`,
        title: 'Next-Gen AMOLED Smartwatches',
        subtitle: 'Waterproof fitness tracking, Bluetooth calling & long battery life nationwide in Bangladesh.',
        image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=1600&q=80',
        badge: '⚡ FLASH SALE',
        badgeColor: 'emerald',
        buttonText: 'Shop Wearables',
        buttonTarget: 'cat-smartphones',
        overlayStyle: 'dark',
        sortOrder: 3,
        active: true,
        createdAt: serverTimestamp(),
      };

      await setDoc(doc(db, 'sliders', sample1.id), sample1);
      await setDoc(doc(db, 'sliders', sample2.id), sample2);
      await setDoc(doc(db, 'sliders', sample3.id), sample3);

      setFeedback('3 High-Converting Sample Banners Added!');
      setTimeout(() => setFeedback(null), 3500);
    } catch (err: any) {
      alert('Failed to add sample banners: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!sliderToDelete) return;
    const target = sliderToDelete;
    setIsDeletingId(target.id);
    try {
      if (target.storagePath) {
        deleteStorageImage(target.storagePath);
      }
      await deleteDoc(doc(db, 'sliders', target.id));
      setSliders((prev) => prev.filter((s) => s.id !== target.id));
      setSliderToDelete(null);
      setFeedback('Banner deleted permanently.');
      setTimeout(() => setFeedback(null), 3000);
    } catch (err: any) {
      alert('Delete error: ' + err.message);
    } finally {
      setIsDeletingId(null);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!image.trim()) {
      setFormError('Please select or upload a banner image.');
      return;
    }

    if (!title.trim()) {
      setFormError('Please enter a banner headline / title.');
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
        storagePath: storagePath || undefined,
        badge: badge.trim() || 'Featured Campaign',
        badgeColor: badgeColor || 'amber',
        buttonText: buttonText.trim() || 'Shop Now',
        buttonTarget: targetType === 'category' ? buttonTarget : undefined,
        categorySlug: targetType === 'category' ? buttonTarget : undefined,
        buttonLink: targetType === 'custom' ? buttonLink.trim() : undefined,
        overlayStyle: overlayStyle || 'dark',
        sortOrder: Number(sortOrder) || 1,
        active: active,
        createdAt: editingSlider?.createdAt || serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      await setDoc(doc(db, 'sliders', sliderId), payload, { merge: true });
      setIsModalOpen(false);
      setFeedback(editingSlider ? 'Banner updated successfully!' : 'New banner published successfully!');
      setTimeout(() => setFeedback(null), 3000);
    } catch (err: any) {
      setFormError('Save failed: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const getBadgeColorClass = (color: string) => {
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

  const getOverlayGradientClass = (style: string) => {
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
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="flex items-center justify-between flex-wrap gap-4 bg-white p-5 sm:p-6 rounded-3xl border border-stone-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Sliders className="w-5 h-5 text-amber-600" />
            <h2 className="text-lg sm:text-xl font-black text-stone-900 tracking-tight">
              Homepage Hero Banners & Sliders (ব্যানার ও স্লাইডার কন্ট্রোল)
            </h2>
          </div>
          <p className="text-xs text-stone-500">
            ওয়েবসাইটের হোমপেজে চলমান অফার, ডিসকাউন্ট ও ক্যাম্পেইনের আকর্ষণীয় স্লাইডার ব্যানার যোগ ও সাজান।
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {sliders.length === 0 && (
            <button
              onClick={handleSeedSampleBanners}
              disabled={loading}
              className="px-3.5 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all"
            >
              <Wand2 className="w-4 h-4 text-amber-600" />
              <span>নমুনা ব্যানার লোড করুন</span>
            </button>
          )}

          <button
            onClick={handleOpenAdd}
            className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 active:scale-98 text-stone-950 font-black rounded-xl text-xs flex items-center gap-2 shadow-md shadow-amber-500/20 transition-all shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>নতুন ব্যানার যুক্ত করুন</span>
          </button>
        </div>
      </div>

      {feedback && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-800 flex items-center gap-2 font-bold animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Sliders Grid List */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center text-stone-400 gap-2 bg-white rounded-3xl border border-stone-200">
          <Loader2 className="w-7 h-7 animate-spin text-amber-500" />
          <p className="text-xs font-bold text-stone-600">ব্যানারগুলো লোড হচ্ছে...</p>
        </div>
      ) : sliders.length === 0 ? (
        <div className="py-16 px-6 text-center text-stone-400 space-y-4 bg-white rounded-3xl border border-stone-200">
          <div className="w-14 h-14 rounded-3xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto shadow-xs">
            <Sliders className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h3 className="font-extrabold text-base text-stone-800">এখনো কোনো ব্যানার তৈরি করা হয়নি</h3>
            <p className="text-xs text-stone-500 max-w-md mx-auto">
              নতুন ব্যানার যোগ করুন অথবা এক ক্লিকেই ৩টি প্রিমিয়াম স্যাম্পল ব্যানার লোড করে সহজে এডিট করুন।
            </p>
          </div>
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={handleSeedSampleBanners}
              className="px-4 py-2.5 bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold rounded-xl text-xs flex items-center gap-2 transition-all"
            >
              <Wand2 className="w-4 h-4 text-amber-700" />
              <span>৩টি স্যাম্পল ব্যানার যুক্ত করুন</span>
            </button>
            <button
              onClick={handleOpenAdd}
              className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-stone-950 font-black rounded-xl text-xs flex items-center gap-2 shadow-sm transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>নিজে নতুন ব্যানার বানান</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {sliders.map((s, idx) => (
            <div
              key={s.id}
              className="bg-white rounded-3xl border border-stone-200/80 shadow-xs overflow-hidden flex flex-col justify-between group hover:border-amber-400/80 transition-all"
            >
              {/* Image Preview with Banner Simulation */}
              <div className="relative h-48 bg-stone-900 overflow-hidden">
                <img
                  src={s.image}
                  alt={s.title || 'Slider'}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover opacity-85 group-hover:scale-102 transition-transform duration-500"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=1400&q=80';
                  }}
                />

                {/* Banner Gradient Overlay */}
                <div
                  className={`absolute inset-0 bg-gradient-to-r ${getOverlayGradientClass(
                    s.overlayStyle || 'dark'
                  )} p-4 sm:p-5 flex flex-col justify-end text-white`}
                >
                  <div className="space-y-1.5 max-w-[85%]">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${getBadgeColorClass(
                          s.badgeColor || 'amber'
                        )}`}
                      >
                        {s.badge || 'Featured Campaign'}
                      </span>
                      <span className="text-[10px] font-bold text-stone-300 font-mono">
                        #{s.sortOrder || idx + 1}
                      </span>
                    </div>

                    <h3 className="font-extrabold text-sm sm:text-base leading-tight text-white line-clamp-1 drop-shadow-xs">
                      {s.title || 'Untitled Banner'}
                    </h3>

                    {s.subtitle && (
                      <p className="text-[11px] text-stone-200 line-clamp-1 font-medium">
                        {s.subtitle}
                      </p>
                    )}
                  </div>
                </div>

                {/* Quick Status Tag on top-right */}
                <div className="absolute top-3 right-3 flex items-center gap-1.5">
                  <button
                    onClick={() => handleToggleActive(s)}
                    className={`px-2.5 py-1 rounded-full text-[10px] font-bold backdrop-blur-md shadow-sm transition-all ${
                      s.active !== false
                        ? 'bg-emerald-500/90 text-white'
                        : 'bg-stone-800/90 text-stone-300'
                    }`}
                  >
                    {s.active !== false ? 'Live • দৃশ্যমান' : 'Hidden • লুকানো'}
                  </button>
                </div>
              </div>

              {/* Bottom Card Controls */}
              <div className="p-4 bg-stone-50 border-t border-stone-100 flex items-center justify-between flex-wrap gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-1 bg-white border border-stone-200 rounded-lg text-[11px] font-bold text-stone-700">
                    CTA: "{s.buttonText || 'Shop Now'}"
                  </span>
                  {s.buttonTarget && (
                    <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                      🎯 {categories.find((c) => c.id === s.buttonTarget)?.name || s.buttonTarget}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  {/* Move Up/Down Order */}
                  <button
                    onClick={() => handleMoveOrder(s, 'up')}
                    disabled={idx === 0}
                    title="আগে নিন (Move Up)"
                    className="p-1.5 text-stone-500 hover:text-stone-900 hover:bg-stone-200 rounded-lg transition-colors disabled:opacity-30"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleMoveOrder(s, 'down')}
                    disabled={idx === sliders.length - 1}
                    title="পরে নিন (Move Down)"
                    className="p-1.5 text-stone-500 hover:text-stone-900 hover:bg-stone-200 rounded-lg transition-colors disabled:opacity-30"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>

                  {/* Duplicate */}
                  <button
                    onClick={() => handleDuplicate(s)}
                    title="কপি / ডুপ্লিকেট করুন"
                    className="p-1.5 text-stone-500 hover:text-amber-700 hover:bg-stone-200 rounded-lg transition-colors"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>

                  {/* Edit */}
                  <button
                    onClick={() => handleOpenEdit(s)}
                    title="এডিট করুন"
                    className="p-1.5 text-stone-700 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>

                  {/* Delete */}
                  <button
                    onClick={() => setSliderToDelete(s)}
                    disabled={isDeletingId === s.id}
                    title="মুছে ফেলুন"
                    className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {isDeletingId === s.id ? (
                      <Loader2 className="w-4 h-4 animate-spin text-rose-600" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* NEW / EDIT SLIDER BANNER MODAL */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200"
          onClick={() => !isSaving && !isUploading && setIsModalOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden border border-stone-200 animate-in zoom-in-95 duration-200 max-h-[92vh] flex flex-col"
          >
            {/* Modal Header */}
            <div className="p-5 border-b border-stone-100 flex items-center justify-between shrink-0 bg-stone-50/60">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
                  <Sliders className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-stone-900 leading-tight">
                    {editingSlider ? 'ব্যানার এডিট করুন (Edit Banner)' : 'নতুন ব্যানার তৈরি করুন (Create Banner)'}
                  </h3>
                  <p className="text-[11px] text-stone-500">
                    ছবি আপলোড করুন, অফার টাইটেল, ব্যাজ ও বাটন কাস্টমাইজ করুন।
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-stone-400 hover:text-stone-800 hover:bg-stone-200 rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">
              {formError && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}

              {/* SECTION 1: LIVE STOREFRONT BANNER SIMULATION PREVIEW */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-stone-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Eye className="w-3.5 h-3.5 text-amber-600" />
                    লাইভ স্টোরফ্রন্ট প্রিভিউ (Live Preview)
                  </label>
                  <span className="text-[10px] text-stone-400">গ্রাহকরা যেমন দেখবে</span>
                </div>

                <div className="relative h-44 sm:h-52 rounded-2xl overflow-hidden bg-stone-950 border border-stone-300 shadow-md">
                  {image ? (
                    <img
                      src={image}
                      alt="Preview"
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-stone-500 bg-stone-900 gap-2">
                      <ImageIcon className="w-8 h-8 text-stone-600" />
                      <p className="text-xs">নিচে থেকে ফটো আপলোড করুন বা লিংক দিন</p>
                    </div>
                  )}

                  {/* Gradient Overlay & Content */}
                  <div
                    className={`absolute inset-0 bg-gradient-to-r ${getOverlayGradientClass(
                      overlayStyle
                    )} p-4 sm:p-6 flex flex-col justify-center text-white`}
                  >
                    <div className="max-w-md space-y-2">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${getBadgeColorClass(
                          badgeColor
                        )}`}
                      >
                        <Sparkles className="w-3 h-3" />
                        <span>{badge || 'Featured Campaign'}</span>
                      </span>

                      <h2 className="text-base sm:text-2xl font-black text-white leading-tight line-clamp-2">
                        {title || 'Banner Headline Here'}
                      </h2>

                      {subtitle && (
                        <p className="text-[11px] sm:text-xs text-stone-200 line-clamp-2 font-medium">
                          {subtitle}
                        </p>
                      )}

                      <div className="pt-1">
                        <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-500 text-stone-950 font-black text-xs rounded-xl shadow-md">
                          <ShoppingBag className="w-3.5 h-3.5" />
                          <span>{buttonText || 'Shop Now'}</span>
                          <ArrowRight className="w-3 h-3" />
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 2: PHOTO SOURCE SELECTION (Upload, Direct URL, Preset Library) */}
              <div className="p-4 sm:p-5 bg-stone-50 rounded-2xl border border-stone-200/80 space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <label className="text-xs font-bold text-stone-800 uppercase tracking-wider flex items-center gap-1.5">
                    <ImageIcon className="w-4 h-4 text-amber-600" />
                    ১. ব্যানার ব্যাকগ্রাউন্ড ছবি সিলেক্ট করুন (Photo Source) *
                  </label>

                  {/* Tab Selector */}
                  <div className="flex items-center bg-stone-200/80 p-1 rounded-xl gap-1">
                    <button
                      type="button"
                      onClick={() => setPhotoSourceTab('upload')}
                      className={`px-3 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                        photoSourceTab === 'upload'
                          ? 'bg-white text-stone-900 shadow-xs'
                          : 'text-stone-600 hover:text-stone-900'
                      }`}
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>ফাইল আপলোড</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPhotoSourceTab('url')}
                      className={`px-3 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                        photoSourceTab === 'url'
                          ? 'bg-white text-stone-900 shadow-xs'
                          : 'text-stone-600 hover:text-stone-900'
                      }`}
                    >
                      <LinkIcon className="w-3.5 h-3.5" />
                      <span>ইমেজ লিংক (URL)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPhotoSourceTab('presets')}
                      className={`px-3 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                        photoSourceTab === 'presets'
                          ? 'bg-amber-500 text-stone-950 shadow-xs'
                          : 'text-stone-600 hover:text-stone-900'
                      }`}
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>HD প্রিসেট গ্যালারি</span>
                    </button>
                  </div>
                </div>

                {/* Option 1: File Upload */}
                {photoSourceTab === 'upload' && (
                  <div className="space-y-2">
                    <div
                      onDragOver={(e) => {
                        e.preventDefault();
                        setIsDragOver(true);
                      }}
                      onDragLeave={() => setIsDragOver(false)}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className={`p-6 border-2 border-dashed rounded-2xl text-center cursor-pointer transition-all ${
                        isDragOver
                          ? 'border-amber-500 bg-amber-50/50 scale-[1.01]'
                          : 'border-stone-300 hover:border-amber-500 bg-white hover:bg-amber-50/20'
                      }`}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
                        onChange={handleFileInputChange}
                        className="hidden"
                      />

                      {isUploading ? (
                        <div className="space-y-2">
                          <Loader2 className="w-7 h-7 text-amber-500 animate-spin mx-auto" />
                          <p className="text-xs font-bold text-stone-800">
                            ব্যানার ছবি আপলোড ও প্রসেসিং হচ্ছে...
                          </p>
                          <div className="w-48 h-2 bg-stone-200 rounded-full mx-auto overflow-hidden">
                            <div
                              className="h-full bg-amber-500 transition-all duration-200"
                              style={{ width: `${uploadProgress}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-stone-500 font-mono">{uploadProgress}%</span>
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          <div className="w-10 h-10 bg-amber-100 text-amber-800 rounded-xl flex items-center justify-center mx-auto mb-1 shadow-xs">
                            <Upload className="w-5 h-5" />
                          </div>
                          <p className="text-xs font-bold text-stone-800">
                            মোবাইল বা কম্পিউটার থেকে ব্যানার ছবি সিলেক্ট করুন
                          </p>
                          <p className="text-[11px] text-stone-500">
                            ক্লিক করুন অথবা ফাইল ড্র্যাগ করে এখানে ড্রপ করুন (PNG, JPG, WEBP, SVG)
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Option 2: Image URL */}
                {photoSourceTab === 'url' && (
                  <div className="space-y-2">
                    <label className="block text-[11px] font-bold text-stone-600">
                      ইমেজের সম্পূর্ণ ওয়েব লিংক দিন (Unsplash, Google Drive, Imgur, ইত্যাদি):
                    </label>
                    <input
                      type="url"
                      value={image}
                      onChange={(e) => {
                        setImage(e.target.value.trim());
                        setStoragePath(undefined);
                      }}
                      placeholder="https://images.unsplash.com/photo-...?w=1600&q=80"
                      className="w-full px-3.5 py-2.5 bg-white border border-stone-300 focus:border-amber-500 rounded-xl text-xs text-stone-900 focus:outline-hidden font-mono"
                    />
                  </div>
                )}

                {/* Option 3: Presets Gallery */}
                {photoSourceTab === 'presets' && (
                  <div className="space-y-3">
                    <p className="text-[11px] text-stone-600">
                      ক্লিক করলেই হাই-রেজ্যুলেশন ব্যাকগ্রাউন্ড সেট হয়ে যাবে:
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      {BANNER_PRESETS.map((p) => (
                        <div
                          key={p.id}
                          onClick={() => handleApplyPreset(p, false)}
                          className={`group relative rounded-xl overflow-hidden cursor-pointer border-2 transition-all ${
                            image === p.image
                              ? 'border-amber-500 shadow-md ring-2 ring-amber-400/40 scale-[1.02]'
                              : 'border-stone-200 hover:border-amber-400'
                          }`}
                        >
                          <img
                            src={p.image}
                            alt={p.name}
                            className="w-full h-20 object-cover group-hover:scale-105 transition-transform"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent p-1.5 flex flex-col justify-end">
                            <span className="text-[10px] font-bold text-white leading-tight drop-shadow-xs line-clamp-1">
                              {p.name}
                            </span>
                          </div>
                          {image === p.image && (
                            <div className="absolute top-1 right-1 w-5 h-5 bg-amber-500 text-stone-950 rounded-full flex items-center justify-center shadow-xs">
                              <Check className="w-3 h-3 stroke-[3]" />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* SECTION 3: BANNER CONTENT & HEADLINES */}
              <div className="space-y-4">
                <label className="text-xs font-bold text-stone-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Tag className="w-4 h-4 text-amber-600" />
                  ২. ব্যানার টাইটেল ও ক্যাম্পেইন বিবরণ (Text & Pitch)
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Headline Title */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-stone-700 mb-1">
                      ব্যানার হেডলাইন / মূল অফার (Headline Title) *
                    </label>
                    <input
                      type="text"
                      required
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g. Eid Mega Sale • Up to 40% Off"
                      className="w-full px-3.5 py-2.5 bg-white border border-stone-300 focus:border-amber-500 rounded-xl text-xs text-stone-900 focus:outline-hidden font-bold"
                    />
                  </div>

                  {/* Subtitle */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-stone-700 mb-1">
                      সাবটাইটেল / অফার বিবরণ (Subtitle / Description)
                    </label>
                    <input
                      type="text"
                      value={subtitle}
                      onChange={(e) => setSubtitle(e.target.value)}
                      placeholder="e.g. Exclusive discounts on gadgets & fast cash on delivery nationwide."
                      className="w-full px-3.5 py-2.5 bg-white border border-stone-300 focus:border-amber-500 rounded-xl text-xs text-stone-900 focus:outline-hidden"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 4: BADGE & COLOR CUSTOMIZATION */}
              <div className="space-y-3 p-4 bg-stone-50 rounded-2xl border border-stone-200/80">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-stone-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Flame className="w-4 h-4 text-amber-600" />
                    ৩. ক্যাম্পেইন ব্যাজ ও কালার (Badge & Highlights)
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-stone-600 mb-1">
                      ব্যাজ টেক্সট (Badge Label):
                    </label>
                    <input
                      type="text"
                      value={badge}
                      onChange={(e) => setBadge(e.target.value)}
                      placeholder="🔥 HOT DEALS • 40% OFF"
                      className="w-full px-3 py-2 bg-white border border-stone-300 focus:border-amber-500 rounded-xl text-xs text-stone-900 focus:outline-hidden font-bold"
                    />

                    {/* Quick Badge Suggestions */}
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {BADGE_SUGGESTIONS.slice(0, 4).map((b) => (
                        <button
                          key={b}
                          type="button"
                          onClick={() => setBadge(b)}
                          className="px-2 py-0.5 bg-white border border-stone-200 hover:border-amber-400 rounded-md text-[10px] text-stone-600 hover:text-stone-900 transition-colors"
                        >
                          {b}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-stone-600 mb-1">
                      ব্যাজ কালার থিম (Badge Color Theme):
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 'amber', name: 'গোল্ডেন (Amber)', bg: 'bg-amber-500 text-stone-950' },
                        { id: 'emerald', name: 'সবুজ (Green)', bg: 'bg-emerald-500 text-white' },
                        { id: 'rose', name: 'লাল (Rose)', bg: 'bg-rose-500 text-white' },
                        { id: 'indigo', name: 'নীল (Indigo)', bg: 'bg-indigo-600 text-white' },
                        { id: 'purple', name: 'বেগুনি (Purple)', bg: 'bg-purple-600 text-white' },
                        { id: 'blue', name: 'রয়্যাল ব্লু (Blue)', bg: 'bg-blue-600 text-white' },
                      ].map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => setBadgeColor(c.id as any)}
                          className={`p-2 rounded-xl text-[10px] font-bold text-center border-2 transition-all flex items-center justify-center gap-1 ${
                            badgeColor === c.id
                              ? 'border-amber-500 shadow-xs ring-1 ring-amber-400'
                              : 'border-stone-200 hover:border-stone-400 bg-white'
                          }`}
                        >
                          <span className={`w-3 h-3 rounded-full ${c.bg.split(' ')[0]}`} />
                          <span className="truncate">{c.name.split(' ')[0]}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 5: CTA BUTTON & TARGET LINK */}
              <div className="space-y-4">
                <label className="text-xs font-bold text-stone-800 uppercase tracking-wider flex items-center gap-1.5">
                  <ShoppingBag className="w-4 h-4 text-amber-600" />
                  ৪. কল-টু-অ্যাকশন বাটন ও ক্লিক অ্যাকশন (CTA & Action)
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Button Text */}
                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">
                      বাটন টেক্সট (Button Text)
                    </label>
                    <input
                      type="text"
                      value={buttonText}
                      onChange={(e) => setButtonText(e.target.value)}
                      placeholder="Shop Now"
                      className="w-full px-3.5 py-2.5 bg-white border border-stone-300 focus:border-amber-500 rounded-xl text-xs text-stone-900 focus:outline-hidden font-bold"
                    />
                    {/* Quick Button Text Suggestions */}
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {CTA_SUGGESTIONS.slice(0, 4).map((cta) => (
                        <button
                          key={cta}
                          type="button"
                          onClick={() => setButtonText(cta)}
                          className="px-2 py-0.5 bg-stone-100 hover:bg-stone-200 rounded-md text-[10px] text-stone-600 transition-colors"
                        >
                          {cta}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Target Action Type */}
                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">
                      বাটন ক্লিকে কী হবে? (Destination Target)
                    </label>
                    <select
                      value={targetType}
                      onChange={(e) => setTargetType(e.target.value as any)}
                      className="w-full px-3.5 py-2.5 bg-white border border-stone-300 focus:border-amber-500 rounded-xl text-xs text-stone-900 focus:outline-hidden font-bold"
                    >
                      <option value="all">সব প্রোডাক্ট লিস্টে নিয়ে যাবে (All Products)</option>
                      <option value="category">নির্দিষ্ট ক্যাটাগরি ফিল্টার করবে (Category)</option>
                      <option value="custom">কাস্টম ওয়েব লিংক (External / Custom URL)</option>
                    </select>

                    {/* If Category is selected */}
                    {targetType === 'category' && (
                      <div className="mt-2">
                        <select
                          value={buttonTarget}
                          onChange={(e) => setButtonTarget(e.target.value)}
                          className="w-full px-3 py-2 bg-amber-50/50 border border-amber-300 rounded-xl text-xs text-stone-900 focus:outline-hidden font-bold"
                        >
                          <option value="">-- ক্যাটাগরি সিলেক্ট করুন --</option>
                          {categories.map((cat) => (
                            <option key={cat.id} value={cat.id}>
                              {cat.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* If Custom Link is selected */}
                    {targetType === 'custom' && (
                      <div className="mt-2">
                        <input
                          type="url"
                          value={buttonLink}
                          onChange={(e) => setButtonLink(e.target.value.trim())}
                          placeholder="https://example.com/campaign"
                          className="w-full px-3 py-2 bg-amber-50/50 border border-amber-300 rounded-xl text-xs text-stone-900 focus:outline-hidden font-mono"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* SECTION 6: OVERLAY STYLE, SORT ORDER & VISIBILITY */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-stone-100">
                {/* Overlay Style */}
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    ওভারলে শেড (Overlay Shade)
                  </label>
                  <select
                    value={overlayStyle}
                    onChange={(e) => setOverlayStyle(e.target.value as any)}
                    className="w-full px-3 py-2 bg-white border border-stone-300 focus:border-amber-500 rounded-xl text-xs text-stone-900 focus:outline-hidden"
                  >
                    <option value="dark">ডার্ক গ্র্যাডিয়েন্ট (Dark - স্পষ্ট টেক্সট)</option>
                    <option value="subtle">হালকা শ্যাডো (Subtle)</option>
                    <option value="vibrant">গোল্ডেন ভাইব্রেন্ট (Vibrant Festive)</option>
                    <option value="minimal">মিনিমাল (Minimal)</option>
                  </select>
                </div>

                {/* Display Order */}
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    প্রদর্শনের ক্রম (Sort Order)
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={sortOrder}
                    onChange={(e) => setSortOrder(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white border border-stone-300 focus:border-amber-500 rounded-xl text-xs text-stone-900 focus:outline-hidden font-bold"
                  />
                </div>

                {/* Banner Visibility */}
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    ব্যানার স্ট্যাটাস (Visibility)
                  </label>
                  <button
                    type="button"
                    onClick={() => setActive(!active)}
                    className={`w-full py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
                      active
                        ? 'bg-emerald-500 text-white shadow-xs'
                        : 'bg-stone-200 text-stone-700'
                    }`}
                  >
                    {active ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : <X className="w-3.5 h-3.5" />}
                    <span>{active ? 'সক্রিয় (Active)' : 'লুকানো (Hidden)'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="p-4 sm:p-5 border-t border-stone-100 bg-stone-50/80 flex items-center justify-end gap-2 shrink-0">
              <button
                type="button"
                disabled={isSaving || isUploading}
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2.5 bg-white border border-stone-300 hover:bg-stone-100 text-stone-700 rounded-xl text-xs font-bold transition-all disabled:opacity-50"
              >
                বাতিল (Cancel)
              </button>
              <button
                type="button"
                disabled={isSaving || isUploading}
                onClick={handleSave}
                className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 active:scale-98 text-stone-950 rounded-xl text-xs font-black shadow-md shadow-amber-500/20 transition-all flex items-center gap-1.5 disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>সেভ হচ্ছে...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span>{editingSlider ? 'পরিবর্তন সেভ করুন' : 'ব্যানার পাবলিশ করুন'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* IN-APP CONFIRMATION MODAL FOR DELETING SLIDER BANNER */}
      {sliderToDelete && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => !isDeletingId && setSliderToDelete(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white max-w-md w-full rounded-3xl p-6 shadow-2xl border border-stone-200 space-y-4 animate-in zoom-in-95 duration-150"
          >
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-lg font-black text-stone-900">ব্যানার মুছে ফেলতে চান?</h3>
              <p className="text-xs text-stone-600">
                আপনি কি নিশ্চিত যে{' '}
                <strong className="text-stone-900">
                  "{sliderToDelete.title || 'Untitled Banner'}"
                </strong>{' '}
                ব্যানারটি চিরতরে মুছে ফেলতে চান?
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
              <button
                type="button"
                disabled={isDeletingId === sliderToDelete.id}
                onClick={() => setSliderToDelete(null)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-stone-600 hover:bg-stone-100 transition-colors disabled:opacity-50"
              >
                না, থাক
              </button>
              <button
                type="button"
                disabled={isDeletingId === sliderToDelete.id}
                onClick={handleConfirmDelete}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black shadow-md transition-all flex items-center gap-1.5 disabled:opacity-50"
              >
                {isDeletingId === sliderToDelete.id ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>মুছে ফেলা হচ্ছে...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>হ্যাঁ, মুছে ফেলুন</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
