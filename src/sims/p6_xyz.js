// p6_xyz — 2025F Problem 6 (x/y/z 세마포어 producer/consumer 빈칸) 과 문제집 u12 ④-12 변형을 줄 단위로.
// x = 빈 칸 수(empty, 초기 MAX), y = 찬 칸 수(full, 초기 0), z = mutex(초기 1). MAX = 3.
// 옵션: correct(④-12 a·b: 4번째 put 에서 x=−1 로 잠듦 → consumer 하나가 깨움) / swapped(④-12 c: (a)(b) 순서를 바꿔 데드락)
(function (global) {
  "use strict";
  global.SIMS = global.SIMS || {};
  var MAX = 3;

  function prodCode(swapped) {
    return [
      "void *producer(void *arg) {",
      "  for (i = 0; i < loops; i++) {",
      swapped ? "    sem_wait(&z);   // (b) ✗ mutex 를 먼저" : "    sem_wait(&x);   // (a) 빈 칸 하나 확보",
      swapped ? "    sem_wait(&x);   // (a) ✗ 그다음 빈 칸" : "    sem_wait(&z);   // (b) mutex",
      "    put(i);",
      "    sem_post(&z);   // (c) mutex 반납",
      "    sem_post(&y);   // (d) 찬 칸 +1",
      "  }",
      "}"
    ];
  }
  var CONS = [
    "void *consumer(void *arg) {",
    "  for (i = 0; i < loops; i++) {",
    "    sem_wait(&y);   // (e) 찬 칸 하나 확보",
    "    sem_wait(&z);   // (f) mutex",
    "    int tmp = get();",
    "    sem_post(&z);   // (g) mutex 반납",
    "    sem_post(&x);   // (h) 빈 칸 +1",
    "    printf(\"%d\\n\", tmp);",
    "  }",
    "}"
  ];

  function rep(t, n, memoAt) {
    var out = [];
    for (var k = 0; k < n; k++) out.push([t, memoAt && memoAt[k] ? memoAt[k] : ""]);
    return out;
  }

  var SCHED = {
    correct: [].concat(
      rep("P", 5, { 0: "x(빈 칸)를 하나 '''예약'''한다 3 → 2.", 4: "item 0 생산 완료: (x, y, z) = (2, 1, 1). '''x + y = 3 = MAX''' 가 유지되는지가 자가 검산." }),
      rep("P", 5, { 4: "item 1 완료: (1, 2, 1)." }),
      rep("P", 5, { 4: "item 2 완료: (0, 3, 1). 버퍼가 '''가득''' 찼다." }),
      [["P", "④-12 (a): 4번째 item 의 `sem_wait(&x)` — x 0 → '''−1''' → producer '''잠듦'''. 이때 (x, y, z) = '''(−1, 3, 1)'''. −1 = '빈 칸 0 + 기다리는 사람 1명'. 중요: z 를 '''잡기 전''' 에 잠들었으므로 mutex 는 자유(1)다."]],
      rep("C", 6, {
        0: "consumer 가 찬 칸 하나 예약: y 3 → 2.",
        1: "mutex 획득 — producer 가 z 를 안 쥐고 잤으니 '''막히지 않는다'''.",
        4: "④-12 (b): 빈 칸이 생겼다 → x −1 → 0, '''producer 깨움'''. 이 시점 (x, y, z) = '''(0, 2, 1)'''.",
        5: "consumer 출력."
      }),
      rep("P", 4, { 3: "④-12 (b) 마지막: producer 가 item 3 을 넣고 끝 → (x, y, z) = '''(0, 3, 1)'''." })
    ),
    swapped: [].concat(
      rep("P", 5, { 0: "producer 가 (a)(b) 순서를 '''바꿨다''': mutex z 를 먼저 잡는다.", 4: "item 0 완료 — 버퍼에 자리가 있으면 순서가 바뀌어도 문제없다." }),
      rep("P", 5), rep("P", 5, { 4: "item 2 완료: 버퍼 가득 (x = 0)." }),
      [["P", "4번째 item: z 를 먼저 잡는다 (1 → 0). 버퍼가 가득 찼는지는 아직 안 봤다."]],
      [["P", "`sem_wait(&x)` — 빈 칸이 없다 → x '''−1''' → producer '''잠듦'''. 그런데 '''z(mutex)를 쥔 채로''' 잠들었다."]],
      [["C", "consumer: 찬 칸 예약 y 3 → 2 — 여기까지는 된다."]],
      [["C", "④-12 (c): `sem_wait(&z)` — z 는 producer 가 쥐고 있다 → z '''−1''' → consumer '''잠듦'''. producer 는 consumer 가 x 를 post 해 주길, consumer 는 producer 가 z 를 post 해 주길 기다린다 → '''DEADLOCK'''."]]
    )
  };

  global.SIMS["p6_xyz"] = {
    title: "2025F P6 · ④-12 — x / y / z 세마포어 producer-consumer (MAX = 3)",
    desc: "x = 빈 칸(empty, MAX), y = 찬 칸(full, 0), z = mutex(1). 자원 세마포어(x 또는 y)를 '''먼저''', mutex z 를 '''나중에''' 기다려야 한다. 순서를 바꾸면 mutex 를 쥔 채 잠들어 데드락(L11 Third Attempt).",
    options: [
      {
        key: "order",
        label: "producer 코드",
        values: [
          { value: "correct", label: "정답 (a) wait x → (b) wait z — ④-12 (a)(b)" },
          { value: "swapped", label: "(a)(b) 순서 바꿈: wait z → wait x — ④-12 (c) 데드락" }
        ]
      }
    ],
    build: function (opts) { return run(opts.order === "swapped"); }
  };

  function run(swapped) {
    var sem = { x: { v: MAX, q: [] }, y: { v: 0, q: [] }, z: { v: 1, q: [] } };
    var buf = [null, null, null], fill = 0, use = 0, item = 0, out = [];
    var th = { P: { pc: null, state: "ready", holdsZ: false }, C: { pc: null, state: "ready", holdsZ: false } };
    var steps = [];
    var names = { P: "producer", C: "consumer" };

    function snap() {
      return {
        x: sem.x.v, y: sem.y.v, z: sem.z.v,
        xq: sem.x.q.map(function (t) { return names[t]; }).join(", ") || "(없음)",
        yq: sem.y.q.map(function (t) { return names[t]; }).join(", ") || "(없음)",
        zq: sem.z.q.map(function (t) { return names[t]; }).join(", ") || "(없음)",
        buffer: "[" + buf.map(function (b) { return b === null ? "_" : b; }).join(" | ") + "]",
        fill: fill, use: use, zowner: th.P.holdsZ ? "producer" : (th.C.holdsZ ? "consumer" : "없음"),
        printed: out.join(", ") || "-",
        P: stateOf("P"), C: stateOf("C")
      };
    }
    function stateOf(t) {
      var x = th[t];
      if (x.pc === null) return "시작 전";
      if (x.state === "sleep") return "잠듦 (" + x.on + " 에서)" + (x.holdsZ ? " — z 를 쥔 채!" : "");
      return "진행 중 (줄 " + x.pc + ")" + (x.holdsZ ? " · z 보유" : "");
    }
    function svg() {
      var s = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 560 170" style="max-width:100%;font:12px sans-serif">';
      s += '<text x="200" y="20" font-weight="700">버퍼 (MAX = 3)</text>';
      for (var i = 0; i < MAX; i++) {
        var x = 200 + i * 56;
        s += '<rect x="' + x + '" y="30" width="50" height="40" rx="4" fill="' + (buf[i] === null ? "#f4f4f4" : "#cfe8ff") + '" stroke="#1d65b3"/>';
        s += '<text x="' + (x + 25) + '" y="56" text-anchor="middle" font-weight="700">' + (buf[i] === null ? "" : "item " + buf[i]) + '</text>';
        if (i === fill) s += '<text x="' + (x + 25) + '" y="86" text-anchor="middle" fill="#1d65b3" font-size="11">▲fill</text>';
        if (i === use) s += '<text x="' + (x + 25) + '" y="100" text-anchor="middle" fill="#2a7a2a" font-size="11">▲use</text>';
      }
      function semBox(name, label, x, y) {
        var S = sem[name], neg = S.v < 0;
        var o = '<rect x="' + x + '" y="' + y + '" width="160" height="44" rx="5" fill="' + (neg ? "#ffe3e3" : "#f7f7fa") + '" stroke="' + (neg ? "#b33" : "#999") + '"/>';
        o += '<text x="' + (x + 8) + '" y="' + (y + 17) + '" font-weight="700">' + name + ' = ' + S.v + '</text>';
        o += '<text x="' + (x + 60) + '" y="' + (y + 17) + '" fill="#555" font-size="11">' + label + '</text>';
        o += '<text x="' + (x + 8) + '" y="' + (y + 35) + '" font-size="11" fill="' + (S.q.length ? "#b33" : "#777") + '">잠든: ' + (S.q.map(function (t) { return names[t]; }).join(", ") || "-") + '</text>';
        return o;
      }
      s += semBox("x", "빈 칸 (empty)", 10, 110);
      s += semBox("y", "찬 칸 (full)", 200, 110);
      s += semBox("z", "mutex", 390, 110);
      var zo = th.P.holdsZ ? "producer" : (th.C.holdsZ ? "consumer" : null);
      if (zo) s += '<text x="400" y="104" font-size="11" fill="#b35c00">z 보유: ' + zo + '</text>';
      s += '<text x="10" y="40" font-size="11" fill="#555">검산: x + y = ' + (Math.max(sem.x.v, 0) + Math.max(sem.y.v, 0)) + '</text>';
      s += '<text x="10" y="56" font-size="11" fill="#555">(진행 중 연산 제외 MAX)</text>';
      return s + '</svg>';
    }
    function push(desc, pcShow, note) {
      var pc = { P: th.P.state === "sleep" || th.P.pc === null ? th.P.pc : th.P.pc, C: th.C.pc };
      if (pcShow) for (var k in pcShow) pc[k] = pcShow[k];
      var st = {};
      ["P", "C"].forEach(function (t) { st[t] = th[t].state === "sleep" ? "sleeping" : (th[t].pc === null ? "ready" : "running"); });
      steps.push({ desc: desc, pc: { producer: pc.P, consumer: pc.C }, vars: snap(), status: { producer: st.P, consumer: st.C }, note: note, svg: svg() });
    }
    function wait(t, name) {
      var S = sem[name], b = S.v;
      S.v -= 1;
      if (S.v < 0) { S.q.push(t); th[t].state = "sleep"; th[t].on = name; return "`sem_wait(&" + name + ")`: " + b + " → '''" + S.v + "''' → '''" + names[t] + " 잠듦'''"; }
      if (name === "z") th[t].holdsZ = true;
      return "`sem_wait(&" + name + ")`: " + b + " → " + S.v + " → 통과";
    }
    function post(t, name) {
      var S = sem[name], b = S.v;
      S.v += 1;
      if (name === "z") th[t].holdsZ = false;
      if (S.q.length) {
        var u = S.q.shift();
        th[u].state = "ready"; th[u].on = null; th[u].pc += 1;
        if (name === "z") th[u].holdsZ = true;
        return "`sem_post(&" + name + ")`: " + b + " → " + S.v + " → '''" + names[u] + " 깨움'''";
      }
      return "`sem_post(&" + name + ")`: " + b + " → " + S.v;
    }

    push((swapped ? "'''(a)(b) 순서를 바꾼''' producer" : "'''정답''' 코드") + ". 초기값 x = 3 (빈 칸 3개), y = 0 (찬 칸 0개), z = 1 (mutex). " +
      "규칙: wait = 값 −1, 음수면 잠듦 / post = 값 +1, 잠든 사람이 있으면 하나 깨움.", {});

    SCHED[swapped ? "swapped" : "correct"].forEach(function (e) {
      var t = e[0], memo = e[1], x = th[t];
      if (x.state === "sleep") throw new Error("p6_xyz: " + t + " is asleep");
      if (x.pc === null) x.pc = 3;
      var line = x.pc, msg, note;
      if (t === "P") {
        var first = swapped ? "z" : "x", second = swapped ? "x" : "z";
        if (line === 3) { msg = wait(t, first); if (x.state !== "sleep") x.pc = 4; }
        else if (line === 4) { msg = wait(t, second); if (x.state !== "sleep") x.pc = 5; else if (x.holdsZ) note = "producer 가 '''mutex z 를 쥔 채''' 잠들었다 — consumer 는 z 를 못 얻으니 x 를 post 해 줄 수 없다."; }
        else if (line === 5) { buf[fill] = item; msg = "`put(" + item + ")` → buffer[" + fill + "] = " + item; fill = (fill + 1) % MAX; x.pc = 6; }
        else if (line === 6) { msg = post(t, "z"); x.pc = 7; }
        else if (line === 7) { msg = post(t, "y") + " → item " + item + " 끝"; item += 1; x.pc = 3; }
      } else {
        if (line === 3) { msg = wait(t, "y"); if (x.state !== "sleep") x.pc = 4; }
        else if (line === 4) { msg = wait(t, "z"); if (x.state !== "sleep") x.pc = 5; }
        else if (line === 5) { var v = buf[use]; buf[use] = null; x.tmp = v; msg = "`get()` → buffer[" + use + "] 의 item " + v; use = (use + 1) % MAX; x.pc = 6; }
        else if (line === 6) { msg = post(t, "z"); x.pc = 7; }
        else if (line === 7) { msg = post(t, "x"); x.pc = 8; }
        else if (line === 8) { out.push(x.tmp); msg = "`printf` → " + x.tmp; x.pc = 3; }
      }
      if (th.P.state === "sleep" && th.C.state === "sleep") note = "'''DEADLOCK''' — producer 는 z 를 쥐고 x 를 기다리고(hold and wait), consumer 는 z 를 기다린다. 서로가 서로를 깨워 줄 수 없다. 고치는 법: 자원(x) 먼저, mutex(z) 나중 — 정답 순서.";
      var ps = {}; ps[t] = line;
      push("'''" + names[t] + "''' " + line + "번 줄: " + msg + (memo ? " — " + memo : ""), ps, note);
    });

    return {
      panels: [
        { id: "producer", title: "producer" + (swapped ? " — (a)(b) 바꿈 ✗" : ""), lang: "c", lines: prodCode(swapped) },
        { id: "consumer", title: "consumer", lang: "c", lines: CONS }
      ],
      vars: [
        { name: "x", label: "x (빈 칸, empty)", group: "세마포어" },
        { name: "xq", label: "x 에서 잠든", group: "세마포어" },
        { name: "y", label: "y (찬 칸, full)", group: "세마포어" },
        { name: "yq", label: "y 에서 잠든", group: "세마포어" },
        { name: "z", label: "z (mutex)", group: "세마포어" },
        { name: "zq", label: "z 에서 잠든", group: "세마포어" },
        { name: "zowner", label: "z 를 쥔 쪽", group: "세마포어" },
        { name: "buffer", label: "buffer", group: "버퍼" },
        { name: "fill", label: "fill", group: "버퍼" },
        { name: "use", label: "use", group: "버퍼" },
        { name: "printed", label: "consumer 출력", group: "버퍼" },
        { name: "P", label: "producer", group: "스레드" },
        { name: "C", label: "consumer", group: "스레드" }
      ],
      steps: steps
    };
  }
})(typeof window !== "undefined" ? window : globalThis);
