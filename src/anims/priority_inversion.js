// ============================================================
// priority_inversion — 우선순위 역전과 priority inheritance (9H 보충, 9강 p.41)
// 시간축(초): 0~7.8 ① 역전: L 락 획득 → H 선점·락 대기 → M 이 L 선점 → M 끝나야 L unlock → H
//   7.9~14 ② priority inheritance: H 가 기다리는 동안 L 이 H 급으로 → M 이 선점 못 함 → H 먼저
// 가로축은 CPU 시간 단위 u (0~11). ① t = 0.4 + 0.6u, ② t = 8.0 + 0.48u
// ============================================================
window.ANIMS = window.ANIMS || {};
ANIMS["priority_inversion"] = {
  title: "Priority inversion — H 가 M 뒤로 밀리는 이유와 priority inheritance",
  desc: "L 이 [[락]]을 쥔 채 M 에게 선점되면 H 는 M 이 끝날 때까지 기다린다. 락을 쥔 L 의 우선순위를 H 급으로 올리면 해결 ([[priority inversion|priority inversion]], [[futex|futex]])",
  duration: 14,
  build: function () {
    var C = {
      a: "#1d65b3", aL: "#dbe8f7",
      b: "#2e9e4f", bL: "#dff3e4",
      c: "#e09a40", cL: "#fdeec2",
      cpu: "#3b2f4a", cpuL: "#efe9f6",
      hw: "#d6465f", os: "#e09a40", muted: "#777"
    };
    var D = 14;
    function box(x, y, w, h, fill, stroke, extra) {
      return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="8" fill="' + fill + '" stroke="' + stroke + '" stroke-width="2"' + (extra || "") + '/>';
    }
    function txt(x, y, s, size, fill, extra) {
      var anchor = /text-anchor/.test(extra || "") ? "" : ' text-anchor="middle"';
      return '<text x="' + x + '" y="' + y + '" font-size="' + (size || 13) + '" fill="' + (fill || "#222") + '"' + anchor + (extra || "") + '>' + s + '</text>';
    }
    function show(from, to) {
      return '<animate attributeName="opacity" values="0;0;1;1;0;0" keyTimes="0;' + (from / D) + ';' + (from / D + 0.01) + ';' + (to / D) + ';' + Math.min(1, to / D + 0.01) + ';1" dur="' + D + 's" fill="freeze"/>';
    }
    function during(from, to, inner) { return '<g opacity="0">' + inner + show(from, to) + '</g>'; }

    var X0 = 120, U = 55, H = 34;
    var ROW = { H: 66, M: 114, L: 162 };
    var COL = { H: C.a, M: C.c, L: C.b };
    // 막대: u0~u1 구간이 시간 t(u0)~t(u1) 동안 자라난다
    function bar(tm, end, u0, u1, row, kind, label) {
      var x = X0 + U * u0, w = U * (u1 - u0), y = ROW[row];
      var t0 = tm(u0), t1 = tm(u1);
      var fill = COL[row], stroke = COL[row], dash = "", lc = "#fff";
      if (kind === "blocked") { fill = "#dcdcf2"; stroke = "#3c3c88"; dash = ' stroke-dasharray="5 3"'; lc = "#3c3c88"; }
      if (kind === "ready") { fill = "#fdeec2"; stroke = "#8a6000"; dash = ' stroke-dasharray="5 3"'; lc = "#8a6000"; }
      if (kind === "inherit") { fill = C.b; stroke = C.a; lc = "#fff"; }
      var g = '<rect x="' + x + '" y="' + y + '" width="0" height="' + H + '" rx="4" fill="' + fill + '" stroke="' + stroke + '" stroke-width="' + (kind === "inherit" ? 4 : 1.5) + '"' + dash + '>' +
        '<animate attributeName="width" values="0;0;' + w + ';' + w + '" keyTimes="0;' + (t0 / D) + ';' + (t1 / D) + ';1" dur="' + D + 's" fill="freeze"/></rect>';
      // 라벨은 막대가 라벨 폭만큼 자란 뒤에 나타난다 (라벨이 막대 밖으로 삐져나오지 않게)
      var est = 0;
      if (label) for (var i = 0; i < label.length; i++) est += label.charCodeAt(i) > 255 ? 11 : 6.5;
      var ku = Math.min(u1, u0 + (est + 12) / U);
      if (label) g += during(tm(ku), end, txt(x + (U * (ku - u0)) / 2, y + 22, label, 11, lc, ' font-weight="700"'));
      return g;
    }
    function frame(tm, end, title) {
      var g = txt(20, 54, title, 12, C.cpu, ' font-weight="700" text-anchor="start"');
      [["H", "H (높음)"], ["M", "M (중간)"], ["L", "L (낮음)"]].forEach(function (r) {
        g += '<rect x="' + X0 + '" y="' + ROW[r[0]] + '" width="' + (U * 11) + '" height="' + H + '" fill="#f6f6f6"/>';
        g += txt(106, ROW[r[0]] + 22, r[1], 13, COL[r[0]], ' font-weight="700" text-anchor="end"');
      });
      g += '<line x1="' + X0 + '" y1="206" x2="' + (X0 + U * 11) + '" y2="206" stroke="#999" stroke-width="1.5"/>';
      for (var u = 0; u <= 11; u++) g += '<line x1="' + (X0 + U * u) + '" y1="206" x2="' + (X0 + U * u) + '" y2="211" stroke="#999"/>';
      g += txt(X0 + U * 11, 226, "CPU 시간 →", 11, C.muted, ' text-anchor="end"');
      // 지금 시각 커서
      g += '<line x1="0" y1="60" x2="0" y2="206" stroke="' + C.hw + '" stroke-width="1.5" stroke-dasharray="3 3">' +
        '<animate attributeName="x1" values="' + X0 + ';' + X0 + ';' + (X0 + U * 11) + ';' + (X0 + U * 11) + '" keyTimes="0;' + (tm(0) / D) + ';' + (tm(11) / D) + ';1" dur="' + D + 's" fill="freeze"/>' +
        '<animate attributeName="x2" values="' + X0 + ';' + X0 + ';' + (X0 + U * 11) + ';' + (X0 + U * 11) + '" keyTimes="0;' + (tm(0) / D) + ';' + (tm(11) / D) + ';1" dur="' + D + 's" fill="freeze"/></line>';
      return g;
    }

    var s = '<svg viewBox="0 0 760 340" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="priority inversion 애니메이션">';

    // ---- 단계 자막 ----
    [
      [0, 1.6, "① L 이 락을 획득하고 critical section 실행 중"],
      [1.6, 2.8, "H 가 깨어나 L 을 선점 → 같은 락 요청 → L 이 놓을 때까지 대기 (blocked)"],
      [2.8, 5.8, "M 이 깨어나 L 을 선점 (M 은 락과 무관!) → L 은 CPU 를 못 받아 락을 못 놓는다"],
      [5.8, 7.9, "M 이 끝나야 L 이 unlock → 그제서야 H 실행 = H 가 M 에게 밀렸다 (우선순위 역전)"],
      [7.9, 9.44, "② priority inheritance — 같은 상황: L 락 획득 → H 가 같은 락을 요청하고 대기"],
      [9.44, 10.4, "H 가 기다리는 동안 락을 쥔 L 의 우선순위를 H 수준으로 일시 상승 → M 이 선점 못 함"],
      [10.4, 14, "L 이 곧바로 unlock → 원래 우선순위로 복귀, H 가 먼저 실행 → M 은 그 다음"]
    ].forEach(function (c) { s += during(c[0], c[1], txt(380, 26, c[2], 13, "#222", ' font-weight="700"')); });

    // ---- ① 역전 ----
    var E1 = 7.85;
    function t1(u) { return 0.4 + 0.6 * u; }
    var g1 = frame(t1, E1, "① priority inheritance 없음");
    g1 += bar(t1, E1, 0, 2, "L", "run", "lock() · CS");
    g1 += bar(t1, E1, 2, 3, "H", "run", "lock()");
    g1 += bar(t1, E1, 3, 10, "H", "blocked", "blocked — 락 대기");
    g1 += bar(t1, E1, 3, 4, "L", "run", "CS");
    g1 += bar(t1, E1, 4, 9, "M", "run", "M 실행 (락과 무관)");
    g1 += bar(t1, E1, 4, 9, "L", "ready", "선점당함 (ready)");
    g1 += bar(t1, E1, 9, 10, "L", "run", "unlock");
    g1 += bar(t1, E1, 10, 11, "H", "run", "획득");
    g1 += during(t1(10), E1, txt(380, 254, "H 대기 시간 = 7 단위 (그중 5 단위는 M 때문)", 14, C.hw, ' font-weight="700"'));
    s += '<g>' + g1 + '<animate attributeName="opacity" values="1;1;0;0" keyTimes="0;' + (E1 / D) + ';' + (E1 / D + 0.005) + ';1" dur="' + D + 's" fill="freeze"/></g>';

    // ---- ② priority inheritance ----
    var S2 = 7.9;
    function t2(u) { return 8.0 + 0.48 * u; }
    var g2 = frame(t2, D, "② priority inheritance 적용");
    g2 += bar(t2, D, 0, 2, "L", "run", "lock() · CS");
    g2 += bar(t2, D, 2, 3, "H", "run", "lock()");
    g2 += bar(t2, D, 3, 5, "H", "blocked", "락 대기");
    g2 += bar(t2, D, 3, 5, "L", "inherit", "CS (H 급)");
    g2 += bar(t2, D, 4, 7, "M", "ready", "ready (선점 불가)");
    g2 += bar(t2, D, 5, 7, "H", "run", "획득 → 실행");
    g2 += bar(t2, D, 7, 11, "M", "run", "M 실행");
    g2 += during(t2(3), t2(5), txt(106, ROW.L + 48, "↑ H 급으로 상승", 11, C.a, ' font-weight="700" text-anchor="end"'));
    g2 += during(t2(5), D, txt(106, ROW.L + 48, "원래대로 복귀", 11, C.muted, ' text-anchor="end"'));
    g2 += during(t2(5) + 0.3, D, txt(380, 254, "H 대기 시간 = 2 단위 (L 의 critical section 만큼만)", 14, "#1d6b2a", ' font-weight="700"'));
    s += '<g opacity="0">' + g2 + show(S2, D) + '</g>';

    // ---- 요점 ----
    s += txt(380, 296, "priority inheritance 를 하려면 커널이 \"누가 락을 쥐고, 누가 기다리는가\" 를 알아야 한다", 12, C.muted);
    s += txt(380, 316, "→ futex 가 대기 queue 를 커널이 직접 관리하는 이유: Fair wakeup (priority inheritance) (9강 p.41)", 12, C.muted);
    s += '</svg>';
    return s;
  }
};
