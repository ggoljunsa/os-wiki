// ============================================================
// cfs_vruntime — 6강 p.33~p.36: A nice −5 (weight 3121) · B nice 0 (1024) · C nice +5 (335)
//   slice = 48ms × weight/Σweight(4480) → A 33.4 · B 11.0 · C 3.6→6ms(min_granularity).
//   vruntime += runtime × 1024/weight 가 실행 중에 자라고, 매번 vruntime 최소가 선택된다 (동점이면 A→B→C).
//   시간축(초): 0 초기 → 1.5~11.5 실제 100.8ms 를 재생 (A B C A B C) → 14 결과
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
  ANIMS["cfs_vruntime"] = {
    title: "CFS — vruntime 이 가장 작은 프로세스를 실행",
    desc: "A([[nice]] −5, [[weight]] 3121) · B(nice 0, 1024) · C(nice +5, 335). 실행하는 동안 [[vruntime]] 이 runtime × 1024/weight 로 자란다 — weight가 크면 천천히. 슬라이스는 [[sched_latency]] 48ms를 weight 비율로 나누고, [[min_granularity]] 6ms가 하한. → [[CFS]]",
    duration: 14,
    build: function () {
      var D = 14;
      var LAT = 48, MING = 6, W0 = 1024;
      var P = {
        A: { y: 72, nice: "−5", w: 3121, c: C.a, l: C.aL },
        B: { y: 130, nice: "0", w: 1024, c: C.b, l: C.bL },
        C: { y: 188, nice: "+5", w: 335, c: C.c, l: C.cL }
      };
      var SW = 3121 + 1024 + 335;                // 4480
      ["A", "B", "C"].forEach(function (k) {
        var p = P[k];
        p.raw = LAT * p.w / SW;
        p.slice = Math.max(MING, p.raw);
        p.dv = p.slice * W0 / p.w;
      });
      function f1(x) { return (Math.round(x * 10) / 10).toFixed(1); }
      // vruntime 최소 선택, 동점이면 A → B → C
      var vr = { A: 0, B: 0, C: 0 }, picks = [], now = 0;
      for (var i = 0; i < 6; i++) {
        var best = ["A", "B", "C"].reduce(function (m, k) { return vr[k] < vr[m] - 1e-9 ? k : m; }, "A");
        var mins = ["A", "B", "C"].filter(function (k) { return Math.abs(vr[k] - vr[best]) < 1e-9; });
        picks.push({ id: best, t0: now, t1: now + P[best].slice, v0: vr[best], v1: vr[best] + P[best].dv, mins: mins });
        vr[best] += P[best].dv;
        now += P[best].slice;
      }
      var TOTAL = now;                           // ≈ 100.8ms
      var T0 = 1.5, SPAN = 10;
      function T(ms) { return T0 + ms / TOTAL * SPAN; }
      var X0 = 270, VX = 10;                     // vruntime 1ms → 10px
      var GX = 270, GW = 400;                    // Gantt: 실제 시간
      function G(ms) { return GX + ms / TOTAL * GW; }

      var s = '<svg viewBox="0 0 760 370" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="CFS vruntime 애니메이션">';
      var marks = ["①", "②", "③", "④", "⑤", "⑥"];
      var caps = [[0, T(0), "vruntime 모두 0 — weight: A 3121 (nice −5) · B 1024 (nice 0) · C 335 (nice +5)"]];
      picks.forEach(function (k, i) {
        var p = P[k.id], who = k.mins.length > 1 ? k.mins.join("·") + " " + f1(k.v0) + " (동점)" : k.id + " " + f1(k.v0);
        var body;
        if (i < 3) {
          body = k.id === "C" && p.raw < MING
            ? "slice " + f1(p.raw) + "ms &lt; min_granularity → 6ms 실행, += 6 × 1024/335 = " + f1(p.dv)
            : k.id + " 실행 " + f1(p.slice) + "ms, vruntime += " + f1(p.slice) + " × 1024/" + p.w + " = " + f1(p.dv);
        } else {
          body = k.id + " 실행 " + f1(p.slice) + "ms → vruntime " + f1(k.v1);
        }
        caps.push([T(k.t0), T(k.t1), marks[i] + " 최소 vruntime = " + who + " → " + body]);
      });
      caps.push([T(TOTAL), D, "실제 CPU 시간 A " + f1(2 * P.A.slice) + "ms · B " + f1(2 * P.B.slice) + "ms · C " + (2 * P.C.slice) + "ms — weight가 큰 A가 가장 많이 받는다"]);
      caps.forEach(function (c) {
        s += during(c[0], c[1], D, txt(380, 24, c[2], 13, "#222", ' font-weight="700"'));
      });
      s += txt(380, 46, "vruntime += (1024 / weight) × runtime   ·   항상 vruntime 최소(red-black tree 의 leftmost)를 실행", 11, C.muted);

      // 격자
      [0, 10, 20, 30].forEach(function (v) {
        s += '<line x1="' + (X0 + v * VX) + '" y1="66" x2="' + (X0 + v * VX) + '" y2="226" stroke="#e3e7ef"/>';
        s += txt(X0 + v * VX, 62, String(v), 10, C.muted);
      });
      s += txt(X0 - 10, 62, "vruntime →", 10, C.muted, ' text-anchor="end"');
      s += txt(706, 62, "vruntime", 10, C.muted);

      // 실행 강조
      picks.forEach(function (k) {
        var y = P[k.id].y;
        s += during(T(k.t0), T(k.t1), D,
          '<rect x="8" y="' + (y - 6) + '" width="744" height="44" rx="8" fill="' + P[k.id].l + '" fill-opacity="0.35" stroke="' + C.cpu + '" stroke-width="2.5"/>');
      });

      ["A", "B", "C"].forEach(function (id) {
        var p = P[id], y = p.y;
        s += txt(26, y + 23, id, 22, p.c, ' font-weight="700"');
        s += txt(48, y + 13, "nice " + p.nice + " · weight " + p.w, 12, "#333", ' text-anchor="start"');
        s += txt(48, y + 29, "slice " + (p.raw < MING ? f1(p.raw) + "→6" : f1(p.slice)) + "ms · 속도 ×" + (W0 / p.w).toFixed(2), 11, p.c, ' font-weight="700" text-anchor="start"');
        s += '<rect x="' + X0 + '" y="' + y + '" width="' + (38 * VX) + '" height="32" fill="#f7f8fb" stroke="' + C.line + '"/>';
        var pts = [[0, 0]], vals = [[0, 0]];
        picks.forEach(function (k) {
          if (k.id !== id) return;
          pts.push([T(k.t0), r4(k.v0 * VX)]);
          pts.push([T(k.t1), r4(k.v1 * VX)]);
          vals.push([T(k.t0), null]);
          vals.push([T(k.t1), k.v1]);
        });
        s += '<rect x="' + X0 + '" y="' + y + '" width="0" height="32" fill="' + p.l + '" stroke="' + p.c + '" stroke-width="1.5">' + track("width", pts, D) + '</rect>';
        vals.forEach(function (v, j) {
          var end = j + 1 < vals.length ? vals[j + 1][0] : D;
          var label = v[1] === null ? "실행 중…" : f1(v[1]);
          s += during(v[0], end, D, txt(706, y + 22, label, v[1] === null ? 12 : 14, p.c, ' font-weight="700"'));
        });
      });

      // Gantt (실제 시간)
      s += txt(GX - 10, 252, "CPU (실제 시간)", 11, C.cpu, ' font-weight="700" text-anchor="end"');
      s += '<rect x="' + GX + '" y="238" width="' + GW + '" height="22" fill="#f7f8fb" stroke="' + C.line + '"/>';
      picks.forEach(function (k) {
        var p = P[k.id], x = G(k.t0), w = r4(G(k.t1) - G(k.t0));
        s += '<rect x="' + r4(x) + '" y="238" width="0" height="22" fill="' + p.l + '" stroke="' + p.c + '" stroke-width="1.2">' + grow("width", 0, w, T(k.t0), T(k.t1)) + '</rect>';
        s += during(T(k.t1), D, D, txt(r4(x + w / 2), 254, k.id, 12, p.c, ' font-weight="700"'));
      });
      [0, 50, 100].forEach(function (ms) { s += txt(r4(G(ms)), 274, ms + "ms", 10, C.muted); });

      s += txt(380, 298, "time slice = sched_latency(48ms) × weight / Σweight(4480) — 고정 time slice가 없다", 12, "#444");
      s += txt(380, 316, "C: 48 × 335/4480 = 3.6ms &lt; min_granularity(6ms) → 6ms로 올림 (context switch 폭증 방지)", 11, C.muted);
      s += txt(380, 352, "weight가 클수록 vruntime이 천천히 쌓인다 → 같은 Δvruntime(≈11)을 위해 A는 33.4ms, B는 11ms 실행", 12, "#444");
      s += '</svg>';
      return s;
    }
  };
})();
