# Trivedi Metamodular – Quotation Portal

Quotation maker with item master, live preview, PDF download, client share link and WhatsApp send.

- **Frontend:** React (Vite) → static files (`frontend/`)
- **Backend:** PHP 8 + MySQL REST API (`server/api/`)
- Default login: `admin` / `admin123` — change it from **Settings → Login details**

## Folder layout

```
frontend/          React source
server/            Everything that goes on the web server
  api/             PHP API (config.php = DB settings)
  install/         schema.sql (tables + default data)
  seed/            Logo, header photo, sample item images
  uploads/         Images uploaded from the portal
  q.php            Short share link for clients (q.php?t=TOKEN)
Dockerfile         Used by Railway
build.sh           Builds React and copies it into server/
```

## Deploy on BigRock (cPanel, PHP + MySQL)

1. Run `./build.sh` (needs Node 18+) — or use the ready-made `bigrock-upload.zip`.
2. cPanel → **MySQL Databases**: create a database + user, give the user ALL privileges.
3. Open `server/api/config.php` and fill `db_name`, `db_user`, `db_pass` (host stays `localhost`).
4. Upload the **contents** of `server/` into `public_html/` (or a sub-folder) with File Manager.
5. Open the site. Tables are created automatically on first load
   (or import `install/schema.sql` in phpMyAdmin yourself).
6. Make sure `uploads/` is writable (permission 755).
7. Login with admin / admin123 and change the password.

## Deploy on Railway

The repo has a `Dockerfile` (PHP 8.3 + Apache). Railway project needs:
- a **MySQL** service, and on the app service the variables
  `MYSQLHOST, MYSQLPORT, MYSQLDATABASE, MYSQLUSER, MYSQLPASSWORD` referencing it
- a **volume** mounted at `/var/www/html/uploads` so uploaded images survive redeploys

## WhatsApp

"Send on WhatsApp" opens WhatsApp with a ready message and the client link (WhatsApp links cannot attach files).
The client opens the link, sees the quotation in the same design and taps **Download PDF**.
On phones, "Share PDF file" shares the actual PDF through the phone's share sheet (WhatsApp included).
