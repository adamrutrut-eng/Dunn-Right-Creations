#!/usr/bin/env bash
# Turns the raw OpenArt renders into web assets.
#   scripts/process-video.sh <raw-dir>
# Expects in <raw-dir>: hero.mp4, loop-sprinkler.mp4, loop-creek.mp4, loop-golden.mp4, loop-lighting.mp4, loop-drain.mp4
# Produces:
#   assets/hero/frame-000..NNN.webp   frame sequence for the scroll-scrubbed hero
#   assets/img/hero-poster.jpg        first frame, also used as the social preview image
#   assets/video/loop-*.mp4           720p H.264 loops with a crossfaded seam
#   assets/img/loop-*-poster.jpg      poster frames
set -euo pipefail
RAW="${1:?raw dir}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
FRAMES=120
FRAME_W=1120
LOOP_W=1280
mkdir -p "$ROOT/assets/hero" "$ROOT/assets/video" "$ROOT/assets/img"

# ---- hero frame sequence ---------------------------------------------------
HERO="$RAW/hero.mp4"
dur=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$HERO")
# sample FRAMES frames evenly across the clip (trim the final 0.15s, AI clips often fade there)
usable=$(python3 -c "print(max(0.5, $dur - 0.15))")
fps=$(python3 -c "print($FRAMES / $usable)")
rm -f "$ROOT/assets/hero/frame-"*.webp
ffmpeg -v error -y -i "$HERO" -t "$usable" -vf "fps=$fps,hqdn3d=4:3:6:4,scale=$FRAME_W:-2:flags=lanczos" -frames:v $FRAMES \
  -c:v libwebp -quality 48 -compression_level 6 -start_number 0 "$ROOT/assets/hero/frame-%03d.webp"
count=$(ls "$ROOT/assets/hero"/frame-*.webp | wc -l)
echo "hero frames: $count ($(du -sh "$ROOT/assets/hero" | cut -f1))"
ffmpeg -v error -y -i "$HERO" -vf "select=eq(n\,0),scale=1600:-2" -frames:v 1 -q:v 4 "$ROOT/assets/img/hero-poster.jpg"

# ---- loops -----------------------------------------------------------------
loop () {
  local name="$1" in="$RAW/loop-$1.mp4" out="$ROOT/assets/video/loop-$1.mp4"
  local d; d=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$in")
  local xf=0.6
  local off; off=$(python3 -c "print(round($d - $xf - 0.05, 3))")
  # Crossfade the head of the clip over its own tail so the loop point is invisible.
  ffmpeg -v error -y -i "$in" -i "$in" -filter_complex \
    "[0:v]scale=$LOOP_W:-2:flags=lanczos,setpts=PTS-STARTPTS[a];[1:v]scale=$LOOP_W:-2:flags=lanczos,trim=0:$xf,setpts=PTS-STARTPTS[b];[a][b]xfade=transition=fade:duration=$xf:offset=$off,format=yuv420p[v]" \
    -map "[v]" -an -c:v libx264 -preset slow -crf 24 -maxrate 2000k -bufsize 4000k -profile:v high -level 4.0 -movflags +faststart -pix_fmt yuv420p "$out"
  ffmpeg -v error -y -i "$out" -vf "select=eq(n\,0),scale=1280:-2" -frames:v 1 -q:v 5 "$ROOT/assets/img/loop-$name-poster.jpg"
  echo "loop-$name: $(du -h "$out" | cut -f1)"
}
for n in sprinkler creek golden lighting drain; do
  if [ -f "$RAW/loop-$n.mp4" ]; then loop "$n"; else echo "skip loop-$n (missing)"; fi
done
echo "total assets: $(du -sh "$ROOT/assets" | cut -f1)"
