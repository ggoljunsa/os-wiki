// ============================================================
// free_list_alloc — base and bounds 에서 OS 가 free list 로 칸을 찾고 돌려받는다 (13강 p.51~53)
// 시간축(초): 0~1.5 구성(64KB, free list 32→16→48) → 1.5~3 lookup(맨 앞 32KB) → 3~5 칸을 빼고 프로세스 적재
//   → 5~7.5 base 32KB · bounds 16KB 로 실행 → 7.5~10 종료, 32KB 칸이 리스트 앞으로 → 10~12 원래 상태
// ============================================================
window.ANIMS = window.ANIMS || {};
ANIMS["free_list_alloc"] = {
  title: "Free list — 새 프로세스는 리스트에서 칸을 빼 가고, 끝나면 돌려준다",
  desc: "[[free list]] p.51~53. 물리 메모리 64KB 의 빈 16KB 칸 셋이 free list(32KB → 16KB → 48KB)에 있다. OS 가 맨 앞 칸을 꺼내 [[base and bounds|base]] 를 정하고, 프로세스가 끝나면 그 칸을 다시 리스트에 넣는다",
  duration: 12,
  build: function () {
    var D = 12;
    var C = { a: "#1d65b3", aL: "#dbe8f7", b: "#2e9e4f", bL: "#dff3e4", c: "#e09a40", cL: "#fdeec2", k: "#3b2f4a", kL: "#efe9f6", hw: "#d6465f", hwL: "#f7d8dc", m: "#777" };
    function r3(v) { return Math.round(v * 1000) / 1000; }
    function box(x, y, w, h, fill, stroke, sw, extra) { return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="4" fill="' + fill + '" stroke="' + stroke + '" stroke-width="' + (sw || 1.5) + '"' + (extra || "") + '/>'; }
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

    var s = '<svg viewBox="0 0 760 340" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="free list 할당과 반납 애니메이션">';
    s += '<defs><marker id="fla_arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="#555"/></marker></defs>';
    [
      [0, 1.5, "물리 메모리 64KB: 0~16KB 는 OS, 빈 16KB 칸 셋은 free list 에 있다"],
      [1.5, 3, "새 프로세스가 온다 → OS 가 free list 를 찾아본다 (lookup): 맨 앞 32KB"],
      [3, 5, "그 칸을 리스트에서 빼고, 주소 공간을 32KB~48KB 에 올린다"],
      [5, 7.5, "base = 32KB, bounds = 16KB 로 실행. free list 는 16KB → 48KB"],
      [7.5, 10, "프로세스 종료 → OS 가 그 칸을 free list 에 되돌린다 (p.53)"],
      [10, D, "다시 32KB → 16KB → 48KB. 칸이 붙어 있어도 노드는 셋 그대로다"]
    ].forEach(function (c) { s += during(c[0], c[1], txt(380, 26, c[2], 14.5, "#222", ' font-weight="700"')); });

    // 물리 메모리 (16KB = 60px)
    var X = 70, W = 150, Y = 56, H16 = 60;
    s += txt(X + W / 2, Y - 8, "Physical Memory", 12.5, C.k, ' font-weight="700"');
    s += box(X, Y, W, H16, "#c9d7ee", C.a) + txt(X + W / 2, Y + 35, "Operating System", 12.5, C.a, ' font-weight="700"');
    for (var i = 1; i < 4; i++) s += box(X, Y + i * H16, W, H16, "#fafafa", "#999") + txt(X + W / 2, Y + i * H16 + 35, "not in use", 12, C.m);
    ["0KB", "16KB", "32KB", "48KB", "64KB"].forEach(function (l, i) { s += txt(X - 6, Y + i * H16 + 4, l, 11.5, C.m, ' text-anchor="end"'); });

    // 프로세스 (오른쪽 아래에서 32KB 칸으로 이동, 종료 때 사라짐)
    s += '<g opacity="0"><rect x="0" y="0" width="' + W + '" height="' + H16 + '" rx="4" fill="' + C.bL + '" stroke="' + C.b + '" stroke-width="2"/>' +
      txt(W / 2, 26, "새 프로세스", 13, C.b, ' font-weight="700"') + txt(W / 2, 45, "Code · Heap · Stack", 11.5, C.b) +
      '<animateTransform attributeName="transform" type="translate" values="420,240;420,240;' + X + ',' + (Y + 2 * H16) + '" keyTimes="0;0.4;1" begin="1.5s" dur="3s" fill="freeze"/>' +
      show(1.5, 7.8) + '</g>';

    // free list
    function list(nodes, hi) {
      var g = txt(270, 132, "Free list", 13, C.k, ' font-weight="700"') + '<line x1="300" y1="138" x2="326" y2="138" stroke="#555" stroke-width="1.6" marker-end="url(#fla_arr)"/>';
      var x = 330;
      nodes.forEach(function (n, j) {
        g += box(x, 120, 70, 36, n === "32KB" ? C.cL : "#fff", n === "32KB" ? C.c : "#777", 1.8) + txt(x + 35, 143, n, 13.5, C.k, ' font-weight="700"');
        if (hi && j === 0) g += '<rect x="' + (x - 5) + '" y="115" width="80" height="46" rx="6" fill="none" stroke="' + C.a + '" stroke-width="2.5" stroke-dasharray="5,4"/>';
        g += '<line x1="' + (x + 70) + '" y1="138" x2="' + (x + 98) + '" y2="138" stroke="#555" stroke-width="1.6" marker-end="url(#fla_arr)"/>';
        x += 100;
      });
      return g + txt(x + 18, 143, "NULL", 12.5, C.m);
    }
    s += during(0, 1.5, list(["32KB", "16KB", "48KB"], false));
    s += during(1.5, 3, list(["32KB", "16KB", "48KB"], true));
    s += during(3, 9.2, list(["16KB", "48KB"], false));
    s += during(9.2, D, list(["32KB", "16KB", "48KB"], false));

    // lookup 화살표 → 32KB 칸
    s += during(1.5, 4.5, '<path d="M365,160 C340,220 280,200 ' + (X + W + 6) + ',' + (Y + 2.5 * H16) + '" fill="none" stroke="' + C.a + '" stroke-width="2.5" stroke-dasharray="6,4" marker-end="url(#fla_arr)"/>');

    // base/bounds 레지스터
    s += during(4.5, 7.8, box(330, 190, 170, 64, C.kL, C.k) + txt(415, 214, "base = 32KB", 14, C.k, ' font-weight="700"') + txt(415, 240, "bounds = 16KB", 14, C.k, ' font-weight="700"') + txt(560, 225, "MMU 레지스터", 12, C.m));

    // 종료
    s += during(7.3, 7.8, box(X, Y + 2 * H16, W, H16, C.hwL, C.hw, 2) + txt(X + W / 2, Y + 2.5 * H16 + 5, "exit", 14, C.hw, ' font-weight="700"'));
    s += '<g opacity="0"><rect x="-35" y="-18" width="70" height="36" rx="4" fill="' + C.cL + '" stroke="' + C.c + '" stroke-width="1.8"/>' + txt(0, 5, "32KB", 13.5, C.k, ' font-weight="700"') +
      '<animateMotion path="M' + (X + W / 2) + ',' + (Y + 2.5 * H16) + ' C260,250 300,150 365,138" begin="7.8s" dur="1.4s" fill="freeze"/>' + show(7.8, 9.2) + '</g>';

    s += txt(380, 330, "할당 = 리스트에서 빼기 · 해제 = 리스트에 넣기. OS 가 빈 물리 메모리를 이 목록으로 추적한다", 13.5, C.k, ' font-weight="700"');
    return s + '</svg>';
  }
};
