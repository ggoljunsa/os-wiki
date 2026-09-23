// cas_llsc — 9강 p.22~23 Compare-And-Swap, 그리고 OSTEP ch.28 의 Load-Linked / Store-Conditional
(function (global) {
  "use strict";
  global.SIMS = global.SIMS || {};

  var CAS_HW = [
    "/* CPU 가 통째로 atomic 하게 수행 */",
    "int CompareAndSwap(int *ptr, int expected, int new) {",
    "    int actual = *ptr;",
    "    if (actual == expected)",
    "        *ptr = new;",
    "    return actual;   // 항상 '원래 값' 을 반환",
    "}"
  ];

  var CAS_TH = [
    "void lock(lock_t *lock) {",
    "    while (CompareAndSwap(&lock->flag, 0, 1) == 1)",
    "        ;             // spin",
    "}",
    "",
    "/* ---- critical section ---- */",
    "",
    "void unlock(lock_t *lock) {",
    "    lock->flag = 0;",
    "}"
  ];

  var LL_HW = [
    "int LoadLinked(int *ptr) {",
    "    return *ptr;      // 이 주소를 '감시(link)' 하기 시작",
    "}",
    "",
    "int StoreConditional(int *ptr, int value) {",
    "    if (LL 이후 *ptr 에 아무도 store 하지 않았다면) {",
    "        *ptr = value;",
    "        return 1;     // success",
    "    } else {",
    "        return 0;     // failed to update",
    "    }",
    "}"
  ];

  var LL_TH = [
    "void lock(lock_t *lock) {",
    "    while (1) {",
    "        while (LoadLinked(&lock->flag) == 1)",
    "            ;         // 0 이 될 때까지 spin",
    "        if (StoreConditional(&lock->flag, 1) == 1)",
    "            return;   // SC 성공 → 락 획득",
    "        // 실패하면 처음부터 다시",
    "    }",
    "}",
    "void unlock(lock_t *lock) {",
    "    lock->flag = 0;",
    "}"
  ];

  global.SIMS["cas_llsc"] = {
    title: "compare-and-swap / load-linked·store-conditional",
    desc: "CAS 는 '기대값과 같을 때만 바꾼다', LL/SC 는 '내가 읽은 뒤 아무도 안 건드렸을 때만 쓴다'. 둘 다 atomic 명령으로 락을 만든다.",
    options: [
      {
        key: "impl",
        label: "구현",
        values: [
          { value: "cas", label: "CompareAndSwap" },
          { value: "llsc", label: "LL / SC (SC 실패 포함)" }
        ]
      }
    ],
    build: function (opts) {
      return opts.impl === "llsc" ? buildLLSC() : buildCAS();
    }
  };

  // ------------------------------------------------------------
  function buildCAS() {
    var st = { flag: 0, holder: "-", "T1.ret": "?", "T2.ret": "?", "T1.state": "ready", "T2.state": "ready" };
    var steps = [];
    function snap() {
      return {
        flag: st.flag, holder: st.holder,
        "T1.ret": st["T1.ret"], "T1.state": st["T1.state"],
        "T2.ret": st["T2.ret"], "T2.state": st["T2.state"]
      };
    }
    function push(desc, pc, note) {
      var full = { CAS: null, T1: null, T2: null };
      for (var k in pc) full[k] = pc[k];
      steps.push({
        desc: desc, pc: full, vars: snap(), note: note,
        status: { T1: badge(st["T1.state"]), T2: badge(st["T2.state"]) }
      });
    }
    function badge(s) {
      return s.indexOf("critical") >= 0 ? "running" : (s.indexOf("spin") >= 0 ? "spinning" : (s === "done" ? "done" : "ready"));
    }

    push("초기 상태 `flag = 0`. `CompareAndSwap(ptr, expected, new)` 는 " +
      "'''`*ptr` 이 `expected` 와 같을 때만''' `new` 를 쓰고, '''어느 경우든 원래 값을 반환'''한다. " +
      "락에서는 `CompareAndSwap(&flag, 0, 1)` — '비어 있으면(0) 내가 잡는다(1)' 라는 뜻.");

    push("'''T1''' 이 `lock()` 2번 줄에서 `CompareAndSwap(&flag, 0, 1)` 호출. " +
      "하드웨어가 `actual = *ptr = 0` 을 읽는다.", { CAS: 3, T1: 2 });
    st.flag = 1; st["T1.ret"] = 0;
    push("`actual(0) == expected(0)` 이므로 `*ptr = 1` 을 수행하고 '''원래 값 0''' 을 반환한다. " +
      "`0 == 1` 이 거짓 → T1 은 while 을 탈출, 락 획득.", { CAS: 5, T1: 2 });
    st.holder = "T1"; st["T1.state"] = "critical section";
    push("'''T1''' 이 [[critical section]] 에 진입.", { T1: 6 });

    push("[[컨텍스트 스위치|context switch]] → '''T2''' 가 같은 `CompareAndSwap(&flag, 0, 1)` 을 호출. " +
      "`actual = 1` 을 읽는다.", { CAS: 3, T1: 6, T2: 2 });
    st["T2.ret"] = 1; st["T2.state"] = "spin";
    push("`actual(1) != expected(0)` 이므로 '''store 를 하지 않고''' 1 을 반환한다. " +
      "`1 == 1` 이 참 → T2 는 3번 줄에서 spin. " +
      "[[test-and-set]] 과 동작이 사실상 같다 — 다만 CAS 는 '기대값' 을 지정할 수 있어 " +
      "lock-free 자료구조에도 쓸 수 있는 '''더 강력한''' 명령이다.",
      { CAS: 6, T1: 6, T2: 3 });

    st.flag = 0; st.holder = "-"; st["T1.state"] = "done";
    push("'''T1''' 이 `unlock()` 에서 `flag = 0`.", { T1: 9, T2: 3 });
    st.flag = 1; st["T2.ret"] = 0; st["T2.state"] = "critical section"; st.holder = "T2";
    push("'''T2''' 의 다음 CAS 가 `actual = 0` 을 보고 `*ptr = 1` 을 수행, 0 을 반환 → 락 획득. " +
      "spin lock 과 같은 평가: Correctness ✅ / [[fairness]] ❌ / Performance ❌.",
      { CAS: 5, T2: 2 });
    st.flag = 0; st.holder = "-"; st["T2.state"] = "done";
    push("'''T2''' 도 [[critical section]] 을 마치고 `unlock()`. `flag = 0` 으로 돌아왔다.", { T2: 9 });

    return {
      panels: [
        { id: "CAS", title: "CompareAndSwap (하드웨어)", lang: "c", lines: CAS_HW },
        { id: "T1", title: "Thread 1", lang: "c", lines: CAS_TH },
        { id: "T2", title: "Thread 2", lang: "c", lines: CAS_TH }
      ],
      vars: [
        { name: "flag", label: "lock->flag", group: "공유 lock_t" },
        { name: "holder", label: "락 보유자", group: "공유 lock_t" },
        { name: "T1.ret", label: "CAS 반환값", group: "Thread 1" },
        { name: "T1.state", label: "상태", group: "Thread 1" },
        { name: "T2.ret", label: "CAS 반환값", group: "Thread 2" },
        { name: "T2.state", label: "상태", group: "Thread 2" }
      ],
      steps: steps
    };
  }

  // ------------------------------------------------------------
  function buildLLSC() {
    var st = {
      flag: 0, watch: "없음",
      "T1.ll": "?", "T1.sc": "?", "T1.state": "ready",
      "T2.ll": "?", "T2.sc": "?", "T2.state": "ready"
    };
    var steps = [];
    function snap() {
      return {
        flag: st.flag, watch: st.watch,
        "T1.ll": st["T1.ll"], "T1.sc": st["T1.sc"], "T1.state": st["T1.state"],
        "T2.ll": st["T2.ll"], "T2.sc": st["T2.sc"], "T2.state": st["T2.state"]
      };
    }
    function badge(s) {
      return s.indexOf("critical") >= 0 ? "running" : (s.indexOf("spin") >= 0 ? "spinning" : (s === "done" ? "done" : "ready"));
    }
    function push(desc, pc, note) {
      var full = { HW: null, T1: null, T2: null };
      for (var k in pc) full[k] = pc[k];
      steps.push({
        desc: desc, pc: full, vars: snap(), note: note,
        status: { T1: badge(st["T1.state"]), T2: badge(st["T2.state"]) }
      });
    }

    push("초기 상태 `flag = 0`. LL/SC 는 두 명령이 '''짝''' 으로 동작한다 — " +
      "`LoadLinked` 가 주소를 읽으면서 '''감시(link)''' 를 걸고, " +
      "`StoreConditional` 은 '''그 사이 아무도 그 주소에 store 하지 않았을 때만''' 성공한다. " +
      "MIPS·ARM·[[RISC-V]] 계열이 쓰는 방식이다 (RISC-V 는 `lr.w` / `sc.w`).");

    st["T1.ll"] = 0; st.watch = "T1";
    push("'''T1''' 이 3번 줄에서 `LoadLinked(&flag)` → 0 을 읽고, `flag` 주소에 '''T1 의 감시''' 를 건다. " +
      "0 이므로 안쪽 while 을 빠져나가 5번 줄(SC)로 간다.", { HW: 2, T1: 3 });

    push("하필 여기서 '''timer interrupt''' → [[컨텍스트 스위치|context switch]]. " +
      "T1 은 LL 은 했지만 SC 는 '''아직''' 못 했다.", { T1: 5 },
      "flag 락에서 봤던 것과 '똑같이 위험한 틈' 이지만, LL/SC 는 이 틈을 '''하드웨어가 알아챈다'''는 점이 다르다.");

    st["T2.ll"] = 0; st.watch = "T2";
    push("'''T2''' 가 `LoadLinked(&flag)` → 역시 0 을 읽는다. 감시 주체가 '''T2 로 바뀐다'''.",
      { HW: 2, T1: 5, T2: 3 });
    st.flag = 1; st["T2.sc"] = 1; st["T2.state"] = "critical section"; st.watch = "T2(사용 완료)";
    push("'''T2''' 가 `StoreConditional(&flag, 1)` 호출 → LL 이후 아무도 store 하지 않았으므로 '''성공(1 반환)''', " +
      "`flag = 1`. T2 가 락을 획득하고 [[critical section]] 에 들어간다.", { HW: 8, T2: 5 });

    push("[[컨텍스트 스위치|context switch]] → '''T1''' 이 5번 줄부터 재개된다. " +
      "T1 은 '아까 0 을 읽었으니 이제 내가 1 을 쓰면 된다' 고 믿고 있다.", { T1: 5 });
    st["T1.sc"] = 0; st["T1.state"] = "spin (재시도)";
    push("'''T1''' 의 `StoreConditional(&flag, 1)` 이 '''실패(0 반환)''' 한다 — " +
      "T1 의 LL 이후 T2 가 그 주소에 store 했기 때문이다. `flag` 는 '''덮어써지지 않는다'''. " +
      "T1 은 2번 줄 `while(1)` 로 돌아가 처음부터 다시 시도한다. " +
      "이것이 [[flag 락]] 이 못 했던 일을 하드웨어가 대신 잡아주는 장면이다.",
      { HW: 10, T1: 5 },
      "SC 가 실패하면 '''store 자체가 일어나지 않는다'''. 그래서 두 스레드가 동시에 락을 잡는 일이 없다 — [[mutual exclusion]] 보장.");

    st["T1.ll"] = 1; st["T1.state"] = "spin";
    push("'''T1''' 이 다시 3번 줄 `LoadLinked` → 이번엔 1 을 읽으므로 " +
      "`flag` 가 0 이 될 때까지 안쪽 while 에서 spin 한다.", { HW: 2, T1: 3 });

    st.flag = 0; st.watch = "없음"; st["T2.state"] = "done";
    push("'''T2''' 가 `unlock()` 에서 `flag = 0`. (unlock 은 평범한 store)", { T1: 3, T2: 11 });
    st["T1.ll"] = 0; st.watch = "T1";
    push("'''T1''' 의 `LoadLinked` 가 0 을 읽고 다시 감시를 건다.", { HW: 2, T1: 3 });
    st.flag = 1; st["T1.sc"] = 1; st["T1.state"] = "critical section"; st.watch = "T1(사용 완료)";
    push("'''T1''' 의 `StoreConditional` 이 성공 → 락 획득, [[critical section]] 진입. " +
      "LL/SC 는 [[compare-and-swap]] 과 같은 일을 하지만, '값 비교' 가 아니라 " +
      "'''그 사이에 쓰기가 있었는가''' 로 판단한다는 점이 다르다.", { HW: 8, T1: 5 });

    return {
      panels: [
        { id: "HW", title: "LL / SC (하드웨어)", lang: "c", lines: LL_HW },
        { id: "T1", title: "Thread 1", lang: "c", lines: LL_TH },
        { id: "T2", title: "Thread 2", lang: "c", lines: LL_TH }
      ],
      vars: [
        { name: "flag", label: "lock->flag", group: "공유 lock_t" },
        { name: "watch", label: "현재 link(감시) 주체", group: "공유 lock_t" },
        { name: "T1.ll", label: "LL 이 읽은 값", group: "Thread 1" },
        { name: "T1.sc", label: "SC 결과 (1=성공)", group: "Thread 1" },
        { name: "T1.state", label: "상태", group: "Thread 1" },
        { name: "T2.ll", label: "LL 이 읽은 값", group: "Thread 2" },
        { name: "T2.sc", label: "SC 결과 (1=성공)", group: "Thread 2" },
        { name: "T2.state", label: "상태", group: "Thread 2" }
      ],
      steps: steps
    };
  }
})(typeof window !== "undefined" ? window : globalThis);
