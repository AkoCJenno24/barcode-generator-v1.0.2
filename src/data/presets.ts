import { BarcodePreset, BarcodeFormat } from '../types';

export const BARCODE_FORMAT_INFO: Record<
  BarcodeFormat,
  { name: string; description: string; placeholder: string; patternNote: string }
> = {
  CODE128: {
    name: 'Code 128 (Universal)',
    description: 'High-density barcode for letters, numbers, and symbols. Standard for logistics.',
    placeholder: 'ITEM-9982-XYZ',
    patternNote: 'Supports any ASCII character (letters, numbers, punctuation)',
  },
  CODE128A: {
    name: 'Code 128 A',
    description: 'Supports uppercase letters, numbers, and control characters.',
    placeholder: 'ABC123456',
    patternNote: 'Uppercase letters and numbers',
  },
  CODE128B: {
    name: 'Code 128 B',
    description: 'Supports uppercase & lowercase letters, numbers, and standard ASCII.',
    placeholder: 'Product-456-a',
    patternNote: 'Uppercase & lowercase letters and numbers',
  },
  CODE128C: {
    name: 'Code 128 C',
    description: 'Optimized for numeric data formatted in even-digit numeric pairs.',
    placeholder: '1234567890',
    patternNote: 'Must contain an even number of numeric digits',
  },
  EAN13: {
    name: 'EAN-13 (International Retail)',
    description: 'Standard retail barcode worldwide (13 digits).',
    placeholder: '978020137962',
    patternNote: 'Requires 12 digits (13th check digit calculated automatically)',
  },
  EAN8: {
    name: 'EAN-8 (Compact Retail)',
    description: 'Compressed retail code for small packaging (8 digits).',
    placeholder: '1234567',
    patternNote: 'Requires 7 digits (8th check digit calculated automatically)',
  },
  UPC: {
    name: 'UPC-A (North American Retail)',
    description: 'Standard 12-digit barcode used for retail products in US & Canada.',
    placeholder: '01234567890',
    patternNote: 'Requires 11 digits (12th check digit calculated automatically)',
  },
  CODE39: {
    name: 'Code 39 (Industrial & Military)',
    description: 'Alphanumeric code used in automotive, defense, and healthcare.',
    placeholder: 'AUTO-PART-99',
    patternNote: 'Supports uppercase A-Z, 0-9, space, and - . $ / + %',
  },
  ITF14: {
    name: 'ITF-14 (Carton Shipping)',
    description: 'Interleaved 2 of 5 used on shipping containers and outer cartons.',
    placeholder: '10012345678902',
    patternNote: 'Requires 13 digits (14th check digit calculated automatically)',
  },
  ITF: {
    name: 'ITF (Interleaved 2 of 5)',
    description: 'Numeric-only barcode for warehouse inventory.',
    placeholder: '1234567890',
    patternNote: 'Must contain an even number of digits',
  },
  MSI: {
    name: 'MSI Plessey',
    description: 'Numeric code primarily used for retail shelf labeling and inventory.',
    placeholder: '1234567',
    patternNote: 'Digits 0-9 only',
  },
  pharmacode: {
    name: 'Pharmacode',
    description: 'Pharmaceutical binary code used in online packaging control.',
    placeholder: '123456',
    patternNote: 'Integer numbers from 3 to 131070',
  },
  codabar: {
    name: 'Codabar',
    description: 'Numeric code with start/stop characters used in libraries and blood banks.',
    placeholder: 'A123456789B',
    patternNote: 'Starts and ends with A, B, C, or D; digits 0-9 and - $ : / . + inside',
  },
};

export const PRESETS: BarcodePreset[] = [
  {
    id: 'retail-ean13',
    name: 'Global Product (EAN-13)',
    format: 'EAN13',
    sampleValue: '501234567890',
    description: 'Standard 13-digit retail barcode for products.',
    category: 'Retail',
  },
  {
    id: 'us-upca',
    name: 'US Retail (UPC-A)',
    format: 'UPC',
    sampleValue: '01234567890',
    description: 'Standard North American retail barcode.',
    category: 'Retail',
  },
  {
    id: 'inventory-sku',
    name: 'Warehouse SKU (Code 128)',
    format: 'CODE128',
    sampleValue: 'SKU-LOG-88492-X',
    description: 'High-density alphanumeric barcode for warehouse items.',
    category: 'Inventory',
  },
  {
    id: 'book-isbn',
    name: 'Book ISBN (EAN-13)',
    format: 'EAN13',
    sampleValue: '978020137962',
    description: 'ISBN book code barcode standard.',
    category: 'Retail',
  },
  {
    id: 'asset-tag',
    name: 'Asset Tag (Code 39)',
    format: 'CODE39',
    sampleValue: 'PROP-2026-904',
    description: 'Industrial asset tracking code.',
    category: 'Logistics',
  },
  {
    id: 'carton-itf14',
    name: 'Carton Master (ITF-14)',
    format: 'ITF14',
    sampleValue: '10012345678902',
    description: 'Shipping carton barcode for pallet tracking.',
    category: 'Logistics',
  },
  {
    id: 'pharma-code',
    name: 'Medicine Package (Pharmacode)',
    format: 'pharmacode',
    sampleValue: '48201',
    description: 'Pharmaceutical packaging packaging check code.',
    category: 'Specialized',
  },
];
