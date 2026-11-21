#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
OUTPUT="$ROOT/public"

rm -rf "$OUTPUT"
mkdir -p "$OUTPUT/downloads"

# Publica o portfólio como página inicial.
cp "$ROOT/index.html" "$OUTPUT/index.html"

# Mantém os pacotes ZIP disponíveis para download.
cp "$ROOT/3-templates-landing-pages-vendaveis.zip" "$OUTPUT/downloads/"
cp "$ROOT/mais-5-templates-landing-pages.zip" "$OUTPUT/downloads/"

# Extrai os oito modelos para que cada um possa ser acessado como site estático.
unzip -oq "$ROOT/3-templates-landing-pages-vendaveis.zip" -d "$OUTPUT"
unzip -oq "$ROOT/mais-5-templates-landing-pages.zip" -d "$OUTPUT"

echo "Build estático concluído em: $OUTPUT"
