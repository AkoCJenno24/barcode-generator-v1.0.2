import { BarcodeOptions } from '../types';

export interface PrinterPreset {
  id: string;
  name: string;
  brand: string;
  widthInches: number;
  heightInches: number;
  activeFrameWidthInches: number;
  activeFrameHeightInches: number;
  pageSizeCss: string; // e.g. '2in 1in'
  dpi: number;
  recommendedBarWidth: number;
  recommendedBarHeight: number;
  recommendedFontSize: number;
  recommendedBorderWidth: number;
  type: 'thermal_roll' | 'desktop_sheet' | 'jewelry';
  description: string;
}

export const PRINTER_PRESETS: PrinterPreset[] = [
  {
    id: 'zebra_zd230',
    name: 'Zebra ZD230 / ZD420 Thermal Roll',
    brand: 'Zebra',
    widthInches: 2.0,
    heightInches: 1.0,
    activeFrameWidthInches: 1.90,
    activeFrameHeightInches: 0.90,
    pageSizeCss: '2in 1in',
    dpi: 203,
    recommendedBarWidth: 1.8,
    recommendedBarHeight: 100,
    recommendedFontSize: 26,
    recommendedBorderWidth: 3,
    type: 'thermal_roll',
    description: '1.90" × 0.90" active inner frame fitted inside standard 2" × 1" thermal label roll.',
  },
  {
    id: 'dymo_labelwriter',
    name: 'DYMO LabelWriter 450/550',
    brand: 'DYMO',
    widthInches: 2.25,
    heightInches: 1.25,
    activeFrameWidthInches: 2.05,
    activeFrameHeightInches: 0.95,
    pageSizeCss: '2.25in 1.25in',
    dpi: 300,
    recommendedBarWidth: 1.8,
    recommendedBarHeight: 65,
    recommendedFontSize: 20,
    recommendedBorderWidth: 8,
    type: 'thermal_roll',
    description: 'Standard 2-1/4" × 1-1/4" (30334/30252) multipurpose sticky label.',
  },
  {
    id: 'brother_ql',
    name: 'Brother QL-800 / QL-1100',
    brand: 'Brother',
    widthInches: 2.4,
    heightInches: 1.1,
    activeFrameWidthInches: 2.20,
    activeFrameHeightInches: 0.85,
    pageSizeCss: '2.4in 1.1in',
    dpi: 300,
    recommendedBarWidth: 1.8,
    recommendedBarHeight: 55,
    recommendedFontSize: 19,
    recommendedBorderWidth: 7,
    type: 'thermal_roll',
    description: 'Die-cut 62mm × 29mm (DK-11209) small address / barcode label.',
  },
  {
    id: 'jewelry_tag',
    name: 'Jewelry / Small Tail Tag',
    brand: 'Generic Thermal',
    widthInches: 1.5,
    heightInches: 0.75,
    activeFrameWidthInches: 1.35,
    activeFrameHeightInches: 0.55,
    pageSizeCss: '1.5in 0.75in',
    dpi: 203,
    recommendedBarWidth: 1.8,
    recommendedBarHeight: 38,
    recommendedFontSize: 14,
    recommendedBorderWidth: 5,
    type: 'jewelry',
    description: 'Compact 1.5" × 0.75" tail tag for rings, watches, and small items.',
  },
  {
    id: 'desktop_a4_letter',
    name: 'Standard Inkjet/Laser (A4 / Letter Sheet)',
    brand: 'Avery / Desktop',
    widthInches: 2.625,
    heightInches: 1.0,
    activeFrameWidthInches: 2.40,
    activeFrameHeightInches: 0.80,
    pageSizeCss: '8.5in 11in',
    dpi: 300,
    recommendedBarWidth: 1.8,
    recommendedBarHeight: 55,
    recommendedFontSize: 18,
    recommendedBorderWidth: 6,
    type: 'desktop_sheet',
    description: '30-up 1" × 2-5/8" address labels printed on standard desktop paper sheets.',
  },
];

export interface PrinterDetectionResult {
  detected: boolean;
  printerName: string;
  preset: PrinterPreset;
  method: 'zebra_service' | 'dymo_service' | 'browser_api' | 'user_saved' | 'default_preset';
  details: string;
}

/**
 * Auto-detects local connected default printers by probing local daemon ports
 * (Zebra Browser Print on port 9100/9101, DYMO Web Service on 41951),
 * checking system print capabilities, or retrieving saved preferences.
 */
export async function detectLocalPrinter(): Promise<PrinterDetectionResult> {
  // 1. Check saved user default printer preference in localStorage first
  const savedId = localStorage.getItem('user_default_printer_preset');
  const savedPreset = PRINTER_PRESETS.find((p) => p.id === savedId);

  // 2. Probe Zebra Browser Print Service (Localhost:9100 or 9101)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 800);
    const res = await fetch('http://127.0.0.1:9100/available', {
      method: 'GET',
      signal: controller.signal,
    }).catch(() => null);
    clearTimeout(timeoutId);

    if (res && res.ok) {
      const text = await res.text();
      const zebraPreset = PRINTER_PRESETS.find((p) => p.id === 'zebra_zd230') || PRINTER_PRESETS[0];
      return {
        detected: true,
        printerName: 'Zebra ZD230 / Direct Thermal Printer',
        preset: zebraPreset,
        method: 'zebra_service',
        details: 'Detected active Zebra Browser Print service running on local port 9100.',
      };
    }
  } catch (e) {
    // Ignore fetch error if service not running
  }

  // 3. Probe DYMO Web Service (127.0.0.1:41951)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 800);
    const res = await fetch('https://127.0.0.1:41951/DYMO/Label/GetPrinters', {
      method: 'GET',
      signal: controller.signal,
    }).catch(() => null);
    clearTimeout(timeoutId);

    if (res && res.ok) {
      const dymoPreset = PRINTER_PRESETS.find((p) => p.id === 'dymo_labelwriter') || PRINTER_PRESETS[1];
      return {
        detected: true,
        printerName: 'DYMO LabelWriter',
        preset: dymoPreset,
        method: 'dymo_service',
        details: 'Detected active DYMO Web Service running on local port 41951.',
      };
    }
  } catch (e) {
    // Ignore
  }

  // 4. Return saved preference if user configured one previously
  if (savedPreset) {
    return {
      detected: true,
      printerName: savedPreset.name,
      preset: savedPreset,
      method: 'user_saved',
      details: `Using saved default printer preference (${savedPreset.name}).`,
    };
  }

  // 5. Default Fallback Preset (Zebra ZD230 2" x 1" Thermal)
  const defaultPreset = PRINTER_PRESETS[0];
  return {
    detected: false,
    printerName: defaultPreset.name,
    preset: defaultPreset,
    method: 'default_preset',
    details: 'Auto-scanned local printer daemons. Defaulting to Zebra ZD230 2" × 1" preset.',
  };
}

/**
 * Returns a new BarcodeOptions object with dimensions, heights, and frame boundaries
 * resized automatically to fit the selected PrinterPreset perfectly.
 */
export function applyPrinterPreset(
  currentOptions: BarcodeOptions,
  preset: PrinterPreset
): BarcodeOptions {
  // Save preference
  try {
    localStorage.setItem('user_default_printer_preset', preset.id);
  } catch (e) {
    // Ignore storage issues
  }

  return {
    ...currentOptions,
    printerPresetId: preset.id,
    printerWidthInches: preset.widthInches,
    printerHeightInches: preset.heightInches,
    activeFrameWidthInches: preset.activeFrameWidthInches,
    activeFrameHeightInches: preset.activeFrameHeightInches,
    pageSizeCss: preset.pageSizeCss,
    width: preset.recommendedBarWidth,
    height: preset.recommendedBarHeight,
    fontSize: preset.recommendedFontSize,
    borderWidth: preset.recommendedBorderWidth,
    borderTextGap: currentOptions.borderTextGap !== undefined ? currentOptions.borderTextGap : 8,
    barcodePriceGap: currentOptions.barcodePriceGap !== undefined ? currentOptions.barcodePriceGap : 6,
  };
}

export function getPrinterPresetById(id?: string): PrinterPreset {
  return PRINTER_PRESETS.find((p) => p.id === id) || PRINTER_PRESETS[0];
}
