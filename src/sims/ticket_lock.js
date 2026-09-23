// ticket_lock — 9강 p.25~29 FetchAndAdd 기반 ticket lock (공정성)
(function (global) {
  "use strict";
  global.SIMS = global.SIMS || {};

  var FAA = [
    "/* 하드웨어 atomic 명령 */",
    "int FetchAndAdd(int *ptr) {",
    "    int old = *ptr;",
    "    *ptr = old + 1;",
    "    return old;      // 증가 '전' 값을 반환",
    "}"
  ];

  var TH = [
    "typedef struct __lock_t {",
    "    int ticket;  int turn;",
    "} lock_t;",
    "",
    "void lock(lock_t *lock) {",
    "    int myturn = FetchAndAdd(&lock->ticket);",
    "    while (lock->turn != myturn)",
    "        ;            // spin",
    "}",
    "",
    "/* ---- critical section ---- */",
    "",
    "void unlock(lock_t *lock) {",
    "    FetchAndAdd(&lock->turn);",
    "}"
  ];

  function svgFor(step) {
    var v = step.vars;
    var s = '<svg viewBox="0 0 470 210" width="470" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif" font-size="12">';
    // 번호표 발급기
    s += '<rect x="14" y="16" width="150" height="72" rx="8" fill="#eef4fb" stroke="#3a5480" stroke-width="2"/>';
    s += '<text x="89" y="36" text-anchor="middle" font-size="11" fill="#555">🎫 번호표 발급기</text>';
    s += '<text x="89" y="62" text-anchor="middle" font-size="18" font-weight="700">ticket = ' + v.ticket + "</text>";
    s += '<text x="89" y="80" text-anchor="middle" font-size="10" fill="#777">다음 손님이 뽑을 번호</text>';
    // 전광판
    s += '<rect x="196" y="16" width="150" height="72" rx="8" fill="#fff3bf" stroke="#d6a017" stroke-width="2"/>';
    s += '<text x="271" y="36" text-anchor="middle" font-size="11" fill="#555">📢 지금 호출 중</text>';
    s += '<text x="271" y="62" text-anchor="middle" font-size="18" font-weight="700">turn = ' + v.turn + "</text>";
    s += '<text x="271" y="80" text-anchor="middle" font-size="10" fill="#777">이 번호만 입장 가능</text>';
    // 손님들
    ["T1", "T2", "T3"].forEach(function (id, i) {
      var x = 20 + i * 150;
      var my = v[id + ".myturn"];
      var stt = v[id + ".state"] || "";
      var color = stt.indexOf("critical") >= 0 ? "#2f7a38" : (stt.indexOf("spin") >= 0 ? "#b32741" : "#888");
      s += '<rect x="' + x + '" y="118" width="130" height="66" rx="6" fill="#fff" stroke="' + color + '" stroke-width="2"/>';
      s += '<text x="' + (x + 65) + '" y="138" text-anchor="middle" font-weight="700">' + id + "</text>";
      s += '<text x="' + (x + 65) + '" y="156" text-anchor="middle" font-size="11">myturn = ' + (my === undefined ? "?" : my) + "</text>";
      s += '<text x="' + (x + 65) + '" y="174" text-anchor="middle" font-size="10" fill="' + color + '">' + (stt || "-") + "</text>";
    });
    s += "</svg>";
    return s;
  }

  global.SIMS["ticket_lock"] = {
    title: "ticket lock (fetch-and-add)",
    desc: "번호표(ticket)와 호출 번호(turn)로 만든 락. 도착 순서대로 들어가므로 fairness(FIFO)가 보장된다.",
    options: [],
    build: function () {
      var ids = ["T1", "T2", "T3"];
      var st = { ticket: 0, turn: 0 };
      ids.forEach(function (id) { st[id + ".myturn"] = "?"; st[id + ".state"] = "ready"; });

      var steps = [];
      function snap() {
        var o = { ticket: st.ticket, turn: st.turn };
        ids.forEach(function (id) {
          o[id + ".myturn"] = st[id + ".myturn"];
          o[id + ".state"] = st[id + ".state"];
        });
        return o;
      }
      function badge(s) {
        return s.indexOf("critical") >= 0 ? "running" : (s.indexOf("spin") >= 0 ? "spinning" : (s === "done" ? "done" : "ready"));
      }
      function push(desc, pc, note) {
        var full = { FAA: null };
        ids.forEach(function (id) {
          var s = st[id + ".state"];
          full[id] = s.indexOf("spin") >= 0 ? 8 : (s.indexOf("critical") >= 0 ? 11 : null);
        });
        for (var k in pc) full[k] = pc[k];
        var status = {};
        ids.forEach(function (id) { status[id] = badge(st[id + ".state"]); });
        steps.push({ desc: desc, pc: full, vars: snap(), status: status, note: note, svg: svgFor });
      }

      push("① `lock_init()` 직후: `ticket = 0`, `turn = 0`. " +
        "`ticket` 은 '''다음 사람이 뽑을 번호표''', `turn` 은 '''지금 들어갈 차례인 번호''' 다. " +
        "둘이 같으면 그 번호를 가진 스레드가 [[critical section]] 에 들어간다.");

      // T1
      push("② '''T1''' 이 `lock()` 6번 줄에서 `FetchAndAdd(&lock->ticket)` 호출. " +
        "FAA 는 '''증가 전 값을 반환'''하고 값을 1 늘린다 — 둘이 [[atomic]] 이라 두 스레드가 같은 번호를 뽑는 일이 없다.",
        { FAA: 3, T1: 6 });
      st["T1.myturn"] = 0; st.ticket = 1;
      push("'''T1'''의 `myturn = 0`, `ticket` 은 1 이 되었다. " +
        "7번 줄에서 `turn(0) != myturn(0)` 이 거짓 → spin 하지 않고 바로 통과.",
        { FAA: 5, T1: 7 });
      st["T1.state"] = "critical section";
      push("'''T1''' 이 [[critical section]] 에 진입. (슬라이드 ⑤ 'obtain the lock!')", { T1: 11 });

      // T2
      push("③ [[컨텍스트 스위치|context switch]] → '''T2''' 가 `lock()` 호출, FAA 실행.",
        { FAA: 3, T2: 6 });
      st["T2.myturn"] = 1; st.ticket = 2; st["T2.state"] = "spin";
      push("④ '''T2'''의 `myturn = 1`, `ticket = 2`. " +
        "`turn(0) != myturn(1)` 이 참이므로 8번 줄에서 '''spin''' 한다 — 자기 번호가 불릴 때까지 기다린다.",
        { FAA: 5, T2: 7 });

      // T3
      push("'''T3''' 도 `lock()` 을 호출해 FAA 실행.", { FAA: 3, T3: 6 });
      st["T3.myturn"] = 2; st.ticket = 3; st["T3.state"] = "spin";
      push("'''T3'''의 `myturn = 2`, `ticket = 3`. 역시 `turn(0) != 2` 이므로 spin. " +
        "이제 대기 순서가 '''번호표로 확정'''되었다: T2(1) → T3(2).",
        { FAA: 5, T3: 7 });

      // T1 unlock
      push("⑥ '''T1''' 이 `unlock()` 14번 줄에서 `FetchAndAdd(&lock->turn)` 호출.", { FAA: 3, T1: 14 });
      st.turn = 1; st["T1.state"] = "done";
      push("`turn` 이 0 → 1 이 된다. 전광판의 번호가 하나 올라간 셈.", { FAA: 5, T1: 14 });

      st["T2.state"] = "critical section";
      push("'''T2''' 의 spin 조건 `turn(1) != myturn(1)` 이 거짓이 되어 [[critical section]] 에 진입. " +
        "'''T3 는 여전히 spin''' — 자기 번호 2 가 아니기 때문이다. " +
        "여기서 [[test-and-set]] 락과의 차이가 드러난다: TAS 는 '''먼저 TAS 를 때린 놈''' 이 이기지만, " +
        "ticket lock 은 '''먼저 온 놈''' 이 이긴다.",
        { T2: 11 });

      st.turn = 2; st["T2.state"] = "done";
      push("'''T2''' 가 `unlock()` → `turn = 2`.", { FAA: 5, T2: 14 });
      st["T3.state"] = "critical section";
      push("'''T3''' 이 진입. 결과적으로 '''T1 → T2 → T3''', 즉 락을 요청한 순서(FIFO)대로 들어갔다. " +
        "이것이 ticket lock 의 '''[[fairness]] ✅''' 이고, 어떤 스레드도 굶지 않는다(no starvation).",
        { T3: 11 });
      st.turn = 3; st["T3.state"] = "done";
      push("'''T3''' 이 `unlock()` → `turn = 3 = ticket`. 대기자가 없다는 뜻. " +
        "평가: Correctness ✅ / Fairness ✅ / '''Performance ❌''' — 기다리는 스레드가 여전히 " +
        "[[spin lock|spin]] 하며 CPU 를 태운다. 이 마지막 문제를 OS 의 도움(yield, park/unpark)으로 고치는 것이 " +
        "[[yield 락]] 과 [[queue 락]] 이다.",
        { FAA: 5, T3: 14 },
        "시험 포인트: ticket lock 의 fairness 는 FetchAndAdd 가 '''번호를 중복 없이, 순서대로''' 나눠주기 때문에 생긴다.");

      var panels = [{ id: "FAA", title: "FetchAndAdd (하드웨어)", lang: "c", lines: FAA }];
      ids.forEach(function (id, i) {
        panels.push({ id: id, title: "Thread " + (i + 1), lang: "c", lines: TH });
      });
      var vars = [
        { name: "ticket", label: "lock->ticket", group: "공유 lock_t" },
        { name: "turn", label: "lock->turn", group: "공유 lock_t" }
      ];
      ids.forEach(function (id) {
        vars.push({ name: id + ".myturn", label: "myturn", group: id });
        vars.push({ name: id + ".state", label: "상태", group: id });
      });
      return { panels: panels, vars: vars, steps: steps };
    }
  };
})(typeof window !== "undefined" ? window : globalThis);
