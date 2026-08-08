import React, { useState, useRef, useEffect } from 'react';
import { Barcode, Printer, History, Package, Database, BarChart3, ChevronDown, FileText, Tag, FileSpreadsheet } from 'lucide-react';
import { ReportType } from './ReportsModal';

interface HeaderProps {
  onPrint: () => void;
  onOpenBatch?: () => void;
  onOpenHistory: () => void;
  onOpenCatalog: () => void;
  onOpenSupabase: () => void;
  onOpenReports: (reportType?: ReportType) => void;
  onDownloadAllItemsExcel: () => void;
  historyCount: number;
  catalogCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  onPrint,
  onOpenHistory,
  onOpenCatalog,
  onOpenSupabase,
  onOpenReports,
  onDownloadAllItemsExcel,
  historyCount,
  catalogCount,
}) => {
  const [isReportsMenuOpen, setIsReportsMenuOpen] = useState(false);
  const reportsMenuRef = useRef<HTMLDivElement>(null);

  // Close reports dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (reportsMenuRef.current && !reportsMenuRef.current.contains(event.target as Node)) {
        setIsReportsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-30 px-4 lg:px-8 py-3.5 shadow-xs">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Left branding */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-sm">
            <Barcode className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-slate-900 tracking-tight leading-none">
                Barcode Generator
              </h1>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold tracking-wide uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200/80">
                Studio
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5 hidden sm:block">
              v.1.1.0 by JhenX Dev
            </p>
          </div>
        </div>

        {/* Right header actions */}
        <div className="flex items-center gap-2">
          {/* Unified Reports Dropdown Button */}
          <div className="relative" ref={reportsMenuRef}>
            <button
              type="button"
              onClick={() => setIsReportsMenuOpen((prev) => !prev)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-indigo-950 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-colors focus:outline-hidden focus:ring-2 focus:ring-indigo-400 cursor-pointer shadow-2xs"
              title="Open Reports Menu"
            >
              <BarChart3 className="w-3.5 h-3.5 text-indigo-600" />
              <span>Reports</span>
              <ChevronDown className={`w-3.5 h-3.5 text-indigo-500 transition-transform ${isReportsMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {isReportsMenuOpen && (
              <div className="absolute right-0 mt-1.5 w-60 bg-white rounded-xl border border-slate-200 shadow-lg py-1.5 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                <div className="px-3 py-1.5 text-[10px] font-bold tracking-wider text-slate-400 uppercase border-b border-slate-100">
                  Select Report
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setIsReportsMenuOpen(false);
                    onDownloadAllItemsExcel();
                  }}
                  className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-900 flex items-center gap-2.5 transition-colors cursor-pointer"
                >
                  <div className="p-1 rounded bg-emerald-100 text-emerald-700">
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="font-bold text-slate-900">All Items Report</div>
                    <div className="text-[10px] text-slate-400 font-normal">Export full catalog to Excel (.xlsx)</div>
                  </div>
                </button>
                
                <button
                  type="button"
                  onClick={() => {
                    setIsReportsMenuOpen(false);
                    onOpenReports('new_enlisted');
                  }}
                  className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-indigo-50 hover:text-indigo-900 flex items-center gap-2.5 transition-colors cursor-pointer border-t border-slate-100"
                >
                  <div className="p-1 rounded bg-indigo-100 text-indigo-700">
                    <FileText className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="font-bold text-slate-900">New Enlisted Item Report</div>
                    <div className="text-[10px] text-slate-400 font-normal">Filter new items by creation date</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsReportsMenuOpen(false);
                    onOpenReports('price_update');
                  }}
                  className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-amber-50 hover:text-amber-900 flex items-center gap-2.5 transition-colors cursor-pointer border-t border-slate-100"
                >
                  <div className="p-1 rounded bg-amber-100 text-amber-700">
                    <Tag className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="font-bold text-slate-900">Price Update Report</div>
                    <div className="text-[10px] text-slate-400 font-normal">Track item price changes & MRP</div>
                  </div>
                </button>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={onOpenSupabase}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 transition-colors focus:outline-hidden focus:ring-2 focus:ring-emerald-500 cursor-pointer shadow-2xs"
            title="Supabase Cloud Database & CRUD Hub"
          >
            <Database className="w-3.5 h-3.5 text-emerald-600" />
            <span className="hidden sm:inline">Supabase Cloud</span>
            <span className="sm:hidden">Supabase</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          </button>

          <button
            type="button"
            onClick={onOpenCatalog}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200/80 border border-slate-200 transition-colors focus:outline-hidden focus:ring-2 focus:ring-slate-400"
            title="Manage saved item catalog & presets"
          >
            <Package className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">Item Catalog</span>
            <span className="sm:hidden">Items</span>
            {catalogCount > 0 && (
              <span className="ml-0.5 text-[10px] bg-slate-200 font-bold px-1.5 py-0.2 rounded-full text-slate-700">
                {catalogCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={onPrint}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 shadow-xs transition-colors focus:outline-hidden focus:ring-2 focus:ring-slate-900 cursor-pointer"
            title="Print barcode label via auto-closing popup window"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print</span>
          </button>

          <button
            type="button"
            onClick={onOpenHistory}
            className="relative inline-flex items-center justify-center w-8 h-8 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            title="Saved barcode history"
          >
            <History className="w-4 h-4" />
            {historyCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-slate-900 text-[10px] font-bold text-white">
                {historyCount > 9 ? '9+' : historyCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};

