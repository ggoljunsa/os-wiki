<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-09-25 | Updated: 2026-09-25 -->

# sims

## Purpose
Step-through simulators — "a C debugger for the slide's code": code panels with a current-line marker, a variable table that highlights diffs, a description per step, optional SVG per step. 16 sims; the catalogue with their target articles is in `CONTRACT.md` §6.

## Key Files
| File | Description |
|------|-------------|
| `_engine.js` | SimEngine: options → `build(opts)` → steps; controls (⏮ ◀ ▶ ⏭, autoplay, slider, ← → keys); mounts on `.sim[data-sim]`. |
| `counter_race.js`, `flag_lock.js`, `test_and_set.js`, `cas_llsc.js`, `ticket_lock.js`, `queue_lock.js` | 8–9강 concurrency and lock interleavings. |
| `alarm_trace.js` | Quiz 1 problem 5 / Assignment 1 tick-by-tick trace (trapframe.epc, alarm_saved, alarm_active, a0). |
| `syscall_trap.js`, `context_switch.js`, `proc_states.js`, `fork_exec.js`, `thread_stack.js` | 3–4강 and 8강 mechanisms. |
| `sched_gantt.js`, `mlfq.js`, `stride_lottery.js`, `cfs_eevdf.js` | 5–6강 scheduling policies with editable inputs. |

## For AI Agents

### Working In This Directory
- A sim is `SIMS["name"] = { title, desc, options, build(opts) }` returning `{ panels, vars, steps }`; every step carries a full `vars` snapshot (the engine diffs consecutive steps).
- No DOM access inside a sim file — `test_sims.js` runs them without `document`.
- `pc` values are 1-based line numbers into the panel's `lines`; `null` means idle.

### Testing Requirements
`node src/test_sims.js` (all option combinations must build, `steps.length > 0`, `pc` in range).

### Common Patterns
- Use `status: { T1: "running", T2: "spinning" }` for badges; known badge classes: running, ready, spinning, blocked/parked/sleeping, done/finished.
- `note:` for the red warning box at the step where the bug/race manifests.

## Dependencies

### Internal
- `renderer.js` `inlineFormat` for `[[링크]]` inside step descriptions.

<!-- MANUAL: -->
