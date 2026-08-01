import React, { useState, useMemo, useEffect } from 'react';
import { CatalogItem } from '../types';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';
import {
  Package,
  X,
  Plus,
  Trash2,
  Edit2,
  Search,
  Check,
  Tag,
  Hash,
  DollarSign,
  Barcode,
  Ban,
  CheckCircle2,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';

interface CatalogModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: CatalogItem[];
  onAddItem: (item: Omit<CatalogItem, 'id' | 'createdAt'>) => void;
  onUpdateItem: (id: string, updated: Partial<CatalogItem>) => void;
  onDeleteItem: (id: string) => void;
  onSelectItem: (item: CatalogItem) => void;
  selectedItemId?: string;
}

export const CatalogModal: React.FC<CatalogModalProps> = ({
  isOpen,
  onClose,
  items,
  onAddItem,
  onUpdateItem,
  onDeleteItem,
  onSelectItem,
  selectedItemId,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pendingDeleteItem, setPendingDeleteItem] = useState<CatalogItem | null>(null);
  const [showDeactivateWarning, setShowDeactivateWarning] = useState(false);

  // Form states
  const [itemCode, setItemCode] = useState('');
  const [itemName, setItemName] = useState('');
  const [price, setPrice] = useState('');
  const [mrp, setMrp] = useState('');
  const [unitCost, setUnitCost] = useState('');
  const [isVatted, setIsVatted] = useState(false);
  const [isDeactivated, setIsDeactivated] = useState(false);
  const [category, setCategory] = useState('');
  const [afterDiscount, setAfterDiscount] = useState('');

  // Reset page when search or pageSize changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, pageSize]);

  // High performance memoized filtering for 20,000+ items
  const filteredItems = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return items;
    const tokens = q.split(/\s+/).filter(Boolean);
    if (tokens.length === 0) return items;

    return items.filter((item) => {
      const nameStr = String(item.itemName || '').toLowerCase();
      const codeStr = String(item.itemCode || '').toLowerCase();
      const catStr = String(item.category || '').toLowerCase();
      const priceStr = String(item.price || '').toLowerCase();

      return tokens.every(
        (token) =>
          nameStr.includes(token) ||
          codeStr.includes(token) ||
          catStr.includes(token) ||
          priceStr.includes(token)
      );
    });
  }, [items, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const paginatedItems = useMemo(() => {
    const start = (safeCurrentPage - 1) * pageSize;
    return filteredItems.slice(start, start + pageSize);
  }, [filteredItems, safeCurrentPage, pageSize]);

  if (!isOpen) return null;

  const calculateVatPrice = (mrpVal: string): string => {
    if (!mrpVal.trim()) return '';
    const match = mrpVal.match(/(\d+(?:\.\d+)?)/);
    if (!match) return mrpVal;
    const num = parseFloat(match[1]);
    if (isNaN(num)) return mrpVal;
    const vatted = (num * 1.15).toFixed(2);
    return mrpVal.replace(match[1], vatted);
  };

  const handleOpenAdd = () => {
    setItemCode('');
    setItemName('');
    const defaultMrp = '5.00 SAR';
    setMrp(defaultMrp);
    setUnitCost('');
    setIsVatted(false);
    setIsDeactivated(false);
    setPrice(defaultMrp);
    setCategory('General');
    setAfterDiscount('');
    setEditingId(null);
    setIsAdding(true);
  };

  const handleStartEdit = (item: CatalogItem) => {
    setItemCode(item.itemCode);
    setItemName(item.itemName);
    setPrice(item.price);
    setMrp(item.mrp || item.price);
    setUnitCost(item.unitCost || '');
    setIsVatted(item.isVatted ?? false);
    setIsDeactivated(Boolean(item.isDeactivated));
    setCategory(item.category || '');
    setAfterDiscount(item.afterDiscount || '');
    setEditingId(item.id);
    setIsAdding(true);
  };

  const handleMrpChange = (newMrp: string) => {
    setMrp(newMrp);
    if (isVatted) {
      setPrice(calculateVatPrice(newMrp));
    } else {
      setPrice(newMrp);
    }
  };

  const handleToggleVatted = (vatted: boolean) => {
    setIsVatted(vatted);
    if (vatted) {
      const calcPrice = calculateVatPrice(mrp || price);
      if (calcPrice) setPrice(calcPrice);
    } else {
      if (mrp) setPrice(mrp);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemCode.trim() || !itemName.trim()) return;

    const itemData = {
      itemCode: itemCode.trim(),
      itemName: itemName.trim(),
      price: price.trim() || '0 SAR',
      mrp: mrp.trim() || price.trim() || '0 SAR',
      unitCost: unitCost.trim(),
      isVatted,
      isDeactivated,
      category: category.trim() || 'General',
      afterDiscount: afterDiscount.trim(),
    };

    if (editingId) {
      onUpdateItem(editingId, itemData);
    } else {
      onAddItem(itemData);
    }

    setIsAdding(false);
    setEditingId(null);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden my-auto">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center">
              <Package className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 leading-tight">
                Saved Item Catalog
              </h2>
              <p className="text-xs text-slate-500">
                Manage your master inventory items, codes, and prices
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {isAdding ? (
            /* Form view */
            <form onSubmit={handleSave} className="bg-slate-50 border border-slate-200/80 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-900">
                    {editingId ? 'Edit Catalog Item' : 'Add New Item to Catalog'}
                  </h3>
                  {editingId && isDeactivated && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 border border-rose-200">
                      Deactivated
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="text-xs text-slate-500 hover:text-slate-800"
                >
                  Cancel
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="space-y-1.5">
                  <label htmlFor="modal-item-code" className="font-semibold text-slate-700 flex items-center gap-1">
                    <Hash className="w-3.5 h-3.5 text-slate-400" /> Item Code (SKU) *
                  </label>
                  <input
                    id="modal-item-code"
                    type="text"
                    required
                    value={itemCode}
                    onChange={(e) => setItemCode(e.target.value)}
                    placeholder="e.g. 11002546"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white font-mono text-slate-900 focus:ring-2 focus:ring-slate-900"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="modal-item-name" className="font-semibold text-slate-700 flex items-center gap-1">
                    <Tag className="w-3.5 h-3.5 text-slate-400" /> Item Name *
                  </label>
                  <input
                    id="modal-item-name"
                    type="text"
                    required
                    value={itemName}
                    onChange={(e) => setItemName(e.target.value)}
                    placeholder="e.g. Ball point pen"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-900 focus:ring-2 focus:ring-slate-900"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="modal-item-unit-cost" className="font-semibold text-slate-700 flex items-center gap-1">
                    <DollarSign className="w-3.5 h-3.5 text-slate-400" /> Unit Cost (Optional)
                  </label>
                  <input
                    id="modal-item-unit-cost"
                    type="text"
                    value={unitCost}
                    onChange={(e) => setUnitCost(e.target.value)}
                    placeholder="e.g. 3.50 SAR"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-900 font-medium focus:ring-2 focus:ring-slate-900"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="modal-item-mrp" className="font-semibold text-slate-700 flex items-center gap-1">
                    <DollarSign className="w-3.5 h-3.5 text-slate-400" /> MRP (Non-vatted)
                  </label>
                  <input
                    id="modal-item-mrp"
                    type="text"
                    value={mrp}
                    onChange={(e) => handleMrpChange(e.target.value)}
                    placeholder="e.g. 5.00 SAR"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-900 font-medium focus:ring-2 focus:ring-slate-900"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="modal-item-price" className="font-semibold text-slate-700 flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <DollarSign className="w-3.5 h-3.5 text-slate-400" /> Price
                    </span>
                    {isVatted && (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                        Includes 15% VAT
                      </span>
                    )}
                  </label>
                  <input
                    id="modal-item-price"
                    type="text"
                    value={price}
                    readOnly
                    placeholder="Calculated price"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-100 text-slate-700 font-medium cursor-default focus:outline-hidden"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-700 block">
                    (Is item vatted?)
                  </label>
                  <div className="flex items-center gap-2 p-1 bg-slate-200/70 rounded-lg">
                    <button
                      type="button"
                      onClick={() => handleToggleVatted(false)}
                      className={`flex-1 py-1.5 px-3 rounded-md text-xs font-bold transition-all ${
                        !isVatted
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      No
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleVatted(true)}
                      className={`flex-1 py-1.5 px-3 rounded-md text-xs font-bold transition-all ${
                        isVatted
                          ? 'bg-slate-900 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Yes (+15% VAT)
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="modal-item-category" className="font-semibold text-slate-700">
                    Category (Optional)
                  </label>
                  <input
                    id="modal-item-category"
                    type="text"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="e.g. Stationery"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-900 focus:ring-2 focus:ring-slate-900"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="modal-item-after-discount" className="font-semibold text-slate-700 flex items-center gap-1">
                    <DollarSign className="w-3.5 h-3.5 text-amber-500" /> After Discount (Optional)
                  </label>
                  <input
                    id="modal-item-after-discount"
                    type="text"
                    value={afterDiscount}
                    onChange={(e) => setAfterDiscount(e.target.value)}
                    placeholder="e.g. 250.00 SAR"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-900 font-medium focus:ring-2 focus:ring-slate-900"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200/80 flex items-center justify-between gap-3">
                {editingId ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (!isDeactivated) {
                        setShowDeactivateWarning(true);
                      } else {
                        setIsDeactivated(false);
                        onUpdateItem(editingId, { isDeactivated: false });
                      }
                    }}
                    className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      isDeactivated
                        ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                        : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                    }`}
                  >
                    {isDeactivated ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Reactivate Item</span>
                      </>
                    ) : (
                      <>
                        <Ban className="w-3.5 h-3.5 text-rose-600" />
                        <span>Deactivate Item</span>
                      </>
                    )}
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAdding(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200/60"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 shadow-xs"
                  >
                    {editingId ? 'Save Changes' : 'Create Item'}
                  </button>
                </div>
              </div>
            </form>
          ) : (
            <>
              {/* Search bar & Add button */}
              <div className="flex items-center justify-between gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search item code, name or category..."
                    className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-slate-900"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleOpenAdd}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 transition-colors shadow-xs shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Item</span>
                </button>
              </div>

              {/* Items List */}
              <div className="space-y-2 min-h-[220px]">
                {filteredItems.length === 0 ? (
                  <div className="text-center py-10 border border-dashed border-slate-200 rounded-xl">
                    <Package className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-xs font-medium text-slate-500">No items match your search.</p>
                  </div>
                ) : (
                  paginatedItems.map((item, idx) => {
                    const isSelected = selectedItemId === item.id;
                    return (
                      <div
                        key={`${item.id}_${idx}`}
                        className={`p-3.5 rounded-xl border transition-all flex items-center justify-between gap-4 ${
                          isSelected
                            ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                            : 'bg-white hover:border-slate-300 border-slate-200/80'
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-xs font-bold truncate ${
                                isSelected ? 'text-white' : 'text-slate-900'
                              }`}
                            >
                              {item.itemName}
                            </span>
                            {item.category && (
                              <span
                                className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                                  isSelected
                                    ? 'bg-slate-800 text-slate-300 border border-slate-700'
                                    : 'bg-slate-100 text-slate-600 border border-slate-200/80'
                                }`}
                              >
                                {item.category}
                              </span>
                            )}
                            {item.isDeactivated && (
                              <span
                                className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                                  isSelected
                                    ? 'bg-rose-900 text-rose-200 border border-rose-700'
                                    : 'bg-rose-50 text-rose-700 border border-rose-200'
                                }`}
                              >
                                Deactivated
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-[11px]">
                            <span
                              className={`font-mono font-medium ${
                                isSelected ? 'text-slate-300' : 'text-slate-500'
                              }`}
                            >
                              Code: <strong className="font-bold">{item.itemCode}</strong>
                            </span>
                            {item.mrp && (
                              <span
                                className={`font-mono ${
                                  isSelected ? 'text-slate-400' : 'text-slate-500'
                                }`}
                              >
                                MRP: <span className="font-semibold">{item.mrp}</span>
                              </span>
                            )}
                            <span
                              className={`font-semibold ${
                                isSelected ? 'text-emerald-300' : 'text-emerald-700'
                              }`}
                            >
                              Price: {item.price}
                            </span>
                            {item.isVatted && (
                              <span
                                className={`text-[10px] px-1.5 py-0.2 rounded font-bold uppercase ${
                                  isSelected
                                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                    : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                }`}
                              >
                                +15% VAT
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              onSelectItem(item);
                              onClose();
                            }}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all inline-flex items-center gap-1 ${
                              isSelected
                                ? 'bg-white text-slate-900 hover:bg-slate-100'
                                : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                            }`}
                          >
                            <Barcode className="w-3.5 h-3.5" />
                            <span>{isSelected ? 'Active' : 'Select'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleStartEdit(item)}
                            className={`p-1.5 rounded-lg transition-colors ${
                              isSelected
                                ? 'text-slate-300 hover:text-white hover:bg-slate-800'
                                : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
                            }`}
                            title="Edit Item"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => setPendingDeleteItem(item)}
                            className={`p-1.5 rounded-lg transition-colors ${
                              isSelected
                                ? 'text-rose-300 hover:text-rose-100 hover:bg-rose-950/40'
                                : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                            }`}
                            title="Delete Item"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Pagination Bar */}
              {filteredItems.length > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-200/80 text-xs">
                  <div className="flex items-center gap-2 text-slate-500 font-medium">
                    <span>
                      Showing{' '}
                      <strong className="text-slate-900">
                        {((safeCurrentPage - 1) * pageSize + 1).toLocaleString()}
                      </strong>{' '}
                      to{' '}
                      <strong className="text-slate-900">
                        {Math.min(safeCurrentPage * pageSize, filteredItems.length).toLocaleString()}
                      </strong>{' '}
                      of <strong className="text-slate-900">{filteredItems.length.toLocaleString()}</strong>
                    </span>
                    <select
                      value={pageSize}
                      onChange={(e) => setPageSize(Number(e.target.value))}
                      className="ml-2 px-2 py-1 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 focus:outline-hidden"
                    >
                      <option value={25}>25 / page</option>
                      <option value={50}>50 / page</option>
                      <option value={100}>100 / page</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={safeCurrentPage === 1}
                      onClick={() => setCurrentPage(1)}
                      className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                      title="First Page"
                    >
                      <ChevronsLeft className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={safeCurrentPage === 1}
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                      title="Previous Page"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>

                    <span className="px-2.5 py-1 font-bold text-slate-800 text-xs">
                      Page {safeCurrentPage} of {totalPages}
                    </span>

                    <button
                      type="button"
                      disabled={safeCurrentPage === totalPages}
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                      title="Next Page"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={safeCurrentPage === totalPages}
                      onClick={() => setCurrentPage(totalPages)}
                      className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                      title="Last Page"
                    >
                      <ChevronsRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <span className="text-xs text-slate-500 font-medium">
            Total items: <strong className="text-slate-900">{items.length}</strong>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200/60 transition-colors"
          >
            Close
          </button>
        </div>
      </div>

      {/* Delete Confirmation Warning Modal */}
      <ConfirmDeleteModal
        isOpen={!!pendingDeleteItem}
        title="Delete Catalog Item"
        message="Are you sure you want to delete this catalog item? It will be removed from your active database."
        itemName={pendingDeleteItem?.itemName}
        itemCode={pendingDeleteItem?.itemCode}
        locationLabel="Catalog Item"
        onCancel={() => setPendingDeleteItem(null)}
        onConfirm={() => {
          if (pendingDeleteItem) {
            onDeleteItem(pendingDeleteItem.id);
            setPendingDeleteItem(null);
          }
        }}
      />

      {/* Deactivate Confirmation Warning Modal */}
      {showDeactivateWarning && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-auto">
            {/* Header */}
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-amber-50/70">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 leading-tight">
                    Deactivate Catalog Item
                  </h3>
                  <span className="text-[10px] font-bold text-amber-800 bg-amber-100/80 px-1.5 py-0.2 rounded border border-amber-200">
                    Status Change
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowDeactivateWarning(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-3">
              <p className="text-xs text-slate-600 leading-relaxed">
                Are you sure you want to deactivate this item? It will be marked as inactive in your catalog database.
              </p>

              <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/80 text-xs space-y-1">
                {itemName && (
                  <div className="font-bold text-slate-900 truncate">
                    Item: <span className="font-semibold">{itemName}</span>
                  </div>
                )}
                {itemCode && (
                  <div className="font-mono text-slate-600">
                    Code / SKU: <span className="font-bold text-slate-800">{itemCode}</span>
                  </div>
                )}
              </div>

              <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-medium flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Warning: Deactivating will mark this item as inactive.</span>
              </div>
            </div>

            {/* Footer */}
            <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowDeactivateWarning(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsDeactivated(true);
                  if (editingId) {
                    onUpdateItem(editingId, { isDeactivated: true });
                  }
                  setShowDeactivateWarning(false);
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 transition-colors shadow-xs inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Ban className="w-3.5 h-3.5" />
                <span>Yes, Deactivate Item</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
