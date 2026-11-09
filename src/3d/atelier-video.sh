#!/usr/bin/env bash
# Munta el vídeo d'Atelier Temps a partir dels fotogrames de Blender.
#   blender -b -P src/3d/atelier.py -- /tmp/atelier 64 video        (renderitza v0000.png, v0001.png, … i etiquetes.json)
#   bash src/3d/atelier-video.sh /tmp/atelier mostres/atelier       (crea mostres/atelier/atelier.mp4 i copia etiquetes.json)
# - Es posa damunt del color de fons de la pàgina (#070a12): el vídeo no té transparència.
# - hqdn3d treu el soroll del render (sobretot el temporal, entre fotogrames).
# - Un fotograma clau cada 6 (-g 6): així el scroll pot saltar a qualsevol punt sense esperar.
set -euo pipefail
ENTRADA="${1:?Cal la carpeta amb els fotogrames}"; SORTIDA="${2:?Cal la carpeta de sortida}"
mkdir -p "$SORTIDA"
MIDA=$(identify -format '%wx%h' "$ENTRADA/v0000.png")
ffmpeg -y -loglevel error -framerate 30 -i "$ENTRADA/v%04d.png" \
  -filter_complex "color=c=0x070a12:s=${MIDA}:r=30[fons];[fons][0:v]overlay=format=auto:shortest=1,hqdn3d=2.5:2.5:8:8,format=yuv420p" \
  -c:v libx264 -preset slower -crf 21 -g 6 -keyint_min 6 -sc_threshold 0 -movflags +faststart -an "$SORTIDA/atelier.mp4"
# versió VP9 (WebM) per als navegadors sense H.264 (p. ex. Chromium sense còdecs)
ffmpeg -y -loglevel error -framerate 30 -i "$ENTRADA/v%04d.png" \
  -filter_complex "color=c=0x070a12:s=${MIDA}:r=30[fons];[fons][0:v]overlay=format=auto:shortest=1,hqdn3d=2.5:2.5:8:8,format=yuv420p" \
  -c:v libvpx-vp9 -b:v 0 -crf 32 -g 6 -keyint_min 6 -row-mt 1 -cpu-used 2 -an "$SORTIDA/atelier.webm"
cp "$ENTRADA/etiquetes.json" "$SORTIDA/etiquetes.json"
ls -l "$SORTIDA/atelier.mp4" | awk '{print "Vídeo:", $5/1024/1024 " MB"}'
