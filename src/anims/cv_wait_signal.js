// ============================================================
// cv_wait_signal — 조건 변수: wait() 는 락 반납 + 잠들기, 깨어나면 락 재획득 (OSTEP ch.30, Fig 30.3)
// 시간축(초): 0 초기 → 1 T1 lock → 2 while(done==0) 참 → 3 wait(): 락 반납 + cv 큐에서 잠듦
//   → 4.5 T2 lock → 5.5 done = 1 → 6.5 signal(&c): T1 → ready (락은 아직 T2)
//   → 7.8 T2 unlock → 8.8 T1 락 재획득·wait() 리턴 → while 재검사 → 9.8 진행 → 11 끝
// ============================================================
window.ANIMS = window.ANIMS || {};
ANIMS["cv_wait_signal"] = {
  title: "조건 변수 — wait() 는 락을 놓고 잠들었다가, signal 로 깨어나 락을 다시 잡고 돌아온다",
  desc: "부모 T1 은 while (done == 0) wait(c, m), 자식 T2 는 done = 1; signal(c). [[wait와 signal|wait()]] 은 락 반납과 잠들기를 '''원자적으로''' 하고, 깨어나면 락을 '''다시 잡은 뒤''' 리턴한다 — [[Mesa semantics]] 라 while 로 재검사",
  duration: 11,
  build: function () {
    var C = {
      a: "#1d65b3", aL: "#dbe8f7",
      b: "#2e9e4f", bL: "#dff3e4",
      cpu: "#3b2f4a", cpuL: "#efe9f6",
      hw: "#d6465f", os: "#e09a40", muted: "#777"
    };
    var BADGE = {
      running: ["#cdefd2", "#1d6b2a"], ready: ["#fdeec2", "#8a6000"],
      blocked: ["#dcdcf2", "#3c3c88"], idle: ["#eeeeee", "#666666"]
    };
    var D = 11;
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
      return '<path d="' + d + '" fill="none" stroke="' + col + '" stroke-width="2.5" marker-end="url(#cvw_arrow)"/>';
    }

    var s = '<svg viewBox="0 0 760 360" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="조건 변수 wait/signal 애니메이션">';
    s += '<defs><marker id="cvw_arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#555"/></marker></defs>';

    // ---- 단계 자막 ----
    [
      [0, 1, "초기 상태: 락 m 은 비어 있고 done = 0"],
      [1, 2, "T1(부모): Pthread_mutex_lock(&amp;m) → 락 획득"],
      [2, 3, "T1: while (done == 0) → 참 — 아직 자식이 안 끝났다"],
      [3, 4.5, "wait(&amp;c, &amp;m): 락을 반납하고 동시에 c 의 큐에서 잠든다 (원자적으로)"],
      [4.5, 5.5, "T2(자식): Pthread_mutex_lock(&amp;m) → 비어 있으니 바로 획득"],
      [5.5, 6.5, "T2: done = 1 — 상태 변수를 바꾼다"],
      [6.5, 7.8, "signal(&amp;c): 대기자 T1 을 큐에서 꺼내 ready 로 — 하지만 락은 아직 T2 것"],
      [7.8, 8.8, "T2: Pthread_mutex_unlock(&amp;m) → 락이 비었다"],
      [8.8, 9.8, "T1: 락을 다시 잡고 wait() 에서 리턴 → while 조건 재검사: done == 1"],
      [9.8, 11, "while 탈출 → T1 진행 (락을 쥔 채) — 조건 확인은 항상 while 로"]
    ].forEach(function (c) { s += during(c[0], c[1], txt(380, 26, c[2], 14, "#222", ' font-weight="700"')); });

    // ---- 스레드 박스 ----
    function thread(x, name, sub, col, colL) {
      var cx = x + 105, g = "";
      g += box(x, 46, 210, 240, colL, col);
      g += txt(cx, 68, name, 15, col, ' font-weight="700"');
      g += txt(cx, 84, sub, 11, C.muted);
      g += txt(cx, 132, "지금 실행 중인 코드", 10, C.muted);
      g += box(x + 10, 138, 190, 48, "#fff", "#c9c9c9");
      return g;
    }
    s += thread(20, "T1 (waiter)", "부모: thr_join()", C.a, C.aL);
    s += thread(530, "T2 (signaler)", "자식: thr_exit()", C.b, C.bL);
    function code(cx, from, to, l1, l2, col) {
      s += during(from, to, mono(cx, 158, l1, 11, col || "#222", ' font-weight="700"') + (l2 ? mono(cx, 176, l2, 11, C.muted) : ""));
    }
    code(125, 0, 1, "thr_join() 호출 전", "");
    code(125, 1, 2, "mutex_lock(&amp;m);", "// 획득");
    code(125, 2, 3, "while (done == 0)", "// 0 == 0 → 참");
    code(125, 3, 8.8, "cond_wait(&amp;c, &amp;m);", "// 잠든 채 멈춰 있음", "#3c3c88");
    code(125, 8.8, 9.8, "while (done == 0)", "// 1 == 0 → 거짓!", C.hw);
    code(125, 9.8, 11, "while 탈출 → 다음 문장", "// 락 보유 · done==1 확정", "#1d6b2a");
    code(635, 0, 4.5, "thr_exit() 호출 전", "");
    code(635, 4.5, 5.5, "mutex_lock(&amp;m);", "// 획득");
    code(635, 5.5, 6.5, "done = 1;", "// 상태 변수 변경");
    code(635, 6.5, 7.8, "cond_signal(&amp;c);", "// T1 깨우기", C.os);
    code(635, 7.8, 8.8, "mutex_unlock(&amp;m);", "// 락 반납");
    code(635, 8.8, 11, "thr_exit() 끝", "");

    // 배지
    s += during(0, 1, badge(125, 96, "ready", "ready"));
    s += during(1, 3.3, badge(125, 96, "running", "running · 락 보유"));
    s += during(3.3, 6.9, badge(125, 96, "blocked", "blocked (c 에서 잠듦)"));
    s += during(6.9, 8.8, badge(125, 96, "ready", "ready · 락 대기"));
    s += during(8.8, 11, badge(125, 96, "running", "running · 락 보유"));
    s += during(0, 4.5, badge(635, 96, "ready", "ready"));
    s += during(4.5, 8.8, badge(635, 96, "running", "running · 락 보유"));
    s += during(8.8, 11, badge(635, 96, "idle", "종료"));

    // Zzz (T1 잠든 동안)
    s += during(3.6, 6.9, '<text x="125" y="222" font-size="18" fill="#3c3c88" text-anchor="middle" font-weight="700">Z z z' +
      '<animate attributeName="opacity" values="1;0.25;1" dur="1s" begin="3.6s" repeatCount="3"/></text>');

    // ---- 가운데: 락 m ----
    s += box(250, 46, 260, 56, C.cpuL, C.cpu);
    s += mono(300, 70, "mutex m", 13, C.cpu, ' font-weight="700"');
    s += txt(300, 90, "소유자", 11, C.muted);
    [[0, 1.3, "비어 있음", C.muted], [1.3, 3.5, "T1", C.a], [3.5, 4.9, "비어 있음", C.muted], [4.9, 8.1, "T2", C.b],
     [8.1, 9.1, "비어 있음", C.muted], [9.1, 11, "T1", C.a]].forEach(function (v) {
      s += during(v[0], v[1], txt(430, 82, v[2], 18, v[3], ' font-weight="700"'));
    });
    s += during(3.3, 4.5, txt(430, 98, "← wait 이 반납", 10, C.hw, ' font-weight="700"'));
    s += during(8.8, 9.8, txt(430, 98, "← 재획득", 10, C.a, ' font-weight="700"'));

    // ---- done ----
    s += box(250, 110, 260, 40, "#fff", "#999");
    s += mono(330, 136, "int done =", 13, "#333", ' font-weight="700"');
    s += during(0, 5.9, txt(410, 138, "0", 20, C.muted, ' font-weight="700"'));
    s += during(5.9, 11, txt(410, 138, "1", 20, C.hw, ' font-weight="700"'));
    s += during(5.9, 7.2, txt(460, 136, "← T2 가 씀", 10, C.hw, ' font-weight="700"'));

    // ---- cv c 대기 큐 ----
    s += box(250, 158, 260, 56, C.cpuL, "#3c3c88");
    s += mono(305, 176, "cond_t c", 12, "#3c3c88", ' font-weight="700"');
    s += txt(420, 176, "잠든 스레드 큐", 11, C.muted);
    s += box(320, 182, 120, 26, "#fff", "#999", ' stroke-dasharray="4 3"');
    s += during(0, 3.6, txt(380, 200, "(비어 있음)", 11, C.muted));
    s += during(7.4, 11, txt(380, 200, "(비어 있음)", 11, C.muted));

    // ---- ready (락 재획득 대기) ----
    s += box(250, 222, 260, 56, "#fffaf0", "#8a6000", ' stroke-dasharray="6 4"');
    s += txt(380, 240, "깨어남 → 락 m 재획득 대기 (ready)", 11, "#8a6000", ' font-weight="700"');
    s += box(320, 246, 120, 26, "#fff", "#c9b98f", ' stroke-dasharray="4 3"');

    // ---- T1 토큰: T1 박스 → cv 큐 → ready → T1 박스 ----
    // 기준 위치 (95, 236) 폭 60
    s += '<g>' + box(95, 234, 60, 24, C.a, C.a) + txt(125, 251, "T1", 12, "#fff", ' font-weight="700"') +
      mv([[0, 0, 0], [3.5, 0, 0], [4.2, 255, -51], [6.9, 255, -51], [7.5, 255, 13], [8.9, 255, 13], [9.5, 0, 0]]) + '</g>';

    // ---- 화살표 ----
    s += during(1, 2, arrow("M230,70 L248,70", C.a));
    s += during(3.3, 4.5, arrow("M230,246 C260,246 280,195 316,195", "#3c3c88") +
      txt(125, 306, "wait: 락 반납 + 잠들기", 12, "#3c3c88", ' font-weight="700"'));
    s += during(4.5, 5.5, arrow("M530,70 L512,70", C.b));
    s += during(5.5, 6.5, arrow("M530,130 L512,130", C.b));
    s += during(6.5, 7.8, arrow("M530,195 C500,195 470,195 444,195", C.os) +
      txt(635, 306, "signal(&amp;c)", 12, C.os, ' font-weight="700"'));
    s += during(8.8, 9.8, arrow("M230,70 L248,70", C.a));

    // ---- Mesa 주석 ----
    s += during(6.9, 8.8, txt(380, 306, "깨어났다 ≠ 바로 실행. 락을 다시 잡아야 wait() 가 리턴한다", 12, "#8a6000", ' font-weight="700"'));
    s += during(8.8, 11, txt(380, 306, "Mesa semantics: signal 은 힌트일 뿐 — 그사이 상태가 바뀌었을 수 있으니 while 로 다시 확인", 12, C.hw, ' font-weight="700"'));

    // ---- 요점 ----
    s += txt(380, 342, "wait = 락 반납 + 잠들기 + 깨어나면 락 재획득; Mesa라 while로 재검사", 13, "#444", ' font-weight="700"');
    s += '</svg>';
    return s;
  }
};
