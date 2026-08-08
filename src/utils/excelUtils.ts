import ExcelJS from 'exceljs';
import { CatalogItem } from '../types';
import { fetchCatalogItemsFromSupabase } from '../lib/supabaseService';

/**
 * Downloads all items from the catalog in Excel (.xlsx) format with clean cell borders & formatting.
 * Columns:
 * - Item Code (item_code)
 * - Item Name (item_name)
 * - Unit Cost (unit_cost)
 * - MRP (mrp)
 * - Price (price)
 * - Vatted (is_vatted) -> "Yes" if true else "No"
 */
export async function downloadAllItemsExcel(localCatalogItems: CatalogItem[]): Promise<number> {
  let itemsToExport: CatalogItem[] = localCatalogItems;

  try {
    const { data, error } = await fetchCatalogItemsFromSupabase();
    if (data && data.length > 0 && !error) {
      itemsToExport = data;
    }
  } catch (err) {
    console.warn('Using local catalog items fallback for Excel export:', err);
  }

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('All Items Catalog');

  worksheet.columns = [
    { header: 'Item Code', key: 'itemCode', width: 22 },
    { header: 'Item Name', key: 'itemName', width: 42 },
    { header: 'Unit Cost', key: 'unitCost', width: 16 },
    { header: 'MRP', key: 'mrp', width: 16 },
    { header: 'Price', key: 'price', width: 16 },
    { header: 'Vatted', key: 'isVatted', width: 14 },
  ];

  // Border style for header and data cells
  const cellBorder: Partial<ExcelJS.Borders> = {
    top: { style: 'thin', color: { argb: 'FF94A3B8' } },
    left: { style: 'thin', color: { argb: 'FF94A3B8' } },
    bottom: { style: 'thin', color: { argb: 'FF94A3B8' } },
    right: { style: 'thin', color: { argb: 'FF94A3B8' } },
  };

  // Header row formatting
  const headerRow = worksheet.getRow(1);
  headerRow.height = 26;
  headerRow.eachCell((cell) => {
    cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF0F172A' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE2E8F0' }, // Light slate background
    };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = cellBorder;
  });

  // Populate data rows
  itemsToExport.forEach((item) => {
    const row = worksheet.addRow({
      itemCode: item.itemCode || '',
      itemName: item.itemName || '',
      unitCost: item.unitCost !== undefined && item.unitCost !== null ? item.unitCost : '',
      mrp: item.mrp || item.price || '',
      price: item.price || '',
      isVatted: item.isVatted ? 'Yes' : 'No',
    });

    row.height = 20;

    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      cell.border = cellBorder;
      cell.font = { name: 'Calibri', size: 11 };

      if (colNumber === 1) {
        cell.alignment = { vertical: 'middle', horizontal: 'left' };
      } else if (colNumber === 2) {
        cell.alignment = { vertical: 'middle', horizontal: 'left' };
      } else if (colNumber >= 3 && colNumber <= 5) {
        cell.alignment = { vertical: 'middle', horizontal: 'right' };
      } else if (colNumber === 6) {
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      }
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const todayStr = new Date().toISOString().split('T')[0];
  a.download = `all_items_catalog_report_${todayStr}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);

  return itemsToExport.length;
}
