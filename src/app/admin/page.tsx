'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Save, X, Edit2, Trash2, Plus, BarChart3, Settings, Users, LogOut, TrendingUp, Wifi, WifiOff, Table, LayoutDashboard, UtensilsCrossed, ClipboardList, Boxes, Search, Percent } from 'lucide-react';
import Image from 'next/image';
import { MenuItem, Table as TableType } from '@/types';
import SalesReport from '@/components/SalesReport';
import InventoryDashboard from '@/components/InventoryDashboard';
import UserManagement from '@/components/UserManagement';
import OrderManagement from '@/components/OrderManagement';
import OrderAnalyticsChart from '@/components/OrderAnalyticsChart';
import AdminOverview from '@/components/AdminOverview';
import OffersManager from '@/components/OffersManager';

const AdminControlPanel = () => {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draggedItem, setDraggedItem] = useState<MenuItem | null>(null);
  const [isSavingPositions, setIsSavingPositions] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [menuSearch, setMenuSearch] = useState('');
  const [menuCategoryFilter, setMenuCategoryFilter] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [newItem, setNewItem] = useState<Partial<MenuItem>>({
    name: '',
    price: 0,
    category: '',
    is_available: true
  });
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [todaysSales, setTodaysSales] = useState({ total_orders: 0, total_revenue: 0 });
  const [totalRevenue, setTotalRevenue] = useState({ total_orders: 0, total_revenue: 0 });
  const [salesLoading, setSalesLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [tables, setTables] = useState<TableType[]>([]);
  const [newTable, setNewTable] = useState({
    table_code: '',
    table_name: '',
    capacity: 4
  });
  const router = useRouter();

  // Fetch tables
  const fetchTables = async () => {
    try {
      const response = await fetch('/api/tables');
      if (!response.ok) throw new Error('Failed to fetch tables');
      const data = await response.json();
      setTables(data);
    } catch (err) {
      setError('Failed to load tables');
      console.error(err);
    }
  };

  // Add new table
  const addTable = async () => {
    if (!newTable.table_code.trim() || !newTable.table_name.trim()) {
      setError('Table code and name are required');
      return;
    }

    try {
      const response = await fetch('/api/tables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTable)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add table');
      }

      setNewTable({ table_code: '', table_name: '', capacity: 4 });
      setError(null);
      await fetchTables();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add table');
      console.error(err);
    }
  };

  // Delete table
  const deleteTable = async (tableId: number) => {
    if (!confirm('Are you sure you want to delete this table?')) return;

    try {
      const response = await fetch(`/api/tables/${tableId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete table');
      }

      await fetchTables();
    } catch (err) {
      setError('Failed to delete table');
      console.error(err);
    }
  };

  // Toggle table active status
  const toggleTableStatus = async (table: TableType) => {
    try {
      const response = await fetch(`/api/tables/${table.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !table.is_active })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update table status');
      }

      await fetchTables();
    } catch (err) {
      setError('Failed to update table status');
      console.error(err);
    }
  };

  // Check authentication on component mount
  useEffect(() => {
    const checkAuth = () => {
      const isLoggedIn = localStorage.getItem('isLoggedIn');
      const userRole = localStorage.getItem('userRole');
      
      if (isLoggedIn === 'true' && userRole === 'admin') {
        setIsAuthenticated(true);
        localStorage.setItem('theme', 'light');
        document.documentElement.setAttribute('data-theme', 'light');
        document.documentElement.style.colorScheme = 'light';
        fetchMenu();
        fetchSalesData();
        fetchTables();
      } else {
        router.push('/login'); // Redirect to the main login page
      }
    };

    checkAuth();
  }, [router]);

  useEffect(() => {
    if (!isAuthenticated || activeTab !== 'overview') return;
    fetchSalesData();
  }, [activeTab, isAuthenticated]);

  // Online/offline detection
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    setIsOnline(navigator.onLine);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('userRole');
    router.push('/login');
  };

  // Fetch menu items
  const fetchMenu = async () => {
    try {
      const response = await fetch('/api/menu/admin');
      if (!response.ok) throw new Error('Failed to fetch menu');
      const data = await response.json();
      setMenuItems(data);
      // Update available categories from fetched menu items
      const categories = Array.from(new Set(data.map((item: MenuItem) => item.category).filter((cat: string | undefined) => cat && typeof cat === 'string' && cat.trim()))) as string[];
      setAvailableCategories(categories);
    } catch (err) {
      setError('Failed to load menu');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch today's sales
  const fetchTodaysSales = async () => {
    setSalesLoading(true);
    try {
      const response = await fetch('/api/daily-sales/today');
      if (!response.ok) throw new Error('Failed to fetch today\'s sales');
      const data = await response.json();
      setTodaysSales(data);
    } catch (err) {
      setError('Failed to load today\'s sales');
      console.error(err);
    } finally {
      setSalesLoading(false);
    }
  };

  // Fetch total revenue
  const fetchTotalRevenue = async () => {
    setSalesLoading(true);
    try {
      const response = await fetch('/api/total-revenue');
      if (!response.ok) throw new Error('Failed to fetch total revenue');
      const data = await response.json();
      setTotalRevenue(data);
    } catch (err) {
      setError('Failed to load total revenue');
      console.error(err);
    } finally {
      setSalesLoading(false);
    }
  };

  // Fetch all sales data
  const fetchSalesData = async () => {
    await Promise.all([fetchTodaysSales(), fetchTotalRevenue()]);
  };

  // Reset today's sales
  const resetTodaysSales = async () => {
    if (!confirm('Are you sure you want to reset today\'s sales? This action cannot be undone.')) return;
    
    setSalesLoading(true);
    try {
      const response = await fetch('/api/daily-sales/reset?resetToday=true', {
        method: 'POST'
      });

      if (!response.ok) throw new Error('Failed to reset today\'s sales');

      await fetchSalesData();
      
    } catch (err) {
      setError('Failed to reset today\'s sales');
      console.error(err);
    } finally {
      setSalesLoading(false);
    }
  };

  // Drag and drop functions
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, item: MenuItem) => {
    e.dataTransfer.setData('text/plain', item.id.toString());
    setDraggedItem(item);
    e.currentTarget.classList.add('opacity-50');
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.currentTarget.classList.add('bg-blue-100');
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.currentTarget.classList.remove('bg-blue-100');
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, targetItem: MenuItem) => {
    e.preventDefault();
    e.currentTarget.classList.remove('bg-blue-100');
    
    const draggedId = parseInt(e.dataTransfer.getData('text/plain'));
    if (draggedId === targetItem.id) return;

    const draggedIndex = menuItems.findIndex(item => item.id === draggedId);
    const targetIndex = menuItems.findIndex(item => item.id === targetItem.id);
    
    if (draggedIndex === -1 || targetIndex === -1) return;

    const newMenuItems = [...menuItems];
    const [removed] = newMenuItems.splice(draggedIndex, 1);
    newMenuItems.splice(targetIndex, 0, removed);
    
    // Update positions based on new order
    const updatedItems = newMenuItems.map((item, index) => ({
      ...item,
      position: index + 1
    }));
    
    setMenuItems(updatedItems);
    setDraggedItem(null);
  };

  const handleDragEnd = (e: React.DragEvent<HTMLDivElement>) => {
    e.currentTarget.classList.remove('opacity-50');
    setDraggedItem(null);
  };

  const saveMenuPositions = async () => {
    setIsSavingPositions(true);
    try {
      const response = await fetch('/api/menu/position', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ menuItems })
      });

      if (!response.ok) throw new Error('Failed to save menu positions');

      await fetchMenu();
      
    } catch (err) {
      setError('Failed to save menu positions');
      console.error(err);
    } finally {
      setIsSavingPositions(false);
    }
  };

  const toggleItemAvailability = async (item: MenuItem) => {
    try {
      const response = await fetch(`/api/menu/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_available: !item.is_available })
      });

      if (!response.ok) throw new Error('Failed to update item availability');

      await fetchMenu();
      
    } catch (err) {
      setError('Failed to update item availability');
      console.error(err);
    }
  };

  const deleteMenuItem = async (itemId: number) => {
    if (!confirm('Are you sure you want to delete this menu item?')) return;
    
    try {
      const response = await fetch(`/api/menu/${itemId}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Failed to delete menu item');

      await fetchMenu();
      
    } catch (err) {
      setError('Failed to delete menu item');
      console.error(err);
    }
  };

  const saveMenuItem = async () => {
    try {
      const itemToSave = editingItem || newItem;

      // Client-side validation
      if (!itemToSave.name || !itemToSave.name.trim()) {
        setError('Name is required');
        return;
      }
      if (itemToSave.price == null || itemToSave.price <= 0) {
        setError('Price must be greater than 0');
        return;
      }
      if (!itemToSave.category || !itemToSave.category.trim()) {
        setError('Category is required');
        return;
      }

      const url = editingItem ? `/api/menu/${editingItem.id}` : '/api/menu';
      const method = editingItem ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(itemToSave)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save menu item');
      }

      setEditingItem(null);
      setNewItem({ name: '', price: 0, category: '', is_available: true });
      setShowNewCategoryInput(false);
      setNewCategoryName('');
      setError(null); // Clear any previous errors

      // If a new category was added, update the available categories immediately
      if (!editingItem && itemToSave.category && !availableCategories.includes(itemToSave.category)) {
        setAvailableCategories(prev => [...prev, itemToSave.category!]);
      }

      await fetchMenu();

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save menu item');
      console.error(err);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-700 mx-auto mb-3" />
          <p className="text-sm text-zinc-500">Checking access…</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-700 mx-auto mb-3" />
          <div className="text-sm text-zinc-500">Loading admin panel…</div>
        </div>
      </div>
    );
  }

  const visibleMenuItems = menuItems.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(menuSearch.toLowerCase());
    const matchesCategory = !menuCategoryFilter || item.category === menuCategoryFilter;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <div className="sticky top-0 z-40">
      <header className="border-b border-red-800/20 bg-gradient-to-r from-red-700 to-red-900 shadow-sm">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="flex-shrink-0">
                <Image
                  src="/logo.png"
                  alt="Cafe Adda Logo"
                  width={45}
                  height={45}
                  className="rounded-lg sm:w-[55px] sm:h-[55px]"
                />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-white sm:text-xl">Admin</h1>
                <p className="hidden text-xs text-white/70 sm:block">Menu, tables, sales, and staff</p>
              </div>
            </div>
            <div className="flex items-center gap-1 sm:gap-2 md:gap-3 flex-wrap justify-center sm:justify-end">
              <div className={`px-2.5 py-2 rounded-xl flex items-center gap-1.5 min-h-[44px] text-xs font-medium ${
                isOnline
                  ? 'bg-emerald-400/20 text-emerald-50'
                  : 'bg-amber-400/20 text-amber-50'
              }`}>
                {isOnline ? (
                  <Wifi className="w-4 h-4" />
                ) : (
                  <WifiOff className="w-4 h-4" />
                )}
                <span className="hidden sm:inline">
                  {isOnline ? 'Online' : 'Offline'}
                </span>
              </div>

              <a
                href="/"
                className="bg-white text-red-700 px-3 py-2 rounded-xl hover:bg-red-50 transition-colors text-sm font-medium whitespace-nowrap min-h-[44px] flex items-center justify-center"
              >
                Orders
              </a>
              <button
                type="button"
                onClick={handleLogout}
                className="bg-red-950/40 text-white px-3 py-2 rounded-xl hover:bg-red-950/60 transition-colors flex items-center gap-2 text-sm font-medium whitespace-nowrap min-h-[44px]"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
        </div>
      </header>

      <nav className="border-b border-zinc-200 bg-white/90 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-2 sm:px-6">
          <div className="flex overflow-x-auto scrollbar-hide gap-1 py-1.5">
            {[
              { id: 'overview', label: 'Overview', icon: LayoutDashboard },
              { id: 'menu', label: 'Menu', icon: UtensilsCrossed },
              { id: 'offers', label: 'Offers', icon: Percent },
              { id: 'tables', label: 'Tables', icon: Table },
              { id: 'orders', label: 'Orders', icon: ClipboardList },
              { id: 'inventory', label: 'Inventory', icon: Boxes },
              { id: 'analytics', label: 'Analytics', icon: TrendingUp },
              { id: 'reports', label: 'Reports', icon: BarChart3 },
              { id: 'demand', label: 'Demand', icon: TrendingUp, href: '/demand-analysis' },
              { id: 'users', label: 'Users', icon: Users },
            ].map((tab) => {
              const IconComponent = tab.icon;
              const className = `px-3 py-2.5 flex items-center gap-2 rounded-xl transition-colors whitespace-nowrap min-h-[44px] text-sm font-medium ${
                activeTab === tab.id
                  ? 'bg-zinc-900 text-white shadow-sm'
                  : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
              }`;

              if (tab.href) {
                return (
                  <a key={tab.id} href={tab.href} className={className}>
                    <IconComponent className="w-4 h-4" />
                    <span>{tab.label}</span>
                  </a>
                );
              }

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={className}
                >
                  <IconComponent className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </nav>
      </div>

      <div className="mx-auto max-w-7xl px-3 sm:px-6 py-5 sm:py-8">
        {error && (
          <div className="mb-6 flex items-start justify-between gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-800">
            <p className="text-sm">{error}</p>
            <button
              type="button"
              onClick={() => setError(null)}
              className="shrink-0 text-sm font-medium text-red-700 hover:underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {activeTab === 'overview' && (
          <AdminOverview
            todaysSales={todaysSales}
            totalRevenue={totalRevenue}
            salesLoading={salesLoading}
            onResetTodaysSales={resetTodaysSales}
          />
        )}


        {activeTab === 'offers' && <OffersManager menuItems={menuItems} />}

        {/* Menu Management Tab */}
        {activeTab === 'menu' && (
          <div className="space-y-6">
            {/* Add/Edit Menu Item Form */}
            <div id="admin-menu-form" className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-zinc-200/80 sm:p-6">
              <h2 className="text-lg font-semibold mb-4 text-zinc-900">
                {editingItem ? 'Edit menu item' : 'Add menu item'}
              </h2> 
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-800 mb-1">Name</label>
                  <input
                    type="text"
                    value={editingItem?.name || newItem.name || ''}
                    onChange={(e) => editingItem 
                      ? setEditingItem({ ...editingItem, name: e.target.value })
                      : setNewItem({ ...newItem, name: e.target.value })
                    }
                    className="w-full rounded-xl border border-zinc-200 p-2.5 text-zinc-900 outline-none focus:ring-2 focus:ring-red-500/30"
                    placeholder="Item name"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-800 mb-1">Price (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingItem ? editingItem.price : (newItem.price ?? 0)}
                    onChange={(e) => editingItem 
                      ? setEditingItem({ ...editingItem, price: parseFloat(e.target.value) })
                      : setNewItem({ ...newItem, price: parseFloat(e.target.value) })
                    }
                    className="w-full rounded-xl border border-zinc-200 p-2.5 text-zinc-900 outline-none focus:ring-2 focus:ring-red-500/30"
                    placeholder="0.00"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-800 mb-1">Category</label>
                  {!showNewCategoryInput ? (
                    <select
                      value={editingItem?.category || newItem.category || ''}
                      onChange={(e) => {
                        if (e.target.value === 'create_new') {
                          setShowNewCategoryInput(true);
                          setNewCategoryName('');
                        } else {
                          editingItem
                            ? setEditingItem({ ...editingItem, category: e.target.value })
                            : setNewItem({ ...newItem, category: e.target.value });
                        }
                      }}
                      className="w-full rounded-xl border border-zinc-200 p-2.5 text-zinc-900 outline-none focus:ring-2 focus:ring-red-500/30"
                    >
                      <option value="">Select Category</option>
                      {availableCategories.map(category => (
                        <option key={category} value={category}>{category}</option>
                      ))}
                      <option value="create_new">+ Create New Category</option>
                    </select>
                  ) : (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        className="w-full rounded-xl border border-zinc-200 p-2.5 text-zinc-900 outline-none focus:ring-2 focus:ring-red-500/30"
                        placeholder="Enter new category name"
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            if (newCategoryName.trim()) {
                              const trimmedCategory = newCategoryName.trim();
                              editingItem
                                ? setEditingItem({ ...editingItem, category: trimmedCategory })
                                : setNewItem({ ...newItem, category: trimmedCategory });
                              if (!availableCategories.includes(trimmedCategory)) {
                                setAvailableCategories(prev => [...prev, trimmedCategory]);
                              }
                              setShowNewCategoryInput(false);
                              setNewCategoryName('');
                            }
                          }}
                          className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                        >
                          Add
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowNewCategoryInput(false);
                            setNewCategoryName('');
                          }}
                          className="px-3 py-1 bg-gray-300 text-gray-700 rounded text-sm hover:bg-gray-400"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="flex items-center">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={editingItem?.is_available ?? newItem.is_available ?? true}
                      onChange={(e) => editingItem 
                        ? setEditingItem({ ...editingItem, is_available: e.target.checked })
                        : setNewItem({ ...newItem, is_available: e.target.checked })
                      }
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-800">Available</span>
                  </label>
                </div>
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={saveMenuItem}
                  className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2 touch-manipulation min-h-[48px]"
                >
                  <Save className="w-4 h-4" />
                  {editingItem ? 'Update Item' : 'Add Item'}
                </button>
                
                {editingItem && (
                  <button
                    onClick={() => setEditingItem(null)}
                    className="px-6 py-3 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors flex items-center gap-2 touch-manipulation min-h-[48px]"
                  >
                    <X className="w-4 h-4" />
                    Cancel Edit
                  </button>
                )}
              </div>
            </div>

            {/* Menu Items List with Drag & Drop */}
            <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-zinc-200/80 sm:p-6">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="text-lg font-semibold text-zinc-900">Menu items ({menuItems.length})</h2>
                <button
                    onClick={saveMenuPositions}
                    disabled={isSavingPositions}
                    className="px-4 py-2.5 bg-zinc-900 text-white rounded-xl hover:bg-zinc-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 min-h-[44px]"
                >
                    <Save className="w-4 h-4" />
                    {isSavingPositions ? 'Saving…' : 'Save order'}
                </button>
              </div>

              <div className="mb-4 flex flex-col gap-2 sm:flex-row">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                  <input
                    type="search"
                    value={menuSearch}
                    onChange={(e) => setMenuSearch(e.target.value)}
                    placeholder="Search dishes…"
                    className="w-full rounded-xl border border-zinc-200 py-2.5 pl-9 pr-3 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-red-500/30"
                  />
                </div>
              </div>
              <div className="mb-4 flex gap-1.5 overflow-x-auto scrollbar-hide pb-1">
                <button
                  type="button"
                  onClick={() => setMenuCategoryFilter(null)}
                  className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium ${
                    menuCategoryFilter === null ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-600'
                  }`}
                >
                  All
                </button>
                {availableCategories.map((category) => (
                  <button
                    key={category}
                    type="button"
                    onClick={() => setMenuCategoryFilter(category)}
                    className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium ${
                      menuCategoryFilter === category ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-600'
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>

              <p className="mb-4 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-900">
                Drag items to reorder. Click Save order when the sequence looks right.
              </p>

              <div className="space-y-2">
                {visibleMenuItems.length === 0 && (
                  <div className="rounded-xl bg-zinc-50 py-8 text-center text-sm text-zinc-500">No dishes match this filter.</div>
                )}
                {visibleMenuItems.map((item) => (
                  <div
                    key={item.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, item)}
                    onDragOver={(e) => handleDragOver(e)}
                    onDragLeave={(e) => handleDragLeave(e)}
                    onDrop={(e) => handleDrop(e, item)}
                    onDragEnd={handleDragEnd}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 cursor-move hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-4 flex-1">
                    <div className="w-8 h-8 bg-red-100 rounded flex items-center justify-center text-red-600 font-semibold">
                        {item.position || '?'}
                      </div>

                      <div className="flex-1">
                        <div className="font-semibold text-gray-900">{item.name}</div>
                        <div className="text-sm text-gray-700">
                          ₹{item.price} • {item.category}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mt-2 sm:mt-0">
                      <span className={`px-3 py-2 sm:px-2 sm:py-1 rounded text-xs font-medium ${
                        item.is_available
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {item.is_available ? 'Available' : 'Unavailable'}
                      </span>

                      <button
                        type="button"
                        onClick={() => toggleItemAvailability(item)}
                        className={`px-3 py-2 rounded-xl text-xs font-semibold min-h-[44px] ${
                          item.is_available
                            ? 'bg-amber-50 text-amber-800 hover:bg-amber-100'
                            : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                        }`}
                        title={item.is_available ? 'Mark Unavailable' : 'Mark Available'}
                      >
                        {item.is_available ? 'Hide' : 'Show'}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setEditingItem(item);
                          document.getElementById('admin-menu-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }}
                        className="p-3 sm:p-2 bg-red-100 text-red-600 rounded hover:bg-red-200 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center touch-manipulation"
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => deleteMenuItem(item.id)}
                        className="p-3 sm:p-2 bg-red-100 text-red-600 rounded hover:bg-red-200 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center touch-manipulation"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Sales Reports Tab */}
        {activeTab === 'reports' && <SalesReport />}

        {/* System Settings Tab */}
        {activeTab === 'settings' && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4">System Settings</h2>
            <div className="text-center py-12 text-gray-500">
              <Settings className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <div className="text-lg">System Settings Coming Soon</div>
              <div className="text-sm mt-2">This feature will be implemented in the next update</div>
            </div>
          </div>
        )}

        {/* User Management Tab */}
        {activeTab === 'users' && (
          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-zinc-200/80 sm:p-6">
            <h2 className="mb-4 text-lg font-semibold text-zinc-900">Users</h2>
            <UserManagement />
          </div>
        )}

        {/* Orders Tab */}
        {activeTab === 'orders' && (
          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-zinc-200/80 sm:p-6">
            <h2 className="mb-4 text-lg font-semibold text-zinc-900">Orders</h2>
            <OrderManagement />
          </div>
        )}

        {/* Inventory Tab */}
        {activeTab === 'inventory' && (
          <InventoryDashboard />
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-zinc-200/80 sm:p-6">
            <OrderAnalyticsChart />
          </div>
        )}

        {/* Table Management Tab */}
        {activeTab === 'tables' && (
          <div className="space-y-6">
            {/* Add New Table Form */}
            <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-zinc-200/80 sm:p-6">
              <h2 className="mb-4 text-lg font-semibold text-zinc-900">Add table</h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-800 mb-1">Table Code</label>
                  <input
                    type="text"
                    value={newTable.table_code}
                    onChange={(e) => setNewTable({ ...newTable, table_code: e.target.value })}
                    className="w-full rounded-xl border border-zinc-200 p-2.5 text-zinc-900 outline-none focus:ring-2 focus:ring-red-500/30"
                    placeholder="e.g., T01"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-800 mb-1">Table Name</label>
                  <input
                    type="text"
                    value={newTable.table_name}
                    onChange={(e) => setNewTable({ ...newTable, table_name: e.target.value })}
                    className="w-full rounded-xl border border-zinc-200 p-2.5 text-zinc-900 outline-none focus:ring-2 focus:ring-red-500/30"
                    placeholder="e.g., Table 1"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-800 mb-1">Capacity</label>
                  <input
                    type="number"
                    min="1"
                    value={newTable.capacity}
                    onChange={(e) => setNewTable({ ...newTable, capacity: parseInt(e.target.value) || 4 })}
                    className="w-full rounded-xl border border-zinc-200 p-2.5 text-zinc-900 outline-none focus:ring-2 focus:ring-red-500/30"
                    placeholder="4"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={addTable}
                  className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2 touch-manipulation min-h-[48px]"
                >
                  <Plus className="w-4 h-4" />
                  Add Table
                </button>
              </div>
            </div>

            {/* Tables List */}
            <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-zinc-200/80 sm:p-6">
              <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="text-lg font-semibold text-zinc-900">
                  Tables · {tables.filter(t => t.is_active).length} active · {tables.filter(t => t.is_occupied).length} occupied
                </h2>
                <button
                  type="button"
                  onClick={fetchTables}
                  className="px-4 py-2 bg-zinc-900 text-white rounded-xl hover:bg-zinc-800 text-sm min-h-[44px]"
                >
                  Refresh
                </button>
              </div>

              <div className="space-y-2">
                {tables.length === 0 && (
                  <div className="rounded-xl bg-zinc-50 py-8 text-center text-sm text-zinc-500">No tables yet. Add one above.</div>
                )}
                {tables.map((table) => (
                  <div
                    key={table.id}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 bg-gray-50 rounded-lg border border-gray-200"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div className="w-8 h-8 bg-red-100 rounded flex items-center justify-center text-red-600 font-semibold">
                        {table.table_code}
                      </div>

                      <div className="flex-1">
                        <div className="font-semibold text-gray-900">{table.table_name}</div>
                        <div className="text-sm text-gray-700">
                          Capacity: {table.capacity} • Code: {table.table_code}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mt-2 sm:mt-0">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                        table.is_occupied
                          ? 'bg-amber-100 text-amber-900'
                          : 'bg-zinc-100 text-zinc-600'
                      }`}>
                        {table.is_occupied ? 'Occupied' : 'Free'}
                      </span>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                        table.is_active
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {table.is_active ? 'Active' : 'Inactive'}
                      </span>

                      <button
                        type="button"
                        onClick={() => toggleTableStatus(table)}
                        className={`px-3 py-2 rounded-xl text-xs font-semibold min-h-[44px] ${
                          table.is_active
                            ? 'bg-amber-50 text-amber-800 hover:bg-amber-100'
                            : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                        }`}
                        title={table.is_active ? 'Deactivate Table' : 'Activate Table'}
                      >
                        {table.is_active ? 'Deactivate' : 'Activate'}
                      </button>

                      <button
                        onClick={() => deleteTable(table.id)}
                        className="p-3 sm:p-2 bg-red-100 text-red-600 rounded hover:bg-red-200 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center touch-manipulation"
                        title="Delete Table"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminControlPanel;
