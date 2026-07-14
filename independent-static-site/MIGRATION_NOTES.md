# Migration Notes — Dipra Webflow export → independent static site

This directory (`independent-static-site/`) is a fully independent, standard
HTML/CSS/JS build of the Dipra site, derived from the Webflow export at the
repository root. The original export was **not modified** — this is a
separate, rollback-safe copy. Production domain assumed throughout:
`https://www.dipra-soluciones.com`.

No framework, npm package, build tool, or bundler was introduced. Every page
can be opened directly from disk or served by any static/Apache host as-is.

---

## 1. Removed Webflow dependencies

| Removed | Replacement |
|---|---|
| `js/webflow.js` (276 KB Webflow runtime) | `js/main.js` — a small hand-written vanilla-JS file (see §2) |
| jQuery 3.5.1 loaded from Webflow's CDN (`d3e54v103j8qbb.cloudfront.net`) | Removed entirely — nothing in the custom JS needs it |
| `WebFont.load(...)` + `ajax.googleapis.com/ajax/libs/webfont/1.6.26/webfont.js` + `fonts.googleapis.com`/`fonts.gstatic.com` preconnects | `css/fonts-local.css` — self-hosted Montserrat + Orbitron (see §5) |
| `<!-- This site was created in Webflow -->` / "Last Published" HTML comments | Removed from all 6 pages |
| `<meta name="generator" content="Webflow">` | Removed from all 6 pages |
| `data-wf-page`, `data-wf-site` on `<html>` | Removed; `<html>` now carries `lang="es"` instead |
| `data-wf-page-id`, `data-wf-element-id` on the two `<form>` elements | Removed (Webflow form-backend bookkeeping only) |
| `data-wf-ignore="true"`, `data-beta-bgvideo-upgrade="false"` on video containers | Removed (Designer-only flags, not read by any code we kept) |
| `data-w-id="<uuid>"` (IX2 interaction hooks) on `index.html` and `detail_projects.html` | Removed. **Confirmed dead in the audit phase**: no IX2 interactions payload exists anywhere in this export (no inline JSON, no per-site interactions script), so these hooks never animated anything even under Webflow hosting. Removing them changes nothing visually. |
| `.w-webflow-badge` CSS rule block in `css/webflow.css` | Deleted — no matching badge element exists in any page's HTML |
| Webflow-hosted hero video + poster (`uploads-ssl.webflow.com/.../colab-transcode.mp4`, `.webm`, `colab-poster-00001.jpg`) | Repointed to the local `videos/` files that already existed unused in the export, on index/quienes-somos/servicios/detail_projects |
| Webflow-hosted Open Graph/Twitter image (`uploads-ssl.webflow.com/.../Dipra_OGraph.png`) | Repointed to `https://www.dipra-soluciones.com/images/Dipra_OGraph.png` (local file already existed unused) on all 6 pages |

**Not removed / could not remove (see §7 for why):** two `background-image`
rules in `css/dipra.webflow.css` still point at
`https://d3e54v103j8qbb.cloudfront.net/img/background-image.svg`. Both are
marked with `TODO` comments in the CSS. This is the one Webflow CDN reference
that remains.

---

## 2. Replaced interactions

| Interaction | Old mechanism | New mechanism |
|---|---|---|
| Mobile nav open/close | `webflow.js` navbar module, driven by `data-collapse`/`data-animation`/`data-duration`/`data-easing` | `js/main.js` `initNavbars()` — vanilla JS toggle that reads the same `data-duration`/`data-easing` attributes off the DOM (so it still honors the values the Webflow designer set: 400ms, ease), animates `max-height` on `.mobile-nav-menu`, toggles `.w--open` on the button (existing CSS already styles that class) and sets `aria-expanded`/`aria-hidden`. Also closes on link click, on Escape, and when the viewport is resized back above the 991px collapse breakpoint (none of that regresses anything — it's added robustness, not a visual change). |
| Testimonial slider + dot nav (only on the unlinked `detail_projects.html`) | `webflow.js` slider module | `js/main.js` `initSliders()` — generic vanilla implementation: wraps the existing `.w-slide` elements in a runtime-created track div (Webflow's own markup has no such wrapper, and translating the `overflow:hidden` mask itself would have moved the whole viewport instead of the content — see the comment in `main.js`), builds the `.w-slider-dot` dots that Webflow normally injects via JS, and wires the existing prev/next arrows. Honors `data-infinite` (wrap-around) and `data-duration` (this slider is configured `data-duration="0"`, i.e. instant switch — honored as-is). |
| Contact form submission | `webflow.js` forms module, AJAX POST to `https://webflow.com/api/v1/form/<site-id>` | **Disabled, not replaced** — see §3 and §6. `js/main.js` `initForms()` intercepts submit, prevents the page from reloading/navigating, and reveals the form's own pre-existing `.error-message.w-form-fail` block (the "Oops! Something went wrong..." text that was already part of the Webflow markup, unused until now). No new UI was invented; no fake success message is shown. |
| Hover states (buttons, footer links, nav) | Pure CSS `:hover` rules | Unchanged — no JS was ever involved |
| Responsive layout/breakpoints | Pure CSS media queries | Unchanged |
| Hero background video autoplay/loop/mute | Native `<video autoplay loop muted playsinline>` — never actually needed JS | Unchanged, only the source URLs moved local (§1) |
| Dropdowns, tabs, accordions | N/A | Confirmed in the audit phase that none of these components exist anywhere on this site — nothing to replace |

---

## 3. The contact form is intentionally left non-functional (by request)

Per explicit direction during this migration, the contact form on
`index.html` and `contacto.html` was **not** wired to a WhatsApp link, a
`mailto:`, or a third-party form endpoint. It still renders pixel-identical
to the original, but submitting it now:

- Does **not** navigate away or reload the page (JS prevents the default
  GET submission that would otherwise happen once `webflow.js` is gone).
- Shows the form's own "Oops! Something went wrong while submitting the
  form. Try again!" message (pre-existing Webflow markup, `.w-form-fail`),
  which is now an honest statement — there genuinely is no backend.
- Does **not** show the "Thank you!" success message, since that would be
  false.

**This must be resolved before launch.** The two realistic options,
carried over from the audit: a WhatsApp click-to-chat link (`wa.me/<number>`)
or a `mailto:`/third-party form endpoint. Whichever is chosen, the change is
isolated to `initForms()` in `js/main.js` (and possibly the `<form>` markup
in `index.html`/`contacto.html`) — nothing else in the site depends on it.

---

## 4. External dependencies that remain

| Dependency | Where | Why it remains |
|---|---|---|
| `https://d3e54v103j8qbb.cloudfront.net/img/background-image.svg` | `css/dipra.webflow.css`, two rules (`.section.clip.no-padding` — index.html's "Soluciones" ticker background; `.project-background` — orphaned detail page only) | Could not be downloaded from this build environment — the sandbox's network egress policy blocks `d3e54v103j8qbb.cloudfront.net` (confirmed via the environment's proxy diagnostics; this is a Webflow-owned CDN host, not covered by the general internet access this environment otherwise had). **Action required before this is a fully independent build**: download that SVG file from a machine with normal internet access, save it as `images/background-image.svg`, and update the two `url()` references (each marked with a `TODO` comment) to `url('../images/background-image.svg')`. |
| None else | — | Google Fonts (Montserrat, Orbitron) were successfully downloaded and self-hosted (§5). jQuery was removed outright — nothing needs it. |

No analytics, tracking pixels, Meta Pixel, embedded maps, video embeds, or
third-party widgets were found anywhere in the original export, so none
needed to be preserved or re-added.

---

## 5. Fonts: self-hosted Montserrat + Orbitron

The original site loaded Montserrat (all 9 weights × normal/italic) and
Orbitron (weights 400–900) at runtime from Google Fonts via Webflow's
`WebFont.load()` loader. For a fully independent, offline-capable build,
these were downloaded and added alongside the other 7 already-local font
families (Author, Calibri, Clash Display, General Sans, Ranade, Satoshi,
THICCCBOI):

- `fonts/Montserrat-VariableFont.woff2` (normal, variable weight axis 100–900)
- `fonts/Montserrat-Italic-VariableFont.woff2` (italic, same weight axis)
- `fonts/Orbitron-VariableFont.woff2` (normal, weight axis 400–900)

These are Google's own variable-font builds (one file legitimately covers
the whole weight range Webflow's `WebFont.load()` call requested — verified
by inspecting the actual `@font-face` blocks Google's API returned rather
than assuming), restricted to the **Latin** Unicode subset, which fully
covers the site's Spanish content (all accented characters used — á, é, í,
ó, ú, ñ, ¿, ¡ — sit inside the Latin-1 range). Cyrillic/Greek/Vietnamese
subsets that Google also serves for these families were not downloaded,
since nothing on this site needs them.

New stylesheet: `css/fonts-local.css`, linked from every page in place of
the removed Google Fonts `<script>`/`<link>` tags.

---

## 6. Files that must be reviewed manually before launch

1. **Contact form backend** (§3) — currently a safe no-op, needs a real
   destination (WhatsApp, mailto, or a form service) before launch.
2. **`css/dipra.webflow.css` background-image.svg** (§4) — two `TODO`-marked
   rules still point at Webflow's CDN; needs the file downloaded and the
   URL swapped once someone has unrestricted internet access.
3. **`detail_projects.html`** — this page is not linked from anywhere on
   the live site (confirmed in the audit) and contains leftover Webflow CMS
   template placeholders (empty CMS bindings, Lorem-ipsum-style testimonial
   names, a "Mirror" preloader). It was carried over as-is (not deleted, to
   stay rollback-safe) and given `noindex, nofollow` plus a
   `robots.txt` disallow so it can't be crawled. **Decide whether to delete
   it or keep it** — no visual/functional risk either way since it's
   already fully isolated.
4. **~124 image files** in `images/` that don't appear to be referenced by
   any current HTML/CSS (Webflow-generated responsive derivatives —
   `-p-500`, `-p-800`, `-p-1080`, `-p-1600`, `-p-2000`, `-p-2600`,
   `-p-3200`, `-p-130x130q80` suffixes). Per the "don't aggressively
   optimize yet" instruction for this phase, **none of these were
   deleted** — they were copied over as-is. A future cleanup pass should
   re-verify actual usage (including inside `srcset`/`sizes` strings, not
   just `src`) before removing anything.
5. **Heading hierarchy** — nearly every section on every page uses `<h1>`
   for what is visually a sub-heading (e.g. "Sobre nosotros", "Misión",
   "Visión", "Valores" are all `<h1>`), so most pages have 3–6 `<h1>`
   elements. **Deliberately not changed in this pass**: the shared
   `.heading` class does not set an explicit `font-size` — that comes from
   the browser's default per-tag size (`webflow.css` sets `h1{font-size:
   38px}` vs `h2{font-size:32px}`, etc.), so blindly retagging `<h1>` to
   `<h2>` would visibly shrink text on every plain `.heading` element
   without a size modifier class. Fixing this properly needs a matching
   explicit `font-size` override added alongside the retag, which is cleanup
   work for a later pass, not this fidelity-first migration.
6. **`www.dipra-soluciones.com`** was assumed as the canonical production
   domain (per the request), and is hardcoded into: every page's
   `rel="canonical"` tag, the Open Graph/Twitter image URLs, `sitemap.xml`,
   `robots.txt`'s `Sitemap:` line, and `.htaccess`'s www-redirect rule. If
   the real production domain differs, update all of those.

---

## 7. Known limitations

- **`background-image.svg` still loads from Webflow's CDN** (§4) — the only
  remaining external Webflow dependency. Low visual impact (it's a subtle
  decorative background pattern behind the "Soluciones enfocadas a tus
  necesidades" ticker on `index.html`, and behind the hero of the orphaned
  `detail_projects.html`), but it does mean the site is not yet 100%
  self-hosted until that one file is fetched and swapped in manually.
- **Contact form has no working backend** (§3) — by request, left as a
  clearly-flagged placeholder rather than guessed at.
- **IX2 scroll-reveal / page-load animation was already non-functional**
  before this migration (confirmed in the audit: no interactions payload
  ever existed in this export), so nothing was "lost" here — but if the
  original Webflow-hosted site ever actually showed a scroll-reveal effect
  on the "Soluciones enfocadas a tus necesidades" heading grid, that
  behavior was never recoverable from this export and would need to be
  designed fresh.
- **Partner-logo strip** (`.logos-looping-wrapper`) has no scroll/marquee
  animation in the CSS (verified: no matching `@keyframes` or transform
  exists) — it renders as a static row today, same as before migration.
  If an auto-scrolling marquee was originally intended, that's new work,
  not something this migration could carry over.
- Very old browsers without variable-font support will fall back to the
  browser's default sans-serif for Montserrat/Orbitron rather than a
  specific static weight (`font-display: swap` is set, so this only shows
  briefly, if at all, on modern browsers).

---

## 8. Deployment requirements

1. Copy the entire contents of this `independent-static-site/` directory
   into the host's `public_html/` (or equivalent) — no build step, no
   `npm install`, nothing to compile.
2. Requires an Apache server with `mod_rewrite` available for the
   `.htaccess` rules (HTTPS redirect, www canonicalization, optional
   clean-URL fallback, custom 404). The `.htaccess` wraps its rewrite rules
   in `<IfModule mod_rewrite.c>`, so the site still works (minus those
   specific redirects) even if `mod_rewrite` isn't enabled.
3. Verify the production domain matches `www.dipra-soluciones.com` (see
   §6, item 6) or update the hardcoded references if not.
4. Resolve the two manual-review items in §6 (contact form backend,
   `background-image.svg`) before considering this launch-ready.
5. Standard file-case discipline: this project was originally authored on
   macOS (a stray `.DS_Store` was found in the source export and was not
   copied into this build) — Apache on Linux hosting is case-sensitive, so
   don't rename any asset file's case during deployment.

---

## 9. Pages and breakpoints tested

All 6 pages (`index.html`, `quienes-somos.html`, `servicios.html`,
`contacto.html`, `aviso-de-privacidad.html`, `detail_projects.html`) plus
the new `404.html` were rendered in headless Chromium, served over a local
static HTTP server (matching how Apache would serve the same files), at
three viewport widths:

- **Desktop** — 1440×900
- **Tablet** — 768×1024
- **Mobile** — 390×844

Verified via full-page screenshots and scripted interaction checks:

- No console errors and no unexpected failed network requests (the only
  external request left is the documented `background-image.svg` CDN call,
  and the two `<source>` elements on the hero `<video>` both resolve — the
  browser picks one and cancels the other, which shows up as a benign
  `ERR_ABORTED` on the unused format, not a real failure).
- Hero background video actually plays (checked `readyState`/`videoWidth`/
  `paused` on the live `<video>` element, not just that the tag exists).
- Mobile nav toggle opens (animates `max-height`, sets `aria-expanded`,
  shows all 4 links) and closes correctly on `index.html` at the mobile
  viewport.
- Contact form on `contacto.html`: submitting no longer reloads/navigates
  the page, and shows the "Oops!" fail state, not the "Thank you!" success
  state.
- Testimonial slider on `detail_projects.html`: 3 dots generated, next-arrow
  click advances to slide 2 and marks the correct dot active.
- Brand/partner logo images on `index.html` and `servicios.html` load
  correctly (their `loading="lazy"` attribute — inherited unchanged from
  the original Webflow export — just means they don't load until actually
  scrolled into view, which is expected, pre-existing behavior, not a
  migration regression).

Not tested: real Safari/Firefox/mobile-device rendering (only Chromium was
available in this environment), and real screen-reader software (the
accessibility fixes in §10 were verified structurally — correct ARIA
attributes/associations present — not audibly).

---

## 10. Accessibility fixes made alongside the migration

These were low-risk, zero-visual-impact additions made while the markup was
already being touched for Webflow-attribute removal:

- `lang="es"` added to every page's `<html>` tag.
- Contact form fields (`Nombre`, `Email`, `Teléfono`, `Mensaje`) now have
  `aria-labelledby` pointing at their existing `.subtitle` label divs
  (kept as plain `<div>`s rather than converting to `<label>`, since
  `.subtitle` has no explicit `display` rule and a real `<label>` defaults
  to inline — converting the tag risked breaking the form's layout; the
  ARIA association achieves the same accessibility benefit with zero
  visual risk).
- Brand/partner logo images (`aspel.png`, `avast.png`, `microsoft.png`,
  etc. — 46 `<img>` occurrences across `index.html`/`servicios.html`)
  now have descriptive `alt` text derived from their filenames instead of
  `alt=""`.
- The header logo/brand image (`images/logo.png`) now has
  `alt="Dipra Soluciones Integrales"` instead of an empty `alt` — it was
  previously the sole content of the home link with nothing for a screen
  reader to announce.
- The icon-only mobile menu button now has
  `aria-label="Abrir menú de navegación"`, plus `aria-expanded` that the
  new JS keeps in sync with open/closed state.
- `detail_projects.html`'s leftover placeholder title ("- @TyCreated
  Webflow Template" — a literal Webflow-branding leak) was changed to
  "Dipra Soluciones Integrales" to remove the branding mention, since the
  page is carried over rather than deleted (§6, item 3).

Purely cosmetic/structural issues flagged in the audit but **not** touched
in this pass (to avoid visual risk) are listed in §6, item 5 above.
