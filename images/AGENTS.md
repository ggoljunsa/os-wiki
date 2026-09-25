<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-09-25 | Updated: 2026-09-25 -->

# images

## Purpose
Build output: the slide captures that articles actually reference via `[[img:NAME]]`. `build.py` copies each referenced file from `_slides/` (git-ignored originals) into here, so this folder is the committed, GitHub-Pages-served subset.

## Key Files
Named by source: `L{강}-{pp}.png` lecture slide page, `A1-{p}.png` Assignment 1 PDF page, `SOL-{pp}.png` 2025F midterm explanation page. Page number == printed slide number.

## For AI Agents

### Working In This Directory
- Do not add or edit files here by hand; add an `[[img:]]` reference in an article and rebuild.
- A file that no article references is stale; it is harmless but can be deleted after a rebuild confirms it is unreferenced.

### Testing Requirements
`python3 build.py` prints `images copied : N (missing 0)`; a missing count means a referenced PNG is absent from `_slides/` (regenerate with `pdftoppm -r 90 -png`).

## Dependencies

### Internal
- `../_slides/` originals; `../src/articles/*.wiki` references.

<!-- MANUAL: -->
