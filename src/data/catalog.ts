import { CatalogItem } from '../types';

export const DEFAULT_CATALOG_ITEMS: CatalogItem[] = [
  {
    id: 'item-11002546',
    itemCode: '11002546',
    itemName: 'Ball point pen',
    price: '5.00 SAR',
    category: 'Stationery',
    format: 'CODE39',
    createdAt: Date.now() - 500000,
  },
  {
    id: 'item-10029384',
    itemCode: '10029384',
    itemName: 'A4 Copy Paper (500 sheets)',
    price: '25.00 SAR',
    category: 'Stationery',
    format: 'CODE39',
    createdAt: Date.now() - 400000,
  },
  {
    id: 'item-77391024',
    itemCode: '77391024',
    itemName: 'Stainless Steel Ruler 30cm',
    price: '12.00 SAR',
    category: 'Tools',
    format: 'CODE39',
    createdAt: Date.now() - 300000,
  },
  {
    id: 'item-99281045',
    itemCode: '99281045',
    itemName: 'Sticky Notes Yellow 3x3',
    price: '4.00 SAR',
    category: 'Office',
    format: 'CODE39',
    createdAt: Date.now() - 200000,
  },
  {
    id: 'item-55401928',
    itemCode: '55401928',
    itemName: 'Ergonomic Wireless Mouse',
    price: '65.00 SAR',
    category: 'Electronics',
    format: 'CODE39',
    createdAt: Date.now() - 100000,
  },
];
