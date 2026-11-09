// page_replace — 17강 p.32~39, p.46: 참조열을 정책별로 손으로 돌린다. 슬라이드 트레이스와 Belady 예시.
(function (global) {
  "use strict";
  global.SIMS = global.SIMS || {};
  var SETS = {
    slide: { refs: [0,1,2,0,1,3,0,3,1,2,1], frames: 3, label: "슬라이드 p.32 (frame 3)" },
    b3: { refs: [1,2,3,4,1,2,5,1,2,3,4,5], frames: 3, label: "Belady 참조열 (frame 3)" },
    b4: { refs: [1,2,3,4,1,2,5,1,2,3,4,5], frames: 4, label: "Belady 참조열 (frame 4)" }
  };
  var CODE = {
    opt: ["if (page in cache) hit;", "else if (cache not full) insert;", "else evict the page used furthest in the future;"],
    fifo: ["if (page in cache) hit;   // 순서 그대로", "else if (cache not full) enqueue;", "else evict the first-in page; enqueue;"],
    random: ["if (page in cache) hit;", "else if (cache not full) insert;", "else evict a random page; insert;"],
    lru: ["if (page in cache) hit; move to MRU;", "else if (cache not full) insert at MRU;", "else evict the LRU page; insert at MRU;"],
    clock: ["if (page in cache) hit; ref = 1;", "else if (cache not full) insert; ref = 1;", "else while (ref[hand]) { ref[hand] = 0; hand++; } evict; ref = 1; hand++;"]
  };
  var RANDOM_SLIDE = [0, 1, 3];   // p.36 의 evict 순서
  function esc(v) { return String(v); }
  function cacheSvg(cells, hand) {
    var n = cells.length, w = 66, s = '<svg viewBox="0 0 ' + (n * w + 20) + ' 78" xmlns="http://www.w3.org/2000/svg">';
    for (var i = 0; i < n; i++) {
      var c = cells[i], x = 10 + i * w;
      s += '<rect x="' + x + '" y="24" width="58" height="42" rx="5" fill="' + (c.cls === "new" ? "#fdeec2" : c.cls === "hit" ? "#cdefd2" : "#dbe8f7") + '" stroke="#1d65b3"/>';
      s += '<text x="' + (x + 29) + '" y="51" font-size="17" text-anchor="middle" fill="#222">' + (c.v === null ? "–" : esc(c.v)) + '</text>';
      if (c.ref !== undefined) s += '<text x="' + (x + 52) + '" y="37" font-size="11" text-anchor="end" fill="#777">' + c.ref + '</text>';
      if (hand === i) s += '<text x="' + (x + 29) + '" y="17" font-size="13" text-anchor="middle" fill="#d6465f">▼ hand</text>';
    }
    return s + '</svg>';
  }
  global.SIMS["page_replace"] = {
    title: "페이지 교체 정책 손으로 돌리기 (17강 p.32~39, p.46)",
    desc: "같은 참조열을 정책별로 한 칸씩 돌려 hit 수를 비교한다. Random 의 슬라이드 참조열은 p.36 의 evict 순서를 그대로 쓴다. → [[페이지 교체 정책]]",
    options: [
      { key: "policy", label: "정책", values: [{ value: "opt", label: "Optimal" }, { value: "fifo", label: "FIFO" }, { value: "random", label: "Random" }, { value: "lru", label: "LRU" }, { value: "clock", label: "Clock" }] },
      { key: "set", label: "참조열", values: [{ value: "slide", label: SETS.slide.label }, { value: "b3", label: SETS.b3.label }, { value: "b4", label: SETS.b4.label }] }
    ],
    build: function (opts) {
      var pol = opts.policy || "opt", S = SETS[opts.set || "slide"], refs = S.refs, F = S.frames;
      var cache = [], ref = {}, hand = 0, hits = 0, steps = [], rndI = 0, seed = 7;
      function rnd(n) { seed = (seed * 1103 + 12345) % 65536; return seed % n; }
      function snapshot(desc, pc, page, res, evict, cls) {
        var cells = [];
        for (var i = 0; i < F; i++) {
          var v = i < cache.length ? cache[i] : null, o = { v: v, cls: v === page ? cls : "" };
          if (pol === "clock" && v !== null) o.ref = ref[v];
          cells.push(o);
        }
        var seq = refs.join(" ");
        var svg = cacheSvg(cells, pol === "clock" ? hand : -1);
        steps.push({ desc: desc, pc: { P: pc }, vars: { "참조열": seq, "이번 참조": page === null ? "-" : page, "결과": res, "Evict": evict === null ? "-" : evict, "Cache": cache.length ? cache.join(",") : "(비어 있음)", "hit / miss": hits + " / " + (steps.length === 0 ? 0 : missCount) }, svg: svg });
      }
      var missCount = 0;
      snapshot("처음엔 cache 가 비어 있다. frame " + F + "개.", null, null, "-", null, "");
      for (var t = 0; t < refs.length; t++) {
        var p = refs[t], idx = cache.indexOf(p), ev = null, pc, res, why = "";
        if (idx >= 0) {
          hits++; res = "Hit"; pc = 1;
          if (pol === "lru") { cache.splice(idx, 1); cache.push(p); why = " 가장 최근(MRU) 자리로 옮긴다."; }
          if (pol === "clock") { ref[p] = 1; why = " reference bit = 1."; }
        } else {
          missCount++; res = "Miss";
          if (cache.length < F) {
            pc = 2; cache.push(p); ref[p] = 1;
            if (pol === "clock") hand = cache.length % F;
          } else {
            pc = 3;
            if (pol === "opt") {
              var far = -1, best = -1;
              for (var i = 0; i < F; i++) {
                var nx = refs.indexOf(cache[i], t + 1); if (nx < 0) nx = 1e9;
                if (nx >= far) { far = nx; best = i; }
              }
              ev = cache[best]; cache[best] = p;
              why = " 앞으로의 참조에서 " + ev + " 이(가) 가장 늦게 나오거나 다시 안 나온다.";
            } else if (pol === "fifo") { ev = cache.shift(); cache.push(p); why = " 가장 먼저 들어온 page."; }
            else if (pol === "lru") { ev = cache.shift(); cache.push(p); why = " 가장 오래전에 쓴 page."; }
            else if (pol === "random") {
              var at = (opts.set || "slide") === "slide" ? cache.indexOf(RANDOM_SLIDE[rndI++]) : rnd(F);
              ev = cache[at]; cache.splice(at, 1); cache.push(p); why = " 무작위로 골랐다.";
            } else {
              var cleared = [];
              while (ref[cache[hand]]) { ref[cache[hand]] = 0; cleared.push(cache[hand]); hand = (hand + 1) % F; }
              ev = cache[hand]; cache[hand] = p; ref[p] = 1; hand = (hand + 1) % F;
              why = (cleared.length ? " bit 을 지운 page: " + cleared.join(",") + "." : "") + " bit 0 인 page 를 내보낸다.";
            }
          }
        }
        snapshot("참조 '''" + p + "''' → '''" + res + "'''" + (ev !== null ? ", evict '''" + ev + "'''" : "") + "." + why, pc, p, res, ev, res === "Hit" ? "hit" : "new");
      }
      var last = steps[steps.length - 1], total = refs.length;
      last.note = "hit " + hits + " / " + total + " = " + (hits * 100 / total).toFixed(1) + "% · page fault " + missCount + "번";
      return { panels: [{ id: "P", title: pol.toUpperCase() + " 규칙", lang: "c", lines: CODE[pol] }],
        vars: ["참조열", "이번 참조", "결과", "Evict", "Cache", "hit / miss"].map(function (n) { return { name: n, group: "상태" }; }),
        steps: steps };
    }
  };
})(typeof window !== "undefined" ? window : globalThis);
