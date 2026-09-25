<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-09-25 | Updated: 2026-09-25 -->

# anims

## Purpose
"움직이는 그림": self-playing animated diagrams built as SVG with SMIL, inserted with `[[anim:name|캡션]]`. Where a sim shows variable values step by step, an anim shows the mechanism as a looping 8–14 s cartoon. Added 2026-09-25. The catalogue with target articles is the table at the end of `CONTRACT.md` §7.

## Key Files
| File | Description |
|------|-------------|
| `_anim_engine.js` | AnimEngine: renders header/stage/controls (재생/정지, 처음부터, 0.5×/1×/2×, scrubber, clock), drives the SVG timeline with `svg.setCurrentTime(t)` via `requestAnimationFrame`, loops, pauses when scrolled out of view (IntersectionObserver), honours `window.ANIM_FREEZE_AT` for screenshots. |
| `ctx_switch.js` | Reference implementation (timer interrupt → HW saves user state → `switch()` saves/restores kernel registers via PCB → B runs). Copy its helpers and layout. |
| other `*.js` | One animation per file, `ANIMS["name"]` with `name == filename`. |

## For AI Agents

### Working In This Directory
- `build()` returns a pure `<svg viewBox="0 0 760 H">` string; timeline only via SMIL (`<animate>`, `<animateTransform>`, `<animateMotion>`, `<set>`). No CSS animations, no timers, no DOM.
- `begin + dur ≤ duration` for every animation element; `fill="freeze"` to hold end states; `repeatCount="indefinite"` requires `dur`.
- Escape `<`, `>`, `&` in text; prefix every `id` with the anim name; keep under 60 KB.
- Layout: top line = phase caption (changes over time), middle = diagram, bottom line = takeaway. Palette in CONTRACT §7.

### Testing Requirements
```sh
node src/test_anims.js
python3 build.py            # 0 missing / 0 unused anims
./shot.sh <name> <sec> out.png   # 3 times per anim, then Read the PNGs
```

### Common Patterns
- `show(from, to, D)` opacity helper for "visible only between from and to seconds".
- Moving packets: `<rect>` + `<animateMotion path=… begin dur fill="freeze">` plus an opacity window.

## Dependencies

### Internal
- `renderer.js` mounts `.anim[data-anim]` after each article render and passes `data-caption`.
- CSS for `.anim*` lives in `src/head.html`.

<!-- MANUAL: -->
