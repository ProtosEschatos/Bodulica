-- Migration: add_image_url_to_products
-- Add image_url column to products table

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS image_url TEXT;
