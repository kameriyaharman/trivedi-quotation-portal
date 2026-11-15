#!/bin/sh
# Railway gives a PORT; uploads/ may be a fresh volume
PORT="${PORT:-80}"
# Railway fix: keep only the prefork MPM (mod_php needs it)
rm -f /etc/apache2/mods-enabled/mpm_event.* /etc/apache2/mods-enabled/mpm_worker.*
[ -e /etc/apache2/mods-enabled/mpm_prefork.load ] || a2enmod mpm_prefork >/dev/null 2>&1
sed -ri "s/Listen [0-9]+/Listen ${PORT}/" /etc/apache2/ports.conf
sed -ri "s/<VirtualHost \*:[0-9]+>/<VirtualHost *:${PORT}>/" /etc/apache2/sites-available/000-default.conf
mkdir -p /var/www/html/uploads
cp -n /var/www/html/install/uploads.htaccess /var/www/html/uploads/.htaccess 2>/dev/null || true
chown -R www-data:www-data /var/www/html/uploads
exec apache2-foreground
