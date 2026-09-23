// counter_race — 8강/9강 counter = counter + 1 의 race condition
// 슬라이드: 9-Lock p.7~8 (mov/add/mov, counter 기본값 50, 기대값 52)
(function (global) {
  "use strict";
  global.SIMS = global.SIMS || {};

  var ASM = [
    "mov 0x8049a1c, %eax",   // 1: counter 를 eax 로 load
    "add $0x1, %eax",        // 2: eax = eax + 1
    "mov %eax, 0x8049a1c"    // 3: eax 를 counter 로 store
  ];

  global.SIMS["counter_race"] = {
    title: "counter++ 경쟁 상태 (race condition)",
    desc: "두 스레드가 counter = counter + 1 을 실행할 때, context switch 시점에 따라 결과가 52 도 되고 51 도 된다.",
    options: [
      {
        key: "interrupt",
        label: "인터럽트 시점",
        values: [
          { value: "none", label: "없음 (정상, 52)" },
          { value: "after_load", label: "T1 load 직후 (망함, 51)" }
        ]
      }
    ],
    build: function (opts) {
      var steps = [];
      var st = { counter: 50, t1: "?", t2: "?" };

      function snap() {
        return { counter: st.counter, "T1.eax": st.t1, "T2.eax": st.t2 };
      }
      function push(desc, pc, status, note) {
        steps.push({ desc: desc, pc: pc, vars: snap(), status: status, note: note });
      }

      var running = { T1: "running", T2: "ready" };
      var runT2 = { T1: "ready", T2: "running" };

      push(
        "초기 상태. 전역 변수 `counter` 는 '''50''', 두 스레드는 아직 아무 명령도 실행하지 않았다. " +
        "`counter = counter + 1` 은 C 소스에서는 한 줄이지만 기계어로는 '''3개 명령'''(load / add / store)이고, " +
        "이 3개 사이에서 [[컨텍스트 스위치|context switch]]가 언제든 일어날 수 있다는 것이 문제의 핵심이다.",
        { T1: null, T2: null },
        { T1: "ready", T2: "ready" }
      );

      if (opts.interrupt === "none") {
        st.t1 = 50;
        push("'''T1''' 이 1번 줄을 실행: 메모리의 `counter`(50)를 `%eax` 로 load 한다. `T1.eax = 50`.",
          { T1: 1, T2: null }, running);
        st.t1 = 51;
        push("'''T1''' 이 2번 줄을 실행: `%eax` 에 1을 더한다. `T1.eax = 51`. 아직 메모리는 그대로 50 이다.",
          { T1: 2, T2: null }, running);
        st.counter = 51;
        push("'''T1''' 이 3번 줄을 실행: `%eax`(51)를 메모리 `counter` 에 store. 이제 `counter = 51`. " +
          "T1 의 [[critical section]] 통과가 '''중간에 끊기지 않고''' 끝났다.",
          { T1: 3, T2: null }, running);

        st.t2 = 51;
        push("여기서 [[컨텍스트 스위치|context switch]] 가 일어나 '''T2''' 가 실행된다. " +
          "T2 가 1번 줄에서 `counter`(51)를 load → `T2.eax = 51`.",
          { T1: null, T2: 1 }, runT2);
        st.t2 = 52;
        push("'''T2''' 가 2번 줄 실행: `T2.eax = 52`.", { T1: null, T2: 2 }, runT2);
        st.counter = 52;
        push("'''T2''' 가 3번 줄 실행: `counter = 52`. " +
          "두 스레드의 증가가 '''직렬화(serialize)''' 되었으므로 우리가 기대한 '''52''' 가 나왔다. " +
          "즉 이 결과는 운이 좋았을 뿐, [[atomic|원자성]]이 보장된 것은 아니다.",
          { T1: null, T2: 3 }, { T1: "done", T2: "done" });

      } else {
        st.t1 = 50;
        push("'''T1''' 이 1번 줄을 실행: `counter`(50)를 `%eax` 로 load. `T1.eax = 50`.",
          { T1: 1, T2: null }, running);

        push("여기서 '''timer interrupt''' 발생 → 커널로 [[트랩|trap]] → 스케줄러가 " +
          "[[컨텍스트 스위치|context switch]] 를 수행해 T2 로 전환한다. " +
          "T1 의 `%eax = 50` 은 T1 의 [[trapframe]]/레지스터 문맥에 저장되어 '''살아남는다'''. " +
          "바로 이 값이 나중에 사고를 친다.",
          { T1: 1, T2: null }, { T1: "ready", T2: "running" },
          "T1 은 load 는 했지만 store 는 아직 못 했다. 즉 메모리의 counter 는 여전히 50 인데 T1 은 '내가 읽은 값은 50' 이라고 기억한 채 멈췄다.");

        st.t2 = 50;
        push("'''T2''' 가 1번 줄 실행: 메모리의 `counter` 를 읽는데, T1 이 아직 store 를 못 했으므로 " +
          "'''똑같은 50''' 을 읽는다. `T2.eax = 50`.",
          { T1: null, T2: 1 }, runT2);
        st.t2 = 51;
        push("'''T2''' 가 2번 줄 실행: `T2.eax = 51`.", { T1: null, T2: 2 }, runT2);
        st.counter = 51;
        push("'''T2''' 가 3번 줄 실행: `counter = 51`. T2 입장에서는 정상적으로 1 증가시킨 것이다.",
          { T1: null, T2: 3 }, runT2);

        push("다시 [[컨텍스트 스위치|context switch]] 가 일어나 '''T1''' 이 재개된다. " +
          "T1 의 `%eax` 는 저장해 둔 '''50''' 으로 복원된다 — 그 사이 메모리가 51 로 바뀐 사실을 T1 은 모른다.",
          { T1: 2, T2: null }, { T1: "running", T2: "done" });
        st.t1 = 51;
        push("'''T1''' 이 2번 줄 실행: `T1.eax = 50 + 1 = 51`.", { T1: 2, T2: null },
          { T1: "running", T2: "done" });
        st.counter = 51;
        push("'''T1''' 이 3번 줄 실행: `counter = 51` 을 다시 덮어쓴다. " +
          "두 번 증가시켰는데 결과는 '''51''' — 증가 한 번이 '''사라졌다(lost update)'''. " +
          "이것이 [[race condition]] 이고, 원인은 `counter++` 가 [[atomic]] 하지 않기 때문이다. " +
          "해결책은 이 [[critical section]] 을 [[락|lock]] 으로 감싸 [[mutual exclusion]] 을 보장하는 것.",
          { T1: 3, T2: null }, { T1: "done", T2: "done" },
          "결과가 51 이냐 52 냐가 '''스케줄러의 기분'''에 달려 있다는 것 자체가 버그다. 재현이 어려워 디버깅이 지옥인 이유.");
      }

      return {
        panels: [
          { id: "T1", title: "Thread 1", lang: "asm", lines: ASM },
          { id: "T2", title: "Thread 2", lang: "asm", lines: ASM }
        ],
        vars: [
          { name: "counter", group: "메모리 (0x8049a1c)" },
          { name: "T1.eax", group: "Thread 1 레지스터" },
          { name: "T2.eax", group: "Thread 2 레지스터" }
        ],
        steps: steps
      };
    }
  };
})(typeof window !== "undefined" ? window : globalThis);
