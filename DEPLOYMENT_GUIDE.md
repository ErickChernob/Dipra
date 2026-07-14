# Deployment Guide — Dipra Soluciones Integrales

This guide covers deploying `public_html_ready/` (or the equivalent
`public_html_ready.zip`) to a traditional Apache hosting account (Hostinger,
GoDaddy, cPanel, or similar). The site is 100% static HTML/CSS/JS — there is
no build step, no database, and no server-side language requirement.

Assumed production domain: `https://www.dipra-soluciones.com`. If the real
domain differs, see "Configure the domain" below for what to update.

---

## 1. Back up the current hosting before touching anything

1. Log in to the hosting control panel (cPanel/hPanel on Hostinger, or the
   GoDaddy hosting dashboard).
2. Use the **File Manager** (or an FTP/SFTP client) to open `public_html/`.
3. Select everything currently inside `public_html/` and download a copy to
   your own computer, or use the panel's built-in backup/compress feature
   (cPanel: select all → "Compress" → download the resulting `.zip`).
4. If the account has a database (not required for this site, but check
   anyway in case something else is deployed there), use
   phpMyAdmin/cPanel's "Backup Wizard" to export it too.
5. Keep this backup until the new site has been verified live (see §7).

## 2. Upload the files

Two options — pick whichever is easier with your hosting panel:

**Option A — File Manager (no FTP client needed)**
1. Upload `public_html_ready.zip` into `public_html/` using the File
   Manager's Upload button.
2. Right-click the uploaded zip inside `public_html/` and choose **Extract**.
3. Confirm the extraction placed `index.html`, `css/`, `js/`, `images/`,
   `fonts/`, `videos/`, `.htaccess`, `404.html`, `robots.txt`, and
   `sitemap.xml` **directly inside** `public_html/` — not inside an extra
   subfolder such as `public_html/public_html_ready/`. If your File Manager
   extracted it into a subfolder, move all the extracted items up one level
   into `public_html/` itself, then delete the now-empty subfolder.
4. Delete the uploaded `.zip` from `public_html/` once extraction is
   confirmed (keep your own local copy as a backup instead).

**Option B — FTP/SFTP client (FileZilla, Cyberduck, etc.)**
1. Connect using the FTP/SFTP credentials from your hosting panel.
2. Navigate to `public_html/` on the remote side.
3. Upload the **contents** of `public_html_ready/` (not the folder itself)
   directly into `public_html/` — select everything inside
   `public_html_ready/` and drag it in, rather than dragging the
   `public_html_ready` folder itself.
4. Make sure hidden files transfer too — `.htaccess` starts with a dot and
   some FTP clients hide dotfiles by default; enable "show hidden files" in
   your client's settings before uploading so `.htaccess` isn't skipped.

## 3. Where `index.html` must be located

`index.html` must sit at the **root** of `public_html/`
(`public_html/index.html`), not inside any subfolder. If it ends up at
`public_html/independent-static-site/index.html` or
`public_html/public_html_ready/index.html`, the domain's homepage will 404
or show a directory listing instead of the site. Verify with the File
Manager or `ls public_html/` over SSH/FTP that `index.html` is a direct
child of `public_html/`.

## 4. Configure the domain

- If `www.dipra-soluciones.com` is already the live domain for this hosting
  account, no DNS changes are needed — just confirm in the hosting panel
  that the domain (or subdomain) is pointed at the `public_html/` directory
  you uploaded to.
- If the domain is registered elsewhere and only the hosting is on
  Hostinger/GoDaddy, make sure the domain's nameservers or A/CNAME records
  point at this hosting account (the hosting panel's "Domains" section
  shows the exact records to use).
- If the real production domain is **not** `www.dipra-soluciones.com`,
  update it in three places before going live:
  1. `.htaccess` — the `www.dipra-soluciones.com` references in the
     HTTPS/www-redirect rule.
  2. Every page's `<link rel="canonical" ...>` tag and the Open
     Graph/Twitter `image` URLs (currently absolute URLs pointing at that
     domain).
  3. `sitemap.xml` and the `Sitemap:` line in `robots.txt`.

## 5. Verify SSL

1. Most hosts (Hostinger, GoDaddy, cPanel with AutoSSL) issue a free
   Let's Encrypt certificate automatically once the domain resolves to the
   hosting account — check the panel's "SSL/TLS" or "Security" section and
   confirm a certificate is **issued and active** for both
   `dipra-soluciones.com` and `www.dipra-soluciones.com`.
2. If it's not active yet, use the panel's "Run AutoSSL" / "Install SSL"
   action and wait a few minutes — DNS propagation can delay issuance.
3. Once active, visit `http://www.dipra-soluciones.com/` (plain HTTP) in a
   browser and confirm it redirects automatically to `https://` — this is
   handled by the `.htaccess` rule, but it only works once a valid
   certificate exists; visiting HTTPS before the certificate is ready will
   show a browser security warning.
4. Check for the padlock icon with no "not secure" or mixed-content warning
   in the browser's address bar on the live homepage.

## 6. Clear hosting cache

Some hosting panels (Hostinger's "LiteSpeed Cache", cPanel's built-in
cache, or GoDaddy's CDN/cache layer) cache pages at the server or CDN edge,
independent of the browser. After uploading:

1. Look for a "Cache Manager" / "LiteSpeed Cache" / "Purge Cache" option in
   the hosting panel and run it.
2. If the host provides a CDN toggle (e.g., Hostinger's "Cloudflare"
   integration), purge that cache too — CDN and origin caches are separate.
3. If no cache manager is visible, the host likely doesn't cache at the
   server level and only the browser needs a hard refresh (see next step).

## 7. Test the site after deployment

1. Open the live domain in a normal browser tab and a private/incognito
   tab (to bypass any locally-cached old version) and check:
   - Homepage loads with the hero video autoplaying.
   - Navigate to each page via the top nav: Quiénes somos, Servicios,
     Contacto, and the Aviso de Privacidad link in the footer.
   - Resize the browser (or use DevTools device mode) to confirm the
     mobile hamburger menu opens and closes correctly below ~991px width.
   - Submit the contact form on `contacto.html` — see the note in
     **FINAL_QA_REPORT.md** about the form's current state before assuming
     this should "succeed."
   - Visit a URL that doesn't exist (e.g.
     `https://www.dipra-soluciones.com/does-not-exist`) and confirm the
     branded 404 page appears, not the host's generic error page.
   - Check the browser DevTools Network tab for any 404s on images, fonts,
     or the CSS/JS files.
2. Test on a real mobile device if possible, not just a resized desktop
   browser window.
3. Run the domain through a free SSL checker (e.g., your host's own SSL
   status page) and a basic page-speed tool to confirm assets are being
   served with caching/compression headers (from `.htaccess`).

## 8. How to roll back if necessary

1. If something is wrong after deployment, restore the backup taken in
   step 1: in the File Manager, delete the newly-uploaded files from
   `public_html/` and re-upload/extract the backup archive you downloaded
   before starting.
2. If you still have FTP/SFTP access and only need to undo specific files
   (not the whole site), upload just the backed-up versions of those files
   to overwrite the new ones.
3. Because this deployment has no database and no server-side state, a
   rollback is purely a file-level operation — restoring the old files
   fully restores the old site with no further steps needed.
4. Keep the backup from step 1 until you're confident the new deployment
   is stable (a few days of normal traffic is a reasonable minimum).

---

See `FINAL_QA_REPORT.md` for what was tested before this package was built,
and `independent-static-site/MIGRATION_NOTES.md` for the full technical
history of what changed during the Webflow-to-static migration.
