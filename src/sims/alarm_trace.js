// alarm_trace — 퀴즈1 5번 프로그램을 timer tick 단위로 재현한다.
// 출처: 퀴즈1 원문(문제풀이/퀴즈1/quiz1_text.md), Assignment 1.pdf, Assignment1_claude_sigalarm.patch
window.SIMS = window.SIMS || {};

(function () {
  var EPC_LOOP = "main+0x1c (for 루프)";
  var EPC_BURN = "burn+0x14 (nop 루프)";
  var A0_INT   = "0x2a";

  function userSrc(variant) {
    return [
      "volatile int count = 0, sum = 0;",
      "",
      "void burn(void) {",
      "    for (volatile int k = 0; k < 500000000; k++)",
      "        asm volatile(\"nop\");",
      "}",
      "",
      "__attribute__((noinline))",
      "void foo(unsigned int *j) { *j += 1; }",
      "",
      "void periodic(void) {",
      "    count++;",
      "    sum += count;",
      "    burn();",
      (variant === "always"
        ? "    sigalarm(0, 0);              // 무조건 해제"
        : "    if (count == 3) sigalarm(0, 0);"),
      "    sigreturn();",
      "}",
      "",
      "int main(void) {",
      "    unsigned int i = 0, j = 0;",
      "    sigalarm(2, periodic);",
      "    for (; count < 3; i++)",
      "        foo(&j);",
      "",
      "    printf(\"count=%d sum=%d\\n\", count, sum);",
      "    printf(\"i==j: %d\\n\", i == j);",
      "",
      "    burn();",
      "    printf(\"after=%d\\n\", count);",
      "    exit(0);",
      "}"
    ];
  }

  var TRAP_SRC = [
    "void usertrap(void) {",
    "  // ... scause 판별, which_dev = devintr() ...",
    "  if (which_dev == 2) {                 // timer interrupt",
    "    if (p->alarm_interval > 0 && !p->alarm_active) {",
    "      p->alarm_elapsed++;",
    "      if (p->alarm_elapsed >= p->alarm_interval) {",
    "        p->alarm_saved   = *p->trapframe;   // 문맥 통째로 복사",
    "        p->alarm_active  = 1;",
    "        p->alarm_elapsed = 0;",
    "        p->trapframe->epc = (uint64)p->alarm_handler;",
    "      }",
    "    }",
    "    yield();",
    "  }",
    "  usertrapret();      // sret 는 trapframe->epc 로 돌아간다",
    "}"
  ];

  function sysretSrc(a0fix) {
    return [
      "uint64 sys_sigreturn(void) {",
      "  struct proc *p = myproc();",
      "  *p->trapframe    = p->alarm_saved;   // 문맥 통째로 복원",
      "  p->alarm_active  = 0;",
      "  p->alarm_elapsed = 0;",
      (a0fix === "bug"
        ? "  return 0;                            // 버그: a0 를 0 으로 덮어씀"
        : "  return p->trapframe->a0;             // 복원된 a0 를 그대로 반환"),
      "}",
      "",
      "// kernel/syscall.c 의 syscall() 안에서:",
      "uint64 result = sys_sigreturn();",
      "p->trapframe->a0 = result;             // 반환값을 a0 에 기록"
    ];
  }

  function timelineSvg(ticks, cur, disabled) {
    var n = Math.max(ticks.length, 1);
    var w = 24 + n * 24;
    var h = 92;
    var s = '<svg viewBox="0 0 ' + w + ' ' + h + '" width="100%" style="max-width:' + w + 'px">';
    s += '<text x="4" y="13" font-size="11" fill="#9aa">timer tick 타임라인' +
         (disabled ? ' (alarm 해제됨)' : '') + '</text>';
    s += '<line x1="12" y1="46" x2="' + (w - 6) + '" y2="46" stroke="#556" stroke-width="1"/>';
    for (var k = 0; k < ticks.length; k++) {
      var t = ticks[k];
      var x = 14 + k * 24;
      var fill = t.kind === "fire" ? "#e8a33d"
               : t.kind === "ignored" ? "#c0574f"
               : t.kind === "disabled" ? "#777f88"
               : "#4a90d9";
      var op = (t.n === cur) ? "1" : "0.42";
      if (t.kind === "ignored" || t.kind === "fire") {
        s += '<rect x="' + (x - 2) + '" y="20" width="24" height="46" rx="4" fill="' +
             (t.kind === "fire" ? "#e8a33d" : "#c0574f") + '" opacity="0.13"/>';
      }
      s += '<rect x="' + x + '" y="26" width="20" height="20" rx="3" fill="' + fill +
           '" opacity="' + op + '"/>';
      s += '<text x="' + (x + 10) + '" y="41" font-size="10" text-anchor="middle" fill="#fff">' +
           t.n + '</text>';
      if (t.n === cur) {
        s += '<text x="' + (x + 10) + '" y="60" font-size="12" text-anchor="middle" fill="#e8a33d">&#9650;</text>';
      }
    }
    s += '<text x="4" y="79" font-size="9.5" fill="#9aa">' +
         '■ 파랑 = 평범한 tick · ' +
         '■ 주황 = 핸들러 발동 · ' +
         '■ 빨강 = alarm_active 라 무시(재진입 금지) · ' +
         '■ 회색 = alarm 해제됨</text>';
    s += '</svg>';
    return s;
  }

  window.SIMS["alarm_trace"] = {
    title: "과제1 alarm — 퀴즈1 5번 프로그램 tick 추적",
    desc: "sigalarm(2, periodic) 을 건 프로그램이 timer tick 마다 어떤 일을 겪는지 trapframe·alarm_saved·alarm_active 를 보면서 따라갑니다.",
    options: [
      { key: "variant", label: "핸들러 안의 sigalarm(0,0)", values: [
        { value: "cond",   label: "if (count == 3) 조건부 (원본)" },
        { value: "always", label: "무조건 호출 (퀴즈 5-b)" }
      ]},
      { key: "a0fix", label: "sys_sigreturn 의 반환값", values: [
        { value: "correct", label: "return p->trapframe->a0 (정답)" },
        { value: "bug",     label: "return 0 (버그)" }
      ]}
    ],
    build: function (opts) {
      opts = opts || {};
      var variant = opts.variant || "cond";
      var a0fix   = opts.a0fix || "correct";

      var USER = userSrc(variant);
      var SYSRET = sysretSrc(a0fix);

      var st = {
        "mode": "user mode",
        "alarm_interval": 0,
        "alarm_handler": "0 (없음)",
        "alarm_elapsed": 0,
        "alarm_active": 0,
        "trapframe->epc": "main+0x00",
        "trapframe->a0": "—",
        "alarm_saved.epc": "—",
        "alarm_saved.a0": "—",
        "count": 0, "sum": 0, "i": 0, "j": 0,
        "tick": 0,
        "output": []
      };
      var ticks = [];
      var steps = [];

      function snap() {
        var o = {};
        for (var k in st) o[k] = (k === "output") ? st.output.slice() : st[k];
        return o;
      }
      function push(desc, pc, note) {
        pc = pc || {};
        var inKernel = (st.mode !== "user mode");
        steps.push({
          desc: desc,
          pc: {
            user:   (pc.user   == null) ? null : pc.user,
            trap:   (pc.trap   == null) ? null : pc.trap,
            sysret: (pc.sysret == null) ? null : pc.sysret
          },
          vars: snap(),
          status: {
            user:   (pc.user   != null) ? (inKernel ? "멈춤" : "running") : "대기",
            trap:   (pc.trap   != null) ? "kernel" : "—",
            sysret: (pc.sysret != null) ? "kernel" : "—"
          },
          note: note || undefined,
          svg: timelineSvg(ticks.slice(), st.tick, st.alarm_interval === 0 && st.tick > 0)
        });
      }
      function addTick(kind) { st.tick++; ticks.push({ n: st.tick, kind: kind }); }

      // ── 0. 준비 ──────────────────────────────────────────────
      push("main() 진입. 지역 변수 i, j 는 0 입니다. 전역 count, sum 도 0. " +
           "지금은 [[alarm_interval]] 이 0 이라 [[타이머 인터럽트]] 가 와도 [[usertrap]] 은 [[yield]] 만 하고 돌아갑니다.",
           { user: 20 });

      st.mode = "kernel mode";
      push("'''sigalarm(2, periodic)''' 호출 — [[usys.pl]] 이 만든 스텁이 a7 에 SYS_sigalarm 을 넣고 `ecall` 을 실행해 커널로 트랩합니다. " +
           "([[xv6 시스템 콜 경로]] 참고)", { user: 21 });

      st["alarm_interval"] = 2;
      st["alarm_handler"] = "periodic (유저 주소)";
      st["alarm_elapsed"] = 0;
      push("sys_sigalarm() 이 [[myproc]]() 으로 얻은 struct proc 에 [[alarm_interval]]=2, [[alarm_handler]]=periodic 을 '''프로세스마다 따로''' 저장합니다. " +
           "커널 전역이 아니라 [[struct proc]] 필드라는 점이 중요합니다.", { user: 21 });

      st.mode = "user mode";
      st["trapframe->a0"] = "0 (sigalarm 반환값)";
      push("[[return-from-trap]] ([[sret]]) 로 유저 모드 복귀. 시스템 콜 반환값 0 이 [[a0]] 에 담겨 있습니다. 이제 for 루프로 들어갑니다.",
           { user: 22 });

      var loopShown = false;
      function loopIter(extra) {
        st.i += 1; st.j += 1;
        st["trapframe->epc"] = EPC_LOOP;
        st["trapframe->a0"] = A0_INT;
        var d = "for 루프가 foo(&j) 를 호출해 i 와 j 를 나란히 1 씩 올립니다. " +
                "i 는 루프가, j 는 foo() 가 올리므로 '''둘은 항상 같은 값'''입니다.";
        var n;
        if (!loopShown) {
          loopShown = true;
          n = "실제로는 tick 사이에 i, j 가 수백만 번 증가하지만 이 시뮬레이터는 1 씩만 표시합니다. " +
              "인터럽트 당시 [[a0]] 에 남아 있던 값은 퀴즈 4번처럼 0x2a 로 잡았습니다.";
        }
        push(d + (extra || ""), { user: 23 }, n);
      }

      function tickNoFire() {
        addTick("normal");
        st.mode = "kernel mode";
        push("&#9200; '''timer tick''' 발생 → 하드웨어가 유저 레지스터를 [[trapframe]] 에 저장하고 [[usertrap]]() 으로 점프. " +
             "[[which_dev]] == 2 이므로 타이머 분기로 들어갑니다.", { trap: 3 });
        st["alarm_elapsed"] += 1;
        push("[[alarm_interval]] > 0 이고 [[alarm_active]] 가 0 이므로 조건 통과 → [[alarm_elapsed]] 를 " +
             (st["alarm_elapsed"] - 1) + " → " + st["alarm_elapsed"] + " 로 올립니다.", { trap: 5 });
        push("elapsed(" + st["alarm_elapsed"] + ") >= interval(2) 가 '''거짓''' → 아직 핸들러를 부르지 않습니다.", { trap: 6 });
        push("[[yield]]() 로 CPU 를 한 번 양보한 뒤 [[usertrapret]]() → [[sret]]. " +
             "[[epc]] 를 건드리지 않았으므로 끊긴 그 명령어로 돌아갑니다.", { trap: 13 });
        st.mode = "user mode";
        push("유저 모드 복귀. 루프가 아무 일 없었다는 듯 이어집니다.", { user: 23 });
      }

      function tickFire() {
        addTick("fire");
        st.mode = "kernel mode";
        push("&#9200; '''timer tick''' 발생 → [[usertrap]]() 진입. 이번에는 [[alarm_elapsed]] 가 interval 에 도달합니다.",
             { trap: 3 });
        st["alarm_elapsed"] += 1;
        push("[[alarm_elapsed]] 를 " + (st["alarm_elapsed"] - 1) + " → " + st["alarm_elapsed"] + ". (퀴즈 2번 첫 빈칸은 `!p->alarm_active`)",
             { trap: 5 });
        push("elapsed(2) >= interval(2) '''참''' → 알람 발동!", { trap: 6 });
        st["alarm_saved.epc"] = st["trapframe->epc"];
        st["alarm_saved.a0"]  = st["trapframe->a0"];
        push("[[alarm_saved]] = '''*p->trapframe''' — 끊긴 유저 문맥을 통째로 '''한 부 더''' 복사합니다. " +
             "곧 같은 [[trapframe]] 의 [[epc]] 를 핸들러 주소로 덮어쓸 것이므로, 원본을 따로 두지 않으면 돌아갈 자리를 잃습니다. (퀴즈 3-a 답)",
             { trap: 7 });
        st["alarm_active"] = 1;
        st["alarm_elapsed"] = 0;
        push("[[alarm_active]] = 1 (핸들러 실행 중 표시), [[alarm_elapsed]] = 0 (다음 주기를 위해 re-arm).", { trap: 8 });
        st["trapframe->epc"] = "periodic";
        push("[[epc|p->trapframe->epc]] 에 [[alarm_handler]] 주소를 씁니다. " +
             "[[usertrapret]]() 이 이 값을 [[sepc]] 에 넣고 [[sret]] 하므로, 유저는 '''끊긴 자리가 아니라 periodic 부터''' 재개합니다. (퀴즈 2번 세 번째 빈칸)",
             { trap: 10 });
        push("[[yield]]() → [[usertrapret]]() → [[sret]].", { trap: 13 });
        st.mode = "user mode";
        push("&#9889; 유저 모드로 돌아왔는데 PC 가 periodic 입니다. 핸들러는 커널이 아니라 '''user mode''' 에서 돕니다. (퀴즈 1번 답)",
             { user: 11 });
      }

      function handlerBody(roundNo) {
        st["count"] += 1;
        push("count++ → " + st["count"] + ". count 와 sum 은 volatile 전역이라 핸들러가 바꿔도 main 이 바로 봅니다.", { user: 12 });
        st["sum"] += st["count"];
        push("sum += count → " + st["sum"] + ".", { user: 13 });
        push("burn() 진입 — 최소 5 tick 을 태우는 긴 계산입니다. 핸들러가 도는 동안에도 [[타이머 인터럽트]] 는 계속 옵니다.",
             { user: 14 });
        st["trapframe->epc"] = EPC_BURN;

        addTick("ignored");
        st.mode = "kernel mode";
        push("&#9200; burn() 도중 tick 도착 → [[usertrap]]() 진입.", { trap: 3 });
        push("조건 `p->alarm_interval > 0 && !p->alarm_active` 에서 [[alarm_active]] == 1 이라 '''거짓'''. " +
             "[[alarm_elapsed]] 조차 올라가지 않고 그냥 지나갑니다.", { trap: 4 },
             "[[재진입 금지]] — 핸들러가 끝나기 전에 또 핸들러를 부르면 [[alarm_saved]] 가 덮어써져 원래 문맥을 영원히 잃습니다. alarmtest 의 test2 가 이걸 검사합니다.");
        push("[[yield]]() 후 복귀. 알람 관련 상태는 하나도 안 바뀌었습니다.", { trap: 13 });
        st.mode = "user mode";
        push("burn() 계속.", { user: 5 });

        addTick("ignored"); addTick("ignored"); addTick("ignored"); addTick("ignored");
        push("이어지는 4 번의 tick 도 똑같은 이유로 무시됩니다. burn() 이 끝나 " +
             (roundNo) + "번째 핸들러가 마무리 단계로 갑니다.", { user: 14 });
      }

      function disableAlarm(lineDesc) {
        st.mode = "kernel mode";
        push(lineDesc, { user: 15 });
        st["alarm_interval"] = 0;
        st["alarm_handler"] = "0 (없음)";
        st["alarm_elapsed"] = 0;
        st.mode = "user mode";
        push("sys_sigalarm 이 [[alarm_interval]]=0, [[alarm_handler]]=0 으로 되돌립니다. " +
             "이제부터 tick 이 와도 [[usertrap]] 의 알람 블록은 조건에서 바로 탈락합니다.", { user: 15 });
      }

      function sigreturnSteps() {
        st.mode = "kernel mode";
        push("'''sigreturn()''' 호출 — 이것도 시스템 콜이라 `ecall` 로 커널에 들어갑니다. " +
             "핸들러를 보통 함수처럼 `return` 으로 끝내면 유저 스택의 가짜 복귀 주소로 튀어 '''대부분 크래시'''합니다. (퀴즈 3-c 답)",
             { user: 16 });
        push("[[myproc]]() 로 현재 [[struct proc]] 을 잡습니다.", { sysret: 2 });
        st["trapframe->epc"] = st["alarm_saved.epc"];
        st["trapframe->a0"]  = st["alarm_saved.a0"];
        push("'''*p->trapframe = p->alarm_saved''' — 끊겼던 문맥을 통째로 되돌립니다. " +
             "이 순간 p->trapframe->a0 = '''0x2a''' 입니다. (퀴즈 4-a(i) 답)", { sysret: 3 });
        st["alarm_active"] = 0;
        st["alarm_elapsed"] = 0;
        push("[[alarm_active]] = 0 → 재진입 금지 해제. [[alarm_elapsed]] = 0 에서 다시 센다.", { sysret: 4 });

        if (a0fix === "correct") {
          push("`return p->trapframe->a0;` → 복원된 0x2a 를 반환값으로 내보냅니다. ([[a0 복원]])", { sysret: 6 });
          st["trapframe->a0"] = A0_INT;
          push("[[xv6 시스템 콜 경로|syscall()]] 이 `p->trapframe->a0 = result;` 로 반환값을 덮어씁니다. " +
               "반환값이 마침 0x2a 라서 '''결과적으로 아무것도 망가지지 않습니다'''. (퀴즈 4-a(ii) 답: 0x2a)", { sysret: 11 });
        } else {
          push("`return 0;` — 여기서 0 을 돌려주는 순간 복원해 둔 a0 가 무의미해집니다.", { sysret: 6 },
               "시스템 콜의 반환값은 언제나 [[a0]] 에 실립니다. sigreturn 도 예외가 아니므로, 0 을 반환하면 방금 복원한 a0 를 스스로 지웁니다.");
          st["trapframe->a0"] = "0 ← 0x2a 가 지워짐";
          push("syscall() 이 `p->trapframe->a0 = result;` 로 0 을 써 넣습니다. " +
               "인터럽트 당시의 [[a0]]=0x2a 는 '''사라졌습니다'''. (퀴즈 4-a(ii): 버그판 답은 0)", { sysret: 11 },
               "고치는 법은 `return p->trapframe->a0;` (퀴즈 4-b 답). alarmtest 의 test3 가 정확히 이 오류를 잡아냅니다.");
        }
        st.mode = "user mode";
        push("[[sret]] → [[epc]] 가 " + EPC_LOOP + " 이므로 '''끊겼던 바로 그 명령어'''로 돌아갑니다. (퀴즈 3-b 답)",
             { user: 23 });
      }

      // ── 1회차 ────────────────────────────────────────────────
      loopIter();
      tickNoFire();
      loopIter();
      tickFire();
      handlerBody(1);

      if (variant === "always") {
        disableAlarm("`sigalarm(0, 0);` 을 '''조건 없이''' 호출합니다. count 는 아직 1 인데 알람을 꺼 버리는 겁니다.");
        sigreturnSteps();
        st["alarm_elapsed"] = 0;
        loopIter(" count 는 1 에서 멈춰 있습니다.");
        addTick("disabled"); addTick("disabled"); addTick("disabled");
        st.mode = "kernel mode";
        push("&#9200; tick 이 계속 오지만 [[usertrap]] 의 `p->alarm_interval > 0` 이 거짓이라 " +
             "[[yield]]() 만 하고 돌아갑니다. periodic 은 '''두 번 다시 호출되지 않습니다'''.", { trap: 4 });
        st.mode = "user mode";
        addTick("disabled"); addTick("disabled");
        push("for 조건 `count < 3` 은 count 가 영원히 1 이므로 '''항상 참'''. 루프를 빠져나갈 수 없습니다.", { user: 22 });
        push("&#128721; 결론: 첫 번째 printf 는 '''실행되지 않습니다'''. 프로그램은 무한 루프에 빠져 어떤 출력도 내지 않습니다.",
             { user: 22 },
             "퀴즈 5-b 답 — 무조건 sigalarm(0,0) 을 부르면 첫 핸들러에서 알람이 꺼져 count 가 3 에 도달하지 못하고, main 의 for 루프가 끝나지 않으므로 첫 printf 도 실행되지 않는다.");
        return { panels: panels(), vars: varDefs(), steps: steps };
      }

      // cond: 1회차 마무리
      push("`if (count == 3)` → 1 == 3 '''거짓''' → 알람은 그대로 살아 있습니다.", { user: 15 });
      sigreturnSteps();

      // ── 2회차 ────────────────────────────────────────────────
      loopIter(" 알람 카운트는 0 부터 다시 셉니다.");
      tickNoFire();
      loopIter();
      tickFire();
      handlerBody(2);
      push("`if (count == 3)` → 2 == 3 '''거짓'''.", { user: 15 });
      sigreturnSteps();

      // ── 3회차 ────────────────────────────────────────────────
      loopIter();
      tickNoFire();
      loopIter();
      tickFire();
      handlerBody(3);
      push("`if (count == 3)` → 3 == 3 '''참''' → 이번에는 알람을 끕니다.", { user: 15 });
      disableAlarm("`sigalarm(0, 0)` 호출 — 세 번 울렸으니 이제 그만.");
      sigreturnSteps();

      // ── 마무리 ───────────────────────────────────────────────
      push("for 조건 검사: `count < 3` 에서 count 가 3 이므로 '''거짓''' → 루프 탈출.", { user: 22 });
      st["output"].push("count=" + st["count"] + " sum=" + st["sum"]);
      push("첫 번째 printf 출력: '''count=3 sum=6'''. sum 은 1+2+3 입니다.", { user: 25 });
      st["output"].push("i==j: 1");
      push("두 번째 printf: '''i==j: 1'''. 알람이 세 번이나 끼어들었는데도 i 와 j 가 어긋나지 않은 이유는 " +
           "[[sigreturn]] 이 [[alarm_saved]] 로 '''모든 레지스터와 [[epc]] 를 정확히''' 되돌렸기 때문입니다." +
           (a0fix === "bug"
             ? " 다만 지금은 [[a0 복원]] 이 빠진 버그판입니다 \u2014 이 프로그램은 마침 복귀 직후 a0 를 다시 쓰기 때문에 출력이 같아 보일 뿐, alarmtest 의 test3 는 이 오류를 잡아냅니다."
             : " ([[a0 복원]] 포함)"),
           { user: 26 },
           a0fix === "bug"
             ? "출력이 같다고 구현이 맞는 게 아닙니다. `return 0;` 은 인터럽트 당시의 [[a0]] 를 지우므로, 하필 그 순간 a0 에 살아 있던 값을 쓰는 프로그램에서는 조용히 틀린 값이 나옵니다."
             : undefined);
      push("burn() 실행 — 이 구간에도 tick 이 오지만 [[alarm_interval]] 이 0 이라 아무 일도 없습니다.", { user: 28 });
      addTick("disabled"); addTick("disabled"); addTick("disabled"); addTick("disabled"); addTick("disabled");
      push("5 번의 tick 이 조용히 지나갔습니다. count 는 그대로 3.", { user: 28 });
      st["output"].push("after=3");
      push("세 번째 printf: '''after=3'''. 알람이 꺼졌으므로 burn() 을 아무리 돌려도 count 가 더 늘지 않습니다.", { user: 29 });
      push("exit(0) — 최종 출력은 `count=3 sum=6` / `i==j: 1` / `after=3` 세 줄입니다. (퀴즈 5-a 답)", { user: 30 });

      return { panels: panels(), vars: varDefs(), steps: steps };

      function panels() {
        return [
          { id: "user",   title: "user: 퀴즈1 5번 프로그램", lang: "c", lines: USER },
          { id: "trap",   title: "kernel: usertrap() 타이머 분기", lang: "c", lines: TRAP_SRC },
          { id: "sysret", title: "kernel: sys_sigreturn()", lang: "c", lines: SYSRET }
        ];
      }
      function varDefs() {
        return [
          { name: "mode", group: "CPU" },
          { name: "tick", group: "CPU" },
          { name: "alarm_interval", group: "struct proc" },
          { name: "alarm_handler",  group: "struct proc" },
          { name: "alarm_elapsed",  group: "struct proc" },
          { name: "alarm_active",   group: "struct proc" },
          { name: "trapframe->epc", group: "trapframe (현재 문맥)" },
          { name: "trapframe->a0",  group: "trapframe (현재 문맥)" },
          { name: "alarm_saved.epc", group: "alarm_saved (백업 문맥)" },
          { name: "alarm_saved.a0",  group: "alarm_saved (백업 문맥)" },
          { name: "count",  group: "user 변수" },
          { name: "sum",    group: "user 변수" },
          { name: "i",      group: "user 변수" },
          { name: "j",      group: "user 변수" },
          { name: "output", group: "user 변수" }
        ];
      }
    }
  };
})();
