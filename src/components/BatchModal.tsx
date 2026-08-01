import React, { useState, useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';
import { BarcodeFormat, BarcodeOptions } from '../types';
import { BARCODE_FORMAT_INFO } from '../data/presets';
import { downloadSvgAsFile, svgToPngDataUrl } from '../utils/barcodeUtils';
import { Layers, X, Download, FileText, Check, AlertCircle, RefreshCw } from 'lucide-react';

interface BatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultFormat: BarcodeFormat;
}

export const BatchModal: React.FC<BatchModalProps> = ({
  isOpen,
  onClose,
  defaultFormat,
}) => {
  const [format, setFormat] = useState<BarcodeFormat>(defaultFormat);
  const [inputText, setInputText] = useState<string>(
    'SKU-1001-A\nSKU-1002-B\nSKU-1003-C\nSKU-1004-D\nSKU-1005-E'
  );
  const [items, setItems] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setFormat(defaultFormat);
    }
  }, [isOpen, defaultFormat]);

  useEffect(() => {
    const lines = inputText
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);
    setItems(lines);
  }, [inputText]);

  if (!isOpen) return null;

  const handleDownloadAllPng = async () => {
    setIsProcessing(true);
    const svgElements = document.querySelectorAll('.batch-item-svg');
    
    for (let i = 0; i < svgElements.length; i++) {
      const svg = svgElements[i] as SVGSVGElement;
      const textVal = items[i] || `barcode_${i}`;
      try {
        const pngUrl = await svgToPngDataUrl(svg, 3, '#ffffff');
        const link = document.createElement('a');
        link.href = pngUrl;
        link.download = `${format.toLowerCase()}_${textVal.replace(/[^a-z0-9]/gi, '_')}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        // Small delay between downloads so browser doesn't block pops
        await new Promise((r) => setTimeout(r, 150));
      } catch (e) {
        console.error('Batch download error:', e);
      }
    }
    setIsProcessing(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden my-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 leading-tight">
                Batch Barcode Generator
              </h2>
              <p className="text-xs text-slate-500">
                Generate multiple barcodes simultaneously from a list or CSV
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

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left Input */}
          <div className="space-y-4 text-xs">
            <div className="space-y-1.5">
              <label htmlFor="batch-symbology-select" className="font-bold text-slate-700 block uppercase tracking-wider">
                Select Symbology
              </label>
              <select
                id="batch-symbology-select"
                value={format}
                onChange={(e) => setFormat(e.target.value as BarcodeFormat)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-900 text-xs font-semibold bg-white"
              >
                {(Object.keys(BARCODE_FORMAT_INFO) as BarcodeFormat[]).map((fmt) => (
                  <option key={fmt} value={fmt}>
                    {BARCODE_FORMAT_INFO[fmt].name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="batch-values-textarea" className="font-bold text-slate-700 block uppercase tracking-wider flex items-center justify-between">
                <span>Enter Values (1 per line)</span>
                <span className="font-mono text-slate-400">{items.length} items</span>
              </label>
              <textarea
                id="batch-values-textarea"
                rows={10}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="SKU-1001&#10;SKU-1002&#10;SKU-1003"
                className="w-full p-3 rounded-xl border border-slate-200 font-mono text-xs text-slate-900 focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
              />
            </div>
          </div>

          {/* Right Preview Grid */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/80 overflow-y-auto max-h-[420px]">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-3">
              Batch Output ({items.length} Barcodes)
            </span>

            {items.length === 0 ? (
              <div className="text-center py-12 text-xs text-slate-400">
                Enter values on the left to see batch barcodes.
              </div>
            ) : (
              <div className="space-y-3">
                {items.map((val, idx) => (
                  <BatchBarcodeItem key={`${val}-${idx}`} text={val} format={format} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <span className="text-xs text-slate-500 font-medium">
            Ready to generate <strong className="text-slate-800">{items.length}</strong> items
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200/60 transition-colors"
            >
              Close
            </button>
            <button
              type="button"
              onClick={handleDownloadAllPng}
              disabled={items.length === 0 || isProcessing}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 shadow-xs transition-colors disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Downloading...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Download All PNGs
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

interface BatchBarcodeItemProps {
  text: string;
  format: BarcodeFormat;
}

const BatchBarcodeItem: React.FC<BatchBarcodeItemProps> = ({ text, format }) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!svgRef.current) return;
    try {
      while (svgRef.current.firstChild) {
        svgRef.current.removeChild(svgRef.current.firstChild);
      }

      JsBarcode(svgRef.current, text.trim(), {
        format: format,
        lineColor: '#000000',
        background: '#ffffff',
        width: 1.5,
        height: 35,
        displayValue: true,
        fontSize: 10,
        margin: 4,
        valid: (valid) => {
          if (!valid) setError('Invalid code');
          else setError(null);
        },
      });
      setError(null);
    } catch (e: any) {
      setError('Error');
    }
  }, [text, format]);

  return (
    <div className="bg-white rounded-lg p-2.5 border border-slate-200/80 shadow-2xs flex items-center justify-between gap-3">
      <div className="truncate max-w-[120px]">
        <span className="text-[11px] font-mono font-bold text-slate-800 truncate block">
          {text}
        </span>
      </div>

      <div className="flex-1 flex justify-center overflow-hidden">
        {error ? (
          <span className="text-[10px] text-amber-600 bg-amber-50 px-2 py-0.5 rounded font-medium">
            {error}
          </span>
        ) : (
          <svg ref={svgRef} className="batch-item-svg max-w-full" />
        )}
      </div>
    </div>
  );
};
