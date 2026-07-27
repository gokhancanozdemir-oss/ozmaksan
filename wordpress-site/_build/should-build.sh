#!/usr/bin/env bash
# Exit 0 = SKIP build (sadece içerik/medya değişti)
# Exit 1 = BUILD yap (kod, şablon, CSS, admin shell değişti)
set -e
if [ -z "$CACHED_COMMIT_REF" ] || [ -z "$COMMIT_REF" ]; then
  exit 1
fi
# İçerik dışı bir şey değiştiyse build gerekli → quiet DEĞİL → exit 1
if git diff --quiet "$CACHED_COMMIT_REF" "$COMMIT_REF" -- . \
  ':!content/**' \
  ':!assets/products/**' \
  ':!assets/news/**' \
  ':!assets/catalogs/**' \
  ':!assets/uploads/**'
then
  echo "Skipping build: only CMS content/media changed"
  exit 0
fi
echo "Building: site code or config changed"
exit 1
