// ============================================================
// pd_valid_saving — page directory 의 valid 0 PDE 아래에는 page-table page 를 안 만든다 (16강 p.18~19, p.22)
// p.19 그림: linear PT 16칸(PFN 201~204 네 page) vs PDBR 200 → PD [(1,201),(0,-),(0,-),(1,204)]
// 시간축(초): 0~2 linear PT 4 page → 2~4 page 202·203 은 PTE 가 전부 invalid → 4~6 page directory 등장
//   → 6~8 202·203 을 할당하지 않음(PD 1 + PT 2) → 8~10.5 VPN 5 → PDE[1] valid 0 → exception → 10.5~12 요점
// ============================================================
window.ANIMS = window.ANIMS || {};
ANIMS["pd_valid_saving"] = {
  title: "Page directory — 통째로 invalid 인 page-table page 는 아예 만들지 않는다",
  desc: "[[page directory]] p.19 그림 그대로. linear page table 은 16칸(4 page)을 모두 메모리에 두지만, 가운데 두 page 는 PTE 가 전부 invalid 다. page directory 의 PDE valid 0 으로 표시하면 그 두 page 는 \"Not Allocated\" — 접근하면 PDE 단계에서 바로 exception(p.22)",
  duration: 12,
  build: function () {
    var D = 12;
    var C = { a: "#1d65b3", aL: "#dbe8f7", b: "#2e9e4f", bL: "#dff3e4", c: "#e09a40", cL: "#fdeec2", k: "#3b2f4a", kL: "#efe9f6", hw: "#d6465f", hwL: "#f7d8dc", m: "#777" };
    function r3(v) { return Math.round(v * 1000) / 1000; }
    function box(x, y, w, h, fill, stroke, sw) { return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" fill="' + fill + '" stroke="' + stroke + '" stroke-width="' + (sw || 1) + '"/>'; }
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
    function token(path, from, to, label, color) {
      return '<g opacity="0"><rect x="-30" y="-11" width="60" height="22" rx="4" fill="' + color + '"/>' + txt(0, 5, label, 12, "#fff", ' font-weight="700"') +
        '<animateMotion path="' + path + '" begin="' + from + 's" dur="' + r3(to - from) + 's" fill="freeze"/>' + show(from, to) + '</g>';
    }

    var pages = [
      [[1, "rx", 12], [1, "rx", 13], [0], [1, "rw", 100]],
      [[0], [0], [0], [0]],
      [[0], [0], [0], [0]],
      [[0], [0], [1, "rw", 86], [1, "rw", 15]]
    ];
    var s = '<svg viewBox="0 0 760 380" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="page directory valid 비트 애니메이션">';
    s += '<defs><marker id="pdv_arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="#555"/></marker></defs>';
    [
      [0, 2, "Linear page table: 16칸 = page-table page 4개(PFN 201~204)를 모두 메모리에 둔다"],
      [2, 4, "PFN 202 · 203 의 page 는 PTE 가 전부 invalid — 그래도 자리를 차지한다"],
      [4, 6, "Page directory(PFN 200): page-table page 하나당 PDE 하나 (valid, PFN)"],
      [6, 8, "PDE valid 0 → 그 page-table page 는 Not Allocated. PD 1 + PT 2 = 3 page"],
      [8, 10.5, "VPN 5 (PT 의 page 1) 접근 → PDE[1] 이 invalid → 바로 exception (p.22)"],
      [10.5, D, "주소 공간이 드문드문할수록 절약이 크다. 대가는 TLB miss 때 메모리 접근 한 번 더"]
    ].forEach(function (c) { s += during(c[0], c[1], txt(380, 26, c[2], 14, "#222", ' font-weight="700"')); });

    // ---- 왼쪽 linear PT ----
    var LX = 40, LY = 82, RH = 15;
    s += txt(LX + 90, 60, "Linear Page Table", 13, C.k, ' font-weight="700"');
    s += txt(LX + 14, LY - 6, "valid", 10.5, C.m) + txt(LX + 48, LY - 6, "prot", 10.5, C.m) + txt(LX + 110, LY - 6, "PFN", 10.5, C.m);
    pages.forEach(function (pg, p) {
      var g = '';
      pg.forEach(function (e, i) {
        var y = LY + (p * 4 + i) * RH;
        g += box(LX, y, 160, RH, e[0] ? C.bL : "#fff", "#999") + txt(LX + 14, y + 11.5, String(e[0]), 11, C.k) + txt(LX + 48, y + 11.5, e[1] || "-", 11, C.k) + txt(LX + 110, y + 11.5, e[2] !== undefined ? String(e[2]) : "-", 11, C.k);
      });
      g += txt(LX + 166, LY + p * 4 * RH + 34, "PFN " + (201 + p), 11.5, C.m, ' text-anchor="start"');
      g += '<line x1="' + LX + '" y1="' + (LY + p * 4 * RH) + '" x2="' + (LX + 160) + '" y2="' + (LY + p * 4 * RH) + '" stroke="' + C.k + '" stroke-width="2"/>';
      if (p === 1 || p === 2) s += '<g>' + g + '<animate attributeName="opacity" values="1;1;0.15;0.15" keyTimes="0;' + r3(6 / D) + ';' + r3(7 / D) + ';1" dur="' + D + 's" fill="freeze"/></g>';
      else s += g;
    });
    s += '<line x1="' + LX + '" y1="' + (LY + 16 * RH) + '" x2="' + (LX + 160) + '" y2="' + (LY + 16 * RH) + '" stroke="' + C.k + '" stroke-width="2"/>';
    s += during(2, 6, '<rect x="' + (LX - 3) + '" y="' + (LY + 4 * RH - 2) + '" width="166" height="' + (8 * RH + 4) + '" fill="none" stroke="' + C.hw + '" stroke-width="2.5" stroke-dasharray="6,4"/>' +
      '<rect x="' + (LX + 30) + '" y="' + (LY + 8 * RH - 11) + '" width="100" height="22" rx="4" fill="#fff" stroke="' + C.hw + '"/>' + txt(LX + 80, LY + 8 * RH + 5, "전부 valid 0", 13, C.hw, ' font-weight="700"'));

    // 메모리 사용 카운터
    s += box(LX, 336, 230, 30, "#fff", "#ccc");
    s += during(0, 6.5, txt(LX + 115, 356, "page table 메모리: 4 page", 13, C.k, ' font-weight="700"'));
    s += during(6.5, D, txt(LX + 115, 356, "PD 1 + PT 2 = 3 page", 13, C.b, ' font-weight="700"'));

    // ---- 오른쪽 multi-level ----
    var R = '';
    var PX = 330, PY = 100, PH = 22;
    R += box(PX - 10, 60, 170, 24, "#fff", "#888") + txt(PX + 20, 77, "PDBR", 12.5, C.k, ' font-weight="700"') + txt(PX + 100, 77, "200", 13, C.k, ' font-weight="700"');
    R += txt(PX + 75, PY - 6, "valid      PFN", 11, C.m, ' xml:space="preserve"');
    var pde = [[1, "201"], [0, "-"], [0, "-"], [1, "204"]];
    pde.forEach(function (e, i) {
      var y = PY + i * PH;
      R += box(PX, y, 150, PH, e[0] ? C.bL : C.hwL, "#888") + txt(PX + 30, y + 16, String(e[0]), 13, e[0] ? C.b : C.hw, ' font-weight="700"') + txt(PX + 105, y + 16, e[1], 13, C.k, ' font-weight="700"');
    });
    R += txt(PX + 75, PY + 4 * PH + 18, "The Page Directory (PFN 200)", 12, C.hw, ' font-weight="700"');
    s += during(4, D, R);

    // PT page 201, 204 (오른쪽 끝)
    function ptPage(y, rows, pfn) {
      var g = '';
      rows.forEach(function (e, i) {
        g += box(570, y + i * RH, 140, RH, e[0] ? C.bL : "#fff", "#999") + txt(584, y + i * RH + 11.5, String(e[0]), 11, C.k) + txt(616, y + i * RH + 11.5, e[1] || "-", 11, C.k) + txt(670, y + i * RH + 11.5, e[2] !== undefined ? String(e[2]) : "-", 11, C.k);
      });
      return g + txt(716, y + 34, pfn, 11, C.m, ' text-anchor="start"');
    }
    s += during(4, D, ptPage(96, pages[0], "201") + ptPage(246, pages[3], "204") +
      '<path d="M' + (PX + 150) + ',' + (PY + 11) + ' L566,104" stroke="#555" stroke-width="1.5" marker-end="url(#pdv_arr)"/>' +
      '<path d="M' + (PX + 150) + ',' + (PY + 3 * PH + 11) + ' C530,' + (PY + 3 * PH + 11) + ' 530,254 566,254" fill="none" stroke="#555" stroke-width="1.5" marker-end="url(#pdv_arr)"/>');
    s += during(6, D, txt(640, 180, "[Page 1 of PT: Not Allocated]", 11.5, C.m) + txt(640, 220, "[Page 2 of PT: Not Allocated]", 11.5, C.m));

    // VPN 5 조회
    s += token("M260,330 C300,330 " + (PX - 40) + "," + (PY + PH + 11) + " " + (PX - 4) + "," + (PY + PH + 11), 8, 9, "VPN 5", C.a);
    s += during(9, 10.5, '<rect x="' + (PX - 3) + '" y="' + (PY + PH - 3) + '" width="156" height="' + (PH + 6) + '" fill="none" stroke="' + C.hw + '" stroke-width="3"/>' +
      box(PX - 10, 236, 190, 50, C.hwL, C.hw, 2) + txt(PX + 85, 256, "PDE valid 0", 13, C.hw, ' font-weight="700"') + txt(PX + 85, 276, "→ Raise an exception", 13, C.hw, ' font-weight="700"'));

    s += txt(500, 356, "PDE 하나 = page-table page 하나 · invalid 면 그 page 는 없다", 13, C.k, ' font-weight="700"');
    return s + '</svg>';
  }
};
