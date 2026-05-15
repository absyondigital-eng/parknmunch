-- ============================================================
-- Park N Munch — Products Table Migration & Seed
-- Safe to run even if the table already exists (uuid id)
-- Run in Supabase → SQL Editor
-- ============================================================

-- 1. Add every column individually — safe if already present
ALTER TABLE products ADD COLUMN IF NOT EXISTS name        TEXT         NOT NULL DEFAULT '';
ALTER TABLE products ADD COLUMN IF NOT EXISTS slug        TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS category    TEXT         NOT NULL DEFAULT '';
ALTER TABLE products ADD COLUMN IF NOT EXISTS description TEXT         NOT NULL DEFAULT '';
ALTER TABLE products ADD COLUMN IF NOT EXISTS price       NUMERIC(8,2) NOT NULL DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS image_url   TEXT         NOT NULL DEFAULT '';
ALTER TABLE products ADD COLUMN IF NOT EXISTS emoji       TEXT         NOT NULL DEFAULT '🍔';
ALTER TABLE products ADD COLUMN IF NOT EXISTS active      BOOLEAN      NOT NULL DEFAULT true;
ALTER TABLE products ADD COLUMN IF NOT EXISTS featured    BOOLEAN      NOT NULL DEFAULT false;
ALTER TABLE products ADD COLUMN IF NOT EXISTS popular     BOOLEAN      NOT NULL DEFAULT false;
ALTER TABLE products ADD COLUMN IF NOT EXISTS sort_order  INTEGER      NOT NULL DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS modifiers   JSONB        NOT NULL DEFAULT '{}';

-- 2. Add unique constraint on slug (skip if exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'products_slug_key'
  ) THEN
    ALTER TABLE products ADD CONSTRAINT products_slug_key UNIQUE (slug);
  END IF;
END $$;

-- 3. Indexes
CREATE INDEX IF NOT EXISTS products_category_idx   ON products(category);
CREATE INDEX IF NOT EXISTS products_active_idx     ON products(active);
CREATE INDEX IF NOT EXISTS products_popular_idx    ON products(popular);
CREATE INDEX IF NOT EXISTS products_sort_order_idx ON products(sort_order);

-- 4. Enable Row Level Security
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies
DROP POLICY IF EXISTS "Public read active products" ON products;
DROP POLICY IF EXISTS "Admin read all products"     ON products;
DROP POLICY IF EXISTS "Admin manage products"       ON products;

CREATE POLICY "Public read active products"
  ON products FOR SELECT TO anon
  USING (active = true);

CREATE POLICY "Admin read all products"
  ON products FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admin manage products"
  ON products FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- 6. Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE products;

-- ============================================================
-- SEED DATA — slug is the unique key for upserts
-- ============================================================

INSERT INTO products (name, slug, category, description, price, image_url, emoji, active, popular, sort_order, modifiers)
VALUES

-- ── BURGERS ───────────────────────────────────────────────────────────────
('RS3',   'rs3',   'burgers', 'Chicken, Lettuce, Cheese, And Homemade Sauce',                                                                      5.49, 'images/rs3-image.jpeg',    '🍔', true, false, 10, '{"hasStyle": true}'),
('RS5',   'rs5',   'burgers', 'Double Chicken Fillet, Lettuce, Cheese, And Homemade Sauce',                                                        6.49, 'images/rs5-image.jpeg',    '🍔', true, true,  20, '{"hasStyle": true}'),
('RS6',   'rs6',   'burgers', 'Nashville Chicken Fillet With Lettuce, Gherkins, Cheese, And Homemade Sauce',                                       6.49, 'images/rs6-image.jpeg',    '🍔', true, false, 30, '{}'),
('C63',   'c63',   'burgers', 'Single Smash Patty With Lettuce, Caramelised Onions, Gherkins, Tomatoes, Cheese, And Homemade Sauce',               5.49, 'images/c63-image.jpeg',    '🍔', true, false, 40, '{}'),
('E63',   'e63',   'burgers', 'Double Smash Patties With Lettuce, Caramelised Onions, Gherkins, Tomatoes, Cheese, And Homemade Sauce',             6.49, 'images/e63-image.jpeg',    '🍔', true, true,  50, '{}'),
('G63',   'g63',   'burgers', 'Triple Smash Patties With Lettuce, Caramelised Onions, Gherkins, Tomatoes, Cheese, And Homemade Sauce',             7.49, 'images/g63-image.jpeg',    '🍔', true, true,  60, '{}'),
('M5',    'm5',    'burgers', 'Chicken Fillet Meets Smash Patty With Lettuce, Caramelised Onions, Gherkins, Tomatoes, Cheese, And Homemade Sauce', 7.99, 'images/m5-image.jpeg',     '🍔', true, false, 70, '{}'),

-- ── WRAPS ─────────────────────────────────────────────────────────────────
('S3',    's3',    'wraps', 'Chicken, Lettuce, Cheese, And Homemade Sauce',         5.99, 'images/s3-wrap-image.jpeg',  '🌯', true, false, 10, '{}'),
('GTI',   'gti',   'wraps', 'Stir Fry Donner, Lettuce, And Two Homemade Sauces',   5.49, 'images/gti-wrap-image.jpeg', '🌯', true, false, 20, '{}'),

-- ── LOADED FRIES ──────────────────────────────────────────────────────────
('RSQ3',   'rsq3',   'loaded-fries', 'Loaded Nashville Chicken', 7.99, 'images/rsq3-image.jpeg',  '🍟', true, true,  10, '{}'),
('A45',    'a45',    'loaded-fries', 'Loaded Beef',              7.99, 'images/a45-image.jpeg',   '🍟', true, false, 20, '{}'),
('Golf R', 'golf-r', 'loaded-fries', 'Loaded Stir Fry Donner',  5.99, 'images/golfr-image.jpeg', '🍟', true, false, 30, '{}'),

-- ── MUNCHBOXES ────────────────────────────────────────────────────────────
('Full Throttle - Nashville Loaded',           'full-throttle-nashville',           'box-deals', 'Nashville Chicken Burger, Loaded Nashville Fries, Salad, And Homemade Sauce Dip',               10.49, 'images/full-throttle-nashville-loaded-image.jpeg',          '📦', true, true,  10, '{}'),
('Full Throttle - Stir Fry Donner Loaded',     'full-throttle-stir-fry-donner',     'box-deals', 'Nashville Chicken Burger, Loaded Stir Fry Donner Fries, Salad, And Homemade Sauce Dip',        10.49, 'images/full-throttle-stir-fry-donner-image.jpeg',           '📦', true, true,  20, '{}'),
('Burnout Beef - Nashville Loaded',            'burnout-beef-nashville',            'box-deals', 'Double Smash Burger, Loaded Nashville Fries, Salad, And Homemade Sauce Dip',                   11.99, 'images/burnout-beef-nashville-loaded-image.jpeg',           '📦', true, true,  30, '{}'),
('Burnout Beef - Stir Fry Donner Loaded',      'burnout-beef-stir-fry-donner',      'box-deals', 'Double Smash Burger, Loaded Stir Fry Donner Fries, Salad, And Homemade Sauce Dip',             11.99, 'images/burnout-beef-stir-fry-donner-image.jpeg',            '📦', true, false, 40, '{}'),
('Powerhouse Deluxe - Nashville Loaded',       'powerhouse-deluxe-nashville',       'box-deals', 'Smash Patty With Chicken Fillet, Loaded Nashville Fries, Salad, And Homemade Sauce Dip',      12.99, 'images/powerhouse-deluxe-nashville-loaded-image.jpeg',      '📦', true, true,  50, '{}'),
('Powerhouse Deluxe - Stir Fry Donner Loaded', 'powerhouse-deluxe-stir-fry-donner', 'box-deals', 'Smash Patty With Chicken Fillet, Loaded Stir Fry Donner Fries, Salad, And Homemade Sauce Dip',12.99, 'images/powerhouse-deluxe-stir-fry-donner-image.jpeg',       '📦', true, false, 60, '{}'),
('My Garage',                                  'my-garage',                         'box-deals', 'Select Your 3 ''Whips''',                                                                       16.49, 'images/my-garage-image.jpeg',                              '📦', true, false, 70, '{"isGarage": true}'),

-- ── KIDS ──────────────────────────────────────────────────────────────────
('Mini Cooper', 'mini-cooper', 'kids', 'Nuggets, Popcorn Chicken, Fries, Homemade Sauce, And A Fruit Shoot', 4.99, 'images/minicooper-image.jpeg', '🧒', true, false, 10, '{}'),

-- ── SIDES ─────────────────────────────────────────────────────────────────
('Nuggets',         'nuggets',         'sides', 'Crispy Chicken Nuggets',                                        2.49, 'images/nuggest-image.jpeg',     '🍗', true, false, 10, '{}'),
('Popcorn Chicken', 'popcorn-chicken', 'sides', 'Bite-Sized Crispy Chicken Pieces, Perfectly Seasoned',          1.99, 'images/popcorn-image.jpeg',     '🍗', true, false, 20, '{}'),
('Fries',           'fries',           'sides', 'Crispy Golden Fries With House Seasoning',                      1.00, 'images/fries-image.jpeg',       '🍟', true, false, 30, '{}'),
('Curly Fries',     'curly-fries',     'sides', 'Crispy Seasoned Curly Fries',                                   1.99, 'images/curly-fries-image.jpeg', '🍟', true, false, 40, '{}'),
('Cans',            'cans',            'sides', 'Coca Cola, Diet Coca Cola, Sprite, Irn Bru, Or Rubicon Mango',  1.00, 'images/cans-image.jpeg',        '🫙', true, false, 50, '{"hasDrinkChoice": true}'),

-- ── CAKES ─────────────────────────────────────────────────────────────────
('Matilda Cake', 'matilda-cake', 'cakes', 'Rich And Dense Chocolate Cake', 5.49, 'images/matilda-cake-image.jpeg', '🍰', true, true, 10, '{}'),

-- ── MILKSHAKES ────────────────────────────────────────────────────────────
('Oreo Shake',    'oreo-shake',    'milkshakes', '', 4.99, 'images/oreo-shake-image.jpeg',    '🥤', true, true,  10, '{}'),
('Lotus Shake',   'lotus-shake',   'milkshakes', '', 4.99, 'images/lotus-shake-image.jpeg',   '🥤', true, true,  20, '{}'),
('Kinder Shake',  'kinder-shake',  'milkshakes', '', 4.99, 'images/kinder-shake-image.jpeg',  '🥤', true, true,  30, '{}'),
('Ferrero Shake', 'ferrero-shake', 'milkshakes', '', 4.99, 'images/ferrero-shake-image.jpeg', '🥤', true, false, 40, '{}')

ON CONFLICT (slug) DO UPDATE SET
  name        = EXCLUDED.name,
  category    = EXCLUDED.category,
  description = EXCLUDED.description,
  price       = EXCLUDED.price,
  image_url   = EXCLUDED.image_url,
  emoji       = EXCLUDED.emoji,
  active      = EXCLUDED.active,
  popular     = EXCLUDED.popular,
  sort_order  = EXCLUDED.sort_order,
  modifiers   = EXCLUDED.modifiers;
