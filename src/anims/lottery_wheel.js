// ============================================================
// lottery_wheel — 6강 p.12: 티켓 100장 (A 0~74, B 75~99), 슬라이드의 난수 15개 그대로 추첨
//   포인터가 당첨 번호로 이동 → 실행 기록 칸이 채워지고 → 누적 비율 막대가 75:25 목표선 근처로.
//   시간축(초): 0 티켓 배분 → 1.5 부터 0.6초마다 추첨 15번 → 10.5 결과 (A 11 : B 4 = 73% : 27%) → 13
// ============================================================
window.ANIMS = window.ANIMS || {};
(function () {
  // ---- 공용 헬퍼 (ctx_switch.js 의 box/txt/show 계승) ----
  function r4(x) { return Math.round(x * 10000) / 10000; }
  function box(x, y, w, h, fill, stroke, extra) {
    return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="8" fill="' + fill + '" stroke="' + stroke + '" stroke-width="2"' + (extra || "") + '/>';
  }
  function txt(x, y, s, size, fill, extra) {
    return '<text x="' + x + '" y="' + y + '" font-size="' + (size || 13) + '" fill="' + (fill || "#222") + '"' + (/text-anchor/.test(extra || "") ? "" : ' text-anchor="middle"') + (extra || "") + '>' + s + '</text>';
  }
  // [a, b) 초 동안만 보이기 (discrete opacity)
  function show(a, b, D) {
    if (a <= 0 && b >= D) return "";
    var ks = [0], vs = [a <= 0 ? 1 : 0];
    if (a > 0) { ks.push(r4(a / D)); vs.push(1); }
    if (b < D) { ks.push(r4(b / D)); vs.push(0); }
    if (ks[ks.length - 1] < 1) { ks.push(1); vs.push(vs[vs.length - 1]); }
    return '<animate attributeName="opacity" calcMode="discrete" values="' + vs.join(";") + '" keyTimes="' + ks.join(";") + '" dur="' + D + 's" fill="freeze"/>';
  }
  function during(a, b, D, inner) {
    return '<g opacity="' + (a <= 0 ? 1 : 0) + '">' + inner + show(a, b, D) + '</g>';
  }
  // 속성 하나를 [[t, v], ...] 로 꺾은선 보간 (전 구간 0~D)
  function track(attr, pts, D) {
    var ks = [], vs = [];
    if (pts[0][0] > 0) { ks.push(0); vs.push(pts[0][1]); }
    pts.forEach(function (p) { ks.push(r4(p[0] / D)); vs.push(p[1]); });
    if (ks[ks.length - 1] < 1) { ks.push(1); vs.push(vs[vs.length - 1]); }
    return '<animate attributeName="' + attr + '" values="' + vs.join(";") + '" keyTimes="' + ks.join(";") + '" dur="' + D + 's" fill="freeze"/>';
  }
  // 위치 이동 [[t, x, y], ...] → translate
  function move(pts, D) {
    var ks = [], vs = [];
    if (pts[0][0] > 0) { ks.push(0); vs.push(pts[0][1] + "," + pts[0][2]); }
    pts.forEach(function (p) { ks.push(r4(p[0] / D)); vs.push(p[1] + "," + p[2]); });
    if (ks[ks.length - 1] < 1) { ks.push(1); vs.push(vs[vs.length - 1]); }
    return '<animateTransform attributeName="transform" type="translate" values="' + vs.join(";") + '" keyTimes="' + ks.join(";") + '" dur="' + D + 's" fill="freeze"/>';
  }
  function grow(attr, from, to, t0, t1) {
    return '<animate attributeName="' + attr + '" from="' + from + '" to="' + to + '" begin="' + r4(t0) + 's" dur="' + r4(t1 - t0) + 's" fill="freeze"/>';
  }

  var C = {
    a: "#1d65b3", aL: "#dbe8f7", b: "#2e9e4f", bL: "#dff3e4", c: "#e09a40", cL: "#fdeec2",
    cpu: "#3b2f4a", cpuL: "#efe9f6", hw: "#d6465f", muted: "#777", line: "#b9c4d8"
  };
  ANIMS["lottery_wheel"] = {
    title: "Lottery 스케줄링 — 티켓 100장, 추첨 15번",
    desc: "A=75장(0~74), B=25장(75~99). 매 [[time slice]]마다 0~99 중 난수 하나를 뽑아 그 번호의 주인을 실행한다. 슬라이드의 당첨 번호 15개 그대로 — B는 4번(27%)으로 목표 25%와 조금 어긋난다. → [[Lottery 스케줄링]], [[tickets]]",
    duration: 13,
    build: function () {
      var D = 13;
      var W = [63, 85, 70, 39, 76, 17, 29, 41, 36, 39, 10, 99, 68, 83, 63];   // 슬라이드 p.12
      var T0 = 1.5, STEP = 0.6;
      function T(i) { return T0 + i * STEP; }
      var BX = 80, PX = 6;                       // 티켓 0~99 → x 80~680
      function X(n) { return BX + (n + 0.5) * PX; }
      var s = '<svg viewBox="0 0 760 330" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Lottery 스케줄링 추첨 애니메이션">';

      var caps = [
        [0, T(0), "총 티켓 100장: A = 0~74 (75장), B = 75~99 (25장)"],
        [T(0), T(15), "매 time slice: 0~99 중 난수(winner) 하나 → 그 번호를 가진 프로세스가 실행"],
        [T(15), D, "15번 중 A 11 · B 4 → B 27% (목표 25%). 오래 돌수록 75 : 25에 수렴"]
      ];
      caps.forEach(function (c) {
        s += during(c[0], c[1], D, txt(380, 26, c[2], 14, "#222", ' font-weight="700"'));
      });

      // ---- 티켓 막대 ----
      s += '<rect x="' + BX + '" y="100" width="' + (75 * PX) + '" height="40" fill="' + C.aL + '" stroke="' + C.a + '" stroke-width="2"/>';
      s += '<rect x="' + (BX + 75 * PX) + '" y="100" width="' + (25 * PX) + '" height="40" fill="' + C.bL + '" stroke="' + C.b + '" stroke-width="2"/>';
      s += txt(BX + 37.5 * PX, 126, "A : 티켓 0 ~ 74 (75장)", 14, C.a, ' font-weight="700"');
      s += txt(BX + 87.5 * PX, 126, "B : 75 ~ 99 (25장)", 13, C.b, ' font-weight="700"');
      s += txt(BX, 156, "0", 11, C.muted);
      s += txt(BX + 75 * PX, 156, "75", 11, C.muted);
      s += txt(BX + 100 * PX, 156, "99", 11, C.muted);

      // ---- 포인터 (당첨 번호로 이동) ----
      var pts = [[0, X(W[0]), 0], [T(0), X(W[0]), 0]];
      var inner = '<polygon points="-7,84 7,84 0,98" fill="' + C.cpu + '"/>';
      W.forEach(function (w, i) {
        if (i > 0) { pts.push([T(i), X(W[i - 1]), 0]); pts.push([T(i) + 0.2, X(w), 0]); }
        inner += during(T(i) + (i > 0 ? 0.2 : 0), i < 14 ? T(i + 1) : D, D,
          txt(0, 78, "winner = " + w, 13, w < 75 ? C.a : C.b, ' font-weight="700"'));
      });
      s += '<g opacity="0">' + '<g>' + inner + move(pts, D) + '</g>' + show(T(0), D, D) + '</g>';

      // ---- 실행 기록 ----
      var HX = 100, CW = 36;
      s += txt(HX - 10, 204, "실행", 12, C.cpu, ' font-weight="700" text-anchor="end"');
      s += txt(HX - 10, 186, "winner", 10, C.muted, ' text-anchor="end"');
      W.forEach(function (w, i) {
        var who = w < 75 ? "A" : "B", fg = who === "A" ? C.a : C.b, bg = who === "A" ? C.aL : C.bL;
        s += '<rect x="' + (HX + i * CW) + '" y="188" width="' + (CW - 2) + '" height="26" rx="4" fill="#f7f8fb" stroke="#e3e7ef"/>';
        s += during(T(i) + 0.25, D, D,
          txt(HX + i * CW + CW / 2 - 1, 184, String(w), 10, C.muted) +
          '<rect x="' + (HX + i * CW) + '" y="188" width="' + (CW - 2) + '" height="26" rx="4" fill="' + bg + '" stroke="' + fg + '" stroke-width="1.5"/>' +
          txt(HX + i * CW + CW / 2 - 1, 206, who, 13, fg, ' font-weight="700"'));
      });

      // ---- 누적 비율 막대 ----
      var SX = HX, SW = 15 * CW - 2;             // 538px = 100%
      s += txt(HX - 10, 252, "누적", 12, C.cpu, ' font-weight="700" text-anchor="end"');
      s += '<rect x="' + SX + '" y="238" width="' + SW + '" height="20" fill="#f1f3f8"/>';
      s += during(T(0) + 0.45, D, D, '<rect x="' + SX + '" y="238" width="' + SW + '" height="20" fill="' + C.b + '" opacity="0.85"/>');
      var a = 0, wp = [[0, 0], [T(0), 0]];
      var tallies = [];
      W.forEach(function (w, i) {
        if (w < 75) a++;
        var n = i + 1, share = a / n;
        wp.push([T(i) + 0.25, wp[wp.length - 1][1]]);
        wp.push([T(i) + 0.45, Math.round(share * SW * 10) / 10]);
        tallies.push([T(i) + 0.45, i < 14 ? T(i + 1) + 0.45 : D,
          "A " + a + "회 (" + Math.round(share * 100) + "%)  :  B " + (n - a) + "회 (" + Math.round((1 - share) * 100) + "%)   — " + n + "번째 추첨"]);
      });
      s += '<rect x="' + SX + '" y="238" width="0" height="20" fill="' + C.a + '">' + track("width", wp, D) + '</rect>';
      s += '<rect x="' + SX + '" y="238" width="' + SW + '" height="20" fill="none" stroke="' + C.line + '"/>';
      // 목표선 75%
      var gx = SX + 0.75 * SW;
      s += '<line x1="' + gx + '" y1="232" x2="' + gx + '" y2="264" stroke="' + C.hw + '" stroke-width="2" stroke-dasharray="4 3"/>';
      s += txt(gx, 228, "목표 75%", 10, C.hw, ' font-weight="700"');
      tallies.forEach(function (t) {
        s += during(t[0], t[1], D, txt(SX + SW / 2, 282, t[2], 12, "#333", ' font-weight="700"'));
      });
      s += during(0, T(0) + 0.45, D, txt(SX + SW / 2, 282, "아직 추첨 전", 12, C.muted));

      s += txt(380, 316, "Lottery는 확률적 — 짧게 보면 비율이 어긋나지만, 추첨이 많아질수록 tickets 비율(75 : 25)에 수렴", 12, "#444");
      s += '</svg>';
      return s;
    }
  };
})();
