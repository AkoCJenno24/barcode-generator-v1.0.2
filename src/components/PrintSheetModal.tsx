import React, { useState, useEffect } from 'react';
import JsBarcode from 'jsbarcode';
import { BarcodeOptions, CatalogItem } from '../types';
import { renderRetailLabelSvg, formatPriceWithSymbol, generateZebraZplCode } from '../utils/barcodeUtils';
import { Printer, X, LayoutGrid, Tag, DollarSign, Cpu, CheckCircle2, ExternalLink, Code2, Copy, Download, Sparkles, AlertTriangle } from 'lucide-react';

interface PrintSheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  options: BarcodeOptions;
  selectedItem?: CatalogItem | null;
}

export const PrintSheetModal: React.FC<PrintSheetModalProps> = ({
  isOpen,
  onClose,
  options,
  selectedItem,
}) => {
  const [quantity, setQuantity] = useState<number>(1);
  const [labelTitle, setLabelTitle] = useState<string>('');
  const [showPrice, setShowPrice] = useState<boolean>(true);
  const [price, setPrice] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'preview' | 'zpl'>('preview');
  const [copiedZpl, setCopiedZpl] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      setLabelTitle(selectedItem ? selectedItem.itemName : (options.itemName || 'Product Item'));
      setPrice(selectedItem ? formatPriceWithSymbol(selectedItem.price) : (options.price ? formatPriceWithSymbol(options.price) : 'SAR 5.00'));
      setShowPrice(true);
    }
  }, [isOpen, selectedItem, options]);

  useEffect(() => {
    if (!isOpen) return;

    // Render sample barcode in print previews
    const svgElements = document.querySelectorAll('.print-label-svg');
    svgElements.forEach((svg) => {
      try {
        while (svg.firstChild) {
          svg.removeChild(svg.firstChild);
        }
        if (options.labelMode === 'barcodeOnly') {
          JsBarcode(svg as SVGSVGElement, options.text.trim(), {
            format: options.format,
            lineColor: '#000000',
            background: 'transparent',
            width: Math.max(1, options.width * 0.85),
            height: Math.min(45, options.height * 0.7),
            displayValue: true,
            font: options.font,
            fontSize: 11,
            margin: 2,
          });
        } else {
          renderRetailLabelSvg(svg as SVGSVGElement, {
            ...options,
            itemCode: selectedItem ? selectedItem.itemCode : options.itemCode,
            itemName: labelTitle || options.itemName,
            price: showPrice ? price : '',
          });
        }
      } catch (e) {
        console.warn('Print preview barcode error:', e);
      }
    });
  }, [isOpen, quantity, labelTitle, showPrice, price, options, selectedItem]);

  const printerW = options.printerWidthInches || 2.0;
  const printerH = options.printerHeightInches || 1.0;
  const pageSizeCss = options.pageSizeCss || `${printerW}in ${printerH}in`;

  const zplCode = generateZebraZplCode({
    itemCode: selectedItem ? selectedItem.itemCode : options.itemCode,
    itemName: labelTitle || options.itemName,
    price: showPrice ? price : '',
    batch: selectedItem ? selectedItem.batchNumber : options.batchNumber,
    barcodeText: options.text,
    quantity,
    showBorder: options.showBorder,
    borderWidth: options.borderWidth,
    printerWidthInches: options.printerWidthInches,
    printerHeightInches: options.printerHeightInches,
    activeFrameWidthInches: options.activeFrameWidthInches,
    activeFrameHeightInches: options.activeFrameHeightInches,
  });

  const handleCopyZpl = () => {
    navigator.clipboard.writeText(zplCode);
    setCopiedZpl(true);
    setTimeout(() => setCopiedZpl(false), 2000);
  };

  const handleDownloadZpl = () => {
    const blob = new Blob([zplCode], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `label_${selectedItem ? selectedItem.itemCode : 'barcode'}.zpl`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handlePopupPrint = () => {
    const printableSheet = document.getElementById('printable-sheet');
    if (!printableSheet) {
      window.focus();
      window.print();
      return;
    }

    const popup = window.open('', '_blank', 'width=550,height=650,scrollbars=yes,resizable=yes');
    if (!popup) {
      window.focus();
      window.print();
      return;
    }

    popup.document.open();
    popup.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Thermal Label Print (${printerW}" × ${printerH}")</title>
          <style>
            @page {
              size: ${pageSizeCss};
              margin: 0;
            }
            * {
              box-sizing: border-box;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            html, body {
              margin: 0 !important;
              padding: 0 !important;
              width: ${printerW}in !important;
              height: ${printerH}in !important;
              background: #ffffff !important;
            }
            .zebra-label-item {
              width: ${printerW}in !important;
              height: ${printerH}in !important;
              box-sizing: border-box !important;
              page-break-after: always !important;
              break-after: page !important;
              margin: 0 !important;
              padding: 0 !important;
              border: none !important;
              box-shadow: none !important;
              overflow: hidden !important;
              display: flex !important;
              align-items: center !important;
              justify-content: center !important;
              background: #ffffff !important;
            }
            .zebra-label-item:last-child {
              page-break-after: avoid !important;
              break-after: avoid !important;
            }
            .zebra-label-item svg {
              width: ${printerW}in !important;
              height: ${printerH}in !important;
              display: block !important;
              shape-rendering: crispEdges !important;
              text-rendering: geometricPrecision !important;
            }
          </style>
        </head>
        <body>
          ${printableSheet.innerHTML}
          <script>
            window.onload = function() {
              window.addEventListener('afterprint', function() {
                window.close();
              });
              window.onafterprint = function() {
                window.close();
              };
              setTimeout(function() {
                window.focus();
                window.print();
              }, 150);
            };
          </script>
        </body>
      </html>
    `);
    popup.document.close();
  };

  const handlePrint = () => {
    // Attempt standard print first
    try {
      window.focus();
      window.print();
    } catch {
      handlePopupPrint();
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      {/* Dynamic Thermal Label Printer CSS */}
      <style>{`
        @media print {
          @page {
            size: ${pageSizeCss};
            margin: 0 !important;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            width: ${printerW}in !important;
            height: ${printerH}in !important;
            background: #ffffff !important;
            overflow: hidden !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body * {
            visibility: hidden !important;
          }
          #printable-sheet, #printable-sheet * {
            visibility: visible !important;
          }
          #printable-sheet {
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            width: ${printerW}in !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            border: none !important;
            box-shadow: none !important;
            z-index: 9999999 !important;
            transform: scale(1) !important;
            transform-origin: top left !important;
          }
          .zebra-label-item {
            width: ${printerW}in !important;
            height: ${printerH}in !important;
            box-sizing: border-box !important;
            page-break-after: always !important;
            break-after: page !important;
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
            box-shadow: none !important;
            overflow: hidden !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            background: #ffffff !important;
          }
          .zebra-label-item:last-child {
            page-break-after: avoid !important;
            break-after: avoid !important;
          }
          .zebra-label-item svg {
            width: ${printerW}in !important;
            height: ${printerH}in !important;
            display: block !important;
            shape-rendering: crispEdges !important;
            text-rendering: geometricPrecision !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div
        className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between no-print">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center">
              <Printer className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 leading-tight">
                  Print Label Dialog
                </h2>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full font-mono">
                  <Cpu className="w-3 h-3 text-emerald-600" /> Zebra ZD230 Profile (2" × 1")
                </span>
              </div>
              <p className="text-xs text-slate-500">
                1-Column single thermal label roll setup (2.00" Width × 1.00" Height)
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

        {/* Content body split into settings & sheet preview */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Controls column */}
          <div className="space-y-5 text-xs no-print border-b md:border-b-0 md:border-r border-slate-100 pb-5 md:pb-0 md:pr-6">
            <h3 className="font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <LayoutGrid className="w-3.5 h-3.5" />
              Page & Printer Setup
            </h3>

            {/* Page Column Mode */}
            <div className="space-y-1.5">
              <label htmlFor="sheet-columns-select" className="font-semibold text-slate-700 block">Page Layout</label>
              <select
                id="sheet-columns-select"
                disabled
                value={1}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-slate-900 bg-slate-100 font-bold focus:outline-hidden cursor-not-allowed"
              >
                <option value={1}>1 Column Page (2" × 1" Thermal Roll)</option>
              </select>
              <p className="text-[11px] text-slate-500 flex items-center gap-1 font-mono">
                <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                Locked to 1 Column for 2"×1" continuous roll
              </p>
            </div>

            {/* Print Quantity */}
            <div className="space-y-1.5">
              <label htmlFor="sheet-rows-select" className="font-semibold text-slate-700 block">Number of Labels to Print</label>
              <select
                id="sheet-rows-select"
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value, 10))}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-slate-900 bg-white font-semibold focus:ring-2 focus:ring-slate-900 cursor-pointer"
              >
                <option value={1}>1 Label</option>
                <option value={2}>2 Labels</option>
                <option value={5}>5 Labels</option>
                <option value={10}>10 Labels</option>
                <option value={20}>20 Labels</option>
                <option value={50}>50 Labels</option>
                <option value={100}>100 Labels</option>
              </select>
            </div>

            <div className="bg-emerald-50/70 p-3 rounded-xl border border-emerald-200/80 space-y-1">
              <div className="text-[11px] font-bold text-emerald-950 flex items-center gap-1">
                <Cpu className="w-3.5 h-3.5 text-emerald-700" /> Zebra ZD230 Thermal Ready
              </div>
              <p className="text-[10px] text-emerald-900 leading-snug">
                Formatted for Zebra ZD230 / Direct Thermal printers. Set printer margin to <strong>None</strong> and size to <strong>2.00 x 1.00 in</strong>.
              </p>
            </div>

            <h3 className="font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5 pt-3 border-t border-slate-100">
              <Tag className="w-3.5 h-3.5" />
              Label Content
            </h3>

            {/* Label Product Title */}
            <div className="space-y-1.5">
              <label htmlFor="label-title-input" className="font-semibold text-slate-700 block">Item / Product Name</label>
              <input
                id="label-title-input"
                type="text"
                value={labelTitle}
                onChange={(e) => setLabelTitle(e.target.value)}
                placeholder="e.g. Wireless Headphones"
                className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-slate-900 text-xs font-medium focus:ring-2 focus:ring-slate-900"
              />
            </div>

            {/* Show Price toggle & input */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label htmlFor="show-price-checkbox" className="font-semibold text-slate-700">Display Price Tag</label>
                <input
                  id="show-price-checkbox"
                  type="checkbox"
                  checked={showPrice}
                  onChange={(e) => setShowPrice(e.target.checked)}
                  className="rounded accent-slate-900 cursor-pointer"
                />
              </div>

              {showPrice && (
                <div className="relative">
                  <DollarSign className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="SAR 5.00"
                    className="w-full pl-7 pr-3 py-1.5 rounded-lg border border-slate-200 text-slate-900 text-xs font-medium"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Sheet Preview & ZPL Code Tabs */}
          <div className="md:col-span-2 flex flex-col bg-slate-100/70 rounded-xl p-4 border border-slate-200/80 overflow-y-auto max-h-[500px]">
            {/* Tab Navigation */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-3 no-print gap-2 flex-wrap">
              <div className="flex items-center gap-1 bg-slate-200/80 p-0.5 rounded-lg text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setActiveTab('preview')}
                  className={`px-3 py-1 rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
                    activeTab === 'preview'
                      ? 'bg-white text-slate-900 shadow-xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Printer className="w-3.5 h-3.5" /> Visual Preview
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('zpl')}
                  className={`px-3 py-1 rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
                    activeTab === 'zpl'
                      ? 'bg-white text-emerald-900 shadow-xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Code2 className="w-3.5 h-3.5 text-emerald-600" /> Direct ZPL Code (No Pixelation)
                </button>
              </div>

              <span className="font-mono text-xs font-semibold text-slate-500">
                {quantity} {quantity === 1 ? 'Label' : 'Labels'} ({printerW}" × {printerH}")
              </span>
            </div>

            {activeTab === 'preview' ? (
              <div className="space-y-3">
                {/* 1:1 Actual Size Printer Settings Guide Notice */}
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-950 space-y-1.5 no-print">
                  <div className="font-bold flex items-center justify-between text-blue-900">
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
                      Prevent Printer Dialog Resizing (3 Required Steps):
                    </span>
                    <span className="font-mono text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-bold">
                      Exact 1:1 Scale Guide
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                    <div className="bg-white/80 p-2 rounded-lg border border-blue-100">
                      <span className="font-bold text-slate-800 block text-[11px]">1. Scale</span>
                      <span className="text-[11px] text-blue-900 font-medium">Set to <strong>100%</strong> or <strong>Actual Size</strong> (Do NOT select "Fit to page" or "Fit to area").</span>
                    </div>
                    <div className="bg-white/80 p-2 rounded-lg border border-blue-100">
                      <span className="font-bold text-slate-800 block text-[11px]">2. Margins</span>
                      <span className="text-[11px] text-blue-900 font-medium">Set to <strong>None</strong> (0 mm). Browser default adds unwanted whitespace.</span>
                    </div>
                    <div className="bg-white/80 p-2 rounded-lg border border-blue-100">
                      <span className="font-bold text-slate-800 block text-[11px]">3. Headers & Footers</span>
                      <span className="text-[11px] text-blue-900 font-medium"><strong>Uncheck / Disable</strong> to prevent dates & URLs printing on label.</span>
                    </div>
                  </div>
                </div>

                {/* Printable Container */}
                <div
                  id="printable-sheet"
                  className="bg-slate-200/50 p-4 rounded-lg border border-slate-300 mx-auto w-full flex flex-col items-center gap-3"
                >
                  {Array.from({ length: quantity }).map((_, idx) => (
                    <div
                      key={idx}
                      className="zebra-label-item bg-white border border-slate-400 rounded-xs shadow-xs flex items-center justify-center p-1 w-[280px] h-[140px] shrink-0"
                    >
                      <svg className="print-label-svg w-full h-full" />
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              /* ZPL Code Section for Zebra ZD230 */
              <div className="space-y-3 text-xs">
                <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl text-amber-900 space-y-1">
                  <div className="font-bold flex items-center gap-1.5 text-amber-950">
                    <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
                    Why ZPL eliminates thermal pixelation:
                  </div>
                  <p className="text-[11px] leading-relaxed text-amber-900">
                    Browsers print graphic images by anti-aliasing pixels, which causes blurry, unreadable barcodes on 203 DPI thermal printheads. 
                    <strong>ZPL (Zebra Programming Language)</strong> commands the ZD230 printhead directly to draw crisp 1:1 hardware lines!
                  </p>
                </div>

                <div className="relative">
                  <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 z-10">
                    <button
                      type="button"
                      onClick={handleCopyZpl}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-mono transition-colors cursor-pointer"
                    >
                      <Copy className="w-3 h-3" />
                      {copiedZpl ? 'Copied!' : 'Copy ZPL'}
                    </button>
                    <button
                      type="button"
                      onClick={handleDownloadZpl}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-700 hover:bg-emerald-600 text-white text-[11px] font-mono transition-colors cursor-pointer"
                    >
                      <Download className="w-3 h-3" />
                      Download .zpl
                    </button>
                  </div>

                  <pre className="bg-slate-950 text-emerald-400 p-4 rounded-xl font-mono text-[11px] leading-relaxed overflow-x-auto border border-slate-800 max-h-[260px]">
                    {zplCode}
                  </pre>
                </div>

                <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl text-slate-700 text-[11px] space-y-1">
                  <span className="font-bold text-slate-900 block">How to send ZPL directly to Zebra ZD230:</span>
                  <ul className="list-disc list-inside space-y-1 text-slate-600">
                    <li><strong>Zebra Setup Utilities:</strong> Open Printer Properties -&gt; "Send File" -&gt; Select downloaded <code className="bg-slate-200 px-1 py-0.5 rounded text-slate-900 font-mono text-[10px]">.zpl</code> file.</li>
                    <li><strong>Windows Command Prompt / Spooler:</strong> <code className="bg-slate-200 px-1 py-0.5 rounded text-slate-900 font-mono text-[10px]">copy label.zpl \\localhost\ZebraZD230</code></li>
                    <li><strong>Zebra Browser Print API:</strong> Send ZPL string directly over local WebSocket port 9100 or 9101 for instant zero-dialog printing.</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-3 no-print">
          <div className="text-xs text-slate-500 font-medium">
            <span className="font-semibold text-slate-700">Zebra ZD230 Tip:</span> Set margins to "None" & paper size to 2" × 1" (Fitted inside 1.80" × 0.70").
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200/60 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handlePopupPrint}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-800 bg-slate-200 hover:bg-slate-300 border border-slate-300 transition-colors"
              title="Open a clean print window (bypasses iframe restrictions)"
            >
              <ExternalLink className="w-3.5 h-3.5 text-slate-600" />
              Popup Print
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 shadow-xs transition-colors"
            >
              <Printer className="w-4 h-4" />
              Print Label Roll
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
