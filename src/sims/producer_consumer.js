// producer_consumer — 10강(OSTEP 30.2) bounded buffer 문제
// 원본: Figure 30.6 (put/get v1), 30.8 (if + CV 1개), 30.9 (trace), 30.10 (while + CV 1개),
//       30.11 (trace: 셋 다 잠듦), 30.12 (CV 2개), 30.13/30.14 (MAX 칸 버퍼)
// 2026-10-07 개편: 스레드마다 패널 하나(Tp / Tc1 / Tc2), 코드는 짧게, wait() 에서 깨어나는 것을 별도 step 으로.
(function (global) {
  "use strict";
  global.SIMS = global.SIMS || {};

  // 패널 코드 — 1번 줄이 for, pN/cN 은 N+1 번 줄
  function prodCode(variant, max) {
    var kw = variant === "if_1cv" ? "if" : "while";
    var full = max === 1 ? "count == 1" : "count == MAX";
    var waitCv = variant === "while_2cv" ? "&empty" : "&cond";
    var sigCv = variant === "while_2cv" ? "&fill" : "&cond";
    return [
      "for (...) {",
      "  lock(&mutex);      // p1",
      "  " + kw + " (" + full + ")  // p2",
      "   wait(" + waitCv + ",&mutex); // p3",
      "  put(i);            // p4",
      "  signal(" + sigCv + ");    // p5",
      "  unlock(&mutex);    // p6",
      "}"
    ];
  }
  function consCode(variant) {
    var kw = variant === "if_1cv" ? "if" : "while";
    var waitCv = variant === "while_2cv" ? "&fill" : "&cond";
    var sigCv = variant === "while_2cv" ? "&empty" : "&cond";
    return [
      "for (...) {",
      "  lock(&mutex);      // c1",
      "  " + kw + " (count == 0)  // c2",
      "   wait(" + waitCv + ",&mutex); // c3",
      "  tmp = get();       // c4",
      "  signal(" + sigCv + ");   // c5",
      "  unlock(&mutex);    // c6",
      "  printf(tmp);",
      "}"
    ];
  }

  var COLOR = { running: "#4caf50", ready: "#e0a526", sleeping: "#6b6bd6", done: "#888", "assert fail": "#d64545" };

  global.SIMS["producer_consumer"] = {
    title: "producer/consumer (bounded buffer)",
    desc: "생산자 Tp 1명 + 소비자 Tc1·Tc2 2명이 버퍼 하나를 두고 돈다. 스레드마다 패널 하나이고 ▶ 표시가 '''그 스레드가 지금 멈춰 있는 줄'''이다. 구현 셋: `if` + CV 1개(Fig 30.8) → 빈 버퍼에서 get 하다 죽음, `while` + CV 1개(Fig 30.10) → 셋 다 잠듦, `while` + CV 2개(Fig 30.12) → 정답. [[Mesa semantics]] 때문에 signal 은 '''깨워 줄 뿐 바로 실행시키지 않는다'''는 것이 모든 버그의 뿌리다.",
    options: [
      {
        key: "variant", label: "구현",
        values: [
          { value: "if_1cv", label: "① if + CV 1개 (Fig 30.8 → trace 30.9)" },
          { value: "while_1cv", label: "② while + CV 1개 (Fig 30.10 → trace 30.11)" },
          { value: "while_2cv", label: "③ while + CV 2개 empty/fill (Fig 30.12/30.14, 정답)" }
        ]
      },
      {
        key: "buffer", label: "버퍼 크기 MAX",
        values: [
          { value: "1", label: "1 (단일 칸)" },
          { value: "3", label: "3 (③ 정답 구현에서만 적용)" }
        ]
      }
    ],
    build: function (opts) {
      var variant = opts.variant || "if_1cv";
      var MAX = (variant === "while_2cv" && String(opts.buffer) === "3") ? 3 : 1;
      var useWhile = variant !== "if_1cv";
      var twoCv = variant === "while_2cv";

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
      var steps = [];
      var FIGNAME = variant === "if_1cv" ? "Figure 30.8" : (variant === "while_1cv" ? "Figure 30.10" : (MAX === 1 ? "Figure 30.12" : "Figure 30.13/30.14"));

      function lineOf(pc) { return Number(pc.slice(1)) + 1; }   // p1 → 2번 줄
      function waitCvOf(t) { return twoCv ? (t.kind === "p" ? "empty" : "fill") : "cond"; }
      function sigCvOf(t) { return twoCv ? (t.kind === "p" ? "fill" : "empty") : "cond"; }
      function cvVars() {
        if (twoCv) return { "cv.empty": S.cv.empty.slice(), "cv.fill": S.cv.fill.slice() };
        return { "cv.cond": S.cv.cond.slice() };
      }
      function bufStr() {
        if (MAX === 1) return S.buffer[0] === "·" ? "(비어 있음)" : String(S.buffer[0]);
        return "[" + S.buffer.join(" ") + "]";
      }
      function snap() {
        var v = {
          buffer: bufStr(), count: S.count + (MAX === 1 ? (S.count ? " (가득)" : " (빔)") : " / " + MAX), mutex: S.mutex,
          "Tp": T.Tp.state + (T.Tp.at ? " @" + T.Tp.at : ""), "Tc1": T.Tc1.state + (T.Tc1.at ? " @" + T.Tc1.at : ""), "Tc2": T.Tc2.state + (T.Tc2.at ? " @" + T.Tc2.at : ""),
          output: S.output.slice()
        };
        if (MAX > 1) { v.fill_ptr = S.fill; v.use_ptr = S.use; }
        var c = cvVars(); for (var key in c) v[key] = c[key];
        return v;
      }

      function svg() {
        var W = 360, H = 170;
        var o = '<svg viewBox="0 0 ' + W + ' ' + H + '" width="100%" style="max-width:360px" font-family="sans-serif">';
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

      function push(desc, note) {
        var pc = {}, status = {};
        for (var n in T) { pc[n] = T[n].at ? lineOf(T[n].at) : null; status[n] = T[n].state; }
        steps.push({ desc: desc, pc: pc, vars: snap(), status: status, note: note, svg: svg() });
      }
      function who(name) { return (name === "Tp" ? "생산자 " : "소비자 ") + "'''" + name + "'''"; }
      function cvq(cvName) { return "`" + cvName + "` 큐 = [" + S.cv[cvName].join(", ") + "]"; }

      // 한 thread 의 한 줄(또는 wait 에서 깨어나기)을 실행하고 step 하나를 남긴다
      function exec(name, comment, note) {
        var t = T[name];
        if (t.state === "done" || S.failed) return;
        for (var n in T) if (n !== name && T[n].state === "running") T[n].state = "ready";
        t.state = "running";
        var d = "", cvName;

        if (t.woke) {
          // wait() 에서 돌아오는 순간을 별도 step 으로
          t.woke = false;
          S.mutex = name;
          var next = useWhile ? (t.kind === "p" ? "p2" : "c2") : (t.kind === "p" ? "p4" : "c4");
          d = "스케줄러가 " + who(name) + " 을 고른다 → `wait()` 가 리턴하기 '''직전에 mutex 를 다시 잡는다'''(mutex = " + name + "). " +
            (useWhile ? "`while` 이므로 '''" + next + " 로 돌아가 조건을 다시 검사'''한다." : "`if` 였으므로 '''조건을 다시 보지 않고''' 곧장 " + next + " 로 간다.");
          t.pc = next;
          push(d + (comment ? " " + comment : ""), note);
          return;
        }

        var pc = t.pc;
        t.at = pc;
        var head = who(name) + " — " + pc + " ";
        if (pc === "p1" || pc === "c1") {
          S.mutex = name;
          d = head + "`lock(&mutex)`: 락을 잡는다 (mutex = " + name + "). 이제 다른 스레드는 락을 잡으려 하면 막힌다.";
          t.pc = pc[0] + "2";
        } else if (pc === "p2" || pc === "c2") {
          var cond = t.kind === "p" ? (S.count === MAX) : (S.count === 0);
          var ex = t.kind === "p" ? (MAX === 1 ? "count == 1" : "count == MAX") : "count == 0";
          d = head + "`" + (useWhile ? "while" : "if") + " (" + ex + ")`: 지금 count = " + S.count + " → 조건 '''" +
            (cond ? "참'''. " + (t.kind === "p" ? "버퍼가 가득 차서 넣을 수 없다 → 기다려야 한다(" + pc[0] + "3)." : "버퍼가 비어서 꺼낼 것이 없다 → 기다려야 한다(" + pc[0] + "3).")
                  : "거짓'''. " + (t.kind === "p" ? "빈 칸이 있으니 기다리지 않고 넣으러 간다(p4)." : "데이터가 있으니 기다리지 않고 꺼내러 간다(c4)."));
          t.pc = cond ? pc[0] + "3" : pc[0] + "4";
        } else if (pc === "p3" || pc === "c3") {
          cvName = waitCvOf(t);
          S.cv[cvName].push(name); S.mutex = "free"; t.state = "sleeping"; t.woke = true;
          d = head + "`wait(&" + cvName + ", &mutex)`: ① mutex 를 '''놓고'''(free) ② `" + cvName + "` 대기 큐에 들어가 '''잠든다'''. " + cvq(cvName) + ". 락을 놓았으니 이제 다른 스레드가 들어올 수 있다.";
          t.pc = pc;
        } else if (pc === "p4") {
          if (MAX === 1) { S.buffer[0] = t.i; S.count = 1; }
          else { S.buffer[S.fill] = t.i; S.fill = (S.fill + 1) % MAX; S.count++; }
          d = head + "`put(" + t.i + ")`: 버퍼에 " + t.i + " 을 넣는다 → count = " + S.count + (MAX === 1 ? " (가득 참)" : (S.count === MAX ? " (가득 참)" : "") + ", fill_ptr = " + S.fill) + ".";
          t.pc = "p5";
        } else if (pc === "c4") {
          if (S.count === 0) {
            S.failed = true; t.state = "assert fail";
            d = head + "`get()` 안의 `assert(count == 1)` 이 '''실패''' — count = 0, 즉 '''빈 버퍼에서 꺼내려 했다'''. 프로그램이 여기서 죽는다.";
            t.pc = "c4";
          } else {
            var val;
            if (MAX === 1) { val = S.buffer[0]; S.buffer[0] = "·"; S.count = 0; }
            else { val = S.buffer[S.use]; S.buffer[S.use] = "·"; S.use = (S.use + 1) % MAX; S.count--; }
            t.tmp = val;
            d = head + "`get()`: 버퍼에서 " + val + " 을 꺼낸다 → count = " + S.count + (MAX === 1 ? " (빔)" : ", use_ptr = " + S.use) + ".";
            t.pc = "c5";
          }
        } else if (pc === "p5" || pc === "c5") {
          cvName = sigCvOf(t);
          var q = S.cv[cvName];
          if (q.length) {
            var w = q.shift(); T[w].state = "ready";
            d = head + "`signal(&" + cvName + ")`: `" + cvName + "` 큐 맨 앞의 '''" + w + "''' 를 깨운다 → " + w + " 은 sleeping → '''ready'''(실행 대기). '''아직 실행되는 것은 아니고''' 락도 여전히 " + name + " 이 쥐고 있다. " + cvq(cvName) + ".";
          } else {
            d = head + "`signal(&" + cvName + ")`: `" + cvName + "` 큐가 비어 있어 '''아무 일도 일어나지 않는다''' (signal 은 저장되지 않는다).";
          }
          t.pc = pc[0] + "6";
        } else if (pc === "p6" || pc === "c6") {
          S.mutex = "free";
          d = head + "`unlock(&mutex)`: 락을 놓는다 (free).";
          if (t.kind === "c") { S.output.push(t.tmp); d += " 이어서 `printf` 로 " + t.tmp + " 을 출력하고"; }
          d += " 루프 처음(" + pc[0] + "1)으로 돌아간다.";
          t.i++;
          t.pc = pc[0] + "1";
        }
        push(d + (comment ? " " + comment : ""), note);
      }
      function run(name, n, comment, note) {
        for (var r = 0; r < n; r++) exec(name, r === n - 1 ? comment : null, r === n - 1 ? note : null);
      }

      // ---- 초기 상태 ----
      steps.push({
        desc: "'''" + FIGNAME + "''' 구현. 생산자 '''Tp''' 1명, 소비자 '''Tc1''', '''Tc2''' 2명. 버퍼는 " + MAX + "칸이고 처음엔 비어 있다(count = 0). " +
          "`put(i)` 는 버퍼에 i 를 넣고 count 를 1 올리며, `get()` 은 `assert(count == 1)` 로 비어 있지 않은지 확인한 뒤 꺼내고 count 를 1 내린다. " +
          (twoCv ? "조건 변수를 '''두 개''' 쓴다: 생산자는 `empty`(빈 칸 생김) 에서 기다리고 `fill`(데이터 생김) 에 signal, 소비자는 그 반대." :
            "조건 변수는 `cond` '''하나''' 를 생산자·소비자가 같이 쓴다. ") +
          (variant === "if_1cv" ? " 조건 검사는 `if` 다. 생산자 1 + 소비자 1 이면 잘 돌지만, 소비자가 2명이면 무너진다 — 아래 순서를 따라가 보라." : "") +
          (variant === "while_1cv" ? " `if` 를 `while` 로 바꿔 첫 번째 버그는 고쳤다. 남은 버그는 cv 가 하나라는 것." : "") +
          (!twoCv && String(opts.buffer) === "3" ? " (이 변형은 OSTEP 그림대로 MAX = 1 로 고정해 재현한다.)" : "") +
          " ▶ 는 각 스레드가 '''지금 멈춰 있는 줄''', 배지는 상태(running / ready / sleeping).",
        pc: { Tp: null, Tc1: null, Tc2: null },
        vars: snap(), status: { Tp: "ready", Tc1: "ready", Tc2: "ready" }, svg: svg()
      });

      if (variant === "if_1cv") {
        // Figure 30.9 을 그대로
        run("Tc1", 3, "(OSTEP: Nothing to get)");
        run("Tp", 3, "(Buffer now full)");
        run("Tp", 1, "(Tc1 awoken) — [[Mesa semantics]]: 깨운다는 것은 ready 큐로 옮기는 것일 뿐, Tc1 이 곧바로 달리는 것이 아니다. '''그 사이에 무슨 일이든 일어날 수 있다.'''");
        run("Tp", 3);
        run("Tp", 1, "(Buffer full; sleep) — 이제 Tc1 은 ready, Tp 는 sleeping. 스케줄러가 다음에 누구를 고를지가 문제다.");
        run("Tc2", 1, "'''Tc2 가 끼어든다(sneaks in)''' — 스케줄러가 ready 인 Tc1 대신 Tc2 를 골랐다. 락은 비어 있었으니 Tc2 가 잡는다.");
        run("Tc2", 1, "Tc2 는 잠든 적이 없으니 처음 검사다 — 데이터가 있어 통과.");
        run("Tc2", 1, "'''... 그리고 Tc1 이 받을 줄 알았던 데이터를 가로챈다(grabs data).''' 버퍼는 다시 빈다.");
        run("Tc2", 1, "(Tp awoken)");
        run("Tc2", 1);
        run("Tc1", 2, "", "Oh oh! No data — Tp 가 signal 한 시점에는 count = 1 이었지만, Tc1 이 실제로 달리는 지금은 Tc2 가 가져가서 count = 0 이다. `if` 라서 깨어난 뒤 '''count 를 다시 검사하지 않고''' c4 로 갔기 때문에 빈 버퍼에서 get 한다. Mesa semantics 에서 signal 은 '''\"상태가 바뀌었을지 모른다\" 는 힌트'''일 뿐 \"지금 조건이 참\" 이라는 보장이 아니다. 해결: `if` → `while` (Fig 30.10). 결과: assert 실패로 프로그램 중단.");
      } else if (variant === "while_1cv") {
        // Figure 30.11 을 그대로
        run("Tc1", 3, "(Nothing to get)");
        run("Tc2", 3, "Tc2 도 잠든다. 이제 cv `cond` 에 소비자 둘이 줄 서 있다.");
        run("Tp", 3, "(Buffer now full)");
        run("Tp", 1, "(Tc1 awoken)");
        run("Tp", 3);
        run("Tp", 1, "(Must sleep) — 버퍼가 찼으니 Tp 도 `cond` 에서 잠든다. 이제 `cond` 큐 = [Tc2, Tp] — '''소비자와 생산자가 같은 큐''' 에 섞여 있다. 이것이 두 번째 버그의 씨앗.");
        run("Tc1", 2, "(Recheck condition) — `while` 덕분에 '''조건을 다시 검사'''한다. 첫 번째 버그(빈 버퍼 get)는 이것으로 막힌다. 지금은 count = 1 이라 통과.");
        run("Tc1", 1, "(Tc1 grabs data)");
        run("Tc1", 1, "", "Oops! Woke Tc2 — 버퍼를 비운 소비자는 '''생산자''' 를 깨워야 하는데, cv 가 하나뿐이라 큐 맨 앞에 있던 '''다른 소비자 Tc2''' 를 깨워 버렸다. Tp 는 여전히 잔다.");
        run("Tc1", 4, "Tc1 은 다음 반복에서 버퍼가 비었으니 다시 잠든다. (Nothing to get)");
        run("Tc2", 2, "Tc2 가 깨어나 다시 검사하지만 버퍼는 비어 있다(count = 0).");
        run("Tc2", 1, "", "Everyone asleep... — Tp, Tc1, Tc2 '''셋 다 cv `cond` 에서 잠들었고''' 깨워 줄 스레드가 하나도 없다. 결과: 영원히 멈춤(교수님: \"active thread 가 없어 시스템이 멈춘다\"). 해결: 조건 변수를 `empty` / `fill` 두 개로 나눠 '''소비자는 생산자만, 생산자는 소비자만''' 깨우게 한다(Fig 30.12). 모든 대기자를 깨우는 [[broadcast]] 로도 풀리지만 비효율적이다.");
      } else if (MAX === 1) {
        // 30.11 과 같은 시작, 그러나 CV 2개라 올바르게 진행
        run("Tc1", 3, "Tc1 이 `fill` 에서 잠든다.");
        run("Tc2", 3, "Tc2 도 `fill` 에서 잠든다.");
        run("Tp", 3);
        run("Tp", 1, "`fill` 에서 기다리는 것은 '''소비자뿐'''이므로 반드시 소비자(Tc1)가 깨어난다.");
        run("Tp", 4, "버퍼가 찼으니 Tp 는 '''`empty`''' 에서 잠든다. 대기자가 cv 별로 나뉘어 있다: `empty = [Tp]`, `fill = [Tc2]`.");
        run("Tc1", 3);
        run("Tc1", 1, "", "여기가 ② 와 갈리는 지점: 소비자는 `empty` 에 signal 하는데 거기서 기다리는 것은 '''생산자뿐'''이라 반드시 Tp 가 깨어난다. 소비자가 소비자를 깨울 일이 구조적으로 없다.");
        run("Tc1", 1);
        run("Tc1", 3, "Tc1 은 다음 반복에서 버퍼가 비어 `fill` 에서 다시 잠든다.");
        run("Tp", 2, "Tp 가 `while` 로 다시 검사 → 버퍼가 비었으니 통과.");
        run("Tp", 1);
        run("Tp", 1, "`fill` 큐 맨 앞의 Tc2 를 깨운다.");
        run("Tp", 1);
        run("Tc2", 2, "Tc2 가 다시 검사 → count = 1 이라 통과.");
        run("Tc2", 3, "Tc2 가 1 을 꺼내 출력한다.");
        run("Tp", 1);
        run("Tp", 2);
        run("Tp", 1, "Tc1 을 깨운다.");
        run("Tp", 1);
        run("Tc1", 2);
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
        run("Tc1", 3, "Tc1 이 `use_ptr` 자리(0번 칸)의 0 을 꺼낸다 — 원형 큐라 '''먼저 들어간 것이 먼저''' 나온다.");
        run("Tc1", 2, "`empty` 에 signal → '''생산자''' Tp 가 깨어난다. 락을 풀고 0 출력.");
        run("Tp", 3, "Tp 가 다시 검사(count = 2 < MAX) 후 3 을 0번 칸에 넣는다 — 방금 비워진 칸을 재사용.");
        run("Tp", 2);
        run("Tc2", 2, "Tc2 가 깨어나 다시 검사(count = 3) → 통과.");
        run("Tc2", 3, "Tc2 가 1번 칸의 1 을 꺼내 출력.");
        run("Tc1", 5, "Tc1 이 2번 칸의 2 를 꺼내 출력.");
        run("Tc2", 5, "Tc2 가 0번 칸의 3 을 꺼내 출력. `use_ptr` 도 한 바퀴 돌았다.", "결과: 정상. 출력 0, 1, 2, 3 — 넣은 순서대로 나왔다. MAX 칸 버퍼에서는 생산자가 소비자를 기다리지 않고 여러 개를 미리 넣어 두므로 문맥 교환이 줄어 '''동시성과 효율이 좋아진다'''. 동기화 규칙은 MAX=1 과 같다: `while` + cv 두 개(`empty`/`fill`).");
      }

      var panels = [
        { id: "Tp", title: "생산자 Tp", lang: "c", lines: prodCode(variant, MAX) },
        { id: "Tc1", title: "소비자 Tc1", lang: "c", lines: consCode(variant) },
        { id: "Tc2", title: "소비자 Tc2", lang: "c", lines: consCode(variant) }
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
        vars.push({ name: "cv.empty", label: "cv empty 대기 큐 (생산자가 잠드는 곳)", group: "동기화" });
        vars.push({ name: "cv.fill", label: "cv fill 대기 큐 (소비자가 잠드는 곳)", group: "동기화" });
      } else {
        vars.push({ name: "cv.cond", label: "cv cond 대기 큐 (모두 같이 잠드는 곳)", group: "동기화" });
      }
      vars.push({ name: "Tp", label: "Tp 상태 @멈춘 줄", group: "스레드" });
      vars.push({ name: "Tc1", label: "Tc1 상태 @멈춘 줄", group: "스레드" });
      vars.push({ name: "Tc2", label: "Tc2 상태 @멈춘 줄", group: "스레드" });
      vars.push({ name: "output", label: "출력", group: "출력" });

      return { panels: panels, vars: vars, steps: steps };
    }
  };
})(typeof window !== "undefined" ? window : globalThis);
