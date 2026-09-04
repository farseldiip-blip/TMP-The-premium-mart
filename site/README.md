# TPM — The Premium Mart

A static, mobile-first mart website for **TPM — The Premium Mart**: signature drinks,
fresh coffee, bites and curated finds in a vibrant, premium everyday destination.

Pure **HTML + CSS + vanilla JS** — no framework, no build step. Open the pages, tweak the
CSS, ship it anywhere.

## Pages

- **`index.html`** — Home. Art-directed hero with real product can imagery and a GSAP motion
  system, editorial "taste of TPM" preview, story/stats, gallery, visit + contact.
- **`market.html`** — The Market page, dynamic categories/products loaded from Supabase with Market/Café filtering.

## Highlights

- **Hero motion** — GSAP (via CDN): staggered can entrance, continuous floating,
  desktop mouse parallax and a subtle ScrollTrigger effect, all disabled under
  `prefers-reduced-motion`.
- **Real product assets** — final transparent 500×500 RGBA renders of the TPM cans
  (`assets/cans/*.png`).
- **Mobile-first** — touch targets ≥44px, sticky glass header + drawer, bottom pill nav.
- **Accessible** — semantic landmarks, one `h1` per page, `alt` + `width`/`height` on images,
  `aria-current`/labels, focus-visible outlines, keyboard + Esc support, skip link.
- **SEO-ready** — unique titles/descriptions, `og:`/`twitter:` meta, `theme-color`,
  `robots.txt` + `sitemap.xml`, JSON-LD `CafeOrCoffeeShop`.

## Directory

```
site/
  index.html        Home page
  market.html       Market page
  css/style.css     All styles (design tokens, layout, components)
  js/app.js         Drawer, lightbox, reserve modal, toast, reveal, GSAP hero motion
  js/market.js      Dynamic Market/Café menu loader
  js/public.js      Public Supabase integration
  assets/
    logo.jpg        Favicon / OG image
    cans/           Product can renders (passion-mango, blue-ocean, passion-strawberry)
    menu/           Legacy market page images (menu-01/02/03.svg)
  robots.txt        Crawling rules (sitemap URL is a TODO for production)
  sitemap.xml       Sitemap (domain URLs are TODOs for production)
  package.json      Dev deps only (see below)
```

## Run

Serve from `site/` (a plain HTTP server is required — `file://` won't render fonts/GSAP):

```bash
cd site
npm run dev          # python -m http.server 5173 --bind 127.0.0.1
# or
npx serve . -l 5173
# then open http://localhost:5173/index.html
```

## Notes

- **Dependencies are dev-only.** GSAP is loaded in `index.html` from jsDelivr (CDN); nothing
  in `package.json` is required at runtime. `puppeteer-core` + `gsap` are kept for local
  QA/screenshot tooling under `devDependencies`. Run `npm install` only if you need those.
- Replace the commented **canonical**, `og:url` and `sitemap.xml` placeholders with your
  production domain (currently `TODO`/**example.com**).
- The JSON-LD business details (address, phone, hours, Instagram) are placeholder data —
  update with verified production information before launch.

## QA

Manually verified at 375 / 390 / 430 / 768 / 1024 / 1440 / 1920 with Puppeteer screenshots
(no horizontal overflow, images `object-fit`/`aspect-ratio`, lazy below-fold, 44px+ targets,
`prefers-reduced-motion` fallbacks).
