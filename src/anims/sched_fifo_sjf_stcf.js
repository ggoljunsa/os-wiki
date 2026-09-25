// ============================================================
// sched_fifo_sjf_stcf — 5강 p.11·p.14·p.16: A=100@0, B=C=10@10 을 FIFO/SJF/STCF 로
//   세 줄 Gantt 가 실시간으로 채워지고 now 커서가 움직인다. 끝에 평균 turnaround.
//   시간축(초): 0 워크로드 → 1.5 t=0 → 2.17 t=10 도착 → 9.5 t=120 → 13 끝
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
  ANIMS["sched_fifo_sjf_stcf"] = {
    title: "FIFO · SJF · STCF — 같은 워크로드, 세 가지 Gantt",
    desc: "A=100초(t=0 도착), B·C=10초(t=10 도착). 비선점인 [[FIFO]]·[[SJF]]는 A를 멈추지 못하고, [[선점]]하는 [[STCF]]만 B·C를 먼저 끝낸다 → 평균 [[turnaround time]] 103.33 / 103.33 / 50",
    duration: 13,
    build: function () {
      var D = 13;
      var T0 = 1.5, SP = 15;                   // 시뮬레이션 15초 = 애니메이션 1초
      function T(t) { return T0 + t / SP; }
      var X0 = 130, PX = 4;                    // 0~120초 → x 130~610
      function X(t) { return X0 + t * PX; }
      var ROWS = [
        { name: "FIFO", sub: "비선점 · 도착 순", y: 64,
          segs: [["A", 0, 100], ["B", 100, 110], ["C", 110, 120]],
          f1: "(100+100+110)/3", f2: "= 103.33" },
        { name: "SJF", sub: "비선점 · 짧은 것 먼저", y: 144,
          segs: [["A", 0, 100], ["B", 100, 110], ["C", 110, 120]],
          f1: "(100+100+110)/3", f2: "= 103.33" },
        { name: "STCF", sub: "선점 · 남은 시간 최소", y: 224,
          segs: [["A", 0, 10], ["B", 10, 20], ["C", 20, 30], ["A", 30, 120]],
          f1: "(120+10+20)/3", f2: "= 50" }
      ];
      var H = 36;
      var col = { A: [C.a, C.aL], B: [C.b, C.bL], C: [C.c, C.cL] };
      var s = '<svg viewBox="0 0 760 350" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="FIFO SJF STCF Gantt 비교 애니메이션">';

      // ---- 단계 자막 ----
      var caps = [
        [0, T(0), "워크로드: A=100초 (t=0 도착), B·C=10초 (t=10 도착)"],
        [T(0), T(10), "t=0: A 혼자 도착 → 세 정책 모두 A 실행"],
        [T(10), T(30), "t=10: B·C 도착! FIFO·SJF는 비선점 → A 계속 / STCF는 A를 선점"],
        [T(30), T(120), "STCF는 B·C를 먼저 끝냈다. FIFO·SJF의 B·C는 A가 끝날 때까지 기다린다 (convoy)"],
        [T(120), D, "평균 turnaround time: FIFO 103.33 · SJF 103.33 · STCF 50"]
      ];
      caps.forEach(function (c) {
        s += during(c[0], c[1], D, txt(380, 26, c[2], 14, "#222", ' font-weight="700"'));
      });

      // ---- 격자 + 눈금 ----
      [0, 10, 20, 30, 100, 110, 120].forEach(function (t) {
        s += '<line x1="' + X(t) + '" y1="58" x2="' + X(t) + '" y2="266" stroke="#e3e7ef" stroke-width="1"/>';
        s += txt(X(t), 280, String(t), 11, C.muted);
      });
      s += txt(X(120) + 10, 280, "(초)", 11, C.muted, ' text-anchor="start"');
      s += txt(685, 50, "평균 turnaround", 11, C.muted, ' font-weight="700"');

      ROWS.forEach(function (r) {
        s += txt(62, r.y + 16, r.name, 15, C.cpu, ' font-weight="700"');
        s += txt(62, r.y + 32, r.sub, 10, C.muted);
        s += '<rect x="' + X0 + '" y="' + r.y + '" width="' + (120 * PX) + '" height="' + H + '" fill="#f7f8fb" stroke="' + C.line + '"/>';
        r.segs.forEach(function (g) {
          var c2 = col[g[0]], x = X(g[1]), w = (g[2] - g[1]) * PX;
          s += '<rect x="' + x + '" y="' + r.y + '" width="0" height="' + H + '" fill="' + c2[1] + '" stroke="' + c2[0] + '" stroke-width="1.5">' +
            grow("width", 0, w, T(g[1]), T(g[2])) + '</rect>';
          s += during(T(g[1]) + 0.05, D, D, txt(x + Math.min(w, 60) / 2, r.y + 23, g[0], 14, c2[0], ' font-weight="700"'));
        });
        // 결과
        s += during(T(120) + 0.2, D, D, txt(685, r.y + 14, r.f1, 11, "#444") +
          txt(685, r.y + 33, r.f2, 16, r.name === "STCF" ? C.b : C.hw, ' font-weight="700"'));
      });

      // ---- B·C 도착 표시 ----
      s += during(T(10), D, D,
        '<polygon points="' + (X(10) - 5) + ',46 ' + (X(10) + 5) + ',46 ' + X(10) + ',56" fill="' + C.hw + '"/>' +
        txt(X(10) + 8, 50, "B·C 도착 (t=10)", 11, C.hw, ' font-weight="700" text-anchor="start"'));
      // STCF 선점 표시
      s += during(T(10), T(40), D, txt(X(40) + 10, 218, "⚡ t=10 선점! A 남은 90 &gt; B 10", 11, C.hw, ' font-weight="700" text-anchor="start"'));
      // FIFO/SJF: A 계속
      s += during(T(10), T(40), D, txt(X(40) + 10, 138, "t=10에도 비선점 → A 계속 (B·C 대기)", 11, C.muted, ' text-anchor="start"'));

      // ---- now 커서 ----
      s += '<g>' + '<line x1="0" y1="58" x2="0" y2="266" stroke="' + C.hw + '" stroke-width="2" stroke-dasharray="4 3"/>' +
        txt(0, 296, "now", 11, C.hw, ' font-weight="700"') +
        move([[T(0), X(0), 0], [T(120), X(120), 0]], D) + '</g>';

      // ---- 아래 요점 ----
      s += txt(380, 320, "늦게 도착한 짧은 job 앞에서 비선점 SJF는 FIFO와 같아진다 → 선점(STCF)이 convoy effect를 끊는다", 12, "#444");
      s += txt(380, 340, "(참고: 셋 다 t=0 동시 도착이면 FIFO 110 · SJF 50)", 11, C.muted);
      s += '</svg>';
      return s;
    }
  };
})();
