-- Create the conversion_benchmarks table
CREATE TABLE public.conversion_benchmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category VARCHAR(100) NOT NULL,
  impressions_to_page_views DECIMAL(5,2),
  page_views_to_installs DECIMAL(5,2),
  impressions_to_installs DECIMAL(5,2),
  data_source VARCHAR(50) DEFAULT 'industry_report_2024',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(category)
);

-- Enable RLS
ALTER TABLE conversion_benchmarks ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users to read
CREATE POLICY "Allow authenticated users to read benchmarks" 
ON conversion_benchmarks 
FOR SELECT 
TO authenticated 
USING (true);

-- Insert all benchmark data
INSERT INTO conversion_benchmarks (category, impressions_to_page_views, page_views_to_installs, impressions_to_installs) VALUES
('Business', 19.52, 33.95, 6.63),
('Weather', 16.54, 42.34, 7.00),
('Utilities', 8.35, 46.78, 3.91),
('Travel', 45.08, 12.06, 5.44),
('Sports', 29.14, 11.68, 3.40),
('Social Networking', 7.07, 27.61, 1.95),
('Reference', 21.33, 66.23, 14.13),
('Productivity', 9.96, 44.74, 4.46),
('Photo & Video', 8.77, 43.43, 3.81),
('News', 9.42, 34.92, 3.29),
('Navigation', 14.52, 54.78, 7.95),
('Music', 10.49, 40.24, 4.22),
('Lifestyle', 9.57, 36.47, 3.49),
('Health & Fitness', 16.29, 32.26, 5.26),
('Games', 25.76, 4.96, 1.28),
('Finance', 25.84, 20.86, 5.39),
('Entertainment', 20.88, 6.36, 1.33),
('Education', 15.61, 20.74, 3.24),
('Books', 51.40, 6.59, 3.39),
('Medical', 22.79, 33.82, 7.71),
('Magazines & Newspapers', 34.42, 4.67, 1.61),
('Food & Drink', 58.43, 6.77, 3.95),
('Shopping', 40.95, 12.57, 5.15),
('Games - Action', 13.57, 7.40, 1.00),
('Games - Adventure', 10.02, 7.57, 0.76),
('Games - Casual', 36.61, 4.24, 1.55),
('Games - Board', 35.25, 1.77, 0.62),
('Games - Card', 34.89, 7.27, 2.54),
('Games - Casino', 63.80, 3.85, 2.46),
('Games - Family', 27.81, 2.38, 0.66),
('Games - Music', 18.54, 12.44, 2.31),
('Games - Puzzle', 38.47, 2.91, 1.12),
('Games - Racing', 13.42, 13.16, 1.77),
('Games - Role Playing', 25.03, 7.33, 1.84),
('Games - Simulation', 33.00, 8.49, 2.80),
('Games - Sports', 16.62, 12.48, 2.08),
('Games - Strategy', 26.98, 7.14, 1.93),
('Games - Trivia', 3.65, 45.14, 1.65),
('Games - Word', 18.48, 18.72, 3.46);