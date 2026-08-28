# AGENTS.md

Static, mobile-first mart website ("TPM — The Premium Mart"). No framework, no build step — plain HTML/CSS/vanilla JS served from `site/`.

## Layout
- All work happens under `site/`. Repo root only holds `logo.jpg`, `.png` (Instagram ref), and this file.
- `index.html` (home), `menu.html` (menu), `css/style.css`, `js/app.js`, `robots.txt`, `sitemap.xml`. No build/config.
- Menu images in `site/assets/menu/*.svg` (referenced by `menu.html`).

## Running the site
`file://` won't work (except Puppeteer file:// for QA). Serve from `site/`:
```bash
cd site
python -m http.server 5173 --bind 127.0.0.1
# or: npx serve . -l 5173 (bind 127.0.0.1 for Puppeteer local)
```
No lint/typecheck/test. Manual QA + Puppeteer screenshots.
Puppeteer: `check_file.cjs` pattern with `file://` avoids localhost timeout; `http://127.0.0.1:5173` needs `--bind 127.0.0.1` or it listens on IPv6 only and Edge times out.

## Gotchas
- `package.json` is `"type": "module"` but `capture_site.js` uses `require(...)` (CommonJS) → `ERR_REQUIRE_ESM`. Rename to `.cjs` or use `import`.
- `capture_site.js` hardcodes Edge binary `C:\Program Files (x86)\Microsoft\Edge\...`, output `site/pupp_*.png`, URL `http://localhost:5201`. Update before running.
- Only dep is `puppeteer-core` (system Edge, no Chromium download). Don't expect embedded browser.
- README refs `botanical_heritage/DESIGN.md` — doesn't exist.
- Old inline `<style>` hero hacks removed; new hero is CSS-only (`tpm-hero`, `tpm-can`). Don't re-add ad-hoc overrides.

## Brand / Design System
- TPM premium mart: modern, fresh, urban, playful but refined (Instagram `tpm_thepremiummart` is source). Not botanical heritage, not dark coffee shop.
- Colors: TPM green `--tpm-green` #004e36 (alias `--primary`), cream `--cream` #FFFBF0, ink #0E1A14, accents yellow #FFC83A / orange #FF7A2E / red #E94545 / mint #00C48A / blue #2AA7E0 used sparingly via product imagery, not UI overload.
- Fonts: `Space Grotesk` (headlines, 500/600/700) + `Be Vietnam Pro` (body 400-800) + `Libre Caslon Text` (fallback). Headlines are Space Grotesk tight (-0.03em), not serif.
- Mobile-first; touch ≥44px (CTAs 52-56px); `prefers-reduced-motion` respected (reveal/cans fallback).
- Breakpoints: mobile ≤767, tablet 768-1023, desktop ≥1024. Gutters 20/24/32. Container 1200.
- Shadows: `--shadow-soft`, `--shadow-lift`, `--shadow-can`. Glass header `rgba(255,251,240,.88)` blur 14px.

## Homepage Structure (index.html)
- Hero: `.tpm-hero` — art-directed, no stock template. Copy left, can cluster right. 3-4 CSS cans (`.tpm-can--yellow/.green/.red/.blue`) rotated -7/0/6deg, overlapping, with store chip. Title "More Than Your Everyday Stop." CTA `Explore the Menu` → `menu.html`, ghost `Visit TPM`. Meta pills. Mobile 88-92vh, no overflow (can-stage `min(340px,88vw)`; at ≤380px `86vw`).
- Preview: `.tpm-preview` — 4 editorial blocks, NOT e-commerce. Uses `.tpm-card--a/b/c/d` with 12-col asymmetric grid (7/5 / 5/7). Mobile: stacked immersive (360/300/300/340px). Kicker pills, no prices/cart. Main CTA exact text `LOOK AT THE MENU` → `menu.html`, 56px pill, strong contrast.
- Story `#our-story`: mart narrative + stats. Gallery: 6 items. Visit `#visit` + map + contact `#contact`. Footer dark `#0E1A14`.
- Keep IDs/attributes for JS: `#openDrawer`, `#drawer`, `#drawerBackdrop`, `#reserveModal`, `[data-open-reserve]`, `#contactForm`, `.reveal`.

## Menu Page (menu.html)
- Image-based, vertical scroll — preserve exactly. Order matters. No manual product cards/prices.
- Structure: `.page-hero` + `.menu-images-wrap` → 3× `figure.menu-page-figure` with `button[data-menu-lightbox]` wrapping `img` + `figcaption`. `alt` describes page content verbatim. First img eager/high priority, rest lazy.
- Fullscreen viewer: `#menuLightbox` → `#menuLightboxImg`/`Counter`/`Prev`/`Next`/`Stage`, pinch/zoom (overflow:auto), swipe, arrows, Esc. Engine in `app.js`: `openMenuLightbox(idx)`/`showMenuPage`.

## JS Architecture (js/app.js)
- `$`/`$$` helpers.
- Drawer: `openDrawer`/`closeDrawer`, backdrop click, Esc closes all.
- Lightbox (legacy cards): `openLightbox({src,title,desc,price,badge})` (not used on new preview but keep).
- Menu lightbox: as above.
- Reserve: `openReserve`/`closeReserve` (closes lightboxes first), `showToast()` for form feedback.
- Contact form: toast only.
- Reveal: `IntersectionObserver` adds `.in` else immediate.

## SEO / A11y
- Titles: home `TPM — The Premium Mart | Drinks, Coffee & More`, menu `Menu | TPM — The Premium Mart`. Unique `meta description` per page, `og:*`, `twitter:*` (image `assets/logo.jpg`), `theme-color` #004e36, `robots` index,follow. Canonical commented TODO (no fake domain).
- Semantic: one `<h1>` per page, `header/nav/main/section/footer`, `aria-label`/`aria-current`, `alt` on meaningful imgs (decorative empty), width/height on all imgs to avoid CLS, lazy for below-fold.
- `robots.txt` + `sitemap.xml` in `site/` (relative `index.html`/`menu.html` with TODO comment for production absolute URLs).
- JSON-LD `CafeOrCoffeeShop` in `index.html` (name, address 123 Heritage Lane, tel +1-555-123-4567, hours, `sameAs` Instagram) — update with verified data.
- All images from Unsplash remote; hero is CSS (no LCP image). Good contrast (green on cream 7:1), focus-visible outline green, keyboard nav, Esc, 44px targets, lightbox a11y.

## Assets
- Logo: `site/assets/logo.jpg` (favicon/apple-touch-icon, OG).
- Menu: `site/assets/menu/menu-01.svg` (eager), `menu-02/03.svg` (lazy).
- Remote Unsplash (preconnect `images.unsplash.com`, `fonts.googleapis.com`). Store chip avatar is Unsplash 28px eager.
