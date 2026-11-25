// ============================================================
// mem_hierarchy_fetch — 각 층은 바로 아래층의 캐시 (13강 p.7 피라미드 + p.10 latency 표)
// 시간축(초): 0~1.5 피라미드 → 1.5~3 L1 miss(+1) → 3~4.5 L2 miss(+10) → 4.5~6 main memory hit(+100)
//   → 6~8 64-byte block 이 L2·L1 로 복사, word 가 register 로 → 8~10.5 옆 word 다시: L1 hit(1 cycle)
//   → 10.5~12 요점
// ============================================================
window.ANIMS = window.ANIMS || {};
ANIMS["mem_hierarchy_fetch"] = {
  title: "메모리 계층 — miss 면 아래층으로, 가져온 block 은 위층에 남는다",
  desc: "[[메모리 계층]] p.7 의 L0~L5 와 p.10 표의 latency(L1 1 · L2 10 · main memory 100 cycles). 처음 접근은 L1·L2 를 지나 DRAM 까지 내려가고, 가져온 64-byte block 이 위층에 남아 다음 접근은 L1 에서 끝난다 — [[locality]]",
  duration: 12,
  build: function () {
    var D = 12;
    var C = { a: "#1d65b3", aL: "#dbe8f7", b: "#2e9e4f", bL: "#dff3e4", c: "#e09a40", cL: "#fdeec2", k: "#3b2f4a", kL: "#efe9f6", hw: "#d6465f", hwL: "#f7d8dc", m: "#777" };
    function r3(v) { return Math.round(v * 1000) / 1000; }
    function box(x, y, w, h, fill, stroke, sw) { return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="5" fill="' + fill + '" stroke="' + stroke + '" stroke-width="' + (sw || 1.5) + '"/>'; }
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
    function token(path, from, to, label, color, w) {
      w = w || 64;
      return '<g opacity="0"><rect x="' + (-w / 2) + '" y="-11" width="' + w + '" height="22" rx="4" fill="' + color + '"/>' + txt(0, 5, label, 12.5, "#fff", ' font-weight="700"') +
        '<animateMotion path="' + path + '" begin="' + from + 's" dur="' + r3(to - from) + 's" fill="freeze"/>' + show(from, to) + '</g>';
    }

    var s = '<svg viewBox="0 0 760 360" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="메모리 계층 hit miss 애니메이션">';
    [
      [0, 1.5, "CPU 가 word X 를 읽으려 한다. 위층일수록 작고 빠르고 비싸다"],
      [1.5, 3, "L1 cache 에 X 가 없다 → miss (1 cycle 소모)"],
      [3, 4.5, "L2 cache 에도 없다 → miss (+10 cycles)"],
      [4.5, 6, "Main memory(DRAM)에 있다 → hit (+100 cycles)"],
      [6, 8, "64-byte block 째로 L2·L1 에 복사해 두고, word 만 register 로"],
      [8, 10.5, "바로 옆 word X+4 를 읽으면? 같은 block 이 L1 에 있다 → L1 hit, 1 cycle"],
      [10.5, D, "각 층은 바로 아래층의 캐시다. locality 덕에 대부분의 요청이 위층에서 끝난다"]
    ].forEach(function (c) { s += during(c[0], c[1], txt(380, 26, c[2], 14.5, "#222", ' font-weight="700"')); });

    // 피라미드 (p.7). 층별 y, 폭
    var cx = 270;
    var lv = [
      ["L0", "Registers", C.hwL, C.hw],
      ["L1", "cache (SRAM)", C.cL, C.c],
      ["L2", "cache (SRAM)", C.cL, C.c],
      ["L3", "Main memory (DRAM)", C.bL, C.b],
      ["L4", "Far main memory (Optane)", "#eeeeee", "#aaa"],
      ["L5", "Local disk (SSD · HDD)", C.aL, C.a]
    ];
    function ly(i) { return 50 + i * 44; }
    lv.forEach(function (l, i) {
      var w = 170 + i * 54;
      s += box(cx - w / 2, ly(i), w, 36, l[2], l[3]) + txt(cx - w / 2 + 12, ly(i) + 23, l[0] + " " + l[1], 14, i === 4 ? "#999" : C.k, ' font-weight="700" text-anchor="start"');
    });
    // 옆 화살표
    s += '<line x1="22" y1="70" x2="22" y2="300" stroke="#999" stroke-width="2"/>' + '<path d="M16,78 L22,64 L28,78 z" fill="#999"/>';
    s += txt(40, 62, "작고 빠름", 12, C.m, ' text-anchor="start"') + txt(40, 318, "크고 느림", 12, C.m, ' text-anchor="start"');

    // miss / hit 표시 (피라미드 오른쪽 끝 바깥)
    function mark(i, ok, from, to) {
      var w = 170 + i * 54, x = cx + w / 2 + 18, y = ly(i) + 18;
      var g = ok ? '<circle cx="' + x + '" cy="' + y + '" r="12" fill="' + C.b + '"/>' + txt(x, y + 5, "✓", 14, "#fff", ' font-weight="700"')
                 : '<circle cx="' + x + '" cy="' + y + '" r="12" fill="' + C.hw + '"/>' + txt(x, y + 5, "✗", 14, "#fff", ' font-weight="700"');
      return during(from, to, g);
    }
    s += mark(1, false, 2.2, 7.5) + mark(2, false, 3.7, 6.8) + mark(3, true, 5.2, 8);
    s += during(9, D, '<circle cx="' + (cx + 112 + 80) + '" cy="' + (ly(1) + 18) + '" r="12" fill="' + C.b + '"/>' + txt(cx + 192, ly(1) + 23, "✓", 14, "#fff", ' font-weight="700"') + txt(cx + 210, ly(1) + 23, "hit", 13, C.b, ' font-weight="700" text-anchor="start"'));

    // 복사된 block 칩 (L2, L1 안)
    function chip(i, from, label) {
      var w = 170 + i * 54, x = cx + w / 2 + 8;
      return during(from, D, '<rect x="' + x + '" y="' + (ly(i) + 7) + '" width="58" height="22" rx="4" fill="#fff" stroke="' + C.b + '" stroke-width="2"/>' + txt(x + 29, ly(i) + 23, label, 11.5, C.b, ' font-weight="700"'));
    }
    s += chip(2, 6.8, "X block") + chip(1, 7.5, "X block");

    // 요청 토큰: L0 → L1 → L2 → L3
    s += token("M360,68 L360,112", 1.5, 2.2, "X?", C.a);
    s += token("M360,112 L360,156", 3, 3.7, "X?", C.a);
    s += token("M360,156 L360,200", 4.5, 5.2, "X?", C.a);
    // block 이 위로
    s += token("M360,200 L360,156 L360,112", 6, 7.5, "64B", C.b);
    s += token("M360,112 L360,68", 7.5, 8, "X", C.b, 40);
    // 두 번째 요청
    s += token("M360,68 L360,112 L360,68", 8.5, 10, "X+4", C.a, 50);

    // 오른쪽: latency 누적 (p.10 표)
    s += box(540, 70, 200, 230, "#fff", "#ccc") + txt(640, 94, "latency (p.10, cycles)", 13, C.k, ' font-weight="700"');
    s += txt(560, 124, "L1 cache", 12.5, C.m, ' text-anchor="start"') + txt(720, 124, "1", 12.5, C.m, ' text-anchor="end"');
    s += txt(560, 146, "L2 cache", 12.5, C.m, ' text-anchor="start"') + txt(720, 146, "10", 12.5, C.m, ' text-anchor="end"');
    s += txt(560, 168, "Main memory", 12.5, C.m, ' text-anchor="start"') + txt(720, 168, "100", 12.5, C.m, ' text-anchor="end"');
    s += '<line x1="556" y1="182" x2="724" y2="182" stroke="#ddd"/>';
    s += txt(640, 206, "X 첫 접근", 13, C.k);
    s += during(1.5, 3, txt(640, 236, "1", 22, C.hw, ' font-weight="700"'));
    s += during(3, 4.5, txt(640, 236, "1 + 10 = 11", 20, C.hw, ' font-weight="700"'));
    s += during(4.5, D, txt(640, 236, "11 + 100 = 111", 20, C.hw, ' font-weight="700"'));
    s += during(8, D, txt(640, 264, "X+4 접근", 13, C.k) + txt(640, 290, "1", 20, C.b, ' font-weight="700"'));

    s += txt(380, 346, "miss 는 아래층까지 내려가고, 가져온 것은 위층에 남는다 → 다음 접근은 빠르다", 13.5, C.k, ' font-weight="700"');
    return s + '</svg>';
  }
};
