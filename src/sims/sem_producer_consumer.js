// sem_producer_consumer — 10강 p.37–47 세마포어 버전 producer/consumer (bounded buffer)
// 원본: p.37 put/get, p.38–39 1차(동기화 없음 → V#0 덮어씀), p.40–41 2차(empty/full),
//       p.42 남은 문제(f1 race), p.43–45 3차(mutex 바깥 → deadlock), p.46–47 최종(mutex 안쪽).
// 세마포어 의미는 슬라이드 규약: sem_wait = 값 1 감소 후 음수면 잠듦, sem_post = 값 1 증가 후 대기자 하나 깨움.
(function (global) {
  "use strict";
  global.SIMS = global.SIMS || {};

  function putGetLines(max) {
    return [
      "int buffer[MAX];   // MAX = " + max,
      "int fill = 0;",
      "int use = 0;",
      "",
      "void put(int value) {",
      "    buffer[fill] = value;     // line f1",
      "    fill = (fill + 1) % MAX;  // line f2",
      "}",
      "",
      "int get() {",
      "    int tmp = buffer[use];    // line g1",
      "    use = (use + 1) % MAX;    // line g2",
      "    return tmp;",
      "}"
    ];
  }
  var F1 = 6, G1 = 11;

  var CODE = {
    none: {
      producer: [
        "void *producer(void *arg) {",
        "    int i;",
        "    for (i = 0; i < loops; i++) {",
        "        put(i);",
        "    }",
        "}"
      ],
      consumer: [
        "void *consumer(void *arg) {",
        "    int i, tmp = 0;",
        "    while (tmp != -1) {",
        "        tmp = get();",
        "        printf(\"%d\\n\", tmp);",
        "    }",
        "}"
      ]
    },
    empty_full: {
      producer: [
        "void *producer(void *arg) {",
        "    int i;",
        "    for (i = 0; i < loops; i++) {",
        "        sem_wait(&empty);   // line P1",
        "        put(i);             // line P2",
        "        sem_post(&full);    // line P3",
        "    }",
        "}"
      ],
      consumer: [
        "void *consumer(void *arg) {",
        "    int i, tmp = 0;",
        "    while (tmp != -1) {",
        "        sem_wait(&full);    // line C1",
        "        tmp = get();        // line C2",
        "        sem_post(&empty);   // line C3",
        "        printf(\"%d\\n\", tmp);",
        "    }",
        "}"
      ]
    },
    mutex_outside: {
      producer: [
        "void *producer(void *arg) {",
        "    int i;",
        "    for (i = 0; i < loops; i++) {",
        "        sem_wait(&mutex);   // line p0 (NEW LINE)",
        "        sem_wait(&empty);   // line p1",
        "        put(i);             // line p2",
        "        sem_post(&full);    // line p3",
        "        sem_post(&mutex);   // line p4 (NEW LINE)",
        "    }",
        "}"
      ],
      consumer: [
        "void *consumer(void *arg) {",
        "    int i;",
        "    for (i = 0; i < loops; i++) {",
        "        sem_wait(&mutex);   // line c0 (NEW LINE)",
        "        sem_wait(&full);    // line c1",
        "        int tmp = get();    // line c2",
        "        sem_post(&empty);   // line c3",
        "        sem_post(&mutex);   // line c4 (NEW LINE)",
        "        printf(\"%d\\n\", tmp);",
        "    }",
        "}"
      ]
    },
    final: {
      producer: [
        "void *producer(void *arg) {",
        "    int i;",
        "    for (i = 0; i < loops; i++) {",
        "        sem_wait(&empty);   // line p1",
        "        sem_wait(&mutex);   // line p1.5 (MOVED MUTEX HERE...)",
        "        put(i);             // line p2",
        "        sem_post(&mutex);   // line p2.5 (... AND HERE)",
        "        sem_post(&full);    // line p3",
        "    }",
        "}"
      ],
      consumer: [
        "void *consumer(void *arg) {",
        "    int i;",
        "    for (i = 0; i < loops; i++) {",
        "        sem_wait(&full);    // line c1",
        "        sem_wait(&mutex);   // line c1.5 (MOVED MUTEX HERE...)",
        "        int tmp = get();    // line c2",
        "        sem_post(&mutex);   // line c2.5 (... AND HERE)",
        "        sem_post(&empty);   // line c3",
        "        printf(\"%d\\n\", tmp);",
        "    }",
        "}"
      ]
    }
  };

  var SEMS = {
    none: [],
    empty_full: ["empty", "full"],
    mutex_outside: ["empty", "full", "mutex"],
    final: ["empty", "full", "mutex"]
  };

  var COLOR = { running: "#4caf50", ready: "#e0a526", blocked: "#d64545", "not started": "#888" };

  global.SIMS["sem_producer_consumer"] = {
    title: "세마포어 producer/consumer (bounded buffer)",
    desc: "10강 p.37–47 의 네 번의 시도를 그대로 따라간다: 동기화 없음 → `empty`/`full` 세마포어 → mutex 를 바깥에(deadlock) → mutex 를 안쪽에(정답). [[세마포어]] 값이 음수면 그 절댓값이 잠든 스레드 수다.",
    options: [
      {
        key: "attempt", label: "시도",
        values: [
          { value: "none", label: "1차: 동기화 없음 (p.38–39)" },
          { value: "empty_full", label: "2차: empty/full 세마포어 (p.40–41)" },
          { value: "mutex_outside", label: "3차: mutex 를 바깥에 (p.43–45) → deadlock" },
          { value: "final", label: "최종: mutex 를 안쪽에 (p.46–47) 정답" }
        ]
      }
    ],
    build: function (opts) {
      var attempt = opts.attempt || "none";
      if (!CODE[attempt]) attempt = "none";
      var MAX = (attempt === "none" || attempt === "empty_full") ? 5 : 1;
      var sems = SEMS[attempt];

      var S = { sem: {}, buf: [], fill: 0, use: 0, P: "ready", C: "ready", out: [] };
      if (attempt === "none") S.C = "not started";
      if (sems.indexOf("empty") >= 0) S.sem.empty = MAX;
      if (sems.indexOf("full") >= 0) S.sem.full = 0;
      if (sems.indexOf("mutex") >= 0) S.sem.mutex = 1;
      for (var k = 0; k < MAX; k++) S.buf.push("·");
      var steps = [];

      function snap() {
        var v = {};
        sems.forEach(function (s) { v[s] = S.sem[s]; });
        for (var j = 0; j < MAX; j++) v["buf[" + j + "]"] = S.buf[j];
        v.fill = S.fill; v.use = S.use;
        v["P.state"] = S.P; v["C.state"] = S.C;
        v.output = S.out.slice();
        return v;
      }
      function badge(s) { return s.indexOf("blocked") === 0 ? "blocked" : s; }

      function svg() {
        var W = 380, H = 150;
        var o = '<svg viewBox="0 0 ' + W + ' ' + H + '" width="100%" style="max-width:380px" font-family="sans-serif">';
        var bw = Math.min(60, (W - 40) / MAX), bx0 = (W - MAX * bw) / 2, by = 22;
        o += '<text x="' + (W / 2) + '" y="14" font-size="10" text-anchor="middle" fill="#9aa">buffer (MAX=' + MAX + ')</text>';
        for (var j = 0; j < MAX; j++) {
          var filled = S.buf[j] !== "·", x = bx0 + j * bw;
          o += '<rect x="' + x + '" y="' + by + '" width="' + (bw - 4) + '" height="28" rx="3" fill="' + (filled ? "#4a8fd6" : "none") + '" stroke="#8aa" stroke-width="1.2"/>';
          o += '<text x="' + (x + bw / 2 - 2) + '" y="' + (by + 18) + '" font-size="11" text-anchor="middle" fill="' + (filled ? "#fff" : "#9aa") + '">' + (filled ? S.buf[j] : j) + '</text>';
          if (S.fill === j) o += '<text x="' + (x + bw / 2 - 2) + '" y="' + (by + 40) + '" font-size="9" text-anchor="middle" fill="#e0a526">▲fill</text>';
          if (S.use === j) o += '<text x="' + (x + bw / 2 - 2) + '" y="' + (by + (S.fill === j ? 50 : 40)) + '" font-size="9" text-anchor="middle" fill="#4caf50">▲use</text>';
        }
        [["P", "Producer"], ["C", "Consumer"]].forEach(function (p, idx) {
          var st = S[p[0]], col = COLOR[badge(st)] || "#888", x = 40 + idx * 170, y = 82;
          o += '<rect x="' + x + '" y="' + y + '" width="130" height="36" rx="5" fill="none" stroke="' + col + '" stroke-width="2"/>';
          o += '<text x="' + (x + 65) + '" y="' + (y + 15) + '" font-size="11" text-anchor="middle" fill="' + col + '">' + p[1] + '</text>';
          o += '<text x="' + (x + 65) + '" y="' + (y + 29) + '" font-size="9.5" text-anchor="middle" fill="' + col + '">' + st + '</text>';
        });
        if (sems.length) {
          var line = sems.map(function (s) { return s + " = " + S.sem[s]; }).join("    ");
          o += '<text x="' + (W / 2) + '" y="' + (H - 10) + '" font-size="11" text-anchor="middle" fill="#9aa">' + line + '</text>';
        }
        return o + '</svg>';
      }

      function push(desc, pc, note) {
        steps.push({
          desc: desc,
          pc: { put_get: pc.g || null, producer: pc.p || null, consumer: pc.c || null },
          vars: snap(),
          status: { producer: badge(S.P), consumer: badge(S.C) },
          note: note,
          svg: svg()
        });
      }
      function run(who) { // 한 스레드만 running
        if (who === "P") { S.P = "running"; if (S.C === "running") S.C = "ready"; }
        else { S.C = "running"; if (S.P === "running") S.P = "ready"; }
      }
      function put(v) { S.buf[S.fill] = "V#" + v; S.fill = (S.fill + 1) % MAX; }
      function get() { var v = S.buf[S.use]; S.buf[S.use] = "·"; S.use = (S.use + 1) % MAX; S.out.push(v); return v; }

      var semRule = " 세마포어 규칙(슬라이드 규약): `sem_wait(&s)` 는 s 를 1 줄이고 '''음수면 잠든다''', `sem_post(&s)` 는 s 를 1 늘리고 잠든 스레드가 있으면 '''하나를 깨운다'''.";

      if (attempt === "none") {
        push("p.37–38 '''1차 시도''': 동기화 없이 `put()` / `get()` 만 부른다. MAX = 5, `buffer[5]` 는 비어 있고 use = 0, fill = 0. 이번 trace 에서는 '''소비자가 한 번도 스케줄되지 않았다''' 고 가정한다(p.38: \"What happen when the buffer becomes full?\").", {});
        for (var i = 0; i < 5; i++) {
          run("P");
          put(i);
          push("생산자가 `put(" + i + ")` — line f1 에서 `buffer[" + i + "] = V#" + i + "`, line f2 에서 fill = " + (i + 1) + " % 5 = " + S.fill + "." +
            (i === 4 ? " 다섯 칸이 모두 찼고 fill 은 '''0 으로 되감겼다'''(p.39: Use=0, fill=5%MAX=0)." : ""), { p: 4, g: F1 });
        }
        run("P");
        put(5);
        push("생산자가 한 번 더 `put(5)` — 버퍼가 가득 찼는지 '''확인하는 코드가 없으므로''' 그대로 line f1 `buffer[fill=0] = V#5` 를 실행하고 fill = 1. 소비자가 아직 읽지 않은 V#0 자리를 덮어썼다.",
          { p: 4, g: F1 },
          "`V#0` is overwritten by `V#5`! (p.39) — 생산자는 '''빈 칸이 생길 때까지''', 소비자는 '''찬 칸이 생길 때까지''' 기다려야 한다. 이 두 조건을 세마포어로 표현한 것이 2차 시도(`empty` / `full`).");
      } else if (attempt === "empty_full") {
        push("p.40 '''2차 시도''': 세마포어 두 개. `empty` = 빈 칸 수(초기값 MAX = 5), `full` = 찬 칸 수(초기값 0). 생산자는 P1 `sem_wait(&empty)` → P2 `put` → P3 `sem_post(&full)`, 소비자는 그 반대." + semRule, {});
        run("P");
        S.sem.empty--;
        push("생산자 P1 `sem_wait(&empty)` — empty 5 → 4. 음수가 아니므로 통과.", { p: 4 });
        put(0);
        push("생산자 P2 `put(0)` — buffer[0] = V#0, fill = 1.", { p: 5, g: F1 });
        S.sem.full++;
        push("생산자 P3 `sem_post(&full)` — full 0 → 1. 기다리는 소비자가 없으니 깨울 스레드는 없다.", { p: 6 });
        for (var r = 1; r < 5; r++) {
          S.sem.empty--; put(r); S.sem.full++;
          push("생산자가 P1→P2→P3 를 한 번 더: empty " + (S.sem.empty + 1) + " → " + S.sem.empty + ", buffer[" + r + "] = V#" + r + ", full " + (S.sem.full - 1) + " → " + S.sem.full + "." +
            (r === 4 ? " 이제 다섯 칸이 모두 찼다(p.41: Use=0, fill=0, empty=0)." : ""), { p: 6, g: F1 });
        }
        S.sem.empty--; S.P = "blocked (empty)";
        push("생산자가 여섯 번째 값 V#5 를 넣으려고 P1 `sem_wait(&empty)` — empty 0 → '''−1''' 이 되어 '''잠든다'''. 1차 시도와 달리 V#0 을 덮어쓰지 않는다.", { p: 4 },
          "p.41: \"When the producer invokes sem_wait(&empty) in P1, it goes to sleep because empty becomes -1\" — 소비자가 `sem_post(&empty)` 해서 empty 를 0 으로 올려 줄 때까지 잔다.");
        run("C");
        S.sem.full--;
        push("소비자가 스케줄된다. C1 `sem_wait(&full)` — full 5 → 4, 통과.", { p: 4, c: 4 });
        get();
        push("소비자 C2 `tmp = get()` — line g1 에서 buffer[0] 의 '''V#0''' 을 꺼내고 use = 1.", { p: 4, c: 5, g: G1 });
        S.sem.empty++; S.P = "ready";
        push("소비자 C3 `sem_post(&empty)` — empty −1 → 0. 잠들어 있던 '''생산자를 깨운다'''(ready). 이어서 printf 로 V#0 출력.", { p: 4, c: 6 });
        run("P");
        put(5);
        push("생산자가 깨어나 `sem_wait` 에서 돌아오고(값은 이미 줄여 두었으므로 다시 줄이지 않는다) P2 `put(5)` — 방금 비워진 buffer[0] 에 V#5, fill = 1.", { p: 5, c: 6, g: F1 });
        S.sem.full++;
        push("생산자 P3 `sem_post(&full)` — full 4 → 5. 버퍼 다섯 칸 = V#5, V#1, V#2, V#3, V#4 로 '''데이터 손실 없이''' 가득 찼다: empty = 0, full = 5. 생산자 1명·소비자 1명이면 이 코드는 올바르다.", { p: 6, c: 6 });
        push("'''그런데''' 생산자가 여러 명이고 MAX > 1 이면? (p.42) Producer 1 이 `sem_wait(&empty)` 통과(empty=9, fill=0) 후 line f1 `buffer[fill] = value` 까지 실행하고 f2 전에 context switch → Producer 2 도 통과(empty=8, fill 은 여전히 0)해 '''같은 buffer[0]''' 에 쓴다. (여기서는 설명만 — 위 변수는 1:1 trace 의 최종 상태 그대로.)", { p: 5, c: 6, g: F1 },
          "Buffer[0] is overwritten! — `put()` 의 f1·f2(칸 채우기 + 인덱스 증가)는 critical section 인데 mutual exclusion 이 없다. `empty`/`full` 은 '''개수''' 만 세어 줄 뿐 동시 진입은 막지 못한다 → 3차 시도에서 `mutex` 를 추가.");
      } else if (attempt === "mutex_outside") {
        push("p.43 '''3차 시도''': 이진 세마포어 `mutex`(초기값 1)를 추가해 p0/c0 에서 잡고 p4/c4 에서 놓는다. 이번 trace 는 p.44 처럼 생산자 1명·소비자 1명, 짧게 보기 위해 MAX = 1 (empty = 1, full = 0, mutex = 1). '''소비자가 먼저''' 실행된다." + semRule, {});
        run("C");
        S.sem.mutex--;
        push("① 소비자 c0 `sem_wait(&mutex)` — mutex 1 → 0. 소비자가 mutex 를 '''쥐었다'''.", { c: 4 });
        S.sem.full--; S.C = "blocked (full) — mutex 보유";
        push("소비자 c1 `sem_wait(&full)` — full 0 → '''−1''' → 소비자가 잠들고 CPU 를 넘긴다. 문제는 '''mutex 를 쥔 채로''' 잠들었다는 것(p.44: The consumer still holds the mutex!).", { c: 5 });
        run("P");
        S.sem.mutex--; S.P = "blocked (mutex)";
        push("② 생산자 p0 `sem_wait(&mutex)` — mutex 0 → '''−1''' → 생산자도 잠든다. 생산자는 p1·p2·p3 까지 가야 `sem_post(&full)` 로 소비자를 깨울 수 있는데, 입구(p0)에서 막혔다.", { p: 4, c: 5 });
        push("두 스레드 모두 blocked. mutex = −1(생산자 1명 대기), full = −1(소비자 1명 대기), empty 는 1 그대로 — 빈 칸이 있는데도 아무도 넣지 못한다. 이것이 [[데드락]](deadlock)이다.", { p: 4, c: 5 },
          "The producer sleeps until consumer posts mutex, while consumer sleeps until producer posts full → Both sleep forever! (Deadlock) (p.45) — 원인은 '''mutex 를 잡은 채 다른 세마포어를 기다린 것'''. 해결: mutex 의 범위를 `put()`/`get()` 만 감싸도록 '''안쪽으로''' 옮긴다(p.46).");
      } else {
        push("p.46 '''최종 시도''': mutex 를 `sem_wait(&empty/full)` '''안쪽''' 으로 옮겨, mutex 는 `put()`/`get()` 만 감싼다. 3차 시도와 같은 조건 — 생산자 1명·소비자 1명, MAX = 1 (empty = 1, full = 0, mutex = 1), '''소비자가 먼저''' 실행." + semRule, {});
        run("C");
        S.sem.full--; S.C = "blocked (full)";
        push("소비자 c1 `sem_wait(&full)` — full 0 → −1 → 소비자가 잠든다. 3차 시도와 달리 '''mutex 를 쥐지 않은 채''' 잔다(mutex = 1 그대로).", { c: 4 });
        run("P");
        S.sem.empty--;
        push("생산자 p1 `sem_wait(&empty)` — empty 1 → 0, 통과.", { p: 4, c: 4 });
        S.sem.mutex--;
        push("생산자 p1.5 `sem_wait(&mutex)` — mutex 1 → 0. 아무도 mutex 를 쥐고 있지 않으므로 곧바로 획득 — 3차 시도의 데드락 지점을 통과했다.", { p: 5, c: 4 });
        put(0);
        push("생산자 p2 `put(0)` — buffer[0] = V#0, fill = (0+1) % 1 = 0. mutex 덕분에 이 f1·f2 는 다른 생산자와 섞이지 않는다.", { p: 6, c: 4, g: F1 });
        S.sem.mutex++;
        push("생산자 p2.5 `sem_post(&mutex)` — mutex 0 → 1.", { p: 7, c: 4 });
        S.sem.full++; S.C = "ready";
        push("생산자 p3 `sem_post(&full)` — full −1 → 0. 잠든 '''소비자를 깨운다'''(ready).", { p: 8, c: 4 });
        run("C");
        push("context switch → 소비자가 `sem_wait(&full)` 에서 돌아온다(값은 이미 줄여 두었다).", { p: 8, c: 4 });
        S.sem.mutex--;
        push("소비자 c1.5 `sem_wait(&mutex)` — mutex 1 → 0.", { p: 8, c: 5 });
        get();
        push("소비자 c2 `get()` — buffer[0] 의 V#0 을 꺼낸다. use = 0.", { p: 8, c: 6, g: G1 });
        S.sem.mutex++;
        push("소비자 c2.5 `sem_post(&mutex)` — mutex 0 → 1.", { p: 8, c: 7 });
        S.sem.empty++;
        push("소비자 c3 `sem_post(&empty)` — empty 0 → 1. 기다리는 생산자는 없다. printf 로 V#0 출력 — 한 바퀴 끝, 세마포어가 초기값(empty=1, full=0, mutex=1)으로 돌아왔다.", { p: 8, c: 8 });
        run("P");
        S.sem.empty--;
        push("생산자 두 번째 반복: p1 `sem_wait(&empty)` — empty 1 → 0, 통과.", { p: 4, c: 8 });
        S.sem.mutex--;
        push("생산자 p1.5 `sem_wait(&mutex)` — mutex 1 → 0.", { p: 5, c: 8 });
        put(1);
        push("생산자 p2 `put(1)` — buffer[0] = V#1.", { p: 6, c: 8, g: F1 });
        S.sem.mutex++;
        push("생산자 p2.5 `sem_post(&mutex)` — mutex 0 → 1.", { p: 7, c: 8 });
        S.sem.full++;
        push("생산자 p3 `sem_post(&full)` — full 0 → 1. 최종 상태 empty = 0, full = 1, mutex = 1, buffer = [V#1] — '''empty + full = MAX''' 가 성립하고 mutex 는 풀려 있다.", { p: 8, c: 8 },
          "정답 규칙: '''mutex 를 쥔 채로 다른 세마포어(empty/full)를 기다리지 마라.''' 먼저 개수 세마포어로 자리를 확보하고, critical section(`put`/`get`)만 mutex 로 감싼다(p.46). 이것이 [[producer-consumer]] / [[bounded buffer]] 의 표준 해법이다.");
      }

      var panels = [
        { id: "put_get", title: "put / get (p.37)", lang: "c", lines: putGetLines(MAX) },
        { id: "producer", title: "Producer", lang: "c", lines: CODE[attempt].producer },
        { id: "consumer", title: "Consumer", lang: "c", lines: CODE[attempt].consumer }
      ];
      var vars = [];
      sems.forEach(function (s) {
        vars.push({ name: s, label: s + (s === "mutex" ? " (이진 세마포어)" : ""), group: "세마포어" });
      });
      for (var j = 0; j < MAX; j++) vars.push({ name: "buf[" + j + "]", group: "버퍼" });
      vars.push({ name: "fill", group: "버퍼" });
      vars.push({ name: "use", group: "버퍼" });
      vars.push({ name: "P.state", label: "Producer", group: "스레드" });
      vars.push({ name: "C.state", label: "Consumer", group: "스레드" });
      vars.push({ name: "output", label: "소비자 출력", group: "스레드" });

      return { panels: panels, vars: vars, steps: steps };
    }
  };
})(typeof window !== "undefined" ? window : globalThis);
