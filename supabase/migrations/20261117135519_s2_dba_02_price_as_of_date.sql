CREATE OR REPLACE FUNCTION get_product_price_as_of(p_product_id INT, p_target_date TIMESTAMPTZ DEFAULT NOW())
RETURNS NUMERIC AS $$
DECLARE
    v_price NUMERIC;
BEGIN
    SELECT unit_price INTO v_price
    FROM price_history
    WHERE product_id = p_product_id
      AND effective_date <= p_target_date
      AND NOT COALESCE(is_deleted, false)
    ORDER BY effective_date DESC
    LIMIT 1;
    
    RETURN COALESCE(v_price, 0.00);
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;