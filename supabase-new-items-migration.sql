-- ============================================================
-- Park N Munch — "New Items" Category Migration
-- Run this in Supabase → SQL Editor before the "New Items"
-- feature will work on the live site / admin panel.
-- Mirrors the existing `popular` / `popular_order` pattern.
-- ============================================================

ALTER TABLE products ADD COLUMN IF NOT EXISTS new_item       BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE products ADD COLUMN IF NOT EXISTS new_item_order INTEGER;

CREATE INDEX IF NOT EXISTS products_new_item_idx ON products(new_item);

-- ============================================================
-- SEED — The Dealer's Box & X5 - Munch Box for 2
-- Both use the new "Box Builder" customisation (isBoxBuilder),
-- handled by openBoxBuilderModal() in js/order.js. slug is the
-- unique key for upserts — safe to re-run.
-- ============================================================

INSERT INTO products (name, slug, category, description, price, image_url, emoji, active, popular, new_item, new_item_order, sort_order, modifiers)
VALUES

('The Dealer''s Box', 'dealers-box', 'box-deals',
 'Choose ANY 1 whip from the menu, with any add-ons, served with our Nashville loaded fries and a drink of your choice.',
 9.99, 'images/the-dealers-box-image.jpeg', '📦', true, false, true, 10, 80,
 '{"isBoxBuilder": true, "boxBuilderCount": 1, "boxBuilderDrink": true}'),

('X5 - Munch Box for 2', 'x5-munchbox-for-2', 'box-deals',
 'Choose ANY 2 whips from the menu, with any add-ons, served with our Nashville loaded fries. Maximum performance.',
 14.99, 'images/X5-munchbox-for-two-image.jpeg', '📦', true, false, true, 20, 90,
 '{"isBoxBuilder": true, "boxBuilderCount": 2, "boxBuilderDrink": false}')

ON CONFLICT (slug) DO UPDATE SET
  name        = EXCLUDED.name,
  category    = EXCLUDED.category,
  description = EXCLUDED.description,
  price       = EXCLUDED.price,
  image_url   = EXCLUDED.image_url,
  emoji       = EXCLUDED.emoji,
  active      = EXCLUDED.active,
  popular     = EXCLUDED.popular,
  new_item    = EXCLUDED.new_item,
  new_item_order = EXCLUDED.new_item_order,
  sort_order  = EXCLUDED.sort_order,
  modifiers   = EXCLUDED.modifiers;
