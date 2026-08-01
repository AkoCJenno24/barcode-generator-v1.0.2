import React, { useState } from 'react';
import { BarcodeHistoryItem } from '../types';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';
import { History, X, Trash2, ArrowUpRight, Barcode } from 'lucide-react';

interface HistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  history: BarcodeHistoryItem[];
  onSelectHistoryItem: (item: BarcodeHistoryItem) => void;
  onClearHistory: () => void;
  onDeleteItem: (id: string) => void;
}

export const HistoryDrawer: React.FC<HistoryDrawerProps> = ({
  isOpen,
  onClose,
  history,
  onSelectHistoryItem,
  onClearHistory,
  onDeleteItem,
}) => {
  const [pendingDeleteItem, setPendingDeleteItem] = useState<BarcodeHistoryItem | null>(null);
  const [isConfirmingClearAll, setIsConfirmingClearAll] = useState(false);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex justify-end">
      <div className="bg-white w-full max-w-sm h-full shadow-2xl flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-slate-700" />
            <h2 className="text-sm font-bold text-slate-900">Saved History</h2>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
              {history.length}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {history.length === 0 ? (
            <div className="text-center py-12 px-4">
              <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-2 text-slate-400">
                <Barcode className="w-5 h-5" />
              </div>
              <p className="text-xs font-semibold text-slate-700">No saved barcodes yet</p>
              <p className="text-[11px] text-slate-400 mt-1">
                Barcodes you generate are automatically saved here for easy reload.
              </p>
            </div>
          ) : (
            history.map((item, idx) => (
              <div
                key={`${item.id}_${idx}`}
                className="group border border-slate-200/80 rounded-xl p-3 hover:border-slate-300 hover:shadow-xs transition-all bg-white relative flex flex-col gap-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                    {item.format}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {new Date(item.createdAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>

                <div className="font-mono text-xs font-bold text-slate-900 truncate">
                  {item.text}
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-slate-100 mt-1">
                  <button
                    type="button"
                    onClick={() => {
                      onSelectHistoryItem(item);
                      onClose();
                    }}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-900 hover:underline"
                  >
                    <span>Load into editor</span>
                    <ArrowUpRight className="w-3 h-3" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setPendingDeleteItem(item)}
                    className="text-slate-400 hover:text-red-600 transition-colors p-1 cursor-pointer"
                    title="Remove item"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {history.length > 0 && (
          <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
            <button
              type="button"
              onClick={() => setIsConfirmingClearAll(true)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-red-600 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear History
            </button>
          </div>
        )}
      </div>

      {/* Single Item Delete Confirmation */}
      <ConfirmDeleteModal
        isOpen={!!pendingDeleteItem}
        title="Delete History Item"
        message="Are you sure you want to delete this saved barcode entry from your history?"
        itemCode={pendingDeleteItem?.text}
        itemName={pendingDeleteItem?.options?.itemName || pendingDeleteItem?.title}
        locationLabel="History Item"
        onCancel={() => setPendingDeleteItem(null)}
        onConfirm={() => {
          if (pendingDeleteItem) {
            onDeleteItem(pendingDeleteItem.id);
            setPendingDeleteItem(null);
          }
        }}
      />

      {/* Clear All History Confirmation */}
      <ConfirmDeleteModal
        isOpen={isConfirmingClearAll}
        title="Clear All History"
        message={`Are you sure you want to permanently clear all ${history.length} saved history entries?`}
        locationLabel="All History Items"
        onCancel={() => setIsConfirmingClearAll(false)}
        onConfirm={() => {
          onClearHistory();
          setIsConfirmingClearAll(false);
        }}
      />
    </div>
  );
};
