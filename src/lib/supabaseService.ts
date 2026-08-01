import { supabase, isSupabaseConfigured } from './supabase';
import { CatalogItem, BarcodeHistoryItem, BarcodeOptions, PriceUpdateItem } from '../types';
import { formatPriceWithDecimals } from '../utils/barcodeUtils';

export interface SupabaseResponse<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
}

export interface SupabaseCatalogItemRow {
  id: string;
  item_code: string;
  item_name: string;
  price: string | number;
  mrp?: string | number;
  unit_cost?: string | number;
  is_vatted?: boolean;
  is_deactivated?: boolean;
  category?: string;
  after_discount?: string | number | null;
  format?: string;
  created_at?: string;
  user_id?: string;
}

export interface SupabasePriceUpdateRow {
  id?: string;
  item_code?: string;
  item_name?: string;
  old_mrp?: string | number;
  new_mrp?: string | number;
  old_unit_cost?: string | number;
  new_unit_cost?: string | number;
  created_at?: string;
  user_id?: string;
}

function cleanNumericForDb(val: string | number | undefined | null): number | null {
  if (val === undefined || val === null) return null;
  const str = String(val).trim();
  const match = str.match(/(\d+(?:\.\d+)?)/);
  if (match) {
    const num = parseFloat(match[1]);
    return isNaN(num) ? null : num;
  }
  return null;
}

function prepareUnitCostForDb(val: string | number | undefined | null): number | string | null {
  if (val === undefined || val === null) return null;
  const str = String(val).trim();
  if (!str) return null;
  const num = cleanNumericForDb(str);
  return num !== null ? num : str;
}

export interface SupabaseSavedBarcodeRow {
  id: string;
  title: string;
  text: string;
  format: string;
  options: BarcodeOptions;
  created_at?: string;
  user_id?: string;
}

/**
 * Tests database connectivity by making a lightweight query.
 */
export async function testSupabaseConnection(): Promise<{
  success: boolean;
  message: string;
  details?: unknown;
}> {
  if (!isSupabaseConfigured) {
    return {
      success: false,
      message: 'Supabase credentials are missing or unconfigured in environment variables.',
    };
  }

  try {
    // Attempt a light query on catalog_items or auth
    const { error } = await supabase.from('catalog_items').select('id', { count: 'exact', head: true });

    if (error) {
      // If table does not exist yet (PGRST204 or 42P01), connection to Supabase itself succeeded
      if (error.code === '42P01' || error.message.includes('relation "public.catalog_items" does not exist')) {
        return {
          success: true,
          message: 'Connected to Supabase! Tables need initialization (SQL schema generator available below).',
          details: error,
        };
      }
      return {
        success: false,
        message: `Supabase Error (${error.code || 'Query Error'}): ${error.message}`,
        details: error,
      };
    }

    return {
      success: true,
      message: 'Successfully connected to Supabase database!',
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      message: `Network or Connection Error: ${errorMsg}`,
      details: err,
    };
  }
}

/**
 * Catalog Items CRUD Operations
 */

export async function fetchCatalogItemsFromSupabase(): Promise<{
  data: CatalogItem[] | null;
  error: string | null;
}> {
  try {
    let allRows: SupabaseCatalogItemRow[] = [];
    let page = 0;
    const pageSize = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await supabase
        .from('catalog_items')
        .select('*')
        .order('created_at', { ascending: false })
        .order('id', { ascending: true })
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (error) {
        if (allRows.length > 0) break;
        return { data: null, error: error.message };
      }

      if (!data || data.length === 0) {
        hasMore = false;
      } else {
        allRows = allRows.concat(data as SupabaseCatalogItemRow[]);
        if (data.length < pageSize) {
          hasMore = false;
        } else {
          page++;
        }
      }
      // Safety guard max 50 pages (50,000 items)
      if (page >= 50) break;
    }

    const seenIds = new Set<string>();
    const items: CatalogItem[] = [];
    allRows.forEach((row: SupabaseCatalogItemRow, idx: number) => {
      const rawId = String(row.id || `sup_${Date.now()}_${idx}`);
      if (seenIds.has(rawId)) {
        // Skip duplicate records returned across page boundaries
        return;
      }
      seenIds.add(rawId);
      items.push({
        id: rawId,
        itemCode: String(row.item_code || ''),
        itemName: String(row.item_name || ''),
        price: formatPriceWithDecimals(row.price),
        mrp: row.mrp ? formatPriceWithDecimals(row.mrp) : formatPriceWithDecimals(row.price),
        unitCost: row.unit_cost ? String(row.unit_cost) : '',
        isVatted: Boolean(row.is_vatted),
        isDeactivated: Boolean(row.is_deactivated),
        category: row.category ? String(row.category) : 'General',
        afterDiscount: row.after_discount !== undefined && row.after_discount !== null && String(row.after_discount).trim() !== '' ? formatPriceWithDecimals(row.after_discount) : undefined,
        format: (row.format || 'CODE128') as CatalogItem['format'],
        createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
      });
    });

    return { data: items, error: null };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { data: null, error: msg };
  }
}

export async function fetchCreatedItemsByDateRange(
  fromDate?: string,
  toDate?: string
): Promise<{ data: CatalogItem[] | null; error: string | null }> {
  try {
    let query = supabase.from('catalog_items').select('*').order('created_at', { ascending: false });

    if (fromDate) {
      const startIso = new Date(`${fromDate}T00:00:00.000`).toISOString();
      query = query.gte('created_at', startIso);
    }
    if (toDate) {
      const endIso = new Date(`${toDate}T23:59:59.999`).toISOString();
      query = query.lte('created_at', endIso);
    }

    const { data, error } = await query;

    if (error) {
      return { data: null, error: error.message };
    }

    const items: CatalogItem[] = (data || []).map((row: SupabaseCatalogItemRow, idx: number) => ({
      id: String(row.id || `sup_${Date.now()}_${idx}`),
      itemCode: String(row.item_code || ''),
      itemName: String(row.item_name || ''),
      price: formatPriceWithDecimals(row.price),
      mrp: row.mrp ? formatPriceWithDecimals(row.mrp) : formatPriceWithDecimals(row.price),
      unitCost: row.unit_cost ? String(row.unit_cost) : '',
      isVatted: Boolean(row.is_vatted),
      isDeactivated: Boolean(row.is_deactivated),
      category: row.category ? String(row.category) : 'General',
      afterDiscount: row.after_discount !== undefined && row.after_discount !== null && String(row.after_discount).trim() !== '' ? formatPriceWithDecimals(row.after_discount) : undefined,
      format: (row.format || 'CODE128') as CatalogItem['format'],
      createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
    }));

    return { data: items, error: null };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { data: null, error: msg };
  }
}

export async function fetchPriceUpdatesByDateRange(
  fromDate?: string,
  toDate?: string
): Promise<{ data: PriceUpdateItem[] | null; error: string | null }> {
  try {
    let query = supabase.from('price_update').select('*').order('created_at', { ascending: false });

    if (fromDate) {
      const startIso = new Date(`${fromDate}T00:00:00.000`).toISOString();
      query = query.gte('created_at', startIso);
    }
    if (toDate) {
      const endIso = new Date(`${toDate}T23:59:59.999`).toISOString();
      query = query.lte('created_at', endIso);
    }

    const { data, error } = await query;

    if (error) {
      return { data: null, error: error.message };
    }

    const updates: PriceUpdateItem[] = (data || []).map((row: SupabasePriceUpdateRow, idx: number) => ({
      id: String(row.id || `pu_${Date.now()}_${idx}`),
      itemCode: String(row.item_code || ''),
      itemName: String(row.item_name || ''),
      oldMrp: row.old_mrp !== undefined && row.old_mrp !== null ? formatPriceWithDecimals(row.old_mrp) : '0 SAR',
      newMrp: row.new_mrp !== undefined && row.new_mrp !== null ? formatPriceWithDecimals(row.new_mrp) : '0 SAR',
      oldUnitCost: row.old_unit_cost !== undefined && row.old_unit_cost !== null ? String(row.old_unit_cost) : '',
      newUnitCost: row.new_unit_cost !== undefined && row.new_unit_cost !== null ? String(row.new_unit_cost) : '',
      createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
    }));

    return { data: updates, error: null };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { data: null, error: msg };
  }
}

export async function insertPriceUpdateToSupabase(
  itemCode: string,
  itemName: string,
  oldMrp: string,
  newMrp: string,
  oldUnitCost?: string,
  newUnitCost?: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    const oldMrpNum = cleanNumericForDb(oldMrp);
    const newMrpNum = cleanNumericForDb(newMrp);

    const row: Record<string, any> = {
      item_code: itemCode,
      item_name: itemName,
      old_mrp: oldMrpNum !== null ? oldMrpNum : oldMrp,
      new_mrp: newMrpNum !== null ? newMrpNum : newMrp,
      old_unit_cost: prepareUnitCostForDb(oldUnitCost),
      new_unit_cost: prepareUnitCostForDb(newUnitCost),
      created_at: new Date().toISOString(),
    };

    let { error } = await supabase.from('price_update').insert([row]);

    if (error) {
      // Fallback with raw strings or stripped unit_cost if column doesn't exist
      const errLower = error.message.toLowerCase();
      const fallbackRow: Record<string, any> = {
        item_code: itemCode,
        item_name: itemName,
        old_mrp: formatPriceWithDecimals(oldMrp),
        new_mrp: formatPriceWithDecimals(newMrp),
        created_at: new Date().toISOString(),
      };

      if (!errLower.includes('old_unit_cost') && !errLower.includes('unit_cost')) {
        fallbackRow.old_unit_cost = oldUnitCost ? String(oldUnitCost).trim() : null;
        fallbackRow.new_unit_cost = newUnitCost ? String(newUnitCost).trim() : null;
      }

      const retryRes = await supabase.from('price_update').insert([fallbackRow]);
      if (retryRes.error) {
        delete fallbackRow.old_unit_cost;
        delete fallbackRow.new_unit_cost;
        const finalRetry = await supabase.from('price_update').insert([fallbackRow]);
        if (finalRetry.error) {
          return { success: false, error: error.message };
        }
      }
    }

    return { success: true, error: null };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }
}

export async function insertCatalogItemToSupabase(
  item: Omit<CatalogItem, 'id'> & { id?: string }
): Promise<{ data: CatalogItem | null; error: string | null }> {
  try {
    const id = item.id || `sup_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const priceNum = cleanNumericForDb(item.price);
    const mrpNum = cleanNumericForDb(item.mrp || item.price);
    const unitCostVal = prepareUnitCostForDb(item.unitCost);
    const afterDiscountVal = item.afterDiscount && item.afterDiscount.trim() !== '' ? cleanNumericForDb(item.afterDiscount) : null;

    const row: Record<string, any> = {
      id,
      item_code: item.itemCode,
      item_name: item.itemName,
      price: priceNum !== null ? priceNum : item.price,
      mrp: mrpNum !== null ? mrpNum : (item.mrp || item.price),
      unit_cost: unitCostVal,
      is_vatted: Boolean(item.isVatted),
      is_deactivated: Boolean(item.isDeactivated),
      category: item.category || 'General',
      after_discount: afterDiscountVal !== null ? afterDiscountVal : (item.afterDiscount?.trim() || null),
      format: item.format || 'CODE128',
      created_at: new Date().toISOString(),
    };

    let { data, error } = await supabase
      .from('catalog_items')
      .insert([row])
      .select()
      .single();

    if (error && (error.message.toLowerCase().includes('schema cache') || error.message.toLowerCase().includes('syntax'))) {
      // Retry with string values for unit_cost if type conversion failed
      const fallbackRow = {
        ...row,
        unit_cost: item.unitCost ? String(item.unitCost).trim() : null,
      };

      const retryRes = await supabase
        .from('catalog_items')
        .insert([fallbackRow])
        .select()
        .single();

      if (!retryRes.error) {
        data = retryRes.data;
        error = null;
      }
    }

    if (error) {
      return { data: null, error: error.message };
    }

    const createdItem: CatalogItem = {
      id: String(data.id),
      itemCode: String(data.item_code || item.itemCode),
      itemName: String(data.item_name || item.itemName),
      price: formatPriceWithDecimals(data.price || item.price),
      mrp: data.mrp !== undefined && data.mrp !== null
        ? formatPriceWithDecimals(data.mrp)
        : (item.mrp ? formatPriceWithDecimals(item.mrp) : formatPriceWithDecimals(data.price || item.price)),
      unitCost: data.unit_cost !== undefined && data.unit_cost !== null ? String(data.unit_cost) : (item.unitCost || ''),
      isVatted: Boolean(data.is_vatted ?? item.isVatted),
      isDeactivated: Boolean(data.is_deactivated ?? item.isDeactivated),
      category: data.category ? String(data.category) : (item.category || 'General'),
      afterDiscount: data.after_discount !== undefined && data.after_discount !== null && String(data.after_discount).trim() !== ''
        ? formatPriceWithDecimals(data.after_discount)
        : (item.afterDiscount || undefined),
      format: (data.format || item.format || 'CODE128') as CatalogItem['format'],
      createdAt: data.created_at ? new Date(data.created_at).getTime() : Date.now(),
    };

    return { data: createdItem, error: null };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { data: null, error: msg };
  }
}

export async function updateCatalogItemInSupabase(
  id: string,
  updates: Partial<CatalogItem>
): Promise<{ data: CatalogItem | null; error: string | null }> {
  try {
    const dbUpdates: Record<string, any> = {};
    if (updates.itemCode !== undefined) dbUpdates.item_code = updates.itemCode;
    if (updates.itemName !== undefined) dbUpdates.item_name = updates.itemName;
    if (updates.price !== undefined) {
      const pNum = cleanNumericForDb(updates.price);
      dbUpdates.price = pNum !== null ? pNum : updates.price;
    }
    if (updates.mrp !== undefined) {
      const mNum = cleanNumericForDb(updates.mrp);
      dbUpdates.mrp = mNum !== null ? mNum : updates.mrp;
    }
    if (updates.unitCost !== undefined) {
      dbUpdates.unit_cost = prepareUnitCostForDb(updates.unitCost);
    }
    if (updates.isVatted !== undefined) dbUpdates.is_vatted = updates.isVatted;
    if (updates.isDeactivated !== undefined) dbUpdates.is_deactivated = updates.isDeactivated;
    if (updates.category !== undefined) dbUpdates.category = updates.category;
    if (updates.afterDiscount !== undefined) {
      const adNum = updates.afterDiscount && updates.afterDiscount.trim() !== '' ? cleanNumericForDb(updates.afterDiscount) : null;
      dbUpdates.after_discount = adNum !== null ? adNum : (updates.afterDiscount?.trim() || null);
    }
    if (updates.format !== undefined) dbUpdates.format = updates.format;

    let { data, error } = await supabase
      .from('catalog_items')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error && (error.message.toLowerCase().includes('schema cache') || error.message.toLowerCase().includes('syntax'))) {
      const fallbackUpdates = { ...dbUpdates };
      if (updates.unitCost !== undefined) {
        fallbackUpdates.unit_cost = updates.unitCost ? String(updates.unitCost).trim() : null;
      }

      const retryRes = await supabase
        .from('catalog_items')
        .update(fallbackUpdates)
        .eq('id', id)
        .select()
        .single();

      if (!retryRes.error) {
        data = retryRes.data;
        error = null;
      }
    }

    if (error) {
      return { data: null, error: error.message };
    }

    const updatedItem: CatalogItem = {
      id: String(data.id),
      itemCode: String(data.item_code || updates.itemCode || ''),
      itemName: String(data.item_name || updates.itemName || ''),
      price: formatPriceWithDecimals(data.price || updates.price || '0 SAR'),
      mrp: data.mrp !== undefined && data.mrp !== null
        ? formatPriceWithDecimals(data.mrp)
        : (updates.mrp ? formatPriceWithDecimals(updates.mrp) : formatPriceWithDecimals(data.price || updates.price || '0 SAR')),
      unitCost: data.unit_cost !== undefined && data.unit_cost !== null ? String(data.unit_cost) : (updates.unitCost || ''),
      isVatted: data.is_vatted !== undefined ? Boolean(data.is_vatted) : (updates.isVatted ?? false),
      category: data.category ? String(data.category) : (updates.category || 'General'),
      afterDiscount: data.after_discount !== undefined && data.after_discount !== null && String(data.after_discount).trim() !== ''
        ? formatPriceWithDecimals(data.after_discount)
        : (updates.afterDiscount && String(updates.afterDiscount).trim() !== '' ? formatPriceWithDecimals(updates.afterDiscount) : undefined),
      format: (data.format || updates.format || 'CODE128') as CatalogItem['format'],
      createdAt: data.created_at ? new Date(data.created_at).getTime() : Date.now(),
    };

    return { data: updatedItem, error: null };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { data: null, error: msg };
  }
}

export async function deleteCatalogItemFromSupabase(
  id: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    const { error } = await supabase.from('catalog_items').delete().eq('id', id);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }
}

/**
 * Saved Barcodes / Designs CRUD Operations
 */

export async function fetchSavedBarcodesFromSupabase(): Promise<{
  data: BarcodeHistoryItem[] | null;
  error: string | null;
}> {
  try {
    const { data, error } = await supabase
      .from('saved_barcodes')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return { data: null, error: error.message };
    }

    const seenIds = new Set<string>();
    const items: BarcodeHistoryItem[] = [];
    (data || []).forEach((row: SupabaseSavedBarcodeRow, idx: number) => {
      const rawId = String(row.id || `bc_${Date.now()}_${idx}`);
      if (seenIds.has(rawId)) {
        // Skip duplicate records
        return;
      }
      seenIds.add(rawId);
      items.push({
        id: rawId,
        title: row.title,
        text: row.text,
        format: row.format as BarcodeHistoryItem['format'],
        options: row.options,
        createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
      });
    });

    return { data: items, error: null };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { data: null, error: msg };
  }
}

export async function insertSavedBarcodeToSupabase(
  barcode: Omit<BarcodeHistoryItem, 'id'> & { id?: string }
): Promise<{ data: BarcodeHistoryItem | null; error: string | null }> {
  try {
    const id = barcode.id || `bc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const row = {
      id,
      title: barcode.title,
      text: barcode.text,
      format: barcode.format,
      options: barcode.options,
      created_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('saved_barcodes')
      .insert([row])
      .select()
      .single();

    if (error) {
      return { data: null, error: error.message };
    }

    const createdBarcode: BarcodeHistoryItem = {
      id: data.id,
      title: data.title,
      text: data.text,
      format: data.format,
      options: data.options,
      createdAt: new Date(data.created_at).getTime(),
    };

    return { data: createdBarcode, error: null };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { data: null, error: msg };
  }
}

export async function deleteSavedBarcodeFromSupabase(
  id: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    const { error } = await supabase.from('saved_barcodes').delete().eq('id', id);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }
}

/**
 * Authentication Helpers
 */

export async function getCurrentSupabaseUser() {
  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error) return null;
    return user;
  } catch {
    return null;
  }
}

export async function signInSupabaseAnonymously() {
  try {
    const { data, error } = await supabase.auth.signInAnonymously();
    if (error) throw error;
    return { user: data.user, error: null };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { user: null, error: msg };
  }
}

export async function signOutSupabaseUser() {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    return { success: true, error: null };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }
}
