-- Add images array column to products table
-- This stores multiple image URLs per product
-- image_url remains as backward-compatible primary image

ALTER TABLE products ADD COLUMN IF NOT EXISTS images TEXT[] DEFAULT '{}';

-- Migrate existing image_url values into images array
UPDATE products SET images = ARRAY[image_url] WHERE image_url IS NOT NULL AND (images IS NULL OR images = '{}');
