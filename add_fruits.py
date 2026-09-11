import psycopg2
conn = psycopg2.connect('postgresql://postgres:postgres@127.0.0.1:54322/postgres')
conn.autocommit = True
cur = conn.cursor()

# Add fruits category
cur.execute("""
    INSERT INTO public.categories (slug, name, description, sort_order, is_active)
    VALUES ('fruits', 'Fruits', 'Fresh and seasonal fruits selection.', 10, TRUE)
    ON CONFLICT (slug) DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        sort_order = EXCLUDED.sort_order,
        is_active = EXCLUDED.is_active;
""")

# Add 40 fruit products
products = [
    ('sugar-apple', 'Sugar Apple — تفاح سكري'),
    ('red-apple', 'Red Apple — تفاح أحمر'),
    ('green-apple', 'Green Apple — تفاح أخضر'),
    ('yellow-apple', 'Yellow Apple — تفاح أصفر'),
    ('red-grapes', 'Red Grapes — عنب أحمر'),
    ('black-grapes', 'Black Grapes — عنب أسود'),
    ('banati-grapes', 'Banati Grapes — عنب بناتي'),
    ('peach', 'Peach — خوخ'),
    ('nectarine', 'Nectarine — نكتارين'),
    ('plum', 'Plum — برقوق'),
    ('apricot', 'Apricot — مشمش'),
    ('taameya-peach', 'Taameya Peach — خوخ طعميه'),
    ('avocado', 'Avocado — افوكادو'),
    ('orange', 'Orange — برتقال'),
    ('mandarin', 'Mandarin — يوسفي'),
    ('banana', 'Banana — موز'),
    ('pear', 'Pear — كمثري'),
    ('guava', 'Guava — جوافة'),
    ('spanish-fig', 'Spanish Fig — تين اسباني'),
    ('barshoumi-fig', 'Barshoumi Fig — تين برشومي'),
    ('prickly-pear', 'Prickly Pear — تين شوكي'),
    ('oweis-mango', 'Oweis Mango — مانجو عويس'),
    ('fass-mango', 'Fass Mango — مانجو فص'),
    ('sugary-mango', 'Sugary Mango — مانجو سكري'),
    ('crimson-mango', 'Crimson Mango — مانجو كريمسون'),
    ('keitt-mango', 'Keitt Mango — مانجو كيت'),
    ('naomi-mango', 'Naomi Mango — مانجو ناعومي'),
    ('heidi-mango', 'Heidi Mango — مانجو هايدي'),
    ('tommy-mango', 'Tommy Mango — مانجو تومي'),
    ('sadeeka-mango', 'Sadeeka Mango — مانجو صديقه'),
    ('timour-mango', 'Timour Mango — مانجو تيمور'),
    ('red-dragon-fruit', 'Red Dragon Fruit — دراجون احمر'),
    ('white-dragon-fruit', 'White Dragon Fruit — دراجون أبيض'),
    ('passion-fruit', 'Passion Fruit — باشون فروت'),
    ('pineapple', 'Pineapple — أناناس'),
    ('melon', 'Melon — شمام'),
    ('cantaloupe', 'Cantaloupe — كنتالوب'),
    ('pomegranate', 'Pomegranate — رمان'),
    ('sugar-cane', 'Sugar Cane — قصب'),
    ('watermelon', 'Watermelon — بطيخ'),
]

for slug, name in products:
    # Escape single quotes in the name for SQL
    name_escaped = name.replace("'", "''")
    cur.execute(f"""INSERT INTO public.products (slug, category_id, name, description, price, badge, sort_order, is_active)
VALUES ('{slug}', (SELECT id FROM public.categories WHERE slug='fruits'), '{name_escaped}', NULL, NULL, NULL, 0, TRUE)
ON CONFLICT (slug) DO UPDATE SET
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    price = EXCLUDED.price,
    badge = EXCLUDED.badge,
    sort_order = EXCLUDED.sort_order,
    is_active = EXCLUDED.is_active;""")

print('Done! Fruits category and 40 products added/updated.')
cur.close()
conn.close()