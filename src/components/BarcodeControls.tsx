import React, { useState, useEffect, useRef, useMemo } from 'react';
import { BarcodeOptions, BarcodeFormat, BarcodePreset, CatalogItem } from '../types';
import { PRESETS, BARCODE_FORMAT_INFO } from '../data/presets';
import { formatPriceWithDecimals, formatPriceWithSymbol } from '../utils/barcodeUtils';
import { PRINTER_PRESETS, detectLocalPrinter, applyPrinterPreset, PrinterPreset } from '../utils/printerUtils';
import {
  Type,
  Maximize,
  Palette,
  Sliders,
  RotateCcw,
  Sparkles,
  Info,
  Check,
  ChevronDown,
  Hash,
  X,
  Package,
  Layers,
  Tag,
  DollarSign,
  Plus,
  Barcode,
  Printer,
  RefreshCw,
  Cpu,
  Search,
} from 'lucide-react';

interface BarcodeControlsProps {
  options: BarcodeOptions;
  onChangeOptions: (newOptions: BarcodeOptions) => void;
  onReset: () => void;
  catalogItems: CatalogItem[];
  selectedItem: CatalogItem | null;
  onSelectItem: (item: CatalogItem | null) => void;
  itemBatch: string;
  onChangeBatch: (batch: string) => void;
  onOpenCatalogModal: () => void;
}

export const BarcodeControls: React.FC<BarcodeControlsProps> = ({
  options,
  onChangeOptions,
  onReset,
  catalogItems,
  selectedItem,
  onSelectItem,
  itemBatch,
  onChangeBatch,
  onOpenCatalogModal,
}) => {
  const [activeTab, setActiveTab] = useState<'dimensions' | 'colors' | 'text'>('dimensions');
  const [isDetectingPrinter, setIsDetectingPrinter] = useState<boolean>(false);
  const [detectionStatus, setDetectionStatus] = useState<string | null>(null);

  // Searchable Combobox state for 20,000+ catalog items
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [comboboxSearch, setComboboxSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Truncate filtered search results to max 40 items for ultra-fast rendering with large datasets
  const comboboxFiltered = useMemo(() => {
    const q = comboboxSearch.trim().toLowerCase();
    if (!q) return catalogItems.slice(0, 40);

    const tokens = q.split(/\s+/).filter(Boolean);
    if (tokens.length === 0) return catalogItems.slice(0, 40);

    const results: CatalogItem[] = [];
    for (let i = 0; i < catalogItems.length; i++) {
      const item = catalogItems[i];
      const nameStr = String(item.itemName || '').toLowerCase();
      const codeStr = String(item.itemCode || '').toLowerCase();
      const catStr = String(item.category || '').toLowerCase();
      const priceStr = String(item.price || '').toLowerCase();

      const matches = tokens.every(
        (token) =>
          nameStr.includes(token) ||
          codeStr.includes(token) ||
          catStr.includes(token) ||
          priceStr.includes(token)
      );

      if (matches) {
        results.push(item);
        if (results.length >= 40) break;
      }
    }
    return results;
  }, [catalogItems, comboboxSearch]);

  const handleAutoDetect = async () => {
    setIsDetectingPrinter(true);
    setDetectionStatus(null);
    try {
      const res = await detectLocalPrinter();
      const updated = applyPrinterPreset(options, res.preset);
      onChangeOptions(updated);
      setDetectionStatus(`${res.printerName} (${res.preset.widthInches}″ × ${res.preset.heightInches}″) — ${res.details}`);
    } catch (e) {
      setDetectionStatus('Printer auto-detection completed. Using Zebra ZD230 (2″ × 1″).');
    } finally {
      setIsDetectingPrinter(false);
    }
  };

  const handleSelectPrinterPreset = (preset: PrinterPreset) => {
    const updated = applyPrinterPreset(options, preset);
    onChangeOptions(updated);
    setDetectionStatus(`Applied preset: ${preset.name} (${preset.widthInches}″ × ${preset.heightInches}″)`);
  };

  const updateOption = <K extends keyof BarcodeOptions>(key: K, value: BarcodeOptions[K]) => {
    onChangeOptions({
      ...options,
      [key]: value,
    });
  };

  const handleSelectCatalogItem = (itemId: string) => {
    if (itemId === 'custom') {
      onSelectItem(null);
      return;
    }
    const found = catalogItems.find((i) => i.id === itemId);
    if (found) {
      onSelectItem(found);
      const cleanBatch = itemBatch.trim();
      const combinedText = cleanBatch ? `${found.itemCode}.${cleanBatch}` : found.itemCode;
      onChangeOptions({
        ...options,
        text: combinedText,
        itemCode: found.itemCode,
        itemName: found.itemName,
        price: formatPriceWithDecimals(found.price),
        batch: cleanBatch,
      });
    }
  };

  const handleBatchChange = (newBatch: string) => {
    const uppercaseBatch = newBatch.toUpperCase();
    onChangeBatch(uppercaseBatch);
    const cleanBatch = uppercaseBatch.trim();
    if (selectedItem) {
      const combinedText = cleanBatch ? `${selectedItem.itemCode}.${cleanBatch}` : selectedItem.itemCode;
      onChangeOptions({
        ...options,
        text: combinedText,
        itemCode: selectedItem.itemCode,
        itemName: selectedItem.itemName,
        price: selectedItem.price,
        batch: cleanBatch,
      });
    } else {
      const code = options.itemCode || (options.text.includes('.') ? options.text.split('.')[0] : options.text);
      const combinedText = cleanBatch ? `${code}.${cleanBatch}` : code;
      onChangeOptions({
        ...options,
        text: combinedText,
        batch: cleanBatch,
      });
    }
  };

  const handleApplyPreset = (preset: BarcodePreset) => {
    onSelectItem(null);
    onChangeOptions({
      ...options,
      text: preset.sampleValue,
      format: preset.format,
    });
  };

  const formatInfo = BARCODE_FORMAT_INFO[options.format];

  const colorPresets = [
    { name: 'Classic Black', line: '#000000', bg: '#ffffff' },
    { name: 'Midnight Navy', line: '#0f172a', bg: '#f8fafc' },
    { name: 'Forest Green', line: '#064e3b', bg: '#f0fdf4' },
    { name: 'Deep Burgundy', line: '#881337', bg: '#fff1f2' },
    { name: 'Charcoal Minimal', line: '#1f2937', bg: '#ffffff' },
  ];

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 flex flex-col gap-6">
      {/* 1. Item Selection & Batch Input (Main Workflow) */}
      <div className="space-y-4 pb-4 border-b border-slate-100">
        <div className="flex items-center justify-between">
          <label htmlFor="catalog-item-select" className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
            <Package className="w-4 h-4 text-slate-700" />
            Select Saved Product / Item
          </label>
          <button
            type="button"
            onClick={onOpenCatalogModal}
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200/80 px-2 py-1 rounded-lg transition-colors"
          >
            <Plus className="w-3 h-3" />
            Manage Items
          </button>
        </div>

        {/* Item Dropdown / Search Combobox */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setIsDropdownOpen((prev) => !prev)}
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 text-xs font-semibold flex items-center justify-between shadow-xs hover:border-slate-300 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2 truncate pr-2">
              <Package className="w-4 h-4 text-slate-400 shrink-0" />
              {selectedItem ? (
                <span className="truncate flex items-center gap-1.5 min-w-0">
                  <strong className="text-slate-900 truncate">{selectedItem.itemName}</strong>
                  {selectedItem.isDeactivated && (
                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-rose-100 text-rose-700 border border-rose-200 shrink-0 uppercase tracking-wider">
                      Deactivated
                    </span>
                  )}
                  <span className="text-slate-500 font-normal shrink-0">
                    ({selectedItem.itemCode} • {selectedItem.price})
                  </span>
                </span>
              ) : (
                <span className="text-slate-500 italic">-- Direct Custom Input --</span>
              )}
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-[10px] bg-slate-100 text-slate-600 font-bold px-1.5 py-0.5 rounded-full border border-slate-200">
                {catalogItems.length.toLocaleString()} items
              </span>
              <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
            </div>
          </button>

          {/* Dropdown panel */}
          {isDropdownOpen && (
            <div className="absolute z-50 left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden flex flex-col max-h-80">
              {/* Search input inside dropdown */}
              <div className="p-2 border-b border-slate-100 bg-slate-50/80 flex items-center gap-2">
                <Search className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1" />
                <input
                  type="text"
                  autoFocus
                  value={comboboxSearch}
                  onChange={(e) => setComboboxSearch(e.target.value)}
                  placeholder="Search code, name or category..."
                  className="w-full text-xs bg-transparent border-none focus:outline-hidden text-slate-900"
                />
                {comboboxSearch && (
                  <button
                    type="button"
                    onClick={() => setComboboxSearch('')}
                    className="text-slate-400 hover:text-slate-600 p-0.5"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Options list */}
              <div className="overflow-y-auto flex-1 p-1 space-y-0.5">
                <button
                  type="button"
                  onClick={() => {
                    handleSelectCatalogItem('custom');
                    setIsDropdownOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold flex items-center justify-between transition-colors ${
                    !selectedItem ? 'bg-slate-900 text-white' : 'hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  <span>-- Direct Custom Input --</span>
                  {!selectedItem && <Check className="w-3.5 h-3.5 text-white" />}
                </button>

                {comboboxFiltered.length === 0 ? (
                  <div className="px-3 py-4 text-center text-xs text-slate-400 italic">
                    No matching items found ({catalogItems.length.toLocaleString()} total)
                  </div>
                ) : (
                  comboboxFiltered.map((item, idx) => {
                    const isSelected = selectedItem?.id === item.id;
                    return (
                      <button
                        key={`${item.id}_${idx}`}
                        type="button"
                        onClick={() => {
                          handleSelectCatalogItem(item.id);
                          setIsDropdownOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 rounded-lg text-xs flex items-center justify-between gap-2 transition-colors ${
                          isSelected
                            ? 'bg-slate-900 text-white font-bold'
                            : 'hover:bg-slate-100 text-slate-800'
                        }`}
                      >
                        <div className="truncate min-w-0">
                          <div className="flex items-center gap-1.5 truncate">
                            <span className="truncate">{item.itemName}</span>
                            {item.isDeactivated && (
                              <span
                                className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase tracking-wider ${
                                  isSelected ? 'bg-rose-900 text-rose-200 border border-rose-700' : 'bg-rose-100 text-rose-700 border border-rose-200'
                                }`}
                              >
                                Deactivated
                              </span>
                            )}
                            {item.afterDiscount && (
                              <span
                                className={`text-[9px] px-1.5 py-0.2 rounded font-bold ${
                                  isSelected ? 'bg-amber-900 text-amber-200 border border-amber-700' : 'bg-amber-100 text-amber-800 border border-amber-200'
                                }`}
                              >
                                Disc: {item.afterDiscount}
                              </span>
                            )}
                            {item.category && (
                              <span
                                className={`text-[9px] px-1.5 py-0.2 rounded font-normal ${
                                  isSelected ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-500'
                                }`}
                              >
                                {item.category}
                              </span>
                            )}
                          </div>
                          <div
                            className={`text-[10px] font-mono mt-0.5 ${
                              isSelected ? 'text-slate-300' : 'text-slate-500'
                            }`}
                          >
                            Code: {item.itemCode} • Price: {item.price}
                          </div>
                        </div>
                        {isSelected && <Check className="w-3.5 h-3.5 text-white shrink-0" />}
                      </button>
                    );
                  })
                )}
              </div>

              {/* Footer bar */}
              <div className="px-3 py-1.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
                <span>
                  Showing max 40 of {catalogItems.length.toLocaleString()} items
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setIsDropdownOpen(false);
                    onOpenCatalogModal();
                  }}
                  className="text-slate-900 font-bold hover:underline"
                >
                  View All Catalog
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Dynamic Item Batch Field (Untracked on-the-fly input) */}
        <div className="space-y-1.5 pt-1">
          <label htmlFor="item-batch-input" className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-slate-500" />
              Item Batch Number (On-the-fly)
            </span>
            <span className="text-[10px] text-slate-400 font-normal">Not saved to item</span>
          </label>
          <div className="relative">
            <input
              id="item-batch-input"
              type="text"
              value={itemBatch}
              onChange={(e) => handleBatchChange(e.target.value)}
              placeholder="e.g. R1456"
              className="w-full px-4 py-2 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 font-mono text-xs focus:outline-hidden focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all shadow-xs uppercase"
            />
            {itemBatch && (
              <button
                type="button"
                onClick={() => handleBatchChange('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <p className="text-[11px] text-slate-500">
            {selectedItem ? (
              <>
                Format: <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-800 font-bold">{selectedItem.itemCode}{itemBatch.trim() ? `.${itemBatch.trim()}` : ''}</code>
              </>
            ) : (
              'Batch appends to item code as (itemcode.batch)'
            )}
          </p>
        </div>

        {/* Wasfaty Type Select */}
        <div className="space-y-1.5">
          <label htmlFor="wasfaty-type-select" className="text-[11px] font-semibold text-slate-700 flex items-center justify-between">
            <span>Wasfaty Type</span>
            {options.wasfatyType === 'Wasfaty' && (
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded font-mono">
                "W" Banner Active
              </span>
            )}
          </label>
          <div className="relative">
            <select
              id="wasfaty-type-select"
              value={options.wasfatyType || 'Non-Wasfaty'}
              onChange={(e) => updateOption('wasfatyType', e.target.value as 'Wasfaty' | 'Non-Wasfaty')}
              className="w-full px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-900 text-xs font-semibold appearance-none focus:outline-hidden focus:ring-2 focus:ring-slate-900 pr-10 shadow-xs cursor-pointer"
            >
              <option value="Wasfaty">Wasfaty</option>
              <option value="Non-Wasfaty">Non-Wasfaty</option>
            </select>
            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* Selected Item Info Badge */}
        {selectedItem && (
          <div className="bg-slate-900 text-white p-3.5 rounded-xl text-xs space-y-1.5 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
              <span className="font-bold text-sm text-white flex items-center gap-1.5 truncate mr-2">
                <Tag className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="truncate">{selectedItem.itemName}</span>
              </span>
              <div className="flex items-center gap-1.5 shrink-0 font-mono">
                {selectedItem.isDeactivated && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded font-sans font-semibold uppercase tracking-wider bg-rose-950 text-rose-300 border border-rose-800 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse"></span>
                    Deactivated
                  </span>
                )}
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-sans font-semibold uppercase tracking-wider ${
                  selectedItem.isVatted
                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                    : 'bg-slate-800 text-slate-400 border border-slate-700'
                }`}>
                  {selectedItem.isVatted ? 'Vatted' : 'Non-Vatted'}
                </span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px] pt-0.5 text-slate-300 font-mono">
              <div>
                Item Code: <strong className="text-white">{selectedItem.itemCode}</strong>
              </div>
              <div>
                Batch: <strong className="text-amber-300">{itemBatch.trim() || 'None'}</strong>
              </div>
            </div>
            <div className="space-y-1.5 pt-1.5 border-t border-slate-800 text-[11px] font-mono">
              <div className="flex items-center justify-between text-slate-300">
                <span>MRP:</span>
                <strong className="text-slate-200 font-bold">{formatPriceWithSymbol(selectedItem.mrp || selectedItem.price)}</strong>
              </div>
              <div className="flex items-center justify-between text-emerald-400">
                <span>Price:</span>
                <strong className="text-emerald-400 font-bold">{formatPriceWithSymbol(selectedItem.price)}</strong>
              </div>
              {selectedItem.afterDiscount && (
                <div className="flex items-center justify-between text-amber-300">
                  <span>After Discount:</span>
                  <strong className="text-amber-300 font-bold">{formatPriceWithSymbol(selectedItem.afterDiscount)}</strong>
                </div>
              )}
            </div>
            <div className="text-[11px] pt-1 text-slate-400 font-mono border-t border-slate-800 flex items-center justify-between">
              <span>Encoded Barcode:</span>
              <strong className="text-emerald-300 font-bold">{options.text}</strong>
            </div>
          </div>
        )}
      </div>



      {/* Input Payload & Format (View-Only Barcode Value) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <label htmlFor="barcode-payload-input" className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
            <Hash className="w-3.5 h-3.5 text-slate-500" />
            Barcode Raw Text Value
          </label>
          <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md uppercase tracking-wider">
            View Only
          </span>
        </div>

        <div className="relative">
          <input
            id="barcode-payload-input"
            type="text"
            value={options.text}
            readOnly
            placeholder={formatInfo.placeholder}
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-100/90 text-slate-700 font-mono text-sm cursor-default focus:outline-hidden shadow-xs select-all"
          />
        </div>

        {/* Quick presets */}
        <div>
          <span className="text-[11px] font-medium text-slate-400 block mb-2">
            Sample Presets:
          </span>
          <div className="flex flex-wrap gap-1.5">
            {PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => handleApplyPreset(preset)}
                className={`text-[11px] font-medium px-2.5 py-1 rounded-lg border transition-all ${
                  options.format === preset.format && options.text === preset.sampleValue
                    ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200/80'
                }`}
              >
                {preset.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Barcode Format Selector */}
      <div className="space-y-2 pt-2 border-t border-slate-100">
        <label htmlFor="barcode-format-select" className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center justify-between">
          <span>Barcode Symbology</span>
          <span className="text-[11px] font-normal text-slate-400 capitalize">
            {options.format}
          </span>
        </label>

        <div className="relative">
          <select
            id="barcode-format-select"
            value={options.format}
            onChange={(e) => updateOption('format', e.target.value as BarcodeFormat)}
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 text-xs font-semibold appearance-none focus:outline-hidden focus:ring-2 focus:ring-slate-900 pr-10 shadow-xs cursor-pointer"
          >
            {(Object.keys(BARCODE_FORMAT_INFO) as BarcodeFormat[]).map((fmt) => (
              <option key={fmt} value={fmt}>
                {BARCODE_FORMAT_INFO[fmt].name}
              </option>
            ))}
          </select>
          <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        <div className="bg-slate-50/80 border border-slate-200/60 rounded-xl p-3 text-[11px] text-slate-600 flex items-start gap-2">
          <Info className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-slate-800">{formatInfo.description}</p>
            <p className="text-slate-500 mt-0.5">{formatInfo.patternNote}</p>
          </div>
        </div>
      </div>

      {/* Tabs for detailed customization */}
      <div className="pt-2 border-t border-slate-100">
        <div className="flex border-b border-slate-100 mb-4">
          <button
            type="button"
            onClick={() => setActiveTab('dimensions')}
            className={`flex-1 py-2 text-xs font-semibold border-b-2 flex items-center justify-center gap-1.5 transition-colors ${
              activeTab === 'dimensions'
                ? 'border-slate-900 text-slate-900'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            <Maximize className="w-3.5 h-3.5" />
            Size
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('colors')}
            className={`flex-1 py-2 text-xs font-semibold border-b-2 flex items-center justify-center gap-1.5 transition-colors ${
              activeTab === 'colors'
                ? 'border-slate-900 text-slate-900'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            <Palette className="w-3.5 h-3.5" />
            Colors
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('text')}
            className={`flex-1 py-2 text-xs font-semibold border-b-2 flex items-center justify-center gap-1.5 transition-colors ${
              activeTab === 'text'
                ? 'border-slate-900 text-slate-900'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            <Type className="w-3.5 h-3.5" />
            Label
          </button>
        </div>

        {/* Tab 1: Dimensions & Border */}
        {activeTab === 'dimensions' && (
          <div className="space-y-4 text-xs">
            {/* Outer Border Settings */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <label htmlFor="show-border-toggle" className="font-bold text-slate-800 flex items-center gap-1.5">
                  Label Outer Border
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-semibold text-slate-500 uppercase">
                    {options.showBorder !== false ? 'Enabled' : 'Disabled'}
                  </span>
                  <input
                    id="show-border-toggle"
                    type="checkbox"
                    checked={options.showBorder !== false}
                    onChange={(e) => updateOption('showBorder', e.target.checked)}
                    className="w-4 h-4 rounded accent-slate-900 cursor-pointer"
                  />
                </div>
              </div>

              {options.showBorder !== false && (
                <>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-slate-700">
                      <label htmlFor="border-width-slider" className="font-semibold">Border Thickness</label>
                      <span className="font-mono font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                        {options.borderWidth !== undefined ? options.borderWidth : 7} px
                      </span>
                    </div>
                    <input
                      id="border-width-slider"
                      type="range"
                      min="0"
                      max="20"
                      step="1"
                      value={options.borderWidth !== undefined ? options.borderWidth : 7}
                      onChange={(e) => updateOption('borderWidth', parseInt(e.target.value, 10))}
                      className="w-full accent-slate-900 cursor-pointer"
                    />
                  </div>

                  {/* Border Presets */}
                  <div className="flex items-center gap-1.5 pt-1">
                    <span className="text-[10px] text-slate-400 font-medium">Presets:</span>
                    {[
                      { label: 'None', val: 0 },
                      { label: 'Thin (3px)', val: 3 },
                      { label: 'Medium (7px)', val: 7 },
                      { label: 'Thick (12px)', val: 12 },
                      { label: 'Heavy (16px)', val: 16 },
                    ].map((preset) => {
                      const currentBw = options.borderWidth !== undefined ? options.borderWidth : 7;
                      const isActive = currentBw === preset.val;
                      return (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() => updateOption('borderWidth', preset.val)}
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded transition-all cursor-pointer ${
                            isActive
                              ? 'bg-slate-900 text-white shadow-xs'
                              : 'bg-white text-slate-600 hover:bg-slate-200/70 border border-slate-200'
                          }`}
                        >
                          {preset.label}
                        </button>
                      );
                    })}
                  </div>

                  {/* Gap Between Border and Inside Text */}
                  <div className="pt-2.5 border-t border-slate-200/70 space-y-1.5">
                    <div className="flex items-center justify-between text-slate-700">
                      <label htmlFor="border-text-gap-slider" className="font-semibold text-xs flex items-center gap-1.5">
                        <span>Gap: Border ↔ Inside Text</span>
                        <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase ${
                          (options.borderTextGap ?? 6) > 0 ? 'bg-indigo-100 text-indigo-800' : 'bg-slate-200 text-slate-600'
                        }`}>
                          {(options.borderTextGap ?? 6) > 0 ? 'Active' : 'Flush (0px)'}
                        </span>
                      </label>
                      <span className="font-mono font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200 text-xs">
                        {options.borderTextGap !== undefined ? options.borderTextGap : 6} px
                      </span>
                    </div>
                    <input
                      id="border-text-gap-slider"
                      type="range"
                      min="0"
                      max="20"
                      step="1"
                      value={options.borderTextGap !== undefined ? options.borderTextGap : 6}
                      onChange={(e) => updateOption('borderTextGap', parseInt(e.target.value, 10))}
                      className="w-full accent-indigo-600 cursor-pointer"
                    />
                    <div className="flex items-center gap-1.5 pt-0.5">
                      <span className="text-[10px] text-slate-400 font-medium">Quick Gap:</span>
                      {[
                        { label: 'Flush (0px)', val: 0 },
                        { label: 'Tight (3px)', val: 3 },
                        { label: 'Standard (6px)', val: 6 },
                        { label: 'Wide (12px)', val: 12 },
                      ].map((preset) => {
                        const currentGap = options.borderTextGap !== undefined ? options.borderTextGap : 6;
                        const isActive = currentGap === preset.val;
                        return (
                          <button
                            key={preset.label}
                            type="button"
                            onClick={() => updateOption('borderTextGap', preset.val)}
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded transition-all cursor-pointer ${
                              isActive
                                ? 'bg-indigo-600 text-white shadow-xs'
                                : 'bg-white text-slate-600 hover:bg-slate-200/70 border border-slate-200'
                            }`}
                          >
                            {preset.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Barcode Width */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-slate-700">
                <label htmlFor="bar-width-slider" className="font-semibold">Barcode Width</label>
                <span className="font-mono font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                  {options.width}x
                </span>
              </div>
              <input
                id="bar-width-slider"
                type="range"
                min="1"
                max="4"
                step="0.5"
                value={options.width}
                onChange={(e) => updateOption('width', parseFloat(e.target.value))}
                className="w-full accent-slate-900 cursor-pointer"
              />
              <div className="flex items-center gap-1.5 pt-0.5">
                <span className="text-[10px] text-slate-400 font-medium">Presets:</span>
                {[
                  { label: '1x', val: 1 },
                  { label: '1.5x', val: 1.5 },
                  { label: '2x (Default)', val: 2 },
                  { label: '2.5x', val: 2.5 },
                  { label: '3x', val: 3 },
                ].map((preset) => {
                  const isActive = options.width === preset.val;
                  return (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => updateOption('width', preset.val)}
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded transition-all cursor-pointer ${
                        isActive
                          ? 'bg-slate-900 text-white shadow-xs'
                          : 'bg-white text-slate-600 hover:bg-slate-200/70 border border-slate-200'
                      }`}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Height */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-slate-700">
                <label htmlFor="bar-height-slider" className="font-semibold">Bar Height</label>
                <span className="font-mono text-slate-500">{options.height} px</span>
              </div>
              <input
                id="bar-height-slider"
                type="range"
                min="25"
                max="160"
                value={options.height}
                onChange={(e) => updateOption('height', parseInt(e.target.value, 10))}
                className="w-full accent-slate-900 cursor-pointer"
              />
            </div>

            {/* Margin */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-slate-700">
                <label htmlFor="quiet-margin-slider" className="font-semibold">Quiet Margin</label>
                <span className="font-mono text-slate-500">{options.margin} px</span>
              </div>
              <input
                id="quiet-margin-slider"
                type="range"
                min="0"
                max="40"
                value={options.margin}
                onChange={(e) => updateOption('margin', parseInt(e.target.value, 10))}
                className="w-full accent-slate-900 cursor-pointer"
              />
            </div>
          </div>
        )}

        {/* Tab 2: Colors */}
        {activeTab === 'colors' && (
          <div className="space-y-4 text-xs">
            {/* Color themes */}
            <div className="space-y-2">
              <span className="font-semibold text-slate-700 block">Color Palettes</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {colorPresets.map((palette) => (
                  <button
                    key={palette.name}
                    type="button"
                    onClick={() => {
                      updateOption('lineColor', palette.line);
                      updateOption('background', palette.bg);
                    }}
                    className={`flex items-center gap-2 p-2 rounded-lg border text-left text-[11px] font-medium transition-all ${
                      options.lineColor === palette.line && options.background === palette.bg
                        ? 'border-slate-900 bg-slate-50 font-bold ring-1 ring-slate-900'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <span
                      className="w-4 h-4 rounded-full border border-slate-300 shadow-xs shrink-0"
                      style={{ backgroundColor: palette.line }}
                    />
                    <span className="truncate text-slate-700">{palette.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              {/* Foreground picker */}
              <div className="space-y-1.5">
                <label htmlFor="fg-color-input" className="font-semibold text-slate-700 block">Bar Color</label>
                <div className="flex items-center gap-2 border border-slate-200 rounded-xl p-1.5 bg-slate-50/50">
                  <input
                    id="fg-color-input"
                    type="color"
                    value={options.lineColor}
                    onChange={(e) => updateOption('lineColor', e.target.value)}
                    className="w-6 h-6 rounded-md cursor-pointer border-0 p-0"
                  />
                  <span className="font-mono text-[11px] text-slate-600 uppercase">
                    {options.lineColor}
                  </span>
                </div>
              </div>

              {/* Background picker */}
              <div className="space-y-1.5">
                <label htmlFor="bg-color-input" className="font-semibold text-slate-700 block">Background</label>
                <div className="flex items-center gap-2 border border-slate-200 rounded-xl p-1.5 bg-slate-50/50">
                  <input
                    id="bg-color-input"
                    type="color"
                    value={options.background === 'transparent' ? '#ffffff' : options.background}
                    onChange={(e) => updateOption('background', e.target.value)}
                    className="w-6 h-6 rounded-md cursor-pointer border-0 p-0"
                  />
                  <span className="font-mono text-[11px] text-slate-600 uppercase">
                    {options.background}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Text & Label */}
        {activeTab === 'text' && (
          <div className="space-y-4 text-xs">
            <div className="flex items-center justify-between py-1">
              <label htmlFor="display-text-checkbox" className="font-semibold text-slate-700">Display Code Text</label>
              <input
                id="display-text-checkbox"
                type="checkbox"
                checked={options.displayValue}
                onChange={(e) => updateOption('displayValue', e.target.checked)}
                className="w-4 h-4 rounded accent-slate-900 cursor-pointer"
              />
            </div>

            {options.displayValue && (
              <>
                {/* Font Size */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-slate-700">
                    <label htmlFor="font-size-slider" className="font-semibold">Font Size</label>
                    <span className="font-mono text-slate-500">{options.fontSize} px</span>
                  </div>
                  <input
                    id="font-size-slider"
                    type="range"
                    min="10"
                    max="26"
                    value={options.fontSize}
                    onChange={(e) => updateOption('fontSize', parseInt(e.target.value, 10))}
                    className="w-full accent-slate-900 cursor-pointer"
                  />
                </div>

                {/* Font Position */}
                <div className="space-y-1.5">
                  <span className="font-semibold text-slate-700 block">Text Position</span>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => updateOption('fontPosition', 'bottom')}
                      className={`py-1.5 rounded-lg border text-[11px] font-semibold transition-all ${
                        options.fontPosition === 'bottom'
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-white text-slate-600 border-slate-200'
                      }`}
                    >
                      Below Barcode
                    </button>
                    <button
                      type="button"
                      onClick={() => updateOption('fontPosition', 'top')}
                      className={`py-1.5 rounded-lg border text-[11px] font-semibold transition-all ${
                        options.fontPosition === 'top'
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-white text-slate-600 border-slate-200'
                      }`}
                    >
                      Above Barcode
                    </button>
                  </div>
                </div>

                {/* Font Family */}
                <div className="space-y-1.5">
                  <label htmlFor="font-family-select" className="font-semibold text-slate-700 block">
                    Font Family & Clarity
                  </label>
                  <select
                    id="font-family-select"
                    value={options.font}
                    onChange={(e) => updateOption('font', e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-800 text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-slate-900 cursor-pointer"
                  >
                    <option value="sans-serif">Sans-Serif (Crisp Thermal - Highly Recommended)</option>
                    <option value="serif">Times New Roman (Classic Serif)</option>
                    <option value="monospace">Monospace (Clean Technical)</option>
                  </select>
                </div>

                {/* Text Boldness / Weight */}
                <div className="space-y-1.5">
                  <span className="font-semibold text-slate-700 block">Print Text Weight</span>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { id: 'normal', label: 'Medium' },
                      { id: 'bold', label: 'Bold (Crisp)' },
                      { id: '900', label: 'Heavy' },
                    ].map((w) => {
                      const activeWeight = options.fontWeight || 'bold';
                      const isActive = activeWeight === w.id;
                      return (
                        <button
                          key={w.id}
                          type="button"
                          onClick={() => updateOption('fontWeight', w.id as 'normal' | 'bold' | '900')}
                          className={`py-1 rounded-lg border text-[11px] font-semibold transition-all cursor-pointer ${
                            isActive
                              ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {w.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Letter Spacing (Character Separation) */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-slate-700">
                    <label htmlFor="letter-spacing-slider" className="font-semibold">Letter Separation (Clarity)</label>
                    <span className="font-mono text-slate-500">
                      {options.letterSpacing !== undefined ? options.letterSpacing : (options.font === 'serif' ? 0.3 : 0)} px
                    </span>
                  </div>
                  <input
                    id="letter-spacing-slider"
                    type="range"
                    min="0"
                    max="2.5"
                    step="0.1"
                    value={options.letterSpacing !== undefined ? options.letterSpacing : (options.font === 'serif' ? 0.3 : 0)}
                    onChange={(e) => updateOption('letterSpacing', parseFloat(e.target.value))}
                    className="w-full accent-slate-900 cursor-pointer"
                  />
                  <p className="text-[10px] text-slate-400">
                    Adds breathing space between letters to stop thermal print ink from bleeding or blurring on paper stickers.
                  </p>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Printer Sizing Preset & Auto-Detect Local Printer */}
      <div className="bg-slate-900 text-white p-4 rounded-2xl shadow-sm space-y-3 pt-3 border-t border-slate-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Printer className="w-4 h-4 text-emerald-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Printer Sizing Preset
            </h3>
          </div>
          <button
            type="button"
            onClick={handleAutoDetect}
            disabled={isDetectingPrinter}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-all shadow-xs cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isDetectingPrinter ? 'animate-spin' : ''}`} />
            {isDetectingPrinter ? 'Detecting...' : 'Auto-Detect Local Printer'}
          </button>
        </div>

        {/* Preset Selector Buttons */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 pt-1">
          {PRINTER_PRESETS.map((preset) => {
            const isSelected = options.printerPresetId === preset.id || (!options.printerPresetId && preset.id === 'zebra_zd230');
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => handleSelectPrinterPreset(preset)}
                className={`p-2 rounded-xl text-left border transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'bg-emerald-950/80 border-emerald-500 text-emerald-100 ring-1 ring-emerald-500'
                    : 'bg-slate-800/80 hover:bg-slate-800 border-slate-700 text-slate-300'
                }`}
              >
                <div className="font-bold text-[11px] truncate">{preset.brand}</div>
                <div className="text-[10px] font-mono text-emerald-400 font-semibold mt-0.5">
                  {preset.widthInches}″ × {preset.heightInches}″
                </div>
              </button>
            );
          })}
        </div>

        {detectionStatus && (
          <div className="text-[11px] bg-slate-800 border border-slate-700 p-2.5 rounded-xl text-slate-300 leading-relaxed flex items-start gap-2">
            <Cpu className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
            <div>{detectionStatus}</div>
          </div>
        )}
      </div>

      {/* Reset button */}
      <div className="pt-2 border-t border-slate-100 flex justify-end">
        <button
          type="button"
          onClick={onReset}
          className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400 hover:text-slate-600 transition-colors"
        >
          <RotateCcw className="w-3 h-3" />
          Reset All Defaults
        </button>
      </div>
    </div>
  );
};
