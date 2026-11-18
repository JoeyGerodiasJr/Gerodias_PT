DO $$ 
BEGIN
    -- 1. Validate payterm on customer table ('COD', '30D', '45D')
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'customer') THEN
        ALTER TABLE customer DROP CONSTRAINT IF EXISTS pay_ck;
        ALTER TABLE customer DROP CONSTRAINT IF EXISTS chk_customer_payterm;
        ALTER TABLE customer ADD CONSTRAINT chk_customer_payterm 
        CHECK (payterm IN ('COD', '30D', '45D'));
    END IF;

    -- 2. Validate unit on product table ('pc', 'ea', 'mtr', 'pkg', 'ltr')
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'product') THEN
        ALTER TABLE product DROP CONSTRAINT IF EXISTS unit_ck;
        ALTER TABLE product DROP CONSTRAINT IF EXISTS chk_product_unit;
        ALTER TABLE product ADD CONSTRAINT chk_product_unit 
        CHECK (unit IN ('pc', 'ea', 'mtr', 'pkg', 'ltr'));
    END IF;
END $$;