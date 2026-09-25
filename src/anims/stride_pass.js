// ============================================================
// stride_pass — 6강 p.25: tickets A 100 / B 50 / C 250, 큰 수 10000 → stride 100 / 200 / 40
//   매 tick 마다 pass 최소인 프로세스가 실행되고 그 막대가 stride 만큼 자란다 (동점이면 A→B→C 순).
//   시간축(초): 0 초기(pass 0) → 1.5 부터 1초마다 8번 (A B C C C A C C) → 9.5 사이클 끝(모두 200) → 13
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
  ANIMS["stride_pass"] = {
    title: "Stride 스케줄링 — pass 가 가장 작은 프로세스가 한 걸음",
    desc: "[[tickets]] A 100 / B 50 / C 250 → [[stride]] = 10000/tickets = 100 / 200 / 40. 매번 [[pass]] 최소인 프로세스가 실행되고 pass += stride. 한 사이클(모두 200)에서 C 5 : A 2 : B 1. → [[Stride 스케줄링]]",
    duration: 13,
    build: function () {
      var D = 13;
      var T0 = 1.5, STEP = 1.0;
      function T(i) { return T0 + i * STEP; }
      var X0 = 250, PX = 2;                      // pass 0~200 → x 250~650
      function X(p) { return X0 + p * PX; }
      var P = {
        A: { y: 80, tickets: 100, stride: 100, c: C.a, l: C.aL },
        B: { y: 140, tickets: 50, stride: 200, c: C.b, l: C.bL },
        C: { y: 200, tickets: 250, stride: 40, c: C.c, l: C.cL }
      };
      var RH = 34;
      // 슬라이드 p.25 표 순서 (동점이면 A → B → C)
      var picks = ["A", "B", "C", "C", "C", "A", "C", "C"];
      var pass = { A: 0, B: 0, C: 0 };
      var hist = { A: [[0, 0]], B: [[0, 0]], C: [[0, 0]] };
      var capsPick = [];
      var marks = ["①", "②", "③", "④", "⑤", "⑥", "⑦", "⑧"];
      picks.forEach(function (id, i) {
        var before = pass[id], after = before + P[id].stride;
        var mins = ["A", "B", "C"].filter(function (k) { return pass[k] === before; });
        var who = mins.length > 1 ? mins.join("·") + " " + before + " (동점)" : id + " " + before;
        capsPick.push([T(i), T(i + 1), marks[i] + " 최소 pass = " + who + " → " + id + " 실행, pass(" + id + ") += " + P[id].stride + " → " + after]);
        hist[id].push([T(i) + 0.35, before * PX]);
        hist[id].push([T(i) + 0.85, after * PX]);
        P[id]["v" + i] = [before, after];
        pass[id] = after;
      });

      var s = '<svg viewBox="0 0 760 340" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Stride 스케줄링 pass 애니메이션">';
      var caps = [[0, T(0), "stride = 10000 / tickets → A 100 · B 200 · C 40. pass는 모두 0에서 시작"]]
        .concat(capsPick)
        .concat([[T(8), D, "pass가 모두 200 → 한 사이클 끝: C 5번 · A 2번 · B 1번 = 250 : 100 : 50"]]);
      caps.forEach(function (c) {
        s += during(c[0], c[1], D, txt(380, 26, c[2], 14, "#222", ' font-weight="700"'));
      });

      // 격자
      [0, 40, 80, 100, 120, 160, 200].forEach(function (p) {
        s += '<line x1="' + X(p) + '" y1="70" x2="' + X(p) + '" y2="240" stroke="#e3e7ef"/>';
        s += txt(X(p), 64, String(p), 10, C.muted);
      });
      s += txt(X0 - 12, 64, "pass →", 10, C.muted, ' text-anchor="end"');

      // 실행 강조 (행 테두리)
      picks.forEach(function (id, i) {
        var y = P[id].y;
        s += during(T(i), T(i + 1), D,
          '<rect x="10" y="' + (y - 7) + '" width="740" height="' + (RH + 14) + '" rx="8" fill="' + P[id].l + '" fill-opacity="0.35" stroke="' + C.cpu + '" stroke-width="2.5"/>' +
          txt(740, y - 12, "▶ 실행", 11, C.cpu, ' font-weight="700" text-anchor="end"'));
      });

      ["A", "B", "C"].forEach(function (id) {
        var p = P[id], y = p.y;
        s += txt(34, y + 25, id, 22, p.c, ' font-weight="700"');
        s += txt(62, y + 14, "tickets " + p.tickets, 12, "#333", ' text-anchor="start"');
        s += txt(62, y + 30, "stride " + p.stride, 12, p.c, ' font-weight="700" text-anchor="start"');
        s += '<rect x="' + X0 + '" y="' + y + '" width="' + (200 * PX) + '" height="' + RH + '" fill="#f7f8fb" stroke="' + C.line + '"/>';
        s += '<rect x="' + X0 + '" y="' + y + '" width="0" height="' + RH + '" fill="' + p.l + '" stroke="' + p.c + '" stroke-width="1.5">' + track("width", hist[id], D) + '</rect>';
        // 오른쪽 pass 값
        var vals = [[0, 0]];
        picks.forEach(function (k, i) { if (k === id) vals.push([T(i) + 0.85, p["v" + i][1]]); });
        vals.forEach(function (v, j) {
          var end = j + 1 < vals.length ? vals[j + 1][0] : D;
          s += during(v[0], end, D, txt(700, y + 23, "pass " + v[1], 13, p.c, ' font-weight="700"'));
        });
      });
      // +stride 라벨 (자라는 동안)
      picks.forEach(function (id, i) {
        var v = P[id]["v" + i];
        s += during(T(i) + 0.35, T(i + 1), D, txt(X(v[1]) + 6, P[id].y + 23, "+" + P[id].stride, 12, P[id].c, ' font-weight="700" text-anchor="start"'));
      });

      // 실행 순서 기록
      s += txt(150, 272, "실행 순서", 12, C.cpu, ' font-weight="700" text-anchor="end"');
      picks.forEach(function (id, i) {
        s += during(T(i), D, D, txt(172 + i * 26, 272, id, 15, P[id].c, ' font-weight="700"'));
      });
      // 사이클 끝
      s += during(T(8), D, D,
        '<line x1="' + X(200) + '" y1="70" x2="' + X(200) + '" y2="240" stroke="' + C.hw + '" stroke-width="2.5" stroke-dasharray="5 3"/>' +
        txt(560, 272, "C 5 : A 2 : B 1 = 250 : 100 : 50", 13, C.hw, ' font-weight="700"'));

      s += txt(380, 300, "티켓이 많을수록 stride(보폭)가 작아 pass가 천천히 늘고 → 더 자주 최소가 되어 더 자주 실행된다", 12, "#444");
      s += txt(380, 320, "난수 없음(결정적) · 동점일 때만 임의 선택 (여기선 A → B → C 순)", 11, C.muted);
      s += '</svg>';
      return s;
    }
  };
})();
