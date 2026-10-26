// fit_strategies — 14강 p.37~39: free list 에서 요청 크기에 맞는 chunk 를 고르는 네 전략
// Best Fit(가장 작은 충분한 chunk) / Worst Fit(가장 큰 chunk) / First Fit(앞에서 첫 충분한 chunk) /
// Next Fit(지난번에 찾던 곳부터 첫 충분한 chunk, 끝에 가면 처음으로).
// 고른 chunk 는 split: 요청만큼 떼어 주고 나머지는 리스트에 남긴다(0 이 되면 노드 제거). coalescing 은 하지 않는다.
// 옵션 req:
//   slide — p.39 그대로: head → 10 → 30 → 20, 요청 15 → best 10·30·5 / worst 10·15·20
//   seq   — 같은 리스트에 요청 15, 8, 12, 10, 9 → 마지막 9 에서 best·next 는 실패, worst·first 는 성공
// Next Fit 의 '찾던 곳' = 지난번 chunk 를 떼어 간 노드(그 노드가 0 이 되어 사라졌으면 그다음 노드). 위키 규약(슬라이드는 정의만 줌).
(function (global) {
  "use strict";
  global.SIMS = global.SIMS || {};

  var CODE = {
    best:  ["// Best Fit (p.37)", "후보 = { chunk : len >= 요청 }   // 리스트 전체 탐색", "고른 것 = 후보 중 len 이 가장 작은 것", "split: 요청만큼 떼어 주고 나머지는 남김"],
    worst: ["// Worst Fit (p.37)", "후보 = { chunk : len >= 요청 }   // 리스트 전체 탐색", "고른 것 = 후보 중 len 이 가장 큰 것", "split: 요청만큼 떼어 주고 나머지는 남김"],
    first: ["// First Fit (p.38)", "head 부터 차례로 보면서", "len >= 요청 인 첫 chunk 에서 멈춤", "split: 요청만큼 떼어 주고 나머지는 남김"],
    next:  ["// Next Fit (p.38)", "지난번에 찾던 곳(ptr)부터 차례로 (끝이면 head 로)", "len >= 요청 인 첫 chunk 에서 멈춤, ptr = 그곳", "split: 요청만큼 떼어 주고 나머지는 남김"]
  };
  var NAMES = { best: "Best Fit", worst: "Worst Fit", first: "First Fit", next: "Next Fit" };
  var INIT = [10, 30, 20];
  var REQS = { slide: [15], seq: [15, 8, 12, 10, 9] };

  function pick(strat, L, r, ptr) {
    var i, best = -1;
    if (strat === "best" || strat === "worst") {
      for (i = 0; i < L.length; i++) {
        if (L[i] < r) continue;
        if (best < 0 || (strat === "best" ? L[i] < L[best] : L[i] > L[best])) best = i;
      }
      return best;
    }
    var start = strat === "first" ? 0 : ptr;
    for (var k = 0; k < L.length; k++) {
      i = (start + k) % L.length;
      if (L[i] >= r) return i;
    }
    return -1;
  }

  function svg(L, hi, ptr, strat) {
    var o = '<svg viewBox="0 0 520 90" width="100%" style="max-width:560px" font-family="sans-serif">';
    o += '<text x="8" y="50" font-size="12" fill="#555">head</text>';
    var x = 52;
    L.forEach(function (len, i) {
      var c = i === hi ? "#e09a40" : "#1d65b3", f = i === hi ? "#fdeec2" : "#dbe8f7";
      o += '<line x1="' + (x - 14) + '" y1="46" x2="' + (x - 2) + '" y2="46" stroke="#777"/>';
      o += '<circle cx="' + (x + 22) + '" cy="46" r="22" fill="' + f + '" stroke="' + c + '" stroke-width="2"/>';
      o += '<text x="' + (x + 22) + '" y="51" font-size="14" text-anchor="middle" font-weight="700">' + len + '</text>';
      if (strat === "next" && i === ptr) o += '<text x="' + (x + 22) + '" y="84" font-size="11" text-anchor="middle" fill="#3b2f4a">▲ ptr</text>';
      x += 66;
    });
    o += '<line x1="' + (x - 14) + '" y1="46" x2="' + (x - 2) + '" y2="46" stroke="#777"/><text x="' + x + '" y="50" font-size="12" fill="#555">NULL</text>';
    return o + '</svg>';
  }

  global.SIMS["fit_strategies"] = {
    title: "free list 할당 전략 — Best / Worst / First / Next Fit (14강 p.37~39)",
    desc: "같은 free list(head → 10 → 30 → 20)에 같은 요청을 넣어도 전략마다 남는 조각이 다르다. 고른 chunk 는 [[splitting과 coalescing|split]] 된다. → [[할당 전략]], [[external fragmentation]]",
    options: [
      { key: "strat", label: "전략", values: [
        { value: "best", label: "Best Fit" }, { value: "worst", label: "Worst Fit" },
        { value: "first", label: "First Fit" }, { value: "next", label: "Next Fit" } ] },
      { key: "req", label: "요청", values: [
        { value: "slide", label: "p.39 그대로 (요청 15 하나)" },
        { value: "seq", label: "요청 15, 8, 12, 10, 9 (마지막에서 갈림)" } ] }
    ],
    build: function (opts) {
      var strat = opts.strat || "best", reqs = REQS[opts.req] || REQS.slide;
      var L = INIT.slice(), ptr = 0, steps = [], done = [];
      steps.push({ desc: "시작: free list '''head → 10 → 30 → 20 → NULL''' (p.39). 전략 = '''" + NAMES[strat] + "'''.", pc: { CODE: 1 },
        vars: { "free list": L.join(" → "), "요청": "-", "고른 chunk": "-", "결과": "-" }, svg: svg(L, -1, ptr, strat) });
      reqs.forEach(function (r) {
        var i = pick(strat, L, r, ptr);
        if (i < 0) {
          done.push(r + ": 실패");
          var st = { desc: "요청 '''" + r + "''' — 리스트에 " + r + " 이상인 chunk 가 없다 → '''실패'''. 남은 공간 합은 " + L.reduce(function (a, b) { return a + b; }, 0) + " 인데도 — [[external fragmentation]].", pc: { CODE: 3 },
            vars: { "free list": L.join(" → ") || "(비었음)", "요청": r, "고른 chunk": "없음", "결과": done.join(" / ") }, svg: svg(L, -1, ptr, strat) };
          st.note = "요청 " + r + " 실패 (남은 합 " + L.reduce(function (a, b) { return a + b; }, 0) + ")";
          steps.push(st);
          return;
        }
        var before = L[i];
        steps.push({ desc: "요청 '''" + r + "''' — " + NAMES[strat] + " 는 '''" + before + "''' 짜리 chunk(" + (i + 1) + "번째)를 고른다.", pc: { CODE: 3 },
          vars: { "free list": L.join(" → "), "요청": r, "고른 chunk": before + " (" + (i + 1) + "번째)", "결과": done.join(" / ") || "-" }, svg: svg(L, i, ptr, strat) });
        L[i] -= r;
        if (L[i] === 0) { L.splice(i, 1); ptr = L.length ? i % L.length : 0; } else { ptr = i; }
        done.push(r + "→" + before);
        steps.push({ desc: "split: " + r + " 을 떼어 주고 " + (before - r) + (before - r === 0 ? " — chunk 가 다 쓰여 노드가 빠진다" : " 이 리스트에 남는다") + ".", pc: { CODE: 4 },
          vars: { "free list": L.join(" → ") || "(비었음)", "요청": r, "고른 chunk": before + " → " + (before - r), "결과": done.join(" / ") }, svg: svg(L, before - r ? i : -1, ptr, strat) });
      });
      return {
        panels: [{ id: "CODE", title: NAMES[strat], lang: "txt", lines: CODE[strat] }],
        vars: [{ name: "free list", group: "상태" }, { name: "요청", group: "이번 요청" }, { name: "고른 chunk", group: "이번 요청" }, { name: "결과", group: "누적" }],
        steps: steps
      };
    }
  };
})(typeof window !== "undefined" ? window : globalThis);
