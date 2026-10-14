// p7_fetchadd — 2025F Problem 7 FetchAdd lock (교수 의도판) 과 문제집 u12 ④-14 변형을 줄 단위로.
// FetchAdd(p, v): atomic 하게 *p += v, 옛 값 반환. flag = "락 보유자 1 + 시도 중인 스레드 수".
// 옵션: v7(④-14 순서, flag 1→2→3→2→1→0→1) / no_c((c) 되돌리기를 빼먹으면 flag 가 계속 쌓여 아무도 못 잡음)
(function (global) {
  "use strict";
  global.SIMS = global.SIMS || {};

  function code(noC) {
    return [
      "void lock(lock_t *lock) {",
      "  do {",
      "    int old = FetchAdd(&lock->flag, 1);   // (a) 일단 +1 해 본다",
      "    if (old == 0) {                       // (b) 옛 값 0 = 아무도 없었다",
      "      return;                             // 획득",
      "    } else {",
      noC ? "      /* (c) 빠짐! */" : "      FetchAdd(&lock->flag, -1);          // (c) 방금 +1 을 되돌림",
      "    }",
      "  } while (1);                            // (d) 다시 시도",
      "}",
      "void unlock(lock_t *lock) {",
      "  FetchAdd(&lock->flag, -1);",
      "}"
    ];
  }

  // 각 항목: [스레드, 동작, 메모]  동작: "try"(3번 줄) "check"(4번 줄) "back"(7번 줄) "unlock"(12번 줄)
  var SCHED = {
    v7: [
      ["T1", "try", "T1 이 `lock()` — FetchAdd(+1): 옛 값 0, flag 0 → 1."],
      ["T1", "check", "old == 0 → '''획득'''. T1 이 critical section 에 들어간다. flag = 1 (보유자 1명)."],
      ["T2", "try", "T2 도 lock 시도 — FetchAdd(+1): 옛 값 '''1''', flag 1 → 2."],
      ["T3", "try", "T3 도 — FetchAdd(+1): 옛 값 '''2''', flag 2 → 3. flag 는 0/1 이 아니라 '''보유자 + 시도 중인 수''' 를 센다."],
      ["T2", "check", "T2: old(1) ≠ 0 → 실패 → else 로."],
      ["T2", "back", "(c) 되돌리기: flag 3 → 2."],
      ["T1", "unlock", "T1 이 unlock: flag 2 → 1. '''아무도 락을 안 쥐었는데 flag 가 1''' — T3 의 +1 이 아직 남아 있어서다. 이 순간 새로 오는 스레드는 old = 1 을 보고 괜히 실패한다(성능 손해)."],
      ["T3", "check", "T3: old(2) ≠ 0 → 실패."],
      ["T3", "back", "(c) 되돌리기: flag 1 → 0. 이제 정말 아무도 없다."],
      ["T2", "try", "T2 가 `while (1)` 로 돌아와 재시도 — FetchAdd(+1): 옛 값 0, flag 0 → 1."],
      ["T2", "check", "old == 0 → '''T2 획득'''. 결론: flag 는 1 을 넘을 수 있지만 '''옛 값 0 을 받는 건 한 번에 한 명뿐''' 이라 mutual exclusion 은 유지된다. 다만 누가 다음에 잡을지 순서가 없어 '''공정하지 않다''' (ticket lock 과 대비)."]
    ],
    no_c: [
      ["T1", "try", "T1: 옛 값 0, flag 0 → 1."],
      ["T1", "check", "T1 획득."],
      ["T2", "try", "T2: 옛 값 1, flag 1 → 2."],
      ["T2", "check", "실패 — 그런데 (c) 가 없어서 '''+1 을 되돌리지 않고''' 바로 다시 시도한다."],
      ["T2", "try", "T2 재시도: 옛 값 2, flag 2 → 3."],
      ["T2", "check", "실패. flag 는 계속 쌓인다."],
      ["T1", "unlock", "T1 unlock: flag 3 → 2. 락은 비었는데 flag 는 2."],
      ["T2", "try", "T2 재시도: 옛 값 2, flag → 3."],
      ["T2", "check", "실패. 실패할 때마다 +1 이 남으니 flag 가 '''다시는 0 이 될 수 없다'''."],
      ["T2", "try", "옛 값 3, flag → 4 …"],
      ["T2", "check", "영원히 실패 — '''아무도 락을 못 잡는다'''. 그래서 (c) `FetchAdd(&lock->flag, -1)` 이 채점 포인트다."]
    ]
  };

  global.SIMS["p7_fetchadd"] = {
    title: "2025F P7 · ④-14 — FetchAdd lock 줄 단위 디버깅",
    desc: "flag 를 +1 해 보고 '''옛 값이 0''' 이면 획득, 아니면 −1 로 되돌리고 재시도. flag = 락 보유자(0/1) + 지금 시도 중인 스레드 수.",
    options: [
      {
        key: "variant",
        label: "코드",
        values: [
          { value: "v7", label: "교수 의도판 — ④-14 순서 (T1 → T2·T3 시도 → T2 획득)" },
          { value: "no_c", label: "(c) 되돌리기를 빼먹으면 — flag 가 쌓여 아무도 못 잡음" }
        ]
      }
    ],
    build: function (opts) { return run(opts.variant === "no_c"); }
  };

  function run(noC) {
    var flag = 0, holder = null;
    var th = {};
    ["T1", "T2", "T3"].forEach(function (t) { th[t] = { old: "?", state: "시작 전", pc: null }; });
    var steps = [], hist = [0];
    function snap() {
      var v = { flag: flag, holder: holder || "없음", hist: hist.join(" → ") };
      ["T1", "T2", "T3"].forEach(function (t) { v[t + ".old"] = th[t].old; v[t + ".state"] = th[t].state; });
      return v;
    }
    function svg() {
      var s = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 560 120" style="max-width:100%;font:12px sans-serif">';
      s += '<text x="10" y="22" font-weight="700">flag = ' + flag + '</text>';
      var parts = [];
      if (holder) parts.push({ label: holder + " (보유)", col: "#8fd18f" });
      ["T1", "T2", "T3"].forEach(function (t) { if (th[t].pending) parts.push({ label: t + " (+1 남음)", col: "#ffd27a" }); });
      if (noC) ["T1", "T2", "T3"].forEach(function (t) { for (var k = 0; k < (th[t].leak || 0); k++) parts.push({ label: t + " 누수", col: "#ff9a9a" }); });
      parts.forEach(function (p, i) {
        var x = 90 + i * 92;
        s += '<rect x="' + x + '" y="8" width="88" height="22" rx="4" fill="' + p.col + '" stroke="#555"/>';
        s += '<text x="' + (x + 44) + '" y="23" text-anchor="middle" font-size="11">' + p.label + '</text>';
      });
      if (!parts.length) s += '<text x="90" y="23" fill="#777">(비어 있음 — 다음 시도자는 옛 값 0 을 받는다)</text>';
      s += '<text x="10" y="56" fill="#555">flag 를 이루는 +1 들: 초록 = 락 보유자, 노랑 = 시도 중이라 아직 되돌리지 않은 +1' + (noC ? ', 빨강 = (c) 가 없어 영원히 남은 +1' : '') + '</text>';
      s += '<text x="10" y="80" fill="#555">flag 변화: ' + hist.join(" → ") + '</text>';
      s += '<text x="10" y="104" fill="' + (holder ? "#2a7a2a" : "#777") + '" font-weight="700">락 보유자: ' + (holder || "없음") + '</text>';
      return s + '</svg>';
    }
    function push(desc, pcShow, note) {
      var pc = {}, st = {};
      ["T1", "T2", "T3"].forEach(function (t) {
        pc[t] = th[t].pc;
        st[t] = th[t].state.indexOf("보유") >= 0 ? "running" : (th[t].state.indexOf("실패") >= 0 || th[t].state.indexOf("재시도") >= 0 ? "spinning" : (th[t].state === "끝" ? "done" : "ready"));
      });
      if (pcShow) for (var k in pcShow) pc[k] = pcShow[k];
      steps.push({ desc: desc, pc: pc, vars: snap(), status: st, note: note, svg: svg() });
    }

    push("초기 `flag = 0`. `FetchAdd(p, v)` 는 '''한 번에(atomic)''' `*p += v` 하고 '''옛 값''' 을 돌려준다. 9강 FetchAndAdd 는 +1 고정이지만 이 문제는 v 를 받는 2-인자 버전 — 문제에 준 시그니처를 따른다." +
      (noC ? " 이번 코드는 '''(c) 줄이 빠져 있다'''." : ""), {});

    SCHED[noC ? "no_c" : "v7"].forEach(function (e) {
      var t = e[0], act = e[1], memo = e[2], x = th[t], line, msg, note;
      if (act === "try") {
        line = 3; x.old = flag; flag += 1; hist.push(flag); x.pending = true;
        msg = "`FetchAdd(&flag, 1)` → 옛 값 " + x.old + ", flag " + (flag - 1) + " → " + flag;
        x.state = "시도 중 (old=" + x.old + ")";
      } else if (act === "check") {
        line = 4;
        if (x.old === 0) {
          holder = t; x.pending = false; x.state = "락 보유"; msg = "`old == 0` → 참 → '''획득'''"; line = 5;
        } else {
          msg = "`old == 0` → 거짓 (old = " + x.old + ")"; x.state = "실패";
          if (noC) { x.pending = false; x.leak = (x.leak || 0) + 1; x.state = "실패 → 바로 재시도"; line = 7; msg += " → (c) 없음, +1 이 남은 채 재시도"; }
        }
      } else if (act === "back") {
        line = 7; flag -= 1; hist.push(flag); x.pending = false; x.state = "되돌림 → 재시도 대기";
        msg = "`FetchAdd(&flag, -1)` → flag " + (flag + 1) + " → " + flag;
      } else if (act === "unlock") {
        line = 12; flag -= 1; hist.push(flag); holder = null; x.state = "끝";
        msg = "`unlock`: `FetchAdd(&flag, -1)` → flag " + (flag + 1) + " → " + flag;
      }
      x.pc = line;
      var ps = {}; ps[t] = line;
      if (noC && flag >= 3 && !holder) note = "flag 가 0 으로 돌아갈 길이 없다 — 실패한 시도마다 +1 이 쌓인다.";
      push("'''" + t + "''' " + line + "번 줄: " + msg + " — " + memo, ps, note);
    });

    return {
      panels: [
        { id: "T1", title: "T1", lang: "c", lines: code(noC) },
        { id: "T2", title: "T2", lang: "c", lines: code(noC) },
        { id: "T3", title: "T3", lang: "c", lines: code(noC) }
      ],
      vars: [
        { name: "flag", label: "lock->flag", group: "공유" },
        { name: "holder", label: "락 보유자", group: "공유" },
        { name: "hist", label: "flag 변화", group: "공유" },
        { name: "T1.old", label: "old", group: "T1" }, { name: "T1.state", label: "상태", group: "T1" },
        { name: "T2.old", label: "old", group: "T2" }, { name: "T2.state", label: "상태", group: "T2" },
        { name: "T3.old", label: "old", group: "T3" }, { name: "T3.state", label: "상태", group: "T3" }
      ],
      steps: steps
    };
  }
})(typeof window !== "undefined" ? window : globalThis);
