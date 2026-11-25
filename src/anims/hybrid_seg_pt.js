// ============================================================
// hybrid_seg_pt — segment 마다 page table 하나: base 는 그 page table 의 물리 주소, bound 는 그 끝 (16강 p.12~16)
// p.13 의 16칸 page table(code VPN 0 → 9, heap 4 → 15, stack 13·14·15 → 3·23·25)을 segment 별 표로 나눈 그림
// 시간축(초): 0~2 하나짜리 linear PT 16칸 → 2~4.5 segment 별 PT 셋(1·1·3칸), invalid 칸 사라짐
//   → 4.5~8 VA(Seg 10 heap, VPN 0) → bound 검사 ✓ → Base[heap] + 0 → PFN 15 → 8~10.5 heap VPN 3 ≥ bound 1 → Memory Trap
//   → 10.5~13 page table 이 가변 크기·연속 → external fragmentation (p.16)
// ============================================================
window.ANIMS = window.ANIMS || {};
ANIMS["hybrid_seg_pt"] = {
  title: "Hybrid approach — segment 마다 page table, base·bound 가 그 표를 가리킨다",
  desc: "[[hybrid approach]] p.13·p.15. 하나의 linear page table 은 code·heap·stack 사이의 invalid 칸까지 저장한다. segment 마다 따로 page table 을 두면 그 칸이 없어진다. 변환은 Seg 비트로 segment table 을 고르고 VPN &lt; Bound 를 확인한 뒤 Base + VPN × PTE 크기에서 PTE 를 읽는다",
  duration: 13,
  build: function () {
    var D = 13;
    var C = { a: "#1d65b3", aL: "#dbe8f7", b: "#2e9e4f", bL: "#dff3e4", c: "#e09a40", cL: "#fdeec2", k: "#3b2f4a", kL: "#efe9f6", hw: "#d6465f", hwL: "#f7d8dc", m: "#777" };
    function r3(v) { return Math.round(v * 1000) / 1000; }
    function box(x, y, w, h, fill, stroke, sw) { return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" fill="' + fill + '" stroke="' + stroke + '" stroke-width="' + (sw || 1.2) + '"/>'; }
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
      w = w || 70;
      return '<g opacity="0"><rect x="' + (-w / 2) + '" y="-11" width="' + w + '" height="22" rx="4" fill="' + color + '"/>' + txt(0, 5, label, 12, "#fff", ' font-weight="700"') +
        '<animateMotion path="' + path + '" begin="' + from + 's" dur="' + r3(to - from) + 's" fill="freeze"/>' + show(from, to) + '</g>';
    }

    var s = '<svg viewBox="0 0 760 370" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="hybrid approach 애니메이션">';
    s += '<defs><marker id="hyb_arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="#555"/></marker></defs>';
    [
      [0, 2, "Naïve: 주소 공간 전체에 page table 하나 → 16칸 중 10칸이 invalid 인데도 저장"],
      [2, 4.5, "Hybrid: code · heap · stack 마다 page table 을 따로. invalid 칸이 사라진다"],
      [4.5, 6, "VA 의 위 2비트 Seg = 10 → segment table 의 heap 줄 (Bound 1, Base)"],
      [6, 8, "VPN 0 &lt; Bound 1 ✓ → Base[heap] + 0 × 4 에서 PTE → PFN 15 → PA = 15 | offset"],
      [8, 10.5, "heap 의 VPN 3 → 3 ≥ Bound 1 → Memory Trap (p.15 의 '&lt;' 에서 No)"],
      [10.5, D, "대가: segment 마다 page table 크기가 제각각이고 연속이어야 한다 → external fragmentation (p.16)"]
    ].forEach(function (c) { s += during(c[0], c[1], txt(380, 26, c[2], c[0] >= 10.5 ? 13 : 14, "#222", ' font-weight="700"')); });

    // 왼쪽: naive 16칸 (p.13)
    var LX = 40, LY = 66, RH = 16;
    var full = { 0: ["9", "r-x", "code"], 4: ["15", "rw-", "heap"], 13: ["3", "rw-", "stack"], 14: ["23", "rw-", ""], 15: ["25", "rw-", ""] };
    s += txt(LX + 70, LY - 8, "Naïve page table (PTBR 하나)", 12, C.k, ' font-weight="700"');
    for (var v = 0; v < 16; v++) {
      var e = full[v], y = LY + v * RH;
      var row = box(LX + 30, y, 120, RH, e ? C.bL : "#fff", "#999") + txt(LX + 22, y + 12, String(v), 10.5, C.m, ' text-anchor="end"') +
        txt(LX + 65, y + 12, e ? e[0] : "-", 11, C.k) + txt(LX + 110, y + 12, e ? e[1] : "-", 11, C.k) + (e && e[2] ? txt(LX + 156, y + 12, e[2], 10.5, C.m, ' text-anchor="start"') : '');
      s += e ? row : '<g>' + row + '<animate attributeName="opacity" values="1;1;0.15;0.15" keyTimes="0;' + r3(2 / D) + ';' + r3(3 / D) + ';1" dur="' + D + 's" fill="freeze"/></g>';
    }
    s += box(LX, 336, 190, 24, "#fff", "#ccc");
    s += during(0, 2.5, txt(LX + 95, 353, "PTE 16칸 저장", 12.5, C.k, ' font-weight="700"'));
    s += during(2.5, D, txt(LX + 95, 353, "1 + 1 + 3 = 5칸만 저장", 12.5, C.b, ' font-weight="700"'));

    // 가운데: segment table
    var SX = 290, SY = 96;
    var R = txt(SX + 80, SY - 26, "Segment Table (HW 레지스터)", 12, C.k, ' font-weight="700"') + txt(SX + 30, SY - 8, "Seg", 11, C.m) + txt(SX + 85, SY - 8, "Bound", 11, C.m) + txt(SX + 140, SY - 8, "Base", 11, C.m);
    [["01 code", "1", "PT(code)"], ["10 heap", "1", "PT(heap)"], ["11 stack", "3", "PT(stack)"]].forEach(function (r, i) {
      var y = SY + i * 26;
      R += box(SX, y, 170, 26, "#fff", "#888") + txt(SX + 30, y + 18, r[0], 11.5, C.k, ' font-weight="700"') + txt(SX + 85, y + 18, r[1], 13, C.hw, ' font-weight="700"') + txt(SX + 140, y + 18, r[2], 11, C.a, ' font-weight="700"');
    });
    s += during(2, D, R);

    // 오른쪽: 세 page table (물리 메모리 안)
    var PX = 560;
    var pts = [["PT(code)", [["9", "r-x"]], 70], ["PT(heap)", [["15", "rw-"]], 150], ["PT(stack)", [["3", "rw-"], ["23", "rw-"], ["25", "rw-"]], 230]];
    var P = txt(PX + 80, 52, "물리 메모리 안의 page table", 12, C.k, ' font-weight="700"');
    pts.forEach(function (p, i) {
      P += txt(PX - 6, p[2] + 14, p[0], 11.5, C.a, ' text-anchor="end" font-weight="700"');
      p[1].forEach(function (e, j) {
        var y = p[2] + j * 20;
        P += box(PX, y, 150, 20, C.bL, "#888") + txt(PX + 12, y + 14, String(j), 10.5, C.m) + txt(PX + 60, y + 14, "PFN " + e[0], 12, C.k, ' font-weight="700"') + txt(PX + 120, y + 14, e[1], 11, C.k);
      });
      P += '<path d="M' + (SX + 170) + ',' + (SY + i * 26 + 13) + ' C' + (SX + 210) + ',' + (SY + i * 26 + 13) + ' 470,' + (p[2] + 10) + ' ' + (PX - 76) + ',' + (p[2] + 10) + '" fill="none" stroke="' + C.a + '" stroke-width="1.5" marker-end="url(#hyb_arr)"/>';
    });
    s += during(2.5, D, P);

    // VA
    var VY = 210;
    s += during(4.5, 10.5, txt(SX + 85, VY - 8, "Virtual address", 11.5, C.m) + box(SX, VY, 50, 30, C.kL, C.k) + txt(SX + 25, VY + 20, "10", 14, C.k, ' font-weight="700"') + box(SX + 50, VY, 70, 30, C.aL, C.a) + box(SX + 120, VY, 60, 30, C.cL, C.c) + txt(SX + 150, VY + 20, "offset", 12, C.c) +
      txt(SX + 25, VY + 46, "Seg", 11, C.m) + txt(SX + 85, VY + 46, "VPN", 11, C.m));
    s += during(4.5, 8, txt(SX + 85, VY + 20, "0", 14, C.a, ' font-weight="700"'));
    s += during(8, 10.5, txt(SX + 85, VY + 20, "3", 14, C.hw, ' font-weight="700"'));
    s += during(4.8, 8, '<rect x="' + (SX - 3) + '" y="' + (SY + 26 - 3) + '" width="176" height="32" fill="none" stroke="' + C.b + '" stroke-width="3"/>');
    s += during(6, 8, '<rect x="' + (PX - 3) + '" y="147" width="156" height="26" fill="none" stroke="' + C.b + '" stroke-width="3"/>' + txt(SX + 85, VY + 76, "0 &lt; 1 ✓", 14, C.b, ' font-weight="700"'));
    s += token("M" + (SX + 25) + "," + VY + " L" + (SX + 25) + "," + (SY + 40), 4.6, 5.4, "Seg 10", C.k);
    s += token("M" + (SX + 170) + "," + (SY + 39) + " C470,140 520,160 " + (PX + 60) + ",160", 6.2, 7.2, "Base+0", C.a);
    s += during(7.2, 8, box(PX + 10, 182, 130, 26, "#fff", C.hw, 2.5) + txt(PX + 75, 200, "PA = 15 | offset", 13, C.hw, ' font-weight="700"'));
    s += during(8.2, 10.5, '<rect x="' + (SX - 3) + '" y="' + (SY + 26 - 3) + '" width="176" height="32" fill="none" stroke="' + C.hw + '" stroke-width="3"/>' +
      box(SX - 10, VY + 58, 200, 46, C.hwL, C.hw, 2) + txt(SX + 90, VY + 77, "3 ≥ Bound 1", 13.5, C.hw, ' font-weight="700"') + txt(SX + 90, VY + 96, "→ Memory Trap", 13.5, C.hw, ' font-weight="700"'));

    // external fragmentation
    s += during(10.5, D, box(PX - 20, 300, 190, 50, "#fff", C.hw, 2) + txt(PX + 75, 320, "표 크기 1 · 1 · 3 칸 제각각", 12, C.hw, ' font-weight="700"') + txt(PX + 75, 340, "연속 할당 → 구멍이 생긴다", 12, C.hw, ' font-weight="700"'));

    s += txt(450, 362, "base = segment 의 page table 위치 (14강의 base 와 의미가 다르다)", 12.5, C.k, ' font-weight="700"');
    return s + '</svg>';
  }
};
