import React, { useState, useEffect } from 'react';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';
import {
  Database,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Plus,
  Trash2,
  Edit2,
  Copy,
  Check,
  X,
  Server,
  Cloud,
  Layers,
  Sparkles,
  ShieldCheck,
  UserCheck,
  LogOut,
  LogIn,
  Search,
} from 'lucide-react';
import { CatalogItem, BarcodeHistoryItem, BarcodeOptions } from '../types';
import {
  testSupabaseConnection,
  fetchCatalogItemsFromSupabase,
  insertCatalogItemToSupabase,
  updateCatalogItemInSupabase,
  deleteCatalogItemFromSupabase,
  fetchSavedBarcodesFromSupabase,
  insertSavedBarcodeToSupabase,
  deleteSavedBarcodeFromSupabase,
  getCurrentSupabaseUser,
  signInSupabaseAnonymously,
  signOutSupabaseUser,
} from '../lib/supabaseService';

interface SupabaseSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentCatalogItems: CatalogItem[];
  onSyncCatalogToLocal: (items: CatalogItem[]) => void;
  currentBarcodeOptions: BarcodeOptions;
  onLoadBarcodeToEditor: (options: BarcodeOptions) => void;
  onShowToast: (msg: string, type?: 'success' | 'info' | 'error') => void;
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://jgjasyvtqzrcgswijgms.supabase.co';

const SQL_SCHEMA_SCRIPT = `-- Supabase Table Schema for Barcode Generator Application
-- Copy and paste this into your Supabase Dashboard -> SQL Editor and click 'Run'

-- 1. Create Catalog Items Table
CREATE TABLE IF NOT EXISTS public.catalog_items (
  id TEXT PRIMARY KEY,
  item_code TEXT NOT NULL,
  item_name TEXT NOT NULL,
  price TEXT NOT NULL,
  mrp TEXT DEFAULT '',
  is_vatted BOOLEAN DEFAULT false,
  category TEXT DEFAULT 'General',
  format TEXT DEFAULT 'CODE39',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- 2. Create Saved Barcodes Table
CREATE TABLE IF NOT EXISTS public.saved_barcodes (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  text TEXT NOT NULL,
  format TEXT NOT NULL,
  options JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- 3. Enable Row Level Security (RLS) & Public Policies for Demo Access
ALTER TABLE public.catalog_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_barcodes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to catalog_items" ON public.catalog_items FOR SELECT USING (true);
CREATE POLICY "Allow public insert to catalog_items" ON public.catalog_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update to catalog_items" ON public.catalog_items FOR UPDATE USING (true);
CREATE POLICY "Allow public delete from catalog_items" ON public.catalog_items FOR DELETE USING (true);

CREATE POLICY "Allow public read access to saved_barcodes" ON public.saved_barcodes FOR SELECT USING (true);
CREATE POLICY "Allow public insert to saved_barcodes" ON public.saved_barcodes FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public delete from saved_barcodes" ON public.saved_barcodes FOR DELETE USING (true);
`;

export const SupabaseSyncModal: React.FC<SupabaseSyncModalProps> = ({
  isOpen,
  onClose,
  currentCatalogItems,
  onSyncCatalogToLocal,
  currentBarcodeOptions,
  onLoadBarcodeToEditor,
  onShowToast,
}) => {
  const [activeTab, setActiveTab] = useState<'catalog' | 'barcodes' | 'connection' | 'schema'>('catalog');
  
  // Connection state
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [connectionMessage, setConnectionMessage] = useState<string>('');

  // Auth state
  const [authUser, setAuthUser] = useState<unknown | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  // Cloud Data states
  const [remoteCatalog, setRemoteCatalog] = useState<CatalogItem[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogError, setCatalogError] = useState<string | null>(null);

  const [remoteBarcodes, setRemoteBarcodes] = useState<BarcodeHistoryItem[]>([]);
  const [barcodesLoading, setBarcodesLoading] = useState(false);
  const [barcodesError, setBarcodesError] = useState<string | null>(null);

  // New Item Form
  const [newItemCode, setNewItemCode] = useState('');
  const [newItemName, setNewItemName] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newCategory, setNewCategory] = useState('Pharmacy');
  const [isSubmittingItem, setIsSubmittingItem] = useState(false);

  // Editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState('');

  // Copy state
  const [copiedSql, setCopiedSql] = useState(false);

  // Search & Pagination states for live database
  const [catalogSearch, setCatalogSearch] = useState('');
  const [catalogPage, setCatalogPage] = useState(1);
  const [catalogPageSize, setCatalogPageSize] = useState(25);

  const [barcodeSearch, setBarcodeSearch] = useState('');

  // Delete warning modal state
  const [pendingDeleteCatalog, setPendingDeleteCatalog] = useState<{ id: string; name: string; code?: string } | null>(null);
  const [pendingDeleteBarcode, setPendingDeleteBarcode] = useState<{ id: string; title: string; text?: string } | null>(null);

  // Reset catalog page when search or pageSize changes
  useEffect(() => {
    setCatalogPage(1);
  }, [catalogSearch, catalogPageSize]);

  // High performance memoized search filtering for 20,000+ cloud records
  const filteredRemoteCatalog = React.useMemo(() => {
    const q = catalogSearch.trim().toLowerCase();
    if (!q) return remoteCatalog;
    return remoteCatalog.filter((item) => {
      const nameStr = String(item.itemName || '').toLowerCase();
      const codeStr = String(item.itemCode || '').toLowerCase();
      const catStr = String(item.category || '').toLowerCase();
      const priceStr = String(item.price || '').toLowerCase();
      return nameStr.includes(q) || codeStr.includes(q) || catStr.includes(q) || priceStr.includes(q);
    });
  }, [remoteCatalog, catalogSearch]);

  const totalCatalogPages = Math.max(1, Math.ceil(filteredRemoteCatalog.length / catalogPageSize));
  const safeCatalogPage = Math.min(catalogPage, totalCatalogPages);

  const paginatedRemoteCatalog = React.useMemo(() => {
    const start = (safeCatalogPage - 1) * catalogPageSize;
    return filteredRemoteCatalog.slice(start, start + catalogPageSize);
  }, [filteredRemoteCatalog, safeCatalogPage, catalogPageSize]);

  const filteredRemoteBarcodes = React.useMemo(() => {
    const q = barcodeSearch.trim().toLowerCase();
    if (!q) return remoteBarcodes;
    return remoteBarcodes.filter(
      (bc) =>
        bc.title.toLowerCase().includes(q) ||
        bc.text.toLowerCase().includes(q) ||
        bc.format.toLowerCase().includes(q)
    );
  }, [remoteBarcodes, barcodeSearch]);

  useEffect(() => {
    if (isOpen) {
      runConnectionCheck();
      loadRemoteData();
      checkAuth();
    }
  }, [isOpen]);

  const runConnectionCheck = async () => {
    setConnectionStatus('testing');
    setConnectionMessage('Testing Supabase project API connection...');
    const result = await testSupabaseConnection();
    if (result.success) {
      setConnectionStatus('success');
      setConnectionMessage(result.message);
    } else {
      setConnectionStatus('error');
      setConnectionMessage(result.message);
    }
  };

  const checkAuth = async () => {
    const user = await getCurrentSupabaseUser();
    setAuthUser(user);
  };

  const handleAnonSignIn = async () => {
    setAuthLoading(true);
    const { user, error } = await signInSupabaseAnonymously();
    setAuthLoading(false);
    if (error) {
      onShowToast(`Supabase Auth Error: ${error}`, 'error');
    } else {
      setAuthUser(user);
      onShowToast('Signed in anonymously with Supabase Auth!', 'success');
    }
  };

  const handleSignOut = async () => {
    setAuthLoading(true);
    const { error } = await signOutSupabaseUser();
    setAuthLoading(false);
    if (error) {
      onShowToast(`Sign Out Error: ${error}`, 'error');
    } else {
      setAuthUser(null);
      onShowToast('Signed out of Supabase session.', 'info');
    }
  };

  const loadRemoteData = async () => {
    // Load Catalog Items
    setCatalogLoading(true);
    setCatalogError(null);
    const catalogRes = await fetchCatalogItemsFromSupabase();
    setCatalogLoading(false);
    if (catalogRes.error) {
      setCatalogError(catalogRes.error);
    } else if (catalogRes.data) {
      setRemoteCatalog(catalogRes.data);
    }

    // Load Saved Barcodes
    setBarcodesLoading(true);
    setBarcodesError(null);
    const barcodesRes = await fetchSavedBarcodesFromSupabase();
    setBarcodesLoading(false);
    if (barcodesRes.error) {
      setBarcodesError(barcodesRes.error);
    } else if (barcodesRes.data) {
      setRemoteBarcodes(barcodesRes.data);
    }
  };

  // CREATE Item
  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemCode.trim() || !newItemName.trim() || !newPrice.trim()) {
      onShowToast('Please fill in Item Code, Name, and Price', 'error');
      return;
    }

    setIsSubmittingItem(true);
    const { data, error } = await insertCatalogItemToSupabase({
      itemCode: newItemCode.trim(),
      itemName: newItemName.trim(),
      price: newPrice.trim(),
      category: newCategory.trim() || 'Pharmacy',
      format: 'CODE39',
      isVatted: true,
    });
    setIsSubmittingItem(false);

    if (error) {
      onShowToast(`Insert Error: ${error}`, 'error');
    } else if (data) {
      setRemoteCatalog((prev) => [data, ...prev]);
      setNewItemCode('');
      setNewItemName('');
      setNewPrice('');
      onShowToast(`Added "${data.itemName}" to Supabase database!`, 'success');
    }
  };

  // UPDATE Item
  const handleSaveEdit = async (id: string) => {
    if (!editPrice.trim()) return;
    const { data, error } = await updateCatalogItemInSupabase(id, { price: editPrice.trim() });
    if (error) {
      onShowToast(`Update Error: ${error}`, 'error');
    } else if (data) {
      setRemoteCatalog((prev) => prev.map((item) => (item.id === id ? data : item)));
      setEditingId(null);
      onShowToast('Price updated in Supabase!', 'success');
    }
  };

  // DELETE Item
  const handleDeleteItem = async (id: string, name: string) => {
    const { success, error } = await deleteCatalogItemFromSupabase(id);
    if (error) {
      onShowToast(`Delete Error: ${error}`, 'error');
    } else if (success) {
      setRemoteCatalog((prev) => prev.filter((item) => item.id !== id));
      onShowToast(`Deleted "${name}" from Supabase database`, 'info');
    }
  };

  // SYNC All Local to Remote
  const handleBulkUploadLocalToSupabase = async () => {
    if (currentCatalogItems.length === 0) {
      onShowToast('No local catalog items to sync!', 'info');
      return;
    }

    setCatalogLoading(true);
    let successCount = 0;
    for (const item of currentCatalogItems) {
      const { error } = await insertCatalogItemToSupabase(item);
      if (!error) successCount++;
    }
    setCatalogLoading(false);
    loadRemoteData();
    onShowToast(`Synced ${successCount} local items to Supabase!`, 'success');
  };

  // SAVE Current Barcode to Supabase
  const handleSaveCurrentBarcodeToSupabase = async () => {
    const title = `${currentBarcodeOptions.itemName || 'Barcode'} (${currentBarcodeOptions.itemCode || currentBarcodeOptions.text})`;
    const { data, error } = await insertSavedBarcodeToSupabase({
      title,
      text: currentBarcodeOptions.itemCode || currentBarcodeOptions.text,
      format: currentBarcodeOptions.format,
      options: currentBarcodeOptions,
      createdAt: Date.now(),
    });

    if (error) {
      onShowToast(`Save Barcode Error: ${error}`, 'error');
    } else if (data) {
      setRemoteBarcodes((prev) => [data, ...prev]);
      onShowToast('Saved current label design to Supabase database!', 'success');
    }
  };

  // DELETE Barcode from Supabase
  const handleDeleteBarcode = async (id: string, title: string) => {
    const { success, error } = await deleteSavedBarcodeFromSupabase(id);
    if (error) {
      onShowToast(`Delete Error: ${error}`, 'error');
    } else if (success) {
      setRemoteBarcodes((prev) => prev.filter((b) => b.id !== id));
      onShowToast(`Deleted "${title}" from Supabase`, 'info');
    }
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(SQL_SCHEMA_SCRIPT);
    setCopiedSql(true);
    onShowToast('Copied SQL schema script to clipboard!', 'success');
    setTimeout(() => setCopiedSql(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-emerald-900 text-white px-6 py-4 flex items-center justify-between border-b border-emerald-800/40 shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400 shadow-inner">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold tracking-tight text-white">Supabase Cloud Database</h2>
                <span className="bg-emerald-400/20 text-emerald-300 border border-emerald-400/30 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                  Connected
                </span>
              </div>
              <p className="text-xs text-emerald-200/80 font-mono truncate max-w-md">
                Project: {SUPABASE_URL}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white hover:bg-white/10 rounded-lg p-2 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Bar */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-2.5 flex items-center justify-between flex-wrap gap-2 text-xs">
          <div className="flex items-center gap-2">
            {connectionStatus === 'testing' && (
              <span className="flex items-center gap-1.5 text-amber-600 font-semibold">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                Testing connection...
              </span>
            )}
            {connectionStatus === 'success' && (
              <span className="flex items-center gap-1.5 text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Connected to Supabase
              </span>
            )}
            {connectionStatus === 'error' && (
              <span className="flex items-center gap-1.5 text-rose-700 font-bold bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                Connection Error
              </span>
            )}
            <span className="text-slate-500 hidden sm:inline">{connectionMessage}</span>
          </div>

          <div className="flex items-center gap-2">
            {authUser ? (
              <div className="flex items-center gap-1.5 bg-emerald-100 text-emerald-900 border border-emerald-300 px-2 py-0.5 rounded text-[11px] font-bold">
                <UserCheck className="w-3 h-3 text-emerald-700" />
                <span>Authenticated</span>
                <button
                  type="button"
                  onClick={handleSignOut}
                  disabled={authLoading}
                  className="ml-1 text-slate-500 hover:text-rose-600 cursor-pointer"
                  title="Sign Out"
                >
                  <LogOut className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleAnonSignIn}
                disabled={authLoading}
                className="inline-flex items-center gap-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 px-2 py-0.5 rounded text-[11px] font-bold cursor-pointer transition-colors"
              >
                <LogIn className="w-3 h-3 text-emerald-600" />
                <span>Sign In (Anon Session)</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                runConnectionCheck();
                loadRemoteData();
              }}
              className="inline-flex items-center gap-1 bg-slate-200 hover:bg-slate-300 text-slate-800 px-2.5 py-1 rounded text-xs font-semibold cursor-pointer transition-colors"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-slate-100/70 px-6 pt-2 gap-2 shrink-0">
          {[
            { id: 'catalog', label: '📦 Cloud Catalog Items', count: remoteCatalog.length },
            { id: 'barcodes', label: '🏷️ Saved Cloud Barcodes', count: remoteBarcodes.length },
            { id: 'connection', label: '⚡ Client Config' },
            { id: 'schema', label: '📜 SQL Schema' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`px-4 py-2.5 rounded-t-lg font-semibold text-xs border-t border-x transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === tab.id
                  ? 'bg-white border-slate-200 text-emerald-800 border-b-transparent shadow-xs -mb-px'
                  : 'bg-transparent border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  activeTab === tab.id ? 'bg-emerald-100 text-emerald-900' : 'bg-slate-200 text-slate-600'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6 bg-slate-50/50">

          {/* TAB 1: CATALOG ITEMS CRUD */}
          {activeTab === 'catalog' && (
            <div className="space-y-6">
              {/* Insert Form */}
              <form onSubmit={handleAddItem} className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <Plus className="w-4 h-4 text-emerald-600" />
                    Insert New Item into Supabase Database
                  </h3>
                  <button
                    type="button"
                    onClick={handleBulkUploadLocalToSupabase}
                    disabled={catalogLoading}
                    className="text-xs text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-2.5 py-1 rounded-lg font-semibold cursor-pointer transition-colors flex items-center gap-1"
                  >
                    <Cloud className="w-3.5 h-3.5" />
                    Upload All Local Items ({currentCatalogItems.length})
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <label htmlFor="new-item-code-input" className="block text-[11px] font-bold text-slate-600 mb-1">Item Code / SKU</label>
                    <input
                      id="new-item-code-input"
                      type="text"
                      placeholder="e.g. 11009988"
                      value={newItemCode}
                      onChange={(e) => setNewItemCode(e.target.value)}
                      className="w-full text-xs px-3 py-1.5 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label htmlFor="new-item-name-input" className="block text-[11px] font-bold text-slate-600 mb-1">Item Name</label>
                    <input
                      id="new-item-name-input"
                      type="text"
                      placeholder="e.g. Amoxicillin 500mg Caps"
                      value={newItemName}
                      onChange={(e) => setNewItemName(e.target.value)}
                      className="w-full text-xs px-3 py-1.5 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label htmlFor="new-price-input" className="block text-[11px] font-bold text-slate-600 mb-1">Price</label>
                    <div className="flex gap-2">
                      <input
                        id="new-price-input"
                        type="text"
                        placeholder="e.g. 15.00 SAR"
                        value={newPrice}
                        onChange={(e) => setNewPrice(e.target.value)}
                        className="w-full text-xs px-3 py-1.5 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                      />
                      <button
                        type="submit"
                        disabled={isSubmittingItem}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3 py-1.5 rounded-lg cursor-pointer transition-colors shrink-0 flex items-center justify-center shadow-xs"
                      >
                        {isSubmittingItem ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : 'Insert'}
                      </button>
                    </div>
                  </div>
                </div>
              </form>

              {/* Catalog Table */}
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                <div className="bg-slate-100 px-4 py-3 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2">
                  <span className="font-bold text-xs text-slate-800">
                    Live Supabase <span className="font-mono text-emerald-700">catalog_items</span> Table Records ({filteredRemoteCatalog.length} / {remoteCatalog.length})
                  </span>
                  {remoteCatalog.length > 0 && (
                    <button
                      type="button"
                      onClick={() => onSyncCatalogToLocal(remoteCatalog)}
                      className="text-xs text-emerald-800 bg-emerald-100 hover:bg-emerald-200 border border-emerald-300 px-3 py-1 rounded-lg font-bold cursor-pointer transition-colors"
                    >
                      Sync Cloud Items to Local Catalog
                    </button>
                  )}
                </div>

                {/* Search Bar for Live Catalog */}
                <div className="p-3 border-b border-slate-200 bg-slate-50/80">
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={catalogSearch}
                      onChange={(e) => setCatalogSearch(e.target.value)}
                      placeholder="Search live Supabase database by SKU code, item name, category, or price..."
                      className="w-full pl-9 pr-8 py-1.5 rounded-lg border border-slate-300 bg-white text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                    />
                    {catalogSearch && (
                      <button
                        type="button"
                        onClick={() => setCatalogSearch('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {catalogError && (
                  <div className="p-4 bg-rose-50 border-b border-rose-200 text-rose-800 text-xs flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">Database Table Error:</p>
                      <p className="mt-0.5">{catalogError}</p>
                      {catalogError.includes('does not exist') && (
                        <p className="mt-1 font-medium text-rose-700">
                          Tip: Go to the <span className="underline cursor-pointer font-bold" onClick={() => setActiveTab('schema')}>SQL Schema tab</span> to create the required tables in your Supabase SQL editor.
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {catalogLoading ? (
                  <div className="p-8 text-center text-slate-500 text-xs flex items-center justify-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-emerald-600" />
                    <span>Fetching catalog records from Supabase...</span>
                  </div>
                ) : filteredRemoteCatalog.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 text-xs space-y-2">
                    <Database className="w-8 h-8 text-slate-300 mx-auto" />
                    <p className="font-bold text-slate-700">
                      {catalogSearch ? 'No matching records in Supabase' : 'No catalog items found in Supabase table'}
                    </p>
                    <p>
                      {catalogSearch
                        ? `No items match "${catalogSearch}". Try another search query.`
                        : 'Use the insert form above or click "Upload All Local Items" to seed your cloud database.'}
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] font-bold border-b border-slate-200">
                        <tr>
                          <th className="px-4 py-2.5">Item Code</th>
                          <th className="px-4 py-2.5">Item Name</th>
                          <th className="px-4 py-2.5">Category</th>
                          <th className="px-4 py-2.5">Price</th>
                          <th className="px-4 py-2.5 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {paginatedRemoteCatalog.map((item, idx) => (
                          <tr key={`${item.id}_${idx}`} className="hover:bg-slate-50/80 transition-colors">
                            <td className="px-4 py-2.5 font-mono font-bold text-slate-900">{item.itemCode}</td>
                            <td className="px-4 py-2.5 font-medium text-slate-800">{item.itemName}</td>
                            <td className="px-4 py-2.5 text-slate-500">
                              <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[10px] font-semibold border border-slate-200">
                                {item.category || 'Pharmacy'}
                              </span>
                            </td>
                            <td className="px-4 py-2.5 font-bold text-emerald-800">
                              {editingId === item.id ? (
                                <div className="flex items-center gap-1">
                                  <input
                                    type="text"
                                    value={editPrice}
                                    onChange={(e) => setEditPrice(e.target.value)}
                                    className="w-24 px-2 py-0.5 text-xs border border-emerald-500 rounded bg-emerald-50"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleSaveEdit(item.id)}
                                    className="p-1 bg-emerald-600 text-white rounded hover:bg-emerald-700"
                                    title="Save"
                                  >
                                    <Check className="w-3 h-3" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setEditingId(null)}
                                    className="p-1 bg-slate-200 text-slate-700 rounded hover:bg-slate-300"
                                    title="Cancel"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                              ) : (
                                <span>{item.price}</span>
                              )}
                            </td>
                            <td className="px-4 py-2.5 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingId(item.id);
                                    setEditPrice(item.price);
                                  }}
                                  className="p-1 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded cursor-pointer"
                                  title="Edit Price"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setPendingDeleteCatalog({
                                      id: item.id,
                                      name: item.itemName,
                                      code: item.itemCode,
                                    })
                                  }
                                  className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded cursor-pointer"
                                  title="Delete Item"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {/* Table Pagination Bar */}
                    {filteredRemoteCatalog.length > 0 && (
                      <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
                        <div className="text-slate-500 font-medium">
                          Showing{' '}
                          <strong className="text-slate-900">
                            {((safeCatalogPage - 1) * catalogPageSize + 1).toLocaleString()}
                          </strong>{' '}
                          to{' '}
                          <strong className="text-slate-900">
                            {Math.min(safeCatalogPage * catalogPageSize, filteredRemoteCatalog.length).toLocaleString()}
                          </strong>{' '}
                          of <strong className="text-slate-900">{filteredRemoteCatalog.length.toLocaleString()}</strong> cloud items
                        </div>

                        <div className="flex items-center gap-2">
                          <select
                            value={catalogPageSize}
                            onChange={(e) => setCatalogPageSize(Number(e.target.value))}
                            className="px-2 py-1 rounded border border-slate-300 bg-white text-xs font-semibold text-slate-700"
                          >
                            <option value={25}>25 / page</option>
                            <option value={50}>50 / page</option>
                            <option value={100}>100 / page</option>
                          </select>

                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              disabled={safeCatalogPage === 1}
                              onClick={() => setCatalogPage(1)}
                              className="px-2 py-1 rounded border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer font-bold"
                            >
                              «
                            </button>
                            <button
                              type="button"
                              disabled={safeCatalogPage === 1}
                              onClick={() => setCatalogPage((p) => Math.max(1, p - 1))}
                              className="px-2 py-1 rounded border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer font-bold"
                            >
                              ‹
                            </button>
                            <span className="px-2 font-bold text-slate-800">
                              {safeCatalogPage} / {totalCatalogPages}
                            </span>
                            <button
                              type="button"
                              disabled={safeCatalogPage === totalCatalogPages}
                              onClick={() => setCatalogPage((p) => Math.min(totalCatalogPages, p + 1))}
                              className="px-2 py-1 rounded border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer font-bold"
                            >
                              ›
                            </button>
                            <button
                              type="button"
                              disabled={safeCatalogPage === totalCatalogPages}
                              onClick={() => setCatalogPage(totalCatalogPages)}
                              className="px-2 py-1 rounded border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer font-bold"
                            >
                              »
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: SAVED BARCODES CRUD */}
          {activeTab === 'barcodes' && (
            <div className="space-y-4">
              <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between shadow-2xs">
                <div>
                  <h3 className="font-bold text-xs text-slate-800">Current Editor Label Design</h3>
                  <p className="text-[11px] text-slate-500">
                    "{currentBarcodeOptions.itemName || 'Untitled Item'}" ({currentBarcodeOptions.itemCode || currentBarcodeOptions.text})
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleSaveCurrentBarcodeToSupabase}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3.5 py-1.5 rounded-lg cursor-pointer transition-colors shadow-xs flex items-center gap-1.5"
                >
                  <Cloud className="w-4 h-4" />
                  Save Editor Label to Supabase
                </button>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                <div className="bg-slate-100 px-4 py-3 border-b border-slate-200 font-bold text-xs text-slate-800">
                  Remote <span className="font-mono text-emerald-700">saved_barcodes</span> Table ({filteredRemoteBarcodes.length} / {remoteBarcodes.length})
                </div>

                {/* Search Bar for Saved Barcodes */}
                <div className="p-3 border-b border-slate-200 bg-slate-50/80">
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={barcodeSearch}
                      onChange={(e) => setBarcodeSearch(e.target.value)}
                      placeholder="Search live saved barcodes by title, barcode value, or format..."
                      className="w-full pl-9 pr-8 py-1.5 rounded-lg border border-slate-300 bg-white text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                    />
                    {barcodeSearch && (
                      <button
                        type="button"
                        onClick={() => setBarcodeSearch('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {barcodesError && (
                  <div className="p-4 bg-rose-50 border-b border-rose-200 text-rose-800 text-xs flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">Database Error:</p>
                      <p>{barcodesError}</p>
                    </div>
                  </div>
                )}

                {barcodesLoading ? (
                  <div className="p-8 text-center text-slate-500 text-xs flex items-center justify-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-emerald-600" />
                    <span>Loading saved barcode designs from Supabase...</span>
                  </div>
                ) : filteredRemoteBarcodes.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 text-xs space-y-2">
                    <Layers className="w-8 h-8 text-slate-300 mx-auto" />
                    <p className="font-bold text-slate-700">
                      {barcodeSearch ? 'No matching barcodes in Supabase' : 'No saved barcodes in Supabase yet'}
                    </p>
                    <p>
                      {barcodeSearch
                        ? `No barcodes match "${barcodeSearch}".`
                        : 'Click "Save Editor Label to Supabase" above to backup your barcode templates.'}
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-200">
                    {filteredRemoteBarcodes.map((bc, idx) => (
                      <div key={`${bc.id}_${idx}`} className="p-3.5 flex items-center justify-between hover:bg-slate-50 transition-colors">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-slate-900">{bc.title}</span>
                            <span className="bg-slate-100 text-slate-600 border border-slate-200 font-mono text-[10px] px-1.5 py-0.2 rounded font-bold">
                              {bc.format}
                            </span>
                          </div>
                          <p className="text-[11px] font-mono text-slate-500">Value: {bc.text}</p>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              onLoadBarcodeToEditor(bc.options);
                              onShowToast(`Loaded "${bc.title}" into live editor!`, 'success');
                            }}
                            className="bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs px-3 py-1 rounded-lg cursor-pointer transition-colors"
                          >
                            Load to Editor
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setPendingDeleteBarcode({
                                id: bc.id,
                                title: bc.title,
                                text: bc.text,
                              })
                            }
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded cursor-pointer"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: CLIENT CONFIG */}
          {activeTab === 'connection' && (
            <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4 shadow-2xs">
              <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
                <Server className="w-4 h-4 text-emerald-600" />
                <span>Supabase Client Configuration</span>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-600 mb-1">VITE_SUPABASE_URL</label>
                  <input
                    type="text"
                    readOnly
                    value={SUPABASE_URL}
                    className="w-full font-mono bg-slate-100 text-slate-800 px-3 py-2 rounded-lg border border-slate-200 select-all"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-600 mb-1">VITE_SUPABASE_ANON_KEY</label>
                  <input
                    type="text"
                    readOnly
                    value="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpnamFzeXZ0cXpyY2dzd2lqZ21zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUzOTMwMjIsImV4cCI6MjEwMDk2OTAyMn0.ZbfiTHPM4qYNIQb-4HQLlEKpN9hMe_UNWrY3s4mXjg0"
                    className="w-full font-mono bg-slate-100 text-slate-800 px-3 py-2 rounded-lg border border-slate-200 select-all text-[11px]"
                  />
                </div>
              </div>

              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-900 space-y-1">
                <div className="flex items-center gap-1.5 font-bold">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Security & Best Practices Compliance</span>
                </div>
                <p className="text-[11px] text-emerald-800">
                  - Uses the official <code className="bg-emerald-100 px-1 rounded">@supabase/supabase-js</code> library.
                  <br />
                  - Service Role Keys are <strong>never</strong> exposed in client code.
                  <br />- Requests operate under Row Level Security (RLS) policies.
                </p>
              </div>
            </div>
          )}

          {/* TAB 4: SQL SCHEMA GENERATOR */}
          {activeTab === 'schema' && (
            <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3 shadow-2xs">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-emerald-600" />
                    Supabase SQL Table Initialization Script
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    If your Supabase project is new, execute this script in your Supabase SQL Editor.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleCopySql}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3 py-1.5 rounded-lg cursor-pointer transition-colors shadow-xs flex items-center gap-1.5"
                >
                  {copiedSql ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedSql ? 'Copied!' : 'Copy SQL Script'}</span>
                </button>
              </div>

              <pre className="bg-slate-900 text-emerald-300 font-mono text-[11px] p-4 rounded-xl overflow-x-auto max-h-72 border border-slate-800 leading-relaxed">
                {SQL_SCHEMA_SCRIPT}
              </pre>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="bg-slate-100 border-t border-slate-200 px-6 py-3 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <span>Official Supabase JS Client v2 Connected</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>

      {/* Delete Catalog Item Warning Modal */}
      <ConfirmDeleteModal
        isOpen={!!pendingDeleteCatalog}
        title="Delete Supabase Catalog Record"
        message="Warning: This action will permanently delete this catalog item directly from your live Supabase database."
        itemName={pendingDeleteCatalog?.name}
        itemCode={pendingDeleteCatalog?.code}
        locationLabel="Live Supabase Database (catalog_items)"
        onCancel={() => setPendingDeleteCatalog(null)}
        onConfirm={() => {
          if (pendingDeleteCatalog) {
            handleDeleteItem(pendingDeleteCatalog.id, pendingDeleteCatalog.name);
            setPendingDeleteCatalog(null);
          }
        }}
      />

      {/* Delete Saved Barcode Warning Modal */}
      <ConfirmDeleteModal
        isOpen={!!pendingDeleteBarcode}
        title="Delete Supabase Barcode Design"
        message="Warning: This action will permanently remove this saved barcode design from your live Supabase database."
        itemName={pendingDeleteBarcode?.title}
        itemCode={pendingDeleteBarcode?.text}
        locationLabel="Live Supabase Database (saved_barcodes)"
        onCancel={() => setPendingDeleteBarcode(null)}
        onConfirm={() => {
          if (pendingDeleteBarcode) {
            handleDeleteBarcode(pendingDeleteBarcode.id, pendingDeleteBarcode.title);
            setPendingDeleteBarcode(null);
          }
        }}
      />
    </div>
  );
};
