-- =============================================================================
-- seed.sql — TPM The Premium Mart — sample data (idempotent)
-- Run: supabase db reset  or  psql -f supabase/seed.sql
-- Safe to re-run: uses ON CONFLICT / singleton upserts.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Categories (4 editorial blocks mirroring tpm-preview, plus menu sections)
-- ---------------------------------------------------------------------------
insert into public.categories (slug, name, description, sort_order, is_active)
values
  ('signature-drinks', 'Signature Drinks', 'Our most photographed sips — bright, fresh and unmistakably TPM.', 10, true),
  ('fresh-favorites', 'Fresh Favorites', 'Heritage roast, cold brew and seasonal infusions.', 20, true),
  ('something-to-bite', 'Something to Bite', 'Pastries, brunch and share plates — while stocks last.', 30, true),
  ('the-tpm-pick', 'The TPM Pick', 'Curated products, lifestyle finds and your new everyday stop.', 40, true),
  ('heritage-coffee', 'Heritage Coffee', 'Single origin pour-over, flat white and botanical brews.', 50, true),
  ('botanical-teas', 'Botanical Teas', 'Hibiscus mint, iced matcha and chamomile lavender.', 60, true),
  ('cold-infusions', 'Cold Infusions', 'Yuzu spritz, cucumber basil cooler and cold brew.', 70, true),
  ('artisanal-pastries', 'Artisanal Pastries', 'Earl grey sponge, cardamom bun and citrus tart.', 80, true),
  ('weekend-brunch', 'Weekend Brunch', 'Avocado herbs, shakshuka and botanical pancakes.', 90, true)
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  sort_order = excluded.sort_order,
  is_active = excluded.is_active;

-- ---------------------------------------------------------------------------
-- Products (sample mirroring menu pages)
-- ---------------------------------------------------------------------------
-- Helper: get category ids via subquery; safe after categories upsert

insert into public.products (slug, category_id, name, description, price, badge, sort_order, is_active)
values
  ('single-origin-pour-over', (select id from public.categories where slug='heritage-coffee'), 'Single Origin Pour Over', 'Heritage beans, hand-poured.', 6.50, null, 10, true),
  ('rosemary-vanilla-latte', (select id from public.categories where slug='heritage-coffee'), 'Rosemary Vanilla Latte', 'Heritage roast with rosemary vanilla.', 7.00, 'Popular', 20, true),
  ('botanical-pour-over', (select id from public.categories where slug='heritage-coffee'), 'Botanical Pour-Over', 'Floral botanical infusion.', 6.80, null, 30, true),
  ('heritage-flat-white', (select id from public.categories where slug='heritage-coffee'), 'Heritage Flat White', 'Creamy, heritage roast.', 5.80, null, 40, true),
  ('hibiscus-mint', (select id from public.categories where slug='botanical-teas'), 'Hibiscus Mint', 'Tart hibiscus with cool mint.', 5.50, null, 10, true),
  ('iced-matcha-reserve', (select id from public.categories where slug='botanical-teas'), 'Iced Matcha Reserve', 'Stone-ground matcha, iced.', 6.40, 'New', 20, true),
  ('yuzu-citrus-spritz', (select id from public.categories where slug='cold-infusions'), 'Yuzu Citrus Spritz', 'Yuzu and citrus fizz.', 6.20, null, 10, true),
  ('cucumber-basil-cooler', (select id from public.categories where slug='cold-infusions'), 'Cucumber & Basil Cooler', 'Garden-fresh cooler.', 5.90, null, 20, true),
  ('botanical-cold-brew', (select id from public.categories where slug='cold-infusions'), 'Botanical Cold Brew', '12-hour botanical brew.', 6.00, null, 30, true),
  ('earl-grey-sponge', (select id from public.categories where slug='artisanal-pastries'), 'Earl Grey Sponge', 'Earl grey tea sponge.', 7.20, null, 10, true),
  ('cardamom-morning-bun', (select id from public.categories where slug='artisanal-pastries'), 'Cardamom Morning Bun', 'Warm cardamom bun.', 5.00, null, 20, true),
  ('botanical-citrus-tart', (select id from public.categories where slug='artisanal-pastries'), 'Botanical Citrus Tart', 'Citrus and botanical tart.', 6.80, null, 30, true),
  ('heritage-avocado-herbs', (select id from public.categories where slug='weekend-brunch'), 'Heritage Avocado & Herbs', 'Sourdough, avocado and herbs.', 14.50, 'Brunch', 10, true),
  ('garden-shakshuka', (select id from public.categories where slug='weekend-brunch'), 'Garden Shakshuka', 'Shakshuka with garden herbs.', 15.00, null, 20, true)
on conflict (slug) do update set
  category_id = excluded.category_id,
  name = excluded.name,
  description = excluded.description,
  price = excluded.price,
  badge = excluded.badge,
  sort_order = excluded.sort_order,
  is_active = excluded.is_active;

-- ---------------------------------------------------------------------------
-- Store_info singleton (mirrors index.html / JSON-LD)
-- ---------------------------------------------------------------------------
insert into public.store_info (
  singleton_key, name, tagline, description,
  address_line1, address_line2, city, country, postal_code,
  phone, phone_display, email, map_url,
  opening_hours
)
values (
  true,
  'TPM — The Premium Mart',
  'More Than Your Everyday Stop.',
  'Signature drinks, fresh bites & curated finds — all under one roof. A premium mart and lifestyle destination you''ll want to come back to.',
  '123 Heritage Lane', 'City Center', 'City Center', 'US', null,
  '+15551234567', '+1 (555) 123-4567', 'hello@tpm.cafe', 'https://maps.google.com/?q=123+Heritage+Lane',
  '{
    "mon_fri": "7:00 AM — 7:00 PM",
    "sat_sun": "8:00 AM — 8:00 PM",
    "brunch": "Sat-Sun 9AM — 2PM",
    "timezone": "America/New_York"
  }'::jsonb
)
on conflict (singleton_key) do update set
  name = excluded.name,
  tagline = excluded.tagline,
  description = excluded.description,
  address_line1 = excluded.address_line1,
  address_line2 = excluded.address_line2,
  city = excluded.city,
  country = excluded.country,
  phone = excluded.phone,
  phone_display = excluded.phone_display,
  email = excluded.email,
  map_url = excluded.map_url,
  opening_hours = excluded.opening_hours;

-- ---------------------------------------------------------------------------
-- Contact_info singleton
-- ---------------------------------------------------------------------------
insert into public.contact_info (
  singleton_key, phone, phone_display, email, address, address_display, map_url, extra_contacts
)
values (
  true,
  '+15551234567', '+1 (555) 123-4567', 'hello@tpm.cafe',
  '123 Heritage Lane, City Center', '123 Heritage Lane, City Center',
  'https://maps.google.com/?q=123+Heritage+Lane',
  '[]'::jsonb
)
on conflict (singleton_key) do update set
  phone = excluded.phone,
  phone_display = excluded.phone_display,
  email = excluded.email,
  address = excluded.address,
  address_display = excluded.address_display,
  map_url = excluded.map_url;

-- ---------------------------------------------------------------------------
-- Social links
-- ---------------------------------------------------------------------------
insert into public.social_links (platform, url, handle, sort_order, is_active)
values
  ('instagram', 'https://www.instagram.com/tpm_thepremiummart', '@tpm_thepremiummart', 10, true),
  ('tiktok', 'https://www.tiktok.com/@tpm_thepremiummart', '@tpm_thepremiummart', 20, false),
  ('facebook', 'https://www.facebook.com/tpm_thepremiummart', 'TPM — The Premium Mart', 30, false)
on conflict (platform, url) do update set
  handle = excluded.handle,
  sort_order = excluded.sort_order,
  is_active = excluded.is_active;
