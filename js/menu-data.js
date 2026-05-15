/* ============================================================
   Park N Munch — Static Menu Config
   MENU and POPULAR_IDS are populated at runtime by supabase-menu.js.
   This file only contains constants that never change.
   ============================================================ */

const CATEGORIES = [
  { id: 'all',          label: 'All',           emoji: '⚡' },
  { id: 'popular',      label: 'Popular',        emoji: '🔥' },
  { id: 'burgers',      label: 'Burgers',        emoji: '🍔' },
  { id: 'munchboxes',   label: 'Munchboxes',     emoji: '📦' },
  { id: 'loaded-fries', label: 'Loaded Fries',   emoji: '🍟' },
  { id: 'wraps',        label: 'Wraps',          emoji: '🌯' },
  { id: 'fuel-station', label: 'Fuel Station',   emoji: '⛽' },
  { id: 'cakes',        label: 'Cakes',          emoji: '🍰' },
  { id: 'sides',        label: 'Sides',          emoji: '🍗' },
];

/* Virtual categories: map one tab id to multiple real category ids */
const VIRTUAL_CATS = {
  'munchboxes':   ['box-deals'],
  'fuel-station': ['milkshakes'],
};

/* ---- Burger customisation data (static — not in DB) ---- */
const BURGER_ADDONS = [
  { id: 'smash',  name: 'Smash patty',    price: 1.49 },
  { id: 'fillet', name: 'Chicken fillet', price: 1.00 },
  { id: 'donner', name: 'Donner',         price: 1.49 },
  { id: 'cheese', name: 'Cheese',         price: 0.30 },
];

const MEAL_DRINKS = [
  'Coca Cola',
  'Diet Coca Cola',
  'Sprite',
  'Irn Bru',
  'Rubicon Mango',
];

const CANS_DRINKS = [
  'Coca Cola',
  'Diet Coca Cola',
  'Sprite',
  'Irn Bru',
  'Rubicon Mango',
];

const MEAL_UPGRADE_PRICE = 1.50;

/* ---- Populated at runtime by supabase-menu.js ---- */
let MENU        = [];
let POPULAR_IDS = [];
