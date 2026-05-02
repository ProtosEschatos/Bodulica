-- Migration: add_stripe_product_id
-- Add stripe_product_id to track Stripe product objects separately from price IDs

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS stripe_product_id TEXT;

COMMENT ON COLUMN products.stripe_product_id IS 'Stripe Product object ID (prod_xxx), separate from stripe_price_id (price_xxx)';
