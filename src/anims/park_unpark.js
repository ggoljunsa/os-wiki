// ============================================================
// park_unpark — queue 락: guard + queue + setpark/park/unpark (9강 p.33~38)
// 시간축(초): 0 T1 락 보유 → 1.5 T2 guard 획득 → 3 queue_add → 4.2 setpark()
//   → 5.4 guard = 0 → 6.4 park() (Blocked) → 8 T1 unlock: guard 획득
//   → 9.2 unpark(queue_remove) · flag 1 유지 → 10.6 guard = 0 → 11.6 T2 진입 → 14 끝
// ============================================================
window.ANIMS = window.ANIMS || {};
ANIMS["park_unpark"] = {
  title: "queue 락 — spin 대신 park() 로 잠들고, unpark() 로 락을 직접 넘겨받는다",
  desc: "못 들어간 T2 는 [[guard|guard]] 안에서 큐에 TID 를 넣고 [[setpark|setpark()]] → guard 해제 → [[park와 unpark|park()]]. T1 의 unlock 은 flag 를 0 으로 내리지 않고 unpark 로 '''hand-off''' ([[queue 락|queue 락]])",
  duration: 14,
  build: function () {
    var C = {
      a: "#1d65b3", aL: "#dbe8f7",
      b: "#2e9e4f", bL: "#dff3e4",
      cpu: "#3b2f4a", cpuL: "#efe9f6",
      hw: "#d6465f", os: "#e09a40", muted: "#777"
    };
    var BADGE = {
      running: ["#cdefd2", "#1d6b2a"], ready: ["#fdeec2", "#8a6000"],
      blocked: ["#dcdcf2", "#3c3c88"], spinning: ["#ffd9d9", "#a52f2f"], idle: ["#eeeeee", "#666666"]
    };
    var D = 14;
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
      return box(cx - 70, y, 140, 22, c[0], c[1]) + txt(cx, y + 16, label, 12, c[1], ' font-weight="700"');
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
      return '<path d="' + d + '" fill="none" stroke="' + col + '" stroke-width="2.5" marker-end="url(#pu_arrow)"/>';
    }

    var s = '<svg viewBox="0 0 760 370" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="park/unpark 큐 락 애니메이션">';
    s += '<defs><marker id="pu_arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#555"/></marker></defs>';

    // ---- 단계 자막 ----
    [
      [0, 1.5, "T1 이 락을 쥐고 critical section 실행 중 (flag = 1)"],
      [1.5, 3, "T2: lock() → TestAndSet(&amp;m-&gt;guard, 1) 로 guard 획득"],
      [3, 4.2, "flag == 1 (이미 잠김) → queue_add(m-&gt;q, gettid()): 대기열에 내 TID"],
      [4.2, 5.4, "setpark(): \"나 곧 park 할 거야\" 예고 (guard 해제보다 먼저)"],
      [5.4, 6.4, "m-&gt;guard = 0: guard 를 먼저 놓고…"],
      [6.4, 8, "park(): T2 잠듦 → Blocked. CPU 를 전혀 쓰지 않는다"],
      [8, 9.2, "T1: unlock() → guard 획득, 큐가 비어 있지 않다"],
      [9.2, 10.6, "unpark(queue_remove(m-&gt;q)) → T2 깨움 · flag 는 1 그대로 (hand-off)"],
      [10.6, 11.6, "m-&gt;guard = 0 — T1 의 unlock() 끝"],
      [11.6, 14, "T2: park() 에서 리턴 → 넘겨받은 락으로 critical section 진입"]
    ].forEach(function (c) { s += during(c[0], c[1], txt(380, 26, c[2], 14, "#222", ' font-weight="700"')); });

    // ---- 스레드 박스 ----
    function thread(x, name, col, colL) {
      var cx = x + 105, g = "";
      g += box(x, 46, 210, 240, colL, col);
      g += txt(cx, 68, name, 15, col, ' font-weight="700"');
      g += txt(cx, 126, "지금 실행 중인 코드", 10, C.muted);
      g += box(x + 10, 132, 190, 48, "#fff", "#c9c9c9");
      return g;
    }
    s += thread(20, "Thread 1", C.a, C.aL);
    s += thread(530, "Thread 2", C.b, C.bL);
    function code(cx, from, to, l1, l2, col) {
      s += during(from, to, mono(cx, 152, l1, 11, col || "#222", ' font-weight="700"') + (l2 ? mono(cx, 170, l2, 11, C.muted) : ""));
    }
    // T1 코드
    code(125, 0, 8, "lock() 끝 — 락 보유 중", "// critical section");
    code(125, 8, 9.2, "unlock(): TestAndSet(", "&amp;m-&gt;guard, 1) → 0");
    code(125, 9.2, 10.6, "unpark(queue_remove(", "m-&gt;q));  // T2", C.os);
    code(125, 10.6, 11.6, "m-&gt;guard = 0;", "// flag = 0 은 안 함!");
    code(125, 11.6, 14, "unlock() 완료", "");
    // T2 코드
    code(635, 0, 1.5, "lock() 호출 전", "");
    code(635, 1.5, 3, "TestAndSet(&amp;m-&gt;guard,1)", "→ 0 : guard 획득");
    code(635, 3, 4.2, "queue_add(m-&gt;q, gettid());", "// flag == 1 이라 else");
    code(635, 4.2, 5.4, "setpark();", "// 곧 park 한다고 예고");
    code(635, 5.4, 6.4, "m-&gt;guard = 0;", "// guard 해제");
    code(635, 6.4, 11.6, "park();", "// 잠듦", "#3c3c88");
    code(635, 11.6, 14, "park() 에서 리턴", "락은 이미 내 것 (flag=1)", "#1d6b2a");

    // 배지
    s += during(0, 10.6, badge(125, 80, "running", "running · 락 보유"));
    s += during(10.6, 11.6, badge(125, 80, "running", "running"));
    s += during(11.6, 14, badge(125, 80, "idle", "unlock() 완료"));
    s += during(0, 1.5, badge(635, 80, "idle", "lock() 전"));
    s += during(1.5, 6.4, badge(635, 80, "running", "running · lock() 안"));
    s += during(6.4, 11.6, badge(635, 80, "blocked", "blocked (park)"));
    s += during(11.6, 14, badge(635, 80, "running", "running · 락 보유"));

    // CPU 사용
    s += txt(125, 206, "CPU 사용", 11, C.muted);
    s += during(0, 11.6, txt(125, 230, "사용 중", 15, "#1d6b2a", ' font-weight="700"'));
    s += during(11.6, 14, txt(125, 230, "—", 15, C.muted, ' font-weight="700"'));
    s += txt(635, 206, "CPU 사용", 11, C.muted);
    s += during(0, 6.4, txt(635, 230, "사용 중", 15, "#1d6b2a", ' font-weight="700"'));
    s += during(6.4, 11.6, txt(635, 230, "0 — 스케줄 후보 아님", 15, "#3c3c88", ' font-weight="700"'));
    s += during(11.6, 14, txt(635, 230, "사용 중", 15, "#1d6b2a", ' font-weight="700"'));
    // Zzz
    s += during(6.4, 11.6, '<text x="635" y="266" font-size="18" fill="#3c3c88" text-anchor="middle" font-weight="700">Z z z' +
      '<animate attributeName="opacity" values="1;0.25;1" dur="1s" begin="6.4s" repeatCount="5"/></text>');
    s += during(4.6, 6.4, box(575, 252, 120, 22, "#fdeec2", "#8a6000") + txt(635, 268, "setpark 예약 ✓", 12, "#8a6000", ' font-weight="700"'));

    // ---- lock_t 구조체 ----
    s += box(250, 46, 260, 150, C.cpuL, C.cpu);
    s += mono(380, 66, "lock_t *m", 13, C.cpu, ' font-weight="700"');
    s += mono(300, 100, "flag", 13, "#333", ' text-anchor="end"');
    s += mono(300, 136, "guard", 13, "#333", ' text-anchor="end"');
    s += mono(300, 174, "q", 13, "#333", ' text-anchor="end"');
    s += txt(328, 102, "1", 22, C.hw, ' font-weight="700"');
    s += during(9.2, 11.6, txt(350, 100, "← 1 유지 (hand-off!)", 12, C.hw, ' font-weight="700" text-anchor="start"'));
    s += during(0, 1.5, txt(350, 100, "진짜 락 (held)", 11, C.muted, ' text-anchor="start"'));
    [[0, 2.2, "0"], [2.2, 5.9, "1"], [5.9, 8.6, "0"], [8.6, 11.1, "1"], [11.1, 14, "0"]].forEach(function (v) {
      s += during(v[0], v[1], txt(328, 138, v[2], 22, v[2] === "1" ? C.os : C.b, ' font-weight="700"'));
    });
    s += txt(350, 136, "락을 만들기 위한 보조 spin lock", 10, C.muted, ' text-anchor="start"');
    s += box(314, 158, 180, 26, "#fff", "#999", ' stroke-dasharray="4 3"');
    s += during(0, 3, txt(404, 176, "(비어 있음)", 11, C.muted));
    s += during(10.1, 14, txt(404, 176, "(비어 있음)", 11, C.muted));
    // 큐 안의 T2 칩: T2 박스 쪽에서 들어왔다가, unpark 때 T2 로 돌아간다
    s += '<g opacity="0">' + '<g>' + box(380, 160, 48, 22, C.b, C.b) + txt(404, 176, "T2", 12, "#fff", ' font-weight="700"') +
      mv([[0, 230, 0], [3, 230, 0], [3.6, 0, 0], [9.4, 0, 0], [10.0, 230, 0]]) + '</g>' + show(3, 10.0) + '</g>';

    // ---- 화살표 ----
    s += during(1.5, 3, arrow("M530,120 C515,120 518,136 512,136", C.b));
    s += during(3, 4.2, arrow("M530,172 C520,172 506,172 496,172", C.b));
    s += during(5.4, 6.4, arrow("M530,136 C522,136 520,136 512,136", C.b));
    s += during(8, 9.2, arrow("M230,120 C240,120 242,136 250,136", C.a));
    s += during(9.2, 10.6, arrow("M230,262 C300,312 460,312 528,262", C.os) +
      txt(380, 318, "unpark(T2)", 12, C.os, ' font-weight="700"'));

    // ---- critical section ----
    s += box(250, 216, 260, 70, "#fafafa", "#999", ' stroke-dasharray="6 4"');
    s += txt(380, 236, "critical section", 13, "#555", ' font-weight="700"');
    s += during(0, 10.6, txt(380, 266, "안에: T1", 14, C.a, ' font-weight="700"'));
    s += during(10.6, 11.6, txt(380, 266, "T1 → T2 로 락이 직접 넘어가는 중", 12, C.os, ' font-weight="700"'));
    s += during(11.6, 14, txt(380, 266, "안에: T2", 14, C.b, ' font-weight="700"'));

    // ---- setpark 주석 (9D) ----
    s += during(4.2, 8, txt(380, 312, "setpark() 가 guard 해제 앞에 있으므로: guard = 0 과 park() 사이에 unpark 가 먼저 와도 park() 는 즉시 리턴 (wakeup/waiting race 방지)", 11, "#a52f2f"));

    // ---- 요점 ----
    s += txt(380, 352, "기다리는 T2 는 Blocked → CPU 0. spin 은 guard 구간(몇 명령어)뿐이고, unlock 은 flag 를 내리지 않고 락을 직접 넘긴다", 12, C.muted);
    s += '</svg>';
    return s;
  }
};
