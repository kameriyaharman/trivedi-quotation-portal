#!/bin/sh
# Builds the React app and copies it into server/ (the folder you upload / deploy)
set -e
cd "$(dirname "$0")/frontend"
npm install --no-audit --no-fund
npx vite build
cd ..
rm -rf server/assets server/index.html
cp -r frontend/dist/* server/
echo "Done. Upload the contents of server/ to public_html (BigRock) or deploy server/ (Railway)."
