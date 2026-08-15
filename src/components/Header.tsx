import React, { useState, useRef, useEffect } from 'react';
import { Barcode, Printer, Package, Database, BarChart3, ChevronDown, FileText, Tag, FileSpreadsheet, User, LogOut, KeyRound, ShieldCheck } from 'lucide-react';
import { ReportType } from './ReportsModal';
import { UserAccount } from '../lib/authService';

interface HeaderProps {
  onPrint: () => void;
  onOpenBatch?: () => void;
  onOpenHistory?: () => void;
  onOpenCatalog: () => void;
  onOpenSupabase: () => void;
  onOpenReports: (reportType?: ReportType) => void;
  onDownloadAllItemsExcel: () => void;
  historyCount?: number;
  catalogCount: number;
  currentUser?: UserAccount | null;
  onLogout?: () => void;
  onOpenChangePassword?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onPrint,
  onOpenCatalog,
  onOpenSupabase,
  onOpenReports,
  onDownloadAllItemsExcel,
  catalogCount,
  currentUser,
  onLogout,
  onOpenChangePassword,
}) => {
  const [isReportsMenuOpen, setIsReportsMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const reportsMenuRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (reportsMenuRef.current && !reportsMenuRef.current.contains(event.target as Node)) {
        setIsReportsMenuOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
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

          {/* User Profile & Account Dropdown */}
          {currentUser && (
            <div className="relative pl-2 border-l border-slate-200" ref={userMenuRef}>
              <button
                type="button"
                onClick={() => setIsUserMenuOpen((prev) => !prev)}
                className="inline-flex items-center gap-2 pl-1.5 pr-2.5 py-1 rounded-xl text-xs font-bold text-slate-800 bg-slate-50 hover:bg-slate-100 border border-slate-200/80 transition-all cursor-pointer shadow-2xs hover:shadow-xs group"
                title="Account menu & password settings"
              >
                {/* Default Avatar Circle */}
                <div className="relative flex items-center justify-center w-6 h-6 rounded-full bg-gradient-to-tr from-indigo-600 via-indigo-500 to-indigo-400 text-white text-[11px] font-extrabold uppercase shadow-2xs shrink-0 ring-1 ring-indigo-300/50">
                  {currentUser.username.charAt(0).toUpperCase()}
                  <span className="absolute bottom-0 right-0 w-2 h-2 bg-emerald-500 border border-white rounded-full" />
                </div>
                <span className="max-w-[90px] truncate text-slate-800 font-bold group-hover:text-indigo-600 transition-colors">
                  {currentUser.username}
                </span>
                <ChevronDown className={`w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 transition-transform ${isUserMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* User Menu Dropdown */}
              {isUserMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-2xl shadow-xl py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                  {/* Account Summary Header */}
                  <div className="px-3.5 py-2.5 border-b border-slate-100 flex items-center gap-2.5 bg-slate-50/50">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white font-bold flex items-center justify-center text-xs shrink-0 shadow-2xs">
                      {currentUser.username.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-900 truncate">
                        {currentUser.fullName || currentUser.username}
                      </p>
                      <p className="text-[10px] text-indigo-600 font-semibold uppercase tracking-wider flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3" /> {currentUser.role || 'Admin'}
                      </p>
                    </div>
                  </div>

                  {/* Menu Options */}
                  <div className="p-1 space-y-0.5">
                    <button
                      type="button"
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        if (onOpenChangePassword) onOpenChangePassword();
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:text-indigo-600 hover:bg-indigo-50/70 flex items-center gap-2.5 transition-colors cursor-pointer"
                    >
                      <KeyRound className="w-4 h-4 text-indigo-500 shrink-0" />
                      <span>Change Password</span>
                    </button>

                    {onLogout && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          onLogout();
                        }}
                        className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 flex items-center gap-2.5 transition-colors cursor-pointer"
                      >
                        <LogOut className="w-4 h-4 text-rose-500 shrink-0" />
                        <span>Log Out</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

