<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-09-25 | Updated: 2026-09-25 -->

# 위키 (운체위키, OS Wiki)

## Purpose
A self-contained, 나무위키-style single-page study wiki for CSE304 운영체제 midterm scope (lectures 1–9, Assignment 1 xv6 alarm, Quiz 1 replay, 2025F past exam). It is its **own git repository** (remote `github.com/ggoljunsa/os-wiki`, live at https://ggoljunsa.github.io/os-wiki/), nested inside the OneDrive course folder. Everything the reader sees is generated into `index.html` from `src/` by `build.py`.

Three kinds of "visual" content exist, and each has its own syntax and engine:

| Kind | Syntax in `.wiki` | Source | Engine |
|---|---|---|---|
| Real slide capture | `[[img:L4-31.png\|캡션\|large]]` | `_slides/` → copied to `images/` | none (plain `<figure>`) |
| Step simulator (C-debugger style) | `[[sim:context_switch]]` | `src/sims/*.js` | `src/sims/_engine.js` (SimEngine) |
| Animated diagram (SVG+SMIL) | `[[anim:ctx_switch\|캡션]]` | `src/anims/*.js` | `src/anims/_anim_engine.js` (AnimEngine) |

## Key Files
| File | Description |
|------|-------------|
| `build.py` | `src/*` → `index.html`. Copies only referenced slide PNGs into `images/`, reports broken `[[links]]`, missing `[[sim:]]`/`[[anim:]]`, unused anims. Exit 1 only on a malformed article header. |
| `index.html` | **Generated. Never edit by hand.** CSS + article data + all engines inline (~1.2 MB). |
| `shot.sh` | `./shot.sh <anim> <sec> [out.png]` — headless-Chrome screenshot of one animation frozen at a time (`index.html?anim=NAME&animt=SEC`). Used to visually verify animations. |
| `README.md` | Human-facing overview, build commands, source attribution. |
| `.gitignore` | Excludes `.omc/`, `_slides/`, `.DS_Store`. |

## Subdirectories
| Directory | Purpose |
|-----------|---------|
| `src/` | All authored sources: contract, CSS/layout, renderer, articles, sims, anims, tests (see `src/AGENTS.md`) |
| `images/` | Build output: slide captures actually referenced by articles (see `images/AGENTS.md`) |
| `_slides/` | Slide PNG originals, `L{강}-{pp}.png`, `A1-{p}.png`, `SOL-{pp}.png`. Git-ignored; regenerate with `pdftoppm -r 90 -png <pdf> _slides/L<n>`. |
| `.omc/` | oh-my-claudecode runtime state. Ignore. |

## For AI Agents

### Working In This Directory
- Read `src/CONTRACT.md` before writing anything; it is the authority on syntax, canonical article keys, the sim API (§6) and the anim API (§7).
- Edit sources under `src/`, then run `python3 build.py`. Commit both sources and the regenerated `index.html` (GitHub Pages serves `index.html` directly).
- New material arriving in the course folder (recording, quiz, homework) should be reflected here first, then in `../정리본/`.
- Prose is Korean with English technical terms untranslated, exactly as the professor says them.

### Testing Requirements
```sh
python3 build.py                       # must end with BUILD OK, broken links 0, missing 0
node src/test_sims.js                  # every sim × every option combo
node src/test_anims.js                 # every anim: contract + tag balance + timing
node src/test_render.js index.html     # all articles render with no raw markup left
./shot.sh <anim> <sec> out.png         # then open the PNG and look at it
```
Debug URLs: `index.html?anim=NAME&animt=SEC` renders one animation paused; `index.html?animt=SEC#문서키` freezes every animation in a document.

### Common Patterns
- One article per file, `src/articles/{정렬번호}_{key}.wiki`; the `key` header is what `[[key]]` links resolve to.
- Sims and anims are pure data + `build()`; no DOM access (tests run them under node without `document`).
- Rebuild and re-screenshot after every visual change; do not trust the source alone.

## Dependencies

### Internal
- `../강의자료/*.pdf` — source of slide captures and facts.
- `../정리본/*_해설.md`, `../문제풀이/`, `../족보/` — content reused in articles and `{exam}` boxes.

### External
- Python 3 (build), Node ≥ 18 (tests), Google Chrome (screenshots), poppler `pdftoppm` (slide PNGs).
- KaTeX 0.16 from jsDelivr at runtime for `$…$` math; no other runtime dependency.

<!-- MANUAL: Any manually added notes below this line are preserved on regeneration -->
