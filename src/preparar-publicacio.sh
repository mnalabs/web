#!/usr/bin/env bash
# Prepara la carpeta amb NOMÉS el que ha de ser públic (el que el navegador descarrega).
# Ús: bash src/preparar-publicacio.sh <carpeta-de-sortida>
# El codi font (src/), les instruccions de l'equip i la configuració del repositori no hi arriben mai.
set -euo pipefail

sortida="${1:?Cal indicar la carpeta de sortida}"
rm -rf "$sortida"
mkdir -p "$sortida"

# Només fitxers que ja són al web publicat: pàgines generades, recursos, imatges, demos i fitxers de l'arrel.
cp -r assets img mostres "$sortida"/
cp ./*.html "$sortida"/
cp CNAME robots.txt sitemap.xml favicon.svg apple-touch-icon.png og.png "$sortida"/
touch "$sortida/.nojekyll"   # el web ja és estàtic: GitHub no l'ha de processar amb Jekyll

# Control de seguretat: si hi ha res intern, no es publica.
prohibits=$(find "$sortida" \( -path '*/src' -o -name 'CLAUDE.md' -o -name 'CONFIGURAR-PANELL.md' -o -name '_config.yml' -o -name '.git*' -o -name '*.blend' -o -name '*.py' \) -print)
if [ -n "$prohibits" ]; then
  echo "S'han trobat fitxers interns que no es poden publicar:" >&2
  echo "$prohibits" >&2
  exit 1
fi
echo "Preparats $(find "$sortida" -type f | wc -l) fitxers a $sortida"
