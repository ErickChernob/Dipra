# Dipra — Webflow → Static HTML Migration Audit

**Scope:** Read-only audit. No files were modified as part of this phase.
**Repository:** ErickChernob/Dipra
**Pages:** 6 HTML files, 3 CSS files, 1 JS bundle, 236 images, 216 font files, 4 video assets
**Audit date:** 2026-07-14

---

## Executive summary

This is a small (6-page), form-light marketing site exported from Webflow. It does **not** use Webflow CMS, e-commerce, or memberships, which removes the hardest migration problems. The remaining Webflow surface area is limited to:

1. The `webflow.js` runtime (navbar toggle, background-video bootstrap, slider/lightbox modules, focus/touch helpers, **and a native Webflow form-submission handler that posts to `webflow.com`**).
2. A handful of Webflow CSS/attribute conventions (`w-*` classes, `data-w-id`, `w-node-*` IDs).
3. Two categories of assets still being pulled live from Webflow's CDN (`uploads-ssl.webflow.com`) even though **local copies of those exact files already exist unchecked in the repo** (hero video + Open Graph image).
4. One orphaned Webflow CMS template page (`detail_projects.html`) that is not linked from anywhere and is not real content.
5. A contact form with no working backend now that Webflow form processing is out of scope — this needs a product decision before Phase 2.

Nothing here requires a framework, a build step, or npm. A conservative "lift and clean" migration is realistic.

---

## 1. Webflow-specific files, scripts, classes, attributes, metadata, CDN references, dependencies

| Item | Where | Notes |
|---|---|---|
| `<!-- This site was created in Webflow -->` + "Last Published" comment | Top of every HTML file | Cosmetic, safe to remove |
| `data-wf-page`, `data-wf-site` on `<html>` | All 6 pages | Webflow project/page IDs, purely internal to Webflow's editor/CMS; safe to remove once decoupled |
| `<meta name="generator" content="Webflow">` | All 6 pages `<head>` | Safe to remove |
| `data-wf-page-id`, `data-wf-element-id` on `<form>` | index.html, contacto.html | Only meaningful to Webflow's form backend; safe to remove |
| `data-wf-ignore="true"` on video elements | index, quienes-somos, servicios, detail_projects | Tells Webflow's designer to ignore the node; irrelevant outside Webflow, safe to remove |
| `id="w-node-...-xxxxxxxx"` | 191 occurrences across all 6 pages | Webflow Designer's internal grid/flex node IDs. **Do not rename/remove during the fidelity phase** — some are also used as CSS anchors or JS targets (see §5) |
| `class="w-nav w-nav-menu w-nav-button w-nav-brand w-inline-block w-input w-button w-form w-background-video w-background-video-atom w-slider w-slider-mask w-slider-arrow-left/right w-slider-nav w-round w-lightbox w-dyn-list w-dyn-items w-dyn-item w-dyn-empty w-dyn-bind-empty w-json w-form-done w-form-fail w--current w-mod-js w-mod-touch"` | Throughout | Functional/structural hooks consumed by `webflow.js` and `webflow.css`. See §2 for which are load-bearing vs. dead. |
| `css/webflow.css` | All pages | Webflow's generic framework stylesheet (grid system, base `.w-*` component styles, normalize-like resets). Required as long as any `w-*` component markup remains. |
| `css/normalize.css` | All pages | Standard third-party normalize.css, not Webflow-specific, safe to keep as-is. |
| `css/dipra.webflow.css` | All pages | The site's actual custom design (fonts, colors, layout, breakpoints). This is the file that matters for visual fidelity. |
| `js/webflow.js` (276 KB, unminified single line) | All pages | Webflow's runtime. Modules present: `brand`, `focus`, `forms`, `ix2`, `lightbox`, `links`, `navbar`, `scroll`, `slider`, `touch`. See §2/§7. |
| `WebFont.load(...)` + `ajax.googleapis.com/ajax/libs/webfont/1.6.26/webfont.js` | All 6 pages `<head>` | Google's webfont loader, loads Montserrat + Orbitron from Google Fonts at runtime. External dependency (§3/§4). |
| `<link rel="preconnect" href="https://fonts.googleapis.com">` / `fonts.gstatic.com` | All 6 pages | Supports the above; safe to keep if Google Fonts is kept, safe to remove if self-hosted. |
| jQuery from Webflow's CDN: `https://d3e54v103j8qbb.cloudfront.net/js/jquery-3.5.1.min.dc5e7f18c8.js?site=624343ca0c3fd2eee31e9644` | All 6 pages, end of `<body>` | Third-party CDN (CloudFront, used by Webflow to host jQuery), has a Subresource Integrity hash. `webflow.js` requires jQuery to be `window.jQuery`. **Required** as long as `webflow.js` is kept as-is. |
| `background-image: url('https://d3e54v103j8qbb.cloudfront.net/img/background-image.svg')` | `css/dipra.webflow.css` lines 738, 1924 | Live external asset pulled from Webflow's own CDN at render time — used by `.section.clip.no-padding` (the "Soluciones" section on index/servicios) and `.project-background` (orphaned detail page). **External dependency that must be downloaded and self-hosted.** |
| `og:image` / `twitter:image` meta pointing to `https://uploads-ssl.webflow.com/.../Dipra_OGraph.png` | All 6 pages | **Critical finding** — see §4. A local copy (`images/Dipra_OGraph.png`, plus responsive variants) already exists in the repo but is unused; the live meta tags still point at Webflow's asset host. |
| Hero background video + poster: `https://uploads-ssl.webflow.com/.../colab-transcode.mp4`, `.webm`, `colab-poster-00001.jpg` | index, quienes-somos, servicios, detail_projects | **Critical finding** — see §4. Identical files already exist locally in `/videos/` (`colab.mp4`, `colab-transcode.mp4`, `colab-transcode.webm`, `colab-poster-00001.jpg`) but are not referenced by any page. |
| `data-w-id="<uuid>"` (IX2 interaction hooks) | index.html (2 instances), detail_projects.html (several) | These reference Webflow's IX2 (Interactions 2.0) animation engine. **No interactions payload/config is present anywhere in this export** (no embedded JSON, no site-specific interactions JS file). See §2/§6 — these hooks currently do nothing; there is no scroll-triggered or load animation actually firing today. |
| `.w-webflow-badge` CSS rules | `css/webflow.css` | Dead CSS — the badge element itself is not present in any page's HTML (already removed, likely because this is a paid plan). Safe to delete the rule block. |

---

## 2. Webflow dependencies by interactive component

| Component | Present on this site? | Current mechanism | Migration implication |
|---|---|---|---|
| **Mobile navigation** | Yes, on every page | `webflow.js` `navbar` module, driven by `data-collapse="medium"`, `data-animation="default"`, `data-duration="400"`, `data-easing="ease"` on `.navbar.w-nav`, toggled via `.w-nav-button` / `.w-nav-menu` / `.nav-cover`. CSS breakpoint collapses nav at `max-width: 991px` per `data-collapse="medium"`. | Must be recreated with a small custom JS toggle (~20 lines) + the existing CSS classes. This is the one interaction every page truly depends on. |
| **Dropdown menus** | Not used | `webflow.js` contains a small dropdown helper but no `.w-dropdown` markup exists anywhere in the HTML. | Nothing to migrate. |
| **Tabs** | Not used | No `.w-tabs` markup anywhere; `webflow.js` has no tabs module loaded. | Nothing to migrate. |
| **Sliders (carousel)** | Only on the orphaned `detail_projects.html` (testimonial slider) | `webflow.js` `slider` module drives `.testimonial-slider.w-slider` via `data-delay`, `data-autoplay`, `data-infinite`, etc. | Since this page is not linked from the live site, this can likely be dropped entirely (confirm with stakeholder) rather than recreated. If ever needed, a lightweight custom carousel (or dropping the Webflow slider JS module) would replace it. |
| **Lightbox** | Only on the orphaned `detail_projects.html` (project showcase `w-lightbox`) | `webflow.js` `lightbox` module. Also references empty Webflow CMS collection JSON (`w-json`, `"items": []`). | Same as above — orphaned, recommend dropping rather than recreating. |
| **Accordions** | Not used | No accordion markup found. | Nothing to migrate. |
| **Scroll interactions** | Referenced but effectively inert | `data-w-id` on `#soluciones` heading grid and `.scrolling-text-wrapper` (index.html), and several `data-w-id`s in the orphaned detail page, are meant to hook into Webflow's IX2 engine. **No IX2 interaction payload exists in this export** (no inline JSON, no per-site interactions script), and there is no matching `@keyframes`/`transform` in the CSS either. In its current state, this "reveal on scroll" effect does not fire in the browser at all — confirmed by inspecting both `webflow.js` and the CSS. | Nothing functional to preserve here today. Decide with the client whether the intended reveal animation should be (re)implemented with plain CSS (`@media (prefers-reduced-motion)`-aware) or `IntersectionObserver`, or left as static content (current de-facto behavior). |
| **Hover effects** | Yes (buttons, footer links, submit button, nav) | Pure CSS `:hover` rules in `dipra.webflow.css` (6 declarations: `.button`, `.button-outline`, `.footer-link`, `.submit-button`, `.privacy`, `.normalbutton`). | Zero JS involved — carries over automatically, no work required. |
| **Page-load animations** | Not implemented today | Same IX2 gap as above — no fade/slide-in-on-load effect actually executes; `webflow.js`'s `ix2` module has nothing to animate without the missing config. The `detail_projects.html` circle-links do carry inline `transform: translate3d(...)` "reset" styles that are also artifacts of IX2 with no active behavior. | Nothing functional to preserve. Flag if the client remembers seeing load animations live on Webflow — if so, that config never made it into this static export and would need to be rebuilt from scratch (not recovered). |
| **Responsive behavior** | Yes, extensively | Pure CSS media queries in both `webflow.css` and `dipra.webflow.css` at 479px / 767px / 991px (max-width) and 1280/1440/1920px (min-width, desktop scaling). Framework grid classes (`.grid-wrapper`, `w-` layout helpers) support this. | Carries over automatically — no JS dependency. Just needs the CSS files kept intact. |
| **Background video autoplay** | Yes — hero section on index, quienes-somos, servicios (and orphaned detail page) | `.w-background-video.w-background-video-atom` markup + `data-autoplay`, `data-loop`, `data-poster-url`, `data-video-urls` attributes are Webflow Designer metadata only; actual autoplay is native HTML5 `<video autoplay loop muted playsinline>` — **no JS is required for this to work**, it's a browser-native feature. | Carries over automatically. The only real fix needed is repointing the `src`/`data-*` URLs from Webflow's CDN to the local `/videos/` files that already exist (§4). |
| **Contact form submission** | Yes — index.html and contacto.html | `webflow.js` `forms` module intercepts submit and POSTs via AJAX to `https://webflow.com/api/v1/form/<data-wf-site>`. Confirmed by inspecting the bundle (`u="https://webflow.com/api/v1/form/"+...attr("data-wf-site")`). The form has `method="get"` and no `action`, i.e. it does nothing without that JS intercept. | **This will not work once the site is off Webflow hosting** — Webflow will reject/ignore submissions from a site no longer served by them. There is currently **no WhatsApp link, mailto, or third-party form endpoint anywhere in the codebase** despite the assumption that contact is handled externally. This is a product decision to make before/at the start of implementation (see Risk Assessment, and Migration Plan step "Interaction replacement"). |

---

## 3. External dependencies inventory

| Category | Dependency | Source | Notes |
|---|---|---|---|
| Fonts (self-hosted) | Author, Calibri, Clash Display, General Sans, Ranade, Satoshi, THICCCBOI (+ "ThicccAF" variant) | Local `/fonts/*.woff2/.woff/.ttf/.eot` (216 files), declared via 124 `@font-face` rules in `dipra.webflow.css` | Already fully local — good, no action needed except potentially trimming unused weights (see §6). |
| Fonts (remote) | **Montserrat**, **Orbitron** | Google Fonts, loaded via `ajax.googleapis.com/ajax/libs/webfont/1.6.26/webfont.js` + `fonts.googleapis.com`/`fonts.gstatic.com` | Montserrat is the **body's default font** — heavily used. This is a genuine external runtime dependency (requires internet access to Google's CDN at every page load). Decision needed: keep as Google Fonts CDN link (simplest, still "external" but standard/acceptable for most static sites) or download + self-host alongside the other 7 families for a fully offline-capable bundle. |
| Images | 236 files in `/images` (logos, photos, icons, favicon, webclip, SVG arrows) | Local | All local. ~124 files appear to not be referenced by any current HTML/CSS (see §6/§10) — likely Webflow-generated responsive `-p-500/-p-800/-p-1080/-p-1600/-p-2000/-p-2600/-p-3200/-p-130x130q80` derivatives that were superseded when `srcset`/`sizes` attributes were simplified or removed for some images. Needs confirmation before deleting. |
| Videos | `colab.mp4`, `colab-transcode.mp4`, `colab-transcode.webm`, `colab-poster-00001.jpg` in `/videos` (~17.4 MB total) | Local, **but currently unused** — see §4 | HTML currently references the Webflow-hosted copies instead. |
| JavaScript libraries | jQuery 3.5.1 (via Webflow's CloudFront CDN, SRI-pinned), `webflow.js` (local, 276 KB) | External (jQuery) + local (webflow.js) | jQuery is a hard runtime requirement of `webflow.js` in its current form. |
| Analytics | None found | — | No Google Analytics, GTM, Meta Pixel, or similar found anywhere in the codebase. |
| Tracking pixels | None found | — | Confirmed via full-text search across all HTML/CSS/JS. |
| Third-party widgets | None found | — | No chat widgets, booking widgets, embedded maps, or social embeds. |
| WhatsApp integration | **None found** | — | No `wa.me`, `api.whatsapp.com`, or WhatsApp button/link exists anywhere in the current code, despite the project brief describing WhatsApp as the intended contact channel. This needs to be added as new (simple, static) markup — it is not something to "migrate," it doesn't exist yet. |
| Embedded content (iframes, maps, video embeds) | None found | — | No `<iframe>` elements anywhere in the codebase. |
| Mail links | One `mailto:` link | `aviso-de-privacidad.html` (`protecciondedatos@diprasoluciones.com`) | Plain HTML, no dependency, carries over as-is. |

---

## 4. Assets currently loaded from external CDNs — full list

| Domain | What's loaded | Pages affected | Local copy already exists? |
|---|---|---|---|
| `uploads-ssl.webflow.com` | Hero background video (`colab-transcode.mp4`, `colab-transcode.webm`) + poster (`colab-poster-00001.jpg`) | index.html, quienes-somos.html, servicios.html, detail_projects.html | **Yes** — identical files sit unused in `/videos/` |
| `uploads-ssl.webflow.com` | Open Graph / Twitter share image (`Dipra_OGraph.png`) | All 6 pages (`<meta property="og:image">`, `<meta name="twitter:image">`) | **Yes** — `images/Dipra_OGraph.png` (+ responsive variants) exists unused |
| `d3e54v103j8qbb.cloudfront.net` (Webflow's CDN) | jQuery 3.5.1 script | All 6 pages | No — would need to be vendored locally if full independence from any CDN is required |
| `d3e54v103j8qbb.cloudfront.net` (Webflow's CDN) | `background-image.svg` (decorative background pattern), referenced from `dipra.webflow.css` | Used by `.section.clip.no-padding` (index.html "Soluciones" section, servicios.html doesn't use this class but shares the stylesheet) and `.project-background` (orphaned detail page) | No — needs to be downloaded and saved locally, then the CSS `url()` repointed |
| `ajax.googleapis.com` | `webfont.js` (Google's font loader library) | All 6 pages | No |
| `fonts.googleapis.com` / `fonts.gstatic.com` | Montserrat + Orbitron font files | All 6 pages (loaded at runtime via WebFont.load) | No — would need downloading if full self-hosting is desired |

**Bottom line:** every page on this site currently depends on **five different external domains** at first paint (`uploads-ssl.webflow.com`, `d3e54v103j8qbb.cloudfront.net` ×2 uses, `ajax.googleapis.com`, `fonts.googleapis.com`, `fonts.gstatic.com`). Two of those (the hero video and the OG image) have a trivial fix already sitting in the repository — just repoint the URLs to local files that already exist. The others require an explicit decision on how "independent" the final bundle needs to be.

---

## 5. HTML structure review

**Webflow-specific attributes found:**
- `data-wf-page`, `data-wf-site` (on `<html>`)
- `data-wf-page-id`, `data-wf-element-id` (on forms)
- `data-wf-ignore` (on video containers)
- `data-w-id` (IX2 hooks — currently inert, see §2)
- `data-collapse`, `data-animation`, `data-duration`, `data-easing`, `data-easing2` (on navbar — **required** by the navbar toggle logic)
- `data-autoplay`, `data-loop`, `data-poster-url`, `data-video-urls`, `data-beta-bgvideo-upgrade` (on background video containers — mostly Designer metadata; the real autoplay is via the native `<video>` attributes, not these)
- `data-delay`, `data-hide-arrows`, `data-disable-swipe`, `data-autoplay-limit`, `data-nav-spacing`, `data-infinite` (slider config, orphaned page only)
- `data-wait` (submit button "please wait" text)
- `data-name` (form field labels for Webflow's backend)
- `id="w-node-...-xxxxxxxx"` (191 occurrences)
- `class="w-*"` component classes throughout

**Safe to remove immediately (no functional impact):**
- HTML comments referencing Webflow ("This site was created in Webflow", "Last Published")
- `<meta name="generator" content="Webflow">`
- `data-wf-page`, `data-wf-site`, `data-wf-page-id`, `data-wf-element-id`
- `data-wf-ignore`
- `data-w-id` (once confirmed no animation is intended to be rebuilt against them)
- `data-beta-bgvideo-upgrade` (dead flag, no longer read by any current webflow.js behavior discovered)

**Must remain for now (load-bearing or high blast-radius if touched carelessly):**
- All `w-*` classes (navbar, nav-menu, inline-block, input, button, form, background-video, slider, lightbox, dyn-* CMS classes) — removing these without also rewriting the CSS/JS that targets them will visibly break layout or behavior
- `id="w-node-*"` — some of these IDs are used as CSS selectors (grid/flex item overrides) in `dipra.webflow.css`, not just Designer bookkeeping; renaming requires a careful find/replace pass, not a blind strip
- `data-collapse`/`data-animation`/`data-duration`/`data-easing` on the navbar until the mobile menu toggle is reimplemented in custom JS
- `data-poster-url`/`data-video-urls` until confirmed unused by the replacement video-loading approach

**Accessibility / semantic issues to address later (not urgent, but worth a backlog item):**
- Heading hierarchy is not linear: nearly every section on every page uses `<h1>` for what is visually a section heading (e.g., "Sobre nosotros", "Misión", "Visión", "Valores" are all `<h1>`), meaning most pages have 3–6 `<h1>` elements. Should eventually become `<h2>`/`<h3>` per section, keeping one true page `<h1>`.
- Several `<img>` tags have `alt=""` where the image is meaningful content (e.g., partner/brand logos in the "logos-wrapper" sections, marca-venta logos on servicios.html) rather than decorative — should get descriptive `alt` text.
- The mobile menu items in `<nav>` use inconsistent capitalization directly in markup (e.g., "QuiÉnes Somos" — stray capital É) — cosmetic but worth fixing during cleanup since it's rendered as-is (not CSS text-transform).
- Contact form inputs use `required=""` (valid HTML, just verify a screen reader / label association: each field currently pairs a `<div class="subtitle">` with the input, not a `<label for="">`) — should be converted to real `<label for="id">` elements for accessibility.
- No `lang` attribute is set on `<html>` even though all content is Spanish (`<html data-wf-page="..." data-wf-site="...">` — no `lang="es"`). Easy, high-value fix.
- No skip-to-content link for keyboard users bypassing the nav.

---

## 6. CSS review

**Files:**
- `normalize.css` (8 KB) — standard, not Webflow-specific, keep as-is.
- `webflow.css` (40 KB / 1,800 lines) — Webflow's generic component framework: grid system, base `.w-nav`/`.w-form`/`.w-slider`/`.w-lightbox`/`.w-background-video` styles, one `@keyframes spin` (form-submit loading spinner), and the now-dead `.w-webflow-badge` rules (badge markup isn't present in any page — safe to delete this block specifically). Required in full as long as any `w-*` markup remains; can be trimmed once/if that markup is replaced with custom equivalents.
- `dipra.webflow.css` (92 KB / 3,758 lines) — the actual site design: colors (CSS custom properties like `--light-outline`, `--sky-blue`), typography, 124 `@font-face` declarations, and 6 responsive breakpoints.

**Webflow-generated utility styles:** the bulk of `dipra.webflow.css` is Designer-generated (auto-numbered classes like `.growing-background.one`, `.growing-background.two` … `.nine`, positional helper classes like `.left`/`.right`/`.small`/`.down`, and many single-purpose wrapper classes such as `.medium-width-intro`, `.medium-width`, `.large-width`). These are safe to keep untouched — they're just how Webflow expresses layout, not proprietary lock-in, and renaming them is pure risk with no benefit at this phase.

**Duplicate rules:** Not systematically deduplicated by Webflow's export (e.g., near-identical `.logo`/`.logo.serv`/`.logo-image.partner__mobile` variants exist for what is visually the same partner-logo tile, once for desktop marquee and once for a mobile-only static list). This is intentional redundancy for the two different DOM structures used at different breakpoints (see `.partners` vs `.partners.serv.mobile` sections in servicios.html) rather than accidental duplication — flag for later CSS consolidation, not urgent.

**Unused styles:** A meaningful number of rules target classes not found in any of the 6 real pages (mostly the CMS-collection/lightbox/slider styles that only the orphaned `detail_projects.html` needs, plus `.w-webflow-badge`). Recommend deferring deletion until `detail_projects.html`'s fate is decided (§ risk assessment) — deleting CSS for a page you might still want to keep is higher risk than leaving a few unused KB in the stylesheet.

**Responsive breakpoints (consistent across both stylesheets):**
- `max-width: 479px` (small mobile)
- `max-width: 767px` (mobile)
- `max-width: 991px` (tablet — also the mobile-nav collapse breakpoint)
- `min-width: 1280px`, `min-width: 1440px`, `min-width: 1920px` (large-screen scaling, `dipra.webflow.css` only)
- `min-width: 768px` (one rule in `webflow.css`, unrelated to the above scale, likely a base component default)

**Classes that must not be renamed during the fidelity phase:** every `w-*` prefixed class (framework contract with `webflow.js` and `webflow.css`), every `w-node-*` ID, and every custom class in `dipra.webflow.css` that has no build step to catch typos — a renamed class here is a silent visual regression, not a compile error.

**Styles that depend on Webflow JavaScript:** none of the *visual* styling depends on JS — everything renders correctly with JS disabled except: (a) the mobile nav menu, which needs JS to open/close (CSS alone won't toggle `.w--open`), and (b) form-submit "please wait" state styling, which is inert without the forms module.

---

## 7. JavaScript review

**`js/webflow.js` (essential parts, if kept as-is):**
- `navbar` — required for the one interaction every page has (mobile menu toggle)
- `touch` — sets `w-mod-touch` class, used by some CSS rules
- `brand` — trivial nav-brand `w--current` handling
- `links` — smooth-scroll/anchor helper (used by the `#soluciones` and `#scroll` anchor links)
- Native `<video autoplay>` doesn't need JS at all, contrary to appearance

**Unused/dead for this site's real pages:**
- `slider` module — only exercised by the orphaned `detail_projects.html`
- `lightbox` module — same, orphaned page only
- `ix2` module — has no interaction payload to execute (see §2), so it currently runs and does nothing
- `focus` — Webflow's focus-visible polyfill/helper; low-value, harmless to keep or drop
- `forms` module — **will actively cause a failed network call** once hosted outside Webflow (POST to `webflow.com/api/v1/form/<site-id>` will not succeed for an unpublished/foreign site). This needs to be either removed (so the browser doesn't attempt it) or replaced by whatever solution is chosen for contact submission.

**Interactions that must be recreated with custom JavaScript:**
- Mobile nav open/close toggle (the only "must-have" custom script for this project)

**Interactions that can be replaced with CSS alone:**
- Hover effects — already pure CSS, nothing to do
- Responsive layout — already pure CSS, nothing to do
- (Optional) if the client wants the currently-inert scroll-reveal effect implemented, it could be done with CSS `@keyframes` + `IntersectionObserver`-triggered class toggles, avoiding IX2/webflow.js entirely

**Scripts that will stop working outside Webflow hosting:**
- The `forms` module's AJAX POST to `webflow.com/api/v1/form/...` (confirmed by inspecting the bundle string construction) — this is the one genuinely broken piece of functionality once off Webflow's servers, and it is already effectively non-functional today since there's no fallback wired up.
- Nothing else in `webflow.js` makes any other network calls to Webflow-owned endpoints.

---

## 8. Internal links / URL structure on Apache

All internal navigation uses simple relative filenames with `.html` extensions and no query strings or trailing slashes:
`index.html`, `quienes-somos.html`, `servicios.html`, `contacto.html`, `aviso-de-privacidad.html`, `detail_projects.html` (orphaned, unlinked).

This structure **transfers cleanly to a traditional Apache/`public_html` host with zero changes**:
- No client-side routing, no pretty/clean-URL rewriting is currently used or assumed.
- All links are relative (`href="servicios.html"`, `src="images/logo.png"`, etc.) — no absolute `/`-rooted paths and no hard-coded domain. This means the whole site can be dropped into any subdirectory or domain root without breaking links.
- The one internal in-page anchor (`href="#soluciones"` on index.html, `href="#scroll"` on the orphaned detail page) will keep working as-is.
- If the client wants clean URLs later (`/servicios` instead of `/servicios.html`), that's a `.htaccess` rewrite decision for the Optimization phase — not required for a correct migration.

---

## 9. Metadata review

| Item | Status |
|---|---|
| Page titles | 5 of 6 pages have a real, correct title. `detail_projects.html` has a leftover placeholder title (`- @TyCreated Webflow Template`) — another signal it's an unfinished/orphaned Webflow template page. |
| Meta descriptions | Present and identical across index/quienes-somos/servicios/contacto (all reuse the same company boilerplate sentence); `aviso-de-privacidad.html` reuses it too, which is fine but not page-specific. `detail_projects.html` has an empty description. |
| Canonical tags | **None exist on any page.** Should be added during cleanup (`<link rel="canonical" href="https://<final-domain>/<page>.html">`) once the production domain is known. |
| Open Graph metadata | Present on all 6 pages (`og:title`, `og:description`, `og:image`, `og:type`) — but `og:image` currently points at Webflow's CDN, not the local file (§4, needs fixing). `detail_projects.html`'s OG fields are empty placeholders. |
| Favicons | `images/favicon.png` (shortcut icon) and `images/webclip.png` (apple-touch-icon) both exist locally and are correctly linked on every page. No `.ico` fallback or modern `favicon.svg`/manifest is present — optional improvement, not required. |
| robots.txt | **Does not exist.** Needs to be created for a real host (at minimum an `Allow: /` or a `Disallow` for the orphaned template page/any staging paths). |
| sitemap.xml | **Does not exist.** Should be created for the 5 real pages once the final domain is set. |
| 404 behavior | **No custom 404 page exists.** On plain Apache with no `.htaccess` `ErrorDocument` directive, a missing page will fall back to the hosting provider's generic 404, not a branded one. |
| Analytics/tracking scripts | None present anywhere (confirmed by full-text search) — nothing to migrate or worry about breaking. |

---

## 10. Deployment issues for Apache / traditional hosting

| Concern | Finding |
|---|---|
| Relative vs. absolute paths | All asset/page references are relative — no leading `/` absolute paths, no hard-coded `https://` self-references. Safe for any subdirectory or domain. |
| Uppercase/lowercase filenames | 248 files across the repo contain uppercase letters in their names (e.g., `Image013.jpeg`, `Portrait002.jpeg`, `Dipra_OGraph.png`). All current HTML/CSS references match the actual case exactly (spot-checked), which matters because **Linux-based Apache hosting (Hostinger/GoDaddy) is case-sensitive** unlike the local macOS filesystem this was likely authored on (there's a stray `.DS_Store` file in the repo root confirming a Mac was used). Any future edits must preserve exact case, and the `.DS_Store` file should be deleted and git-ignored before going live. |
| Spaces / special characters in filenames | None found — all filenames use hyphens/underscores only. No encoding issues expected. |
| Clean URLs | Not used/needed today; all links already include `.html`. No rewrite rules required unless the client wants prettier URLs later. |
| `.html` extension handling | Every internal link explicitly includes `.html` — this works out of the box on any Apache host with zero configuration. |
| Apache configuration | No server-side includes, no `.htaccess`-dependent features (no redirects, no password protection, no MIME overrides) are currently required. Only a plain static file server is needed. |
| `.htaccess` rules | **File does not exist yet.** For a production Apache deployment, worth adding: force HTTPS redirect, a custom 404 (`ErrorDocument 404 /404.html`), and optionally `www` ↔ non-`www` canonicalization, gzip/caching headers for the video/font assets. None of this blocks a first deployment — nice-to-haves for the Optimization phase. |
| Unused/orphaned files | `detail_projects.html` (whole page), ~124 image derivatives not referenced by any current markup (Webflow's auto-generated responsive image sizes for images whose `srcset` was later simplified), and the `.DS_Store` file. None of these break deployment, but they bloat the upload. |

---

## 11. Page-by-page inventory

| # | File | Purpose | Linked from nav/footer? | Notable content/components |
|---|---|---|---|---|
| 1 | `index.html` | Home | Yes | Hero background video, "Sobre nosotros" intro, `#soluciones` services ticker section, partner-logo marquee, contact form (broken, see §2), footer |
| 2 | `quienes-somos.html` | About us | Yes | Hero video, Misión/Visión/Valores sections |
| 3 | `servicios.html` | Services | Yes | Hero video, 8 service blocks (Infraestructura, Internet Satelital [`.hidden` class — currently hidden via CSS], Venta de Equipo, Arrendamiento, Cámaras de Seguridad, Mesa de Ayuda, Licenciamiento + brand-partner logo wall, Diseño/Desarrollo Web, Desarrollo de Software) |
| 4 | `contacto.html` | Contact | Yes | Same contact form as index.html (broken, see §2) |
| 5 | `aviso-de-privacidad.html` | Privacy notice (legal) | Footer only | Static legal text, one `mailto:` link |
| 6 | `detail_projects.html` | Orphaned Webflow "project case study" CMS template | **No — not linked from anywhere** | Leftover from a Webflow template/CMS collection that was never populated: empty CMS bindings (`w-dyn-bind-empty`), placeholder testimonial slider with Lorem-ipsum-style names ("Ryan Baser / Delta Airlines" etc.), placeholder title `- @TyCreated Webflow Template`, a `"Mirror"` preloader element. Recommend confirming with the client whether to delete this page entirely rather than migrate it. |

Note: `servicios.html` contains a "Soluciones satelitales" (Starlink) block wrapped in a `.hidden` utility class — this section exists in the markup but is not currently visible on the live page (CSS `display: none` equivalent). Worth confirming with the client whether this is intentionally paused content.

---

## 12. Interaction inventory (everything that must be preserved)

| Interaction | Preserve? | Current implementation | Migration note |
|---|---|---|---|
| Mobile nav open/close | **Yes — must preserve** | `webflow.js` navbar module + CSS transitions | Needs ~20 lines of vanilla JS |
| Hero background video autoplay/loop/mute | **Yes — must preserve** | Native HTML5 `<video>`, no JS | Just repoint URLs to local `/videos/` files |
| Button/link hover states | **Yes — must preserve** | Pure CSS | No work needed |
| Smooth-scroll anchor links (`#soluciones`, `#scroll`) | **Yes — must preserve** | `webflow.js` links module (likely just default browser anchor behavior with smooth-scroll CSS/JS enhancement) | Verify whether `scroll-behavior: smooth` CSS alone reproduces this, avoiding JS entirely |
| Contact form submission | **Needs a decision, not a like-for-like migration** | Currently broken/no-op outside Webflow | Replace with mailto, WhatsApp link, or a third-party form endpoint (Formspree, Getform, etc.) per client preference — this is new work, not preservation |
| Scroll-reveal / load animations (IX2 hooks) | **Not currently functional — confirm before "preserving"** | Dead `data-w-id` hooks, no payload | Nothing to preserve; only rebuild if the client specifically wants this animation (re)added |
| Testimonial slider + lightbox (orphaned page only) | **Only if the orphaned page is kept** | `webflow.js` slider/lightbox modules | Recommend dropping with the page rather than reimplementing |
| Partner-logo horizontal strip | **Visual only — static, not an interaction** | Plain CSS flex/grid, tripled DOM content but no scroll/animation CSS found | Confirm with client whether an auto-scrolling marquee was ever intended; today it renders as a static row |

---

## 13. Risk assessment

**Low risk**
- Copying/keeping `normalize.css`, images, fonts as-is
- Preserving all internal navigation links and the `.html`-based URL structure
- Preserving hover effects and responsive breakpoints (pure CSS, no JS involved)
- Preserving the hero background video behavior (native HTML5, just needs a path fix)
- Stripping Webflow-only metadata/comments/`data-wf-*` attributes that have no visual or functional effect
- Deleting the dead `.w-webflow-badge` CSS block

**Medium risk**
- Rebuilding the mobile nav toggle in custom JS (well-understood, small surface area, but is the one interaction that must work correctly on first try across breakpoints)
- Deciding the fate of Google Fonts (Montserrat/Orbitron) — keep as external CDN vs. self-host; either choice is safe, but it's a decision that affects font-loading behavior and true "independence"
- Cleaning up ~124 apparently-unused image derivatives — safe if genuinely unreferenced, but needs a careful verification pass (some may be referenced via `srcset` strings that weren't caught by a simple grep) before deletion
- Renaming/removing `w-node-*` IDs or `w-*` classes — low individual risk per element, but easy to introduce a silent visual regression at scale; should be done deliberately in the Cleanup phase, not casually
- Deciding what to do with the orphaned `detail_projects.html` (delete vs. finish vs. leave dormant)

**High risk**
- **Contact form**: currently non-functional in any post-Webflow environment and has no fallback anywhere in the codebase (no WhatsApp link, no mailto, no alternate form action) despite that being the stated intended pattern for this project. Shipping the site without addressing this means the "Contáctanos" call-to-action on two pages silently does nothing. This must be resolved (even if the resolution is as simple as adding a WhatsApp `wa.me` link) before this migration can be considered complete.
- **External asset drift**: the hero video and OG image being served from `uploads-ssl.webflow.com` right now means the site's core visual asset (autoplaying hero background, present on 3 of 5 live pages) and its social-share preview image are one Webflow account/billing lapse away from breaking for everyone, even before any migration work starts. This should be treated as urgent regardless of the broader migration timeline.

---

## 14. Proposed migration plan (conservative, no redesign, no framework, no build tooling)

### Phase A — Visual preservation
- Snapshot current rendered output of all 5 live pages (desktop + mobile breakpoints) as a visual baseline for later regression comparison.
- Change nothing yet; this phase is purely about having a "ground truth" to compare against.

### Phase B — Webflow decoupling
- Repoint the hero video `src`/`data-poster-url`/`data-video-urls` on index/quienes-somos/servicios (and detail page, if kept) from `uploads-ssl.webflow.com` to the local `/videos/` files that already exist.
- Repoint `og:image`/`twitter:image` on all 6 pages to the local `images/Dipra_OGraph.png`.
- Download the `background-image.svg` currently pulled from `d3e54v103j8qbb.cloudfront.net` and repoint the two `dipra.webflow.css` rules that use it to a local path.
- Decide and implement the Google Fonts approach (keep as external link, or download + add `@font-face` rules alongside the other 7 local families).
- Vendor jQuery 3.5.1 locally (or confirm the CDN dependency is acceptable) if the goal is zero external calls.
- Strip cosmetic Webflow-only markers: HTML comments, `<meta name="generator">`, `data-wf-page`, `data-wf-site`, `data-wf-page-id`, `data-wf-element-id`, `data-wf-ignore`, `data-beta-bgvideo-upgrade`.

### Phase C — Interaction replacement
- Write a small vanilla-JS mobile nav toggle to replace `webflow.js`'s navbar module (open/close `.w-nav-menu`, toggle `.nav-cover`, respect the existing `991px` breakpoint and CSS transition classes already in `dipra.webflow.css`).
- Resolve the contact form: get a decision from the client (WhatsApp link is the pattern named in the project brief; alternatives are a `mailto:` link or a third-party form endpoint), then implement the simplest option on both index.html and contacto.html, and remove the now-pointless Webflow `forms` module reliance (`method`/`action`, `data-wf-*` attributes on the `<form>`).
- Get a decision on `detail_projects.html`: delete it, or keep it dormant/unlinked as-is (recommendation: delete, since it's an unfinished template with placeholder content and zero real traffic path).
- Confirm whether the currently-inert scroll-reveal effect and the tripled-DOM logo marquee were ever meant to animate; if yes, implement with plain CSS/`IntersectionObserver`; if no, leave as static (current behavior) and remove the dead `data-w-id` hooks.

### Phase D — Cleanup
- Remove the `.w-webflow-badge` CSS block (dead, no matching markup).
- Remove `.DS_Store` and add a `.gitignore` entry for it.
- Verify and remove genuinely-unreferenced image derivatives (double-check against `srcset`/`sizes` strings, not just `src`, before deleting).
- Add `lang="es"` to every `<html>` tag.
- Convert field labels to proper `<label for="">` associations in the contact form.
- Fix heading hierarchy (single `<h1>` per page, section headers demoted to `<h2>`/`<h3>`).
- Add descriptive `alt` text to meaningful logo/brand images.

### Phase E — Testing
- Cross-browser/device check of: mobile nav toggle, hero video autoplay, hover states, responsive breakpoints, contact form's replacement mechanism, all internal links, favicon/social-preview rendering.
- Validate no remaining requests to `webflow.com`, `uploads-ssl.webflow.com`, or Webflow's CloudFront domain in the browser network panel (unless jQuery was deliberately kept on that CDN).
- Run an HTML validator pass and a basic accessibility check (contrast, labels, heading order) against the Phase D fixes.

### Phase F — Optimization
- Add `robots.txt` and `sitemap.xml` for the 5 real pages.
- Add canonical tags once the production domain is finalized.
- Add a custom 404 page + `.htaccess` `ErrorDocument` rule.
- Consider `.htaccess` cache-control/gzip rules for the video and font assets (largest payload on the site).
- Consider trimming unused font weights/styles from the 124 `@font-face` declarations if some are never actually applied by any CSS rule (needs a usage audit against `font-weight`/`font-style` combinations actually referenced).

### Phase G — Packaging and deployment
- Final review of file casing consistency (Linux Apache is case-sensitive; the repo shows Mac-authored artifacts).
- Zip/copy the finished tree directly into `public_html` on the target host (Hostinger/GoDaddy) — no build step, no server-side dependencies, plain file copy is sufficient given the current architecture.
- Smoke-test all 5 live pages plus the contact mechanism on the actual production domain over HTTPS.

---

## Open questions for the client (blocking Phase C, non-blocking for Phases A/B)

1. What should the "Contáctanos" form actually do once live — WhatsApp link, `mailto:`, or a third-party form service?
2. Should `detail_projects.html` be deleted, or is there a reason to keep it around?
3. Was there ever a working scroll-reveal / marquee animation intended for the "Soluciones enfocadas a tus necesidades" section and the partner-logo strip, or has it always rendered statically as it does today?
4. Is the "Internet Satelital / Starlink" block on `servicios.html` (currently hidden via CSS) intentionally paused, or should it be re-enabled?
5. Preference on Google Fonts: keep the Google CDN dependency, or fully self-host Montserrat/Orbitron alongside the other 7 font families?
