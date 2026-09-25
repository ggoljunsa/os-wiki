// ============================================================
// mlfq_boost — 5강 p.32~p.43: 3-큐 MLFQ (Q2 최고 → Q0 최저, 각 slice 10ms)
//   CPU-bound A 는 allotment 를 다 써서 Q2→Q1→Q0 (Rule 4), interactive B 는 1ms 쓰고 I/O → Q2 유지,
//   마지막에 Rule 5 priority boost 로 모두 Q2. 시간축(초): 0 Rule 3 → 1.5 A 실행 → 3.1 강등 → … → 9.2 boost → 13
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
  ANIMS["mlfq_boost"] = {
    title: "MLFQ — 강등(Rule 4)과 priority boost(Rule 5)",
    desc: "CPU-bound job A는 [[time slice]]를 다 쓸 때마다 한 칸씩 내려가고, 1ms만 쓰고 I/O로 CPU를 놓는 interactive job B는 Q2에 머문다. 주기 S가 지나면 Rule 5가 모두를 최상위 큐로 올린다. → [[MLFQ]]",
    duration: 13,
    build: function () {
      var D = 13;
      var LANE = { 2: 86, 1: 146, 0: 206 };     // 큐 중심 y
      var SA = 130, SB = 176;                    // 큐 안 슬롯 x
      var CPU = [530, 120], IO = [530, 214];
      var s = '<svg viewBox="0 0 760 330" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="MLFQ 강등과 priority boost 애니메이션">';
      s += '<defs><marker id="mlfq_arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="' + C.hw + '"/></marker></defs>';

      var caps = [
        [0, 1.5, "Rule 3: 새로 들어온 job A(CPU-bound)·B(interactive)는 최상위 Q2에 놓인다"],
        [1.5, 3.1, "Rule 1·2: Q2의 A 실행 — time slice 10ms를 끝까지 사용"],
        [3.1, 3.6, "Rule 4: 한 레벨의 allotment를 다 쓴 A → Q1로 강등"],
        [3.6, 4.6, "B: 1ms만 쓰고 I/O 요청 → CPU 반납, allotment가 남았으니 Q2 유지"],
        [4.6, 6.1, "Q2가 비었다(B는 I/O 중) → Q1의 A 실행 → 또 10ms 소진"],
        [6.1, 6.6, "Rule 4: A → Q0로 강등 (최하위 큐)"],
        [6.6, 7.9, "I/O 끝난 B는 Q2 → Rule 1로 Q0의 A보다 먼저 실행, 1ms 후 또 반납"],
        [7.9, 9.2, "A는 B가 I/O로 쉬는 틈에만 Q0에서 실행 — interactive job이 많으면 A는 굶는다"],
        [9.2, D, "Rule 5: 주기 S마다 모든 job을 최상위 큐로 (priority boost) → starvation 방지"]
      ];
      caps.forEach(function (c) {
        s += during(c[0], c[1], D, txt(380, 26, c[2], 14, "#222", ' font-weight="700"'));
      });

      // ---- 큐 3개 ----
      [[2, "Q2", "high"], [1, "Q1", ""], [0, "Q0", "low"]].forEach(function (q) {
        var y = LANE[q[0]];
        s += box(90, y - 22, 310, 44, "#f7f8fb", C.line);
        s += txt(52, y + 2, q[1], 16, C.cpu, ' font-weight="700"');
        if (q[2]) s += txt(52, y + 17, q[2], 10, C.muted);
        s += txt(392, y + 5, "slice 10ms", 10, C.muted, ' text-anchor="end"');
      });
      // Rule 4 강등 표시
      s += during(3.1, 4.6, D, txt(250, LANE[1] + 5, "↓ Rule 4: Q2 → Q1", 12, C.hw, ' font-weight="700"'));
      s += during(6.1, 7.9, D, txt(250, LANE[0] + 5, "↓ Rule 4: Q1 → Q0", 12, C.hw, ' font-weight="700"'));
      // Rule 5 boost 화살표
      s += during(9.2, D, D,
        '<path d="M430,' + (LANE[0] + 10) + ' L430,' + (LANE[2] - 10) + '" stroke="' + C.hw + '" stroke-width="4" fill="none" marker-end="url(#mlfq_arrow)"/>' +
        txt(430, 246, "Rule 5", 12, C.hw, ' font-weight="700"') + txt(430, 260, "boost", 11, C.hw));
      s += during(9.2, D, D, txt(250, LANE[1] + 5, "모두 Q2로!", 12, C.hw, ' font-weight="700"'));

      // ---- CPU / I/O ----
      s += box(460, 64, 140, 86, C.cpuL, C.cpu);
      s += txt(530, 82, "CPU", 13, C.cpu, ' font-weight="700"');
      s += box(460, 170, 140, 70, "#eef0f7", "#3c3c88");
      s += txt(530, 187, "I/O 대기 (blocked)", 11, "#3c3c88", ' font-weight="700"');

      // ---- allotment 막대 ----
      s += txt(688, 76, "allotment 사용량", 12, C.cpu, ' font-weight="700"');
      s += txt(688, 90, "(현재 레벨에서, 최대 10ms)", 10, C.muted);
      [["A", 104, C.a, C.aL], ["B", 146, C.b, C.bL]].forEach(function (r) {
        s += txt(628, r[1] + 12, r[0], 13, r[2], ' font-weight="700"');
        s += '<rect x="640" y="' + r[1] + '" width="100" height="16" fill="#fff" stroke="' + C.line + '"/>';
      });
      s += '<rect x="640" y="104" width="0" height="16" fill="' + C.a + '">' +
        track("width", [[1.9, 0], [3.1, 100], [3.6, 100], [3.61, 0], [4.9, 0], [6.1, 100], [6.6, 100], [6.61, 0], [8.2, 0], [9.2, 80], [9.5, 80], [9.51, 0]], D) + '</rect>';
      s += '<rect x="640" y="146" width="0" height="16" fill="' + C.b + '">' +
        track("width", [[3.9, 0], [4.2, 10], [7.3, 10], [7.5, 20], [9.5, 20], [9.51, 0]], D) + '</rect>';
      s += during(3.1, 3.6, D, txt(690, 134, "10ms 다 씀 → 강등", 10, C.hw, ' font-weight="700"'));
      s += during(6.1, 6.6, D, txt(690, 134, "10ms 다 씀 → 강등", 10, C.hw, ' font-weight="700"'));
      s += during(4.2, 6.6, D, txt(690, 176, "1ms만 사용 → Q2 유지", 10, C.b, ' font-weight="700"'));
      s += during(7.5, 9.2, D, txt(690, 176, "누적 2ms → Q2 유지", 10, C.b, ' font-weight="700"'));
      s += during(9.5, D, D, txt(690, 176, "boost 후 새로 시작", 10, C.hw, ' font-weight="700"'));

      // ---- job 토큰 ----
      function token(id, fill, light, pts) {
        return '<g opacity="0">' + '<g>' +
          '<circle cx="0" cy="0" r="16" fill="' + light + '" stroke="' + fill + '" stroke-width="2.5"/>' +
          txt(0, 5, id, 15, fill, ' font-weight="700"') + move(pts, D) + '</g>' + show(0.6, D, D) + '</g>';
      }
      s += token("A", C.a, C.aL, [
        [0, SA, LANE[2]], [1.5, SA, LANE[2]], [1.9, CPU[0], CPU[1]], [3.1, CPU[0], CPU[1]], [3.6, SA, LANE[1]],
        [4.6, SA, LANE[1]], [4.9, CPU[0], CPU[1]], [6.1, CPU[0], CPU[1]], [6.6, SA, LANE[0]],
        [7.9, SA, LANE[0]], [8.2, CPU[0], CPU[1]], [9.2, CPU[0], CPU[1]], [9.8, SA, LANE[2]]
      ]);
      s += token("B", C.b, C.bL, [
        [0, SB, LANE[2]], [3.6, SB, LANE[2]], [3.9, CPU[0], CPU[1]], [4.2, CPU[0], CPU[1]], [4.6, IO[0], IO[1]],
        [6.6, IO[0], IO[1]], [7.0, SB, LANE[2]], [7.0, SB, LANE[2]], [7.3, CPU[0], CPU[1]], [7.5, CPU[0], CPU[1]],
        [7.9, IO[0], IO[1]], [9.2, IO[0], IO[1]], [9.8, SB, LANE[2]]
      ]);

      // ---- 범례 + 요점 ----
      s += txt(380, 290, "A = CPU-bound (계속 계산)   ·   B = interactive (1ms 쓰고 I/O)", 11, C.muted);
      s += txt(380, 316, "CPU를 오래 쓰면 내려가고(Rule 4), 일찍 반납하면 머물고, 주기적으로 모두 끌어올린다(Rule 5)", 12, "#444");
      s += '</svg>';
      return s;
    }
  };
})();
