# Animation Restoration Notes

## Correcting a prior finding

Both `MIGRATION_NOTES.md` and `FINAL_QA_REPORT.md` state that no Webflow
IX2 interactions payload exists anywhere in this export. **That was
wrong**, and this pass found the actual mistake: the previous audits
searched the HTML for an inline `<script type="application/json">` blob
(the pattern used by some Webflow exports), and searched `js/webflow.js`
for a `data-w-id` payload literal. Neither exists here. What was missed is
that **the IX2 configuration is passed directly as a JavaScript object
literal to `Webflow.require("ix2").init({...})` inside `js/webflow.js`
itself** (the original export at the repo root, before decoupling) —
not a separate `<script>` tag, and not JSON syntax (unquoted keys, `!0`/`!1`
for booleans). It's easy to miss with a plain-text search for `"events"` or
similar because the object literal has no whitespace and blends into the
rest of the minified bundle.

Extraction method used this time: located the `Webflow.require("ix2").init(`
call, did a balanced-parenthesis scan (respecting string literals) to pull
out the full argument text, confirmed it contained no `function` keywords
(i.e. it's pure data, safe to evaluate), and evaluated it in a sandboxed
Node process to convert it to standard JSON for analysis. The full payload:
**73 events, 34 action lists.**

---

## Every interaction defined in the IX2 payload

Grouped by what they do. "Live pages" = index/quienes-somos/servicios/
contacto/aviso-de-privacidad — the 5 pages actually linked from the site's
navigation. `detail_projects.html` is present in the project but unlinked
from anywhere (see `MIGRATION_NOTES.md`); its interactions are listed for
completeness but were not reimplemented (see "Scope decision" below).

### Reimplemented (live pages + sitewide navbar)

| # | Action list | Trigger | Target(s) | What it does | Original timing/easing |
|---|---|---|---|---|---|
| 1 | `a-9` "Nav scrolling" | `PAGE_SCROLL` (every real page) | `.navbar` (height), `.nav-cover` (position) | Navbar shrinks 80px→65px; a dark cover panel (`--background: #060d11`) slides down over the first small stretch of scroll, changing the bar from white to dark | Scroll-linked (continuous), no per-keyframe easing (linear by nature of scrub) |
| 2 | `a` "Looping logos" | `PAGE_START`, loops forever | `.lopping-logos.left` | Partner-logo strip scrolls left continuously, wrapping seamlessly (3 duplicated copies in the DOM make the loop invisible) | 22000ms, linear, infinite |
| 3 | `a-6` "Looping triangle" | `PAGE_START`, loops forever | `.trangle-grid.left` / `.trangle-grid.right` | Decorative triangle pattern behind hero video drifts outward (left panel left, right panel right), looping | 20000ms, linear, infinite |
| 4 | `a-7` "Images while scrolling into view" | `SCROLLING_IN_VIEW` (class-based, fires everywhere `.large-growing-images` appears — index/quienes-somos/servicios) | `.growing-image.small` (width) | Image widens from 35% to 65% as its section scrolls through the viewport | Scroll-linked, keyframes 0%→100% of scroll-through range |
| 5 | `a-34` "Paralax background" | `SCROLLING_IN_VIEW` (element-scoped, `#soluciones` section, index.html) | `.background` (child of `.background-wrapper`) | Background image scales 1.1→1.05 and drifts vertically -10%→+10% as the section scrolls through | Scroll-linked, keyframes 0%→100% |
| 6 | `a-8` "Skills scrolling" | `SCROLLING_IN_VIEW` (`.scrolling-text-wrapper`, index.html) | `.scrolling-text` | The "Infraestructura / Venta de Equipo / ..." ticker moves vertically 20%→-50% as you scroll through the section | Scroll-linked, keyframes 0%→100% |
| 7 | `a-29`/`a-30`/`a-31`/`a-32` "Nav link left/right on hover(-out)" | `MOUSE_OVER`/`MOUSE_OUT` (every page's navbar) | `.nav-link-line` (sibling of `.nav-link.left`/`.right`) | The underline between the two nav links slides toward and shrinks to 50% width under whichever link is hovered | 500ms in / 400ms out, `outQuad` |
| 8 | `a-13` "Mouse over button" | `MOUSE_MOVE` (`.button`, index.html + detail_projects.html) | `.button-outline` | The button's inner outline layer subtly follows the cursor within the button's bounds (±12px X, ±6px Y) — a "magnetic button" effect | Continuous (mouse-position-linked), 500ms settle |

### Identified but not reimplemented

| Action list(s) | Target | Why not reimplemented |
|---|---|---|
| `a-2` "Looping scroll link" | `.scroll-link-outline` | Class only exists on `detail_projects.html` (orphaned page) — implemented anyway as pure CSS since it was nearly free (see below) |
| `a-3`/`a-4` "Slide in/out view" | `.slide` | Target class doesn't exist anywhere in the current project (not even on `detail_projects.html`, which uses `.testimonial-slide`/`.w-slide` instead) — this interaction was already dead before decoupling, likely orphaned from an earlier version of the Webflow project. This is also the one interaction in the whole payload with a genuine 0/100/200ms **stagger** across 3 elements, in case that's the "staggered" effect you noticed missing — but it has no reachable target to attach to |
| `a-24`/`a-5` "Mouse over project (Small/Large)" | `.showcase-image`, `.project-card`, `.card-outline.one/two/three` | `detail_projects.html` only — a mouse-position-driven parallax across 3 stacked border-outline layers |
| `a-25`/`a-26` "Scale down/up image on hover" | `.showcase-image`, `.project-card` (+ specific elements) | `detail_projects.html` only |
| `a-27`/`a-28` "Testimonial slider out/in" | `.testimonial-text`, `.quote-credit` | `detail_projects.html` only — a multi-property, multi-element timed sequence (move/scale/rotate/opacity with 0/100/700/800ms staggered delays) tied to the slide change already implemented in `js/main.js`'s custom slider |
| `a-14`/`a-15` "Circle link hover(-out)" | `.circle-link`, `.scroll-link-outline` | `detail_projects.html` only |
| `a-17`/`a-18`/`a-19` "Slider arrow hover" | `.slider-circle`, `.slider-arrow-icon`, `.left-arrow` | `detail_projects.html` only |
| `a-20`/`a-23` "Show/hide view link" | (unresolved selector) | Target class (`.view-wrapper`) not found anywhere in the project |
| `a-35` "Paralax background 2" | `.project-background` | `detail_projects.html` only |
| `a-36`/`a-37`/`a-38` "Arrow link hover" | `.arrow-link` | Target class not found anywhere in the project (likely renamed/removed before export, same situation as `.slide`) |
| `a-10` "Preloader" | `.preloader`, `.preloader-center` | The `.preloader` element only exists in the HTML on `detail_projects.html` (confirmed via search), even though the trigger event was attached page-wide in the Designer — meaning this animation had nothing to animate on the 5 real live pages even before decoupling. Not a regression. |
| `a-11`/`a-12` "Button hover(-out)" (border-alpha fade) | `.button-outline` | A **working** CSS `:hover` rule already exists on `.button`/`.button-outline` in `css/dipra.webflow.css` (border-color + background-color change) providing real, visible hover feedback with zero JS. This IX2 layer would have added a translucent-border fade on top of that. Per your own description that "basic hover states... work fine," and since the button already has functioning hover feedback, this narrow additional layer was treated as lower priority and not added, to avoid stacking a second hover effect whose exact interaction with the existing CSS `:hover` rule (which already changes border-color) couldn't be verified against a live Webflow reference |

### Scope decision: `detail_projects.html`

This page is not linked from anywhere on the live site (confirmed
repeatedly across `MIGRATION_NOTES.md` and `FINAL_QA_REPORT.md` — it's
`noindex`'d and disallowed in `robots.txt`). Its interactions (7 of the 34
action lists above) were fully identified and documented for completeness,
but reimplementing them was deprioritized in favor of the interactions
that affect real, indexed, navigable pages. If this page is kept and
un-orphaned in the future, its remaining interactions can be added using
the same GSAP/CSS approach as a follow-up.

---

## Easing conversion

Webflow's named easings are the classic Robert Penner easing set (the
same set GSAP's own named eases are built from), so the conversion is
exact, not approximated:

| Webflow name | GSAP ease (used in `js/animations.js`) | CSS `cubic-bezier` equivalent (used in `css/animations.css`) |
|---|---|---|
| `outQuad` | `power1.out` | `cubic-bezier(0.25, 0.46, 0.45, 0.94)` |
| `inOutQuint` | `power4.inOut` | *(not needed — only used by the deferred preloader)* |
| `""` (unset, on continuous/scroll-linked actions) | `"none"` (linear — correct for scrub-driven animation, where GSAP maps position directly to scroll progress) | `linear` |

GSAP's `power1`–`power4` eases are named after their polynomial degree
(`power1` = quadratic = "Quad", `power4` = quintic = "Quint"), which is
why they're an exact match rather than a visual approximation.

---

## Judgment call: nav-link-line hover-out color

The original `a-30`/`a-32` ("hover out") actions fade `.nav-link-line`'s
color to a translucent variant (`rgba(239,252,249,0.1)`), while `a-29`/
`a-31` ("hover in") keep it fully solid. Taken literally, that would mean
the *true* resting color (before any hover ever happens) is the
translucent one — but the site's actual shipped CSS
(`.nav-link-line { background-color: var(--sky-blue) }`, fully solid) is
what both the original static export and this project have always
rendered as the resting appearance. Per this project's explicit rule not
to change any resting/end-state appearance, `css/animations.css` only
reimplements the position/width motion (slide + shrink toward the hovered
link) and intentionally leaves the color exactly as the current CSS
already renders it, both before and after hovering.

---

## New dependency footprint

- **GSAP 3.15.0 core** (`js/vendor/gsap.min.js`, 73 KB) + **ScrollTrigger
  plugin** (`js/vendor/ScrollTrigger.min.js`, 44 KB). Vendored locally —
  not loaded from a CDN — so the site still has zero runtime dependency on
  any third-party host. License: GreenSock's Standard "no-charge" license
  (free for this kind of use since Webflow's acquisition of GreenSock made
  GSAP free for everyone).
- No other new dependencies. No source maps were vendored (dev-only
  artifact, not needed in production).
- Everything else (the marquee/triangle/spin loops and the nav-link-line
  hover) is plain CSS + the same small vanilla-JS pattern already used
  throughout `js/main.js` — no new dependency for those.

---

## Testing performed

All of the reimplemented interactions were verified with a headless
Chromium test harness (not just visual screenshots) at **1440px, 1024px,
768px, and 480px**, across all 7 pages:

- Confirmed `window.gsap` and `window.ScrollTrigger` load correctly and
  `js/animations.js` initializes without errors.
- Scrolled every page fully at every width and confirmed zero console
  errors, zero page errors, and zero failed requests beyond the two
  already-documented, sandbox-only issues (the blocked CloudFront asset,
  and the benign mp4/webm double-`<source>` non-issue).
- **Nav scroll**: confirmed `.navbar` height actually changes (80px →
  65px) and `.nav-cover` actually translates (`transform: matrix(...)`)
  when the page is scrolled.
- **Growing images**: confirmed `.growing-image.small`'s computed `width`
  increases partway through the scroll-through range (235px → 296px at
  the midpoint in one measured case).
- **Parallax background**: confirmed `.background`'s computed transform
  shows both the scale and the vertical shift changing mid-scroll.
- **Skills scrolling**: confirmed `.scrolling-text`'s computed
  `transform` shows the expected vertical offset mid-scroll.
- **Magnetic button**: confirmed `.button-outline`'s transform moves
  toward the cursor position when hovering near the left vs. right edge
  of the button, and returns to `(0, 0)` on mouse-leave.
- **Nav-link-line hover**: confirmed the class toggles and the computed
  transform/width change correctly on hover and revert on mouse-leave.
- **No breakpoint-disabling to preserve**: every one of these events has
  `mediaQueries: ["main","medium","small","tiny"]` in the original JSON —
  i.e. none of them were restricted to desktop-only in the original
  design (the *only* interactions in the entire 73-event payload that
  were desktop-only are 5 of the deferred `detail_projects.html`-only
  mouse-move effects), so nothing needed to be deliberately suppressed on
  mobile widths here.
- Re-ran the full pre-existing regression suite (mobile nav toggle, hero
  video autoplay, testimonial slider, contact-form guard) after adding
  all of the above — no regressions.

## Confirmed: still zero Webflow runtime dependency

`js/webflow.js`, `Webflow.require`, `Webflow.push`, and the jQuery CDN
script remain absent from every page. The only two new `<script>` tags
per page are the locally-vendored GSAP files plus the new
`js/animations.js` — nothing loads from Webflow or any other third-party
host to power these animations.
