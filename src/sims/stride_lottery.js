// stride_lottery — Stride(pass/stride 표) vs Lottery(시드 고정 추첨)
// 6강 p.24~p.27 의 티켓 A=100 / B=50 / C=250 예제와 pass 표를 그대로 재현한다.
window.SIMS = window.SIMS || {};

(function () {
  var BIG = 10000;                       // 슬라이드: stride = 10,000 / tickets
  var SEED = 20250923;                   // 고정 시드 (퀴즈1 날짜). 같은 옵션이면 항상 같은 결과.
  var BASE = [
    { id: "A", tickets: 100, color: "#3b82f6" },
    { id: "B", tickets: 50, color: "#10b981" },
    { id: "C", tickets: 250, color: "#f59e0b" }
  ];
  var NEWP = { id: "D", tickets: 100, color: "#a855f7" };

  var P_STRIDE = {
    id: "STRIDE", title: "Stride 스케줄링 의사코드 (6강 p.23)", lang: "c",
    lines: [
      "stride_i  = 10000 / tickets_i;          // 티켓이 많을수록 stride 가 작다",
      "current   = remove_min(queue);          // pass 가 최소인 프로세스",
      "schedule(current);                      // 한 quantum 실행",
      "current->pass += current->stride;       // pass 를 stride 만큼 전진",
      "insert(queue, current);                 // 다시 큐에 넣는다"
    ]
  };
  var P_LOTTERY = {
    id: "LOTTERY", title: "Lottery 스케줄링 구현 (6강 p.17)", lang: "c",
    lines: [
      "int counter = 0;",
      "int winner  = getrandom(0, totaltickets);   // 0 ~ 399",
      "node_t *current = head;                     // A -> B -> C",
      "while (current) {",
      "    counter = counter + current->tickets;",
      "    if (counter > winner)",
      "        break;                              // 당첨자 발견",
      "    current = current->next;",
      "}",
      "// 'current' 가 당첨자: schedule(current);"
    ]
  };

  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;"); }
  function fmt(x) { return (Math.round(x * 10) / 10).toString(); }

  // ---------------- SVG ----------------
  function passSvg(procs, minIdx, ranIdx) {
    var W = 760, rowH = 26, gap = 10, top = 24;
    var H = top + procs.length * (rowH + gap) + 16;
    var maxPass = 1;
    procs.forEach(function (p) { maxPass = Math.max(maxPass, p.pass); });
    var L = 118, R = 700, sc = (R - L) / Math.max(maxPass, 1);
    var o = ['<svg viewBox="0 0 ' + W + ' ' + H + '" width="100%" style="max-width:760px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace">'];
    o.push('<text x="4" y="14" font-size="11" fill="#8b95a5">pass 값 (작을수록 먼저 뽑힘 — 빨간 테두리가 이번 최소)</text>');
    procs.forEach(function (p, i) {
      var y = top + i * (rowH + gap);
      o.push('<text x="4" y="' + (y + 18) + '" font-size="11" fill="' + p.color + '" font-weight="bold">' + esc(p.id) + '</text>');
      o.push('<text x="20" y="' + (y + 18) + '" font-size="10" fill="#8b95a5">tix ' + p.tickets + ' / stride ' + p.stride + '</text>');
      o.push('<rect x="' + L + '" y="' + y + '" width="' + (R - L) + '" height="' + rowH +
        '" fill="#8b95a5" fill-opacity="0.07" stroke="#8b95a5" stroke-opacity="0.2"/>');
      var w = Math.max(2, p.pass * sc);
      o.push('<rect x="' + L + '" y="' + y + '" width="' + w.toFixed(1) + '" height="' + rowH +
        '" fill="' + p.color + '" fill-opacity="' + (i === ranIdx ? "0.9" : "0.45") + '"/>');
      if (i === minIdx) {
        o.push('<rect x="' + (L - 2) + '" y="' + (y - 2) + '" width="' + (R - L + 4) + '" height="' + (rowH + 4) +
          '" fill="none" stroke="#ef4444" stroke-width="2" rx="3"/>');
      }
      o.push('<text x="' + (L + w + 6).toFixed(1) + '" y="' + (y + 18) + '" font-size="11" fill="' + p.color + '">' + p.pass + '</text>');
      o.push('<text x="' + (R + 6) + '" y="' + (y + 18) + '" font-size="10" fill="#8b95a5">' + p.runs + '회</text>');
    });
    o.push("</svg>");
    return o.join("");
  }

  function lotterySvg(procs, total, winner, winIdx, draws) {
    var W = 760, barY = 40, barH = 40;
    var H = 150;
    var L = 20, R = 740, sc = (R - L) / total;
    var o = ['<svg viewBox="0 0 ' + W + ' ' + H + '" width="100%" style="max-width:760px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace">'];
    o.push('<text x="' + L + '" y="18" font-size="11" fill="#8b95a5">티켓 구간 (전체 ' + total + '장). 빨간 화살표 = 이번에 뽑힌 번호</text>');
    var acc = 0;
    procs.forEach(function (p, i) {
      var x0 = L + acc * sc, w = p.tickets * sc;
      o.push('<rect x="' + x0.toFixed(1) + '" y="' + barY + '" width="' + w.toFixed(1) + '" height="' + barH +
        '" fill="' + p.color + '" fill-opacity="' + (i === winIdx ? "0.9" : "0.35") + '" stroke="' + p.color + '"/>');
      o.push('<text x="' + (x0 + w / 2).toFixed(1) + '" y="' + (barY + 18) + '" font-size="12" font-weight="bold" fill="' +
        (i === winIdx ? "#fff" : p.color) + '" text-anchor="middle">' + esc(p.id) + '</text>');
      o.push('<text x="' + (x0 + w / 2).toFixed(1) + '" y="' + (barY + 33) + '" font-size="9" fill="' +
        (i === winIdx ? "#fff" : "#8b95a5") + '" text-anchor="middle">' + acc + '~' + (acc + p.tickets - 1) + '</text>');
      acc += p.tickets;
    });
    if (winner >= 0) {
      var wx = L + winner * sc;
      o.push('<polygon points="' + wx.toFixed(1) + ',' + (barY - 3) + ' ' + (wx - 6).toFixed(1) + ',' + (barY - 15) +
        ' ' + (wx + 6).toFixed(1) + ',' + (barY - 15) + '" fill="#ef4444"/>');
      o.push('<text x="' + wx.toFixed(1) + '" y="' + (barY - 19) + '" font-size="11" fill="#ef4444" text-anchor="middle">' + winner + '</text>');
    }
    // 지금까지의 당첨 기록
    o.push('<text x="' + L + '" y="' + (barY + barH + 22) + '" font-size="10" fill="#8b95a5">추첨 기록:</text>');
    draws.forEach(function (d, i) {
      var x = L + 72 + i * 44;
      if (x > R - 40) return;
      o.push('<rect x="' + x + '" y="' + (barY + barH + 10) + '" width="40" height="18" rx="3" fill="' + d.color + '" fill-opacity="0.3" stroke="' + d.color + '"/>');
      o.push('<text x="' + (x + 20) + '" y="' + (barY + barH + 23) + '" font-size="10" fill="' + d.color + '" text-anchor="middle">' + d.n + '→' + d.id + '</text>');
    });
    o.push("</svg>");
    return o.join("");
  }

  SIMS["stride_lottery"] = {
    title: "Stride vs Lottery 스케줄링",
    desc: "[[Stride 스케줄링]] 의 [[pass]]/[[stride]] 표를 슬라이드 그대로 단계별로 돌려보고, [[Lottery 스케줄링]] 은 시드를 고정한 난수(seed = " + SEED + ")로 추첨해 '확률적으로만 공정하다'는 걸 확인한다. [[tickets]] A=100 · B=50 · C=250.",
    options: [
      {
        key: "policy", label: "정책", values: [
          { value: "stride", label: "Stride (결정적)" },
          { value: "lottery", label: "Lottery (확률적)" }
        ]
      },
      {
        key: "join", label: "새 프로세스 D 합류 (stride 전용)", values: [
          { value: "no", label: "없음" },
          { value: "zero", label: "pass = 0 으로 합류 (독점 문제)" },
          { value: "min", label: "pass = min(pass) 로 합류 (해결)" }
        ]
      }
    ],

    build: function (opts) {
      var policy = opts.policy || "stride";
      return policy === "lottery" ? buildLottery() : buildStride(opts.join || "no");
    }
  };

  // ---------------- Stride ----------------
  function buildStride(join) {
    var procs = BASE.map(function (p) {
      return { id: p.id, tickets: p.tickets, color: p.color, stride: BIG / p.tickets, pass: 0, runs: 0 };
    });
    var vars = [
      { name: "time slice #", group: "스케줄러" },
      { name: "min pass", group: "스케줄러" },
      { name: "who runs", group: "스케줄러" }
    ];
    function addVars(p) {
      vars.push({ name: p.id + ".tickets", group: "프로세스 " + p.id });
      vars.push({ name: p.id + ".stride", group: "프로세스 " + p.id });
      vars.push({ name: p.id + ".pass", group: "프로세스 " + p.id });
      vars.push({ name: p.id + ".runs", group: "프로세스 " + p.id });
    }
    procs.forEach(addVars);
    if (join !== "no") addVars(NEWP);
    vars.push({ name: "실행 비율", group: "검증" });
    vars.push({ name: "티켓 비율", group: "검증" });

    var joined = (join === "no");
    function snapshot(slice, minIdx, ranIdx) {
      var v = {
        "time slice #": slice,
        "min pass": minIdx < 0 ? "—" : procs[minIdx].pass,
        "who runs": ranIdx < 0 ? "—" : procs[ranIdx].id
      };
      procs.forEach(function (p) {
        v[p.id + ".tickets"] = p.tickets;
        v[p.id + ".stride"] = p.stride;
        v[p.id + ".pass"] = p.pass;
        v[p.id + ".runs"] = p.runs;
      });
      if (join !== "no" && !joined) {
        v["D.tickets"] = NEWP.tickets; v["D.stride"] = BIG / NEWP.tickets;
        v["D.pass"] = "— (아직 미합류)"; v["D.runs"] = 0;
      }
      var g = gcdAll(procs.map(function (p) { return p.runs; }));
      v["실행 비율"] = procs.map(function (p) { return p.id + ":" + (g ? p.runs / g : p.runs); }).join(" : ");
      var gt = gcdAll(procs.map(function (p) { return p.tickets; }));
      v["티켓 비율"] = procs.map(function (p) { return p.id + ":" + p.tickets / gt; }).join(" : ");
      return v;
    }

    var steps = [];
    steps.push({
      desc: "[[tickets]] A=100, B=50, C=250. [[stride]] = 10,000 / tickets 이므로 '''A=100, B=200, C=40'''. " +
        "'''티켓이 많을수록 stride 가 작다''' → [[pass]] 가 천천히 늘어 자주 뽑힌다. 모든 pass 는 0 에서 시작한다 " +
        "(pass 가 같으면 결정적으로 고를 수 없어서, 여기서는 A→B→C 순으로 tie-break 한다).",
      pc: { STRIDE: 1 },
      vars: snapshot(0, -1, -1),
      svg: passSvg(procs, -1, -1)
    });

    var N = (join === "no") ? 16 : 24, joinAt = 16;
    for (var s = 1; s <= N; s++) {
      if (!joined && s === joinAt + 1) {
        var minPass = Math.min.apply(null, procs.map(function (p) { return p.pass; }));
        var initPass = (join === "zero") ? 0 : minPass;
        procs.push({ id: NEWP.id, tickets: NEWP.tickets, color: NEWP.color, stride: BIG / NEWP.tickets, pass: initPass, runs: 0 });
        joined = true;
        steps.push({
          desc: "⚠ '''새 프로세스 D 합류''' (tickets 100 → stride 100). pass 를 " +
            (join === "zero"
              ? "'''0''' 으로 초기화했다. 기존 A·B·C 의 pass 는 이미 " + minPass + " 이므로 D 의 pass 가 " + minPass +
              " 이 될 때까지 '''D 만 연속으로 실행'''된다 — 슬라이드 p.27 이 지적한 stride 의 전역 상태(global state) 문제."
              : "'''현재 최소 pass(" + minPass + ")''' 로 맞췄다. 이러면 D 가 독점하지 않고 바로 정상적인 비례 배분에 합류한다 — 이게 실제 구현의 해법."),
          pc: { STRIDE: 5 },
          vars: snapshot(s - 1, -1, -1),
          note: join === "zero" ? "pass=0 초기화 → CPU 독점. 이래서 lottery 는 '전역 상태가 없다'는 장점을 갖는다." : null,
          svg: passSvg(procs, -1, -1)
        });
      }
      var mi = 0;
      for (var i = 1; i < procs.length; i++) if (procs[i].pass < procs[mi].pass) mi = i;
      var before = procs.map(function (p) { return p.pass; });
      var p = procs[mi];
      var d = "'''slice " + s + "''' — pass = (" +
        procs.map(function (q, k) { return q.id + ":" + before[k]; }).join(", ") +
        ") 중 최소는 '''" + p.id + "(" + before[mi] + ")''' → '''" + p.id + " 실행'''. " +
        "실행 후 pass(" + p.id + ") += stride(" + p.stride + ") → " + (before[mi] + p.stride) + ".";
      p.pass += p.stride; p.runs++;
      if (s === 8 && join === "no") d += " 여기까지 8 슬라이스: A 2회, B 1회, C 5회 = '''2 : 1 : 5''' 로 티켓 비(100:50:250)와 정확히 일치한다.";
      steps.push({
        desc: d,
        pc: { STRIDE: 4 },
        vars: snapshot(s, mi, mi),
        svg: passSvg(procs, mi, mi)
      });
    }

    var tail = (join === "zero")
      ? "D 가 pass 400 에 도달할 때까지 4 슬라이스를 연속으로 먹었다. [[Lottery 스케줄링]] 은 pass 같은 전역 상태가 없어 이런 보정 문제 자체가 없다 (6강 p.27, 퀴즈1 출제 포인트)."
      : (join === "min")
        ? "D 를 min pass 로 넣으니 독점 없이 곧바로 티켓 비율대로 나눠 갖는다."
        : "16 슬라이스 후 A:B:C = 4:2:10 = '''2:1:5'''. Stride 는 '''사이클이 끝날 때마다 비율이 정확히''' 맞는다 — lottery 와의 결정적 차이.";
    steps.push({
      desc: "'''정리''' — " + tail,
      pc: { STRIDE: 2 },
      vars: snapshot(N, -1, -1),
      svg: passSvg(procs, -1, -1)
    });

    return { panels: [P_STRIDE], vars: vars, steps: steps };
  }

  function gcdAll(arr) {
    function g(a, b) { return b ? g(b, a % b) : a; }
    var r = 0; arr.forEach(function (x) { r = g(r, x); });
    return r || 1;
  }

  // ---------------- Lottery ----------------
  function buildLottery() {
    var procs = BASE.map(function (p) {
      return { id: p.id, tickets: p.tickets, color: p.color, runs: 0 };
    });
    var total = procs.reduce(function (a, p) { return a + p.tickets; }, 0);   // 400
    var rnd = mulberry32(SEED);
    var N = 15;

    var ranges = [], acc = 0;
    procs.forEach(function (p) { ranges.push({ lo: acc, hi: acc + p.tickets - 1 }); acc += p.tickets; });

    var vars = [
      { name: "draw #", group: "추첨" },
      { name: "winning ticket", group: "추첨" },
      { name: "winner", group: "추첨" },
      { name: "counter (코드 8행)", group: "추첨" }
    ];
    procs.forEach(function (p, i) {
      vars.push({ name: p.id + ".tickets", group: "프로세스 " + p.id });
      vars.push({ name: p.id + ".ticket 구간", group: "프로세스 " + p.id });
      vars.push({ name: p.id + ".runs", group: "프로세스 " + p.id });
      vars.push({ name: p.id + ".실제 비율", group: "프로세스 " + p.id });
      vars.push({ name: p.id + ".기대 비율", group: "프로세스 " + p.id });
    });

    function snapshot(k, winner, winIdx, counter) {
      var v = {
        "draw #": k,
        "winning ticket": winner < 0 ? "—" : winner + " / " + total,
        "winner": winIdx < 0 ? "—" : procs[winIdx].id,
        "counter (코드 8행)": counter < 0 ? "—" : counter
      };
      var done = procs.reduce(function (a, p) { return a + p.runs; }, 0) || 1;
      procs.forEach(function (p, i) {
        v[p.id + ".tickets"] = p.tickets;
        v[p.id + ".ticket 구간"] = ranges[i].lo + " ~ " + ranges[i].hi;
        v[p.id + ".runs"] = p.runs;
        v[p.id + ".실제 비율"] = fmt(100 * p.runs / done) + " %";
        v[p.id + ".기대 비율"] = fmt(100 * p.tickets / total) + " %";
      });
      return v;
    }

    var steps = [], draws = [];
    steps.push({
      desc: "[[Lottery 스케줄링]] — 티켓 400장을 A(0~99), B(100~149), C(150~399) 로 나눠 갖는다. " +
        "매 슬라이스마다 0~399 중 하나를 뽑아, 슬라이드 p.17 의 리스트 순회 코드로 '''counter 가 winner 보다 커지는 순간의 노드'''가 당첨자다. " +
        "여기서는 시드 " + SEED + " 의 고정 PRNG(mulberry32)를 쓰므로 매번 같은 결과가 나온다.",
      pc: { LOTTERY: 2 },
      vars: snapshot(0, -1, -1, -1),
      svg: lotterySvg(procs, total, -1, -1, draws)
    });

    for (var k = 1; k <= N; k++) {
      var w = Math.floor(rnd() * total);
      var counter = 0, wi = 0;
      for (var i = 0; i < procs.length; i++) {
        counter += procs[i].tickets;
        if (counter > w) { wi = i; break; }
      }
      procs[wi].runs++;
      draws.push({ n: w, id: procs[wi].id, color: procs[wi].color });
      steps.push({
        desc: "'''draw " + k + "''' — winner = " + w + ". 리스트를 A→B→C 로 돌며 counter 를 더하면 " +
          "counter = " + counter + " 에서 처음으로 " + w + " 를 넘는다 → '''" + procs[wi].id + " 당첨''' " +
          "(" + procs[wi].id + " 의 구간 " + ranges[wi].lo + "~" + ranges[wi].hi + " 안에 들어왔다).",
        pc: { LOTTERY: 6 },
        vars: snapshot(k, w, wi, counter),
        svg: lotterySvg(procs, total, w, wi, draws)
      });
    }

    var actual = procs.map(function (p) { return p.id + " " + p.runs + "회(" + fmt(100 * p.runs / N) + "%)"; }).join(", ");
    var expect = procs.map(function (p) { return p.id + " " + fmt(100 * p.tickets / total) + "%"; }).join(", ");
    steps.push({
      desc: "'''정리''' — " + N + "회 추첨 결과: " + actual + ". 기대치는 " + expect + ". " +
        "짧게 돌리면 비율이 어긋나지만, '''오래 돌릴수록''' 기대치에 수렴한다 (6강 p.19~p.20 의 fairness metric F). " +
        "[[Stride 스케줄링]] 은 같은 상황에서 사이클마다 정확히 2:1:5 를 맞춘다 — lottery 는 '''확률적으로만 공정'''하다. " +
        "대신 lottery 는 [[pass]] 같은 '''전역 상태가 없어''' 새 프로세스가 끼어들 때 보정할 값이 없다는 장점이 있다.",
      pc: { LOTTERY: 10 },
      vars: snapshot(N, -1, -1, -1),
      svg: lotterySvg(procs, total, -1, -1, draws)
    });

    return { panels: [P_LOTTERY], vars: vars, steps: steps };
  }
})();
