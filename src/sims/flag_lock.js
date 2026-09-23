// flag_lock — 9강 p.16~18 "Why Hardware Support Needed?"
// load/store 만으로 만든 flag 락이 mutual exclusion 을 깨뜨리는 인터리빙 (슬라이드 ①~⑤)
(function (global) {
  "use strict";
  global.SIMS = global.SIMS || {};

  var CODE = [
    "void lock(lock_t *mutex) {",
    "    while (mutex->flag == 1)   // TEST",
    "        ;                      // spin-wait",
    "    mutex->flag = 1;           // now SET it!",
    "}",
    "",
    "/* ---- critical section ---- */",
    "    counter = counter + 1;",
    "",
    "void unlock(lock_t *mutex) {",
    "    mutex->flag = 0;",
    "}"
  ];

  global.SIMS["flag_lock"] = {
    title: "flag 락 — mutual exclusion 실패",
    desc: "TEST(while) 와 SET(flag=1) 이 atomic 하지 않아 두 스레드가 동시에 critical section 에 들어간다.",
    options: [
      {
        key: "scenario",
        label: "인터리빙",
        values: [
          { value: "broken", label: "TEST 직후 인터럽트 (둘 다 진입)" },
          { value: "lucky", label: "운 좋은 경우 (문제 없음)" }
        ]
      }
    ],
    build: function (opts) {
      var steps = [];
      var st = { flag: 0, in_cs: 0, T1: "시작 전", T2: "시작 전" };

      function snap() {
        return { flag: st.flag, in_cs: st.in_cs, "T1.state": st.T1, "T2.state": st.T2 };
      }
      function push(desc, pc, status, note) {
        steps.push({ desc: desc, pc: pc, vars: snap(), status: status, note: note });
      }

      push("초기 상태. `lock_init()` 이 `mutex->flag = 0` 으로 둔다 — 0 은 '''락이 비어 있음''', " +
        "1 은 '''누가 잡고 있음'''을 뜻한다. 두 스레드 모두 아직 `lock()` 을 부르지 않았다.",
        { T1: null, T2: null }, { T1: "ready", T2: "ready" });

      if (opts.scenario === "lucky") {
        st.T1 = "lock() TEST";
        push("'''T1''' 이 `lock()` 호출, 2번 줄에서 `flag == 1` 인지 TEST. `flag` 는 0 이므로 " +
          "spin 하지 않고 while 을 빠져나간다.",
          { T1: 2, T2: null }, { T1: "running", T2: "ready" });
        st.flag = 1; st.T1 = "락 획득";
        push("'''T1''' 이 4번 줄에서 `flag = 1` 로 SET. 이번에는 TEST 와 SET 사이에 인터럽트가 없었다.",
          { T1: 4, T2: null }, { T1: "running", T2: "ready" });
        st.in_cs = 1; st.T1 = "critical section";
        push("'''T1''' 이 [[critical section]] 에 진입해 `counter` 를 증가시킨다. `in_cs = 1`.",
          { T1: 8, T2: null }, { T1: "running", T2: "ready" });
        st.T2 = "lock() TEST (spin)";
        push("[[컨텍스트 스위치|context switch]] → '''T2''' 가 `lock()` 의 2번 줄에서 TEST. " +
          "`flag == 1` 이므로 3번 줄에서 '''spin-wait''' 한다 (CPU 를 태우며 대기).",
          { T1: null, T2: 3 }, { T1: "ready", T2: "spinning" });
        st.in_cs = 0; st.flag = 0; st.T1 = "unlock 완료";
        push("'''T1''' 이 재개되어 `unlock()` 의 11번 줄에서 `flag = 0`. 락이 풀렸다.",
          { T1: 11, T2: 3 }, { T1: "running", T2: "spinning" });
        st.flag = 1; st.T2 = "락 획득";
        push("'''T2''' 의 TEST 가 드디어 실패(=0)하여 while 을 빠져나오고 4번 줄에서 `flag = 1`. " +
          "'''이번 실행에서는''' mutual exclusion 이 지켜졌다 — 하지만 그건 운이었다. 다음 옵션을 보자.",
          { T1: null, T2: 4 }, { T1: "done", T2: "running" });
        st.in_cs = 1; st.T2 = "critical section";
        push("'''T2''' 가 [[critical section]] 진입. 어느 순간에도 `in_cs` 는 1 을 넘지 않았다.",
          { T1: null, T2: 8 }, { T1: "done", T2: "running" });
        return result(steps);
      }

      // --- broken (슬라이드 ①~⑤) ---
      st.T1 = "lock() TEST";
      push("① '''T1''' 이 `lock()` 을 호출하고 2번 줄에서 `mutex->flag == 1` 을 TEST 한다. " +
        "`flag` 는 0 이므로 spin 없이 while 을 통과한다. '''아직 flag 를 1 로 바꾸지는 않았다.'''",
        { T1: 2, T2: null }, { T1: "running", T2: "ready" });

      st.T1 = "TEST 통과, SET 직전";
      push("② 하필 여기서 '''timer interrupt''' → [[컨텍스트 스위치|context switch]]. " +
        "T1 은 4번 줄(`flag = 1`)을 '''실행하기 직전'''에 멈췄다. 메모리의 `flag` 는 여전히 0 이다.",
        { T1: 4, T2: null }, { T1: "ready", T2: "running" },
        "TEST 와 SET 사이의 이 틈이 버그의 전부다. 이 둘을 한 덩어리로 묶는 하드웨어 명령이 [[test-and-set]] 이다.");

      st.T2 = "lock() TEST";
      push("③ '''T2''' 가 `lock()` 을 호출해 2번 줄에서 TEST. `flag` 가 아직 0 이므로 " +
        "'''T2 도''' while 을 통과한다 — T2 는 '락이 비었다' 고 믿는다.",
        { T1: null, T2: 2 }, { T1: "ready", T2: "running" });

      st.flag = 1; st.T2 = "flag=1, 락 획득(이라 믿음)";
      push("④ '''T2''' 가 4번 줄 실행: `flag = 1`. T2 는 락을 획득했다고 생각한다.",
        { T1: null, T2: 4 }, { T1: "ready", T2: "running" });

      st.in_cs = 1; st.T2 = "critical section";
      push("'''T2''' 가 [[critical section]] 에 진입한다. `in_cs = 1`. 여기까지는 아무 문제 없어 보인다.",
        { T1: null, T2: 8 }, { T1: "ready", T2: "running" });

      st.T1 = "재개 (SET 부터)";
      push("다시 [[컨텍스트 스위치|context switch]] → '''T1''' 이 아까 멈춘 '''4번 줄부터''' 재개된다. " +
        "T1 은 자기가 TEST 했던 시점(flag==0)의 판단을 그대로 들고 있다.",
        { T1: 4, T2: 8 }, { T1: "running", T2: "ready" });

      st.flag = 1; st.T1 = "flag=1 (덮어씀)";
      push("⑤ '''T1''' 이 `flag = 1` 을 실행한다 — 이미 1 이던 값을 '''한 번 더''' 1 로 쓸 뿐이라 " +
        "아무도 이상함을 눈치채지 못한다.",
        { T1: 4, T2: 8 }, { T1: "running", T2: "ready" });

      st.in_cs = 2; st.T1 = "critical section";
      push("'''T1 도''' [[critical section]] 에 진입한다. `in_cs = 2` — " +
        "'''두 스레드가 동시에 critical section 안에 있다.''' [[mutual exclusion]] 이 깨졌다. " +
        "원인은 `lock()` 안의 TEST(2번 줄) 와 SET(4번 줄) 이 [[atomic]] 하지 않기 때문이고, " +
        "해결은 하드웨어의 [[test-and-set]] / [[compare-and-swap]] 같은 atomic 명령이다.",
        { T1: 8, T2: 8 }, { T1: "running", T2: "ready" },
        "Two threads obtain locks! — 슬라이드 p.18 의 결론. 게다가 이 flag 락은 spin-wait 로 시간까지 낭비한다(Problem 2).");

      return result(steps);

      function result(steps) {
        return {
          panels: [
            { id: "T1", title: "Thread 1", lang: "c", lines: CODE },
            { id: "T2", title: "Thread 2", lang: "c", lines: CODE }
          ],
          vars: [
            { name: "flag", group: "lock_t (공유 메모리)" },
            { name: "in_cs", label: "in_cs (CS 안 스레드 수)", group: "lock_t (공유 메모리)" },
            { name: "T1.state", group: "Thread 1" },
            { name: "T2.state", group: "Thread 2" }
          ],
          steps: steps
        };
      }
    }
  };
})(typeof window !== "undefined" ? window : globalThis);
