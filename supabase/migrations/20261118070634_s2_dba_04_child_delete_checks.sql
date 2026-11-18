-- 1. Create reusable trigger function blocking hard deletes on catalog tables
CREATE OR REPLACE FUNCTION trg_block_hard_delete_catalog()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Hard delete/truncate not allowed on %. Use soft-delete (is_deleted = true) instead.', TG_TABLE_NAME;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 2. Attach BEFORE DELETE trigger to customer table
DROP TRIGGER IF EXISTS blk_customer_hard_del ON customer;
CREATE TRIGGER blk_customer_hard_del
    BEFORE DELETE ON customer
    FOR EACH ROW
    EXECUTE FUNCTION trg_block_hard_delete_catalog();

-- 3. Attach BEFORE DELETE trigger to product table
DROP TRIGGER IF EXISTS blk_product_hard_del ON product;
CREATE TRIGGER blk_product_hard_del
    BEFORE DELETE ON product
    FOR EACH ROW
    EXECUTE FUNCTION trg_block_hard_delete_catalog();