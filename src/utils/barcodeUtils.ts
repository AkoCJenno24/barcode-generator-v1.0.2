import JsBarcode from 'jsbarcode';
import { BarcodeFormat, BarcodeOptions, CatalogItem } from '../types';

export function formatPriceWithDecimals(priceStr: string | number | undefined | null): string {
  if (priceStr === undefined || priceStr === null) return '';
  const str = typeof priceStr === 'string' ? priceStr : String(priceStr);
  const trimmed = str.trim();
  if (!trimmed) return '';

  const match = trimmed.match(/(\d+(?:\.\d+)?)/);
  if (match) {
    const num = parseFloat(match[1]);
    if (!isNaN(num)) {
      const formattedNum = num.toFixed(2);
      return trimmed.replace(match[1], formattedNum);
    }
  }
  return trimmed;
}

export function formatPriceWithSymbol(priceStr: string | number | undefined | null): string {
  if (priceStr === undefined || priceStr === null) return '';
  const formattedDecimals = formatPriceWithDecimals(priceStr);
  if (!formattedDecimals) return '';

  const match = formattedDecimals.match(/(\d+(?:\.\d+)?)/);
  if (match) {
    return `SAR ${match[1]}`;
  }
  return `SAR ${formattedDecimals.replace(/SAR|SR/gi, '').trim()}`;
}

export function validateBarcodeValue(format: BarcodeFormat, text: string): { isValid: boolean; message?: string } {
  const val = String(text || '').trim();
  if (!val) {
    return { isValid: false, message: 'Please enter a barcode value' };
  }

  switch (format) {
    case 'EAN13':
      if (!/^\d{12,13}$/.test(val)) {
        return { isValid: false, message: 'EAN-13 requires exactly 12 digits (or 13 with check digit)' };
      }
      break;
    case 'EAN8':
      if (!/^\d{7,8}$/.test(val)) {
        return { isValid: false, message: 'EAN-8 requires exactly 7 digits (or 8 with check digit)' };
      }
      break;
    case 'UPC':
      if (!/^\d{11,12}$/.test(val)) {
        return { isValid: false, message: 'UPC-A requires exactly 11 digits (or 12 with check digit)' };
      }
      break;
    case 'ITF14':
      if (!/^\d{13,14}$/.test(val)) {
        return { isValid: false, message: 'ITF-14 requires 13 or 14 digits' };
      }
      break;
    case 'ITF':
      if (!/^\d+$/.test(val) || val.length % 2 !== 0) {
        return { isValid: false, message: 'ITF requires an EVEN number of numeric digits' };
      }
      break;
    case 'CODE128C':
      if (!/^\d+$/.test(val) || val.length % 2 !== 0) {
        return { isValid: false, message: 'Code 128C requires an EVEN number of digits' };
      }
      break;
    case 'CODE39':
      if (!/^[0-9A-Z\-\.\ \$\/\+\%]+$/.test(val)) {
        return { isValid: false, message: 'Code 39 supports uppercase A-Z, 0-9, and - . $ / + %' };
      }
      break;
    case 'MSI':
      if (!/^\d+$/.test(val)) {
        return { isValid: false, message: 'MSI requires digits 0-9 only' };
      }
      break;
    case 'pharmacode': {
      const num = parseInt(val, 10);
      if (isNaN(num) || num < 3 || num > 131070) {
        return { isValid: false, message: 'Pharmacode must be a number between 3 and 131070' };
      }
      break;
    }
    case 'codabar':
      if (!/^[A-Da-d][0-9\-\$\:\/\.\+]+[A-Da-d]$/.test(val) && !/^[0-9\-\$\:\/\.\+]+$/.test(val)) {
        return { isValid: false, message: 'Codabar optional start/stop characters (A-D) and numbers 0-9, - $ : / . +' };
      }
      break;
    default:
      break;
  }

  return { isValid: true };
}

export function downloadSvgAsFile(svgElement: SVGSVGElement, fileName: string = 'barcode.svg') {
  const serializer = new XMLSerializer();
  let source = serializer.serializeToString(svgElement);
  
  if (!source.match(/^<svg[^>]+xmlns="http\:\/\/www\.w3\.org\/2000\/svg"/)) {
    source = source.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
  }
  if (!source.match(/^<svg[^>]+"http\:\/\/www\.w3\.org\/1999\/xlink"/)) {
    source = source.replace(/^<svg/, '<svg xmlns:xlink="http://www.w3.org/1999/xlink"');
  }

  source = '<?xml version="1.0" standalone="no"?>\r\n' + source;
  const url = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(source);

  const downloadLink = document.createElement('a');
  downloadLink.href = url;
  downloadLink.download = fileName;
  document.body.appendChild(downloadLink);
  downloadLink.click();
  document.body.removeChild(downloadLink);
}

export function svgToPngDataUrl(
  svgElement: SVGSVGElement,
  scaleMultiplier: number = 4,
  bgColor: string = '#ffffff'
): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      const serializer = new XMLSerializer();
      let svgString = serializer.serializeToString(svgElement);

      const bbox = svgElement.getBBox();
      const svgWidth = svgElement.clientWidth || bbox.width || 300;
      const svgHeight = svgElement.clientHeight || bbox.height || 150;

      const canvas = document.createElement('canvas');
      canvas.width = Math.round(svgWidth * scaleMultiplier);
      canvas.height = Math.round(svgHeight * scaleMultiplier);

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      ctx.fillStyle = bgColor === 'transparent' ? '#ffffff' : bgColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const img = new Image();
      const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);

      img.onload = () => {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(url);
        resolve(canvas.toDataURL('image/png'));
      };

      img.onerror = (err) => {
        URL.revokeObjectURL(url);
        reject(err);
      };

      img.src = url;
    } catch (err) {
      reject(err);
    }
  });
}

export async function copyBarcodeImageToClipboard(svgElement: SVGSVGElement, bgColor: string = '#ffffff') {
  const pngDataUrl = await svgToPngDataUrl(svgElement, 3, bgColor);
  const response = await fetch(pngDataUrl);
  const blob = await response.blob();
  
  if (navigator.clipboard && navigator.clipboard.write) {
    await navigator.clipboard.write([
      new ClipboardItem({
        [blob.type]: blob,
      }),
    ]);
  } else {
    throw new Error('Clipboard API not supported in this browser');
  }
}

// Helper function to accurately wrap text based on font size and max width
function wrapText(text: string, font: string, maxWidth: number): string[] {
  const canvas = typeof document !== 'undefined' ? document.createElement('canvas') : null;
  const ctx = canvas ? canvas.getContext('2d') : null;
  if (ctx) ctx.font = font;

  const measure = (str: string) =>
    ctx ? ctx.measureText(str).width : str.length * (parseFloat(font) || 12) * 0.55;

  const words = text.trim().split(/\s+/);
  const lines: string[] = [];
  let currentLine = '';

  for (let word of words) {
    if (!word) continue;

    // Handle single long words exceeding maxWidth by splitting
    while (measure(word) > maxWidth && word.length > 1) {
      let subIndex = word.length - 1;
      while (subIndex > 1 && measure(word.slice(0, subIndex)) > maxWidth) {
        subIndex--;
      }
      const part = word.slice(0, subIndex);
      word = word.slice(subIndex);
      if (currentLine) {
        lines.push(currentLine);
        currentLine = '';
      }
      lines.push(part);
    }

    const testLine = currentLine ? `${currentLine} ${word}` : word;
    if (measure(testLine) <= maxWidth) {
      currentLine = testLine;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines.length > 0 ? lines : [text];
}

export function renderRetailLabelSvg(svgElement: SVGSVGElement, options: BarcodeOptions) {
  while (svgElement.firstChild) {
    svgElement.removeChild(svgElement.firstChild);
  }

  let itemCode = options.itemCode;
  let batch = options.batch;

  if (!itemCode) {
    if (options.text.includes('.')) {
      itemCode = options.text.split('.')[0];
      batch = batch || options.text.split('.')[1];
    } else {
      itemCode = options.text;
    }
  }

  const itemName = options.itemName || '';
  const price = options.price || '';
  const lineColor = options.lineColor || '#000000';
  const fontStyle =
    options.font === 'monospace'
      ? 'monospace, "Courier New", Courier'
      : options.font === 'sans-serif'
      ? 'Arial, Helvetica, "Segoe UI", sans-serif'
      : '"Times New Roman", Times, Georgia, serif';

  const weightVal = options.fontWeight || 'bold';
  const letterSpacingPx = options.letterSpacing !== undefined 
    ? `${options.letterSpacing}px` 
    : (options.font === 'serif' ? '0.3px' : '0px');

  const cleanCode = String(itemCode ?? '11002546').trim();
  const cleanBatch = String(batch !== undefined && batch !== null ? batch : '').trim();
  const rawText = options.text !== undefined && options.text !== null ? String(options.text).trim() : '';
  const textToEncode = rawText || (cleanBatch ? `${cleanCode}.${cleanBatch}` : cleanCode);

  // 1. Generate barcode lines using a temporary SVG element
  const hiddenSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  JsBarcode(hiddenSvg, textToEncode, {
    format: options.format,
    lineColor: lineColor,
    width: options.width,
    height: Math.min(options.height, 55),
    displayValue: false,
    margin: 0,
    narrowWideRatio: options.narrowWideRatio || 3,
  } as any);

  const rawBarWidth = parseFloat(hiddenSvg.getAttribute('width') || '220');
  const rawBarHeight = parseFloat(hiddenSvg.getAttribute('height') || '50');

  // Dynamic Label Printer Canvas based on Printer Preset (defaults to 2" x 1" with 1.80" x 0.70" frame)
  const printerW = options.printerWidthInches || 2.0;
  const printerH = options.printerHeightInches || 1.0;
  const frameW = options.activeFrameWidthInches || 1.80;
  const frameH = options.activeFrameHeightInches || 0.70;

  const svgWidth = Math.round(printerW * 200);
  const svgHeight = Math.round(printerH * 200);
  const frameWidth = Math.round(frameW * 200);
  const frameHeight = Math.round(frameH * 200);
  const frameX = (svgWidth - frameWidth) / 2;
  const frameY = (svgHeight - frameHeight) / 2;

  svgElement.setAttribute('viewBox', `0 0 ${svgWidth} ${svgHeight}`);
  svgElement.setAttribute('width', `${svgWidth}`);
  svgElement.setAttribute('height', `${svgHeight}`);
  svgElement.setAttribute('shape-rendering', 'crispEdges');
  svgElement.setAttribute('text-rendering', 'geometricPrecision');
  svgElement.setAttribute('rendering-intent', 'perceptual');

  const ns = 'http://www.w3.org/2000/svg';

  // Inject font and shape crispness CSS rules for 203 DPI thermal printers (Zebra ZD230)
  const styleEl = document.createElementNS(ns, 'style');
  styleEl.textContent = `
    text {
      text-rendering: geometricPrecision !important;
      shape-rendering: crispEdges !important;
      -webkit-font-smoothing: antialiased !important;
      -moz-osx-font-smoothing: grayscale !important;
      font-smooth: never !important;
    }
    rect, path {
      shape-rendering: crispEdges !important;
    }
  `;
  svgElement.appendChild(styleEl);

  // Background fill
  if (options.background && options.background !== 'transparent') {
    const bgRect = document.createElementNS(ns, 'rect');
    bgRect.setAttribute('width', `${svgWidth}`);
    bgRect.setAttribute('height', `${svgHeight}`);
    bgRect.setAttribute('fill', options.background);
    svgElement.appendChild(bgRect);
  }

  // Outer Border Frame (Fitted inside printer preset dimensions)
  const bw = options.showBorder !== false ? (options.borderWidth !== undefined ? options.borderWidth : 7) : 0;
  if (bw > 0) {
    const borderRect = document.createElementNS(ns, 'rect');
    borderRect.setAttribute('x', `${frameX + bw / 2}`);
    borderRect.setAttribute('y', `${frameY + bw / 2}`);
    borderRect.setAttribute('width', `${frameWidth - bw}`);
    borderRect.setAttribute('height', `${frameHeight - bw}`);
    borderRect.setAttribute('fill', 'none');
    borderRect.setAttribute('stroke', lineColor);
    borderRect.setAttribute('stroke-width', `${bw}`);
    svgElement.appendChild(borderRect);
  }

  const baseFontSize = options.fontSize || 18;
  const codeFontSize = Math.max(10, Math.round(baseFontSize));
  const priceFontSize = Math.max(12, Math.round(baseFontSize * 1.1));
  const nameFontSize = Math.max(8, Math.round(baseFontSize * 0.72));

  const borderTextGap = options.borderTextGap !== undefined ? options.borderTextGap : 6;
  const paddingX = frameX + Math.max(4, bw + borderTextGap);
  const rightX = frameX + frameWidth - Math.max(4, bw + borderTextGap);
  const topTextY = frameY + Math.max(12, Math.round(codeFontSize * 0.9)) + (bw > 0 ? bw / 2 : 0) + (borderTextGap > 6 ? (borderTextGap - 6) * 0.8 : 0);

  // Top Left: Item Code (e.g., 11001788)
  const codeText = document.createElementNS(ns, 'text');
  codeText.setAttribute('x', `${paddingX}`);
  codeText.setAttribute('y', `${topTextY}`);
  codeText.setAttribute('font-family', fontStyle);
  codeText.setAttribute('font-size', `${codeFontSize}`);
  codeText.setAttribute('font-weight', weightVal);
  codeText.setAttribute('style', `letter-spacing: ${letterSpacingPx};`);
  codeText.setAttribute('fill', lineColor);
  codeText.textContent = cleanCode;
  svgElement.appendChild(codeText);

  // Top Center: Wasfaty "W" symbol (if Wasfaty option is selected)
  if (options.wasfatyType === 'Wasfaty') {
    const wasfatyText = document.createElementNS(ns, 'text');
    wasfatyText.setAttribute('x', `${svgWidth / 2}`);
    wasfatyText.setAttribute('y', `${topTextY}`);
    wasfatyText.setAttribute('font-family', fontStyle);
    wasfatyText.setAttribute('font-size', `${codeFontSize}`);
    wasfatyText.setAttribute('font-weight', weightVal);
    wasfatyText.setAttribute('style', `letter-spacing: ${letterSpacingPx};`);
    wasfatyText.setAttribute('text-anchor', 'middle');
    wasfatyText.setAttribute('fill', lineColor);
    wasfatyText.textContent = 'W';
    svgElement.appendChild(wasfatyText);
  }

  // Top Right: Batch Number (e.g., DD0190)
  if (cleanBatch) {
    const batchText = document.createElementNS(ns, 'text');
    batchText.setAttribute('x', `${rightX}`);
    batchText.setAttribute('y', `${topTextY}`);
    batchText.setAttribute('font-family', fontStyle);
    batchText.setAttribute('font-size', `${codeFontSize}`);
    batchText.setAttribute('font-weight', weightVal);
    batchText.setAttribute('style', `letter-spacing: ${letterSpacingPx};`);
    batchText.setAttribute('text-anchor', 'end');
    batchText.setAttribute('fill', lineColor);
    batchText.textContent = cleanBatch;
    svgElement.appendChild(batchText);
  }

  // Item Name Wrapping & Layout Calculation
  const nameFontSpec = `${weightVal} ${nameFontSize}px ${fontStyle}`;
  const maxNameWidth = Math.max(40, rightX - paddingX);
  const nameLines = itemName ? wrapText(itemName, nameFontSpec, maxNameWidth) : [];
  const lineSpacing = Math.round(nameFontSize * 1.22);

  const lastLineY = frameY + frameHeight - Math.max(6, Math.round(nameFontSize * 0.4)) - (bw > 0 ? bw / 2 : 0) - (borderTextGap > 6 ? (borderTextGap - 6) * 0.8 : 0);
  const bottomNameTop = nameLines.length > 0
    ? (lastLineY - (nameLines.length - 1) * lineSpacing - nameFontSize)
    : (frameY + frameHeight - Math.max(4, bw + borderTextGap));

  // Calculate available vertical space for [Barcode + Price] to perfectly center them in the frame
  const topHeaderBottom = topTextY + 4;
  const availableMiddleHeight = Math.max(20, bottomNameTop - topHeaderBottom);

  const formattedPrice = formatPriceWithSymbol(price);
  const targetBarHeight = Math.min(
    options.height || 50,
    Math.max(20, Math.round(availableMiddleHeight - (formattedPrice ? priceFontSize * 1.1 : 0) - 8))
  );

  const defaultPriceGap = Math.round(priceFontSize * 0.85);
  const priceGap = formattedPrice
    ? (options.barcodePriceGap !== undefined ? options.barcodePriceGap : defaultPriceGap)
    : 0;
  const totalBlockHeight = targetBarHeight + (formattedPrice ? priceGap : 0);

  // Calculate exact vertical start Y for Barcode to place [Barcode + Price] centered inside frame
  const barStartY = Math.round(topHeaderBottom + Math.max(0, (availableMiddleHeight - totalBlockHeight) / 2));
  const priceY = Math.round(barStartY + targetBarHeight + priceGap);

  // Center: Barcode Bars Group (Fit inside border frame)
  const maxAvailableBarWidth = frameWidth - Math.max(20, (bw + 6) * 2);
  const scaleX = rawBarWidth > maxAvailableBarWidth ? maxAvailableBarWidth / rawBarWidth : 1;
  const effectiveBarWidth = rawBarWidth * scaleX;
  const translateX = (svgWidth - effectiveBarWidth) / 2;

  const barGroup = document.createElementNS(ns, 'g');
  if (scaleX !== 1) {
    barGroup.setAttribute('transform', `translate(${translateX}, ${barStartY}) scale(${scaleX}, 1)`);
  } else {
    barGroup.setAttribute('transform', `translate(${translateX}, ${barStartY})`);
  }
  barGroup.innerHTML = hiddenSvg.innerHTML;
  svgElement.appendChild(barGroup);

  // Below Barcode (Centered both horizontally & vertically): Price (e.g., ⃁ 43.20)
  if (formattedPrice) {
    const priceText = document.createElementNS(ns, 'text');
    priceText.setAttribute('x', `${svgWidth / 2}`);
    priceText.setAttribute('y', `${priceY}`);
    priceText.setAttribute('font-family', fontStyle);
    priceText.setAttribute('font-size', `${priceFontSize}`);
    priceText.setAttribute('font-weight', weightVal);
    priceText.setAttribute('style', `letter-spacing: ${letterSpacingPx};`);
    priceText.setAttribute('text-anchor', 'middle');
    priceText.setAttribute('fill', lineColor);
    priceText.textContent = formattedPrice;
    svgElement.appendChild(priceText);
  }

  // Bottom Left: Item Name (Wrapped within border line, justified from left)
  if (nameLines.length > 0) {
    const nameText = document.createElementNS(ns, 'text');
    nameText.setAttribute('x', `${paddingX}`);
    nameText.setAttribute('font-family', fontStyle);
    nameText.setAttribute('font-size', `${nameFontSize}`);
    nameText.setAttribute('font-weight', weightVal);
    nameText.setAttribute('style', `letter-spacing: ${letterSpacingPx};`);
    nameText.setAttribute('fill', lineColor);
    nameText.setAttribute('text-anchor', 'start');

    const firstLineY = lastLineY - (nameLines.length - 1) * lineSpacing;

    nameLines.forEach((line, index) => {
      const tspan = document.createElementNS(ns, 'tspan');
      tspan.setAttribute('x', `${paddingX}`);
      tspan.setAttribute('y', `${firstLineY + index * lineSpacing}`);
      tspan.textContent = line;
      nameText.appendChild(tspan);
    });

    svgElement.appendChild(nameText);
  }
}

export function generateZebraZplCode(params: {
  itemCode: string;
  itemName: string;
  price: string;
  batch?: string;
  barcodeText: string;
  quantity?: number;
  showBorder?: boolean;
  borderWidth?: number;
  printerWidthInches?: number;
  printerHeightInches?: number;
  activeFrameWidthInches?: number;
  activeFrameHeightInches?: number;
}): string {
  const qty = params.quantity || 1;
  const priceStr = formatPriceWithSymbol(params.price);
  const cleanCode = params.itemCode || '';
  const cleanBatch = params.batch ? `R${params.batch.replace(/^R/i, '')}` : '';
  const cleanName = (params.itemName || '').toUpperCase();
  const barcode = params.barcodeText || cleanCode;
  const showBorder = params.showBorder !== false;
  const bw = params.borderWidth !== undefined ? params.borderWidth : 7;
  const borderDots = Math.max(1, Math.round(bw * 1.015));

  const pW = params.printerWidthInches || 2.0;
  const pH = params.printerHeightInches || 1.0;
  const fW = params.activeFrameWidthInches || 1.80;
  const fH = params.activeFrameHeightInches || 0.70;

  const pwDots = Math.round(pW * 203);
  const llDots = Math.round(pH * 203);
  const fwDots = Math.round(fW * 203);
  const fhDots = Math.round(fH * 203);
  const fxDots = Math.round(((pW - fW) / 2) * 203);
  const fyDots = Math.round(((pH - fH) / 2) * 203);

  const borderZpl = (showBorder && bw > 0)
    ? `^FX --- Border Frame ---
^FO${fxDots},${fyDots}^GB${fwDots},${fhDots},${borderDots}^FS
`
    : '';

  return `^XA
^PW${pwDots}
^LL${llDots}
^PON
^PQ${qty}

${borderZpl}^FX --- Top Header (Item Code & Batch) ---
^FO${fxDots + 15},${fyDots + 12}^A0N,20,20^FD${cleanCode}^FS
${cleanBatch ? `^FO${fxDots + 220},${fyDots + 12}^A0N,20,20^FD${cleanBatch}^FS` : ''}

^FX --- Center Barcode (Code 128) ---
^BY2,2.0,50
^FO${fxDots + 25},${fyDots + 30}^BCN,50,Y,N,N^FD${barcode}^FS

^FX --- Price ---
${priceStr ? `^FO${fxDots + 110},${fyDots + 96}^A0N,26,26^FD${priceStr}^FS` : ''}

^FX --- Item Name ---
^FO${fxDots + 15},${fyDots + 122}^FB${fwDots - 30},2,0,L^A0N,18,18^FD${cleanName}^FS

^XZ`;
}

export function triggerPopupPrint(
  options: BarcodeOptions,
  selectedItem?: CatalogItem | null,
  quantity: number = 1
) {
  const printerW = options.printerWidthInches || 2.0;
  const printerH = options.printerHeightInches || 1.0;
  const pageSizeCss = options.pageSizeCss || `${printerW}in ${printerH}in`;

  // Create an offscreen SVG container to render exact retail label SVG
  const container = document.createElement('div');
  container.style.display = 'none';
  document.body.appendChild(container);

  let labelsHtml = '';

  for (let i = 0; i < quantity; i++) {
    const svgEl = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svgEl.setAttribute('xmlns', 'http://www.w3.org/2000/svg');

    if (options.labelMode === 'barcodeOnly') {
      JsBarcode(svgEl, options.text.trim(), {
        format: options.format,
        lineColor: '#000000',
        background: 'transparent',
        width: Math.max(1, options.width * 0.85),
        height: Math.min(45, options.height * 0.7),
        displayValue: true,
        font: options.font,
        fontSize: 11,
        margin: 2,
        narrowWideRatio: options.narrowWideRatio || 3,
      } as any);
    } else {
      renderRetailLabelSvg(svgEl, {
        ...options,
        itemCode: selectedItem ? selectedItem.itemCode : options.itemCode,
        itemName: options.itemName || (selectedItem ? selectedItem.itemName : 'Product Item'),
        price: options.price ? formatPriceWithSymbol(options.price) : (selectedItem ? formatPriceWithSymbol(selectedItem.price) : 'SAR 5.00'),
      });
    }

    container.appendChild(svgEl);
    labelsHtml += `<div class="zebra-label-item">${svgEl.outerHTML}</div>`;
  }

  document.body.removeChild(container);

  // Open the popup window
  const popup = window.open('', '_blank', 'width=550,height=650,scrollbars=yes,resizable=yes');
  if (!popup) {
    // Fallback if popup blocked
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
        ${labelsHtml}
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
}

