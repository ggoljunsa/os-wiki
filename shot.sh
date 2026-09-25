#!/bin/sh
# 움직이는 그림 검증용 스크린샷: ./shot.sh <anim이름> <초> [출력.png]
#   index.html?anim=<이름>&animt=<초> 를 headless Chrome 으로 찍는다. 먼저 python3 build.py 를 돌릴 것.
NAME="$1"; T="${2:-0}"; OUT="${3:-/tmp/anim_${NAME}_${T}.png}"
DIR="$(cd "$(dirname "$0")" && pwd)"
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --disable-gpu --hide-scrollbars \
  --window-size=1300,760 --virtual-time-budget=3000 --screenshot="$OUT" \
  "file://$DIR/index.html?anim=$NAME&animt=$T" >/dev/null 2>&1
echo "$OUT"
