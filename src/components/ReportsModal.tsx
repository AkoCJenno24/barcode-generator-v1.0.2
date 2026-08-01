import React, { useState, useEffect, useMemo } from 'react';
import { CatalogItem, PriceUpdateItem } from '../types';
import {
  fetchCreatedItemsByDateRange,
  fetchPriceUpdatesByDateRange,
} from '../lib/supabaseService';
import {
  Calendar,
  Filter,
  Download,
  X,
  Package,
  Loader2,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Tag,
  TrendingUp,
  TrendingDown,
  BarChart3,
} from 'lucide-react';

export type ReportType = 'new_enlisted' | 'price_update';

interface ReportsModalProps {
  isOpen: boolean;
  onClose: () => void;
  catalogItems: CatalogItem[];
  defaultReportTab?: ReportType;
}

export const ReportsModal: React.FC<ReportsModalProps> = ({
  isOpen,
  onClose,
  catalogItems,
  defaultReportTab = 'new_enlisted',
}) => {
  const [activeTab, setActiveTab] = useState<ReportType>(defaultReportTab);

  // Today's YYYY-MM-DD
  const todayStr = useMemo(() => {
    const d = new Date();
    return d.toISOString().split('T')[0];
  }, []);

  // Filter dates state
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');

  // Data states
  const [enlistedItems, setEnlistedItems] = useState<CatalogItem[]>([]);
  const [priceUpdates, setPriceUpdates] = useState<PriceUpdateItem[]>([]);
  
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [hasSearched, setHasSearched] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Sync tab on opening
  useEffect(() => {
    if (isOpen) {
      const initialTab: ReportType = (defaultReportTab as ReportType) || 'new_enlisted';
      setActiveTab(initialTab);
      const defaultFrom = fromDate || todayStr;
      const defaultTo = toDate || todayStr;
      if (!fromDate) setFromDate(defaultFrom);
      if (!toDate) setToDate(defaultTo);

      handleExecuteFilter(initialTab, defaultFrom, defaultTo);
    }
  }, [isOpen, defaultReportTab]);

  const handleTabChange = (tab: ReportType) => {
    setActiveTab(tab);
    setErrorMsg(null);
    handleExecuteFilter(tab, fromDate || todayStr, toDate || todayStr);
  };

  const handleExecuteFilter = async (
    tabToRun: ReportType = activeTab,
    fromVal: string = fromDate,
    toVal: string = toDate
  ) => {
    setIsLoading(true);
    setErrorMsg(null);
    setHasSearched(true);

    try {
      if (tabToRun === 'new_enlisted') {
        const { data, error } = await fetchCreatedItemsByDateRange(fromVal, toVal);

        if (data && !error) {
          setEnlistedItems(data);
        } else {
          // Fallback to local filtering of catalogItems if Supabase table or query fails
          const fromTs = fromVal ? new Date(`${fromVal}T00:00:00.000`).getTime() : 0;
          const toTs = toVal ? new Date(`${toVal}T23:59:59.999`).getTime() : Infinity;

          const localFiltered = catalogItems.filter((item) => {
            const itemTime = item.createdAt || Date.now();
            return itemTime >= fromTs && itemTime <= toTs;
          });

          setEnlistedItems(localFiltered);
          if (error && !error.includes('unconfigured')) {
            setErrorMsg(`Note: Showing local catalog results (${error})`);
          }
        }
      } else if (tabToRun === 'price_update') {
        const { data, error } = await fetchPriceUpdatesByDateRange(fromVal, toVal);

        if (data && !error) {
          setPriceUpdates(data);
        } else {
          setPriceUpdates([]);
          if (error) {
            setErrorMsg(`Price Update Query: ${error}`);
          }
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMsg(`Error loading report: ${msg}`);
    } finally {
      setIsLoading(false);
    }
  };

  // CSV Export for New Enlisted Items
  const downloadEnlistedCsv = () => {
    if (enlistedItems.length === 0) return;

    const headers = ['Item Code', 'Item Name', 'Unit Cost', 'MRP', 'Vatted Status', 'Created At'];

    const escapeCsvField = (field: string | number | boolean | undefined | null): string => {
      const val = field === undefined || field === null ? '' : String(field);
      if (val.includes(',') || val.includes('"') || val.includes('\n')) {
        return `"${val.replace(/"/g, '""')}"`;
      }
      return val;
    };

    const rows = enlistedItems.map((item) => {
      const vattedStatus = item.isVatted ? 'Vatted (+15%)' : 'Non-vatted';
      const createdDateStr = item.createdAt
        ? new Date(item.createdAt).toLocaleString()
        : '';
      const unitCostStr = item.unitCost ? item.unitCost : '';
      const mrpStr = item.mrp ? item.mrp : item.price;

      return [
        escapeCsvField(item.itemCode),
        escapeCsvField(item.itemName),
        escapeCsvField(unitCostStr),
        escapeCsvField(mrpStr),
        escapeCsvField(vattedStatus),
        escapeCsvField(createdDateStr),
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    
    const fFrom = fromDate || 'all';
    const fTo = toDate || 'all';
    link.download = `new_enlisted_items_${fFrom}_to_${fTo}.csv`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // CSV Export for Price Updates
  const downloadPriceUpdateCsv = () => {
    if (priceUpdates.length === 0) return;

    const headers = ['Item Code', 'Item Name', 'Old Unit Cost', 'New Unit Cost', 'Old MRP', 'New MRP', 'Updated At'];

    const escapeCsvField = (field: string | number | boolean | undefined | null): string => {
      const val = field === undefined || field === null ? '' : String(field);
      if (val.includes(',') || val.includes('"') || val.includes('\n')) {
        return `"${val.replace(/"/g, '""')}"`;
      }
      return val;
    };

    const rows = priceUpdates.map((item) => {
      const updatedDateStr = item.createdAt
        ? new Date(item.createdAt).toLocaleString()
        : '';

      return [
        escapeCsvField(item.itemCode),
        escapeCsvField(item.itemName),
        escapeCsvField(item.oldUnitCost || ''),
        escapeCsvField(item.newUnitCost || ''),
        escapeCsvField(item.oldMrp),
        escapeCsvField(item.newMrp),
        escapeCsvField(updatedDateStr),
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    
    const fFrom = fromDate || 'all';
    const fTo = toDate || 'all';
    link.download = `price_update_report_${fFrom}_to_${fTo}.csv`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  const currentResultCount = activeTab === 'new_enlisted' ? enlistedItems.length : priceUpdates.length;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden my-auto">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-xs">
              <BarChart3 className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 leading-tight">
                Reports Center
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Filter and download catalog and price modification reports
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Report Navigation Tabs */}
        <div className="px-6 pt-2 border-b border-slate-200 bg-slate-50 flex items-center gap-2 overflow-x-auto shrink-0">
          <button
            type="button"
            onClick={() => handleTabChange('new_enlisted')}
            className={`inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-colors cursor-pointer whitespace-nowrap -mb-px ${
              activeTab === 'new_enlisted'
                ? 'border-indigo-600 text-indigo-900 bg-white rounded-t-lg shadow-2xs'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/60 rounded-t-lg'
            }`}
          >
            <Package className="w-4 h-4 text-indigo-600" />
            <span>New Enlisted Item Report</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('price_update')}
            className={`inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-colors cursor-pointer whitespace-nowrap -mb-px ${
              activeTab === 'price_update'
                ? 'border-amber-500 text-amber-900 bg-white rounded-t-lg shadow-2xs'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/60 rounded-t-lg'
            }`}
          >
            <Tag className="w-4 h-4 text-amber-600" />
            <span>Price Update Report</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* Filter Controls Bar */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 shadow-2xs space-y-3">
            <div className="flex flex-wrap items-end gap-3">
              {/* From Date */}
              <div className="flex-1 min-w-[150px] space-y-1">
                <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" /> From Date
                </label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-900 focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
                />
              </div>

              {/* To Date */}
              <div className="flex-1 min-w-[150px] space-y-1">
                <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" /> To Date
                </label>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-900 focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
                />
              </div>

              {/* Filter Trigger Button */}
              <button
                type="button"
                onClick={() => handleExecuteFilter(activeTab, fromDate, toDate)}
                disabled={isLoading}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50 transition-colors cursor-pointer shadow-xs"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Filter className="w-4 h-4" />
                )}
                <span>{isLoading ? 'Filtering...' : 'Filter Results'}</span>
              </button>

              {/* Download CSV Button */}
              <button
                type="button"
                onClick={activeTab === 'new_enlisted' ? downloadEnlistedCsv : downloadPriceUpdateCsv}
                disabled={currentResultCount === 0}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 border border-emerald-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer shadow-2xs"
                title="Download filter results as CSV"
              >
                <Download className="w-4 h-4 text-emerald-700" />
                <span>Download Result</span>
              </button>
            </div>

            {errorMsg && (
              <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 p-2.5 rounded-lg">
                <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
                <span>{errorMsg}</span>
              </div>
            )}
          </div>

          {/* Results Table Section */}
          <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-slate-500" />
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                  {activeTab === 'new_enlisted' ? 'New Enlisted Items' : 'Price Updates'}
                </h3>
              </div>
              <span className="text-xs font-semibold text-slate-500">
                Found <strong className="text-slate-900">{currentResultCount}</strong> record{currentResultCount === 1 ? '' : 's'}
              </span>
            </div>

            {isLoading ? (
              <div className="p-12 text-center text-slate-500 space-y-2">
                <Loader2 className="w-8 h-8 animate-spin mx-auto text-slate-400" />
                <p className="text-xs font-medium">Fetching report data from database...</p>
              </div>
            ) : activeTab === 'new_enlisted' ? (
              /* TAB 1: New Enlisted Item Report Table */
              enlistedItems.length === 0 ? (
                <div className="p-12 text-center space-y-2">
                  <Package className="w-10 h-10 text-slate-300 mx-auto" />
                  <h4 className="text-sm font-bold text-slate-700">No Enlisted Items Found</h4>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    {hasSearched
                      ? `No catalog items were created between ${fromDate || 'start'} and ${toDate || 'today'}.`
                      : 'Select a date range above and click "Filter Results".'}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-700 border-collapse">
                    <thead>
                      <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-700 font-bold uppercase text-[11px] tracking-wider">
                        <th className="px-4 py-3">Item Code</th>
                        <th className="px-4 py-3">Item Name</th>
                        <th className="px-4 py-3">Unit Cost</th>
                        <th className="px-4 py-3">MRP</th>
                        <th className="px-4 py-3">Vatted Status</th>
                        <th className="px-4 py-3 text-right">Created At</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {enlistedItems.map((item, idx) => (
                        <tr
                          key={`${item.id}_${idx}`}
                          className="hover:bg-slate-50/80 transition-colors"
                        >
                          <td className="px-4 py-3 font-mono font-bold text-slate-900">
                            {item.itemCode}
                          </td>
                          <td className="px-4 py-3 font-semibold text-slate-800 max-w-[200px] truncate">
                            {item.itemName}
                          </td>
                          <td className="px-4 py-3 font-mono text-slate-600">
                            {item.unitCost ? (
                              <span className="font-semibold text-slate-900">{item.unitCost}</span>
                            ) : (
                              <span className="text-slate-400 italic">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 font-mono font-semibold text-slate-900">
                            {item.mrp || item.price}
                          </td>
                          <td className="px-4 py-3">
                            {item.isVatted ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Vatted (+15%)
                              </span>
                            ) : (
                              <span className="inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                                Non-Vatted
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-[11px] text-slate-500 whitespace-nowrap">
                            {item.createdAt
                              ? new Date(item.createdAt).toLocaleDateString(undefined, {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })
                              : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            ) : (
              /* TAB 2: Price Update Report Table */
              priceUpdates.length === 0 ? (
                <div className="p-12 text-center space-y-2">
                  <Tag className="w-10 h-10 text-slate-300 mx-auto" />
                  <h4 className="text-sm font-bold text-slate-700">No Price Updates Found</h4>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    {hasSearched
                      ? `No price modifications were recorded in the price_update table between ${fromDate || 'start'} and ${toDate || 'today'}.`
                      : 'Select a date range above and click "Filter Results".'}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-700 border-collapse">
                    <thead>
                      <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-700 font-bold uppercase text-[11px] tracking-wider">
                        <th className="px-4 py-3">Item Code</th>
                        <th className="px-4 py-3">Item Name</th>
                        <th className="px-4 py-3">Old Unit Cost</th>
                        <th className="px-4 py-3">New Unit Cost</th>
                        <th className="px-4 py-3">Old MRP</th>
                        <th className="px-4 py-3">New MRP</th>
                        <th className="px-4 py-3 text-right">Updated At</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {priceUpdates.map((item, idx) => (
                        <tr
                          key={`${item.id || idx}_${idx}`}
                          className="hover:bg-slate-50/80 transition-colors"
                        >
                          <td className="px-4 py-3 font-mono font-bold text-slate-900">
                            {item.itemCode}
                          </td>
                          <td className="px-4 py-3 font-semibold text-slate-800 max-w-[200px] truncate">
                            {item.itemName}
                          </td>
                          <td className="px-4 py-3 font-mono text-slate-500">
                            {item.oldUnitCost ? (
                              <span className="line-through">{item.oldUnitCost}</span>
                            ) : (
                              <span className="text-slate-400 italic">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 font-mono text-slate-800 font-semibold">
                            {item.newUnitCost ? (
                              <span>{item.newUnitCost}</span>
                            ) : (
                              <span className="text-slate-400 italic">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 font-mono text-slate-500 line-through">
                            {item.oldMrp}
                          </td>
                          <td className="px-4 py-3 font-mono font-bold text-emerald-700">
                            {item.newMrp}
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-[11px] text-slate-500 whitespace-nowrap">
                            {item.createdAt
                              ? new Date(item.createdAt).toLocaleDateString(undefined, {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })
                              : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <div className="text-xs text-slate-500 font-medium flex items-center gap-2">
            <span>Result Count: <strong className="text-slate-900">{currentResultCount}</strong> records</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={activeTab === 'new_enlisted' ? downloadEnlistedCsv : downloadPriceUpdateCsv}
              disabled={currentResultCount === 0}
              className="px-4 py-2 rounded-xl text-xs font-bold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 border border-emerald-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer shadow-2xs"
            >
              Download CSV
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200/60 transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
