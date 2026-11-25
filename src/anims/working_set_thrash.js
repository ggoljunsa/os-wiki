// ============================================================
// working_set_thrash — working set 이 메모리에 들어가면 compulsory miss 뒤 hit, 넘치면 thrashing (17강 p.27, p.54)
// 그림용 가정: frame 3개, LRU. ① working set {A,B,C} ② working set {A,B,C,D,E}
// 시간축(초): 0~1.2 구성 → 1.2~5.7 ① A B C A B C A B C: miss 3 뒤 hit 6 → 6~10.5 ② A B C D E A B C D: 9번 모두 miss, 계속 swap
//   → 10.5~14 p.54 그래프: degree of multiprogramming ↑ → CPU utilization 오르다 급락
// ============================================================
window.ANIMS = window.ANIMS || {};
ANIMS["working_set_thrash"] = {
  title: "Working set 과 thrashing — 메모리에 들어가느냐가 전부",
  desc: "[[working set과 thrashing]] p.27. 지금 자주 쓰는 page 집합(working set)이 메모리보다 작으면 처음 compulsory miss 뒤엔 hit 만 난다. 메모리보다 크면 page 가 쉬지 않고 swap in/out 되는 thrashing — p.54 처럼 CPU utilization 이 무너진다. (frame 3개·LRU 는 그림용 가정)",
  duration: 14,
  build: function () {
    var D = 14;
    var C = { a: "#1d65b3", aL: "#dbe8f7", b: "#2e9e4f", bL: "#dff3e4", c: "#e09a40", cL: "#fdeec2", k: "#3b2f4a", kL: "#efe9f6", hw: "#d6465f", hwL: "#f7d8dc", m: "#777" };
    function r3(v) { return Math.round(v * 1000) / 1000; }
    function box(x, y, w, h, fill, stroke, sw) { return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="3" fill="' + fill + '" stroke="' + stroke + '" stroke-width="' + (sw || 1.5) + '"/>'; }
    function txt(x, y, s, size, fill, extra) {
      var anchor = /text-anchor/.test(extra || "") ? "" : ' text-anchor="middle"';
      return '<text x="' + x + '" y="' + y + '" font-size="' + (size || 13) + '" fill="' + (fill || "#222") + '"' + anchor + (extra || "") + '>' + s + '</text>';
    }
    function show(from, to) {
      return '<animate attributeName="opacity" values="0;0;1;1;0;0" keyTimes="0;' + r3(from / D) + ';' + r3(from / D + 0.003) + ';' + r3(to / D) + ';' + r3(Math.min(1, to / D + 0.003)) + ';1" dur="' + D + 's" fill="freeze"/>';
    }
    function during(from, to, inner) {
      if (from <= 0) return '<g>' + inner + '<animate attributeName="opacity" values="1;1;0;0" keyTimes="0;' + r3(to / D) + ';' + r3(Math.min(1, to / D + 0.003)) + ';1" dur="' + D + 's" fill="freeze"/></g>';
      return '<g opacity="0">' + inner + show(from, to) + '</g>';
    }
    function lru(refs, n) {
      var fr = [], last = {}, out = [];
      refs.forEach(function (p, t) {
        var hit = fr.indexOf(p) >= 0;
        if (!hit) {
          if (fr.length < n) fr.push(p);
          else { var v = 0; for (var i = 1; i < fr.length; i++) if (last[fr[i]] < last[fr[v]]) v = i; fr[v] = p; }
        }
        last[p] = t;
        out.push({ hit: hit, frames: fr.slice() });
      });
      return out;
    }

    var STEP = 0.5;
    var s = '<svg viewBox="0 0 760 370" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="working set thrashing 애니메이션">';
    [
      [0, 1.2, "메모리 frame 3개. 프로그램이 지금 자주 쓰는 page 집합 = working set"],
      [1.2, 2.7, "① working set {A, B, C}: 처음 세 번은 compulsory miss"],
      [2.7, 5.9, "그 뒤로는 전부 hit — working set &lt; main memory 면 좋은 성능"],
      [5.9, 10.5, "② working set {A, B, C, D, E} &gt; frame 3개 → 매번 miss, page 가 계속 swap in/out = thrashing"],
      [10.5, D, "p.54: 프로세스를 늘리면 CPU utilization 이 오르다 thrashing 에서 급락 → 일부 프로세스를 돌리지 않는다"]
    ].forEach(function (c) { s += during(c[0], c[1], txt(380, 26, c[2], c[0] >= 5.9 ? 13 : 14, "#222", ' font-weight="700"')); });

    function rowSim(y, label, refs, t0) {
      var res = lru(refs, 3), g = '';
      g += txt(30, y + 20, label, 13, C.k, ' text-anchor="start" font-weight="700"');
      refs.forEach(function (p, i) {
        var x = 130 + i * 32, t = r3(t0 + i * STEP);
        g += box(x, y, 28, 28, "#fff", "#aaa", 1.2) + txt(x + 14, y + 19, p, 14, C.k, ' font-weight="700"');
        g += '<rect x="' + x + '" y="' + y + '" width="28" height="28" rx="3" fill="none" stroke="' + C.a + '" stroke-width="3" opacity="0"><set attributeName="opacity" to="1" begin="' + t + 's"/><set attributeName="opacity" to="0" begin="' + r3(t + STEP) + 's"/></rect>';
        var hm = res[i].hit;
        g += '<g opacity="0">' + txt(x + 14, y + 46, hm ? "hit" : "miss", 11.5, hm ? C.b : C.hw, ' font-weight="700"') + show(t, D) + '</g>';
      });
      // frame 3개
      g += txt(505, y - 6, "memory (3 frames)", 11.5, C.m);
      for (var f = 0; f < 3; f++) g += box(450 + f * 38, y, 34, 28, "#f4f4f6", "#999", 1.2);
      res.forEach(function (r, i) {
        var from = r3(t0 + i * STEP), to = i < res.length - 1 ? r3(t0 + (i + 1) * STEP) : D, inner = '';
        r.frames.forEach(function (p, f) { inner += txt(450 + f * 38 + 17, y + 19, p, 14, r.hit ? C.b : C.hw, ' font-weight="700"'); });
        g += during(from, to, inner);
      });
      // disk
      g += box(600, y, 120, 28, C.aL, C.a, 1.2) + txt(660, y + 19, "swap (disk)", 12, C.a, ' font-weight="700"');
      res.forEach(function (r, i) {
        if (r.hit) return;
        var t = r3(t0 + i * STEP);
        g += during(t, r3(t + STEP * 0.9), '<path d="M598,' + (y + 9) + ' L568,' + (y + 9) + '" stroke="' + C.hw + '" stroke-width="2.5"/><path d="M572,' + (y + 4) + ' L564,' + (y + 9) + ' L572,' + (y + 14) + ' z" fill="' + C.hw + '"/>' +
          (r.frames.length === 3 && i >= 3 ? '<path d="M568,' + (y + 20) + ' L598,' + (y + 20) + '" stroke="' + C.c + '" stroke-width="2.5"/><path d="M594,' + (y + 15) + ' L602,' + (y + 20) + ' L594,' + (y + 25) + ' z" fill="' + C.c + '"/>' : ''));
      });
      return g;
    }
    s += rowSim(62, "① WS = 3", ["A", "B", "C", "A", "B", "C", "A", "B", "C"], 1.2);
    s += rowSim(160, "② WS = 5", ["A", "B", "C", "D", "E", "A", "B", "C", "D"], 6);
    s += during(5.7, D, txt(130, 136, "miss 3 · hit 6", 13, C.b, ' text-anchor="start" font-weight="700"'));
    s += during(10.5, D, txt(130, 234, "miss 9 · hit 0 → thrashing", 13, C.hw, ' text-anchor="start" font-weight="700"'));

    // p.54 그래프
    var GX = 470, GY = 250, GW = 260, GH = 78;
    var G = '<line x1="' + GX + '" y1="' + (GY + GH) + '" x2="' + (GX + GW) + '" y2="' + (GY + GH) + '" stroke="#555"/><line x1="' + GX + '" y1="' + GY + '" x2="' + GX + '" y2="' + (GY + GH) + '" stroke="#555"/>';
    var curve = "M" + GX + "," + (GY + GH - 4) + " C" + (GX + 70) + "," + (GY + 20) + " " + (GX + 140) + "," + (GY + 4) + " " + (GX + 175) + "," + (GY + 12) + " C" + (GX + 200) + "," + (GY + 20) + " " + (GX + 215) + "," + (GY + 80) + " " + (GX + 250) + "," + (GY + GH - 4);
    G += '<path d="' + curve + '" fill="none" stroke="' + C.k + '" stroke-width="2.5"/>';
    G += txt(GX + GW / 2, GY + GH + 14, "degree of multiprogramming →", 11, C.m) + txt(GX - 6, GY + 10, "CPU", 11, C.m, ' text-anchor="end"') + txt(GX - 6, GY + 23, "util.", 11, C.m, ' text-anchor="end"');
    G += txt(GX + 222, GY + 30, "thrashing", 12, C.hw, ' font-weight="700"');
    s += during(10.5, D, G);
    s += '<g opacity="0"><circle r="7" fill="' + C.hw + '"/><animateMotion path="' + curve + '" begin="10.7s" dur="2.8s" fill="freeze"/>' + show(10.5, D) + '</g>';
    s += during(10.5, D, txt(40, 290, "대처 (p.54): Decide not to run", 13, C.k, ' text-anchor="start" font-weight="700"') + txt(40, 310, "a subset of processes", 13, C.k, ' text-anchor="start" font-weight="700"') +
      txt(40, 332, "→ 남은 프로세스의 working set 이 메모리에 들어간다", 12, C.m, ' text-anchor="start"'));

    s += txt(380, 364, "temporal locality 가 좋을수록 working set 이 작다 (p.27)", 13, C.k, ' font-weight="700"');
    return s + '</svg>';
  }
};
