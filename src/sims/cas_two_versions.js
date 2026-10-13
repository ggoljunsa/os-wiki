// cas_two_versions — 문제집 u8 ④-01 (g): 같은 CAS 스핀락인데 CAS 의 '반환값 규칙' 이 9강(옛 값) / 12강(성공 1·실패 0) 으로
// 다르면 while 조건이 뒤집힌다. 12강 CAS 에 9강 조건(== 1)을 그대로 쓰면 mutual exclusion 이 깨지는 것까지 보여 준다.
(function (global) {
  "use strict";
  global.SIMS = global.SIMS || {};

  var CAS9 = [
    "/* 9강 p.22 — '옛 값' 을 돌려준다 */",
    "int CAS(int *p, int expected, int new) {",
    "    int old = *p;",
    "    if (old == expected)",
    "        *p = new;",
    "    return old;      // 0 = 비어 있었음(성공)",
    "}                    // 1 = 이미 잡혀 있었음(실패)"
  ];
  var CAS12 = [
    "/* 12강 p.22 — '성공 여부' 를 돌려준다 */",
    "int CAS(int *p, int expected, int new) {",
    "    if (*p == expected) {",
    "        *p = new;",
    "        return 1;    // 1 = 성공",
    "    }",
    "    return 0;        // 0 = 실패",
    "}"
  ];
  function thCode(cond) {
    return [
      "lock(l):",
      "  while (CAS(&l->flag, 0, 1) " + cond + ")",
      "      ;            // spin",
      "  /* critical section */",
      "unlock(l):",
      "  l->flag = 0;"
    ];
  }

  global.SIMS["cas_two_versions"] = {
    title: "CAS 스핀락 — 반환값 규칙이 바뀌면 while 조건이 뒤집힌다 (문제집 ④-01 g)",
    desc: "flag: 0 = 비었음, 1 = 누가 쥠. CAS(&flag, 0, 1) 은 '비어 있으면 내가 잡는다' 를 한 번에 한다. while 은 '''실패했으면 다시''' 라는 뜻이어야 하므로, 조건에는 '''실패를 뜻하는 반환값'''을 쓴다 — 9강 CAS 는 실패 = 1, 12강 CAS 는 실패 = 0. [[compare-and-swap]] · [[spin lock]] · [[lock-free]]",
    options: [
      {
        key: "ver",
        label: "버전",
        values: [
          { value: "v9", label: "① 9강 CAS (옛 값 반환) + while (… == 1)  — 정답 (a)~(d)" },
          { value: "v12", label: "② 12강 CAS (1/0 반환) + while (… == 0)  — 정답 (g)" },
          { value: "wrong", label: "③ 함정: 12강 CAS 에 9강 조건 (… == 1) 을 그대로" }
        ]
      }
    ],
    build: function (opts) {
      var ver = opts.ver || "v9";
      var ret9 = ver === "v9";
      var cond = ver === "v12" ? "== 0" : "== 1";
      var failVal = ret9 ? 1 : 0;           // '실패' 를 뜻하는 반환값
      var st = { flag: 0, T1: "ready", T2: "ready", ret1: "-", ret2: "-", inCS: [] };
      var pc = { CAS: null, T1: null, T2: null };
      var steps = [];

      function snap() {
        return {
          flag: st.flag + (st.flag ? " (잡혀 있음)" : " (비었음)"),
          "T1.ret": st.ret1, "T2.ret": st.ret2,
          "T1": st.T1, "T2": st.T2,
          "CS 안": st.inCS.length ? st.inCS.join(", ") + (st.inCS.length > 1 ? "  ← 둘이 동시에!" : "") : "(없음)"
        };
      }
      function push(desc, note) {
        steps.push({
          desc: desc, pc: { CAS: pc.CAS, T1: pc.T1, T2: pc.T2 }, vars: snap(),
          status: { T1: st.T1, T2: st.T2 }, note: note || null
        });
      }
      // CAS 한 번 실행: 반환값과 while 판정까지 한 step
      function cas(t) {
        var before = st.flag, ok = before === 0, ret;
        if (ok) st.flag = 1;
        ret = ret9 ? before : (ok ? 1 : 0);
        if (t === "T1") st.ret1 = ret; else st.ret2 = ret;
        var loop = (cond === "== 1") ? (ret === 1) : (ret === 0);
        pc[t] = 2; pc.CAS = ret9 ? 6 : (ok ? 5 : 7);   // 반환하는 줄
        st[t] = "running";
        var other = t === "T1" ? "T2" : "T1"; if (st[other] === "running") st[other] = "ready";
        var what = "'''" + t + "''' — `CAS(&flag, 0, 1)`: flag 가 " + before + " → " +
          (ok ? "expected(0) 와 같으니 '''1 로 바꿈'''(내가 잡음)" : "expected(0) 와 달라서 '''안 바꿈'''(남이 쥐고 있음)") +
          ". 반환값 = '''" + ret + "''' (" + (ret9 ? "옛 값" : (ok ? "성공" : "실패")) + "). " +
          "while 조건 `" + ret + " " + cond + "` → '''" + (loop ? "참 → 다시 돈다(spin)" : "거짓 → while 탈출") + "'''.";
        return { loop: loop, ok: ok, what: what };
      }
      function enter(t, extra, note) {
        pc[t] = 4; pc.CAS = null;
        st.inCS.push(t); st[t] = "running";
        push("'''" + t + "''' 가 while 을 빠져나와 critical section 에 들어간다." + (extra || ""), note);
      }

      push("시작: flag = 0 (비었음). T1 이 먼저 lock() 을 부르고, T1 이 CS 에 있는 동안 T2 가 lock() 을 부른다. " +
        (ret9 ? "이 CAS 는 '''옛 값'''을 돌려준다: 0 이면 비어 있었으니 내가 잡은 것(성공), 1 이면 이미 잡혀 있었던 것(실패). 실패 = 1 → while 조건은 `== 1`."
              : "이 CAS 는 '''성공 1 / 실패 0'''을 돌려준다. " +
                (ver === "v12" ? "실패 = 0 → while 조건은 `== 0`." : "그런데 while 조건은 9강 것(`== 1`)을 그대로 썼다. `== 1` 은 이 CAS 에서 '''성공'''을 뜻한다 — 무슨 일이 생기는지 보라.")));

      // ---- T1 lock
      var r = cas("T1");
      push(r.what + (ver === "wrong" ? " — 잡는 데 '''성공'''했는데 조건이 참이라 다시 돈다. 방향이 거꾸로다." : ""));
      if (r.loop) {
        r = cas("T1");
        push(r.what + " — 두 번째 시도는 flag 가 이미 1(자기가 걸어 둔 것)이라 실패하고, '''실패해서''' while 을 빠져나온다. T1 은 우연히 락을 쥐고 있긴 하다.");
      }
      enter("T1");

      // ---- T2 lock while T1 in CS
      st.T1 = "ready";
      r = cas("T2");
      if (ver === "wrong") {
        push(r.what + " — T1 이 쥐고 있어 CAS 는 '''실패(0)''' 했는데, 조건 `0 == 1` 이 거짓이라 T2 가 '''while 을 빠져나온다'''.");
        enter("T2", "", "③ 함정의 결과: T1 이 아직 CS 안에 있는데 T2 도 들어갔다 — '''mutual exclusion 이 깨졌다'''. 12강 CAS 의 1 은 '성공' 인데 9강 조건 `== 1` 은 그걸 '실패' 로 읽었다. 반환값의 뜻이 반대이므로 조건도 `== 0` 으로 뒤집어야 한다(정답 g).");
        return { panels: panels(), vars: vars(), steps: steps };
      }
      st.T2 = "spinning";
      push(r.what + " — T2 는 T1 이 놓을 때까지 돈다.");
      r = cas("T2"); st.T2 = "spinning";
      push(r.what + " — 아직 1. 계속 spin (CPU 를 태운다 = performance 'No').");

      // ---- T1 unlock
      pc.T1 = 6; pc.CAS = null; st.inCS = []; st.flag = 0; st.T1 = "running"; if (st.T2 === "spinning") st.T2 = "ready";
      push("'''T1''' — `unlock`: `flag = 0`. 락을 쥔 스레드만 unlock 을 부르므로 평범한 대입으로 충분하다(정답 f).");
      st.T1 = "done";

      // ---- T2 acquires
      r = cas("T2");
      push(r.what + " — 이번엔 비어 있었으니 T2 가 잡았다.");
      enter("T2", "", "결과: 정상. 두 스레드가 한 번에 하나씩 CS 에 들어갔다. " +
        (ret9 ? "9강 CAS: 반환값 0 = 성공, 1 = 실패 → `while (CAS(...) == 1)`. 같은 락을 12강 CAS 로 쓰려면 드롭다운 ② 를 보라."
              : "12강 CAS: 반환값 1 = 성공, 0 = 실패 → `while (CAS(...) == 0)` (정답 g). 9강과 '''락의 동작은 같고 조건만 뒤집혔다'''."));

      return { panels: panels(), vars: vars(), steps: steps };

      function panels() {
        return [
          { id: "CAS", title: ret9 ? "CAS — 9강 버전" : "CAS — 12강 버전", lang: "c", lines: ret9 ? CAS9 : CAS12 },
          { id: "T1", title: "T1", lang: "c", lines: thCode(cond) },
          { id: "T2", title: "T2", lang: "c", lines: thCode(cond) }
        ];
      }
      function vars() {
        return [
          { name: "flag", label: "flag", group: "공유 메모리" },
          { name: "T1.ret", label: "T1 의 마지막 CAS 반환값", group: "CAS 반환값" },
          { name: "T2.ret", label: "T2 의 마지막 CAS 반환값", group: "CAS 반환값" },
          { name: "T1", label: "T1 상태", group: "스레드" },
          { name: "T2", label: "T2 상태", group: "스레드" },
          { name: "CS 안", label: "critical section 안에 있는 스레드", group: "스레드" }
        ];
      }
    }
  };
})(typeof window !== "undefined" ? window : globalThis);
