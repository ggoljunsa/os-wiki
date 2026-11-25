// ============================================================
// heap_stack_grow — 16KB 주소 공간에서 heap 은 아래로, stack 은 위로 자라고 (13강 p.21~22),
//   mem.c 두 프로세스가 같은 가상 주소 0xcf2010 을 찍어도 물리 위치는 다르다 (p.23~24)
// 시간축(초): 0~1.5 구성 → 1.5~5.5 malloc·함수 호출로 heap↓ stack↑ → 5.5~8 두 프로세스 출력
//   → 8~10.5 서로 다른 물리 주소로 변환 → 10.5~12 요점
// ============================================================
window.ANIMS = window.ANIMS || {};
ANIMS["heap_stack_grow"] = {
  title: "가상 주소 공간 — heap 과 stack 은 서로를 향해 자라고, 주소는 전부 가상이다",
  desc: "[[가상 주소 공간]] p.21~22 그림(16KB: code · heap · free · stack)과 p.23~24 mem.c. 두 프로세스가 같은 heap 주소 0xcf2010 을 출력하지만 [[MMU]] 가 서로 다른 물리 주소로 [[주소 변환|변환]]한다",
  duration: 12,
  build: function () {
    var D = 12;
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
    function anim(attr, from, to, b, d) { return '<animate attributeName="' + attr + '" from="' + from + '" to="' + to + '" begin="' + b + 's" dur="' + d + 's" fill="freeze"/>'; }

    var s = '<svg viewBox="0 0 760 360" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="heap stack 성장과 가상 주소 애니메이션">';
    s += '<defs><marker id="hsg_arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="#555"/></marker></defs>';
    [
      [0, 1.5, "가상 주소 공간 16KB: 위에 code, 가운데 free 를 사이에 두고 heap 과 stack"],
      [1.5, 5.5, "malloc 하면 heap 이 아래로, 함수를 부르면 stack 이 위로 — 서로를 향해 자란다"],
      [5.5, 8, "mem.c 를 두 번 실행: PID 2413 과 2414 가 찍은 heap 주소가 둘 다 0xcf2010"],
      [8, 10.5, "같은 가상 주소지만 OS 와 MMU 가 서로 다른 물리 주소로 변환한다"],
      [10.5, D, "p.23: Every address in a running program is virtual"]
    ].forEach(function (c) { s += during(c[0], c[1], txt(380, 26, c[2], 14.5, "#222", ' font-weight="700"')); });

    // ---- 왼쪽: 16KB 주소 공간 (1KB = 17.5px) ----
    var X = 80, W = 150, Y0 = 50, K = 17.5;
    s += box(X, Y0, W, 16 * K, "#fafafa", "#999");
    s += box(X, Y0, W, K, C.kL, C.k) + txt(X + W / 2, Y0 + 13, "Program Code", 12.5, C.k, ' font-weight="700"');
    // heap: 1KB 에서 아래로
    s += '<rect x="' + X + '" y="' + (Y0 + K) + '" width="' + W + '" height="' + K + '" fill="' + C.bL + '" stroke="' + C.b + '" stroke-width="1.5">' +
      anim("height", K, 2 * K, 1.8, 0.6) + '<animate attributeName="height" from="' + (2 * K) + '" to="' + (3 * K) + '" begin="3.4s" dur="0.6s" fill="freeze"/></rect>';
    s += '<g>' + txt(X + W / 2, Y0 + K + 13, "Heap ↓", 12.5, C.b, ' font-weight="700"') + '</g>';
    // stack: 16KB 에서 위로
    s += '<rect x="' + X + '" y="' + (Y0 + 15 * K) + '" width="' + W + '" height="' + K + '" fill="' + C.aL + '" stroke="' + C.a + '" stroke-width="1.5">' +
      anim("y", Y0 + 15 * K, Y0 + 14 * K, 2.6, 0.6) + anim("height", K, 2 * K, 2.6, 0.6) +
      '<animate attributeName="y" from="' + (Y0 + 14 * K) + '" to="' + (Y0 + 13 * K) + '" begin="4.4s" dur="0.6s" fill="freeze"/><animate attributeName="height" from="' + (2 * K) + '" to="' + (3 * K) + '" begin="4.4s" dur="0.6s" fill="freeze"/></rect>';
    s += txt(X + W / 2, Y0 + 16 * K - 5, "Stack ↑", 12.5, C.a, ' font-weight="700"');
    s += txt(X + W / 2, Y0 + 8.5 * K, "(free)", 13, C.m);
    s += txt(X - 6, Y0 + 5, "0KB", 11, C.m, ' text-anchor="end"') + txt(X - 6, Y0 + K + 5, "1KB", 11, C.m, ' text-anchor="end"') + txt(X - 6, Y0 + 16 * K + 4, "16KB", 11, C.m, ' text-anchor="end"');
    // 이벤트 라벨
    s += during(1.6, 2.6, txt(X + W + 12, Y0 + 2 * K + 4, "malloc()", 13, C.b, ' text-anchor="start" font-weight="700"'));
    s += during(3.2, 4.2, txt(X + W + 12, Y0 + 3 * K + 4, "malloc()", 13, C.b, ' text-anchor="start" font-weight="700"'));
    s += during(2.4, 3.4, txt(X + W + 12, Y0 + 14 * K + 4, "함수 호출", 13, C.a, ' text-anchor="start" font-weight="700"'));
    s += during(4.2, 5.2, txt(X + W + 12, Y0 + 13 * K + 4, "함수 호출", 13, C.a, ' text-anchor="start" font-weight="700"'));

    // ---- 오른쪽: 두 프로세스 + 물리 메모리 ----
    var procs = [[290, "PID 2413", C.a, C.aL, 120], [610, "PID 2414", C.b, C.bL, 262]];
    var R = '';
    procs.forEach(function (p) {
      var px = p[0];
      R += box(px, 70, 100, 200, "#fff", p[2], 2) + txt(px + 50, 62, p[1], 13, p[2], ' font-weight="700"');
      R += box(px + 6, 80, 88, 22, C.kL, C.k, 1) + txt(px + 50, 96, "code", 12, C.k);
      R += box(px + 6, 108, 88, 26, p[3], p[2], 1) + txt(px + 50, 125, "heap", 12, p[2], ' font-weight="700"');
      R += box(px + 6, 236, 88, 26, p[3], p[2], 1) + txt(px + 50, 253, "stack", 12, p[2]);
      R += txt(px + 50, 292, "heap : 0xcf2010", 12.5, p[2], ' font-weight="700" font-family="monospace"');
    });
    s += during(5.5, D, R);
    s += during(5.5, D, '<rect x="286" y="278" width="108" height="22" rx="4" fill="none" stroke="' + C.c + '" stroke-width="2"/><rect x="606" y="278" width="108" height="22" rx="4" fill="none" stroke="' + C.c + '" stroke-width="2"/>' +
      '<path d="M400,289 L600,289" stroke="' + C.c + '" stroke-width="2" stroke-dasharray="4,4"/>' + txt(500, 318, "같은 가상 주소!", 13.5, C.c, ' font-weight="700"'));

    // 물리 메모리
    var P = '';
    P += box(445, 60, 110, 210, "#f6f6f6", "#999") + txt(500, 54, "Physical Memory", 12.5, C.k, ' font-weight="700"');
    for (var i = 1; i < 7; i++) P += '<line x1="445" y1="' + (60 + i * 30) + '" x2="555" y2="' + (60 + i * 30) + '" stroke="#ddd"/>';
    P += box(449, 92, 102, 26, C.aL, C.a, 1.5) + txt(500, 110, "2413 의 heap", 11.5, C.a, ' font-weight="700"');
    P += box(449, 212, 102, 26, C.bL, C.b, 1.5) + txt(500, 230, "2414 의 heap", 11.5, C.b, ' font-weight="700"');
    s += during(8, D, P);
    s += during(8, D, '<path d="M390,121 C415,121 420,105 446,105" fill="none" stroke="' + C.a + '" stroke-width="2.5" marker-end="url(#hsg_arr)"/>' +
      '<path d="M610,121 C580,121 585,225 554,225" fill="none" stroke="' + C.b + '" stroke-width="2.5" marker-end="url(#hsg_arr)"/>' +
      txt(418, 150, "MMU", 12, C.a, ' font-weight="700"') + txt(588, 170, "MMU", 12, C.b, ' font-weight="700"'));

    s += txt(380, 348, "프로그램이 보는 주소는 전부 가상 주소 — 프로세스마다 private virtual address space", 13.5, C.k, ' font-weight="700"');
    return s + '</svg>';
  }
};
