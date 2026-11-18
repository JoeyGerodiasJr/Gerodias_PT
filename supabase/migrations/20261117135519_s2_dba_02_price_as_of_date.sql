DROP FUNCTION IF EXISTS get_product_price_as_of(INT, TIMESTAMPTZ);

-- Function to retrieve the current/effective unit price of a product as of a given date
CREATE OR REPLACE FUNCTION get_product_price_as_of(
  p_prod_code VARCHAR(6),
  p_target_date TIMESTAMPTZ DEFAULT NOW()
)
RETURNS NUMERIC AS $$
DECLARE
  v_price NUMERIC;
BEGIN
  SELECT unitprice INTO v_price
  FROM pricehist
  WHERE prodcode = p_prod_code
    AND effdate <= p_target_date::date
    AND NOT COALESCE(is_deleted, false)
  ORDER BY effdate DESC
  LIMIT 1;

  RETURN COALESCE(v_price, 0.00);
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

-- Overload supporting integer IDs (casts to varchar) if needed by any legacy callers
CREATE OR REPLACE FUNCTION get_product_price_as_of(
  p_product_id INT,
  p_target_date TIMESTAMPTZ DEFAULT NOW()
)
RETURNS NUMERIC AS $$
BEGIN
  RETURN get_product_price_as_of(p_product_id::text::varchar(6), p_target_date);
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;