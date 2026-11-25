// ============================================================
// split_coalesce — 30-byte heap 에서 malloc(1) 의 splitting (14강 p.22~23) 과 free 뒤 coalescing (p.24~25)
// 시간축(초): 0~1.5 [free 0~10][used 10~20][free 20~30] → 1.5~5 malloc(1): addr 20 chunk 를 1 + 9 로
//   → 5~5.6 p.24 상태로 되돌림 → 5.6~7 free(10): 리스트 앞에 (10,10) → 7~8.5 malloc(15) 실패
//   → 8.5~10.5 coalescing: (0,30) 하나 → 10.5~12.5 malloc(15) 가능
// ============================================================
window.ANIMS = window.ANIMS || {};
ANIMS["split_coalesce"] = {
  title: "Splitting과 Coalescing — 작은 요청은 쪼개고, 반납된 이웃은 합친다",
  desc: "[[splitting과 coalescing]] p.23·p.25 의 30-byte heap. malloc(1) 은 10바이트 chunk 를 1 + 9 로 나누고, 가운데 chunk 를 free 하면 조각 셋(각 10)이 되어 malloc(15) 가 실패한다. 주소가 이어진 chunk 를 합치면 (addr 0, len 30) 하나가 된다",
  duration: 12.5,
  build: function () {
    var D = 12.5;
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

    var X = 80, B = 20, Y = 92; // 1 byte = 20px
    function bx(a) { return X + a * B; }
    var s = '<svg viewBox="0 0 760 350" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="splitting coalescing 애니메이션">';
    s += '<defs><marker id="spc_arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="#555"/></marker></defs>';
    [
      [0, 1.5, "30-byte heap: 가운데 10바이트만 사용 중. free list 에 빈 chunk 둘"],
      [1.5, 3, "malloc(1) — 요청(1)이 chunk(10)보다 작다 → splitting"],
      [3, 5, "앞 1바이트는 호출자에게, 나머지 9바이트는 리스트에: (21, 9)"],
      [5, 7, "(p.24 상태에서) 가운데 used chunk 를 free → 리스트 앞에 (10, 10)"],
      [7, 8.5, "malloc(15)? 30바이트가 다 비었는데 조각이 10 · 10 · 10 → 실패"],
      [8.5, 10.5, "Coalescing: 주소가 이어진 chunk 들을 하나로 합친다 → (0, 30)"],
      [10.5, D, "이제 malloc(15) 가 들어간다. 합치지 않으면 external fragmentation"]
    ].forEach(function (c) { s += during(c[0], c[1], txt(380, 26, c[2], 14.5, "#222", ' font-weight="700"')); });

    // heap 막대: 바탕 = free
    s += txt(X - 10, Y + 25, "heap", 13, C.k, ' text-anchor="end" font-weight="700"');
    s += box(X, Y, 30 * B, 40, C.bL, C.b);
    // used 10~20 (0~5.6 그리고 다시 5.6~6.2 까지 → free 됨)
    s += during(0, 6.2, box(bx(10), Y, 10 * B, 40, C.cL, C.c, 1.8) + txt(bx(15), Y + 25, "used", 13, C.c, ' font-weight="700"'));
    // splitting 으로 쓰인 1바이트 (3~5)
    s += during(3, 5, box(bx(20), Y, B, 40, C.hwL, C.hw, 1.8));
    s += during(3, 5, txt(bx(20) + 10, Y - 8, "malloc(1)", 12, C.hw, ' font-weight="700"'));
    // chunk 경계선 (coalescing 때 사라짐)
    s += during(0, 9.5, '<line x1="' + bx(10) + '" y1="' + (Y - 4) + '" x2="' + bx(10) + '" y2="' + (Y + 44) + '" stroke="' + C.k + '" stroke-width="2.5"/>' +
      '<line x1="' + bx(20) + '" y1="' + (Y - 4) + '" x2="' + bx(20) + '" y2="' + (Y + 44) + '" stroke="' + C.k + '" stroke-width="2.5"/>');
    s += during(3, 5, '<line x1="' + bx(21) + '" y1="' + (Y - 4) + '" x2="' + bx(21) + '" y2="' + (Y + 44) + '" stroke="' + C.k + '" stroke-width="2.5"/>');
    s += during(0, 3, txt(bx(5), Y + 25, "free", 13, C.b) + txt(bx(25), Y + 25, "free", 13, C.b));
    s += during(3, 5, txt(bx(5), Y + 25, "free", 13, C.b) + txt(bx(25.5), Y + 25, "free 9", 13, C.b));
    s += during(5, 8.5, txt(bx(5), Y + 25, "free", 13, C.b) + txt(bx(25), Y + 25, "free", 13, C.b));
    s += during(6.2, 8.5, txt(bx(15), Y + 25, "free", 13, C.b, ' font-weight="700"'));
    s += during(8.5, D, txt(bx(15), Y + 25, "free 30", 14, C.b, ' font-weight="700"'));
    // splitting 대상 강조
    s += during(1.5, 3, '<rect x="' + (bx(20) - 3) + '" y="' + (Y - 3) + '" width="' + (10 * B + 6) + '" height="46" fill="none" stroke="' + C.a + '" stroke-width="2.5" stroke-dasharray="6,4"/>');
    [0, 10, 20, 21, 30].forEach(function (a) {
      var g = txt(bx(a), Y + 60, String(a), 12, C.m);
      s += a === 21 ? during(3, 5, g) : g;
    });

    // malloc(15) 시도 막대
    s += during(7, 8.5, box(bx(0), Y + 72, 15 * B, 18, C.hwL, C.hw) + txt(bx(7.5), Y + 85, "15 바이트 요청 — 어느 조각에도 안 들어감 ✗", 12, C.hw, ' font-weight="700"'));
    s += during(10.5, D, box(bx(0), Y + 72, 15 * B, 18, C.kL, C.k) + txt(bx(7.5), Y + 85, "malloc(15) ✓", 12.5, C.k, ' font-weight="700"'));

    // free list
    function list(nodes, hiFirst) {
      var g = txt(70, 252, "head", 13, C.k, ' font-weight="700"') + '<line x1="94" y1="248" x2="118" y2="248" stroke="#555" stroke-width="1.6" marker-end="url(#spc_arr)"/>';
      var x = 122;
      nodes.forEach(function (n, j) {
        var hi = hiFirst && j === 0;
        g += box(x, 226, 110, 46, hi ? C.cL : "#fff", hi ? C.c : "#777", 1.8, ' rx="20"') + txt(x + 55, 245, "addr " + n[0], 12.5, C.k, ' font-weight="700"') + txt(x + 55, 263, "len " + n[1], 12.5, C.k, ' font-weight="700"');
        g += '<line x1="' + (x + 110) + '" y1="248" x2="' + (x + 136) + '" y2="248" stroke="#555" stroke-width="1.6" marker-end="url(#spc_arr)"/>';
        x += 140;
      });
      return g + txt(x + 16, 253, "NULL", 12.5, C.m);
    }
    s += txt(380, 210, "free list", 12.5, C.m);
    s += during(0, 3, list([[0, 10], [20, 10]], false));
    s += during(3, 5, list([[0, 10], [21, 9]], false));
    s += during(5, 6.2, list([[0, 10], [20, 10]], false));
    s += during(6.2, 9.5, list([[10, 10], [0, 10], [20, 10]], true));
    s += during(9.5, D, list([[0, 30]], true));

    s += txt(380, 336, "splitting: 요청 &lt; chunk 일 때 둘로 나눈다 · coalescing: 반납된 chunk 를 주소가 붙은 이웃과 합친다", 13, C.k, ' font-weight="700"');
    return s + '</svg>';
  }
};
