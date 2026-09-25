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
    ├── anims/_anim_engine.js # AnimEngine (움직이는 그림 공용 재생기: 재생/정지/배속/스크러버)
    ├── anims/*.js           # 움직이는 그림 각 1파일, ANIMS["이름"] = {...} (§7)
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
| `[[anim:ctx_switch|캡션]]` | 움직이는 그림 삽입 (한 줄에 단독으로, 캡션 선택). §7 |
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
5. 문서마다 최소 `{analogy}` 1개, 시각자료([[img:]] 또는 [[sim:]] 또는 [[anim:]] 또는 ascii 그림) 1개 이상. 핵심 문서는 '''실제 슬라이드 캡처 3장 이상''' + 움직이는 그림 1개. 용어 문서도 관련 슬라이드에 그림·표·코드가 있으면 캡처 1장을 넣는다 (2026-09-25 요청: "실제 이미지, 움직이는 그림").
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

## 7. 움직이는 그림 (src/anims/*.js, `[[anim:이름|캡션]]`)

시뮬레이터(§6)가 "변수를 한 단계씩 보는 디버거"라면, 움직이는 그림은 '''보고만 있어도 흐름이 들어오는 10초짜리 만화'''다.
문서에서는 보통 `{def}`/`{analogy}` 다음, `[[sim:]]` 앞에 둔다 — 먼저 그림으로 감을 잡고, 그다음 시뮬레이터로 값을 확인하는 순서.

### 파일 형식 (참조 구현: `src/anims/ctx_switch.js`)
```js
window.ANIMS = window.ANIMS || {};
ANIMS["ctx_switch"] = {                 // 이름 == 파일명(ctx_switch.js). 영문 소문자+밑줄
  title: "컨텍스트 스위치 — CPU 가 A 에서 B 로 넘어가는 10초",
  desc: "한 줄 설명. 인라인 위키 문법([[링크]], '''굵게''') 허용",
  duration: 10,                         // 초. 엔진이 0→duration 을 반복 재생
  build: function () { return '<svg viewBox="0 0 760 330" xmlns="http://www.w3.org/2000/svg">…</svg>'; }
};
```
- `build()` 는 '''순수 문자열'''만 돌려준다. DOM 접근 금지 (`node src/test_anims.js` 가 document 없이 실행한다).
- 시간축은 '''SMIL''' (`<animate>`, `<animateTransform>`, `<animateMotion>`, `<set>`) 로만 만든다. CSS animation·JS 타이머 금지 — 엔진이 `svg.setCurrentTime(t)` 로 시간을 직접 움직이므로 SMIL 만 스크러버/배속/정지에 반응한다.
- 모든 애니메이션 요소는 `begin + dur ≤ duration`. `repeatCount="indefinite"` 를 쓰려면 `dur` 을 반드시 지정. `fill="freeze"` 로 마지막 상태를 유지.
- "t초~t'초에만 보이기"는 `opacity` 를 `values="0;0;1;1;0;0" keyTimes="0;a;a+0.02;b;b+0.02;1" dur="D s"` 로 (ctx_switch.js 의 `show()` 헬퍼 참고). keyTimes 는 0 에서 시작해 1 로 끝나고 단조증가.
- `viewBox="0 0 760 H"` (H 는 260~380). `<svg>` 에 고정 `width`/`height` 쓰지 말 것 — CSS 가 100% 폭으로 맞춘다.
- 텍스트 안의 `<`, `>`, `&` 는 `&lt;` `&gt;` `&amp;` 로. (`p->context` → `p-&gt;context`)
- `<marker id>` 등 id 는 anim 이름을 접두어로 (`cs_arrow`) — 한 문서에 그림이 여럿 실린다.
- 크기 60KB 이하. 글자 크기 11~15px, 한국어 산문 + 영어 용어 (§4-1 그대로).
- 색: Process/Thread A `#1d65b3`(연한 `#dbe8f7`), B `#2e9e4f`(`#dff3e4`), C `#e09a40`(`#fdeec2`), CPU/커널 `#3b2f4a`(`#efe9f6`), 하드웨어/경고 `#d6465f`, 보조 글씨 `#777`. 상태 배지: running `#cdefd2/#1d6b2a`, ready `#fdeec2/#8a6000`, blocked `#dcdcf2/#3c3c88`, spinning `#ffd9d9/#a52f2f`.
- 구성 규칙: 맨 위 한 줄 '''단계 자막'''(지금 무슨 일이 일어나는지, 시간대별로 바뀜) → 가운데 그림 → 맨 아래 한 줄 '''요점'''. 자막 문장은 문서 본문의 표현과 일치시킬 것 (시험 답안에 그대로 쓸 수 있게).
- 시간 설계: 첫 1~2초는 초기 상태를 보여주고, 각 단계 1.5초 내외, 마지막 1.5초는 결과 상태 유지. 8~14초.

### 검증 (작성자가 반드시)
```sh
node src/test_anims.js                  # 계약 검사 (태그 균형, viewBox, SMIL 유무, begin+dur ≤ duration, 이스케이프)
python3 build.py                        # index.html 재생성 + 문서에서 안 쓰는 anim 경고
./shot.sh <이름> <초> [출력.png]         # headless Chrome 으로 t초에 멈춘 화면 캡처 → Read 로 열어 눈으로 확인
```
캡처는 최소 3개 시각(초반·중반·끝)에서 찍어 '''글자 겹침·잘림·화살표 방향·색 대비'''를 확인하고 고친 뒤에 끝낸다.
문서에 넣을 때는 `[[anim:이름|캡션]]` 한 줄, 캡션에는 "무엇을 보고 나서 무엇을 하라"를 쓴다.

### 목록 (이름 → 문서)
| 이름 | 내용 | 문서 |
|---|---|---|
| ctx_switch | 타이머 인터럽트 → HW 유저 상태 저장 → switch() PCB 저장/복원 → B 실행 | 컨텍스트 스위치 |
| cache_affinity | CPU0 캐시 warm-up(Miss→Hit) → SQMS 가 A 를 CPU1 로 → cold cache Miss·메모리 왕복 → affinity 로 CPU0 고정 시 Hit | cache affinity, 멀티프로세서 스케줄링 |
| work_stealing | MQMS Q0={A,B,C,D}, Q1={E} → E 종료, CPU1 idle(4:0 load imbalance) → source 가 target peek → D, C steal → 2:2 균형 | work stealing, MQMS |
| thread_addr_space | 한 주소 공간(code·data·heap) + pthread_create 로 Stack (2)·TCB(T2) 생성 → 두 PC 가 같은 코드 위를 이동 → 둘 다 힙의 s->n 수정 | 스레드, 스레드 스택 |
| counter_race | p.40 표 그대로: counter=50, T1 mov/add → interrupt(TCB 저장) → T2 mov/add/mov(51) → T1 복원·store 51 → 기대 52, 결과 51 | race condition, counter 예제 |
| thread_ctx_switch | 프로세스 전환 vs 스레드 전환 나란히: ① 레지스터 저장 ② 복원은 같고 ③ 페이지 테이블 교체·TLB flush 는 프로세스만 | 스레드 컨텍스트 스위치, 스레드와 프로세스 비교 |
| sched_fifo_sjf_stcf | A=100@0, B=C=10@10 을 FIFO/SJF/STCF 세 줄 Gantt 로 실시간 채움(now 커서) → t=10 STCF 만 선점 → 평균 turnaround 103.33 / 103.33 / 50 | 스케줄링, STCF |
| round_robin | A·B·C 각 5초 동시 도착: RR(slice 1) vs SJF(= slice 5) 두 줄, CPU 칩이 A→B→C 회전, ▲첫 실행/▼완료 → response 1 vs 5, turnaround 14 vs 10 | Round Robin, time slice |
| mlfq_boost | Q2→Q0 3큐(slice 10ms): CPU-bound A 가 allotment 소진마다 강등(Rule 4), 1ms 쓰고 I/O 하는 B 는 Q2 유지, 주기 S 후 Rule 5 boost 로 모두 Q2 | MLFQ |
| lottery_wheel | 티켓 100장(A 0~74, B 75~99)에 슬라이드 p.12 난수 15개 그대로 추첨 → 실행 기록 + 누적 비율 막대(목표 75%) → A 11 : B 4 | Lottery 스케줄링, tickets |
| stride_pass | tickets 100/50/250 → stride 100/200/40, pass 막대가 최소 선택마다 stride 만큼 자람 (A B C C C A C C) → 모두 200, C5:A2:B1 | Stride 스케줄링, pass |
| cfs_vruntime | nice −5/0/+5 (weight 3121/1024/335), slice = 48ms×w/Σw (C 는 min_granularity 6ms), vruntime 이 1024/w 속도로 자라고 최소가 실행 + 실제 시간 Gantt | CFS, vruntime |
| syscall_trap | read 스텁: li a7 → ecall(HW: sepc=ecall 주소, mode=kernel, pc=uservec) → trapframe 저장·커널 스택 → usertrap epc=sepc, +4 → syscall a0=10 → usertrapret w_sepc(epc) → sret 로 ret 부터 user 재개 (sim:syscall_trap 과 별개) | 트랩, 제한적 직접 실행 |
| proc_lifecycle | Running/Ready/Blocked 세 원 위 토큰 A·B: 둘 다 Ready → A Scheduled → 타이머로 Descheduled → B Scheduled → B I/O: initiate(Blocked) → A 가 CPU 채움 → B I/O: done → Ready (Running 직행 ✗) | 프로세스 상태 |
| fork_exec_wait | p3.c: 부모 PID 29383 fork → 자식 29384(주소 공간 복사, rc=0 / rc=29384) → 부모 wait(blocked) → 자식 execvp("wc") 로 주소 공간 교체(PID 그대로) → exit·ZOMBIE → 부모 깨어나 rc_wait=29384 | 프로세스 API, fork |
| program_load | 디스크 ELF(code·static data) → ① 주소 공간 할당 → ② code·data 로드 → ③ stack(argc/argv, 아래로) → ④ heap(위로) → ⑤ fd 0·1·2 → ⑥ PC←main(), 생성 중→Ready→Running | 프로그램 로딩, 프로세스 |
| spin_lock_tas | lock->flag 칸: T1 TestAndSet 반환 0 → flag=1 획득·CS 진입, T2 는 반환 1(1→1 무해)로 spinning·낭비 tick 증가, T1 unlock(flag=0) → T2 의 다음 TAS 반환 0 → 획득 | spin lock, test-and-set |
| ticket_turn | ticket/turn 카운터 + T1·T2·T3: FetchAndAdd(&ticket) 로 myturn 0·1·2, turn==myturn 만 진입, unlock 이 FetchAndAdd(&turn) → T1→T2→T3 FIFO | ticket lock |
| park_unpark | T1 락 보유 중 T2: guard TAS → queue_add(gettid) → setpark() → guard=0 → park()(Blocked, CPU 0) → T1 unlock: guard → unpark(queue_remove) · flag 1 유지(hand-off) → guard=0 → T2 진입 | queue 락, park와 unpark |
| alarm_tick | sigalarm(3, handler): which_dev==2 tick 마다 alarm_elapsed 1·2·3 → alarm_saved=*trapframe → alarm_active=1, elapsed=0, epc=handler → sret 로 handler → handler 중 tick 안 셈 → sigreturn: *trapframe=alarm_saved, active=0, a0 반환(42) → 0x1234 재개 | 과제1 xv6 alarm, sigalarm |
| priority_inversion | H/M/L Gantt: ① L 락 보유 → H 선점·락 대기 → M 이 L 선점 → H 대기 7 단위 ② priority inheritance: L 을 H 급으로 → M 선점 불가 → H 대기 2 단위 | priority inversion |
