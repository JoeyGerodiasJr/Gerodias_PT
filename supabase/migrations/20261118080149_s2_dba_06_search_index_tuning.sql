-- [S2-DBA-06] Search Performance Check and Index Tuning
-- Optimizes catalog search (ILIKE / prefix lookups), point-in-time pricing (S2-DBA-02),
-- and parent-child referential checks (S2-DBA-04).

-- 1. Enable pg_trgm for fast case-insensitive substring search (ILIKE '%...%')
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 2. Customer Search Tuning (custname substring search & payterm filtering)
CREATE INDEX IF NOT EXISTS idx_customer_custname_trgm 
    ON customer USING gin (custname gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_customer_payterm 
    ON customer (payterm);

-- 3. Product Search Tuning (description substring search & unit filtering)
CREATE INDEX IF NOT EXISTS idx_product_description_trgm 
    ON product USING gin (description gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_product_unit 
    ON product (unit);

-- 4. Point-in-Time Price Lookup Tuning (accelerates get_product_price_as_of in S2-DBA-02)
-- Composite B-tree index matching: WHERE prodcode = ? AND effdate <= ? ORDER BY effdate DESC
CREATE INDEX IF NOT EXISTS idx_pricehist_prodcode_effdate_desc 
    ON pricehist (prodcode, effdate DESC);

-- 5. Foreign Key & Child-Record Lookup Tuning (accelerates sales/salesDetail joins & delete checks)
CREATE INDEX IF NOT EXISTS idx_sales_custno 
    ON sales (custno);

CREATE INDEX IF NOT EXISTS idx_salesdetail_prodcode 
    ON salesDetail (prodcode);

-- 6. Refresh planner statistics so PostgreSQL immediately utilizes the new indexes
ANALYZE customer;
ANALYZE product;
ANALYZE pricehist;
ANALYZE sales;
ANALYZE salesDetail;