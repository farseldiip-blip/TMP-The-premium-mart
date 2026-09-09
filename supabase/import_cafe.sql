-- TPM Café Menu Import
-- Categories (type=cafe, is_active=true)
-- Products (English Name — Arabic Name format)
-- Uses ON CONFLICT (slug) for idempotency

-- ============================================================
-- CATEGORIES
-- ============================================================

-- Category 1: MOJITO
INSERT INTO categories (slug, name, description, sort_order, is_active, type)
VALUES ('mojito', 'Mojito', 'Refreshing mint-based cocktail blends', 1, true, 'cafe')
ON CONFLICT (slug) DO UPDATE SET name=EXCLUDED.name, description=EXCLUDED.description, sort_order=EXCLUDED.sort_order, is_active=EXCLUDED.is_active, type=EXCLUDED.type;

-- Category 2: MATCHA
INSERT INTO categories (slug, name, description, sort_order, is_active, type)
VALUES ('matcha', 'Matcha', 'Ceremonial-grade green tea blends', 2, true, 'cafe')
ON CONFLICT (slug) DO UPDATE SET name=EXCLUDED.name, description=EXCLUDED.description, sort_order=EXCLUDED.sort_order, is_active=EXCLUDED.is_active, type=EXCLUDED.type;

-- Category 3: COFFEE
INSERT INTO categories (slug, name, description, sort_order, is_active, type)
VALUES ('coffee', 'Coffee', 'Classic espresso and brewed coffee selections', 3, true, 'cafe')
ON CONFLICT (slug) DO UPDATE SET name=EXCLUDED.name, description=EXCLUDED.description, sort_order=EXCLUDED.sort_order, is_active=EXCLUDED.is_active, type=EXCLUDED.type;

-- Category 4: NON-COFFEE
INSERT INTO categories (slug, name, description, sort_order, is_active, type)
VALUES ('non-coffee', 'Non-Coffee', 'Tea, chocolate, and warm beverage selections', 4, true, 'cafe')
ON CONFLICT (slug) DO UPDATE SET name=EXCLUDED.name, description=EXCLUDED.description, sort_order=EXCLUDED.sort_order, is_active=EXCLUDED.is_active, type=EXCLUDED.type;

-- Category 5: ICED COFFEE
INSERT INTO categories (slug, name, description, sort_order, is_active, type)
VALUES ('iced-coffee', 'Iced Coffee', 'Iced espresso and cold coffee drinks', 5, true, 'cafe')
ON CONFLICT (slug) DO UPDATE SET name=EXCLUDED.name, description=EXCLUDED.description, sort_order=EXCLUDED.sort_order, is_active=EXCLUDED.is_active, type=EXCLUDED.type;

-- Category 6: ICED NON-COFFEE
INSERT INTO categories (slug, name, description, sort_order, is_active, type)
VALUES ('iced-non-coffee', 'Iced Non-Coffee', 'Iced teas, frappes, and cold blended drinks', 6, true, 'cafe')
ON CONFLICT (slug) DO UPDATE SET name=EXCLUDED.name, description=EXCLUDED.description, sort_order=EXCLUDED.sort_order, is_active=EXCLUDED.is_active, type=EXCLUDED.type;

-- Category 7: FRESH JUICE
INSERT INTO categories (slug, name, description, sort_order, is_active, type)
VALUES ('fresh-juice', 'Fresh Juice', 'Fresh-squeezed fruit juices', 7, true, 'cafe')
ON CONFLICT (slug) DO UPDATE SET name=EXCLUDED.name, description=EXCLUDED.description, sort_order=EXCLUDED.sort_order, is_active=EXCLUDED.is_active, type=EXCLUDED.type;

-- Category 8: MIXED JUICE
INSERT INTO categories (slug, name, description, sort_order, is_active, type)
VALUES ('mixed-juice', 'Mixed Juice', 'Blended fruit juice combinations', 8, true, 'cafe')
ON CONFLICT (slug) DO UPDATE SET name=EXCLUDED.name, description=EXCLUDED.description, sort_order=EXCLUDED.sort_order, is_active=EXCLUDED.is_active, type=EXCLUDED.type;

-- Category 9: MINCED MEAT
INSERT INTO categories (slug, name, description, sort_order, is_active, type)
VALUES ('minced-meat', 'Minced Meat', 'Premium minced meat selections', 9, true, 'cafe')
ON CONFLICT (slug) DO UPDATE SET name=EXCLUDED.name, description=EXCLUDED.description, sort_order=EXCLUDED.sort_order, is_active=EXCLUDED.is_active, type=EXCLUDED.type;

-- Category 10: MEATS
INSERT INTO categories (slug, name, description, sort_order, is_active, type)
VALUES ('meats', 'Meats', 'Premium meat selections', 10, true, 'cafe')
ON CONFLICT (slug) DO UPDATE SET name=EXCLUDED.name, description=EXCLUDED.description, sort_order=EXCLUDED.sort_order, is_active=EXCLUDED.is_active, type=EXCLUDED.type;

-- Category 11: POULTRY
INSERT INTO categories (slug, name, description, sort_order, is_active, type)
VALUES ('poultry', 'Poultry', 'Chicken and poultry selections', 11, true, 'cafe')
ON CONFLICT (slug) DO UPDATE SET name=EXCLUDED.name, description=EXCLUDED.description, sort_order=EXCLUDED.sort_order, is_active=EXCLUDED.is_active, type=EXCLUDED.type;

-- ============================================================
-- MOJITO PRODUCTS (category: mojito)
-- ============================================================
INSERT INTO products (slug, category_id, name, price, sort_order, is_active)
SELECT 'classic-mojito', (SELECT id FROM categories WHERE slug='mojito'), 'Classic Mojito — موهيتو كلاسيك', 90, 1, true
WHERE NOT EXISTS (SELECT 1 FROM products WHERE slug='classic-mojito');

INSERT INTO products (slug, category_id, name, price, sort_order, is_active)
SELECT 'blueberry-mojito', (SELECT id FROM categories WHERE slug='mojito'), 'Blueberry Mojito — موهيتو بلوبيري', 90, 2, true
WHERE NOT EXISTS (SELECT 1 FROM products WHERE slug='blueberry-mojito');

INSERT INTO products (slug, category_id, name, price, sort_order, is_active)
SELECT 'mango-kiwi-mojito', (SELECT id FROM categories WHERE slug='mojito'), 'Mango Kiwi Mojito — موهيتو مانجو كيوي', 90, 3, true
WHERE NOT EXISTS (SELECT 1 FROM products WHERE slug='mango-kiwi-mojito');

INSERT INTO products (slug, category_id, name, price, sort_order, is_active)
SELECT 'blue-ocean-mojito', (SELECT id FROM categories WHERE slug='mojito'), 'Blue Ocean Mojito — موهيتو بلو أوشن', 90, 4, true
WHERE NOT EXISTS (SELECT 1 FROM products WHERE slug='blue-ocean-mojito');

INSERT INTO products (slug, category_id, name, price, sort_order, is_active)
SELECT 'cherry-berry-mojito', (SELECT id FROM categories WHERE slug='mojito'), 'Cherry Berry Mojito — موهيتو شيري بيري', 110, 5, true
WHERE NOT EXISTS (SELECT 1 FROM products WHERE slug='cherry-berry-mojito');

INSERT INTO products (slug, category_id, name, price, sort_order, is_active)
SELECT 'passion-mango-mojito', (SELECT id FROM categories WHERE slug='mojito'), 'Passion Mango Mojito — موهيتو باشون مانجو', 110, 6, true
WHERE NOT EXISTS (SELECT 1 FROM products WHERE slug='passion-mango-mojito');

INSERT INTO products (slug, category_id, name, price, sort_order, is_active)
SELECT 'passion-peach-mojito', (SELECT id FROM categories WHERE slug='mojito'), 'Passion Peach Mojito — موهيتو باشون بيتش', 110, 7, true
WHERE NOT EXISTS (SELECT 1 FROM products WHERE slug='passion-peach-mojito');

INSERT INTO products (slug, category_id, name, price, sort_order, is_active)
SELECT 'passion-kiwi-mojito', (SELECT id FROM categories WHERE slug='mojito'), 'Passion Kiwi Mojito — موهيتو باشون كيوي', 110, 8, true
WHERE NOT EXISTS (SELECT 1 FROM products WHERE slug='passion-kiwi-mojito');

INSERT INTO products (slug, category_id, name, price, sort_order, is_active)
SELECT 'passion-strawberry-mojito', (SELECT id FROM categories WHERE slug='mojito'), 'Passion Strawberry Mojito — موهيتو باشون فراولة', 110, 9, true
WHERE NOT EXISTS (SELECT 1 FROM products WHERE slug='passion-strawberry-mojito');

-- ============================================================
-- MATCHA PRODUCTS (category: matcha)
-- ============================================================
INSERT INTO products (slug, category_id, name, price, sort_order, is_active)
SELECT 'matcha-classic', (SELECT id FROM categories WHERE slug='matcha'), 'Matcha Classic — ماتشا كلاسيك', 110, 1, true
WHERE NOT EXISTS (SELECT 1 FROM products WHERE slug='matcha-classic');

INSERT INTO products (slug, category_id, name, price, sort_order, is_active)
SELECT 'matcha-strawberry', (SELECT id FROM categories WHERE slug='matcha'), 'Matcha Strawberry — ماتشا فراولة', 120, 2, true
WHERE NOT EXISTS (SELECT 1 FROM products WHERE slug='matcha-strawberry');

INSERT INTO products (slug, category_id, name, price, sort_order, is_active)
SELECT 'matcha-orange', (SELECT id FROM categories WHERE slug='matcha'), 'Matcha Orange — ماتشا برتقال', 120, 3, true
WHERE NOT EXISTS (SELECT 1 FROM products WHERE slug='matcha-orange');

INSERT INTO products (slug, category_id, name, price, sort_order, is_active)
SELECT 'matcha-mango', (SELECT id FROM categories WHERE slug='matcha'), 'Matcha Mango — ماتشا مانجو', 120, 4, true
WHERE NOT EXISTS (SELECT 1 FROM products WHERE slug='matcha-mango');

INSERT INTO products (slug, category_id, name, price, sort_order, is_active)
SELECT 'matcha-salted-caramel', (SELECT id FROM categories WHERE slug='matcha'), 'Matcha Salted Caramel — ماتشا سولتد كراميل', 140, 5, true
WHERE NOT EXISTS (SELECT 1 FROM products WHERE slug='matcha-salted-caramel');

INSERT INTO products (slug, category_id, name, price, sort_order, is_active)
SELECT 'matcha-spanish-latte', (SELECT id FROM categories WHERE slug='matcha'), 'Matcha Spanish Latte — ماتشا سبانيش لاتيه', 140, 6, true
WHERE NOT EXISTS (SELECT 1 FROM products WHERE slug='matcha-spanish-latte');

INSERT INTO products (slug, category_id, name, price, sort_order, is_active)
SELECT 'matcha-blueberry', (SELECT id FROM categories WHERE slug='matcha'), 'Matcha Blueberry — ماتشا بلوبيري', 140, 7, true
WHERE NOT EXISTS (SELECT 1 FROM products WHERE slug='matcha-blueberry');

INSERT INTO products (slug, category_id, name, price, sort_order, is_active)
SELECT 'matcha-mixberry', (SELECT id FROM categories WHERE slug='matcha'), 'Matcha Mixberry — ماتشا ميكس بيري', 140, 8, true
WHERE NOT EXISTS (SELECT 1 FROM products WHERE slug='matcha-mixberry');

INSERT INTO products (slug, category_id, name, price, sort_order, is_active)
SELECT 'matcha-coconut', (SELECT id FROM categories WHERE slug='matcha'), 'Matcha Coconut — ماتشا جوز هند', 140, 9, true
WHERE NOT EXISTS (SELECT 1 FROM products WHERE slug='matcha-coconut');

-- ============================================================
-- COFFEE PRODUCTS (category: coffee)
-- ============================================================
INSERT INTO products (slug, category_id, name, price, sort_order, is_active)
SELECT 'turkish-coffee-sd', (SELECT id FROM categories WHERE slug='coffee'), 'Turkish Coffee S/D — قهوة تركي S/D', 35, 1, true
WHERE NOT EXISTS (SELECT 1 FROM products WHERE slug='turkish-coffee-sd');

INSERT INTO products (slug, category_id, name, price, sort_order, is_active)
SELECT 'single-espresso', (SELECT id FROM categories WHERE slug='coffee'), 'Single Espresso — إسبريسو سنجل', 40, 2, true
WHERE NOT EXISTS (SELECT 1 FROM products WHERE slug='single-espresso');

INSERT INTO products (slug, category_id, name, price, sort_order, is_active)
SELECT 'double-espresso', (SELECT id FROM categories WHERE slug='coffee'), 'Double Espresso — إسبريسو دبل', 50, 3, true
WHERE NOT EXISTS (SELECT 1 FROM products WHERE slug='double-espresso');

INSERT INTO products (slug, category_id, name, price, sort_order, is_active)
SELECT 'french-coffee', (SELECT id FROM categories WHERE slug='coffee'), 'French Coffee — قهوة فرنساوي', 45, 4, true
WHERE NOT EXISTS (SELECT 1 FROM products WHERE slug='french-coffee');

INSERT INTO products (slug, category_id, name, price, sort_order, is_active)
SELECT 'americano', (SELECT id FROM categories WHERE slug='coffee'), 'Americano — أمريكانو', 60, 5, true
WHERE NOT EXISTS (SELECT 1 FROM products WHERE slug='americano');

INSERT INTO products (slug, category_id, name, price, sort_order, is_active)
SELECT 'cortado', (SELECT id FROM categories WHERE slug='coffee'), 'Cortado — كورتادو', 65, 6, true
WHERE NOT EXISTS (SELECT 1 FROM products WHERE slug='cortado');

INSERT INTO products (slug, category_id, name, price, sort_order, is_active)
SELECT 'latte', (SELECT id FROM categories WHERE slug='coffee'), 'Latte — لاتيه', 85, 7, true
WHERE NOT EXISTS (SELECT 1 FROM products WHERE slug='latte');

INSERT INTO products (slug, category_id, name, price, sort_order, is_active)
SELECT 'cappuccino', (SELECT id FROM categories WHERE slug='coffee'), 'Cappuccino — كابتشينو', 90, 8, true
WHERE NOT EXISTS (SELECT 1 FROM products WHERE slug='cappuccino');

INSERT INTO products (slug, category_id, name, price, sort_order, is_active)
SELECT 'flat-white', (SELECT id FROM categories WHERE slug='coffee'), 'Flat White — فلات وايت', 95, 9, true
WHERE NOT EXISTS (SELECT 1 FROM products WHERE slug='flat-white');

INSERT INTO products (slug, category_id, name, price, sort_order, is_active)
SELECT 'mocha-dw', (SELECT id FROM categories WHERE slug='coffee'), 'Mocha (D/W) — موكا (D/W)', 95, 10, true
WHERE NOT EXISTS (SELECT 1 FROM products WHERE slug='mocha-dw');

INSERT INTO products (slug, category_id, name, price, sort_order, is_active)
SELECT 'salted-caramel-latte', (SELECT id FROM categories WHERE slug='coffee'), 'Salted Caramel Latte — لاتيه سولتد كراميل', 100, 11, true
WHERE NOT EXISTS (SELECT 1 FROM products WHERE slug='salted-caramel-latte');

INSERT INTO products (slug, category_id, name, price, sort_order, is_active)
SELECT 'caramel-macchiato', (SELECT id FROM categories WHERE slug='coffee'), 'Caramel Macchiato — كراميل ماكياتو', 110, 12, true
WHERE NOT EXISTS (SELECT 1 FROM products WHERE slug='caramel-macchiato');

INSERT INTO products (slug, category_id, name, price, sort_order, is_active)
SELECT 'spanish-latte', (SELECT id FROM categories WHERE slug='coffee'), 'Spanish Latte — سبانيش لاتيه', 110, 13, true
WHERE NOT EXISTS (SELECT 1 FROM products WHERE slug='spanish-latte');

-- ============================================================
-- NON-COFFEE PRODUCTS (category: non-coffee)
-- ============================================================
INSERT INTO products (slug, category_id, name, price, sort_order, is_active)
SELECT 'tea', (SELECT id FROM categories WHERE slug='non-coffee'), 'Tea — شاي', 20, 1, true
WHERE NOT EXISTS (SELECT 1 FROM products WHERE slug='tea');

INSERT INTO products (slug, category_id, name, price, sort_order, is_active)
SELECT 'yansoon', (SELECT id FROM categories WHERE slug='non-coffee'), 'Yansoon — يانسون', 20, 2, true
WHERE NOT EXISTS (SELECT 1 FROM products WHERE slug='yansoon');

INSERT INTO products (slug, category_id, name, price, sort_order, is_active)
SELECT 'mint', (SELECT id FROM categories WHERE slug='non-coffee'), 'Mint — نعناع', 25, 3, true
WHERE NOT EXISTS (SELECT 1 FROM products WHERE slug='mint');

INSERT INTO products (slug, category_id, name, price, sort_order, is_active)
SELECT 'hot-chocolate', (SELECT id FROM categories WHERE slug='non-coffee'), 'Hot Chocolate — هوت شوكليت', 70, 4, true
WHERE NOT EXISTS (SELECT 1 FROM products WHERE slug='hot-chocolate');

-- ============================================================
-- ICED COFFEE PRODUCTS (category: iced-coffee)
-- ============================================================
INSERT INTO products (slug, category_id, name, price, sort_order, is_active)
SELECT 'iced-latte', (SELECT id FROM categories WHERE slug='iced-coffee'), 'Iced Latte — آيس لاتيه', 85, 1, true
WHERE NOT EXISTS (SELECT 1 FROM products WHERE slug='iced-latte');

INSERT INTO products (slug, category_id, name, price, sort_order, is_active)
SELECT 'iced-flat-white', (SELECT id FROM categories WHERE slug='iced-coffee'), 'Iced Flat White — آيس فلات وايت', 95, 2, true
WHERE NOT EXISTS (SELECT 1 FROM products WHERE slug='iced-flat-white');

INSERT INTO products (slug, category_id, name, price, sort_order, is_active)
SELECT 'iced-cappuccino', (SELECT id FROM categories WHERE slug='iced-coffee'), 'Iced Cappuccino — آيس كابتشينو', 95, 3, true
WHERE NOT EXISTS (SELECT 1 FROM products WHERE slug='iced-cappuccino');

INSERT INTO products (slug, category_id, name, price, sort_order, is_active)
SELECT 'iced-mocha-dw', (SELECT id FROM categories WHERE slug='iced-coffee'), 'Iced Mocha (D/W) — آيس موكا (D/W)', 110, 4, true
WHERE NOT EXISTS (SELECT 1 FROM products WHERE slug='iced-mocha-dw');

INSERT INTO products (slug, category_id, name, price, sort_order, is_active)
SELECT 'ice-spanish-latte', (SELECT id FROM categories WHERE slug='iced-coffee'), 'Ice Spanish Latte — آيس سبانيش لاتيه', 120, 5, true
WHERE NOT EXISTS (SELECT 1 FROM products WHERE slug='ice-spanish-latte');

INSERT INTO products (slug, category_id, name, price, sort_order, is_active)
SELECT 'ice-latte-salted-caramel', (SELECT id FROM categories WHERE slug='iced-coffee'), 'Ice Latte Salted Caramel — آيس لاتيه سولتد كراميل', 120, 6, true
WHERE NOT EXISTS (SELECT 1 FROM products WHERE slug='ice-latte-salted-caramel');

INSERT INTO products (slug, category_id, name, price, sort_order, is_active)
SELECT 'iced-caramel-macchiato', (SELECT id FROM categories WHERE slug='iced-coffee'), 'Iced Caramel Macchiato — آيس كراميل ماكياتو', 120, 7, true
WHERE NOT EXISTS (SELECT 1 FROM products WHERE slug='iced-caramel-macchiato');

INSERT INTO products (slug, category_id, name, price, sort_order, is_active)
SELECT 'frappe-classic', (SELECT id FROM categories WHERE slug='iced-coffee'), 'Frappe Classic — فرابيه كلاسيك', 120, 8, true
WHERE NOT EXISTS (SELECT 1 FROM products WHERE slug='frappe-classic');

INSERT INTO products (slug, category_id, name, price, sort_order, is_active)
SELECT 'frappe-caramel', (SELECT id FROM categories WHERE slug='iced-coffee'), 'Frappe Caramel — فرابيه كراميل', 120, 9, true
WHERE NOT EXISTS (SELECT 1 FROM products WHERE slug='frappe-caramel');

INSERT INTO products (slug, category_id, name, price, sort_order, is_active)
SELECT 'frappe-vanilla', (SELECT id FROM categories WHERE slug='iced-coffee'), 'Frappe Vanilla — فرابيه فانيلا', 120, 10, true
WHERE NOT EXISTS (SELECT 1 FROM products WHERE slug='frappe-vanilla');

INSERT INTO products (slug, category_id, name, price, sort_order, is_active)
SELECT 'frappe-mocha-dw', (SELECT id FROM categories WHERE slug='iced-coffee'), 'Frappe Mocha (D/W) — فرابيه موكا (D/W)', 120, 11, true
WHERE NOT EXISTS (SELECT 1 FROM products WHERE slug='frappe-mocha-dw');

INSERT INTO products (slug, category_id, name, price, sort_order, is_active)
SELECT 'frappe-spanish-latte', (SELECT id FROM categories WHERE slug='iced-coffee'), 'Frappe Spanish Latte — فرابيه سبانيش لاتيه', 130, 12, true
WHERE NOT EXISTS (SELECT 1 FROM products WHERE slug='frappe-spanish-latte');

-- ============================================================
-- ICED NON-COFFEE PRODUCTS (category: iced-non-coffee)
-- ============================================================
INSERT INTO products (slug, category_id, name, price, sort_order, is_active)
SELECT 'frappe-strawberry', (SELECT id FROM categories WHERE slug='iced-non-coffee'), 'Frappe Strawberry — فرابيه فراولة', 110, 1, true
WHERE NOT EXISTS (SELECT 1 FROM products WHERE slug='frappe-strawberry');

INSERT INTO products (slug, category_id, name, price, sort_order, is_active)
SELECT 'frappe-watermelon', (SELECT id FROM categories WHERE slug='iced-non-coffee'), 'Frappe Watermelon — فرابيه بطيخ', 110, 2, true
WHERE NOT EXISTS (SELECT 1 FROM products WHERE slug='frappe-watermelon');

INSERT INTO products (slug, category_id, name, price, sort_order, is_active)
SELECT 'frappe-blueberry', (SELECT id FROM categories WHERE slug='iced-non-coffee'), 'Frappe Blueberry — فرابيه بلوبيري', 110, 3, true
WHERE NOT EXISTS (SELECT 1 FROM products WHERE slug='frappe-blueberry');

INSERT INTO products (slug, category_id, name, price, sort_order, is_active)
SELECT 'frappe-mix-berry', (SELECT id FROM categories WHERE slug='iced-non-coffee'), 'Frappe Mix Berry — فرابيه ميكس بيري', 110, 4, true
WHERE NOT EXISTS (SELECT 1 FROM products WHERE slug='frappe-mix-berry');

INSERT INTO products (slug, category_id, name, price, sort_order, is_active)
SELECT 'frappe-lemon-berry', (SELECT id FROM categories WHERE slug='iced-non-coffee'), 'Frappe Lemon Berry — فرابيه ليمون بيري', 110, 5, true
WHERE NOT EXISTS (SELECT 1 FROM products WHERE slug='frappe-lemon-berry');

INSERT INTO products (slug, category_id, name, price, sort_order, is_active)
SELECT 'smoothy-milkshake-vanilla', (SELECT id FROM categories WHERE slug='iced-non-coffee'), 'Smoothy Milkshake Vanilla — سموذي ميلك شيك فانيلا', 160, 6, true
WHERE NOT EXISTS (SELECT 1 FROM products WHERE slug='smoothy-milkshake-vanilla');

INSERT INTO products (slug, category_id, name, price, sort_order, is_active)
SELECT 'smoothy-milkshake-chocolate', (SELECT id FROM categories WHERE slug='iced-non-coffee'), 'Smoothy Milkshake Chocolate — سموذي ميلك شيك شوكولاتة', 160, 7, true
WHERE NOT EXISTS (SELECT 1 FROM products WHERE slug='smoothy-milkshake-chocolate');

INSERT INTO products (slug, category_id, name, price, sort_order, is_active)
SELECT 'smoothy-milkshake-caramel', (SELECT id FROM categories WHERE slug='iced-non-coffee'), 'Smoothy Milkshake Caramel — سموذي ميلك شيك كراميل', 160, 8, true
WHERE NOT EXISTS (SELECT 1 FROM products WHERE slug='smoothy-milkshake-caramel');

INSERT INTO products (slug, category_id, name, price, sort_order, is_active)
SELECT 'kiwi-smoothie', (SELECT id FROM categories WHERE slug='iced-non-coffee'), 'Kiwi Smoothie — سموذي كيوي', 100, 9, true
WHERE NOT EXISTS (SELECT 1 FROM products WHERE slug='kiwi-smoothie');

INSERT INTO products (slug, category_id, name, price, sort_order, is_active)
SELECT 'strawberry-smoothie', (SELECT id FROM categories WHERE slug='iced-non-coffee'), 'Strawberry Smoothie — سموذي فراولة', 100, 10, true
WHERE NOT EXISTS (SELECT 1 FROM products WHERE slug='strawberry-smoothie');

INSERT INTO products (slug, category_id, name, price, sort_order, is_active)
SELECT 'watermelon-smoothie', (SELECT id FROM categories WHERE slug='iced-non-coffee'), 'Watermelon Smoothie — سموذي بطيخ', 100, 11, true
WHERE NOT EXISTS (SELECT 1 FROM products WHERE slug='watermelon-smoothie');

INSERT INTO products (slug, category_id, name, price, sort_order, is_active)
SELECT 'mixed-berry-smoothie', (SELECT id FROM categories WHERE slug='iced-non-coffee'), 'Mixed Berry Smoothie — سموذي ميكس بيري', 110, 12, true
WHERE NOT EXISTS (SELECT 1 FROM products WHERE slug='mixed-berry-smoothie');

INSERT INTO products (slug, category_id, name, price, sort_order, is_active)
SELECT 'blueberry-smoothie', (SELECT id FROM categories WHERE slug='iced-non-coffee'), 'Blueberry Smoothie — سموذي بلوبيري', 110, 13, true
WHERE NOT EXISTS (SELECT 1 FROM products WHERE slug='blueberry-smoothie');

-- ============================================================
-- FRESH JUICE PRODUCTS (category: fresh-juice)
-- Size-based: each size is a separate product record
-- ============================================================
INSERT INTO products (slug, category_id, name, price, sort_order, is_active)
SELECT 'orange-medium', (SELECT id FROM categories WHERE slug='fresh-juice'), 'Orange — برتقال (Medium)', 50, 1, true
WHERE NOT EXISTS (SELECT 1 FROM products WHERE slug='orange-medium');

INSERT INTO products (slug, category_id, name, price, sort_order, is_active)
SELECT 'lemon-medium', (SELECT id FROM categories WHERE slug='fresh-juice'), 'Lemon — ليمون (Medium)', 60, 2, true
WHERE NOT EXISTS (SELECT 1 FROM products WHERE slug='lemon-medium');

INSERT INTO products (slug, category_id, name, price, sort_order, is_active)
SELECT 'lemon-large', (SELECT id FROM categories WHERE slug='fresh-juice'), 'Lemon — ليمون (Large)', 75, 3, true
WHERE NOT EXISTS (SELECT 1 FROM products WHERE slug='lemon-large');

INSERT INTO products (slug, category_id, name, price, sort_order, is_active)
SELECT 'lemon-mint-medium', (SELECT id FROM categories WHERE slug='fresh-juice'), 'Lemon Mint — ليمون نعناع (Medium)', 60, 4, true
WHERE NOT EXISTS (SELECT 1 FROM products WHERE slug='lemon-mint-medium');

INSERT INTO products (slug, category_id, name, price, sort_order, is_active)
SELECT 'lemon-mint-large', (SELECT id FROM categories WHERE slug='fresh-juice'), 'Lemon Mint — ليمون نعناع (Large)', 75, 5, true
WHERE NOT EXISTS (SELECT 1 FROM products WHERE slug='lemon-mint-large');

INSERT INTO products (slug, category_id, name, price, sort_order, is_active)
SELECT 'strawberry-medium', (SELECT id FROM categories WHERE slug='fresh-juice'), 'Strawberry — فراولة (Medium)', 85, 6, true
WHERE NOT EXISTS (SELECT 1 FROM products WHERE slug='strawberry-medium');

INSERT INTO products (slug, category_id, name, price, sort_order, is_active)
SELECT 'strawberry-large', (SELECT id FROM categories WHERE slug='fresh-juice'), 'Strawberry — فراولة (Large)', 100, 7, true
WHERE NOT EXISTS (SELECT 1 FROM products WHERE slug='strawberry-large');

INSERT INTO products (slug, category_id, name, price, sort_order, is_active)
SELECT 'guava-medium', (SELECT id FROM categories WHERE slug='fresh-juice'), 'Guava — جوافة (Medium)', 80, 8, true
WHERE NOT EXISTS (SELECT 1 FROM products WHERE slug='guava-medium');

INSERT INTO products (slug, category_id, name, price, sort_order, is_active)
SELECT 'guava-large', (SELECT id FROM categories WHERE slug='fresh-juice'), 'Guava — جوافة (Large)', 100, 9, true
WHERE NOT EXISTS (SELECT 1 FROM products WHERE slug='guava-large');

INSERT INTO products (slug, category_id, name, price, sort_order, is_active)
SELECT 'peach-medium', (SELECT id FROM categories WHERE slug='fresh-juice'), 'Peach — خوخ (Medium)', 90, 10, true
WHERE NOT EXISTS (SELECT 1 FROM products WHERE slug='peach-medium');

INSERT INTO products (slug, category_id, name, price, sort_order, is_active)
SELECT 'peach-large', (SELECT id FROM categories WHERE slug='fresh-juice'), 'Peach — خوخ (Large)', 110, 11, true
WHERE NOT EXISTS (SELECT 1 FROM products WHERE slug='peach-large');

INSERT INTO products (slug, category_id, name, price, sort_order, is_active)
SELECT 'watermelon-medium', (SELECT id FROM categories WHERE slug='fresh-juice'), 'Watermelon — بطيخ (Medium)', 90, 12, true
WHERE NOT EXISTS (SELECT 1 FROM products WHERE slug='watermelon-medium');

INSERT INTO products (slug, category_id, name, price, sort_order, is_active)
SELECT 'watermelon-large', (SELECT id FROM categories WHERE slug='fresh-juice'), 'Watermelon — بطيخ (Large)', 110, 13, true
WHERE NOT EXISTS (SELECT 1 FROM products WHERE slug='watermelon-large');

INSERT INTO products (slug, category_id, name, price, sort_order, is_active)
SELECT 'kiwi-medium', (SELECT id FROM categories WHERE slug='fresh-juice'), 'Kiwi — كيوي (Medium)', 100, 14, true
WHERE NOT EXISTS (SELECT 1 FROM products WHERE slug='kiwi-medium');

INSERT INTO products (slug, category_id, name, price, sort_order, is_active)
SELECT 'kiwi-large', (SELECT id FROM categories WHERE slug='fresh-juice'), 'Kiwi — كيوي (Large)', 125, 15, true
WHERE NOT EXISTS (SELECT 1 FROM products WHERE slug='kiwi-large');

INSERT INTO products (slug, category_id, name, price, sort_order, is_active)
SELECT 'passion-fruit-large', (SELECT id FROM categories WHERE slug='fresh-juice'), 'Passion Fruit — باشون فروت (Large)', 140, 16, true
WHERE NOT EXISTS (SELECT 1 FROM products WHERE slug='passion-fruit-large');

INSERT INTO products (slug, category_id, name, price, sort_order, is_active)
SELECT 'smoked-avocado-large', (SELECT id FROM categories WHERE slug='fresh-juice'), 'Smoked Avocado — أفوكادو مدخن (Large)', 140, 17, true
WHERE NOT EXISTS (SELECT 1 FROM products WHERE slug='smoked-avocado-large');

INSERT INTO products (slug, category_id, name, price, sort_order, is_active)
SELECT 'avocado-tpm-large', (SELECT id FROM categories WHERE slug='fresh-juice'), 'Avocado TPM — أفوكادو TPM (Large)', 150, 18, true
WHERE NOT EXISTS (SELECT 1 FROM products WHERE slug='avocado-tpm-large');

-- ============================================================
-- MIXED JUICE PRODUCTS (category: mixed-juice)
-- Size-based: each size is a separate product record
-- ============================================================
INSERT INTO products (slug, category_id, name, price, sort_order, is_active)
SELECT 'kiwi-mango-medium', (SELECT id FROM categories WHERE slug='mixed-juice'), 'Kiwi Mango — كيوي مانجو (Medium)', 90, 1, true
WHERE NOT EXISTS (SELECT 1 FROM products WHERE slug='kiwi-mango-medium');

INSERT INTO products (slug, category_id, name, price, sort_order, is_active)
SELECT 'kiwi-mango-large', (SELECT id FROM categories WHERE slug='mixed-juice'), 'Kiwi Mango — كيوي مانجو (Large)', 125, 2, true
WHERE NOT EXISTS (SELECT 1 FROM products WHERE slug='kiwi-mango-large');

INSERT INTO products (slug, category_id, name, price, sort_order, is_active)
SELECT 'watermelon-mint-medium', (SELECT id FROM categories WHERE slug='mixed-juice'), 'Watermelon Mint — بطيخ نعناع (Medium)', 95, 3, true
WHERE NOT EXISTS (SELECT 1 FROM products WHERE slug='watermelon-mint-medium');

INSERT INTO products (slug, category_id, name, price, sort_order, is_active)
SELECT 'watermelon-mint-large', (SELECT id FROM categories WHERE slug='mixed-juice'), 'Watermelon Mint — بطيخ نعناع (Large)', 125, 4, true
WHERE NOT EXISTS (SELECT 1 FROM products WHERE slug='watermelon-mint-large');

INSERT INTO products (slug, category_id, name, price, sort_order, is_active)
SELECT 'strawberry-kiwi-medium', (SELECT id FROM categories WHERE slug='mixed-juice'), 'Strawberry Kiwi — فراولة كيوي (Medium)', 95, 5, true
WHERE NOT EXISTS (SELECT 1 FROM products WHERE slug='strawberry-kiwi-medium');

INSERT INTO products (slug, category_id, name, price, sort_order, is_active)
SELECT 'strawberry-kiwi-large', (SELECT id FROM categories WHERE slug='mixed-juice'), 'Strawberry Kiwi — فراولة كيوي (Large)', 125, 6, true
WHERE NOT EXISTS (SELECT 1 FROM products WHERE slug='strawberry-kiwi-large');

INSERT INTO products (slug, category_id, name, price, sort_order, is_active)
SELECT 'watermelon-strawberry-medium', (SELECT id FROM categories WHERE slug='mixed-juice'), 'Watermelon Strawberry — بطيخ فراولة (Medium)', 100, 7, true
WHERE NOT EXISTS (SELECT 1 FROM products WHERE slug='watermelon-strawberry-medium');

INSERT INTO products (slug, category_id, name, price, sort_order, is_active)
SELECT 'watermelon-strawberry-large', (SELECT id FROM categories WHERE slug='mixed-juice'), 'Watermelon Strawberry — بطيخ فراولة (Large)', 115, 8, true
WHERE NOT EXISTS (SELECT 1 FROM products WHERE slug='watermelon-strawberry-large');

INSERT INTO products (slug, category_id, name, price, sort_order, is_active)
SELECT 'watermelon-kiwi-medium', (SELECT id FROM categories WHERE slug='mixed-juice'), 'Watermelon Kiwi — بطيخ كيوي (Medium)', 95, 9, true
WHERE NOT EXISTS (SELECT 1 FROM products WHERE slug='watermelon-kiwi-medium');

INSERT INTO products (slug, category_id, name, price, sort_order, is_active)
SELECT 'watermelon-kiwi-large', (SELECT id FROM categories WHERE slug='mixed-juice'), 'Watermelon Kiwi — بطيخ كيوي (Large)', 125, 10, true
WHERE NOT EXISTS (SELECT 1 FROM products WHERE slug='watermelon-kiwi-large');

INSERT INTO products (slug, category_id, name, price, sort_order, is_active)
SELECT 'apple-passion-medium', (SELECT id FROM categories WHERE slug='mixed-juice'), 'Apple Passion — تفاح باشون (Medium)', 100, 11, true
WHERE NOT EXISTS (SELECT 1 FROM products WHERE slug='apple-passion-medium');

INSERT INTO products (slug, category_id, name, price, sort_order, is_active)
SELECT 'apple-passion-large', (SELECT id FROM categories WHERE slug='mixed-juice'), 'Apple Passion — تفاح باشون (Large)', 125, 12, true
WHERE NOT EXISTS (SELECT 1 FROM products WHERE slug='apple-passion-large');

-- ============================================================
-- MINCED MEAT PRODUCTS (category: minced-meat)
-- ============================================================
INSERT INTO products (slug, category_id, name, price, sort_order, is_active)
SELECT 'fat-free-minced-meat-1kg', (SELECT id FROM categories WHERE slug='minced-meat'), 'Fat-Free Minced Meat — مفروم خالي من الدهون (1kg)', 290, 1, true
WHERE NOT EXISTS (SELECT 1 FROM products WHERE slug='fat-free-minced-meat-1kg');

INSERT INTO products (slug, category_id, name, price, sort_order, is_active)
SELECT 'fat-free-minced-meat-500g', (SELECT id FROM categories WHERE slug='minced-meat'), 'Fat-Free Minced Meat — مفروم خالي من الدهون (500g)', 150, 2, true
WHERE NOT EXISTS (SELECT 1 FROM products WHERE slug='fat-free-minced-meat-500g');

INSERT INTO products (slug, category_id, name, price, sort_order, is_active)
SELECT 'regular-minced-meat-1kg', (SELECT id FROM categories WHERE slug='minced-meat'), 'Regular Minced Meat — مفروم عادي (1kg)', 270, 3, true
WHERE NOT EXISTS (SELECT 1 FROM products WHERE slug='regular-minced-meat-1kg');

INSERT INTO products (slug, category_id, name, price, sort_order, is_active)
SELECT 'regular-minced-meat-500g', (SELECT id FROM categories WHERE slug='minced-meat'), 'Regular Minced Meat — مفروم عادي (500g)', 140, 4, true
WHERE NOT EXISTS (SELECT 1 FROM products WHERE slug='regular-minced-meat-500g');

INSERT INTO products (slug, category_id, name, price, sort_order, is_active)
SELECT 'musab-minced-meat-1kg', (SELECT id FROM categories WHERE slug='minced-meat'), 'Musab Minced Meat — مفروم ملبس (1kg)', 250, 5, true
WHERE NOT EXISTS (SELECT 1 FROM products WHERE slug='musab-minced-meat-1kg');

INSERT INTO products (slug, category_id, name, price, sort_order, is_active)
SELECT 'musab-minced-meat-500g', (SELECT id FROM categories WHERE slug='minced-meat'), 'Musab Minced Meat — مفروم ملبس (500g)', 130, 6, true
WHERE NOT EXISTS (SELECT 1 FROM products WHERE slug='musab-minced-meat-500g');

-- ============================================================
-- MEATS PRODUCTS (category: meats)
-- ============================================================
INSERT INTO products (slug, category_id, name, price, sort_order, is_active)
SELECT 'burger-meat-600g', (SELECT id FROM categories WHERE slug='meats'), 'Burger Meat — برجر لحم (600g)', 167, 1, true
WHERE NOT EXISTS (SELECT 1 FROM products WHERE slug='burger-meat-600g');

INSERT INTO products (slug, category_id, name, price, sort_order, is_active)
SELECT 'burger-meat-400g', (SELECT id FROM categories WHERE slug='meats'), 'Burger Meat — برجر لحم (400g)', 110, 2, true
WHERE NOT EXISTS (SELECT 1 FROM products WHERE slug='burger-meat-400g');

INSERT INTO products (slug, category_id, name, price, sort_order, is_active)
SELECT 'kofta-meat-400g', (SELECT id FROM categories WHERE slug='meats'), 'Kofta Meat — كفتة لحم (400g)', 135, 3, true
WHERE NOT EXISTS (SELECT 1 FROM products WHERE slug='kofta-meat-400g');

INSERT INTO products (slug, category_id, name, price, sort_order, is_active)
SELECT 'beef-sausage-1kg', (SELECT id FROM categories WHERE slug='meats'), 'Beef Sausage — سجق بيف (1kg)', 270, 4, true
WHERE NOT EXISTS (SELECT 1 FROM products WHERE slug='beef-sausage-1kg');

INSERT INTO products (slug, category_id, name, price, sort_order, is_active)
SELECT 'beef-sausage-500g', (SELECT id FROM categories WHERE slug='meats'), 'Beef Sausage — سجق بيف (500g)', 144, 5, true
WHERE NOT EXISTS (SELECT 1 FROM products WHERE slug='beef-sausage-500g');

INSERT INTO products (slug, category_id, name, price, sort_order, is_active)
SELECT 'spicy-beef-sausage-1kg', (SELECT id FROM categories WHERE slug='meats'), 'Spicy Beef Sausage — سجق سبايسي (1kg)', 270, 6, true
WHERE NOT EXISTS (SELECT 1 FROM products WHERE slug='spicy-beef-sausage-1kg');

INSERT INTO products (slug, category_id, name, price, sort_order, is_active)
SELECT 'spicy-beef-sausage-500g', (SELECT id FROM categories WHERE slug='meats'), 'Spicy Beef Sausage — سجق سبايسي (500g)', 144, 7, true
WHERE NOT EXISTS (SELECT 1 FROM products WHERE slug='spicy-beef-sausage-500g');

-- ============================================================
-- POULTRY PRODUCTS (category: poultry)
-- ============================================================
INSERT INTO products (slug, category_id, name, price, sort_order, is_active)
SELECT 'chicken-kofta', (SELECT id FROM categories WHERE slug='poultry'), 'Chicken Kofta — كفتة فراخ (400g)', 90, 1, true
WHERE NOT EXISTS (SELECT 1 FROM products WHERE slug='chicken-kofta');

INSERT INTO products (slug, category_id, name, price, sort_order, is_active)
SELECT 'chicken-strips-1kg', (SELECT id FROM categories WHERE slug='poultry'), 'Chicken Strips — استربس دجاج (1kg)', 330, 2, true
WHERE NOT EXISTS (SELECT 1 FROM products WHERE slug='chicken-strips-1kg');

INSERT INTO products (slug, category_id, name, price, sort_order, is_active)
SELECT 'chicken-strips-500g', (SELECT id FROM categories WHERE slug='poultry'), 'Chicken Strips — استربس دجاج (500g)', 170, 3, true
WHERE NOT EXISTS (SELECT 1 FROM products WHERE slug='chicken-strips-500g');
