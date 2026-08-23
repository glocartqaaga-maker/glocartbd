import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { AdminLayout, AdminTab } from './AdminLayout';
import { AdminDashboardTab } from './AdminDashboardTab';
import { AdminProductsTab } from './AdminProductsTab';
import { AdminCategoriesTab } from './AdminCategoriesTab';
import { AdminSlidersTab } from './AdminSlidersTab';
import { AdminOrdersTab } from './AdminOrdersTab';
import { AdminCustomersTab } from './AdminCustomersTab';
import { AdminSettingsTab } from './AdminSettingsTab';
import { Category } from '../../types';

interface AdminPortalProps {
  onExitAdmin: () => void;
}

export const AdminPortal: React.FC<AdminPortalProps> = ({ onExitAdmin }) => {
  const [currentTab, setCurrentTab] = useState<AdminTab>('dashboard');
  const [categories, setCategories] = useState<Category[]>([]);

  const fetchCategories = async () => {
    try {
      const snap = await getDocs(collection(db, 'categories'));
      const list: Category[] = [];
      snap.forEach((d) => {
        list.push({ id: d.id, ...d.data() } as Category);
      });
      list.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
      setCategories(list);
    } catch (err) {
      console.warn('Error fetching categories in admin:', err);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  return (
    <AdminLayout
      currentTab={currentTab}
      onSelectTab={setCurrentTab}
      onExitAdmin={onExitAdmin}
    >
      {currentTab === 'dashboard' && (
        <AdminDashboardTab onNavigateTab={(tab) => setCurrentTab(tab)} />
      )}
      {currentTab === 'products' && (
        <AdminProductsTab categories={categories} />
      )}
      {currentTab === 'categories' && (
        <AdminCategoriesTab
          categories={categories}
          onRefreshCategories={fetchCategories}
        />
      )}
      {currentTab === 'sliders' && <AdminSlidersTab />}
      {currentTab === 'orders' && <AdminOrdersTab />}
      {currentTab === 'customers' && <AdminCustomersTab />}
      {currentTab === 'settings' && <AdminSettingsTab />}
    </AdminLayout>
  );
};
