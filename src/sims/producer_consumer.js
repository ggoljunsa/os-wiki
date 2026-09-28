// producer_consumer — 10강(OSTEP 30.2) bounded buffer 문제
// 원본: Figure 30.6 (put/get v1), 30.8 (if + CV 1개), 30.9 (trace), 30.10 (while + CV 1개),
//       30.11 (trace: 셋 다 잠듦), 30.12 (CV 2개), 30.13/30.14 (MAX 칸 버퍼)
(function (global) {
  "use strict";
  global.SIMS = global.SIMS || {};

  // put_get 패널
  function putGetCode(max) {
    if (max === 1) {
      return {
        lines: [
          "int buffer;",
          "int count = 0;   // initially, empty",
          "",
          "void put(int value) {",
          "    assert(count == 0);",
          "    count = 1;",
          "    buffer = value;",
          "}",
          "",
          "int get() {",
          "    assert(count == 1);",
          "    count = 0;",
          "    return buffer;",
          "}"
        ],
        put: 6, get: 12, getAssert: 11
      };
    }
    return {
      lines: [
        "int buffer[MAX];   // MAX = 3",
        "int fill_ptr = 0;",
        "int use_ptr  = 0;",
        "int count    = 0;",
        "",
        "void put(int value) {",
        "    buffer[fill_ptr] = value;",
        "    fill_ptr = (fill_ptr + 1) % MAX;",
        "    count++;",
        "}",
        "int get() {",
        "    int tmp = buffer[use_ptr];",
        "    use_ptr = (use_ptr + 1) % MAX;",
        "    count--;",
        "    return tmp;",
        "}"
      ],
      put: 7, get: 12, getAssert: 12
    };
  }

  function prodCode(variant, max) {
    var kw = variant === "if_1cv" ? "if   " : "while";
    var full = max === 1 ? "count == 1  " : "count == MAX";
    var waitCv = variant === "while_2cv" ? "&empty" : "&cond ";
    var sigCv = variant === "while_2cv" ? "&fill " : "&cond ";
    return [
      "void *producer(void *arg) {",
      "    for (i = 0; i < loops; i++) {",
      "        Pthread_mutex_lock(&mutex);            // p1",
      "        " + kw + " (" + full + ")              // p2",
      "            Pthread_cond_wait(" + waitCv + ", &mutex); // p3",
      "        put(i);                                // p4",
      "        Pthread_cond_signal(" + sigCv + ");          // p5",
      "        Pthread_mutex_unlock(&mutex);          // p6",
      "    }",
      "}"
    ];
  }
  function consCode(variant) {
    var kw = variant === "if_1cv" ? "if   " : "while";
    var waitCv = variant === "while_2cv" ? "&fill " : "&cond ";
    var sigCv = variant === "while_2cv" ? "&empty" : "&cond ";
    return [
      "void *consumer(void *arg) {",
      "    for (i = 0; i < loops; i++) {",
      "        Pthread_mutex_lock(&mutex);            // c1",
      "        " + kw + " (count == 0)                // c2",
      "            Pthread_cond_wait(" + waitCv + ", &mutex); // c3",
      "        int tmp = get();                       // c4",
      "        Pthread_cond_signal(" + sigCv + ");          // c5",
      "        Pthread_mutex_unlock(&mutex);          // c6",
      "        printf(\"%d\\n\", tmp);",
      "    }",
      "}"
    ];
  }

  var COLOR = { running: "#4caf50", ready: "#e0a526", sleeping: "#6b6bd6", done: "#888", "assert fail": "#d64545" };

  global.SIMS["producer_consumer"] = {
    title: "producer/consumer (bounded buffer)",
    desc: "생산자 Tp 1명 + 소비자 Tc1·Tc2 2명. `if` + CV 1개(Fig 30.8) → 빈 버퍼에서 get, `while` + CV 1개(Fig 30.10) → 셋 다 잠듦, `while` + CV 2개(Fig 30.12) → 정답. [[Mesa semantics]] 때문에 signal 은 힌트일 뿐이다.",
    options: [
      {
        key: "variant", label: "구현",
        values: [
          { value: "if_1cv", label: "if + CV 1개 (Fig 30.8 → trace 30.9)" },
          { value: "while_1cv", label: "while + CV 1개 (Fig 30.10 → trace 30.11)" },
          { value: "while_2cv", label: "while + CV 2개 empty/fill (Fig 30.12/30.14, 정답)" }
        ]
      },
      {
        key: "buffer", label: "버퍼 크기 MAX",
        values: [
          { value: "1", label: "1 (단일 칸)" },
          { value: "3", label: "3 (while_2cv 에서만 적용)" }
        ]
      }
    ],
    build: function (opts) {
      var variant = opts.variant || "if_1cv";
      // 버그 재현 변형은 OSTEP 그림대로 MAX=1 고정
      var MAX = (variant === "while_2cv" && String(opts.buffer) === "3") ? 3 : 1;
      var useWhile = variant !== "if_1cv";
      var twoCv = variant === "while_2cv";
      var pg = putGetCode(MAX);

      var S = {
        buffer: [], count: 0, fill: 0, use: 0, mutex: "free",
        cv: { cond: [], empty: [], fill: [] },
        output: [], failed: false
      };
      for (var k = 0; k < MAX; k++) S.buffer.push("·");
      var T = {
        Tp: { kind: "p", pc: "p1", at: null, i: 0, state: "ready", woke: false },
        Tc1: { kind: "c", pc: "c1", at: null, i: 0, state: "ready", woke: false, tmp: null },
        Tc2: { kind: "c", pc: "c1", at: null, i: 0, state: "ready", woke: false, tmp: null }
      };
      var lastCons = "Tc1";
      var steps = [];
      var FIGNAME = variant === "if_1cv" ? "Figure 30.8" : (variant === "while_1cv" ? "Figure 30.10" : (MAX === 1 ? "Figure 30.12" : "Figure 30.13/30.14"));

      function lineOf(pc) { return Number(pc.slice(1)) + 2; }   // p1 → 3번 줄
      function waitCvOf(t) { return twoCv ? (t.kind === "p" ? "empty" : "fill") : "cond"; }
      function sigCvOf(t) { return twoCv ? (t.kind === "p" ? "fill" : "empty") : "cond"; }
      function cvVars() {
        if (twoCv) return { "cv.empty": S.cv.empty.slice(), "cv.fill": S.cv.fill.slice() };
        return { "cv.cond": S.cv.cond.slice() };
      }
      function snap() {
        var v = {
          buffer: S.buffer.slice(), count: S.count, mutex: S.mutex,
          "Tp": T.Tp.state + " @" + (T.Tp.at || "-"), "Tc1": T.Tc1.state + " @" + (T.Tc1.at || "-"), "Tc2": T.Tc2.state + " @" + (T.Tc2.at || "-"),
          output: S.output.slice()
        };
        if (MAX > 1) { v.fill_ptr = S.fill; v.use_ptr = S.use; }
        var c = cvVars(); for (var key in c) v[key] = c[key];
        return v;
      }

      function svg() {
        var W = 360, H = 170;
        var o = '<svg viewBox="0 0 ' + W + ' ' + H + '" width="100%" style="max-width:360px" font-family="sans-serif">';
        // 버퍼 칸
        var bw = 46, bx0 = (W - MAX * bw) / 2, by = 22;
        o += '<text x="' + (W / 2) + '" y="14" font-size="10" text-anchor="middle" fill="#9aa">buffer (MAX=' + MAX + ', count=' + S.count + ')</text>';
        for (var j = 0; j < MAX; j++) {
          var filled = S.buffer[j] !== "·";
          var x = bx0 + j * bw;
          o += '<rect x="' + x + '" y="' + by + '" width="' + (bw - 4) + '" height="30" rx="3" fill="' + (filled ? "#4a8fd6" : "none") + '" stroke="#8aa" stroke-width="1.2"/>';
          o += '<text x="' + (x + bw / 2 - 2) + '" y="' + (by + 20) + '" font-size="12" text-anchor="middle" fill="' + (filled ? "#fff" : "#9aa") + '">' + (filled ? S.buffer[j] : "empty") + '</text>';
          if (MAX > 1) {
            if (S.fill === j) o += '<text x="' + (x + bw / 2 - 2) + '" y="' + (by + 44) + '" font-size="9" text-anchor="middle" fill="#e0a526">▲fill</text>';
            if (S.use === j) o += '<text x="' + (x + bw / 2 - 2) + '" y="' + (by + (S.fill === j ? 54 : 44)) + '" font-size="9" text-anchor="middle" fill="#4caf50">▲use</text>';
          }
        }
        // 스레드
        var names = ["Tp", "Tc1", "Tc2"];
        names.forEach(function (n, idx) {
          var t = T[n], x = 20 + idx * 112, y = 92;
          var col = COLOR[t.state] || "#888";
          o += '<rect x="' + x + '" y="' + y + '" width="100" height="44" rx="5" fill="none" stroke="' + col + '" stroke-width="2"/>';
          o += '<text x="' + (x + 50) + '" y="' + (y + 17) + '" font-size="12" text-anchor="middle" fill="' + col + '">' + n + ' @' + (t.at || "-") + '</text>';
          o += '<rect x="' + (x + 15) + '" y="' + (y + 24) + '" width="70" height="14" rx="7" fill="' + col + '"/>';
          o += '<text x="' + (x + 50) + '" y="' + (y + 35) + '" font-size="9.5" text-anchor="middle" fill="#fff">' + t.state + '</text>';
        });
        var c = cvVars(), line = [];
        for (var key in c) line.push(key + ": [" + c[key].join(", ") + "]");
        line.push("mutex: " + S.mutex);
        o += '<text x="' + (W / 2) + '" y="' + (H - 12) + '" font-size="10" text-anchor="middle" fill="#9aa">' + line.join("   ") + '</text>';
        return o + '</svg>';
      }

      function push(name, desc, note, extraPc) {
        var t = T[name];
        if (t.kind === "c") lastCons = name;
        var pc = { put_get: extraPc || null,
          producer: T.Tp.at ? lineOf(T.Tp.at) : null,
          consumer: T[lastCons].at ? lineOf(T[lastCons].at) : null };
        var status = { producer: T.Tp.state, consumer: T[lastCons].state };
        steps.push({ desc: desc, pc: pc, vars: snap(), status: status, note: note, svg: svg() });
      }
      function label(t) { return t === "Tp" ? "생산자 '''Tp'''" : "소비자 '''" + t + "'''"; }

      // 한 thread 의 micro-op 하나 실행. 표시용 pc 는 '방금 실행한 줄'
      function exec(name, comment, note) {
        var t = T[name];
        if (t.state === "done" || S.failed) return;
        for (var n in T) if (n !== name && T[n].state === "running") T[n].state = "ready";
        t.state = "running";
        var who = label(name), d = "", extra = null, cvName;
        var prefix = "";

        if (t.woke) {
          // wait() 에서 반환: 락 재획득 후 다음 줄로
          t.woke = false;
          S.mutex = name;
          prefix = who + " 가 스케줄되어 `wait()` 에서 돌아온다 — 반환 직전에 '''mutex 를 재획득'''(`mutex = " + name + "`). ";
          t.pc = useWhile ? (t.kind === "p" ? "p2" : "c2") : (t.kind === "p" ? "p4" : "c4");
          who = "그리고";
        }

        var pc = t.pc;
        t.at = pc;
        if (pc === "p1" || pc === "c1") {
          S.mutex = name;
          d = who + " 가 `" + pc + "` `Pthread_mutex_lock(&mutex)` — 락 획득.";
          t.pc = pc[0] + "2";
        } else if (pc === "p2" || pc === "c2") {
          var cond = t.kind === "p" ? (S.count === MAX) : (S.count === 0);
          var ex = t.kind === "p" ? (MAX === 1 ? "count == 1" : "count == MAX") : "count == 0";
          d = (who === "그리고" ? "`" : who + " 가 `") + pc + "` `" + (useWhile ? "while" : "if") + " (" + ex + ")` 검사 → count = " + S.count + ", " +
            (cond ? "'''참''' → 기다려야 한다." : "'''거짓''' → 기다릴 필요 없음.");
          t.pc = cond ? pc[0] + "3" : pc[0] + "4";
        } else if (pc === "p3" || pc === "c3") {
          cvName = waitCvOf(t);
          S.cv[cvName].push(name); S.mutex = "free"; t.state = "sleeping"; t.woke = true;
          d = who + " 가 `" + pc + "` `Pthread_cond_wait(&" + cvName + ", &mutex)` — 락을 풀고 cv `" + cvName + "` 에서 '''잠든다'''.";
          t.pc = pc;
        } else if (pc === "p4") {
          if (MAX === 1) { S.buffer[0] = t.i; S.count = 1; }
          else { S.buffer[S.fill] = t.i; S.fill = (S.fill + 1) % MAX; S.count++; }
          d = (who === "그리고" ? "" : who + " 가 ") + "`p4` `put(" + t.i + ")` — 버퍼에 " + t.i + " 을 넣는다. count = " + S.count + ".";
          extra = pg.put;
          t.pc = "p5";
        } else if (pc === "c4") {
          if (S.count === 0) {
            S.failed = true; t.state = "assert fail";
            d = (who === "그리고" ? "" : who + " 가 ") + "`c4` `get()` 호출 → '''`assert(count == 1)` 실패!''' 버퍼가 비어 있는데 꺼내려 했다.";
            extra = pg.getAssert;
            t.pc = "c4";
          } else {
            var val;
            if (MAX === 1) { val = S.buffer[0]; S.buffer[0] = "·"; S.count = 0; }
            else { val = S.buffer[S.use]; S.buffer[S.use] = "·"; S.use = (S.use + 1) % MAX; S.count--; }
            t.tmp = val;
            d = (who === "그리고" ? "" : who + " 가 ") + "`c4` `get()` — 버퍼에서 " + val + " 을 꺼낸다. count = " + S.count + ".";
            extra = pg.get;
            t.pc = "c5";
          }
        } else if (pc === "p5" || pc === "c5") {
          cvName = sigCvOf(t);
          var q = S.cv[cvName];
          if (q.length) {
            var w = q.shift(); T[w].state = "ready";
            d = who + " 가 `" + pc + "` `Pthread_cond_signal(&" + cvName + ")` — cv `" + cvName + "` 큐 맨 앞의 '''" + w + "''' 를 깨워 ready 로 옮긴다(아직 실행은 아님).";
          } else {
            d = who + " 가 `" + pc + "` `Pthread_cond_signal(&" + cvName + ")` — 큐가 비어 있어 아무도 깨우지 않는다.";
          }
          t.pc = pc[0] + "6";
        } else if (pc === "p6" || pc === "c6") {
          S.mutex = "free";
          d = who + " 가 `" + pc + "` `Pthread_mutex_unlock(&mutex)`.";
          if (t.kind === "c") { S.output.push(t.tmp); d += " 이어서 `printf` 로 " + t.tmp + " 출력."; }
          t.i++;
          t.pc = pc[0] + "1";
        }
        push(name, prefix + d + (comment ? " " + comment : ""), note, extra);
      }
      function run(name, n, comment, note) {
        for (var r = 0; r < n; r++) exec(name, r === n - 1 ? comment : null, r === n - 1 ? note : null);
      }

      // ---- 초기 상태 ----
      steps.push({
        desc: "'''" + FIGNAME + "''' 구현. 생산자 '''Tp''' 1명, 소비자 '''Tc1''', '''Tc2''' 2명, 버퍼 " + MAX + "칸, 처음엔 비어 있다(count = 0). " +
          (twoCv ? "조건 변수를 '''두 개''' 쓴다: 생산자는 `empty` 에서 기다리고 `fill` 에 signal, 소비자는 그 반대." :
            "조건 변수는 `cond` '''하나''' 를 생산자·소비자가 같이 쓴다. ") +
          (variant === "if_1cv" ? " 조건 검사는 `if` 다. 생산자 1 + 소비자 1 이면 잘 돌지만, 소비자가 2명이면 무너진다." : "") +
          (variant === "while_1cv" ? " `if` 를 `while` 로 바꿔 첫 번째 버그는 고쳤다. 남은 버그는 cv 가 하나라는 것." : "") +
          (!twoCv && String(opts.buffer) === "3" ? " (이 변형은 OSTEP 그림대로 MAX = 1 로 고정해 재현한다.)" : ""),
        pc: { put_get: null, producer: null, consumer: null },
        vars: snap(), status: { producer: "ready", consumer: "ready" }, svg: svg()
      });

      if (variant === "if_1cv") {
        // Figure 30.9 을 그대로
        run("Tc1", 2);
        run("Tc1", 1, "버퍼에 가져갈 것이 없다(Nothing to get).");
        run("Tp", 2);
        run("Tp", 1, "버퍼가 찼다(Buffer now full).");
        run("Tp", 1, "'''Tc1 awoken''' — 하지만 [[Mesa semantics]] 에서 깨운다는 것은 ready 큐로 옮길 뿐, 곧바로 달리게 해 주지 않는다.");
        run("Tp", 3);
        run("Tp", 1, "버퍼가 가득 차 있으므로 Tp 도 잠든다(Buffer full; sleep).");
        run("Tc2", 1, "'''Tc2 가 끼어든다(sneaks in)''' — 스케줄러가 Tc1 보다 Tc2 를 먼저 골랐다.");
        run("Tc2", 1, "`if` 조건이 거짓이라 c3 를 건너뛴다.");
        run("Tc2", 1, "... 그리고 Tc1 이 받을 줄 알았던 데이터를 '''가로챈다(grabs data)'''.");
        run("Tc2", 1, "'''Tp awoken'''.");
        run("Tc2", 1);
        run("Tc1", 1, "", "Oh oh! No data — Tc1 은 `if` 라서 깨어난 뒤 count 를 '''다시 검사하지 않고''' 곧장 c4 로 갔다. Tp 가 signal 한 시점(count=1)과 Tc1 이 실제로 달리는 시점(count=0) 사이에 Tc2 가 상태를 바꿨기 때문. Mesa semantics 라 signal 은 '''\"상태가 바뀌었을지 모른다\"는 힌트일 뿐''' 보장이 아니다. 해결: `if` → `while` (Fig 30.10). 결과: assert 실패로 프로그램 중단.");
      } else if (variant === "while_1cv") {
        // Figure 30.11 을 그대로
        run("Tc1", 2);
        run("Tc1", 1, "가져갈 것이 없다.");
        run("Tc2", 2);
        run("Tc2", 1, "Tc2 도 잠든다. 이제 cv `cond` 에 소비자 둘이 줄 서 있다.");
        run("Tp", 2);
        run("Tp", 1, "Buffer now full.");
        run("Tp", 1, "'''Tc1 awoken'''.");
        run("Tp", 3);
        run("Tp", 1, "버퍼가 찼으니 Tp 도 `cond` 에서 잠든다(Must sleep). 이제 `cond` 큐 = [Tc2, Tp] — '''소비자와 생산자가 같은 큐''' 에 섞여 있다.");
        run("Tc1", 1, "`while` 덕분에 '''조건을 다시 검사'''(Recheck condition)한다 — 첫 번째 버그는 이것으로 막힌다.");
        run("Tc1", 1, "Tc1 이 데이터를 가져간다.");
        run("Tc1", 1, "", "Oops! Woke Tc2 — 버퍼를 비운 소비자는 '''생산자''' 를 깨워야 하는데, cv 가 하나뿐이라 큐 맨 앞의 '''다른 소비자''' 를 깨워 버렸다.");
        run("Tc1", 4, "Tc1 은 다음 반복에서 버퍼가 비었으니 다시 잠든다.");
        run("Tc2", 1, "Tc2 가 깨어나 다시 검사하지만 버퍼는 비어 있다.");
        run("Tc2", 1, "", "Everyone asleep... — Tp, Tc1, Tc2 '''셋 다 cv `cond` 에서 잠들었고''' 깨워 줄 스레드가 없다. 결과: 영원히 멈춤(deadlock 과 비슷한 상태). 해결: 조건 변수를 `empty` / `fill` 두 개로 나눠 '''소비자는 생산자만, 생산자는 소비자만''' 깨우게 한다(Fig 30.12). 모든 대기자를 깨우는 [[broadcast]] 로도 풀리지만 비효율적이다.");
      } else if (MAX === 1) {
        // 30.11 과 같은 시작, 그러나 CV 2개라 올바르게 진행
        run("Tc1", 3, "Tc1 이 `fill` 에서 잠든다.");
        run("Tc2", 3, "Tc2 도 `fill` 에서 잠든다.");
        run("Tp", 3);
        run("Tp", 1, "`fill` 에서 기다리는 '''소비자''' Tc1 을 깨운다.");
        run("Tp", 4, "버퍼가 찼으니 Tp 는 '''`empty`''' 에서 잠든다. 대기자가 cv 별로 나뉘어 있다: `empty = [Tp]`, `fill = [Tc2]`.");
        run("Tc1", 2);
        run("Tc1", 1, "", "여기가 while_1cv 와 갈리는 지점: 소비자는 `empty` 에 signal 하므로 '''반드시 생산자''' 를 깨운다. 소비자가 소비자를 깨울 일이 구조적으로 없다.");
        run("Tc1", 1);
        run("Tc1", 3, "Tc1 은 다음 반복에서 버퍼가 비어 `fill` 에서 다시 잠든다.");
        run("Tp", 1, "Tp 가 `while` 로 다시 검사 → 버퍼가 비었으니 통과.");
        run("Tp", 1);
        run("Tp", 1, "`fill` 큐 맨 앞의 Tc2 를 깨운다.");
        run("Tp", 1);
        run("Tc2", 1, "Tc2 가 다시 검사 → count = 1 이라 통과.");
        run("Tc2", 3, "Tc2 가 1 을 꺼내 출력한다.");
        run("Tp", 1);
        run("Tp", 2);
        run("Tp", 1, "Tc1 을 깨운다.");
        run("Tp", 1);
        run("Tc1", 1);
        run("Tc1", 3, "", "결과: 정상. 출력 0, 1, 2 — 아무도 영원히 잠들지 않았고 빈 버퍼에서 get 하지도 않았다. 규칙 두 개: ① 조건은 항상 `while` 로 검사([[Mesa semantics]], [[spurious wakeup]] 대비), ② 기다리는 조건이 다르면 cv 를 나눠라.");
      } else {
        // MAX = 3: Figure 30.13/30.14
        run("Tc1", 3, "버퍼가 비어 Tc1 이 `fill` 에서 잠든다.");
        run("Tc2", 3, "Tc2 도 `fill` 에서 잠든다.");
        run("Tp", 3, "칸이 3개라 생산자는 count == MAX 가 될 때까지 기다리지 않고 계속 넣을 수 있다. `fill_ptr` 가 한 칸 전진.");
        run("Tp", 2, "Tc1 을 깨우고 락을 푼다.");
        run("Tp", 5, "Tp 가 한 번 더 put. 이번 signal 은 Tc2 를 깨운다.");
        run("Tp", 5, "세 번째 put 으로 버퍼가 '''가득''' 찼다(count = 3). `fill_ptr` 는 `(2+1) % 3 = 0` 으로 '''되감긴다(wrap-around)'''.");
        run("Tp", 3, "`count == MAX` → Tp 는 `empty` 에서 잠든다.");
        run("Tc1", 2, "Tc1 이 `use_ptr` 자리(0번 칸)의 0 을 꺼낸다 — 원형 큐라 '''먼저 들어간 것이 먼저''' 나온다.");
        run("Tc1", 2, "`empty` 에 signal → '''생산자''' Tp 가 깨어난다. 락을 풀고 0 출력.");
        run("Tp", 2, "Tp 가 다시 검사(count = 2 < MAX) 후 3 을 0번 칸에 넣는다 — 방금 비워진 칸을 재사용.");
        run("Tp", 2);
        run("Tc2", 1, "Tc2 가 깨어나 다시 검사(count = 3) → 통과.");
        run("Tc2", 3, "Tc2 가 1번 칸의 1 을 꺼내 출력.");
        run("Tc1", 5, "Tc1 이 2번 칸의 2 를 꺼내 출력.");
        run("Tc2", 5, "Tc2 가 0번 칸의 3 을 꺼내 출력. `use_ptr` 도 한 바퀴 돌았다.", "결과: 정상. 출력 0, 1, 2, 3 — 넣은 순서대로 나왔다. MAX 칸 버퍼에서는 생산자가 소비자를 기다리지 않고 여러 개를 미리 넣어 두므로 문맥 교환이 줄어 '''동시성과 효율이 좋아진다'''. 동기화 규칙은 MAX=1 과 같다: `while` + cv 두 개(`empty`/`fill`).");
      }

      var panels = [
        { id: "put_get", title: MAX === 1 ? "put / get (Fig 30.6)" : "put / get (Fig 30.13, MAX=3)", lang: "c", lines: pg.lines },
        { id: "producer", title: "Producer Tp", lang: "c", lines: prodCode(variant, MAX) },
        { id: "consumer", title: "Consumer (Tc1·Tc2 공용 코드)", lang: "c", lines: consCode(variant) }
      ];
      var vars = [
        { name: "buffer", label: "buffer", group: "공유 버퍼" },
        { name: "count", label: "count", group: "공유 버퍼" }
      ];
      if (MAX > 1) {
        vars.push({ name: "fill_ptr", label: "fill_ptr (다음 put 칸)", group: "공유 버퍼" });
        vars.push({ name: "use_ptr", label: "use_ptr (다음 get 칸)", group: "공유 버퍼" });
      }
      vars.push({ name: "mutex", label: "mutex 소유자", group: "동기화" });
      if (twoCv) {
        vars.push({ name: "cv.empty", label: "cv empty 대기 큐", group: "동기화" });
        vars.push({ name: "cv.fill", label: "cv fill 대기 큐", group: "동기화" });
      } else {
        vars.push({ name: "cv.cond", label: "cv cond 대기 큐", group: "동기화" });
      }
      vars.push({ name: "Tp", label: "Tp (상태 @pc)", group: "스레드" });
      vars.push({ name: "Tc1", label: "Tc1 (상태 @pc)", group: "스레드" });
      vars.push({ name: "Tc2", label: "Tc2 (상태 @pc)", group: "스레드" });
      vars.push({ name: "output", label: "출력", group: "출력" });

      return { panels: panels, vars: vars, steps: steps };
    }
  };
})(typeof window !== "undefined" ? window : globalThis);
