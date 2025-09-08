-- Markets/countries configuration table
CREATE TABLE markets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code VARCHAR(2) NOT NULL UNIQUE, -- ISO 3166-1 alpha-2
  country_name VARCHAR(100) NOT NULL,
  region VARCHAR(50) NOT NULL, -- Americas, Europe, Asia-Pacific, etc.
  is_available BOOLEAN DEFAULT false,
  data_source VARCHAR(20) DEFAULT 'placeholder', -- bigquery, placeholder, api
  priority_order INTEGER DEFAULT 999, -- Display order
  currency_code VARCHAR(3), -- USD, EUR, GBP for future pricing
  timezone VARCHAR(50), -- For future date handling
  metadata JSONB DEFAULT '{}', -- Extensible config
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for multi-tenant access
ALTER TABLE markets ENABLE ROW LEVEL SECURITY;

-- Policy: All authenticated users can read markets
CREATE POLICY markets_read_policy ON markets
  FOR SELECT TO authenticated
  USING (true);

-- Policy: Only super admins can modify markets
CREATE POLICY markets_write_policy ON markets
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'SUPER_ADMIN'
      AND organization_id IS NULL
    )
  );

-- Seed initial markets data
INSERT INTO markets (country_code, country_name, region, is_available, data_source, priority_order) VALUES
('US', 'United States', 'Americas', true, 'bigquery', 1),
('GB', 'United Kingdom', 'Europe', false, 'placeholder', 2),
('CA', 'Canada', 'Americas', false, 'placeholder', 3),
('AU', 'Australia', 'Asia-Pacific', false, 'placeholder', 4),
('DE', 'Germany', 'Europe', false, 'placeholder', 5),
('FR', 'France', 'Europe', false, 'placeholder', 6),
('JP', 'Japan', 'Asia-Pacific', false, 'placeholder', 7),
('BR', 'Brazil', 'Americas', false, 'placeholder', 8);