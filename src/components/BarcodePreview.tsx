import React, { useEffect, useRef, useState } from 'react';
import JsBarcode from 'jsbarcode';
import { BarcodeOptions } from '../types';
import {
  downloadSvgAsFile,
  svgToPngDataUrl,
  copyBarcodeImageToClipboard,
  validateBarcodeValue,
  renderRetailLabelSvg,
} from '../utils/barcodeUtils';
import {
  Download,
  Copy,
  Printer,
  Check,
  AlertCircle,
  FileCode,
  Image as ImageIcon,
  Maximize2,
  RefreshCw,
  Sparkles,
  Move,
  Edit2,
  Sliders,
  Plus,
  Minus,
  Type,
  Square,
  ArrowUpDown,
} from 'lucide-react';

interface BarcodePreviewProps {
  options: BarcodeOptions;
  onChangeOptions?: (newOptions: BarcodeOptions) => void;
  onQuickPrint: () => void;
  onSaveToHistory?: () => void;
}

export const BarcodePreview: React.FC<BarcodePreviewProps> = ({
  options,
  onChangeOptions,
  onQuickPrint,
  onSaveToHistory,
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const labelContainerRef = useRef<HTMLDivElement | null>(null);

  const [renderError, setRenderError] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [copiedValue, setCopiedValue] = useState(false);
  const [dimensions, setDimensions] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const [isExporting, setIsExporting] = useState(false);

  // Interactive On-Canvas Drag-to-Resize State
  const [isDragging, setIsDragging] = useState<false | 'right' | 'bottom' | 'corner' | 'border' | 'font' | 'gap' | 'borderTextGap'>(false);
  const [activeResizerTab, setActiveResizerTab] = useState<'all' | 'barcode' | 'gap' | 'borderGap' | 'text' | 'border' | 'frame'>('all');
  const [dragStart, setDragStart] = useState<{
    x: number;
    y: number;
    height: number;
    barWidth: number;
    borderWidth: number;
    fontSize: number;
    barcodePriceGap: number;
    borderTextGap: number;
  }>({
    x: 0,
    y: 0,
    height: 50,
    barWidth: 2,
    borderWidth: 7,
    fontSize: 18,
    barcodePriceGap: 25,
    borderTextGap: 6,
  });

  // Inline Editing Overlay Toggle
  const [isEditingInline, setIsEditingInline] = useState(false);

  // Validate and render barcode whenever options change
  useEffect(() => {
    const svgElement = svgRef.current;
    if (!svgElement) return;

    const textToValidate = options.text.trim();
    const valResult = validateBarcodeValue(options.format, textToValidate);
    if (!valResult.isValid) {
      setRenderError(valResult.message || 'Invalid value for selected barcode format');
      return;
    }

    try {
      while (svgElement.firstChild) {
        svgElement.removeChild(svgElement.firstChild);
      }

      if (options.labelMode === 'barcodeOnly') {
        const txt = options.text.trim();
        const fmt = (options.format === 'CODE39' && (txt.includes('.') || txt.length > 10)) ? 'CODE128' : options.format;
        const w = options.width;

        JsBarcode(svgElement, txt, {
          format: fmt,
          lineColor: options.lineColor,
          background: options.background === 'transparent' ? '' : options.background,
          width: w,
          height: options.height,
          displayValue: options.displayValue,
          font: options.font,
          fontSize: options.fontSize,
          fontOptions: 'bold',
          textPosition: options.fontPosition,
          textAlign: options.textAlign,
          textMargin: options.textMargin,
          margin: options.margin,
          flat: options.flat,
          narrowWideRatio: fmt === 'CODE39' ? 2.2 : (options.narrowWideRatio || 3),
          valid: (valid: boolean) => {
            if (!valid) {
              setRenderError(`Value "${options.text}" is not valid for ${options.format} format.`);
            } else {
              setRenderError(null);
            }
          },
        } as any);
      } else {
        renderRetailLabelSvg(svgElement, options);
      }

      setRenderError(null);

      // Read dimensions
      setTimeout(() => {
        if (svgElement) {
          const bbox = svgElement.getBBox();
          setDimensions({
            width: Math.round(svgElement.clientWidth || bbox.width || 0),
            height: Math.round(svgElement.clientHeight || bbox.height || 0),
          });
        }
      }, 50);
    } catch (err: any) {
      console.warn('JsBarcode render error:', err);
      setRenderError(err?.message || 'Could not render barcode with these parameters.');
    }
  }, [options]);

  // Drag-to-resize handlers on canvas handles
  const handlePointerDown = (
    e: React.PointerEvent,
    dragType: 'right' | 'bottom' | 'corner' | 'border' | 'font' | 'gap' | 'borderTextGap'
  ) => {
    if (!onChangeOptions) return;
    e.preventDefault();
    e.stopPropagation();

    (e.target as HTMLElement).setPointerCapture(e.pointerId);

    const baseFontSize = options.fontSize || 18;
    const defaultGap = 25;

    setIsDragging(dragType);
    setDragStart({
      x: e.clientX,
      y: e.clientY,
      height: options.height || 50,
      barWidth: options.width || 1.9,
      borderWidth: options.borderWidth !== undefined ? options.borderWidth : 7,
      fontSize: baseFontSize,
      barcodePriceGap: options.barcodePriceGap !== undefined ? options.barcodePriceGap : defaultGap,
      borderTextGap: options.borderTextGap !== undefined ? options.borderTextGap : 6,
    });
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || !onChangeOptions) return;
    e.preventDefault();

    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;

    if (isDragging === 'bottom' || isDragging === 'corner') {
      const newHeight = Math.max(20, Math.min(100, Math.round(dragStart.height + dy / 2)));
      onChangeOptions({
        ...options,
        height: newHeight,
      });
    }

    if (isDragging === 'right' || isDragging === 'corner') {
      const newBarWidth = Math.max(1, Math.min(4, parseFloat((dragStart.barWidth + dx / 60).toFixed(1))));
      onChangeOptions({
        ...options,
        width: newBarWidth,
      });
    }

    if (isDragging === 'border') {
      const newBw = Math.max(0, Math.min(20, Math.round(dragStart.borderWidth + (dx + dy) / 10)));
      onChangeOptions({
        ...options,
        showBorder: newBw > 0,
        borderWidth: newBw,
      });
    }

    if (isDragging === 'font') {
      const newFontSize = Math.max(10, Math.min(32, Math.round(dragStart.fontSize + (dx + dy) / 8)));
      onChangeOptions({
        ...options,
        fontSize: newFontSize,
      });
    }

    if (isDragging === 'gap') {
      const newGap = Math.max(0, Math.min(40, Math.round(dragStart.barcodePriceGap + dy / 2)));
      onChangeOptions({
        ...options,
        barcodePriceGap: newGap,
      });
    }

    if (isDragging === 'borderTextGap') {
      const newGap = Math.max(0, Math.min(24, Math.round(dragStart.borderTextGap + (dx + dy) / 10)));
      onChangeOptions({
        ...options,
        borderTextGap: newGap,
      });
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (isDragging) {
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch (err) {
        // Ignore
      }
      setIsDragging(false);
    }
  };

  // Download SVG vector
  const handleDownloadSvg = () => {
    if (!svgRef.current || renderError) return;
    const cleanName = `${options.format.toLowerCase()}_${options.text.replace(/[^a-z0-9]/gi, '_')}.svg`;
    downloadSvgAsFile(svgRef.current, cleanName);
  };

  // Download high-res PNG image
  const handleDownloadPng = async () => {
    if (!svgRef.current || renderError) return;
    setIsExporting(true);
    try {
      const dataUrl = await svgToPngDataUrl(svgRef.current, 3, options.background);
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `${options.format.toLowerCase()}_${options.text.replace(/[^a-z0-9]/gi, '_')}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Failed PNG download:', err);
    } finally {
      setIsExporting(false);
    }
  };

  // Copy image to clipboard
  const handleCopyImage = async () => {
    if (!svgRef.current || renderError) return;
    try {
      await copyBarcodeImageToClipboard(svgRef.current, options.background);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Clipboard copy failed:', err);
    }
  };

  // Copy raw text value
  const handleCopyValue = () => {
    navigator.clipboard.writeText(options.text);
    setCopiedValue(true);
    setTimeout(() => setCopiedValue(false), 2000);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-4 sm:p-5 flex flex-col">
      {/* Top Card Info Bar */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3 gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Interactive Live Preview
          </span>
          {!renderError ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              Valid {options.format}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
              <AlertCircle className="w-3 h-3 text-amber-600" />
              Format Issue
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {onChangeOptions && (
            <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200/90 text-[11px]">
              <span className="text-[10px] font-bold text-slate-500 uppercase px-1.5 hidden sm:inline-block">
                Border Gap:
              </span>
              {[
                { label: '0px', val: 0 },
                { label: '6px', val: 6 },
                { label: '12px', val: 12 },
              ].map((preset) => (
                <button
                  key={preset.val}
                  type="button"
                  onClick={() => onChangeOptions({ ...options, borderTextGap: preset.val })}
                  title={`Set border to text gap to ${preset.val}px`}
                  className={`px-2 py-0.5 rounded font-bold transition-all cursor-pointer ${
                    (options.borderTextGap ?? 6) === preset.val
                      ? 'bg-slate-900 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          )}

          {onChangeOptions && (
            <button
              type="button"
              onClick={() => setIsEditingInline(!isEditingInline)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                isEditingInline
                  ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200/80 border-slate-200'
              }`}
            >
              <Edit2 className="w-3 h-3" />
              <span>{isEditingInline ? 'Done Editing' : 'Quick Edit Fields'}</span>
            </button>
          )}

          {dimensions.width > 0 && !renderError && (
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-mono font-bold text-slate-700 bg-emerald-50 border border-emerald-200 text-emerald-800 px-2 py-0.5 rounded-md flex items-center gap-1 shadow-2xs">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Zebra ZD230 203 DPI Crisp Text
              </span>
              <span className="text-xs font-mono text-slate-500 font-semibold bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md hidden md:inline-block">
                {(options.activeFrameWidthInches || 1.80).toFixed(2)}″ × {(options.activeFrameHeightInches || 0.70).toFixed(2)}″ Frame
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Main Canvas Display Area - Dynamic Resizable Thermal Label Stage */}
      <div className="flex-1 min-h-[230px] sm:min-h-[280px] flex items-center justify-center bg-slate-900/95 border border-slate-800 rounded-xl p-4 sm:p-6 relative overflow-hidden group">
        {/* Subtle grid pattern background representing printer stage */}
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none"></div>

        {renderError ? (
          <div className="text-center max-w-sm p-4 bg-white rounded-xl shadow-md border border-amber-200 text-amber-900 relative z-10">
            <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-2 text-amber-600">
              <AlertCircle className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-bold text-slate-900 mb-1">Cannot Render Barcode</h3>
            <p className="text-[11px] text-amber-800 font-medium mb-2">{renderError}</p>
            <p className="text-[10px] text-slate-500">
              Try adjusting the input text or format in the controls panel.
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center w-full max-w-[460px] relative z-10 my-auto">
            {/* 2" x 1" Die-Cut Thermal Label Sticker Container with Live Drag Handles */}
            <div
              ref={labelContainerRef}
              className={`w-full rounded-lg shadow-2xl border border-slate-200 relative overflow-hidden transition-all duration-150 flex items-center justify-center p-2 sm:p-3 select-none ${
                isDragging ? 'ring-2 ring-emerald-400 ring-offset-2 ring-offset-slate-900' : ''
              }`}
              style={{
                aspectRatio: `${options.printerWidthInches || 2.0} / ${options.printerHeightInches || 1.0}`,
                backgroundColor: options.background === 'transparent' ? '#ffffff' : options.background,
              }}
            >
              {/* Thermal Label Die-Cut Perforated Notch Indicators */}
              <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-3 h-3 bg-slate-900 rounded-full border border-slate-800 pointer-events-none"></div>
              <div className="absolute -right-2 top-1/2 -translate-y-1/2 w-3 h-3 bg-slate-900 rounded-full border border-slate-800 pointer-events-none"></div>

              {/* Real SVG Render */}
              <svg
                ref={svgRef}
                className="w-full h-full block mx-auto object-contain pointer-events-none"
                style={{
                  width: '100%',
                  height: '100%',
                  textRendering: 'geometricPrecision',
                  shapeRendering: 'crispEdges',
                  imageRendering: 'crisp-edges',
                }}
              ></svg>

              {/* INTERACTIVE DRAG-TO-RESIZE HANDLES FOR ALL LIVE PREVIEW COMPONENTS */}
              {onChangeOptions && (
                <>
                  {/* Top-Left Drag Handle (Border Frame Width) */}
                  <div
                    onPointerDown={(e) => handlePointerDown(e, 'border')}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    title="Drag to resize border frame thickness"
                    className="absolute top-0 left-0 w-6 h-6 bg-slate-800/80 hover:bg-slate-700 text-amber-400 rounded-br-lg cursor-nwse-resize transition-all opacity-0 group-hover:opacity-100 flex items-center justify-center shadow-md z-20 border-r border-b border-slate-600"
                  >
                    <Square className="w-3 h-3" />
                  </div>

                  {/* Top-Right Drag Handle (Text Font Size) */}
                  <div
                    onPointerDown={(e) => handlePointerDown(e, 'font')}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    title="Drag to resize text font size"
                    className="absolute top-0 right-0 w-6 h-6 bg-slate-800/80 hover:bg-slate-700 text-sky-400 rounded-bl-lg cursor-nesw-resize transition-all opacity-0 group-hover:opacity-100 flex items-center justify-center shadow-md z-20 border-l border-b border-slate-600"
                  >
                    <Type className="w-3 h-3" />
                  </div>

                  {/* Top-Center Drag Handle (Border-Text Gap) */}
                  <div
                    onPointerDown={(e) => handlePointerDown(e, 'borderTextGap')}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    title="Drag to adjust gap between border and inside text"
                    className="absolute top-0 left-1/2 -translate-x-1/2 h-3 hover:h-4 w-12 bg-indigo-500/30 hover:bg-indigo-500/80 text-white rounded-b-md cursor-ns-resize transition-all opacity-0 group-hover:opacity-100 flex items-center justify-center shadow-xs z-20 border-b border-x border-indigo-400/50"
                  >
                    <div className="h-0.5 w-5 bg-white/90 rounded-full"></div>
                  </div>

                  {/* Bottom-Left Drag Handle (Barcode ↔ Price Gap Spacing) */}
                  <div
                    onPointerDown={(e) => handlePointerDown(e, 'gap')}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    title="Drag up/down to adjust spacing gap between barcode and price"
                    className="absolute bottom-0 left-0 w-6 h-6 bg-slate-800/80 hover:bg-slate-700 text-purple-400 rounded-tr-lg cursor-ns-resize transition-all opacity-0 group-hover:opacity-100 flex items-center justify-center shadow-md z-20 border-r border-t border-slate-600"
                  >
                    <ArrowUpDown className="w-3 h-3" />
                  </div>

                  {/* Right Edge Drag Handle (Thickness / Bar Width) */}
                  <div
                    onPointerDown={(e) => handlePointerDown(e, 'right')}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    title="Drag left/right to resize barcode bar width"
                    className="absolute right-0 top-6 bottom-6 w-3 hover:w-4 bg-emerald-500/20 hover:bg-emerald-500/60 cursor-ew-resize transition-all opacity-0 group-hover:opacity-100 flex items-center justify-center"
                  >
                    <div className="w-1 h-6 bg-white/90 rounded-full shadow-xs"></div>
                  </div>

                  {/* Bottom Edge Drag Handle (Barcode Bar Height) */}
                  <div
                    onPointerDown={(e) => handlePointerDown(e, 'bottom')}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    title="Drag up/down to resize barcode height"
                    className="absolute bottom-0 left-6 right-6 h-3 hover:h-4 bg-emerald-500/20 hover:bg-emerald-500/60 cursor-ns-resize transition-all opacity-0 group-hover:opacity-100 flex items-center justify-center"
                  >
                    <div className="h-1 w-6 bg-white/90 rounded-full shadow-xs"></div>
                  </div>

                  {/* Corner Drag Handle (Both Height & Width) */}
                  <div
                    onPointerDown={(e) => handlePointerDown(e, 'corner')}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    title="Drag corner to resize label height and barcode scaling"
                    className="absolute bottom-0 right-0 w-6 h-6 bg-emerald-500 hover:bg-emerald-400 text-white rounded-tl-lg cursor-nwse-resize transition-all opacity-0 group-hover:opacity-100 flex items-center justify-center shadow-md z-20"
                  >
                    <Move className="w-3.5 h-3.5" />
                  </div>
                </>
              )}
            </div>

            {/* Floating Live Dimensions Overlay Badge while dragging */}
            {isDragging && (
              <div className="mt-2 bg-emerald-500 text-white text-[11px] font-mono font-bold px-3 py-1 rounded-full shadow-lg flex items-center gap-2 animate-bounce">
                {isDragging === 'border' && <span>Border Thickness: {options.borderWidth ?? 7}px</span>}
                {isDragging === 'borderTextGap' && <span>Border ↔ Inside Text Gap: {options.borderTextGap ?? 6}px</span>}
                {isDragging === 'font' && <span>Text Font Size: {options.fontSize ?? 18}px</span>}
                {isDragging === 'gap' && <span>Barcode ↔ Price Gap: {options.barcodePriceGap ?? 25}px</span>}
                {(isDragging === 'bottom' || isDragging === 'corner') && <span>Height: {options.height}px</span>}
                {(isDragging === 'right' || isDragging === 'corner') && <span>Bar Width: {options.width}</span>}
              </div>
            )}

            {/* Label Specs & Quick Controls Footer Badge */}
            {!isDragging && (
              <div className="mt-2.5 flex items-center gap-3 text-[10px] font-mono text-slate-400 font-medium flex-wrap justify-center">
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  {(options.printerWidthInches || 2.0).toFixed(2)}″ × {(options.printerHeightInches || 1.0).toFixed(2)}″ Label
                </span>

                {onChangeOptions && (
                  <div className="flex items-center gap-1.5 bg-slate-800/80 px-2 py-0.5 rounded-md border border-slate-700">
                    <span className="text-slate-300">Height:</span>
                    <button
                      type="button"
                      onClick={() =>
                        onChangeOptions({
                          ...options,
                          height: Math.max(20, (options.height || 50) - 5),
                        })
                      }
                      className="w-4 h-4 rounded bg-slate-700 hover:bg-slate-600 text-white flex items-center justify-center cursor-pointer font-bold"
                    >
                      <Minus className="w-2.5 h-2.5" />
                    </button>
                    <span className="text-white font-bold w-6 text-center">{options.height}</span>
                    <button
                      type="button"
                      onClick={() =>
                        onChangeOptions({
                          ...options,
                          height: Math.min(100, (options.height || 50) + 5),
                        })
                      }
                      className="w-4 h-4 rounded bg-slate-700 hover:bg-slate-600 text-white flex items-center justify-center cursor-pointer font-bold"
                    >
                      <Plus className="w-2.5 h-2.5" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Quick Edit Fields Panel Overlay */}
      {isEditingInline && onChangeOptions && (
        <div className="mt-3 bg-slate-900 text-white border border-slate-800 rounded-xl p-3.5 space-y-3 shadow-md animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
              <Edit2 className="w-3.5 h-3.5" /> Direct Canvas Field Editor
            </span>
            <span className="text-[10px] text-slate-400">Edits update barcode instantly</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
                Item Code
              </label>
              <input
                type="text"
                value={options.itemCode || options.text}
                onChange={(e) =>
                  onChangeOptions({
                    ...options,
                    itemCode: e.target.value,
                    text: e.target.value,
                  })
                }
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
                Batch Number
              </label>
              <input
                type="text"
                value={options.batch || ''}
                onChange={(e) =>
                  onChangeOptions({
                    ...options,
                    batch: e.target.value,
                  })
                }
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
                Item Description Name
              </label>
              <input
                type="text"
                value={options.itemName || ''}
                onChange={(e) =>
                  onChangeOptions({
                    ...options,
                    itemName: e.target.value,
                  })
                }
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
                Price
              </label>
              <input
                type="text"
                value={options.price !== undefined ? options.price : ''}
                onChange={(e) =>
                  onChangeOptions({
                    ...options,
                    price: e.target.value,
                  })
                }
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white text-xs font-semibold focus:ring-1 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>
        </div>
      )}

      {/* INTERACTIVE COMPONENT RESIZER CONSOLE */}
      {!renderError && onChangeOptions && (
        <div className="mt-3 bg-slate-50 border border-slate-200/90 rounded-xl p-3 sm:p-4 text-xs space-y-3 shadow-2xs">
          <div className="flex items-center justify-between border-b border-slate-200/70 pb-2">
            <div className="flex items-center gap-1.5 text-slate-900 font-bold">
              <Sliders className="w-3.5 h-3.5 text-emerald-600" />
              <span>Interactive Component Resizers</span>
            </div>
            <span className="text-[10px] text-slate-500 font-mono">
              Hover preview to drag directly on canvas
            </span>
          </div>

          {/* Component Tabs Filter */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none">
            {[
              { id: 'all', label: 'All Controls' },
              { id: 'barcode', label: '📊 Barcode' },
              { id: 'borderGap', label: '↔️ Border-Text Gap' },
              { id: 'gap', label: '↕️ Barcode-Price Gap' },
              { id: 'text', label: '🔤 Text Font' },
              { id: 'border', label: '🖼️ Border Frame' },
              { id: 'frame', label: '📐 Canvas Size' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveResizerTab(tab.id as any)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  activeResizerTab === tab.id
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'bg-white text-slate-600 hover:bg-slate-200/70 border border-slate-200/80'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Grid of Resizers */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {/* 1. BARCODE BARS RESIZER */}
            {(activeResizerTab === 'all' || activeResizerTab === 'barcode') && (
              <div className="bg-white border border-slate-200/80 rounded-lg p-2.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 text-[11px]">Barcode Height & Width</span>
                  <span className="font-mono text-[10px] font-bold bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">
                    {options.height || 50}px × {options.width || 1.9}x
                  </span>
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-[10px] text-slate-500">
                    <span className="w-12 shrink-0">Height:</span>
                    <input
                      type="range"
                      min="20"
                      max="100"
                      step="2"
                      value={options.height || 50}
                      onChange={(e) =>
                        onChangeOptions({
                          ...options,
                          height: parseInt(e.target.value, 10),
                        })
                      }
                      className="flex-1 accent-emerald-600 h-1.5 cursor-pointer"
                    />
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() =>
                          onChangeOptions({
                            ...options,
                            height: Math.max(20, (options.height || 50) - 5),
                          })
                        }
                        className="w-4 h-4 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold cursor-pointer"
                      >
                        <Minus className="w-2.5 h-2.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          onChangeOptions({
                            ...options,
                            height: Math.min(100, (options.height || 50) + 5),
                          })
                        }
                        className="w-4 h-4 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold cursor-pointer"
                      >
                        <Plus className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-[10px] text-slate-500">
                    <span className="w-12 shrink-0">Bar Width:</span>
                    <input
                      type="range"
                      min="1"
                      max="4"
                      step="0.1"
                      value={options.width || 1.9}
                      onChange={(e) =>
                        onChangeOptions({
                          ...options,
                          width: parseFloat(e.target.value),
                        })
                      }
                      className="flex-1 accent-emerald-600 h-1.5 cursor-pointer"
                    />
                    <div className="flex items-center gap-1 shrink-0 font-mono font-bold text-slate-700">
                      {options.width || 1.9}x
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 2. BARCODE TO PRICE SPACING GAP RESIZER */}
            {(activeResizerTab === 'all' || activeResizerTab === 'gap' || activeResizerTab === 'barcode') && (
              <div className="bg-white border border-slate-200/80 rounded-lg p-2.5 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <ArrowUpDown className="w-3.5 h-3.5 text-purple-600" />
                    <span className="font-bold text-slate-800 text-[11px]">Barcode ↔ Price Spacing Gap</span>
                  </div>
                  <span className="font-mono text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200 px-1.5 py-0.5 rounded">
                    {options.barcodePriceGap ?? 25} px
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="0"
                    max="40"
                    step="1"
                    value={options.barcodePriceGap ?? 25}
                    onChange={(e) =>
                      onChangeOptions({
                        ...options,
                        barcodePriceGap: parseInt(e.target.value, 10),
                      })
                    }
                    className="flex-1 accent-purple-600 h-1.5 cursor-pointer"
                  />
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        const currentGap = options.barcodePriceGap ?? 25;
                        onChangeOptions({
                          ...options,
                          barcodePriceGap: Math.max(0, currentGap - 2),
                        });
                      }}
                      className="w-4 h-4 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold cursor-pointer"
                    >
                      <Minus className="w-2.5 h-2.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const currentGap = options.barcodePriceGap ?? 25;
                        onChangeOptions({
                          ...options,
                          barcodePriceGap: Math.min(40, currentGap + 2),
                        });
                      }}
                      className="w-4 h-4 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold cursor-pointer"
                    >
                      <Plus className="w-2.5 h-2.5" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-1 justify-between text-[10px]">
                  {[0, 5, 12, 18, 25].map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() =>
                        onChangeOptions({
                          ...options,
                          barcodePriceGap: g,
                        })
                      }
                      className={`px-1.5 py-0.5 rounded font-mono font-semibold cursor-pointer ${
                        (options.barcodePriceGap ?? 25) === g
                          ? 'bg-purple-600 text-white shadow-2xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {g}px
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      onChangeOptions({
                        ...options,
                        barcodePriceGap: 25,
                      });
                    }}
                    title="Reset gap to default 25px"
                    className="px-1.5 py-0.5 rounded text-purple-700 hover:bg-purple-50 font-sans font-bold cursor-pointer text-[9px]"
                  >
                    Reset
                  </button>
                </div>
              </div>
            )}

            {/* 2. TEXT & FONT SIZE RESIZER */}
            {(activeResizerTab === 'all' || activeResizerTab === 'text') && (
              <div className="bg-white border border-slate-200/80 rounded-lg p-2.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 text-[11px]">Text Font Size</span>
                  <span className="font-mono text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200 px-1.5 py-0.5 rounded">
                    {options.fontSize || 18} px
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="10"
                    max="32"
                    step="1"
                    value={options.fontSize || 18}
                    onChange={(e) =>
                      onChangeOptions({
                        ...options,
                        fontSize: parseInt(e.target.value, 10),
                      })
                    }
                    className="flex-1 accent-sky-600 h-1.5 cursor-pointer"
                  />
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() =>
                        onChangeOptions({
                          ...options,
                          fontSize: Math.max(10, (options.fontSize || 18) - 2),
                        })
                      }
                      className="w-4 h-4 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold cursor-pointer"
                    >
                      <Minus className="w-2.5 h-2.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        onChangeOptions({
                          ...options,
                          fontSize: Math.min(32, (options.fontSize || 18) + 2),
                        })
                      }
                      className="w-4 h-4 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold cursor-pointer"
                    >
                      <Plus className="w-2.5 h-2.5" />
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-1 justify-between text-[10px]">
                  {[12, 16, 18, 22, 26].map((sz) => (
                    <button
                      key={sz}
                      type="button"
                      onClick={() =>
                        onChangeOptions({
                          ...options,
                          fontSize: sz,
                        })
                      }
                      className={`px-1.5 py-0.5 rounded font-mono font-semibold cursor-pointer ${
                        (options.fontSize || 18) === sz
                          ? 'bg-sky-600 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {sz}px
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 3. BORDER FRAME RESIZER */}
            {(activeResizerTab === 'all' || activeResizerTab === 'border') && (
              <div className="bg-white border border-slate-200/80 rounded-lg p-2.5 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-slate-800 text-[11px]">Border Frame</span>
                    <button
                      type="button"
                      onClick={() =>
                        onChangeOptions({
                          ...options,
                          showBorder: options.showBorder === false,
                        })
                      }
                      className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase cursor-pointer ${
                        options.showBorder !== false
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {options.showBorder !== false ? 'ON' : 'OFF'}
                    </button>
                  </div>
                  {options.showBorder !== false && (
                    <span className="font-mono text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded">
                      {options.borderWidth ?? 7} px
                    </span>
                  )}
                </div>

                {options.showBorder !== false && (
                  <>
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min="0"
                        max="20"
                        step="1"
                        value={options.borderWidth ?? 7}
                        onChange={(e) =>
                          onChangeOptions({
                            ...options,
                            borderWidth: parseInt(e.target.value, 10),
                          })
                        }
                        className="flex-1 accent-amber-600 h-1.5 cursor-pointer"
                      />
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() =>
                            onChangeOptions({
                              ...options,
                              borderWidth: Math.max(0, (options.borderWidth ?? 7) - 1),
                            })
                          }
                          className="w-4 h-4 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold cursor-pointer"
                        >
                          <Minus className="w-2.5 h-2.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            onChangeOptions({
                              ...options,
                              borderWidth: Math.min(20, (options.borderWidth ?? 7) + 1),
                            })
                          }
                          className="w-4 h-4 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold cursor-pointer"
                        >
                          <Plus className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 justify-between text-[10px]">
                      {[0, 3, 7, 12, 16].map((bw) => (
                        <button
                          key={bw}
                          type="button"
                          onClick={() =>
                            onChangeOptions({
                              ...options,
                              borderWidth: bw,
                            })
                          }
                          className={`px-1.5 py-0.5 rounded font-mono font-semibold cursor-pointer ${
                            (options.borderWidth ?? 7) === bw
                              ? 'bg-amber-600 text-white'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          {bw}px
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* 3.5. BORDER ↔ INSIDE TEXT GAP RESIZER & TOGGLE CONTROL */}
            {(activeResizerTab === 'all' || activeResizerTab === 'border' || activeResizerTab === 'borderGap' || activeResizerTab === 'gap') && (
              <div className="bg-white border border-slate-200/80 rounded-lg p-2.5 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-slate-800 text-[11px]">Border ↔ Inside Text Gap</span>
                    <button
                      type="button"
                      onClick={() =>
                        onChangeOptions({
                          ...options,
                          borderTextGap: (options.borderTextGap ?? 6) > 0 ? 0 : 6,
                        })
                      }
                      className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase transition-all cursor-pointer ${
                        (options.borderTextGap ?? 6) > 0
                          ? 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                          : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {(options.borderTextGap ?? 6) > 0 ? 'GAP ON' : 'GAP OFF (FLUSH)'}
                    </button>
                  </div>
                  <span className="font-mono text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 px-1.5 py-0.5 rounded">
                    {options.borderTextGap ?? 6} px
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="0"
                    max="20"
                    step="1"
                    value={options.borderTextGap ?? 6}
                    onChange={(e) =>
                      onChangeOptions({
                        ...options,
                        borderTextGap: parseInt(e.target.value, 10),
                      })
                    }
                    className="flex-1 accent-indigo-600 h-1.5 cursor-pointer"
                  />
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() =>
                        onChangeOptions({
                          ...options,
                          borderTextGap: Math.max(0, (options.borderTextGap ?? 6) - 1),
                        })
                      }
                      className="w-4 h-4 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold cursor-pointer"
                    >
                      <Minus className="w-2.5 h-2.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        onChangeOptions({
                          ...options,
                          borderTextGap: Math.min(20, (options.borderTextGap ?? 6) + 1),
                        })
                      }
                      className="w-4 h-4 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold cursor-pointer"
                    >
                      <Plus className="w-2.5 h-2.5" />
                    </button>
                  </div>
                </div>

                {/* Preset Gap Toggle Buttons */}
                <div className="flex items-center gap-1 justify-between text-[10px]">
                  {[
                    { label: '0px (Flush)', val: 0 },
                    { label: '3px (Tight)', val: 3 },
                    { label: '6px (Normal)', val: 6 },
                    { label: '10px (Wide)', val: 10 },
                    { label: '16px (Spacious)', val: 16 },
                  ].map((preset) => (
                    <button
                      key={preset.val}
                      type="button"
                      onClick={() =>
                        onChangeOptions({
                          ...options,
                          borderTextGap: preset.val,
                        })
                      }
                      className={`px-1.5 py-0.5 rounded font-mono font-semibold transition-all cursor-pointer ${
                        (options.borderTextGap ?? 6) === preset.val
                          ? 'bg-indigo-600 text-white shadow-2xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 4. CANVAS FRAME DIMENSIONS RESIZER */}
            {(activeResizerTab === 'all' || activeResizerTab === 'frame') && (
              <div className="bg-white border border-slate-200/80 rounded-lg p-2.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 text-[11px]">Print Frame Dimensions</span>
                  <span className="font-mono text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 px-1.5 py-0.5 rounded">
                    {(options.activeFrameWidthInches || 1.80).toFixed(2)}″ × {(options.activeFrameHeightInches || 0.70).toFixed(2)}″
                  </span>
                </div>
                <div className="space-y-1 text-[10px] text-slate-500">
                  <div className="flex items-center gap-2">
                    <span className="w-14 shrink-0">Width:</span>
                    <input
                      type="range"
                      min="1.0"
                      max="3.0"
                      step="0.05"
                      value={options.activeFrameWidthInches || 1.80}
                      onChange={(e) =>
                        onChangeOptions({
                          ...options,
                          activeFrameWidthInches: parseFloat(e.target.value),
                        })
                      }
                      className="flex-1 accent-indigo-600 h-1.5 cursor-pointer"
                    />
                    <span className="font-mono font-bold text-slate-700 w-10 text-right">
                      {(options.activeFrameWidthInches || 1.80).toFixed(2)}″
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-14 shrink-0">Height:</span>
                    <input
                      type="range"
                      min="0.4"
                      max="1.5"
                      step="0.05"
                      value={options.activeFrameHeightInches || 0.70}
                      onChange={(e) =>
                        onChangeOptions({
                          ...options,
                          activeFrameHeightInches: parseFloat(e.target.value),
                        })
                      }
                      className="flex-1 accent-indigo-600 h-1.5 cursor-pointer"
                    />
                    <span className="font-mono font-bold text-slate-700 w-10 text-right">
                      {(options.activeFrameHeightInches || 0.70).toFixed(2)}″
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Primary Export & Action Bar */}
      {!renderError && (
        <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col gap-2.5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <button
              type="button"
              onClick={handleDownloadPng}
              disabled={isExporting}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 transition-colors shadow-xs focus:ring-2 focus:ring-slate-900 disabled:opacity-50 cursor-pointer"
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span>Download PNG</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadSvg}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200/80 border border-slate-200 transition-colors cursor-pointer"
            >
              <FileCode className="w-3.5 h-3.5 text-slate-500" />
              <span>SVG Vector</span>
            </button>

            <button
              type="button"
              onClick={handleCopyImage}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200/80 border border-slate-200 transition-colors cursor-pointer"
            >
              {isCopied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-500" />
                  <span>Copy Image</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onQuickPrint}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200/80 border border-slate-200 transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-slate-500" />
              <span>Print</span>
            </button>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-500 bg-slate-50 px-3 py-2 rounded-lg border border-slate-200/60">
            <span className="font-mono truncate max-w-[200px] sm:max-w-xs">{options.text}</span>
            <button
              type="button"
              onClick={handleCopyValue}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
            >
              {copiedValue ? (
                <>
                  <Check className="w-3 h-3 text-emerald-600" /> Copied Text
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" /> Copy Text
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
