-- 1. Seed Demo Customers (aligned with hope_base.sql: custno VARCHAR(5), custname VARCHAR(20), address VARCHAR(50), payterm)
INSERT INTO customer (custno, custname, address, payterm)
SELECT 'C9901', 'Acme Global Corp', '2560 Gen Armistead Ave Audubon CA 94031', '30D'
WHERE NOT EXISTS (SELECT 1 FROM customer WHERE custno = 'C9901');

INSERT INTO customer (custno, custname, address, payterm)
SELECT 'C9902', 'Nexus Retail Inc', '7610 Miramar Rd San Diego, CA 92602', 'COD'
WHERE NOT EXISTS (SELECT 1 FROM customer WHERE custno = 'C9902');

-- 2. Seed Demo Products (aligned with hope_base.sql: prodcode VARCHAR(6), description VARCHAR(30), unit)
INSERT INTO product (prodcode, description, unit)
SELECT 'PRD901', 'Wireless Network Extender Pro', 'pc'
WHERE NOT EXISTS (SELECT 1 FROM product WHERE prodcode = 'PRD901');

INSERT INTO product (prodcode, description, unit)
SELECT 'PRD902', 'CAT6 Gigabit Ethernet 10M', 'ea'
WHERE NOT EXISTS (SELECT 1 FROM product WHERE prodcode = 'PRD902');

-- 3. Seed Historical Prices in pricehist (aligned with S2-DBA-02 get_product_price_as_of)
INSERT INTO pricehist (prodcode, effdate, unitprice)
SELECT 'PRD901', CURRENT_DATE - INTERVAL '60 days', 1100.00
WHERE NOT EXISTS (
    SELECT 1 FROM pricehist ph 
    WHERE ph.prodcode = 'PRD901' AND ph.unitprice = 1100.00
);

INSERT INTO pricehist (prodcode, effdate, unitprice)
SELECT 'PRD901', CURRENT_DATE - INTERVAL '15 days', 1250.00
WHERE NOT EXISTS (
    SELECT 1 FROM pricehist ph 
    WHERE ph.prodcode = 'PRD901' AND ph.unitprice = 1250.00
);