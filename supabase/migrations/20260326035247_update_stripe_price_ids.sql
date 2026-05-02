-- Migration: update_stripe_price_ids
-- Add stripe_product_id column and update stripe price tracking

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS stripe_product_id TEXT;
