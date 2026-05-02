-- Migration: add_is_unique_column
-- Add is_unique flag to products to mark handmade/one-of-a-kind items

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS is_unique BOOLEAN DEFAULT false;

-- Update existing products that might be unique
-- (products with stock_quantity = 1 could be marked as unique)
COMMENT ON COLUMN products.is_unique IS 'True for handmade/one-of-a-kind items that should be deactivated after purchase';
