// queue_lock — 9강 p.33~38 park/unpark 큐 락, guard, wakeup/waiting race, setpark()
(function (global) {
  "use strict";
  global.SIMS = global.SIMS || {};

  // 시나리오에 따라 setpark() 줄이 있고 없고 → 줄 번호가 달라지므로 라벨로 관리
  function makeCode(hasSetpark) {
    var lines = [];
    var L = {};
    function add(label, src) { lines.push(src); if (label) L[label] = lines.length; }

    add(null, "typedef struct __lock_t {");
    add(null, "    int flag; int guard; queue_t *q;");
    add(null, "} lock_t;");
    add(null, "");
    add(null, "void lock(lock_t *m) {");
    add("l_guard", "    while (TestAndSet(&m->guard, 1) == 1)");
    add("l_spin", "        ;   // guard 를 spin 으로 획득");
    add("l_if", "    if (m->flag == 0) {");
    add("l_setflag", "        m->flag = 1;   // 락 획득!");
    add("l_g0a", "        m->guard = 0;  // guard 해제");
    add("l_else", "    } else {");
    add("l_qadd", "        queue_add(m->q, gettid());");
    if (hasSetpark) add("l_setpark", "        setpark();     // 곧 park 한다고 예고");
    add("l_g0b", "        m->guard = 0;  // guard 해제");
    add("l_park", "        park();        // 잠들기");
    add(null, "    }");
    add(null, "}");
    add(null, "");
    add(null, "void unlock(lock_t *m) {");
    add("u_guard", "    while (TestAndSet(&m->guard, 1) == 1)");
    add("u_spin", "        ;");
    add("u_if", "    if (queue_empty(m->q))");
    add("u_clear", "        m->flag = 0;   // 기다리는 놈 없음");
    add("u_else", "    else");
    add("u_unpark", "        unpark(queue_remove(m->q));  // 락을 넘겨줌");
    add("u_g0", "    m->guard = 0;");
    add(null, "}");

    return { lines: lines, L: L };
  }

  global.SIMS["queue_lock"] = {
    title: "queue 락 (park / unpark)",
    desc: "spin 대신 잠재우는 락. guard 로 lock/unlock 자체를 보호하고, 못 들어간 스레드는 큐에 넣고 park() 한다.",
    options: [
      {
        key: "scenario",
        label: "시나리오",
        values: [
          { value: "normal", label: "정상 동작" },
          { value: "wakeup_waiting_race", label: "wakeup/waiting race (영원히 잠듦)" },
          { value: "with_setpark", label: "setpark() 로 해결" }
        ]
      }
    ],
    build: function (opts) {
      var sc = opts.scenario || "normal";
      var hasSP = (sc === "with_setpark");
      var code = makeCode(hasSP);
      var L = code.L;

      var st = { guard: 0, flag: 0, q: [], A: "ready", B: "ready", parkToken: false };
      var steps = [];

      function snap() {
        return {
          guard: st.guard, flag: st.flag, q: st.q.slice(),
          "A.state": st.A, "B.state": st.B,
          "setpark_token": st.parkToken
        };
      }
      function badge(s) {
        if (s.indexOf("critical") >= 0) return "running";
        if (s.indexOf("spin") >= 0) return "spinning";
        if (s.indexOf("park") >= 0 || s.indexOf("잠") >= 0) return "parked";
        if (s === "done") return "done";
        return "ready";
      }
      function push(desc, pc, note) {
        steps.push({
          desc: desc,
          pc: { A: pc.A === undefined ? null : pc.A, B: pc.B === undefined ? null : pc.B },
          vars: snap(),
          status: { A: badge(st.A), B: badge(st.B) },
          note: note
        });
      }

      if (sc === "normal") {
        push("초기 상태: `flag = 0` (락 비어 있음), `guard = 0`, 대기 큐 `q` 는 비어 있다. " +
          "`guard` 는 '''lock()/unlock() 함수 자체''' 를 두 스레드가 동시에 실행하지 못하게 막는 " +
          "짧은 [[spin lock]] 이고, `flag` 가 '''진짜 락''' 이다.", {});

        st.guard = 1;
        push("'''A''' 가 `lock()` 호출 → `TestAndSet(&m->guard, 1)` 이 0 을 반환하여 guard 획득. `guard = 1`.",
          { A: L.l_guard });
        push("'''A''' 가 `m->flag == 0` 을 검사 → 참. 락이 비어 있다.", { A: L.l_if });
        st.flag = 1; st.A = "락 획득";
        push("'''A''' 가 `m->flag = 1` 로 락을 잡는다.", { A: L.l_setflag });
        st.guard = 0; st.A = "critical section";
        push("'''A''' 가 `m->guard = 0` 으로 guard 를 놓고 [[critical section]] 으로 들어간다. " +
          "guard 를 잡고 있던 구간은 몇 개 명령뿐이라 spin 비용이 작다.", { A: L.l_g0a });

        st.guard = 1;
        push("'''B''' 가 `lock()` 호출 → guard 를 [[test-and-set|TAS]] 로 획득. `guard = 1`.",
          { A: L.l_g0a, B: L.l_guard });
        push("'''B''' 가 `m->flag == 0` 검사 → `flag` 는 1 이므로 '''거짓''' → else 로 간다.",
          { B: L.l_if });
        st.q = ["B"];
        push("'''B''' 가 `queue_add(m->q, gettid())` 로 '''자기 tid 를 대기 큐에 넣는다'''.",
          { B: L.l_qadd });
        st.guard = 0;
        push("'''B''' 가 `m->guard = 0` 으로 guard 해제. (park 하기 전에 반드시 놓아야 한다 — " +
          "guard 를 쥔 채 자면 아무도 lock/unlock 을 못 한다.)", { B: L.l_g0b });
        st.B = "parked (잠듦)";
        push("'''B''' 가 `park()` 로 '''잠든다'''. spin 과 달리 CPU 를 전혀 쓰지 않는다 — " +
          "이것이 [[park와 unpark]] 를 쓰는 이유다.", { B: L.l_park });

        st.guard = 1;
        push("'''A''' 가 `unlock()` 호출 → guard 획득.", { A: L.u_guard });
        push("'''A''' 가 `queue_empty(m->q)` 검사 → 큐에 B 가 있으므로 '''거짓''' → else.",
          { A: L.u_if });
        st.q = []; st.B = "ready (깨어남)";
        push("'''A''' 가 `unpark(queue_remove(m->q))` 로 '''B 를 깨운다'''. " +
          "이때 '''`flag` 는 1 그대로''' 둔다 — 락을 0 으로 풀었다가 다시 잡게 하는 게 아니라 " +
          "'''B 에게 직접 넘겨주는(hand-off)''' 것이다.", { A: L.u_unpark },
          "시험 단골: unlock 인데 왜 flag 를 0 으로 안 만드나? → 큐에 대기자가 있으면 락 소유권을 그대로 넘기기 때문. 안 그러면 깨어난 B 가 또 경쟁해야 한다.");
        st.guard = 0; st.A = "done";
        push("'''A''' 가 `m->guard = 0` 으로 guard 해제하고 `unlock()` 을 마친다.", { A: L.u_g0 });

        st.B = "critical section";
        push("'''B''' 가 `park()` 에서 돌아와 `lock()` 을 빠져나온다. " +
          "`flag` 는 이미 1 이고 그 락의 주인이 B 다 → [[critical section]] 진입.", { B: L.l_park });
        st.guard = 1;
        push("'''B''' 가 `unlock()` 호출 → guard 획득.", { B: L.u_guard });
        st.flag = 0; st.guard = 0; st.B = "done";
        push("이번엔 `queue_empty(m->q)` 가 '''참''' → `m->flag = 0` 으로 락을 진짜로 푼다. " +
          "그리고 `guard = 0`. 처음 상태로 돌아왔다. " +
          "한계 1: guard 때문에 spin 이 '''완전히''' 사라지진 않는다(다만 아주 짧다). " +
          "한계 2: 다음 시나리오의 '''wakeup/waiting race'''.", { B: L.u_clear });
        return out();
      }

      // --- race / setpark: B 가 이미 락을 쥔 상태에서 시작 ---
      st.flag = 1; st.B = "critical section";
      push("시작 상태: '''B 가 이미 락을 쥐고''' [[critical section]] 안에 있다 (`flag = 1`). " +
        "`guard = 0`, 큐는 비어 있다. 이제 '''A''' 가 락을 잡으러 온다.", { B: L.l_g0a });

      st.guard = 1;
      push("'''A''' 가 `lock()` 호출 → `TestAndSet` 으로 guard 획득. `guard = 1`.", { A: L.l_guard, B: L.l_g0a });
      push("'''A''' 가 `m->flag == 0` 검사 → 거짓(`flag = 1`) → else 로 간다.", { A: L.l_if });
      st.q = ["A"];
      push("① '''A''' 가 `queue_add(m->q, gettid())` 로 자기를 대기 큐에 넣는다. `q = [A]`.", { A: L.l_qadd });

      if (hasSP) {
        st.A = "park 예고(setpark)";
        push("'''A''' 가 `setpark()` 를 호출한다 — '''나 곧 park 할 거야''' 라고 커널에 미리 알린다. " +
          "이후에 누가 `unpark(A)` 를 부르면 커널은 그 사실을 '''기억해 두었다가''', " +
          "A 의 `park()` 를 '''즉시 반환'''시킨다.", { A: L.l_setpark });
      }
      st.guard = 0;
      push("'''A''' 가 `m->guard = 0` 으로 guard 를 해제한다. " +
        "여기서부터 다른 스레드가 `lock()`/`unlock()` 에 들어올 수 있다.", { A: L.l_g0b });

      st.A = hasSP ? "park 직전 (인터럽트됨, 예고 완료)" : "park 직전 (인터럽트됨)";
      push("'''timer interrupt''' → [[컨텍스트 스위치|context switch]]. " +
        "A 는 `park()` 를 '''부르기 직전'''에 멈췄다. 큐에는 이름을 올렸지만 '''아직 자고 있지는 않다'''.",
        { A: L.l_park },
        hasSP
          ? "setpark() 를 이미 불러 두었으므로, 이 틈에 unpark 가 와도 안전하다."
          : "이 한 칸의 틈이 바로 '''wakeup/waiting race''' 다.");

      st.guard = 1;
      push("② '''B''' 가 `unlock()` 을 호출한다. guard 를 획득 (`guard = 1`).", { A: L.l_park, B: L.u_guard });
      push("'''B''' 가 `queue_empty(m->q)` 검사 → `q = [A]` 이므로 '''거짓''' → else.", { B: L.u_if });
      st.q = [];
      if (hasSP) {
        st.parkToken = true;
        push("③ '''B''' 가 `unpark(A)` 를 호출한다. A 는 아직 자고 있지 않지만, " +
          "`setpark()` 예고 덕분에 커널이 '''깨우라는 신호를 토큰으로 저장''' 해 둔다.",
          { B: L.u_unpark });
      } else {
        push("③ '''B''' 가 `unpark(A)` 를 호출한다. 그런데 '''A 는 아직 park() 를 부르지 않았다''' — " +
          "자고 있지 않은 스레드를 깨우는 것이므로 이 unpark 는 '''그냥 허공에 날아간다'''.",
          { B: L.u_unpark },
          "unpark 는 '지금 자고 있는 스레드' 만 깨울 수 있다. 미래의 park 를 막아 주지는 않는다.");
      }
      st.guard = 0; st.B = "done";
      push("'''B''' 가 `m->guard = 0` 으로 guard 해제 후 `unlock()` 종료. " +
        "참고로 `flag` 는 '''1 그대로''' — 락을 A 에게 넘겼다고 생각하고 있다.", { B: L.u_g0 });

      if (hasSP) {
        st.parkToken = false; st.A = "critical section";
        push("④ '''A''' 가 재개되어 `park()` 를 호출한다. 저장해 둔 토큰이 있으므로 " +
          "`park()` 는 '''잠들지 않고 즉시 반환'''한다. A 는 `lock()` 을 빠져나와 " +
          "[[critical section]] 에 진입한다. '''race 해결'''.", { A: L.l_park },
          "Solaris 의 해법. 세 번째 시스템 콜 [[setpark]] 하나로 '깨움이 먼저 오는' 경우를 흡수한다.");
        st.guard = 1;
        push("'''A''' 가 `unlock()` 을 호출해 guard 획득.", { A: L.u_guard });
        st.flag = 0; st.guard = 0; st.A = "done";
        push("큐가 비었으므로 `m->flag = 0`, `guard = 0`. 정상 종료. " +
          "[[futex]] 는 이 문제를 다른 방식으로 푼다 — `futex_wait(addr, val)` 이 " +
          "'''값이 아직 val 일 때만''' 잠들기 때문에, 그 사이 값이 바뀌었으면 애초에 안 잔다.",
          { A: L.u_clear });
      } else {
        st.A = "영원히 잠듦 (sleep forever)";
        push("④ '''A''' 가 재개되어 마침내 `park()` 를 호출하고 '''잠든다'''. " +
          "하지만 깨워 줄 unpark 는 이미 지나가 버렸고, 큐도 비어 있어서 " +
          "앞으로 `unlock()` 이 A 를 찾아낼 방법도 없다. " +
          "'''A 는 영원히 깨어나지 않는다.''' `flag` 는 1 로 남아 락도 영영 풀리지 않는다.",
          { A: L.l_park },
          "이것이 '''wakeup/waiting race'''(OSTEP 의 limitation 2). 해결책: Solaris 의 [[setpark]] 또는 Linux 의 [[futex]](futex_wait 가 값을 확인하고 잔다).");
      }
      return out();

      function out() {
        return {
          panels: [
            { id: "A", title: "Thread A", lang: "c", lines: code.lines },
            { id: "B", title: "Thread B", lang: "c", lines: code.lines }
          ],
          vars: [
            { name: "flag", label: "m->flag (진짜 락)", group: "공유 lock_t" },
            { name: "guard", label: "m->guard (함수 보호)", group: "공유 lock_t" },
            { name: "q", label: "m->q (대기 큐)", group: "공유 lock_t" },
            { name: "setpark_token", label: "setpark 토큰", group: "커널" },
            { name: "A.state", label: "상태", group: "Thread A" },
            { name: "B.state", label: "상태", group: "Thread B" }
          ],
          steps: steps
        };
      }
    }
  };
})(typeof window !== "undefined" ? window : globalThis);
