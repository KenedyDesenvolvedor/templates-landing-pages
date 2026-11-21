#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
OUTPUT="$ROOT/public"

rm -rf "$OUTPUT"
mkdir -p "$OUTPUT/downloads"

cp "$ROOT/index.html" "$OUTPUT/index.html"
cp "$ROOT/3-templates-landing-pages-vendaveis.zip" "$OUTPUT/downloads/"
cp "$ROOT/mais-5-templates-landing-pages.zip" "$OUTPUT/downloads/"

# Extrai os três primeiros modelos e mantém a estrutura de pastas.
unzip -oq "$ROOT/3-templates-landing-pages-vendaveis.zip" -d "$OUTPUT"
unzip -oq "$ROOT/mais-5-templates-landing-pages.zip" -d "$OUTPUT"

# As páginas revisadas são a fonte publicada para os cinco nichos.
cp "$ROOT/site-pages/mais_5_landing_pages/theme.css" "$OUTPUT/mais_5_landing_pages/theme.css"
for folder in 04-imobiliaria 05-clinica-estetica 06-curso-online 07-fotografo 08-saas; do
  cp "$ROOT/site-pages/mais_5_landing_pages/$folder/index.html" "$OUTPUT/mais_5_landing_pages/$folder/index.html"
done

echo "Build estático concluído em: $OUTPUT"
