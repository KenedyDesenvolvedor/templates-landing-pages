#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
OUTPUT="$ROOT/public"

rm -rf "$OUTPUT"
mkdir -p "$OUTPUT/downloads" "$OUTPUT/site-pages"
cp "$ROOT/index.html" "$OUTPUT/index.html"

# Publica os oito sites como páginas navegáveis por URL.
cp -R "$ROOT/site-pages/landing_pages_vendaveis" "$OUTPUT/landing_pages_vendaveis"
cp -R "$ROOT/site-pages/mais_5_landing_pages" "$OUTPUT/mais_5_landing_pages"
cp -R "$ROOT/site-pages/prospeccao-local" "$OUTPUT/prospeccao-local"
cp -R "$ROOT/site-pages/briefing-cliente" "$OUTPUT/site-pages/briefing-cliente"

# Os ZIPs são gerados pelo workflow do GitHub. Se já existirem, também ficam disponíveis.
for archive in 3-templates-landing-pages-vendaveis.zip mais-5-templates-landing-pages.zip; do
  if [ -f "$ROOT/$archive" ]; then cp "$ROOT/$archive" "$OUTPUT/downloads/"; fi
done

echo "Build estático concluído em $OUTPUT"
