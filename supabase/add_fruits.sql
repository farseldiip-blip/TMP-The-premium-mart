-- Add fruits category
insert into public.categories (slug, name, description, sort_order, is_active)
values
  ('fruits', 'Fruits', 'Fresh and seasonal fruits selection.', 10, true)
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  sort_order = excluded.sort_order,
  is_active = excluded.is_active;

-- Add 40 fruit products (English — Arabic name format)
-- Using on conflict (slug) to be idempotent; skip duplicates
insert into public.products (slug, category_id, name, description, price, badge, sort_order, is_active)
values
  ('sugar-apple', (select id from public.categories where slug='fruits'), 'Sugar Apple — تفاح سكري', null, null, null, 1, true),
  ('red-apple', (select id from public.categories where slug='fruits'), 'Red Apple — تفاح أحمر', null, null, null, 2, true),
  ('green-apple', (select id from public.categories where slug='fruits'), 'Green Apple — تفاح أخضر', null, null, null, 3, true),
  ('yellow-apple', (select id from public.categories where slug='fruits'), 'Yellow Apple — تفاح أصفر', null, null, null, 4, true),
  ('red-grapes', (select id from public.categories where slug='fruits'), 'Red Grapes — عنب أحمر', null, null, null, 5, true),
  ('black-grapes', (select id from public.categories where slug='fruits'), 'Black Grapes — عنب أسود', null, null, null, 6, true),
  ('banati-grapes', (select id from public.categories where slug='fruits'), 'Banati Grapes — عنب بناتي', null, null, null, 7, true),
  ('peach', (select id from public.categories where slug='fruits'), 'Peach — خوخ', null, null, null, 8, true),
  ('nectarine', (select id from public.categories where slug='fruits'), 'Nectarine — نكتارين', null, null, null, 9, true),
  ('plum', (select id from public.categories where slug='fruits'), 'Plum — برقوق', null, null, null, 10, true),
  ('apricot', (select id from public.categories where slug='fruits'), 'Apricot — مشمش', null, null, null, 11, true),
  ('taameya-peach', (select id from public.categories where slug='fruits'), 'Taameya Peach — خوخ طعميه', null, null, null, 12, true),
  ('avocado', (select id from public.categories where slug='fruits'), 'Avocado — افوكادو', null, null, null, 13, true),
  ('orange', (select id from public.categories where slug='fruits'), 'Orange — برتقال', null, null, null, 14, true),
  ('mandarin', (select id from public.categories where slug='fruits'), 'Mandarin — يوسفي', null, null, null, 15, true),
  ('banana', (select id from public.categories where slug='fruits'), 'Banana — موز', null, null, null, 16, true),
  ('pear', (select id from public.categories where slug='fruits'), 'Pear — كمثري', null, null, null, 17, true),
  ('guava', (select id from public.categories where slug='fruits'), 'Guava — جوافة', null, null, null, 18, true),
  ('spanish-fig', (select id from public.categories where slug='fruits'), 'Spanish Fig — تين اسباني', null, null, null, 19, true),
  ('barshoumi-fig', (select id from public.categories where slug='fruits'), 'Barshoumi Fig — تين برشومي', null, null, null, 20, true),
  ('prickly-pear', (select id from public.categories where slug='fruits'), 'Prickly Pear — تين شوكي', null, null, null, 21, true),
  ('oweis-mango', (select id from public.categories where slug='fruits'), 'Oweis Mango — مانجو عويس', null, null, null, 22, true),
  ('fass-mango', (select id from public.categories where slug='fruits'), 'Fass Mango — مانجو فص', null, null, null, 23, true),
  ('sugary-mango', (select id from public.categories where slug='fruits'), 'Sugary Mango — مانجو سكري', null, null, null, 24, true),
  ('crimson-mango', (select id from public.categories where slug='fruits'), 'Crimson Mango — مانجو كريمسون', null, null, null, 25, true),
  ('keitt-mango', (select id from public.categories where slug='fruits'), 'Keitt Mango — مانجو كيت', null, null, null, 26, true),
  ('naomi-mango', (select id from public.categories where slug='fruits'), 'Naomi Mango — مانجو ناعومي', null, null, null, 27, true),
  ('heidi-mango', (select id from public.categories where slug='fruits'), 'Heidi Mango — مانجو هايدي', null, null, null, 28, true),
  ('tommy-mango', (select id from public.categories where slug='fruits'), 'Tommy Mango — مانجو تومي', null, null, null, 29, true),
  ('sadeeka-mango', (select id from public.categories where slug='fruits'), 'Sadeeka Mango — مانجو صديقه', null, null, null, 30, true),
  ('timour-mango', (select id from public.categories where slug='fruits'), 'Timour Mango — مانجو تيمور', null, null, null, 31, true),
  ('red-dragon-fruit', (select id from public.categories where slug='fruits'), 'Red Dragon Fruit — دراجون احمر', null, null, null, 32, true),
  ('white-dragon-fruit', (select id from public.categories where slug='fruits'), 'White Dragon Fruit — دراجون ابيض', null, null, null, 33, true),
  ('passion-fruit', (select id from public.categories where slug='fruits'), 'Passion Fruit — باشون فروت', null, null, null, 34, true),
  ('pineapple', (select id from public.categories where slug='fruits'), 'Pineapple — أناناس', null, null, null, 35, true),
  ('melon', (select id from public.categories where slug='fruits'), 'Melon — شمام', null, null, null, 36, true),
  ('cantaloupe', (select id from public.categories where slug='fruits'), 'Cantaloupe — كنتالوب', null, null, null, 37, true),
  ('pomegranate', (select id from public.categories where slug='fruits'), 'Pomegranate — رمان', null, null, null, 38, true),
  ('sugar-cane', (select id from public.categories where slug='fruits'), 'Sugar Cane — قصب', null, null, null, 39, true),
  ('watermelon', (select id from public.categories where slug='fruits'), 'Watermelon — بطيخ', null, null, null, 40, true)
on conflict (slug) do update set
  category_id = excluded.category_id,
  name = excluded.name,
  description = excluded.description,
  price = excluded.price,
  badge = excluded.badge,
  sort_order = excluded.sort_order,
  is_active = excluded.is_active;