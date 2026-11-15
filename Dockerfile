# ---- build React frontend ----
FROM node:22-alpine AS fe
WORKDIR /fe
COPY frontend/package*.json ./
RUN npm ci --no-audit --no-fund
COPY frontend/ ./
RUN npx vite build

# ---- PHP + Apache (same stack as BigRock) ----
FROM php:8.3-apache
RUN apt-get update && apt-get install -y --no-install-recommends libpng-dev libjpeg62-turbo-dev libwebp-dev \
 && docker-php-ext-configure gd --with-jpeg --with-webp \
 && docker-php-ext-install pdo_mysql gd \
 && a2enmod rewrite headers \
 && sed -ri 's/AllowOverride None/AllowOverride All/' /etc/apache2/apache2.conf \
 && printf "upload_max_filesize=10M\npost_max_size=12M\nmemory_limit=256M\ndate.timezone=Asia/Kolkata\n" > /usr/local/etc/php/conf.d/app.ini \
 && rm -rf /var/lib/apt/lists/*
WORKDIR /var/www/html
COPY server/ ./
COPY --from=fe /fe/dist/ ./
COPY docker-start.sh /usr/local/bin/docker-start.sh
RUN chmod +x /usr/local/bin/docker-start.sh && mkdir -p uploads && chown -R www-data:www-data uploads
CMD ["docker-start.sh"]
