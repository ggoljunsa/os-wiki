# 운체위키 제작 계약 (모든 에이전트 필독)

목표: DGIST CSE304 운영체제(Prof. Yongwoo Lee, OSTEP) 중간고사·퀴즈·과제1 범위를 **나무위키 스타일 단일 HTML 위키**로 만든다.
독자는 수강생 본인(3학년). 해설본이 "그림이 없고 변수를 까먹어서" 이해가 안 됐다는 피드백이 출발점 →
**① 그림/캡처/시뮬레이터 많이, ② 비유 많이, ③ 모든 변수·용어는 [[링크]]로 사전 문서에 연결.**

## 1. 파일 배치
```
위키/
├── build.py                 # src/* → index.html (단일 파일), 참조 이미지 복사, 깨진 링크 검사
├── index.html               # 생성물 (직접 편집 금지)
├── images/                  # build.py 가 scratchpad/slides 에서 참조된 것만 복사
└── src/
    ├── head.html            # <head> + CSS + 레이아웃 (컴구위키 계승)
    ├── renderer.js          # 위키 문법 → HTML, 네비/검색/목차
    ├── nav.js               # NAV_ORDER (사이드바 그룹/순서)
    ├── sims/_engine.js      # SimEngine (공용 스텝 실행기)
    ├── sims/*.js            # 시뮬레이터 각 1파일, SIMS["이름"] = {...}
    └── articles/*.wiki      # 문서 각 1파일
```
슬라이드 원본 PNG: `/private/tmp/claude-501/-Users-jangminjun-Library-CloudStorage-OneDrive---------Onedrive--03--Academic-Backup-----3-2-------/96ceee28-231f-4e7d-9c18-6b6ed12a7a3e/scratchpad/slides/` 에 `L{강}-{페이지 2자리}.png` (예: `L9-12.png`), 과제 PDF는 `A1-{pp}.png`, 2025F 중간 해설은 `SOL-{pp}.png`. 페이지 번호 = PDF 페이지(= 슬라이드 인쇄 번호와 동일).
슬라이드 텍스트: 같은 scratchpad 의 `pdftext/{N}-{Title}.txt` (pdftotext -layout, 페이지 구분 \f).

## 2. 문서 파일 형식 (`src/articles/{정렬번호}_{key}.wiki`)
```
key: 트랩
title: 트랩 (Trap)
category: 4강 LDE, 용어
---
(본문. 아래 문법)
```
- `key` = 다른 문서가 `[[key]]` 로 참조하는 문자열. **반드시 §5 의 정식 키 목록을 쓸 것** (새 키가 필요하면 목록 형식대로 추가하고 파일도 만들 것).
- `category` 는 쉼표 구분. 첫 항목은 강의(`N강 ...`) 또는 `과제1`/`시험`/`용어`.
- 파일명 정렬번호: 00 대문·안내, 10 1강, 20 2강 … 90 9강, A0 과제1, E0 시험/족보, Z0 용어사전.

## 3. 위키 문법 (renderer.js 가 지원)
| 문법 | 결과 |
|---|---|
| `== 제목 ==`, `=== 소제목 ===`, `==== 소소제목 ====` | h2/h3/h4 (자동 목차) |
| `'''굵게'''`, `''기울임''`, `` `code` `` | 인라인 |
| `* 항목` / `# 번호항목` | ul / ol (한 줄 = 한 항목, 중첩 없음) |
| `[[키]]`, `[[키|표시문구]]` | 위키 링크 (없는 키는 회색 stub 표시 → 반드시 있는 키만) |
| `[[img:L9-12.png|캡션|small/medium/large]]` | 슬라이드 캡처 (한 줄에 단독으로) |
| `[[sim:counter_race]]` | 시뮬레이터 삽입 (한 줄에 단독으로) |
| `{info}…{/info}` `{warn}…{/warn}` `{tip}…{/tip}` `{joke}…{/joke}` | 참고/주의/팁/여담 박스 |
| `{analogy}…{/analogy}` | 🎭 비유 박스 (핵심 문서마다 1개 이상) |
| `{def}…{/def}` | 📖 정의 박스 (정의→용어 문제 대비, 슬라이드 원문 영어 정의 + 한국어) |
| `{quiz}…{/quiz}` | ❓ 예상문제 박스 |
| `{answer}…{/answer}` | 접힌 정답 (클릭해서 펼침) — quiz 바로 뒤에 |
| `{exam}…{/exam}` | 🎯 출제 포인트 박스 (2025F 족보/퀴즈1에 실제로 나온 것) |
| 박스는 여러 줄 가능 (`{info}` 로 시작해 `{/info}` 로 끝나는 줄까지) | |
| `<pre class="c">` … `</pre>` | 코드 블록 (class: c / asm / ascii / sh / txt). ascii 는 밝은 배경 (ASCII 그림용) |
| ↑ 중 `txt` / `ascii` 블록 안에서만 | `'''굵게'''` 와 `[[키]]` / `[[키\|표시]]` 가 추가로 처리된다. `c` / `asm` / `sh` / 클래스 없는 `<pre>` 는 완전히 raw |
| `{|` / `! 헤더 || 헤더` / `|-` / `| 셀 || 셀` / `|}` | 표 |
| `$…$` | KaTeX 인라인 수식 (드물게) |
| `----` | 수평선 |

주의: 코드 블록 안에서는 문법 처리 안 함. 표 셀 안에서는 인라인 문법만.

## 4. 문서 작성 규칙
1. **한국어 산문 + 영어 기술용어 그대로** ("context switch가 일어나면", "trapframe에 저장"). 교수가 영어로 쓴 용어를 번역하지 말 것.
2. 나무위키 톤: 개요 → 본문(슬라이드 순서) → 관련 문서. 잡담/여담 허용, 그러나 사실은 슬라이드·OSTEP 기준으로 정확히.
3. **슬라이드에 코드가 있으면 코드 블록으로 재현**하고, 그 코드가 무엇을 하는지 줄 번호로 설명. 동작이 단계적이면 `[[sim:]]` 을 바로 아래에 둔다.
4. **모든 변수/레지스터/구조체 필드는 첫 등장 시 [[링크]]**: 예 `[[trapframe]]`, `[[epc|p->trapframe->epc]]`, `[[a0]]`, `[[vruntime]]`, `[[lag]]`.
5. 문서마다 최소 `{analogy}` 1개, 시각자료([[img:]] 또는 [[sim:]] 또는 ascii 그림) 1개 이상. 핵심 문서는 캡처 3장 이상.
6. 캡처 고르는 기준: 그림/표/코드가 있는 슬라이드. 글자만 있는 슬라이드는 캡처 대신 본문으로.
7. 각 강의 문서 끝에 `== 시험 대비 핵심 요약 ==` 번호 목록, `== 관련 문서 ==` 링크 목록.
8. 용어 사전 문서(Z0_*)는 짧아도 됨 (정의 박스 + 어디서 쓰이는지 + 관련 링크 2~3개). 그러나 stub 이 아니라 실제 내용.
9. 이미 있는 해설본(`../정리본/*_해설.md`)의 "🎙 실제 수업 기록", 예상 문제, ⭐ 표시를 재활용할 것 — 교수가 강조한 문장은 `{exam}` 박스로.
10. 퀴즈1(2026-09-23 실제 시험, `../문제풀이/퀴즈1/quiz1_text.md`)과 2025F 중간고사(`../족보/`)에 나온 형식·주제는 `{exam}` 박스로 해당 문서에 반드시 반영.

## 5. 정식 문서 키 목록 (링크는 이 키로만)
### 안내
main(대문) · 읽는 순서 · 자주 틀리는 함정 모음 · 퀴즈1 복기 · 2025F 중간고사 족보 · 시험 정보
### 1강 Intro / 2강 What is OS
운영체제란 · 가상화 · 동시성 · 영속성 · 커널 · 시스템 콜 · 유저 모드와 커널 모드 · OS 설계 목표 · OS 역사
### 3강 From Program to Process
프로세스 · 프로세스 상태 · 프로세스 API · struct proc · PCB · fork · exec · wait · 프로그램 로딩 · 주소 공간 · 시스템 콜 추가 절차 · 프로세스 목록
### 4강 Limited Direct Execution
제한적 직접 실행 · 트랩 · 트랩 테이블 · trapframe · epc · sepc · return-from-trap · usertrap · usertrapret · 타이머 인터럽트 · 컨텍스트 스위치 · 커널 스택 · 협력적 방식 · 비협력적 방식 · 스케줄러 · 인터럽트 · sret
### 5강 Process Scheduling
스케줄링 · 스케줄링 지표 · turnaround time · response time · FIFO · SJF · STCF · Round Robin · time slice · MLFQ · convoy effect · 선점 · I/O와 스케줄링 · fairness
### 6강 Proportional Share
비례 지분 스케줄링 · Lottery 스케줄링 · tickets · Stride 스케줄링 · pass · stride · CFS · vruntime · nice · weight · sched_latency · min_granularity · EEVDF · lag · virtual deadline · 레드블랙 트리
### 7강 Multi-CPU Scheduling
멀티프로세서 스케줄링 · 캐시 일관성 · cache affinity · SQMS · MQMS · work stealing · 로드 밸런싱 · Amdahl의 법칙 · 멀티코어
### 8강 Concurrency
스레드 · TCB · 스레드 스택 · pthread_create · pthread_join · TLS · 스레드와 프로세스 비교 · race condition · critical section · mutual exclusion · atomic · counter 예제 · 스레드 컨텍스트 스위치
### 9강 Lock
락 · 락 평가 기준 · flag 락 · 인터럽트 비활성화 · test-and-set · spin lock · compare-and-swap · load-linked store-conditional · fetch-and-add · ticket lock · yield 락 · queue 락 · park와 unpark · setpark · futex · two-phase lock · guard · priority inversion
### 과제1
과제1 xv6 alarm · sigalarm · sigreturn · alarm_interval · alarm_handler · alarm_elapsed · alarm_saved · alarm_active · 재진입 금지 · a0 복원 · alarmtest · xv6 시스템 콜 경로 · which_dev · yield · usys.pl · myproc
### 기타 용어
레지스터 · 프로그램 카운터 · 스택 포인터 · a0 · 인터럽트 핸들러 · 커널 모드 · 특권 명령 · 힙 · 스택 · xv6 · OSTEP · RISC-V

## 6. 시뮬레이터 (src/sims/*.js)
### 이름 (문서에서 `[[sim:이름]]`)
| 이름 | 내용 | 문서 |
|---|---|---|
| counter_race | 두 스레드 counter++ (mov/add/mov) 인터리빙, 옵션: 인터럽트 없음 / load 직후 인터럽트 | counter 예제, race condition |
| flag_lock | 9강 flag 락 — 두 스레드가 동시에 진입하는 인터리빙 | flag 락 |
| test_and_set | TAS spin lock 정상 동작, 옵션: 2/3 스레드 | test-and-set, spin lock |
| cas_llsc | CompareAndSwap / LL-SC 락 (옵션 전환) | compare-and-swap, load-linked store-conditional |
| ticket_lock | fetch-and-add ticket/turn, 3 스레드, 공정성 | ticket lock, fetch-and-add |
| queue_lock | park/unpark 큐 락, guard, setpark, wakeup/waiting race | queue 락, park와 unpark |
| alarm_trace | 퀴즈1 5번 프로그램 tick 단위 재현 (trapframe.epc/alarm_saved/alarm_active/count/sum/a0), 옵션: count==3 조건부 vs 무조건 sigalarm(0,0) | 과제1 xv6 alarm, alarmtest, 퀴즈1 복기 |
| syscall_trap | user → ecall/trap → usertrap → syscall → usertrapret → sret (mode, pc, sepc, trapframe, 커널 스택) | 제한적 직접 실행, 트랩, xv6 시스템 콜 경로 |
| context_switch | timer interrupt → A 레지스터 저장 → switch → B 복원 (두 프로세스 레지스터/커널 스택/PCB) | 컨텍스트 스위치, 타이머 인터럽트 |
| proc_states | Running/Ready/Blocked 상태 기계, 이벤트(I/O 요청, 완료, 스케줄, 디스케줄) 단계 | 프로세스 상태 |
| fork_exec | fork/exec/wait 예제(p1.c~p3.c) 출력 추적, PID·부모/자식 | fork, exec, wait |
| sched_gantt | FIFO/SJF/STCF/RR, 도착/실행시간 편집 가능, tick 단위 Gantt + turnaround/response 평균 | FIFO, SJF, STCF, Round Robin, 스케줄링 지표 |
| mlfq | 3-큐 MLFQ, 규칙 1~5, allotment, priority boost, 옵션: I/O 잡 포함 | MLFQ |
| stride_lottery | Stride pass/stride 표 단계, Lottery(시드 고정) 비교 | Stride 스케줄링, Lottery 스케줄링 |
| cfs_eevdf | CFS vruntime(weight) 타임라인, EEVDF lag/VD 선택 과정 | CFS, EEVDF |
| thread_stack | 주소 공간 안 두 스레드 스택 + pthread_create 단계 | 스레드, 스레드 스택 |

### 엔진 API (`src/sims/_engine.js`, 모든 sim 파일이 따를 것)
```js
window.SIMS = window.SIMS || {};
SIMS["counter_race"] = {
  title: "counter++ 경쟁 상태",
  desc: "한 줄 설명 (무엇을 보여주는지)",
  options: [ { key:"interrupt", label:"인터럽트 시점", values:[{value:"none",label:"없음"},{value:"after_load",label:"load 직후"}] } ],
  build(opts) {           // opts = {interrupt:"after_load"} (기본값 = 각 option 의 첫 value)
    return {
      panels: [ { id:"T1", title:"Thread 1", lang:"asm", lines:["mov 0x8049a1c, %eax","add $0x1, %eax","mov %eax, 0x8049a1c"] }, ... ],
      vars:   [ { name:"counter", group:"메모리" }, { name:"T1.eax", group:"Thread 1" }, ... ],   // 표시 순서
      steps:  [
        { desc:"설명 (인라인 위키문법 가능: '''굵게''', [[링크]])",
          pc: { T1: 1, T2: null },        // 패널별 현재 줄 (1-based, null=대기)
          vars: { counter:50, "T1.eax":"?", ... },   // 전체 스냅샷 (엔진이 이전 step 과 diff 해서 바뀐 값 강조)
          status: { T1:"running", T2:"ready" },     // 선택. 패널 헤더에 배지
          note: "warn 텍스트 (선택, 빨간 박스)",
          svg: "<svg …>" 또는 function(step, i) → string (선택. 커스텀 그림: Gantt, 스택, 상태기계 등)
        }, ...
      ]
    };
  }
};
```
엔진 동작 (`SimEngine.mount(containerEl, simName)`):
- 헤더(제목·설명) → 옵션 select 들(바꾸면 build 재실행, step 0) → 컨트롤(⏮ ◀ ▶ ⏭, ▶ 자동재생(속도), 슬라이더, "n / N") → 코드 패널 가로 나열(현재 줄 하이라이트, status 배지) → 변수표(그룹별, 바뀐 값 노란 배경 + 이전값 표시) → 설명 박스 → svg 영역.
- 모바일에서 세로 배치. 키보드 ← → 지원. 각 sim 은 순수 데이터 + build 만 갖는다 (DOM 접근 금지).
- 자동 테스트: `src/test_sims.js` (node) 가 모든 sims 를 로드해 각 옵션 조합으로 build() 를 실행, steps.length>0 이고 pc 가 존재하는 패널 줄 범위 안인지 검사.
