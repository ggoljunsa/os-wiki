// ============================================================
// bounded_buffer — 생산자/소비자, 버퍼 3칸 + 두 조건 변수 empty·fill (OSTEP ch.30, Fig 30.12~30.14)
// 시간축(초): 0 초기 → 1 C1 wait(&fill) → 2.2 P put(A)·signal(&fill) → 3.4 put(B) → 4.4 put(C) count 3
//   → 5.4 P wait(&empty) → 6.6 C1 get(A) → 7.8 C1 signal(&empty) → 8.8 P put(D) → 10 C2 get(B) → 12 끝
// ============================================================
window.ANIMS = window.ANIMS || {};
ANIMS["bounded_buffer"] = {
  title: "bounded buffer — 생산자는 empty 에서, 소비자는 fill 에서 잔다",
  desc: "버퍼 3칸(MAX = 3), fill/use 포인터와 count. 생산자 P 는 while (count == MAX) 이면 empty 에서, 소비자 C1·C2 는 while (count == 0) 이면 fill 에서 잔다. 넣은 쪽은 fill 을, 뺀 쪽은 empty 를 signal — [[producer-consumer]] 문제에 cv 를 두 개 쓰는 이유",
  duration: 12,
  build: function () {
    var C = {
      a: "#1d65b3", aL: "#dbe8f7",
      b: "#2e9e4f", bL: "#dff3e4",
      c: "#e09a40", cL: "#fdeec2",
      cpu: "#3b2f4a", cpuL: "#efe9f6",
      hw: "#d6465f", muted: "#777", slp: "#3c3c88"
    };
    var BADGE = {
      running: ["#cdefd2", "#1d6b2a"], ready: ["#fdeec2", "#8a6000"],
      blocked: ["#dcdcf2", "#3c3c88"], idle: ["#eeeeee", "#666666"]
    };
    var D = 12;
    function box(x, y, w, h, fill, stroke, extra) {
      return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="8" fill="' + fill + '" stroke="' + stroke + '" stroke-width="2"' + (extra || "") + '/>';
    }
    function txt(x, y, s, size, fill, extra) {
      var anchor = /text-anchor/.test(extra || "") ? "" : ' text-anchor="middle"';
      return '<text x="' + x + '" y="' + y + '" font-size="' + (size || 13) + '" fill="' + (fill || "#222") + '"' + anchor + (extra || "") + '>' + s + '</text>';
    }
    function mono(x, y, s, size, fill, extra) {
      return txt(x, y, s, size, fill, ' font-family="ui-monospace, Menlo, Consolas, monospace"' + (extra || ""));
    }
    function show(from, to) {
      return '<animate attributeName="opacity" values="0;0;1;1;0;0" keyTimes="0;' + (from / D).toFixed(4) + ';' + (from / D + 0.01).toFixed(4) + ';' + (to / D).toFixed(4) + ';' + Math.min(1, to / D + 0.01).toFixed(4) + ';1" dur="' + D + 's" fill="freeze"/>';
    }
    function during(from, to, inner) { return '<g opacity="0">' + inner + show(from, to) + '</g>'; }
    function badge(cx, y, kind, label) {
      var c = BADGE[kind];
      return box(cx - 80, y, 160, 22, c[0], c[1]) + txt(cx, y + 16, label, 12, c[1], ' font-weight="700"');
    }
    function mv(pts) {
      var v = [], k = [];
      if (pts[0][0] > 0) { v.push(pts[0][1] + "," + pts[0][2]); k.push(0); }
      pts.forEach(function (p) { v.push(p[1] + "," + p[2]); k.push(+(p[0] / D).toFixed(4)); });
      var last = pts[pts.length - 1];
      if (last[0] < D) { v.push(last[1] + "," + last[2]); k.push(1); }
      return '<animateTransform attributeName="transform" type="translate" values="' + v.join(";") + '" keyTimes="' + k.join(";") + '" dur="' + D + 's" fill="freeze"/>';
    }
    function arrow(d, col) {
      return '<path d="' + d + '" fill="none" stroke="' + col + '" stroke-width="2.5" marker-end="url(#bb_arrow)"/>';
    }
    function chip(x, y, label, col) {
      return box(x, y, 40, 20, col, col) + txt(x + 20, y + 15, label, 11, "#fff", ' font-weight="700"');
    }

    var s = '<svg viewBox="0 0 760 380" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="bounded buffer 생산자 소비자 애니메이션">';
    s += '<defs><marker id="bb_arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#555"/></marker></defs>';

    // ---- 단계 자막 ----
    [
      [0, 1, "초기 상태: buffer 비어 있음 — count = 0, fill = use = 0"],
      [1, 2.2, "C1: while (count == 0) 참 → wait(&amp;fill, &amp;m): fill 에서 잔다"],
      [2.2, 3.4, "P: put(A) → count = 1 → signal(&amp;fill): 잠든 C1 을 깨운다 (ready)"],
      [3.4, 4.4, "P: put(B) → count = 2 (fill 포인터 한 칸 전진)"],
      [4.4, 5.4, "P: put(C) → count = 3 = MAX, fill = (2+1) % 3 = 0"],
      [5.4, 6.6, "P: 4번째 put — while (count == MAX) 참 → wait(&amp;empty, &amp;m)"],
      [6.6, 7.8, "C1: 락 재획득 → while 재검사 (3 ≠ 0) → get() = A, count = 2"],
      [7.8, 8.8, "C1: signal(&amp;empty) → 빈 칸을 기다리던 P 를 깨운다"],
      [8.8, 10, "P: 재검사 (2 ≠ 3) → put(D) 를 0번 칸에 → count = 3, signal(&amp;fill)"],
      [10, 10.8, "C2: get() = B, count = 2, use → 2 → signal(&amp;empty)"],
      [10.8, 12, "넣은 쪽은 fill 을, 뺀 쪽은 empty 를 signal — 항상 상대편을 깨운다"]
    ].forEach(function (c) { s += during(c[0], c[1], txt(380, 26, c[2], 14, "#222", ' font-weight="700"')); });

    // ---- 스레드 박스 ----
    // P (왼쪽)
    s += box(20, 46, 190, 190, C.aL, C.a);
    s += txt(32, 68, "P (producer)", 14, C.a, ' font-weight="700" text-anchor="start"');
    s += txt(115, 132, "지금 실행 중인 코드", 10, C.muted);
    s += box(28, 138, 174, 48, "#fff", "#c9c9c9");
    // C1, C2 (오른쪽)
    function cons(y, name) {
      var g = box(550, y, 190, 94, C.bL, C.b);
      g += txt(562, y + 20, name, 14, C.b, ' font-weight="700" text-anchor="start"');
      g += box(558, y + 52, 174, 36, "#fff", "#c9c9c9");
      return g;
    }
    s += cons(46, "C1 (consumer)");
    s += cons(146, "C2 (consumer)");

    function pcode(from, to, l1, l2, col) {
      s += during(from, to, mono(115, 158, l1, 11, col || "#222", ' font-weight="700"') + (l2 ? mono(115, 176, l2, 10, C.muted) : ""));
    }
    function ccode(y, from, to, l1, l2, col) {
      s += during(from, to, mono(645, y + 67, l1, 11, col || "#222", ' font-weight="700"') + (l2 ? mono(645, y + 82, l2, 10, C.muted) : ""));
    }
    pcode(0, 2.2, "(차례 대기)", "");
    pcode(2.2, 3.4, "put(A); // count 1", "signal(&amp;fill);", C.a);
    pcode(3.4, 4.4, "put(B); // count 2", "signal(&amp;fill); // 대기자 없음");
    pcode(4.4, 5.4, "put(C); // count 3", "signal(&amp;fill); // 대기자 없음");
    pcode(5.4, 5.9, "while (count == MAX)", "// 3 == 3 → 참");
    pcode(5.9, 8.8, "cond_wait(&amp;empty, &amp;m);", "// 빈 칸 기다리며 잠듦", C.slp);
    pcode(8.8, 10, "put(D); // count 3", "// 재검사 2 ≠ 3 → 통과", C.a);
    pcode(10, 12, "unlock(&amp;m);", "// 다음 put 준비");
    ccode(46, 0, 1, "(차례 대기)", "");
    ccode(46, 1, 1.6, "while (count == 0)", "// 0 == 0 → 참");
    ccode(46, 1.6, 6.6, "cond_wait(&amp;fill, &amp;m);", "// 찬 칸 기다리며 잠듦", C.slp);
    ccode(46, 6.6, 7.8, "tmp = get(); // A", "// 재검사 3 ≠ 0 → 통과", "#1d6b2a");
    ccode(46, 7.8, 8.8, "signal(&amp;empty);", "// P 깨우기", C.hw);
    ccode(46, 8.8, 12, "unlock(&amp;m);", "// A 소비");
    ccode(146, 0, 10, "(차례 대기)", "");
    ccode(146, 10, 10.8, "tmp = get(); // B", "signal(&amp;empty); // 대기자 없음", "#1d6b2a");
    ccode(146, 10.8, 12, "unlock(&amp;m);", "// B 소비");

    // 배지
    [[0, 2.2, "ready", "ready"], [2.2, 5.9, "running", "running"], [5.9, 8.2, "blocked", "blocked (empty)"],
     [8.2, 8.8, "ready", "ready · 락 대기"], [8.8, 10, "running", "running"], [10, 12, "ready", "ready"]].forEach(function (b) {
      s += during(b[0], b[1], badge(115, 96, b[2], b[3]));
    });
    [[0, 1, "ready", "ready"], [1, 1.6, "running", "running"], [1.6, 2.8, "blocked", "blocked (fill)"],
     [2.8, 6.6, "ready", "ready · 락 대기"], [6.6, 8.8, "running", "running"], [8.8, 12, "idle", "A 소비 완료"]].forEach(function (b) {
      s += during(b[0], b[1], badge(645, 72, b[2], b[3]));
    });
    [[0, 10, "ready", "ready"], [10, 10.8, "running", "running"], [10.8, 12, "idle", "B 소비 완료"]].forEach(function (b) {
      s += during(b[0], b[1], badge(645, 172, b[2], b[3]));
    });

    // ---- buffer ----
    var SX = [270, 345, 420];                       // 슬롯 x (폭 70) → 중심 305, 380, 455
    s += txt(262, 114, "buffer", 12, "#333", ' font-weight="700" text-anchor="end"');
    s += txt(262, 128, "[MAX=3]", 10, C.muted, ' text-anchor="end"');
    SX.forEach(function (x, i) {
      s += box(x, 92, 70, 50, "#fff", "#555");
      s += txt(x + 9, 106, String(i), 10, C.muted);
    });
    function item(i, from, to, label) {
      s += during(from, to, box(SX[i] + 12, 104, 46, 30, C.cL, C.c) + txt(SX[i] + 35, 125, label, 15, "#8a6000", ' font-weight="700"'));
    }
    item(0, 2.5, 7.1, "A"); item(1, 3.7, 10.3, "B"); item(2, 4.7, 12, "C"); item(0, 9.1, 12, "D");
    // fill 포인터 (위) / use 포인터 (아래)
    [[0, 2.8, 0], [2.8, 3.9, 1], [3.9, 4.9, 2], [4.9, 9.4, 0], [9.4, 12, 1]].forEach(function (p) {
      s += during(p[0], p[1], txt(SX[p[2]] + 35, 86, "fill ▼", 12, C.a, ' font-weight="700"'));
    });
    [[0, 7.2, 0], [7.2, 10.4, 1], [10.4, 12, 2]].forEach(function (p) {
      s += during(p[0], p[1], txt(SX[p[2]] + 35, 158, "▲ use", 12, C.b, ' font-weight="700"'));
    });
    // count
    s += box(290, 168, 180, 50, C.cpuL, C.cpu);
    s += mono(365, 192, "count =", 14, C.cpu, ' font-weight="700"');
    [[0, 2.8, "0"], [2.8, 3.9, "1"], [3.9, 4.9, "2"], [4.9, 7.2, "3"], [7.2, 9.4, "2"], [9.4, 10.4, "3"], [10.4, 12, "2"]].forEach(function (v) {
      s += during(v[0], v[1], txt(430, 194, v[2], 20, v[2] === "3" ? C.hw : (v[2] === "0" ? C.slp : "#222"), ' font-weight="700"'));
    });
    s += txt(380, 211, "모든 동작은 mutex m 을 쥔 채", 10, C.muted);

    // ---- 두 조건 변수 큐 ----
    function cvq(x, name, sub) {
      var g = box(x, 252, 350, 50, C.cpuL, C.slp);
      g += mono(x + 12, 272, name, 13, C.slp, ' font-weight="700" text-anchor="start"');
      g += txt(x + 12, 291, sub, 10, C.muted, ' text-anchor="start"');
      return g;
    }
    s += cvq(20, "cond_t empty", "빈 칸을 기다리는 생산자가 자는 곳");
    s += box(250, 262, 100, 30, "#fff", "#999", ' stroke-dasharray="4 3"');
    s += cvq(390, "cond_t fill", "찬 칸을 기다리는 소비자가 자는 곳");
    s += box(620, 262, 100, 30, "#fff", "#999", ' stroke-dasharray="4 3"');
    s += during(0, 6.1, txt(300, 282, "(비어 있음)", 10, C.muted));
    s += during(8.5, 12, txt(300, 282, "(비어 있음)", 10, C.muted));
    s += during(0, 1.8, txt(670, 282, "(비어 있음)", 10, C.muted));
    s += during(3.1, 12, txt(670, 282, "(비어 있음)", 10, C.muted));

    // ---- 스레드 토큰: 잠들면 cv 큐로, 깨면 제자리로 ----
    s += '<g>' + chip(160, 52, "P", C.a) + mv([[0, 0, 0], [5.9, 0, 0], [6.4, 120, 215], [8.2, 120, 215], [8.7, 0, 0]]) + '</g>';
    s += '<g>' + chip(690, 52, "C1", C.b) + mv([[0, 0, 0], [1.6, 0, 0], [2.1, -40, 215], [2.8, -40, 215], [3.3, 0, 0]]) + '</g>';
    s += chip(690, 152, "C2", C.b);
    s += during(2.1, 2.9, '<text x="598" y="283" font-size="14" fill="' + C.slp + '" font-weight="700">z</text>');
    s += during(6.4, 8.2, '<text x="226" y="283" font-size="14" fill="' + C.slp + '" font-weight="700">z z</text>');

    // ---- 화살표 ----
    // put: P → 슬롯
    [[2.2, 3.4, 0], [3.4, 4.4, 1], [4.4, 5.4, 2], [8.8, 10, 0]].forEach(function (a) {
      var cx = SX[a[2]] + 35;
      s += during(a[0], a[1], arrow("M210,110 C235,60 " + (cx - 45) + ",60 " + (cx - 28) + ",90", C.a));
    });
    // get: 슬롯 → 소비자
    s += during(6.6, 7.8, arrow("M305,92 C320,50 500,50 548,80", C.b));
    s += during(10, 10.8, arrow("M380,142 C390,160 470,165 548,190", C.b));
    // signal(&fill): P → fill 큐 (C1 깨움)
    s += during(2.2, 3.4, arrow("M210,215 C300,245 560,238 616,272", C.hw) +
      txt(460, 240, "signal(&amp;fill)", 12, C.hw, ' font-weight="700"'));
    // signal(&empty): C1 → empty 큐 (P 깨움)
    s += during(7.8, 8.8, arrow("M548,112 C520,230 430,250 354,272", C.hw) +
      txt(285, 246, "signal(&amp;empty)", 12, C.hw, ' font-weight="700"'));
    // 4번째 put 시도 실패 표시
    s += during(5.4, 6.6, txt(115, 206, "4번째: 빈 칸 없음 ✗", 11, C.hw, ' font-weight="700"'));

    // ---- 보조 주석 ----
    s += during(2.8, 6.6, txt(380, 326, "C1 은 깨어났지만 아직 ready — 락을 다시 잡을 때까지 P 가 계속 채운다 (그래서 while 재검사)", 12, "#8a6000", ' font-weight="700"'));
    s += during(6.6, 12, txt(380, 326, "empty 에는 생산자만, fill 에는 소비자만 잔다 → signal 이 엉뚱한 쪽(같은 편)을 깨울 일이 없다", 12, C.slp, ' font-weight="700"'));

    // ---- 요점 ----
    s += txt(380, 360, "빈 칸을 기다리는 생산자는 empty에서, 찬 칸을 기다리는 소비자는 fill에서 잔다 — 두 cv를 쓰는 이유", 13, "#444", ' font-weight="700"');
    s += '</svg>';
    return s;
  }
};
