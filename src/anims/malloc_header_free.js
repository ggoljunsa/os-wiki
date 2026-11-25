// ============================================================
// malloc_header_free — malloc(20) 이 header(size, magic) 를 붙이고, free(ptr) 가 ptr − 8 에서 크기를 읽는다 (14강 p.26~28)
// 시간축(초): 0~1.5 free chunk → 1.5~3.5 20 + 8 = 28 바이트를 떼어 header 기록 → 3.5~5.5 ptr 반환
//   → 5.5~7 free(ptr) (크기 없음) → 7~9 hptr = ptr − sizeof(header_t) → 9~10.5 size 20 · magic 확인 → 10.5~12 28 바이트 반납
// ============================================================
window.ANIMS = window.ANIMS || {};
ANIMS["malloc_header_free"] = {
  title: "할당 헤더 — free(ptr) 는 크기를 안 받는데 어떻게 알까",
  desc: "[[할당 헤더]] p.26~28. malloc(20) 은 header(size 20, magic 1234567) 8바이트를 앞에 붙여 28바이트를 떼어 가고, header 바로 뒤 주소를 ptr 로 돌려준다. free(ptr) 는 ptr 에서 header 크기만큼 앞으로 가서 size 를 읽는다",
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

    var s = '<svg viewBox="0 0 760 350" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="malloc header free 애니메이션">';
    s += '<defs><marker id="mhf_arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="' + C.a + '"/></marker>' +
      '<marker id="mhf_arr2" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="' + C.hw + '"/></marker></defs>';
    [
      [0, 1.5, "heap 의 free chunk. 프로그램이 malloc(20) 을 부른다"],
      [1.5, 3.5, "할당기는 20 + header 8 = 28 바이트를 떼어 가고, 앞 8 바이트에 header 를 적는다"],
      [3.5, 5.5, "호출자에게는 header 바로 뒤 주소 ptr 만 돌려준다"],
      [5.5, 7, "free(ptr) — 인터페이스에 크기가 없다. 몇 바이트를 돌려받아야 하나?"],
      [7, 9, "hptr = (void *)ptr − sizeof(header_t): ptr 에서 8 바이트 앞이 header"],
      [9, 10.5, "hptr-&gt;size = 20 을 읽고, magic == 1234567 로 진짜 header 인지 확인"],
      [10.5, D, "header 포함 28 바이트를 free list 로 돌려준다"]
    ].forEach(function (c) { s += during(c[0], c[1], txt(380, 26, c[2], 14.5, "#222", ' font-weight="700"')); });

    var Y = 100, HX = 120, HW = 180, RX = HX + HW, RW = 300, EX = RX + RW;
    // 전체 바탕 free
    s += box(80, Y, 600, 50, C.bL, C.b) + during(0, 1.5, txt(380, Y + 31, "free chunk", 14, C.b, ' font-weight="700"'));
    // header
    s += during(1.5, 10.5, box(HX, Y, HW, 50, C.kL, C.k, 2) + '<line x1="' + (HX + 70) + '" y1="' + Y + '" x2="' + (HX + 70) + '" y2="' + (Y + 50) + '" stroke="' + C.k + '"/>' +
      txt(HX + 35, Y + 22, "size", 11.5, C.m) + txt(HX + 35, Y + 40, "20", 15, C.k, ' font-weight="700"') + txt(HX + 125, Y + 22, "magic", 11.5, C.m) + txt(HX + 125, Y + 40, "1234567", 14, C.k, ' font-weight="700"'));
    s += during(1.5, 10.5, box(RX, Y, RW, 50, C.cL, C.c, 2) + txt(RX + RW / 2, Y + 31, "호출자가 쓰는 20 바이트", 14, C.c, ' font-weight="700"'));
    s += during(10.5, D, box(HX, Y, HW + RW, 50, C.bL, C.b, 2.5) + txt(HX + (HW + RW) / 2, Y + 31, "28 바이트 → free list", 14, C.b, ' font-weight="700"'));
    // 크기 괄호
    s += during(1.5, D, '<path d="M' + HX + ',' + (Y - 8) + ' L' + HX + ',' + (Y - 16) + ' L' + EX + ',' + (Y - 16) + ' L' + EX + ',' + (Y - 8) + '" fill="none" stroke="#777" stroke-width="1.5"/>' + txt((HX + EX) / 2, Y - 22, "떼어 가는 크기 = 8 (header) + 20 = 28", 13, C.k, ' font-weight="700"'));
    s += during(1.5, D, txt(HX + HW / 2, Y + 66, "8 bytes", 12, C.m) + txt(RX + RW / 2, Y + 66, "20 bytes", 12, C.m));

    // ptr 화살표
    s += during(3.5, 10.5, '<path d="M' + RX + ',' + (Y + 120) + ' L' + RX + ',' + (Y + 56) + '" stroke="' + C.a + '" stroke-width="2.5" marker-end="url(#mhf_arr)"/>' + txt(RX, Y + 136, "ptr", 15, C.a, ' font-weight="700"'));
    // hptr: ptr 에서 왼쪽으로 8 바이트
    s += '<g opacity="0"><path d="M0,64 L0,0" stroke="' + C.hw + '" stroke-width="2.5" marker-end="url(#mhf_arr2)"/>' + txt(0, 80, "hptr", 15, C.hw, ' font-weight="700"') +
      '<animateTransform attributeName="transform" type="translate" values="' + RX + ',' + (Y + 56) + ';' + RX + ',' + (Y + 56) + ';' + HX + ',' + (Y + 56) + ';' + HX + ',' + (Y + 56) + '" keyTimes="0;' + r3(7.2 / D) + ';' + r3(8.4 / D) + ';1" dur="' + D + 's" fill="freeze"/>' + show(7, 10.5) + '</g>';
    s += during(7.6, 10.5, '<path d="M' + (RX - 8) + ',' + (Y + 100) + ' L' + (HX + 14) + ',' + (Y + 100) + '" stroke="' + C.hw + '" stroke-width="1.5" stroke-dasharray="4,3" marker-end="url(#mhf_arr2)"/>' + txt((HX + RX) / 2, Y + 94, "− 8", 13, C.hw, ' font-weight="700"'));
    // size 읽기 강조
    s += during(9, 10.5, '<rect x="' + (HX - 3) + '" y="' + (Y - 3) + '" width="76" height="56" fill="none" stroke="' + C.hw + '" stroke-width="3"/>' + '<rect x="' + (HX + 70) + '" y="' + (Y - 3) + '" width="113" height="56" fill="none" stroke="' + C.b + '" stroke-width="3"/>');

    // 코드 (p.27)
    var CY = 262;
    s += box(80, CY - 18, 600, 76, "#fbfbfd", "#ccc");
    var code = ["void free(void *ptr) {", "    header_t *hptr = (void *)ptr - sizeof(header_t);", "    assert(hptr-&gt;magic == 1234567);   /* size = hptr-&gt;size */"];
    s += during(5.5, 7, '<rect x="84" y="' + (CY - 13) + '" width="592" height="20" fill="' + C.cL + '"/>');
    s += during(7, 9, '<rect x="84" y="' + (CY + 7) + '" width="592" height="20" fill="' + C.cL + '"/>');
    s += during(9, 10.5, '<rect x="84" y="' + (CY + 27) + '" width="592" height="20" fill="' + C.cL + '"/>');
    code.forEach(function (l, i) { s += txt(96, CY + 2 + i * 20, l, 13, C.k, ' text-anchor="start" font-family="monospace" xml:space="preserve"'); });

    s += txt(380, 340, "malloc(N) 은 N + sizeof(header) 를 떼어 간다 — free 는 그 header 로 크기를 안다", 13.5, C.k, ' font-weight="700"');
    return s + '</svg>';
  }
};
