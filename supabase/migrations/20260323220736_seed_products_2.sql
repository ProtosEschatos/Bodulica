-- Migration: seed_products_2
-- Additional indexes and constraints for e-commerce tables

-- Indexes for new tables
CREATE INDEX IF NOT EXISTS idx_product_images_product_id ON product_images(product_id);
CREATE INDEX IF NOT EXISTS idx_reviews_product_id ON reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_reviews_approved ON reviews(is_approved);
CREATE INDEX IF NOT EXISTS idx_faqs_product_id ON faqs(product_id);
CREATE INDEX IF NOT EXISTS idx_faqs_active ON faqs(is_active);
CREATE INDEX IF NOT EXISTS idx_webhook_events_stripe_id ON webhook_events(stripe_event_id);
CREATE INDEX IF NOT EXISTS idx_inventory_log_product_id ON inventory_log(product_id);

-- Additional orders columns for better tracking
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS tracking_number TEXT,
  ADD COLUMN IF NOT EXISTS shipped_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS refunded_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'EUR';
