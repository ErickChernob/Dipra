# Final QA Report — Dipra Soluciones Integrales (production-readiness pass)

This report covers the QA/hardening pass performed on top of the
independent static build (`independent-static-site/`, produced in the prior
migration phase) before packaging it as `public_html_ready/` /
`public_html_ready.zip`. For the original migration's own findings, see
`independent-static-site/MIGRATION_NOTES.md`.

---

## Pages tested

All 7 HTML pages in the project:

- `index.html`
- `quienes-somos.html`
- `servicios.html`
- `contacto.html`
- `aviso-de-privacidad.html`
- `detail_projects.html` (unlinked/orphaned page, carried over — see
  MIGRATION_NOTES.md; `noindex` + `robots.txt` disallow already in place)
- `404.html` (new custom error page)

## Viewports tested

1440px, 1280px, 1024px, 768px, 480px, 375px — full-page screenshots taken
at every width for every page, plus scripted checks for console errors and
failed network requests at each combination (42 page/width renders total).
No layout breakage, text overflow, or missing content was found at any
combination.

## Interactions tested

- **Mobile navigation** (all pages): toggle opens/closes, animates
  `max-height` using the original `data-duration`/`data-easing` values,
  sets `aria-expanded`, closes on link click / outside resize / Escape.
  Verified via scripted DOM state checks (not just visual).
- **Hero background video** (index/quienes-somos/servicios/detail_projects):
  verified the live `<video>` element actually reaches `readyState 4`
  (HAVE_ENOUGH_DATA), has non-zero `videoWidth`, and `paused === false` —
  not just that the tag exists in markup.
- **Testimonial slider** (`detail_projects.html`, the only page with one):
  dot navigation is generated correctly (3 dots for 3 slides), clicking the
  next arrow advances the slide and updates the active dot; the arrows are
  now keyboard-focusable with `aria-label`s ("Anterior"/"Siguiente").
- **Contact form** (`index.html`, `contacto.html`): submitting no longer
  navigates/reloads the page; shows the form's own pre-existing "Oops!"
  fail message; does not show a fake success message. This is a deliberate,
  documented state (see "Remaining external services" below), not a bug.
- **Every internal link** (nav, footer, in-page anchors): checked
  programmatically against the filesystem — every `href`/`src` in every
  HTML file and every `url()` in every CSS file resolves to a real,
  correctly-cased file (Linux-style case-sensitive check, matching how
  Apache hosting behaves). Zero missing files.
- **External links**: only two exist in the whole project — the site's own
  canonical self-URLs (`https://www.dipra-soluciones.com/...`, expected)
  and one `mailto:protecciondedatos@diprasoluciones.com` link on the
  privacy notice page. No WhatsApp, no social links, no embedded
  maps/widgets exist anywhere (confirmed by full-text search — nothing to
  test because nothing is there).
- **Custom 404 behavior**: `404.html` renders correctly standalone (same
  nav/footer chrome, "Volver al inicio" button back to the homepage) and
  `.htaccess` wires it up via `ErrorDocument 404 /404.html`. This specific
  Apache directive can only be exercised on a real Apache server, not the
  plain Python test server used during this QA pass — see "Manual checks
  still recommended."

## Broken links / issues found and corrected

| Issue | Fix |
|---|---|
| 4 of 6 real pages shared the exact same `<title>` ("...Soluciones de Tecnología Integrales") | Gave `quienes-somos.html`, `servicios.html`, and `contacto.html` unique titles built from each page's own existing nav label/heading (no invented copy), and synced the matching `og:title`/`twitter:title` |
| Favicon declared `type="image/x-icon"` while the file is actually a PNG | Corrected to `type="image/png"` on all 7 pages |
| Slider prev/next arrows had no accessible name and weren't keyboard-reachable | Added `role="button"`, `tabindex="0"`, `aria-label`, and Enter/Space activation in `js/main.js` |
| Mobile-menu button and slider arrows/dots relied on `outline: 0` from `css/webflow.css` with no visual replacement, so keyboard focus was invisible | Added a `:focus-visible` outline rule in `css/dipra.webflow.css` scoped to just those three controls |
| Header logo and hamburger-menu icon (both permanently visible in the fixed navbar) were marked `loading="lazy"`, inherited unchanged from the Webflow export | Removed `loading="lazy"` from those two images only (everything genuinely below the fold keeps it) |
| No `<main>` landmark on any page | Added `<main>`/`</main>` around each page's primary content, between the navbar and the footer (verified no CSS in the project uses a `body >` child combinator that this could affect) |
| No font preloading | Added `<link rel="preload">` for the two variable-font files actually used above the fold (Montserrat body text, Orbitron headings); the rarely-needed italic file was not preloaded |
| `js/main.js` was loaded with a plain `<script src>` at the end of `<body>` | Added `defer` (behaviorally a no-op at that position, but explicit and correct) |
| Dead Webflow component CSS in `css/webflow.css`: the embedded base64 `webflow-icons` font + all `w-icon-*` rules, the entire `w-dropdown-*` block, the entire `w-tabs`/`w-tab-*` block, the entire `w-file-upload-*` block, and the `w-radio-*` block | Removed after confirming zero matching markup exists anywhere in the project (dropdowns, tabs, file inputs, and radio inputs were never used on this site) — file shrank from 1800 to ~1420 lines with no visual change |
| `.htaccess` did a two-hop redirect for an `http://` + non-www request (HTTP→HTTPS, then HTTPS non-www→www) | Combined into a single-hop redirect using an `[OR]` condition |
| No browser caching, compression, or security headers in `.htaccess` | Added `mod_expires` cache lifetimes, `mod_deflate` compression for text assets, and safe `mod_headers` (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`) — none of these restrict any third-party resource the site actually uses |
| No file compression pass had been done | Re-encoded all 129 JPEG/PNG images losslessly/near-losslessly (JPEG quality 87 + optimize + progressive; PNG optimize) — verified every file still opens/decodes correctly and re-screenshotted a heavy-image page (`servicios.html`) to confirm no visible quality loss. Total: 32.47 MB → 24.36 MB (−8.11 MB) |

No actually-broken links, missing files, JavaScript console errors, unexpected 404 asset requests, mixed-content warnings, or case-sensitivity mismatches were found anywhere in the project.

## Webflow dependency verification

Full-project search for `webflow`, `website-files`, `data-wf`, `w-nav`,
`w-slider`, `w-dropdown`, `w-tab`, `Webflow.push`, `Webflow.require`, and
`webflow.js`, with every remaining hit classified:

| Pattern | Remaining occurrences | Classification |
|---|---|---|
| `webflow.js` / `Webflow.push` / `Webflow.require` | None in code — only mentioned in `js/main.js` code comments explaining what was replaced and why | Documentation only, zero functional dependency |
| `data-wf-*` | None | Fully removed in the prior migration phase |
| `w-nav`, `w-nav-*` classes | All 7 pages | **Required** — pure CSS/structural class names consumed only by `css/webflow.css` and `js/main.js` (our own code); renaming would touch every page's markup for no functional benefit, so kept per the "legacy class names may remain" allowance |
| `w-slider`, `w-slide`, `w-slider-*` classes | `detail_projects.html` only | **Required** — same reasoning; driven entirely by `js/main.js`'s own slider implementation, not any Webflow script |
| `w-dropdown` | Was present only in unused CSS in `css/webflow.css` (no matching HTML anywhere) | **Removed** — confirmed dead, deleted |
| `w-tab` / `w-tabs` | Was present only in unused CSS in `css/webflow.css` (no matching HTML anywhere) | **Removed** — confirmed dead, deleted |
| Filenames `css/webflow.css`, `css/dipra.webflow.css` | All 7 pages' `<link>` tags | **Harmless legacy naming** — the strings are just filenames, not a runtime dependency on Webflow's servers or scripts; left as-is to avoid a mechanical rename across every page for zero functional gain |
| `webflow-icons` embedded icon font | Was present in `css/webflow.css`, unused by any `w-icon-*` class anywhere in the project | **Removed** — confirmed dead, deleted (also shrinks the CSS file, since it was a large embedded base64 font) |

**No unresolved functional dependency on the Webflow runtime remains.**
`js/webflow.js` and the jQuery CDN script were already removed in the prior
migration phase; this pass additionally removed the last pieces of dead
Webflow-component CSS. The site does not load any script from
`webflow.com`, `*.webflow.io`, `website-files.com`, or Webflow's asset CDN,
and does not require Webflow hosting to function.

## Remaining external services

- **One CDN reference**: a decorative background SVG
  (`https://d3e54v103j8qbb.cloudfront.net/img/background-image.svg`) used
  behind the "Soluciones enfocadas a tus necesidades" ticker on `index.html`
  and behind the hero of the unlinked `detail_projects.html`. This could
  not be downloaded in the build sandbox (its network egress policy blocks
  that specific host), so it's still marked with `TODO` comments in
  `css/dipra.webflow.css`. It is a genuine Webflow-CDN-hosted asset that
  should be downloaded and localized before considering the site 100%
  independent of any Webflow-owned infrastructure — see MIGRATION_NOTES.md
  for the exact two lines to change.
- **No analytics, tracking pixels, Meta Pixel, embedded maps, video embeds
  beyond the local hero video, or third-party widgets** exist anywhere in
  the project (confirmed by full-text search) — nothing else to disclose.
- **No WhatsApp integration** exists (by explicit choice during the prior
  migration phase — the contact form was deliberately left as a
  clearly-flagged non-functional placeholder rather than guessing at a
  phone number or inbox address).

## Known limitations

- The contact form on `index.html`/`contacto.html` has no working backend.
  It safely no-ops (no page reload, shows the pre-existing "Oops!" state)
  rather than silently failing or showing a false "Thank you!" — but it
  still needs a real destination (WhatsApp link, mailto, or a form
  service) wired up before launch.
- The one CDN dependency described above remains until manually localized.
- `detail_projects.html` is an orphaned Webflow-CMS-template leftover
  (empty CMS bindings, placeholder testimonial names) that isn't linked
  from anywhere on the live site; it's `noindex`'d and disallowed in
  `robots.txt`, but still physically present in the deployment package.
  Confirm with the site owner whether to delete it outright.
- Heading hierarchy (many `<h1>`s per page) was deliberately left
  unchanged — see MIGRATION_NOTES.md for why fixing it safely requires
  adding matching `font-size` CSS overrides, which is out of scope for a
  fidelity-preserving pass.
- ~124 Webflow-generated responsive image derivatives that don't appear
  referenced by current markup were kept, not deleted, per the
  instruction to avoid aggressive/unverified cleanup.

## Manual checks still recommended

- Real-device testing (this QA pass used headless Chromium only; Safari,
  Firefox, and real iOS/Android devices were not available in this
  environment).
- Live verification of the `.htaccess` behavior once deployed to actual
  Apache: the HTTPS/www redirect, the custom 404 page, and the optional
  clean-URL fallback all depend on `mod_rewrite`/`mod_expires`/
  `mod_deflate`/`mod_headers` being enabled on the target host — these
  were reviewed for correct syntax but could not be executed against a
  real Apache instance in this environment.
- SSL certificate issuance and the HTTP→HTTPS redirect, once DNS points at
  the real hosting account (see DEPLOYMENT_GUIDE.md).
- Screen-reader testing of the accessibility fixes made in this pass and
  the prior migration phase (verified structurally — correct ARIA
  attributes/roles present — not audibly with actual assistive tech).
- Resolving the contact form and the one remaining CDN asset before
  calling the site launch-ready.

## Confirmation: Webflow runtime dependency removed

Confirmed. The project does not load `webflow.js`, jQuery from Webflow's
CDN, or any `Webflow.push`/`Webflow.require` initialization call. All
interactive behavior (mobile nav, testimonial slider, contact-form guard)
runs from a single hand-written `js/main.js` with no external library
dependency. The only remaining reference to Webflow's infrastructure is
the one documented CDN image noted above — everything else that still
carries a `w-*`/`webflow` name in this codebase is inert class-name/
filename legacy, not a functional dependency, per the classification table
above.
