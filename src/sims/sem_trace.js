// sem_trace — 11강 Semaphore 의 "Thread Trace" 표 세 장을 한 행씩 재현
// 원본: p.7 Two Threads Using A Semaphore (binary semaphore, 초기값 1, p.5 코드)
//       p.12 Parent Waiting For Child (Case 1: 부모가 먼저 sem_wait)
//       p.13 Parent Waiting For Child (Case 2: 자식이 먼저 sem_post)  — 코드는 p.11
// 세마포어 의미는 슬라이드 규약: sem_wait = 값 1 감소 후 음수면 잠듦, sem_post = 값 1 증가 후 대기자 하나 깨움.
(function (global) {
  "use strict";
  global.SIMS = global.SIMS || {};

  var LOCK_CODE = [
    "sem_t m;",
    "sem_init(&m, 0, 1); // X = 1 (p.5: what should X be?)",
    "",
    "sem_wait(&m);",
    "// critical section here",
    "sem_post(&m);"
  ];
  var CHILD_CODE = [
    "void *child(void *arg) {",
    "    printf(\"child\\n\");",
    "    sem_post(&s); // signal here: child is done",
    "    return NULL;",
    "}"
  ];
  var PARENT_CODE = [
    "sem_t s;",
    "int main(int argc, char *argv[]) {",
    "    sem_init(&s, 0, 0); // X = 0 (p.11: what should X be?)",
    "    printf(\"parent: begin\\n\");",
    "    pthread_t c;",
    "    pthread_create(&c, NULL, child, NULL);",
    "    sem_wait(&s); // wait here for child",
    "    printf(\"parent: end\\n\");",
    "    return 0;",
    "}"
  ];

  var COLOR = { Running: "#4caf50", Ready: "#e0a526", sleeping: "#6a6ad0" };

  // 행 = [value, 왼쪽 열 텍스트, 왼쪽 State, 오른쪽 열 텍스트, 오른쪽 State, 왼쪽 pc, 오른쪽 pc, desc, note, extra]
  // extra: { out: "출력 한 줄", waiters: [...] }
  var SEMRULE = " 슬라이드 규약: `sem_wait()` 는 값을 1 줄이고 '''음수면 잠든다''', `sem_post()` 는 값을 1 늘리고 잠든 스레드가 있으면 '''하나를 깨운다'''.";

  var TRACES = {
    two_threads: {
      ids: ["T0", "T1"], names: ["Thread 0", "Thread 1"], code: [LOCK_CODE, LOCK_CODE],
      init: [],
      rows: [
        [1, "", "Running", "", "Ready", 2, null,
          "p.7 '''두 스레드가 binary [[세마포어]]를 [[락]]처럼''' 쓴다(p.5 코드, `sem_init(&m, 0, 1)`). 초기값 1 = \"락이 비어 있음\". T0 가 Running, T1 은 Ready." + SEMRULE],
        [1, "call sem_wait()", "Running", "", "Ready", 4, null,
          "T0 가 `sem_wait(&m)` 를 호출한다."],
        [0, "sem_wait() returns", "Running", "", "Ready", 4, null,
          "값 1 → 0. 음수가 아니므로 잠들지 않고 '''곧바로 반환'''한다 — T0 가 락을 얻은 것과 같다."],
        [0, "(critical section: begin)", "Running", "", "Ready", 5, null,
          "T0 가 critical section 에 들어간다."],
        [0, "Interrupt; Switch → T1", "Ready", "", "Running", 5, null,
          "critical section 도중에 '''타이머 인터럽트''' → T1 으로 context switch. T0 는 아직 critical section 안(값 = 0)."],
        [0, "", "Ready", "call sem_wait()", "Running", 5, 4,
          "T1 이 `sem_wait(&m)` 를 호출한다."],
        [-1, "", "Ready", "decrement sem", "Running", 5, 4,
          "`sem_wait` 안에서 먼저 값을 줄인다: 0 → '''−1'''.",
          "음수 = 대기자 수 (Linux) — 값이 −1 이면 이 세마포어에서 잠든(잠들려는) 스레드가 1개라는 뜻이다."],
        [-1, "", "Ready", "(sem < 0) → sleep", "sleeping", 5, 4,
          "값이 음수이므로 T1 은 '''잠든다'''(sleeping). spin 하지 않고 CPU 를 내놓는다.", null, { waiters: ["T1"] }],
        [-1, "", "Running", "Switch → T0", "sleeping", 5, 4,
          "T1 이 잠들었으니 스케줄러가 T0 로 switch. T0 는 critical section 을 이어서 실행한다."],
        [-1, "(critical section: end)", "Running", "", "sleeping", 5, 4,
          "T0 가 critical section 을 마친다."],
        [-1, "call sem_post()", "Running", "", "sleeping", 6, 4,
          "T0 가 `sem_post(&m)` 를 호출한다 — 락 해제."],
        [0, "increment sem", "Running", "", "sleeping", 6, 4,
          "값을 1 늘린다: −1 → 0."],
        [0, "wake(T1)", "Running", "", "Ready", 6, 4,
          "잠든 스레드(T1)가 있으므로 '''하나를 깨운다''' → T1 은 Ready.",
          "sem_post는 값을 올리고 대기자가 있으면 하나 깨운다. T1은 깨어난 뒤 값을 다시 줄이지 않는다.", { waiters: [] }],
        [0, "sem_post() returns", "Running", "", "Ready", 6, 4,
          "`sem_post` 반환. T1 은 깨어났지만 아직 CPU 를 받지 못했다(Ready)."],
        [0, "Interrupt; Switch → T1", "Ready", "", "Running", 6, 4,
          "인터럽트 → T1 으로 switch."],
        [0, "", "Ready", "sem_wait() returns", "Running", 6, 4,
          "T1 이 잠들었던 `sem_wait` 에서 '''반환'''한다. 감소는 잠들기 전에 이미 했으므로 값은 0 그대로 — T1 이 락을 넘겨받았다."],
        [0, "", "Ready", "(critical section)", "Running", 6, 5,
          "T1 이 critical section 을 실행한다. T0 는 이미 빠져나왔으므로 mutual exclusion 이 지켜진다."],
        [0, "", "Ready", "call sem_post()", "Running", 6, 6,
          "T1 이 `sem_post(&m)` 를 호출한다."],
        [1, "", "Ready", "sem_post() returns", "Running", 6, 6,
          "값 0 → 1, 기다리는 스레드가 없으므로 아무도 깨우지 않고 반환. 세마포어가 '''초기값 1''' 로 돌아왔다 — 락이 다시 비었다.",
          "binary semaphore = 락: 초기값 1 이면 동시에 한 스레드만 sem_wait 를 통과한다. 값이 0 이면 \"잡혀 있음\", 음수면 \"잡혀 있고 |값| 명이 대기 중\"."]
      ]
    },
    join_case1: {
      ids: ["parent", "child"], names: ["Parent", "Child"], code: [PARENT_CODE, CHILD_CODE],
      init: ["parent: begin"],
      rows: [
        [0, "Create(Child)", "Running", "(Child exists; is runnable)", "Ready", 6, null,
          "p.11 코드: `sem_init(&s, 0, 0)` 으로 '''초기값 0''', 부모가 `parent: begin` 을 찍고 `pthread_create` 로 자식을 만든다. 자식은 runnable(Ready)이지만 아직 실행되지 않았다. p.12 '''Case 1''': 부모가 자식의 `sem_post()` 보다 '''먼저''' `sem_wait()` 를 부른다." + SEMRULE],
        [0, "call sem_wait()", "Running", "", "Ready", 7, null,
          "부모가 `sem_wait(&s)` 를 호출한다 — 자식이 끝나기를 기다리는 자리([[조건 변수]]의 wait 역할)."],
        [-1, "decrement sem", "Running", "", "Ready", 7, null,
          "값을 줄인다: 0 → '''−1'''."],
        [-1, "(sem < 0) → sleep", "sleeping", "", "Ready", 7, null,
          "값이 음수 → 부모가 '''잠든다'''.", null, { waiters: ["Parent"] }],
        [-1, "Switch → Child", "sleeping", "child runs", "Running", 7, 2,
          "부모가 잠들었으니 자식으로 switch. 자식이 `printf(\"child\")` 를 실행한다.", null, { out: "child" }],
        [-1, "", "sleeping", "call sem_post()", "Running", 7, 3,
          "자식이 `sem_post(&s)` 를 호출한다 — \"나 끝났어\" 신호."],
        [0, "", "sleeping", "increment sem", "Running", 7, 3,
          "값을 늘린다: −1 → 0."],
        [0, "", "Ready", "wake(Parent)", "Running", 7, 3,
          "잠든 부모가 있으므로 '''깨운다''' → 부모 Ready.", null, { waiters: [] }],
        [0, "", "Ready", "sem_post() returns", "Running", 7, 3,
          "`sem_post` 반환."],
        [0, "", "Ready", "Interrupt; Switch → Parent", "Ready", 7, 4,
          "인터럽트 → 부모로 switch."],
        [0, "sem_wait() returns", "Running", "", "Ready", 7, 4,
          "부모가 `sem_wait` 에서 반환한다. 값은 다시 줄이지 않으므로 0 — 부모는 자식이 끝났음을 확인하고 진행한다."],
        [0, "(표 이후) printf(\"parent: end\")", "Running", "", "Ready", 8, 4,
          "(p.12 표 다음 줄) 부모가 `parent: end` 를 출력한다. 출력 순서 `parent: begin → child → parent: end` 가 p.11 실행 결과와 같다.",
          "X = 0인 이유: 1이면 부모가 자식을 기다리지 않고 통과한다 — 초기값 1 이면 부모의 sem_wait 가 1 → 0 으로 곧바로 반환해 child 보다 parent: end 가 먼저 찍힐 수 있다.", { out: "parent: end" }]
      ]
    },
    join_case2: {
      ids: ["parent", "child"], names: ["Parent", "Child"], code: [PARENT_CODE, CHILD_CODE],
      init: ["parent: begin"],
      rows: [
        [0, "Create(Child)", "Running", "(Child exists; is runnable)", "Ready", 6, null,
          "p.11 코드, 초기값 0. 부모가 `parent: begin` 을 찍고 자식을 만든다. p.13 '''Case 2''': 부모가 `sem_wait()` 를 부르기 '''전에''' 자식이 끝까지 실행된다." + SEMRULE],
        [0, "Interrupt; switch → Child", "Ready", "child runs", "Running", 6, 2,
          "`sem_wait` 직전에 인터럽트 → 자식으로 switch. 자식이 `printf(\"child\")` 를 실행한다.", null, { out: "child" }],
        [0, "", "Ready", "call sem_post()", "Running", 6, 3,
          "자식이 `sem_post(&s)` 를 호출한다. 아직 아무도 기다리지 않는다."],
        [1, "", "Ready", "increment sem", "Running", 6, 3,
          "값을 늘린다: 0 → '''1'''."],
        [1, "", "Ready", "wake(nobody)", "Running", 6, 3,
          "잠든 스레드가 없으므로 아무도 깨우지 않는다. 그러나 신호가 사라지지는 않는다 — 값 1 로 남아 있다.",
          "post가 값을 1로 올려 '기억'된다 — CV의 signal이 유실되는 것(10강 p.14)과의 차이. [[조건 변수]]는 상태가 없어서 [[done flag 예제]]처럼 별도 변수가 필요했지만, 세마포어는 값 자체가 상태다."],
        [1, "", "Ready", "sem_post() returns", "Running", 6, 3,
          "`sem_post` 반환."],
        [1, "parent runs", "Running", "Interrupt; Switch → Parent", "Ready", 6, 4,
          "인터럽트 → 부모로 switch."],
        [1, "call sem_wait()", "Running", "", "Ready", 7, 4,
          "부모가 `sem_wait(&s)` 를 호출한다."],
        [0, "decrement sem", "Running", "", "Ready", 7, 4,
          "값을 줄인다: 1 → 0."],
        [0, "(sem < 0)? no → awake", "Running", "", "Ready", 7, 4,
          "음수가 아니므로 '''잠들지 않는다'''(awake). 자식이 남긴 post 를 소비했다."],
        [0, "sem_wait() returns", "Running", "", "Ready", 7, 4,
          "부모가 곧바로 `sem_wait` 에서 반환한다. Case 1 과 똑같이 최종 값은 0."],
        [0, "(표 이후) printf(\"parent: end\")", "Running", "", "Ready", 8, 4,
          "(p.13 표 다음 줄) 부모가 `parent: end` 를 출력한다. 어느 순서로 스케줄되든(Case 1·2) 출력은 `parent: begin → child → parent: end`.",
          "X = 0인 이유: 1이면 부모가 자식을 기다리지 않고 통과한다. 값 0 = \"아직 일어나지 않은 사건\" — 자식의 post 가 와야 1 이 되어 부모가 통과할 수 있다.", { out: "parent: end" }]
      ]
    }
  };

  global.SIMS["sem_trace"] = {
    title: "세마포어 Thread Trace (11강 p.7·p.12·p.13)",
    desc: "11강 슬라이드의 Thread Trace 표를 한 행씩 따라간다: binary [[세마포어]]를 [[락]]으로 쓰는 두 스레드, 그리고 세마포어로 부모가 자식을 기다리는 두 경우. Value 가 음수면 그 절댓값이 잠든 스레드 수다.",
    options: [
      {
        key: "trace", label: "Trace",
        values: [
          { value: "two_threads", label: "p.7 두 스레드 + binary semaphore (초기값 1)" },
          { value: "join_case1", label: "p.12 Parent waiting for child, Case 1 (부모가 먼저 sem_wait)" },
          { value: "join_case2", label: "p.13 Case 2 (자식이 먼저 sem_post)" }
        ]
      }
    ],
    build: function (opts) {
      var key = opts.trace || "two_threads";
      if (!TRACES[key]) key = "two_threads";
      var T = TRACES[key], A = T.ids[0], B = T.ids[1];
      var isJoin = key !== "two_threads";
      var out = T.init.slice(), waiters = [];
      var steps = [];

      function svg(value, sa, sb) {
        var W = 360, H = 120;
        var o = '<svg viewBox="0 0 ' + W + ' ' + H + '" width="100%" style="max-width:360px" font-family="sans-serif">';
        o += '<rect x="140" y="10" width="80" height="40" rx="5" fill="none" stroke="#4a8fd6" stroke-width="2"/>';
        o += '<text x="180" y="25" font-size="10" text-anchor="middle" fill="#9aa">sem value</text>';
        o += '<text x="180" y="43" font-size="16" text-anchor="middle" fill="' + (value < 0 ? "#d64545" : "#4a8fd6") + '">' + value + '</text>';
        [[T.names[0], sa], [T.names[1], sb]].forEach(function (p, idx) {
          var col = COLOR[p[1]] || "#888", x = 30 + idx * 180, y = 66;
          o += '<rect x="' + x + '" y="' + y + '" width="120" height="40" rx="5" fill="none" stroke="' + col + '" stroke-width="2"/>';
          o += '<text x="' + (x + 60) + '" y="' + (y + 17) + '" font-size="11" text-anchor="middle" fill="' + col + '">' + p[0] + '</text>';
          o += '<text x="' + (x + 60) + '" y="' + (y + 32) + '" font-size="10" text-anchor="middle" fill="' + col + '">' + p[1] + '</text>';
        });
        return o + '</svg>';
      }

      T.rows.forEach(function (r) {
        var extra = r[9] || {};
        if (extra.out) out.push(extra.out);
        if (extra.waiters) waiters = extra.waiters.slice();
        var v = { value: r[0], waiters: waiters.slice() };
        v[A + ".state"] = r[2];
        v[B + ".state"] = r[4];
        var cells = [];
        if (r[1]) cells.push(T.names[0] + ": " + r[1]);
        if (r[3]) cells.push(T.names[1] + ": " + r[3]);
        v.row = cells.length ? cells.join("  |  ") : "(초기 상태)";
        if (isJoin) v.output = out.slice();
        var pc = {}; pc[A] = r[5]; pc[B] = r[6];
        var st = {}; st[A] = r[2].toLowerCase(); st[B] = r[4].toLowerCase();
        var step = { desc: r[7], pc: pc, vars: v, status: st, svg: svg(r[0], r[2], r[4]) };
        if (r[8]) step.note = r[8];
        steps.push(step);
      });

      var panels = [
        { id: A, title: isJoin ? "Parent (main, p.11)" : "Thread 0 (p.5)", lang: "c", lines: T.code[0] },
        { id: B, title: isJoin ? "Child (p.11)" : "Thread 1 (p.5)", lang: "c", lines: T.code[1] }
      ];
      var vars = [
        { name: "value", label: isJoin ? "s (Value)" : "m (Value)", group: "세마포어" },
        { name: "waiters", label: "잠든 스레드", group: "세마포어" },
        { name: A + ".state", label: T.names[0], group: "스레드" },
        { name: B + ".state", label: T.names[1], group: "스레드" }
      ];
      if (isJoin) vars.push({ name: "output", label: "출력", group: "스레드" });
      vars.push({ name: "row", label: "슬라이드 표 행", group: "Thread Trace" });
      return { panels: panels, vars: vars, steps: steps };
    }
  };
})(typeof window !== "undefined" ? window : globalThis);
