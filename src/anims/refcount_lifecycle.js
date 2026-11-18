// refcount_lifecycle — 과제 3 Problem 1: frame B 하나의 reference count 가 kalloc → fork → fork → COW 복사 → exit → exit 동안 1 2 3 2 1 0.
window.ANIMS = window.ANIMS || {};
ANIMS["refcount_lifecycle"] = {
  title: "Reference count: 마지막 참조가 사라질 때만 free",
  desc: "frame B 하나를 몇 개의 page table 이 가리키는지 센다. [[reference count]] 가 0 이 되는 순간에만 free list 로 간다.",
  duration: 14,
  build: function () {
    var D = 14;
    function r3(v) { return Math.round(v * 1000) / 1000; }
    function show(a, b) { return '<animate attributeName="opacity" values="0;0;1;1;0;0" keyTimes="0;' + r3(a / D) + ';' + r3(a / D + 0.003) + ';' + r3(b / D) + ';' + r3(Math.min(0.999, b / D + 0.003)) + ';1" dur="' + D + 's" fill="freeze"/>'; }
    function vis(a, b, s) { return '<g opacity="0">' + s + show(a, b) + '</g>'; }
    function box(x, y, w, h, f, st) { return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="6" fill="' + f + '" stroke="' + st + '"/>'; }
    function t(x, y, s, sz, c, ex) { return '<text x="' + x + '" y="' + y + '" font-size="' + (sz || 13) + '" fill="' + (c || "#222") + '" text-anchor="middle"' + (ex || "") + '>' + s + '</text>'; }
    function arrow(x1, y1, x2, y2, c) { return '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '" stroke="' + c + '" stroke-width="2" marker-end="url(#rcl_ar)"/>'; }
    // 사건: [시작, 끝, 자막, rc]
    var ev = [
      [0, 2, "kalloc() 이 frame B 를 부모에게 준다", 1],
      [2, 4, "부모가 fork → 자식 1 이 B 를 공유 (+1)", 2],
      [4, 6, "자식 1 이 다시 fork → 자식 2 도 B 를 공유 (+1)", 3],
      [6, 8, "자식 1 이 B 에 씀 → 자기 사본으로 옮기고 kfree(B) (−1)", 2],
      [8, 10, "자식 2 가 exit → kfree(B) (−1)", 1],
      [10, 12, "부모가 exit → kfree(B) (−1). 0 이 됐다", 0],
      [12, 13.98, "rc 0 → 이제야 B 가 free list 로 돌아간다", 0]
    ];
    var s = '<svg viewBox="0 0 760 340" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="reference count">';
    s += '<defs><marker id="rcl_ar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0L10,5L0,10z" fill="#666"/></marker></defs>';
    ev.forEach(function (e) { s += '<g opacity="0">' + t(380, 26, e[2], 15, "#3b2f4a", ' font-weight="700"') + show(e[0], e[1]) + '</g>'; });
    // frame B 와 count
    s += box(310, 130, 140, 70, "#efe9f6", "#3b2f4a") + t(380, 156, "frame B", 14, "#3b2f4a", ' font-weight="700"');
    ev.forEach(function (e, i) {
      var col = e[3] === 0 ? "#999" : e[3] > 1 ? "#d6465f" : "#1d6b2a";
      if (i < 6) s += vis(e[0], e[1], t(380, 186, "rc = " + e[3], 18, col, ' font-weight="700"'));
    });
    s += vis(12, 13.99, t(380, 186, "free", 18, "#999", ' font-weight="700"'));
    // 프로세스 3개
    var P = [[90, 80, "부모", "#1d65b3", "#dbe8f7", 0, 12], [90, 230, "자식 1", "#2e9e4f", "#dff3e4", 2, 8], [670, 150, "자식 2", "#e09a40", "#fdeec2", 4, 10]];
    P.forEach(function (p) {
      s += vis(p[5], 13.99, box(p[0] - 60, p[1] - 22, 120, 44, p[4], p[3]) + t(p[0], p[1] + 5, p[2], 13, p[3], ' font-weight="700"'));
    });
    // 가리키는 화살표 (보이는 구간 = 공유 구간)
    s += vis(0, 10, arrow(150, 88, 308, 145, "#1d65b3"));
    s += vis(2, 6, arrow(150, 222, 308, 185, "#2e9e4f"));
    s += vis(4, 8, arrow(610, 158, 452, 165, "#e09a40"));
    // 자식 1 의 새 frame
    s += vis(6, 13.99, box(200, 280, 110, 40, "#f4f4f4", "#2e9e4f") + t(255, 305, "자식 1 의 사본", 12, "#2e9e4f"));
    s += vis(6, 8, arrow(110, 252, 200, 292, "#2e9e4f"));
    // exit 표시
    s += vis(8, 13.99, t(670, 196, "exit", 12, "#777"));
    s += vis(10, 13.99, t(90, 118, "exit", 12, "#777"));
    // free list
    s += box(560, 260, 170, 50, "#fafafa", "#999") + t(645, 280, "free list", 13, "#555", ' font-weight="700"') + t(645, 298, "kalloc 이 다시 줄 수 있음", 11, "#777");
    s += '<g opacity="0"><rect x="0" y="0" width="34" height="22" rx="3" fill="#efe9f6" stroke="#3b2f4a"/>' + t(17, 15, "B", 12, "#3b2f4a", ' font-weight="700"') +
      '<animateMotion path="M363 170 L628 268" begin="12.1s" dur="1.2s" fill="freeze"/>' + show(12.1, 13.99) + '</g>';
    s += t(380, 334, "fork 는 +1, kfree 는 −1. free list 에 넣는 일은 0 이 되었을 때 한 번만 한다.", 13, "#777");
    return s + '</svg>';
  }
};
