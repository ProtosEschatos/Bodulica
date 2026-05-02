-- Migration: seed_products_1
-- Initial product seed data for Bodulica suvenir shop
-- Note: Uses ON CONFLICT DO NOTHING to be idempotent

-- Additional tables for full e-commerce functionality
CREATE TABLE IF NOT EXISTS product_images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  is_primary BOOLEAN DEFAULT false,
  alt_text TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  customer_email TEXT NOT NULL,
  customer_name TEXT,
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  is_approved BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS faqs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS webhook_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_type TEXT NOT NULL,
  stripe_event_id TEXT UNIQUE,
  payload JSONB,
  processed BOOLEAN DEFAULT false,
  error TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inventory_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  change_type TEXT NOT NULL,
  quantity_change INTEGER NOT NULL,
  quantity_before INTEGER,
  quantity_after INTEGER,
  reference_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on new tables
ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE faqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_log ENABLE ROW LEVEL SECURITY;

-- Policies for product_images
CREATE POLICY "Product images are viewable by everyone" ON product_images FOR SELECT TO public USING (true);
CREATE POLICY "Product images are manageable by authenticated" ON product_images FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Policies for reviews
CREATE POLICY "Approved reviews are viewable by everyone" ON reviews FOR SELECT TO public USING (is_approved = true);
CREATE POLICY "Reviews are manageable by authenticated" ON reviews FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can create reviews" ON reviews FOR INSERT TO public WITH CHECK (true);

-- Policies for faqs
CREATE POLICY "Active FAQs are viewable by everyone" ON faqs FOR SELECT TO public USING (is_active = true);
CREATE POLICY "FAQs are manageable by authenticated" ON faqs FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Policies for webhook_events
CREATE POLICY "Webhook events are viewable by authenticated" ON webhook_events FOR SELECT TO authenticated USING (true);
CREATE POLICY "Webhook events can be inserted by service role" ON webhook_events FOR INSERT TO service_role WITH CHECK (true);

-- Policies for inventory_log
CREATE POLICY "Inventory log is viewable by authenticated" ON inventory_log FOR SELECT TO authenticated USING (true);
CREATE POLICY "Inventory log can be inserted by service role" ON inventory_log FOR INSERT TO service_role WITH CHECK (true);
