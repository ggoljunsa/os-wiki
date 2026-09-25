// ============================================================
// round_robin — 5강 p.20: A·B·C 각 5초, t=0 동시 도착. RR(slice 1초) vs SJF(= slice 5초)
//   두 줄 Gantt 가 실시간으로 채워지고, CPU 칩이 A→B→C 로 돌아간다. 첫 실행(▲)과 완료(✓) 표시.
//   시간축(초): 0 워크로드 → 1.5 t=0 → 10.5 t=15 → 13 결과(response 1/5, turnaround 14/10)
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
  ANIMS["round_robin"] = {
    title: "Round Robin vs SJF — response time 과 turnaround time 의 맞교환",
    desc: "A·B·C 각 5초, t=0 동시 도착. [[Round Robin]]([[time slice]] 1초)은 셋 다 금방 첫 실행을 받지만(평균 [[response time]] 1초) 모두 늦게 끝난다(평균 [[turnaround time]] 14초). [[SJF]]는 5초 / 10초",
    duration: 13,
    build: function () {
      var D = 13;
      var T0 = 1.5, SU = 0.6;                  // 시뮬레이션 1초 = 애니메이션 0.6초
      function T(t) { return T0 + t * SU; }
      var X0 = 150, PX = 28;                   // 0~15초 → x 150~570
      function X(t) { return X0 + t * PX; }
      var col = { A: [C.a, C.aL], B: [C.b, C.bL], C: [C.c, C.cL] };
      var rrSeq = [];
      for (var i = 0; i < 15; i++) rrSeq.push("ABC".charAt(i % 3));
      var ROWS = [
        { name: "RR", sub: "time slice 1초", y: 80, seq: rrSeq,
          first: { A: 0, B: 1, C: 2 }, done: { A: 13, B: 14, C: 15 },
          r1: "response 평균 = 1초", r2: "(0+1+2)/3", t1: "turnaround 평균 = 14초", t2: "(13+14+15)/3", good: "r" },
        { name: "SJF", sub: "(= RR slice 5초)", y: 190, seq: "AAAAABBBBBCCCCC".split(""),
          first: { A: 0, B: 5, C: 10 }, done: { A: 5, B: 10, C: 15 },
          r1: "response 평균 = 5초", r2: "(0+5+10)/3", t1: "turnaround 평균 = 10초", t2: "(5+10+15)/3", good: "t" }
      ];
      var H = 40;
      var s = '<svg viewBox="0 0 760 330" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Round Robin 과 SJF 비교 애니메이션">';

      var caps = [
        [0, T(0), "A·B·C 모두 t=0 도착, 각 5초 — 위: RR (time slice 1초) / 아래: SJF (= RR slice 5초)"],
        [T(0), T(3), "RR: A → B → C 1초씩 번갈아 — 셋 다 3초 안에 첫 실행 (response time ↓)"],
        [T(3), T(10), "RR은 A B C A B C … 계속 돌아간다 / SJF는 A를 끝내야 B, B를 끝내야 C"],
        [T(10), T(15), "RR은 A·B·C가 모두 13~15초에야 끝난다 (turnaround time ↑)"],
        [T(15), D, "RR: response 1 · turnaround 14   vs   SJF: response 5 · turnaround 10"]
      ];
      caps.forEach(function (c) {
        s += during(c[0], c[1], D, txt(380, 26, c[2], 14, "#222", ' font-weight="700"'));
      });

      ROWS.forEach(function (r) {
        var y = r.y;
        s += txt(52, y + 18, r.name, 16, C.cpu, ' font-weight="700"');
        s += txt(52, y + 34, r.sub, 10, C.muted);
        // CPU 칩: 지금 누가 CPU 를 쓰는가
        s += box(94, y + 6, 44, 28, C.cpuL, C.cpu);
        s += txt(116, y + 2, "CPU", 9, C.cpu, ' font-weight="700"');
        s += during(0, T(0), D, txt(116, y + 25, "—", 13, C.muted));
        r.seq.forEach(function (j, k) {
          s += during(T(k), T(k + 1), D, txt(116, y + 25, j, 15, col[j][0], ' font-weight="700"'));
        });
        s += during(T(15), D, D, txt(116, y + 25, "끝", 12, C.muted));
        // 배경 + 격자
        s += '<rect x="' + X0 + '" y="' + y + '" width="' + (15 * PX) + '" height="' + H + '" fill="#f7f8fb" stroke="' + C.line + '"/>';
        for (var t = 1; t < 15; t++) s += '<line x1="' + X(t) + '" y1="' + y + '" x2="' + X(t) + '" y2="' + (y + H) + '" stroke="#e3e7ef"/>';
        // 칸 채우기
        r.seq.forEach(function (j, k) {
          var c2 = col[j];
          s += '<rect x="' + X(k) + '" y="' + y + '" width="0" height="' + H + '" fill="' + c2[1] + '" stroke="' + c2[0] + '" stroke-width="1.2">' +
            grow("width", 0, PX, T(k), T(k + 1)) + '</rect>';
          s += during(T(k) + 0.05, D, D, txt(X(k) + PX / 2, y + 26, j, 14, c2[0], ' font-weight="700"'));
        });
        // 첫 실행 ▲ (response)
        s += during(T(0), D, D, txt(X0 - 6, y + H + 22, "첫 실행", 10, C.muted, ' text-anchor="end"'));
        ["A", "B", "C"].forEach(function (j) {
          var f = r.first[j], x = X(f) + PX / 2;
          s += during(T(f), D, D,
            '<polygon points="' + x + ',' + (y + H + 3) + ' ' + (x - 6) + ',' + (y + H + 12) + ' ' + (x + 6) + ',' + (y + H + 12) + '" fill="' + col[j][0] + '"/>' +
            txt(x, y + H + 24, j + " " + f, 10, col[j][0], ' font-weight="700"'));
        });
        // 완료 ✓ (turnaround)
        s += during(T(r.done.A), D, D, txt(X0 - 6, y - 13, "완료", 10, C.muted, ' text-anchor="end"'));
        ["A", "B", "C"].forEach(function (j) {
          var d = r.done[j], x = X(d) - PX / 2;
          s += during(T(d), D, D,
            '<polygon points="' + (x - 5) + ',' + (y - 9) + ' ' + (x + 5) + ',' + (y - 9) + ' ' + x + ',' + (y - 2) + '" fill="' + col[j][0] + '"/>' +
            txt(x, y - 13, j + d, 10, col[j][0], ' font-weight="700"'));
        });
        // 결과
        var rc = r.good === "r" ? C.b : C.hw, tc = r.good === "t" ? C.b : C.hw;
        s += during(T(15) + 0.2, D, D,
          txt(670, y + 4, r.r1, 12, rc, ' font-weight="700"') + txt(670, y + 18, r.r2, 10, C.muted) +
          txt(670, y + 38, r.t1, 12, tc, ' font-weight="700"') + txt(670, y + 52, r.t2, 10, C.muted));
      });

      // 눈금
      [0, 5, 10, 15].forEach(function (t) { s += txt(X(t), 282, String(t), 11, C.muted); });
      s += txt(X(7.5), 282, "시간(초)", 11, C.muted);

      // now 커서
      s += '<g><line x1="0" y1="66" x2="0" y2="268" stroke="' + C.hw + '" stroke-width="2" stroke-dasharray="4 3"/>' +
        txt(0, 296, "now", 11, C.hw, ' font-weight="700"') +
        move([[T(0), X(0), 0], [T(15), X(15), 0]], D) + '</g>';

      s += txt(380, 320, "Round Robin은 response time을 최적화하고 turnaround time은 최악 — 기억법: Round Robin → Response", 12, "#444");
      s += '</svg>';
      return s;
    }
  };
})();
