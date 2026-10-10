// lockfree_cas3 — 12강 p.22~24 AtomicIncrement 를 스레드 3개로: 문제집 u11 ③-08 의 스케줄을 한 줄씩.
// value=10, T1 +3 / T2 +4 / T3 +5. "read old" 와 "CAS" 가 분리된 두 단계라서, 읽은 뒤 남이 먼저 CAS 하면 내 CAS 는 실패하고 다시 읽는다.
(function (global) {
  "use strict";
  global.SIMS = global.SIMS || {};

  var CAS_HW = [
    "/* 12강 p.22 버전 — 성공 1 / 실패 0 을 반환 (9강은 '원래 값' 반환) */",
    "int CompareAndSwap(int *address, int expected, int new) {",
    "    if (*address == expected) {",
    "        *address = new;",
    "        return 1;   // success",
    "    }",
    "    return 0;       // failed: 그 사이 누가 바꿨다",
    "}"
  ];

  function thCode(amount) {
    return [
      "AtomicIncrement(&value, " + amount + ") {",
      "    do {",
      "        int old = *value;        // ① 읽기 (락 없음)",
      "    } while (CompareAndSwap(value, old, old + " + amount + ") == 0);  // ② 교체 시도",
      "}"
    ];
  }

  // 스케줄: 각 항목 = [스레드, "read" | "cas"]
  var SCHED_WORKBOOK = [
    ["T1", "read"], ["T2", "read"], ["T3", "read"],
    ["T2", "cas"], ["T1", "cas"], ["T3", "cas"],
    ["T3", "read"], ["T1", "read"],
    ["T1", "cas"], ["T3", "cas"],
    ["T3", "read"], ["T3", "cas"]
  ];
  var SCHED_SERIAL = [
    ["T1", "read"], ["T1", "cas"], ["T2", "read"], ["T2", "cas"], ["T3", "read"], ["T3", "cas"]
  ];

  global.SIMS["lockfree_cas3"] = {
    title: "lock-free AtomicIncrement — 스레드 3개, CAS 실패와 재시도",
    desc: "문제집 12강 ③-08: value=10 에 T1 +3, T2 +4, T3 +5. '읽기(old)' 와 'CAS' 사이에 남이 먼저 CAS 하면 내 CAS 는 실패(0) → 다시 읽는다. 갱신은 하나도 안 잃지만, 계속 밀리는 스레드([[starvation]])가 생길 수 있다.",
    options: [
      {
        key: "sched",
        label: "스케줄",
        values: [
          { value: "workbook", label: "문제집 ③-08 순서 (실패 3번, CAS 6회)" },
          { value: "serial", label: "비교: 끼어들기 없음 (실패 0번, CAS 3회)" }
        ]
      }
    ],
    build: function (opts) {
      return build(opts.sched === "serial" ? SCHED_SERIAL : SCHED_WORKBOOK);
    }
  };

  function build(sched) {
    var amount = { T1: 3, T2: 4, T3: 5 };
    var st = { value: 10, casCount: 0, casLog: "" };
    var th = {};
    ["T1", "T2", "T3"].forEach(function (t) {
      th[t] = { old: "?", ret: "?", state: "ready", tries: 0, done: false };
    });
    var steps = [];
    function snap() {
      var v = { value: st.value, casCount: st.casCount, casLog: st.casLog || "(없음)" };
      ["T1", "T2", "T3"].forEach(function (t) {
        v[t + ".old"] = th[t].old;
        v[t + ".ret"] = th[t].ret;
        v[t + ".tries"] = th[t].tries;
        v[t + ".state"] = th[t].state;
      });
      return v;
    }
    function badge(t) {
      var s = th[t].state;
      if (th[t].done) return "done";
      if (s === "ready") return "ready";
      if (s.indexOf("실패") >= 0) return "spinning";
      return "running";
    }
    function push(desc, pc, note) {
      var full = { CAS: null, T1: null, T2: null, T3: null };
      for (var k in pc) full[k] = pc[k];
      steps.push({
        desc: desc, pc: full, vars: snap(), note: note,
        status: { T1: badge("T1"), T2: badge("T2"), T3: badge("T3") },
        svg: timeline(steps.length)
      });
    }
    // 간단한 타임라인 그림: 지금까지의 이벤트를 스레드별 행에 찍는다
    var events = [];
    function timeline(idx) {
      var rows = ["T1", "T2", "T3"];
      var w = 40 + events.length * 46 + 20, h = 110;
      var s = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + Math.max(w, 420) + ' ' + h + '" style="max-width:100%;font:11px sans-serif">';
      rows.forEach(function (t, r) {
        var y = 20 + r * 30;
        s += '<text x="4" y="' + (y + 4) + '" font-weight="700">' + t + ' +' + amount[t] + '</text>';
        s += '<line x1="40" y1="' + y + '" x2="' + (w - 10) + '" y2="' + y + '" stroke="#ccc"/>';
      });
      events.forEach(function (e, i) {
        var r = rows.indexOf(e.t), x = 50 + i * 46, y = 20 + r * 30;
        var fill = e.kind === "read" ? "#e8f0fe" : (e.ok ? "#d9f2d9" : "#ffd9d9");
        var stroke = e.kind === "read" ? "#1d65b3" : (e.ok ? "#2a7a2a" : "#b33");
        s += '<rect x="' + (x - 18) + '" y="' + (y - 10) + '" width="38" height="20" rx="4" fill="' + fill + '" stroke="' + stroke + '"/>';
        s += '<text x="' + x + '" y="' + (y + 4) + '" text-anchor="middle">' + e.label + '</text>';
      });
      s += '<text x="4" y="' + (h - 4) + '" fill="#555">value: ' + st.value + ' · CAS 호출 ' + st.casCount + '회 (파랑 = read old, 초록 = CAS 성공, 빨강 = CAS 실패)</text>';
      s += '</svg>';
      return s;
    }

    push("초기 `value = 10`. 세 스레드가 각각 `AtomicIncrement` 를 호출한다 — T1 은 +3, T2 는 +4, T3 는 +5. " +
      "정답은 10+3+4+5 = '''22''' 여야 하고, 이 sim 은 '''락 없이''' 그 값을 어떻게 지키는지 보여준다. " +
      "핵심: 3번 줄 '''읽기''' 와 4번 줄 '''CAS''' 는 별개의 두 단계라, 그 '''사이''' 에 남이 끼어들 수 있다.");

    sched.forEach(function (ev) {
      var t = ev[0], pcs = {};
      // 다른 스레드의 pc 는 현재 위치 유지
      ["T1", "T2", "T3"].forEach(function (u) {
        if (th[u].done) pcs[u] = null;
        else if (th[u].state === "ready") pcs[u] = null;
        else if (th[u].state.indexOf("읽음") >= 0) pcs[u] = 3;
        else pcs[u] = 4;
      });
      if (ev[1] === "read") {
        th[t].old = st.value;
        th[t].state = "old=" + st.value + " 읽음, CAS 대기";
        pcs[t] = 3;
        events.push({ t: t, kind: "read", label: "old=" + st.value, ok: true });
        var retry = th[t].tries > 0;
        push("'''" + t + "''' 이 3번 줄에서 `old = *value` → '''" + st.value + "'''" +
          (retry ? " (재시도 — 방금 CAS 가 실패해 '''다시''' 읽는다)" : "") +
          ". 아직 아무것도 바꾸지 않았다. 이제 " + t + " 는 '`value` 가 " + st.value + " 이면 " + (st.value + amount[t]) + " 으로 바꿔라' 를 시도할 것이다.",
          pcs);
      } else {
        var expected = th[t].old, nw = expected + amount[t];
        var ok = (st.value === expected);
        th[t].tries += 1; st.casCount += 1;
        pcs[t] = 4;
        if (ok) {
          st.value = nw; th[t].ret = 1; th[t].done = true; th[t].state = "완료";
          st.casLog += (st.casLog ? " " : "") + t + ":1";
          events.push({ t: t, kind: "cas", label: expected + "→" + nw + " ✓", ok: true });
          push("'''" + t + "''' 의 `CompareAndSwap(value, " + expected + ", " + nw + ")`: `*value` 가 아직 " + expected + " 이므로 '''성공(1)''' → `value = " + nw + "`. " +
            t + " 은 while 조건 `== 0` 이 거짓이라 루프를 빠져나가 '''완료'''.",
            { CAS: 4, T1: pcs.T1, T2: pcs.T2, T3: pcs.T3 });
        } else {
          th[t].ret = 0; th[t].state = "CAS 실패 → 다시 읽어야";
          st.casLog += (st.casLog ? " " : "") + t + ":0";
          events.push({ t: t, kind: "cas", label: expected + "→" + nw + " ✗", ok: false });
          push("'''" + t + "''' 의 `CompareAndSwap(value, " + expected + ", " + nw + ")`: `*value` 는 지금 '''" + st.value + "''' ≠ " + expected + " → '''실패(0)''', 아무것도 쓰지 않는다. " +
            "while 조건 `== 0` 이 참이라 `do` 로 돌아가 3번 줄에서 '''다시 읽는다'''. " +
            t + " 이 읽은 " + expected + " 은 이미 '''낡은 값''' — 그 위에 덮어썼다면 다른 스레드의 증가분이 사라졌을 것이다.",
            { CAS: 7, T1: pcs.T1, T2: pcs.T2, T3: pcs.T3 },
            "실패한 CAS 는 '''store 자체를 하지 않는다'''. 이것이 [[counter 예제]]의 '갱신 손실' 을 락 없이 막는 장치다.");
        }
      }
    });

    var allDone = ["T1", "T2", "T3"].every(function (t) { return th[t].done; });
    if (allDone) {
      var fails = st.casCount - 3;
      push("끝. `value = " + st.value + "` (= 10+3+4+5, '''갱신 손실 없음'''). CAS 호출은 총 '''" + st.casCount + "회''' (성공 3 + 실패 " + fails + "). " +
        (fails > 0 ? "T3 처럼 읽을 때마다 남이 먼저 바꿔 버리면 계속 실패한다 — 데드락은 아니지만 '''[[starvation]] 가능''' (p.24 \"No deadlock can arise, starvation is possible\"). " : "끼어들기가 없으면 실패도 없다 — 실패 횟수는 '''스케줄''' 이 정한다. ") +
        "답안에 쓸 것: 각 CAS 의 반환값 순서, 최종값, CAS 횟수.",
        { T1: null, T2: null, T3: null });
    }

    return {
      panels: [
        { id: "CAS", title: "CompareAndSwap (하드웨어, 12강 p.22)", lang: "c", lines: CAS_HW },
        { id: "T1", title: "T1  AtomicIncrement(&value, 3)", lang: "c", lines: thCode(3) },
        { id: "T2", title: "T2  AtomicIncrement(&value, 4)", lang: "c", lines: thCode(4) },
        { id: "T3", title: "T3  AtomicIncrement(&value, 5)", lang: "c", lines: thCode(5) }
      ],
      vars: [
        { name: "value", label: "value (공유)", group: "메모리" },
        { name: "casCount", label: "CAS 호출 누계", group: "메모리" },
        { name: "casLog", label: "CAS 반환값 순서", group: "메모리" },
        { name: "T1.old", label: "old (읽어 둔 값)", group: "T1 (+3)" },
        { name: "T1.ret", label: "마지막 CAS 반환", group: "T1 (+3)" },
        { name: "T1.tries", label: "CAS 시도 횟수", group: "T1 (+3)" },
        { name: "T1.state", label: "상태", group: "T1 (+3)" },
        { name: "T2.old", label: "old (읽어 둔 값)", group: "T2 (+4)" },
        { name: "T2.ret", label: "마지막 CAS 반환", group: "T2 (+4)" },
        { name: "T2.tries", label: "CAS 시도 횟수", group: "T2 (+4)" },
        { name: "T2.state", label: "상태", group: "T2 (+4)" },
        { name: "T3.old", label: "old (읽어 둔 값)", group: "T3 (+5)" },
        { name: "T3.ret", label: "마지막 CAS 반환", group: "T3 (+5)" },
        { name: "T3.tries", label: "CAS 시도 횟수", group: "T3 (+5)" },
        { name: "T3.state", label: "상태", group: "T3 (+5)" }
      ],
      steps: steps
    };
  }
})(typeof window !== "undefined" ? window : globalThis);
