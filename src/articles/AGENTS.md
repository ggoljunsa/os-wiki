<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-09-25 | Updated: 2026-09-25 -->

# articles

## Purpose
The 142 wiki articles, one per file. File name = `{정렬번호}_{key}.wiki`; the sort prefix groups them into nav sections (00 안내, 10 1–2강, 30 3강, 40 4강, 50 5강, 60 6강, 70 7강, 80 8강, 90 9강, A0 과제1, E0 시험/족보, Z0 용어사전).

## Key Files
| File | Description |
|------|-------------|
| `00_main.wiki` | Front page: scope, how to read, links into every section. |
| `01_읽는 순서.wiki` | Recommended reading order. |
| `02_시험 정보.wiki` | Exam/quiz dates and scope (mirrors `../../../../_시험정보.md`). |
| `40_제한적 직접 실행.wiki`, `4A_컨텍스트 스위치.wiki`, `59_MLFQ.wiki`, `90_락.wiki`, `A0_과제1 xv6 alarm.wiki` | The "핵심" hub articles: most captures, a sim and an anim each. |
| `E1_퀴즈1 복기.wiki` | Quiz 1 (2026-09-23) replay with the professor's exact questions. |
| `E2_2025F 중간고사 족보.wiki` | Past midterm walkthrough, source of `{exam}` boxes elsewhere. |
| `E3_자주 틀리는 함정 모음.wiki` | Cross-cutting trap list. |
| `Z0_*.wiki` | Short glossary entries (register, PC, stack, heap, xv6, RISC-V …). |

## For AI Agents

### Working In This Directory
- Header block is `key:` / `title:` / `category:` then a `---` line; `build.py` exits 1 if it is malformed.
- Link only to keys in `CONTRACT.md` §5. A link to a non-existent key renders as a grey stub and shows up in `build.py`'s BROKEN LINKS report.
- Every article needs ≥1 `{analogy}` and ≥1 visual (`[[img:]]`, `[[sim:]]`, `[[anim:]]` or an `ascii` pre block). Hub articles: ≥3 real slide captures + an anim.
- Order inside an article: overview → `{def}` → `{analogy}` → `[[anim:]]` → `[[sim:]]` → slide-order body → `== 시험 대비 핵심 요약 ==` → `== 관련 문서 ==`.
- Do not paraphrase the professor's English terms into Korean.

### Testing Requirements
`python3 build.py` (broken links 0, missing images 0) and `node src/test_render.js index.html`.

### Common Patterns
- Captions: `p.31 무엇 — 한 줄 설명`. Size `large` for full diagrams, `small` for little tables.
- `{exam}` boxes carry things that actually appeared on Quiz 1 or the 2025F midterm; `{warn}` for known traps.

## Dependencies

### Internal
- `../sims/`, `../anims/` by name; `../../_slides/` by file name.
- Facts come from `../../../강의자료/`, `../../../정리본/`, `../../../문제풀이/`, `../../../족보/`.

<!-- MANUAL: -->
