-- 1. Defensive Column & Index Guards
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'customer') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customer' AND column_name = 'is_deleted') THEN
            ALTER TABLE customer ADD COLUMN is_deleted boolean DEFAULT false;
        END IF;
        CREATE INDEX IF NOT EXISTS idx_customer_is_deleted ON customer(is_deleted);
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'product') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'product' AND column_name = 'is_deleted') THEN
            ALTER TABLE product ADD COLUMN is_deleted boolean DEFAULT false;
        END IF;
        CREATE INDEX IF NOT EXISTS idx_product_is_deleted ON product(is_deleted);
    END IF;
END $$;

-- 2. Create Security-Invoker Active Views
CREATE OR REPLACE VIEW customer_active WITH (security_invoker = true) AS
SELECT * FROM customer WHERE NOT COALESCE(is_deleted, false);

CREATE OR REPLACE VIEW product_active WITH (security_invoker = true) AS
SELECT * FROM product WHERE NOT COALESCE(is_deleted, false);