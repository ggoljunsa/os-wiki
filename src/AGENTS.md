<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-09-25 | Updated: 2026-09-25 -->

# src

## Purpose
Everything authored by hand (or by agents) for 운체위키. `build.py` in the parent concatenates these into `index.html`.

## Key Files
| File | Description |
|------|-------------|
| `CONTRACT.md` | The rulebook: file layout, article header format, wiki syntax table, writing rules, canonical key list (§5), SimEngine API (§6), AnimEngine API and visual conventions (§7). **Read first.** |
| `head.html` | `<head>`, all CSS (layout, boxes, `figure.pdf-img`, `.sim`, `.anim`), and the page skeleton up to `<main>`. |
| `renderer.js` | Wiki syntax → HTML; nav, search, TOC, hash routing; mounts sims and anims; debug query hooks (`?anim=`, `?animt=`). |
| `test_sims.js` | Loads `sims/*.js` under node (no DOM) and builds every option combination. |
| `test_anims.js` | Loads `anims/*.js` under node; checks title/desc/duration, `<svg viewBox>`, SMIL presence, tag balance, escaping, `begin+dur ≤ duration`, size. |
| `test_render.js` | Runs the built `index.html` script in a stubbed DOM and renders all articles, failing on leftover raw markup. |

## Subdirectories
| Directory | Purpose |
|-----------|---------|
| `articles/` | One `.wiki` file per article (see `articles/AGENTS.md`) |
| `sims/` | Step-through simulators + `_engine.js` (see `sims/AGENTS.md`) |
| `anims/` | Animated SVG diagrams + `_anim_engine.js` (see `anims/AGENTS.md`) |

## For AI Agents

### Working In This Directory
- Syntax additions go in three places at once: `renderer.js` (`inlineFormat` + block-level standalone check + `headingId` strip), `build.py` (link/asset scanning), and `CONTRACT.md` §3.
- CSS lives only in `head.html`; there is no external stylesheet.

### Testing Requirements
Run all three `test_*.js` scripts and `python3 build.py` from the wiki root after any change here.

### Common Patterns
- `inlineFormat()` is exported on `window` so both engines can render `[[링크]]` inside their captions/descriptions.
- Block-level tags (`[[img:]]`, `[[sim:]]`, `[[anim:]]`) must sit alone on a line.

## Dependencies

### Internal
- `../build.py` consumes every file here in a fixed order: head → ARTICLES/NAV_ORDER → sims → anims → renderer.

<!-- MANUAL: -->
