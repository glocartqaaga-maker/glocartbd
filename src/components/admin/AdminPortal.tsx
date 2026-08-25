import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, getDoc } from 'firebase/firestore';
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

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'categories'),
      (snap) => {
        const list: Category[] = [];
        snap.forEach((d) => {
          list.push({ id: d.id, ...d.data() } as Category);
        });
        list.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
        setCategories(list);
      },
      (err) => {
        console.warn('Error listening to categories in admin:', err);
      }
    );

    return () => unsub();
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
          onRefreshCategories={() => {}}
        />
      )}
      {currentTab === 'sliders' && <AdminSlidersTab />}
      {currentTab === 'orders' && <AdminOrdersTab />}
      {currentTab === 'customers' && <AdminCustomersTab />}
      {currentTab === 'settings' && <AdminSettingsTab />}
    </AdminLayout>
  );
};
