// disk_sched — 18강 p.34~39: 같은 요청 큐를 FCFS/SSTF/SCAN/C-SCAN 으로 돌려 head 이동량을 센다.
(function (global) {
  "use strict";
  global.SIMS = global.SIMS || {};
  var MAX = 199;
  var SETS = {
    slide: { head: 53, reqs: [98, 183, 37, 122, 14, 124, 65, 67], label: "슬라이드 p.34 (head 53)" },
    prac: { head: 100, reqs: [55, 58, 39, 18, 90, 160, 150, 38, 184], label: "연습 (head 100)" }
  };
  var CODE = {
    fcfs: ["next = 큐에 먼저 들어온 요청;", "head 를 next 로 이동;"],
    sstf: ["next = 현재 head 에서 가장 가까운 요청;", "head 를 next 로 이동;"],
    scan: ["아래로: head 보다 작은 요청을 차례로;", "디스크 끝 0 까지 이동;", "방향 반대: 남은 요청을 위로 차례로;"],
    look: ["아래로: head 보다 작은 요청을 차례로;", "끝까지 가지 않고 방향 반대;", "남은 요청을 위로 차례로;"],
    cscan: ["위로: head 이상인 요청을 차례로;", "디스크 끝 199 까지 이동;", "0 으로 복귀 (요청 처리 없음);", "남은 요청을 위로 차례로;"]
  };
  function route(pol, head, reqs) {
    var up = reqs.filter(function (r) { return r >= head; }).sort(function (a, b) { return a - b; });
    var down = reqs.filter(function (r) { return r < head; }).sort(function (a, b) { return b - a; });
    var low = down.slice().reverse(), out = [];
    function req(p, line) { out.push({ pos: p, kind: "req", line: line }); }
    if (pol === "fcfs") reqs.forEach(function (p) { req(p, 2); });
    if (pol === "sstf") {
      var rest = reqs.slice(), cur = head;
      while (rest.length) {
        var best = 0;
        for (var i = 1; i < rest.length; i++) {
          var d = Math.abs(rest[i] - cur), bd = Math.abs(rest[best] - cur);
          if (d < bd || (d === bd && rest[i] < rest[best])) best = i;
        }
        cur = rest.splice(best, 1)[0];
        req(cur, 2);
      }
    }
    if (pol === "scan") {
      down.forEach(function (p) { req(p, 1); });
      out.push({ pos: 0, kind: "end", line: 2 });
      up.forEach(function (p) { req(p, 3); });
    }
    if (pol === "look") {
      down.forEach(function (p) { req(p, 1); });
      up.forEach(function (p) { req(p, 3); });
    }
    if (pol === "cscan") {
      up.forEach(function (p) { req(p, 1); });
      out.push({ pos: MAX, kind: "end", line: 2 });
      out.push({ pos: 0, kind: "jump", line: 3 });
      low.forEach(function (p) { req(p, 4); });
    }
    return out;
  }
  function chart(S, path, done) {
    var L = 30, W = 620, top = 62, gap = 26;
    function X(v) { return Math.round(L + v * W / MAX); }
    var H = top + gap * Math.max(S.reqs.length + 3, 1) + 14;
    var s = '<svg viewBox="0 0 680 ' + H + '" xmlns="http://www.w3.org/2000/svg" font-size="12">';
    s += '<defs><marker id="ds_arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" fill="#1d65b3"/></marker></defs>';
    s += '<text x="30" y="16" fill="#3b2f4a" font-weight="700">queue:</text>';
    var qx = 78;
    S.reqs.forEach(function (r) {
      var isDone = done.indexOf(r) >= 0;
      s += '<text x="' + qx + '" y="16" fill="' + (isDone ? "#bbb" : "#222") + '"' + (isDone ? ' text-decoration="line-through"' : "") + '>' + r + '</text>';
      qx += 36;
    });
    s += '<line x1="' + L + '" y1="' + (top - 8) + '" x2="' + (L + W) + '" y2="' + (top - 8) + '" stroke="#555"/>';
    var marks = [0, MAX].concat(S.reqs.concat([S.head]).sort(function (a, b) { return a - b; }));
    var lastX = -99, tier = 0;
    marks.sort(function (a, b) { return a - b; }).forEach(function (m) {
      var x = X(m);
      tier = x - lastX < 22 ? (tier ? 0 : 1) : 0;
      lastX = x;
      s += '<line x1="' + x + '" y1="' + (top - 12) + '" x2="' + x + '" y2="' + (top - 4) + '" stroke="#555"/>';
      s += '<text x="' + x + '" y="' + (tier ? 28 : 42) + '" text-anchor="middle" fill="' + (m === S.head ? "#d6465f" : "#555") + '">' + m + '</text>';
    });
    var y = top + 6, px = X(S.head);
    s += '<circle cx="' + px + '" cy="' + y + '" r="4" fill="#d6465f"/>';
    path.forEach(function (p, i) {
      var nx = X(p.pos), ny = top + 6 + (i + 1) * gap, last = i === path.length - 1;
      var col = p.kind === "jump" ? "#999" : last ? "#d6465f" : "#1d65b3";
      s += '<line x1="' + px + '" y1="' + y + '" x2="' + nx + '" y2="' + ny + '" stroke="' + col + '" stroke-width="' + (last ? 2.4 : 1.5) + '"' + (p.kind === "jump" ? ' stroke-dasharray="5 4"' : ' marker-end="url(#ds_arrow)"') + '/>';
      s += '<circle cx="' + nx + '" cy="' + ny + '" r="3.5" fill="' + (p.kind === "req" ? col : "#fff") + '" stroke="' + col + '"/>';
      px = nx; y = ny;
    });
    return s + '</svg>';
  }
  global.SIMS["disk_sched"] = {
    title: "디스크 스케줄링 손으로 돌리기 (18강 p.34~39)",
    desc: "head 이동량을 한 칸씩 더한다. → [[디스크 스케줄링]]",
    options: [
      { key: "policy", label: "정책", values: [{ value: "fcfs", label: "FCFS" }, { value: "sstf", label: "SSTF" }, { value: "scan", label: "SCAN (아래로)" }, { value: "cscan", label: "C-SCAN (위로)" }, { value: "look", label: "LOOK (208 확인용)" }] },
      { key: "set", label: "요청", values: [{ value: "slide", label: SETS.slide.label }, { value: "prac", label: SETS.prac.label }] }
    ],
    build: function (opts) {
      var pol = opts.policy || "fcfs", S = SETS[opts.set || "slide"];
      var r = route(pol, S.head, S.reqs), path = [], done = [], steps = [], head = S.head, total = 0;
      function vars(dist) {
        return { "head": head, "이번 이동": dist === null ? "-" : dist, "누적 이동": total, "남은 요청": S.reqs.length - done.length };
      }
      steps.push({ desc: "head 는 " + S.head + ", 디스크 범위는 0~" + MAX, pc: { P: null }, vars: vars(null), svg: chart(S, [], []) });
      r.forEach(function (p) {
        var from = head, d = Math.abs(p.pos - from);
        head = p.pos; total += d; path.push(p);
        if (p.kind === "req") done.push(p.pos);
        var txt = p.kind === "req" ? "요청 " + p.pos + " 처리" : p.kind === "end" ? "디스크 끝 " + p.pos + " 도착" : "시작점 0 으로 복귀";
        steps.push({ desc: txt + ": |" + from + " − " + p.pos + "| = " + d, pc: { P: p.line }, vars: vars(d), svg: chart(S, path, done) });
      });
      return {
        panels: [{ id: "P", title: pol.toUpperCase() + " 규칙", lang: "c", lines: CODE[pol] }],
        vars: ["head", "이번 이동", "누적 이동", "남은 요청"].map(function (n) { return { name: n, group: "디스크" }; }),
        steps: steps
      };
    }
  };
})(typeof window !== "undefined" ? window : globalThis);
