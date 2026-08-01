export type BarcodeFormat =
  | 'CODE128'
  | 'CODE128A'
  | 'CODE128B'
  | 'CODE128C'
  | 'EAN13'
  | 'EAN8'
  | 'UPC'
  | 'CODE39'
  | 'ITF14'
  | 'ITF'
  | 'MSI'
  | 'pharmacode'
  | 'codabar';

export interface BarcodeOptions {
  text: string;
  format: BarcodeFormat;
  lineColor: string;
  background: string;
  width: number; // bar width in px
  height: number; // bar height in px
  displayValue: boolean;
  font: string;
  fontSize: number;
  fontPosition: 'bottom' | 'top';
  textAlign: 'left' | 'center' | 'right';
  textMargin: number;
  margin: number;
  flat: boolean;
  // Retail Label Frame (Photo attachment preset layout)
  labelMode?: 'retailFrame' | 'barcodeOnly';
  itemCode?: string;
  itemName?: string;
  price?: string;
  batch?: string;
  showBorder?: boolean;
  borderWidth?: number;
  borderTextGap?: number;
  barcodePriceGap?: number;
  fontWeight?: 'normal' | 'bold' | '900';
  letterSpacing?: number;
  wasfatyType?: 'Wasfaty' | 'Non-Wasfaty';
  printerPresetId?: string;
  printerWidthInches?: number;
  printerHeightInches?: number;
  activeFrameWidthInches?: number;
  activeFrameHeightInches?: number;
  pageSizeCss?: string;
}

export interface BarcodePreset {
  id: string;
  name: string;
  format: BarcodeFormat;
  sampleValue: string;
  description: string;
  category: 'Retail' | 'Logistics' | 'Inventory' | 'Specialized';
}

export interface CatalogItem {
  id: string;
  itemCode: string;
  itemName: string;
  price: string;
  mrp?: string;
  unitCost?: string;
  isVatted?: boolean;
  isDeactivated?: boolean;
  category?: string;
  afterDiscount?: string;
  format?: BarcodeFormat;
  createdAt?: number;
}

export interface BarcodeHistoryItem {
  id: string;
  title: string;
  text: string;
  format: BarcodeFormat;
  createdAt: number;
  options: BarcodeOptions;
}

export interface PriceUpdateItem {
  id?: string;
  itemCode: string;
  itemName: string;
  oldMrp: string;
  newMrp: string;
  oldUnitCost?: string;
  newUnitCost?: string;
  createdAt?: number;
}

export interface LabelSheetSettings {
  columns: number;
  rows: number;
  labelTitle: string;
  showPrice: boolean;
  price: string;
  showSku: boolean;
}
