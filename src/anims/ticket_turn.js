// ============================================================
// ticket_turn — fetch-and-add 기반 ticket lock (9강 p.26~29)
// 시간축(초): 0 lock_init → 1.5 T1 번호표 0 → 3 T2 번호표 1 → 4.5 T3 번호표 2
//   → 6 T1 unlock(turn=1) → 7.5 T2 진입 → 9 T2 unlock(turn=2) → 10.5 T3 진입 → 13 끝
// ============================================================
window.ANIMS = window.ANIMS || {};
ANIMS["ticket_turn"] = {
  title: "Ticket lock — 번호표(ticket)와 전광판(turn)",
  desc: "[[fetch-and-add]]로 뽑은 '''고유한 myturn''' + unlock 마다 '''1씩''' 오르는 turn = FIFO → starvation 없음 ([[ticket lock]])",
  duration: 13,
  build: function () {
    var C = {
      a: "#1d65b3", aL: "#dbe8f7",
      b: "#2e9e4f", bL: "#dff3e4",
      c: "#e09a40", cL: "#fdeec2",
      cpu: "#3b2f4a", cpuL: "#efe9f6",
      hw: "#d6465f", os: "#e09a40", muted: "#777"
    };
    var BADGE = {
      running: ["#cdefd2", "#1d6b2a"], ready: ["#fdeec2", "#8a6000"],
      blocked: ["#dcdcf2", "#3c3c88"], spinning: ["#ffd9d9", "#a52f2f"], idle: ["#eeeeee", "#666666"]
    };
    var D = 13;
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
      return '<animate attributeName="opacity" values="0;0;1;1;0;0" keyTimes="0;' + (from / D) + ';' + (from / D + 0.01) + ';' + (to / D) + ';' + Math.min(1, to / D + 0.01) + ';1" dur="' + D + 's" fill="freeze"/>';
    }
    function during(from, to, inner) { return '<g opacity="0">' + inner + show(from, to) + '</g>'; }
    function badge(cx, y, kind, label) {
      var c = BADGE[kind];
      return box(cx - 66, y, 132, 22, c[0], c[1]) + txt(cx, y + 16, label, 12, c[1], ' font-weight="700"');
    }
    function arrow(d, col) {
      return '<path d="' + d + '" fill="none" stroke="' + col + '" stroke-width="2.5" marker-end="url(#tt_arrow)"/>';
    }

    var s = '<svg viewBox="0 0 760 340" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="ticket lock 애니메이션">';
    s += '<defs><marker id="tt_arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#555"/></marker></defs>';

    // ---- 단계 자막 ----
    [
      [0, 1.5, "lock_init(): ticket = 0, turn = 0"],
      [1.5, 3, "T1: myturn = FetchAndAdd(&amp;ticket) → 0 (ticket 은 1) · turn == myturn → 획득"],
      [3, 4.5, "T2: FetchAndAdd(&amp;ticket) → myturn 1 (ticket 2) · turn(0) != 1 → spin"],
      [4.5, 6, "T3: FetchAndAdd(&amp;ticket) → myturn 2 (ticket 3) · turn(0) != 2 → spin"],
      [6, 7.5, "T1 unlock(): FetchAndAdd(&amp;turn) → turn = 1 (\"다음 손님!\")"],
      [7.5, 9, "turn(1) == T2 의 myturn(1) → T2 획득 (T3 는 계속 대기)"],
      [9, 10.5, "T2 unlock(): FetchAndAdd(&amp;turn) → turn = 2"],
      [10.5, 13, "turn(2) == T3 의 myturn(2) → T3 획득 — 번호표 순서 그대로 (FIFO)"]
    ].forEach(function (c) { s += during(c[0], c[1], txt(380, 26, c[2], 14, "#222", ' font-weight="700"')); });

    // ---- 공유 카운터 ----
    s += box(190, 44, 170, 84, "#fff", C.cpu);
    s += mono(275, 64, "lock-&gt;ticket", 13, C.cpu, ' font-weight="700"');
    s += txt(275, 120, "(번호표 발급기)", 10, C.muted);
    [[0, 2.2, "0"], [2.2, 3.7, "1"], [3.7, 5.2, "2"], [5.2, 13, "3"]].forEach(function (v) {
      s += during(v[0], v[1], txt(275, 104, v[2], 32, C.cpu, ' font-weight="700"'));
    });
    s += box(400, 44, 170, 84, "#fff", C.hw);
    s += mono(485, 64, "lock-&gt;turn", 13, C.hw, ' font-weight="700"');
    s += txt(485, 120, "(전광판: 지금 서비스 중)", 10, C.muted);
    [[0, 6.7, "0"], [6.7, 9.7, "1"], [9.7, 13, "2"]].forEach(function (v) {
      s += during(v[0], v[1], txt(485, 104, v[2], 32, C.hw, ' font-weight="700"'));
    });

    // ---- 스레드 박스 3개 ----
    var TH = [
      { n: "Thread 1", x: 20, col: C.a, colL: C.aL },
      { n: "Thread 2", x: 275, col: C.b, colL: C.bL },
      { n: "Thread 3", x: 530, col: C.c, colL: C.cL }
    ];
    TH.forEach(function (t) {
      var cx = t.x + 105;
      s += box(t.x, 150, 210, 146, t.colL, t.col);
      s += txt(cx, 172, t.n, 15, t.col, ' font-weight="700"');
      s += mono(cx - 4, 226, "myturn =", 12, "#444", ' text-anchor="end"');
    });
    function cx(i) { return TH[i].x + 105; }
    function myturn(i, from, v) { s += during(from, D, txt(cx(i) + 16, 234, v, 26, TH[i].col, ' font-weight="700"')); }
    function check(i, from, to, str, col) { s += during(from, to, mono(cx(i), 268, str, 12, col, ' font-weight="700"')); }

    // T1
    s += during(0, 2.2, badge(cx(0), 180, "idle", "lock() 전"));
    s += during(2.2, 6, badge(cx(0), 180, "running", "running · 락 보유"));
    s += during(6, 13, badge(cx(0), 180, "idle", "unlock() 완료"));
    myturn(0, 2.2, "0");
    check(0, 2.4, 6, "turn(0) == 0 → 진입", "#1d6b2a");
    check(0, 6, 13, "끝 · 1번째로 진입", C.muted);
    // T2
    s += during(0, 3.7, badge(cx(1), 180, "idle", "lock() 전"));
    s += during(3.7, 7.5, badge(cx(1), 180, "spinning", "spinning"));
    s += during(7.5, 9, badge(cx(1), 180, "running", "running · 락 보유"));
    s += during(9, 13, badge(cx(1), 180, "idle", "unlock() 완료"));
    myturn(1, 3.7, "1");
    check(1, 3.9, 6.7, "turn(0) != 1 → spin", "#a52f2f");
    check(1, 6.7, 9, "turn(1) == 1 → 진입", "#1d6b2a");
    check(1, 9, 13, "끝 · 2번째로 진입", C.muted);
    // T3
    s += during(0, 5.2, badge(cx(2), 180, "idle", "lock() 전"));
    s += during(5.2, 10.5, badge(cx(2), 180, "spinning", "spinning"));
    s += during(10.5, 13, badge(cx(2), 180, "running", "running · 락 보유"));
    myturn(2, 5.2, "2");
    check(2, 5.4, 6.7, "turn(0) != 2 → spin", "#a52f2f");
    check(2, 6.7, 9.7, "turn(1) != 2 → spin", "#a52f2f");
    check(2, 9.7, 13, "turn(2) == 2 → 진입", "#1d6b2a");

    // ---- 화살표: 번호표 뽑기 (ticket → 스레드) ----
    s += during(1.5, 3, arrow("M230,128 C200,140 160,138 140,148", C.cpu) + txt(150, 142, "FAA(&amp;ticket)", 11, C.cpu, ' font-weight="700" text-anchor="end"'));
    s += during(3, 4.5, arrow("M300,128 C320,138 370,136 380,148", C.cpu) + txt(372, 142, "FAA(&amp;ticket)", 11, C.cpu, ' font-weight="700" text-anchor="end"'));
    s += during(4.5, 6, arrow("M340,128 C420,146 560,134 620,148", C.cpu) + txt(640, 142, "FAA(&amp;ticket)", 11, C.cpu, ' font-weight="700" text-anchor="start"'));
    // ---- 화살표: unlock (스레드 → turn) ----
    s += during(6, 7.5, arrow("M170,150 C230,136 380,142 432,128", C.hw) + txt(170, 142, "FAA(&amp;turn)", 11, C.hw, ' font-weight="700" text-anchor="end"'));
    s += during(9, 10.5, arrow("M420,150 C440,142 462,138 470,130", C.hw) + txt(480, 144, "FAA(&amp;turn)", 11, C.hw, ' font-weight="700" text-anchor="start"'));

    // ---- 요점 ----
    s += txt(380, 326, "진입 순서 = 번호표 순서 T1 → T2 → T3. myturn 은 절대 겹치지 않고 turn 은 1씩만 오른다 → Fairness Yes (spin 은 여전 → Performance No)", 12, C.muted);
    s += '</svg>';
    return s;
  }
};
