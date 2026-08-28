# TPM — The Premium Mart

Static, mobile-first mart website for **TPM — The Premium Mart**: signature drinks, fresh
coffee, bites and curated finds in a vibrant, premium everyday destination.

**No framework. No build step.** Plain HTML, CSS and vanilla JS living in the `site/`
directory — ready to serve or deploy as-is.

## What's inside

| Path | Purpose |
| --- | --- |
| [`site/`](site/) | The complete website (HTML, CSS, JS, assets) |
| `site/index.html` | Home page — hero with real product-can motion (GSAP), editorial preview, story, gallery, visit + contact |
| `site/menu.html` | Original image-based menu with fullscreen viewer |
| [`site/README.md`](site/README.md) | Full docs: structure, run, QA, deploy notes |
| [`AGENTS.md`](AGENTS.md) | Project conventions & design system reference |

## Run it

```bash
cd site
npm run dev        # python -m http.server 5173 --bind 127.0.0.1
# open http://localhost:5173/
```

A plain HTTP server is required (`file://` won't render fonts/GSAP). See
[`site/README.md`](site/README.md) for details, structure and pre-launch TODOs.

## Tech

- HTML5 + CSS (mobile-first, custom properties/design tokens) + vanilla JS
- GSAP + ScrollTrigger via CDN for hero motion (falls back gracefully,
  `prefers-reduced-motion` respected)
- Dev-only deps: `puppeteer-core`, `gsap` (kept for local QA tooling)
