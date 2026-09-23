// test_and_set — 9강 p.19~21 TestAndSet(atomic exchange) 기반 spin lock
(function (global) {
  "use strict";
  global.SIMS = global.SIMS || {};

  var TAS_CODE = [
    "/* CPU 가 하드웨어로 제공, 통째로 atomic */",
    "int TestAndSet(int *ptr, int new) {",
    "    int old = *ptr;   // fetch old value",
    "    *ptr = new;       // store 'new'",
    "    return old;       // return old value",
    "}"
  ];

  var TH_CODE = [
    "void lock(lock_t *lock) {",
    "    while (TestAndSet(&lock->flag, 1) == 1)",
    "        ;             // spin-wait",
    "}",
    "",
    "/* ---- critical section ---- */",
    "    counter = counter + 1;",
    "",
    "void unlock(lock_t *lock) {",
    "    lock->flag = 0;",
    "}"
  ];

  function svgFor(step) {
    var v = step.vars;
    var holder = v.holder;
    var names = [];
    for (var k in v) { if (/^T\d\.ret$/.test(k)) names.push(k.split(".")[0]); }
    names.sort();

    var w = 120 + names.length * 110;
    var s = '<svg viewBox="0 0 ' + w + ' 170" width="' + w + '" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif" font-size="12">';
    // 락 박스
    s += '<rect x="20" y="20" width="' + (w - 40) + '" height="46" rx="6" fill="' +
      (v.flag ? "#ffe4ea" : "#e9f8ea") + '" stroke="' + (v.flag ? "#d6465f" : "#62b36a") + '" stroke-width="2"/>';
    s += '<text x="34" y="40" font-weight="700">lock-&gt;flag = ' + v.flag + "</text>";
    s += '<text x="34" y="58" fill="#555">' +
      (holder && holder !== "-" ? holder + " 가 critical section 안에 있음" : "락 비어 있음") + "</text>";

    names.forEach(function (n, i) {
      var x = 30 + i * 110;
      var stt = v[n + ".state"] || "";
      var color = stt.indexOf("critical") >= 0 ? "#62b36a" : (stt.indexOf("spin") >= 0 ? "#d6465f" : "#999");
      s += '<circle cx="' + (x + 30) + '" cy="105" r="22" fill="#fff" stroke="' + color + '" stroke-width="2.5"/>';
      s += '<text x="' + (x + 30) + '" y="110" text-anchor="middle" font-weight="700">' + n + "</text>";
      s += '<text x="' + (x + 30) + '" y="148" text-anchor="middle" fill="' + color + '" font-size="11">' +
        (stt || "-") + "</text>";
      if (stt.indexOf("spin") >= 0) {
        s += '<text x="' + (x + 30) + '" y="78" text-anchor="middle" fill="#d6465f" font-size="14">↻</text>';
      }
    });
    s += "</svg>";
    return s;
  }

  global.SIMS["test_and_set"] = {
    title: "test-and-set spin lock",
    desc: "TestAndSet 이 '이전 값 반환 + 새 값 저장' 을 atomic 하게 하기 때문에, 단 하나의 스레드만 0 을 돌려받아 락을 얻는다.",
    options: [
      {
        key: "threads",
        label: "스레드 수",
        values: [{ value: "2", label: "2개" }, { value: "3", label: "3개" }]
      }
    ],
    build: function (opts) {
      var n = parseInt(opts.threads, 10) || 2;
      var ids = [];
      for (var i = 1; i <= n; i++) ids.push("T" + i);

      var st = { flag: 0, holder: "-" };
      ids.forEach(function (id) { st[id + ".ret"] = "?"; st[id + ".state"] = "ready"; });

      var steps = [];
      function snap() {
        var o = { flag: st.flag, holder: st.holder };
        ids.forEach(function (id) { o[id + ".ret"] = st[id + ".ret"]; o[id + ".state"] = st[id + ".state"]; });
        return o;
      }
      function status() {
        var o = { TAS: st.tasBusy ? "running" : "ready" };
        ids.forEach(function (id) {
          var s = st[id + ".state"];
          o[id] = s.indexOf("critical") >= 0 ? "running" : (s.indexOf("spin") >= 0 ? "spinning" : (s === "done" ? "done" : "ready"));
        });
        return o;
      }
      function push(desc, pc, note) {
        var full = { TAS: null };
        ids.forEach(function (id) {
          var s = st[id + ".state"];
          full[id] = s.indexOf("spin") >= 0 ? 3 : (s.indexOf("critical") >= 0 ? 7 : null);
        });
        for (var k in pc) full[k] = pc[k];
        steps.push({ desc: desc, pc: full, vars: snap(), status: status(), note: note, svg: svgFor });
      }

      push("초기 상태: `lock->flag = 0` (락 비어 있음). " +
        "왼쪽 패널이 하드웨어가 제공하는 [[test-and-set|TestAndSet]] 의 의미이고, " +
        "오른쪽이 그것으로 만든 [[spin lock]] 이다. 핵심은 '''3번·4번 줄이 통째로 [[atomic]]''' 이라는 것.");

      // T1 획득
      st.tasBusy = true;
      push("'''T1''' 이 `lock()` 2번 줄에서 `TestAndSet(&flag, 1)` 을 호출한다. " +
        "하드웨어가 `old = *ptr` 로 현재 값 0 을 '''먼저 읽고''', 같은 명령 안에서 `*ptr = 1` 로 '''바꾼다'''. " +
        "중간에 [[컨텍스트 스위치|context switch]] 가 끼어들 틈이 없다.",
        { TAS: 3, T1: 2 });
      st.flag = 1; st["T1.ret"] = 0;
      push("TAS 가 `flag` 를 1 로 만들고 '''이전 값 0''' 을 반환한다. " +
        "`0 == 1` 이 거짓이므로 T1 은 while 을 빠져나간다 → '''T1 이 락을 획득'''.",
        { TAS: 5, T1: 2 });
      st.tasBusy = false; st.holder = "T1"; st["T1.state"] = "critical section";
      push("'''T1''' 이 [[critical section]] 에 진입한다.", { T1: 7 });

      // 나머지 스레드가 spin
      for (var j = 1; j < n; j++) {
        var id = ids[j];
        st.tasBusy = true;
        push("[[컨텍스트 스위치|context switch]] → '''" + id + "''' 이 `TestAndSet(&flag, 1)` 호출. " +
          "`flag` 는 이미 1 이므로 old = 1 을 읽고 다시 1 을 쓴다 (값은 그대로).",
          { TAS: 3, T1: 7 });
        st[id + ".ret"] = 1; st[id + ".state"] = "spin-wait";
        st.tasBusy = false;
        var pcSpin = { T1: 7 };
        pcSpin[id] = 3;
        push("'''" + id + "''' 은 반환값 1 을 받아 while 조건이 참 → 3번 줄에서 '''spin-wait'''. " +
          "락이 풀릴 때까지 CPU 를 태우며 같은 줄을 반복한다.",
          pcSpin,
          j === 1 ? "이 spin 이 [[spin lock]] 의 성능 문제다. 한 time slice 를 통째로 버릴 수도 있다 (Performance: No)." : undefined);
      }

      // T1 해제 → T2 획득 → ... 순서대로
      for (var k2 = 0; k2 < n - 1; k2++) {
        var cur = ids[k2], nxt = ids[k2 + 1];
        st.flag = 0; st.holder = "-"; st[cur + ".state"] = "done";
        var pcU = {}; pcU[cur] = 10;
        push("'''" + cur + "''' 이 `unlock()` 10번 줄에서 `flag = 0` 으로 락을 푼다. " +
          "unlock 은 그냥 store 라서 atomic 명령이 필요 없다.", pcU);

        st.tasBusy = true;
        var pcT = { TAS: 3 }; pcT[nxt] = 2;
        push("spin 중이던 '''" + nxt + "''' 의 다음 `TestAndSet` 이 이번에는 `old = 0` 을 읽는다.", pcT);
        st.flag = 1; st[nxt + ".ret"] = 0; st[nxt + ".state"] = "critical section"; st.holder = nxt;
        st.tasBusy = false;
        var pcC = {}; pcC[nxt] = 7;
        push("반환값 0 → while 탈출 → '''" + nxt + "''' 이 락을 획득하고 [[critical section]] 에 진입한다." +
          (n === 3 && k2 === 0 ? " 남은 스레드는 계속 spin 한다." : ""), pcC);
      }

      st.flag = 0; st.holder = "-"; st[ids[n - 1] + ".state"] = "done";
      var pcLast = {}; pcLast[ids[n - 1]] = 10;
      push("마지막 스레드가 `unlock()` 으로 `flag = 0`. 모든 스레드가 [[critical section]] 을 '''한 번에 하나씩''' 통과했다 — " +
        "[[mutual exclusion]] 은 '''지켜졌다(Correctness: Yes)'''. " +
        "그러나 '''누가 먼저 들어갈지는 보장이 없다([[fairness]]: No)''' — 운 나쁜 스레드는 영원히 spin 할 수도 있다. " +
        "이 불공정을 고친 것이 [[ticket lock]].", pcLast,
        "시험 포인트: spin lock 평가 = Correctness ✅ / Fairness ❌ / Performance ❌.");

      var panels = [{ id: "TAS", title: "TestAndSet (하드웨어)", lang: "c", lines: TAS_CODE }];
      ids.forEach(function (id, i) {
        panels.push({ id: id, title: "Thread " + (i + 1), lang: "c", lines: TH_CODE });
      });

      var vars = [{ name: "flag", label: "lock->flag", group: "공유 lock_t" },
                  { name: "holder", label: "락 보유자", group: "공유 lock_t" }];
      ids.forEach(function (id) {
        vars.push({ name: id + ".ret", label: "TAS 반환값", group: id });
        vars.push({ name: id + ".state", label: "상태", group: id });
      });

      return { panels: panels, vars: vars, steps: steps };
    }
  };
})(typeof window !== "undefined" ? window : globalThis);
