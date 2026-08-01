import React, { useState, useEffect } from 'react';
import { Barcode, Loader2 } from 'lucide-react';
import { Header } from './components/Header';
import { BarcodePreview } from './components/BarcodePreview';
import { BarcodeControls } from './components/BarcodeControls';
import { PrintSheetModal } from './components/PrintSheetModal';
import { BatchModal } from './components/BatchModal';
import { HistoryDrawer } from './components/HistoryDrawer';
import { CatalogModal } from './components/CatalogModal';
import { SupabaseSyncModal } from './components/SupabaseSyncModal';
import { ReportsModal, ReportType } from './components/ReportsModal';
import { ToastNotification, ToastData } from './components/ToastNotification';
import { DEFAULT_CATALOG_ITEMS } from './data/catalog';
import { formatPriceWithDecimals } from './utils/barcodeUtils';
import { detectLocalPrinter, applyPrinterPreset } from './utils/printerUtils';
import { BarcodeOptions, BarcodeHistoryItem, CatalogItem } from './types';
import {
  fetchCatalogItemsFromSupabase,
  insertCatalogItemToSupabase,
  updateCatalogItemInSupabase,
  deleteCatalogItemFromSupabase,
  fetchSavedBarcodesFromSupabase,
  insertPriceUpdateToSupabase,
} from './lib/supabaseService';

const CATALOG_STORAGE_KEY = 'barcode_studio_catalog_v1';
const HISTORY_STORAGE_KEY = 'barcode_studio_history_v1';

const INITIAL_ITEM = DEFAULT_CATALOG_ITEMS[0]; // Ball point pen (11002546, 5 SAR)
const INITIAL_BATCH = 'R1456';

const DEFAULT_OPTIONS: BarcodeOptions = {
  text: `${INITIAL_ITEM.itemCode}.${INITIAL_BATCH}`,
  format: 'CODE128',
  lineColor: '#000000',
  background: '#ffffff',
  width: 1.6,
  height: 100,
  displayValue: false,
  font: 'serif',
  fontSize: 26,
  fontPosition: 'bottom',
  textAlign: 'center',
  textMargin: 4,
  margin: 12,
  flat: false,
  labelMode: 'retailFrame',
  itemCode: INITIAL_ITEM.itemCode,
  itemName: INITIAL_ITEM.itemName,
  price: INITIAL_ITEM.price,
  batch: INITIAL_BATCH,
  showBorder: true,
  borderWidth: 3,
  borderTextGap: 8,
  barcodePriceGap: 6,
  activeFrameWidthInches: 1.90,
  activeFrameHeightInches: 0.90,
  wasfatyType: 'Non-Wasfaty',
};

export default function App() {
  const [catalogItems, setCatalogItems] = useState<CatalogItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<CatalogItem | null>(null);
  const [itemBatch, setItemBatch] = useState<string>(INITIAL_BATCH);
  const [options, setOptions] = useState<BarcodeOptions>(DEFAULT_OPTIONS);
  const [history, setHistory] = useState<BarcodeHistoryItem[]>([]);
  const [toast, setToast] = useState<ToastData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const [isPrintSheetOpen, setIsPrintSheetOpen] = useState(false);
  const [isBatchOpen, setIsBatchOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isCatalogOpen, setIsCatalogOpen] = useState(false);
  const [isSupabaseOpen, setIsSupabaseOpen] = useState(false);
  const [isReportsOpen, setIsReportsOpen] = useState(false);
  const [activeReportTab, setActiveReportTab] = useState<ReportType>('new_enlisted');

  // Clear localStorage and load items directly from Supabase on mount
  useEffect(() => {
    let isMounted = true;

    try {
      localStorage.clear();
      console.log('Cleared all items in localStorage as requested.');
    } catch (e) {
      console.warn('Could not clear localStorage:', e);
    }

    const initializeData = async () => {
      try {
        // Auto-detect printer concurrently
        detectLocalPrinter()
          .then((res) => {
            if (isMounted) {
              setOptions((prev) => applyPrinterPreset(prev, res.preset));
            }
          })
          .catch(() => {});

        // Fetch catalog items & history concurrently from Supabase
        const [catalogRes, historyRes] = await Promise.all([
          fetchCatalogItemsFromSupabase(),
          fetchSavedBarcodesFromSupabase(),
        ]);

        if (!isMounted) return;

        if (historyRes.data && historyRes.data.length > 0) {
          setHistory(historyRes.data);
        }

        const fetchedItems = catalogRes.data && catalogRes.data.length > 0
          ? catalogRes.data
          : DEFAULT_CATALOG_ITEMS;

        setCatalogItems(fetchedItems);

        if (fetchedItems.length > 0) {
          const firstItem = fetchedItems[0];
          setSelectedItem(firstItem);
          const cleanBatch = INITIAL_BATCH.trim();
          setOptions((prev) => ({
            ...prev,
            text: cleanBatch ? `${firstItem.itemCode}.${cleanBatch}` : firstItem.itemCode,
            itemCode: firstItem.itemCode,
            itemName: firstItem.itemName,
            price: firstItem.price,
            format: firstItem.format || prev.format || 'CODE128',
          }));
        }
      } catch (err) {
        console.error('Failed to initialize data from database:', err);
        if (isMounted) {
          setCatalogItems(DEFAULT_CATALOG_ITEMS);
          setSelectedItem(DEFAULT_CATALOG_ITEMS[0]);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    initializeData();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleAddCatalogItem = async (newItemData: Omit<CatalogItem, 'id' | 'createdAt'>) => {
    const formattedPrice = formatPriceWithDecimals(newItemData.price);

    // 1. Save directly into Supabase database
    const { data: createdCloudItem, error } = await insertCatalogItemToSupabase({
      itemCode: newItemData.itemCode,
      itemName: newItemData.itemName,
      price: formattedPrice,
      mrp: newItemData.mrp || formattedPrice,
      unitCost: newItemData.unitCost,
      isVatted: newItemData.isVatted,
      isDeactivated: newItemData.isDeactivated,
      category: newItemData.category || 'General',
      afterDiscount: newItemData.afterDiscount,
      format: newItemData.format || 'CODE128',
    });

    const newItem: CatalogItem = createdCloudItem || {
      ...newItemData,
      price: formattedPrice,
      id: `item-${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      createdAt: Date.now(),
    };

    setCatalogItems((prev) => [newItem, ...prev]);
    setSelectedItem(newItem);

    // Update barcode text and retail options
    const cleanBatch = itemBatch.trim();
    setOptions((prev) => ({
      ...prev,
      text: cleanBatch ? `${newItem.itemCode}.${cleanBatch}` : newItem.itemCode,
      itemCode: newItem.itemCode,
      itemName: newItem.itemName,
      price: formattedPrice,
      batch: cleanBatch,
    }));

    // Trigger toast notification
    setToast({
      id: Date.now(),
      title: error ? 'Saved Locally (Supabase Note)' : 'Saved Directly to Supabase Database',
      message: error
        ? `"${newItem.itemName}" added. (${error})`
        : `"${newItem.itemName}" was saved directly to your Supabase cloud database!`,
      type: error ? 'warning' : 'success',
      itemInfo: {
        itemCode: newItem.itemCode,
        itemName: newItem.itemName,
        price: formattedPrice,
      },
    });
  };

  const handleUpdateCatalogItem = async (id: string, updatedData: Partial<CatalogItem>) => {
    const dataToSave = { ...updatedData };
    if (dataToSave.price) {
      dataToSave.price = formatPriceWithDecimals(dataToSave.price);
    }
    if (dataToSave.mrp) {
      dataToSave.mrp = formatPriceWithDecimals(dataToSave.mrp);
    }
    if (dataToSave.afterDiscount !== undefined && dataToSave.afterDiscount !== null) {
      if (dataToSave.afterDiscount.trim() !== '') {
        dataToSave.afterDiscount = formatPriceWithDecimals(dataToSave.afterDiscount);
      } else {
        dataToSave.afterDiscount = '';
      }
    }

    // Check if price, MRP, or Unit Cost was updated to record in price_update table
    const oldItem = catalogItems.find((item) => item.id === id);
    if (oldItem) {
      const oldMrpRaw = oldItem.mrp || oldItem.price;
      const newMrpRaw = dataToSave.mrp || dataToSave.price || oldMrpRaw;

      const formattedOldMrp = formatPriceWithDecimals(oldMrpRaw);
      const formattedNewMrp = formatPriceWithDecimals(newMrpRaw);

      const oldUnitCost = oldItem.unitCost || '';
      const newUnitCost = dataToSave.unitCost !== undefined ? dataToSave.unitCost : oldUnitCost;

      if (formattedOldMrp !== formattedNewMrp || oldUnitCost !== newUnitCost) {
        insertPriceUpdateToSupabase(
          dataToSave.itemCode || oldItem.itemCode,
          dataToSave.itemName || oldItem.itemName,
          formattedOldMrp,
          formattedNewMrp,
          oldUnitCost,
          newUnitCost
        ).catch((err) => console.warn('Could not record price update to Supabase:', err));
      }
    }

    // 1. Update directly in Supabase
    const { data: updatedCloudItem, error } = await updateCatalogItemInSupabase(id, dataToSave);

    const mergedItemData = {
      ...dataToSave,
      ...(updatedCloudItem || {}),
    };

    setCatalogItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...mergedItemData } : item))
    );

    if (selectedItem && selectedItem.id === id) {
      const updatedSelected = { ...selectedItem, ...mergedItemData };
      setSelectedItem(updatedSelected);

      const cleanBatch = itemBatch.trim();
      setOptions((prev) => ({
        ...prev,
        text: cleanBatch ? `${updatedSelected.itemCode}.${cleanBatch}` : updatedSelected.itemCode,
        itemCode: updatedSelected.itemCode,
        itemName: updatedSelected.itemName,
        price: formatPriceWithDecimals(updatedSelected.price),
        batch: cleanBatch,
      }));
    }

    setToast({
      id: Date.now(),
      title: 'Catalog Item Updated',
      message: error
        ? `Updated item code ${dataToSave.itemCode || id}.`
        : `Item code ${dataToSave.itemCode || id} updated directly in Supabase catalog_items!`,
      type: error ? 'warning' : 'info',
    });
  };

  const handleDeleteCatalogItem = async (id: string) => {
    // 1. Delete directly from Supabase
    const { success, error } = await deleteCatalogItemFromSupabase(id);

    setCatalogItems((prev) => prev.filter((item) => item.id !== id));
    if (selectedItem && selectedItem.id === id) {
      setSelectedItem(null);
    }

    setToast({
      id: Date.now(),
      title: 'Item Removed',
      message: error
        ? 'Item deleted from catalog.'
        : 'Item removed directly from Supabase database.',
      type: 'warning',
    });
  };

  const handleSyncCatalogFromSupabase = (cloudItems: CatalogItem[]) => {
    if (!cloudItems || cloudItems.length === 0) return;
    setCatalogItems(cloudItems);
    const firstItem = cloudItems[0];
    setSelectedItem(firstItem);
    const cleanBatch = itemBatch.trim();
    setOptions((prev) => ({
      ...prev,
      text: cleanBatch ? `${firstItem.itemCode}.${cleanBatch}` : firstItem.itemCode,
      itemCode: firstItem.itemCode,
      itemName: firstItem.itemName,
      price: firstItem.price,
      format: firstItem.format || prev.format || 'CODE128',
    }));
    setToast({
      id: Date.now(),
      title: 'Catalog Synced from Supabase',
      message: `Successfully loaded ${cloudItems.length} items from Supabase database.`,
      type: 'success',
    });
  };

  // Auto-save history to Supabase or state
  useEffect(() => {
    if (!options.text || options.text.trim().length === 0) return;

    const timer = setTimeout(() => {
      setHistory((prev) => {
        // Prevent duplicate consecutive entries
        if (prev.length > 0 && prev[0].text === options.text && prev[0].format === options.format) {
          return prev;
        }

        const titleText = selectedItem
          ? `${selectedItem.itemName} (${options.text})`
          : options.text;

        const newItem: BarcodeHistoryItem = {
          id: `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          title: titleText,
          text: options.text,
          format: options.format,
          createdAt: Date.now(),
          options: { ...options },
        };

        return [newItem, ...prev.slice(0, 19)]; // Keep max 20
      });
    }, 1200);

    return () => clearTimeout(timer);
  }, [options, selectedItem]);

  const handleResetDefaults = () => {
    setSelectedItem(INITIAL_ITEM);
    setItemBatch(INITIAL_BATCH);
    setOptions(DEFAULT_OPTIONS);
  };

  const handleSelectHistoryItem = (item: BarcodeHistoryItem) => {
    setOptions(item.options);
  };

  const handleClearHistory = () => {
    setHistory([]);
  };

  const handleDeleteHistoryItem = (id: string) => {
    setHistory((prev) => prev.filter((item) => item.id !== id));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 select-none">
        <div className="flex flex-col items-center gap-4 max-w-sm text-center">
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-300 p-0.5 shadow-lg shadow-amber-500/20 flex items-center justify-center">
              <div className="w-full h-full bg-slate-900 rounded-[14px] flex items-center justify-center">
                <Barcode className="w-8 h-8 text-amber-400 animate-pulse" />
              </div>
            </div>
          </div>
          <div className="space-y-1 mt-2">
            <h2 className="text-lg font-bold tracking-tight text-white">Loading Barcode Studio</h2>
            <p className="text-xs text-slate-400 font-medium">Loading database catalog & settings...</p>
          </div>
          <div className="w-48 h-1 bg-slate-800 rounded-full overflow-hidden mt-1">
            <div className="h-full bg-gradient-to-r from-amber-500 to-amber-300 rounded-full animate-pulse w-full"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100/60 font-sans text-slate-900 flex flex-col selection:bg-slate-900 selection:text-white">
      {/* Top Header */}
      <Header
        onOpenPrintSheet={() => setIsPrintSheetOpen(true)}
        onOpenBatch={() => setIsBatchOpen(true)}
        onOpenHistory={() => setIsHistoryOpen(true)}
        onOpenCatalog={() => setIsCatalogOpen(true)}
        onOpenSupabase={() => setIsSupabaseOpen(true)}
        onOpenReports={(tab = 'new_enlisted') => {
          setActiveReportTab(tab);
          setIsReportsOpen(true);
        }}
        historyCount={history.length}
        catalogCount={catalogItems.length}
      />

      {/* Main Single-View Canvas */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Live Preview Card: Shown first on mobile, sticky top on desktop */}
          <div className="order-1 lg:order-2 lg:col-span-7 lg:sticky lg:top-20">
            <BarcodePreview
              options={options}
              onChangeOptions={setOptions}
              onQuickPrint={() => setIsPrintSheetOpen(true)}
            />
          </div>

          {/* Barcode Controls Column */}
          <div className="order-2 lg:order-1 lg:col-span-5">
            <BarcodeControls
              options={options}
              onChangeOptions={setOptions}
              onReset={handleResetDefaults}
              catalogItems={catalogItems}
              selectedItem={selectedItem}
              onSelectItem={setSelectedItem}
              itemBatch={itemBatch}
              onChangeBatch={setItemBatch}
              onOpenCatalogModal={() => setIsCatalogOpen(true)}
            />
          </div>
        </div>
      </main>

      {/* Modals & Drawers */}
      <PrintSheetModal
        isOpen={isPrintSheetOpen}
        onClose={() => setIsPrintSheetOpen(false)}
        options={options}
        selectedItem={selectedItem}
      />

      <BatchModal
        isOpen={isBatchOpen}
        onClose={() => setIsBatchOpen(false)}
        defaultFormat={options.format}
      />

      <CatalogModal
        isOpen={isCatalogOpen}
        onClose={() => setIsCatalogOpen(false)}
        items={catalogItems}
        onAddItem={handleAddCatalogItem}
        onUpdateItem={handleUpdateCatalogItem}
        onDeleteItem={handleDeleteCatalogItem}
        onSelectItem={(item) => {
          setSelectedItem(item);
          const cleanBatch = itemBatch.trim();
          setOptions((prev) => ({
            ...prev,
            text: cleanBatch ? `${item.itemCode}.${cleanBatch}` : item.itemCode,
            itemCode: item.itemCode,
            itemName: item.itemName,
            price: item.price,
            batch: cleanBatch,
          }));
        }}
        selectedItemId={selectedItem?.id}
      />

      <HistoryDrawer
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        history={history}
        onSelectHistoryItem={handleSelectHistoryItem}
        onClearHistory={handleClearHistory}
        onDeleteItem={handleDeleteHistoryItem}
      />

      <SupabaseSyncModal
        isOpen={isSupabaseOpen}
        onClose={() => setIsSupabaseOpen(false)}
        currentCatalogItems={catalogItems}
        onSyncCatalogToLocal={handleSyncCatalogFromSupabase}
        currentBarcodeOptions={options}
        onLoadBarcodeToEditor={(loadedOptions) => setOptions(loadedOptions)}
        onShowToast={(msg, type = 'info') =>
          setToast({
            id: Date.now(),
            title: 'Supabase Sync',
            message: msg,
            type: type === 'error' ? 'warning' : type,
          })
        }
      />

      <ReportsModal
        isOpen={isReportsOpen}
        onClose={() => setIsReportsOpen(false)}
        catalogItems={catalogItems}
        defaultReportTab={activeReportTab}
      />

      {/* Floating Notification Toast */}
      <ToastNotification
        toast={toast}
        onDismiss={() => setToast(null)}
        duration={2500}
      />
    </div>
  );
}

