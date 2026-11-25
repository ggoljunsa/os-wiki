// ============================================================
// embedded_free_list — 4KB heap(VA 16KB~) 안에 free list 노드를 심는다: malloc(100) ×3 뒤 free 세 번 (14강 p.31~36)
// 시간축(초): 0~1.5 head → (0, 4088) → 1.5~3.5 malloc(100): 108 떼어 감 → (108, 3980) → 3.5~6 두 번 더 → (324, 3764)
//   → 6~8 free(addr 108) → 8~10 free(addr 0) → 10~11.5 free(addr 216) → head 216 → 0 → 108 → 324 → 11.5~14 조각 4개
// ============================================================
window.ANIMS = window.ANIMS || {};
ANIMS["embedded_free_list"] = {
  title: "Embedded free list — 빈 chunk 자기 앞부분에 (size, next) 를 적는다",
  desc: "[[embedded free list]] p.31~36 의 4KB heap. malloc(100) 은 header 8 + 100 = 108 바이트씩 떼어 가고 head 가 뒤로 밀린다(4088 → 3980 → 3764). free 된 chunk 는 리스트 앞에 붙어 head → 216 → 0 → 108 → 324 — 다 비었는데 조각 넷이라 coalescing 이 필요하다",
  duration: 14,
  build: function () {
    var D = 14;
    var C = { a: "#1d65b3", aL: "#dbe8f7", b: "#2e9e4f", bL: "#dff3e4", c: "#e09a40", cL: "#fdeec2", k: "#3b2f4a", kL: "#efe9f6", hw: "#d6465f", hwL: "#f7d8dc", m: "#777" };
    function r3(v) { return Math.round(v * 1000) / 1000; }
    function box(x, y, w, h, fill, stroke, sw, extra) { return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="3" fill="' + fill + '" stroke="' + stroke + '" stroke-width="' + (sw || 1.5) + '"' + (extra || "") + '/>'; }
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

    var Y = 96, H = 54;
    var cx = [60, 180, 300, 420], CW = 120, END = 700; // chunk 0·1·2 와 나머지 (비율 아님)
    var s = '<svg viewBox="0 0 760 370" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="embedded free list 애니메이션">';
    s += '<defs><marker id="efl_arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="#555"/></marker></defs>';
    [
      [0, 1.5, "mmap 으로 받은 4KB heap 전체가 free chunk 하나. 맨 앞 8바이트에 노드(size 4088, next 0)"],
      [1.5, 3.5, "ptr = malloc(100) → header 8 + 100 = 108 바이트를 앞에서 떼어 간다 → (108, 3980)"],
      [3.5, 6, "malloc(100) 두 번 더 → 108 × 3 = 324 → head 는 (324, 3764)"],
      [6, 8, "free(sptr) (addr 108) → 그 chunk 에 노드를 적고 리스트 앞에: next = 16708 (16K+324)"],
      [8, 10, "free(addr 0) → 리스트 앞에, next = 16492 (16K+108)"],
      [10, 11.5, "free(addr 216) → 리스트 앞에, next = 16384 (16K+0)"],
      [11.5, D, "다 반납했는데 head → 216 → 0 → 108 → 324 조각 넷 → coalescing 이 필요하다 (p.36)"]
    ].forEach(function (c) { s += during(c[0], c[1], txt(380, 26, c[2], 14, "#222", ' font-weight="700"')); });

    s += txt(60, Y - 10, "VA 16KB (addr 0)", 11.5, C.m, ' text-anchor="start"') + txt(END, Y - 10, "4096", 11.5, C.m, ' text-anchor="end"');
    s += txt(560, Y + H + 18, "(폭은 비율 아님: 앞 세 칸 108 B 씩)", 11.5, C.m);
    [0, 108, 216, 324].forEach(function (a, i) { s += txt(cx[i] + 3, Y + H + 18, i === 0 ? "" : String(a), 11.5, C.k, ' text-anchor="start" font-weight="700"'); });

    function used(i, from, to) {
      return during(from, to, box(cx[i], Y, CW, H, C.cL, C.c, 1.8) + '<line x1="' + (cx[i] + 40) + '" y1="' + Y + '" x2="' + (cx[i] + 40) + '" y2="' + (Y + H) + '" stroke="' + C.c + '"/>' +
        txt(cx[i] + 20, Y + 24, "hdr", 11, C.c, ' font-weight="700"') + txt(cx[i] + 20, Y + 40, "100", 11, C.c) + txt(cx[i] + 80, Y + 33, "100 B", 13, C.c, ' font-weight="700"'));
    }
    function freeNode(x, w, size, next, from, to, hi) {
      return during(from, to, box(x, Y, w, H, C.bL, C.b, hi ? 3 : 1.8) +
        txt(x + 8, Y + 22, "size: " + size, 12, C.b, ' text-anchor="start" font-weight="700"') + txt(x + 8, Y + 42, "next: " + next, 12, C.b, ' text-anchor="start" font-weight="700"'));
    }
    // 0~1.5 한 덩어리
    s += freeNode(60, END - 60, 4088, 0, 0, 1.5, true);
    // 나머지 덩어리
    s += freeNode(cx[1], END - cx[1], 3980, 0, 1.5, 3.5, true);
    s += freeNode(cx[3], END - cx[3], 3764, 0, 3.5, D, false);
    // used chunk 들
    s += used(0, 1.5, 8) + used(1, 3.5, 6) + used(2, 4.6, 10);
    s += during(3.5, 4.6, '<rect x="' + cx[2] + '" y="' + Y + '" width="' + (END - cx[2]) + '" height="' + H + '" fill="' + C.bL + '" stroke="' + C.b + '" stroke-width="1.8"/>');
    // free 된 노드들
    s += freeNode(cx[1], CW, 100, 16708, 6, D, false);
    s += freeNode(cx[0], CW, 100, 16492, 8, D, false);
    s += freeNode(cx[2], CW, 100, 16384, 10, D, false);
    // 지금 막 바뀐 칸 강조
    [[cx[1], 6, 8], [cx[0], 8, 10], [cx[2], 10, 11.5]].forEach(function (h) {
      s += during(h[1], h[2], '<rect x="' + (h[0] - 3) + '" y="' + (Y - 3) + '" width="' + (CW + 6) + '" height="' + (H + 6) + '" fill="none" stroke="' + C.hw + '" stroke-width="2.5" stroke-dasharray="6,4"/>');
    });

    // free list (노드 그림)
    function list(nodes) {
      var g = txt(52, 262, "head", 13, C.k, ' font-weight="700"') + '<line x1="76" y1="258" x2="96" y2="258" stroke="#555" stroke-width="1.6" marker-end="url(#efl_arr)"/>';
      var x = 100;
      nodes.forEach(function (n) {
        g += box(x, 236, 108, 44, "#fff", C.b, 1.8, ' rx="20"') + txt(x + 54, 254, "addr " + n[0], 12, C.k, ' font-weight="700"') + txt(x + 54, 271, "len " + n[1], 12, C.k, ' font-weight="700"');
        g += '<line x1="' + (x + 108) + '" y1="258" x2="' + (x + 128) + '" y2="258" stroke="#555" stroke-width="1.6" marker-end="url(#efl_arr)"/>';
        x += 132;
      });
      return g + txt(x + 14, 263, "NULL", 12, C.m);
    }
    s += txt(380, 222, "free list", 12.5, C.m);
    s += during(0, 1.5, list([[0, 4088]]));
    s += during(1.5, 3.5, list([[108, 3980]]));
    s += during(3.5, 6, list([[324, 3764]]));
    s += during(6, 8, list([[108, 100], [324, 3764]]));
    s += during(8, 10, list([[0, 100], [108, 100], [324, 3764]]));
    s += during(10, D, list([[216, 100], [0, 100], [108, 100], [324, 3764]]));
    s += during(11.5, D, txt(380, 306, "조각 4개 — 붙어 있는 chunk 를 합쳐야(coalescing) 큰 요청이 들어간다", 13, C.hw, ' font-weight="700"'));

    s += txt(380, 356, "노드를 따로 malloc 할 수 없으니 빈 공간 자신 안에 (size, next) 를 심는다", 13.5, C.k, ' font-weight="700"');
    return s + '</svg>';
  }
};
