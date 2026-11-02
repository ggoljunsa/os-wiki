// ============================================================
// two_level_walk — 16강 p.24: 16KB 주소 공간·64B page 에서 VA 5844(0x16D4) 를 2단계 page table 로 번역
// 시간축(초): 0~1.5 VA 를 4|4|6 으로 자름(5 | 11 | 20) → 1.5~4 PDBR + 5 → Page Directory 의 PDE[5] → 4~6.5 PDE 가 가리키는 PT page + 11 → PTE[11] = 230
//   → 6.5~8.5 PA = 230 | 20 = 230×64+20 = 14740 → 8.5~11 invalid PDE 는 아래 PT page 가 없다(메모리 절약) → 11~12.5 요점
// ============================================================
window.ANIMS = window.ANIMS || {};
ANIMS["two_level_walk"] = {
  title: "2단계 page table walk — VA 5844 → PD 5 → PT 11 → PFN 230 → PA 14740",
  desc: "p.24 그대로: 14비트 VA 를 PD index 4비트 | PT index 4비트 | offset 6비트로 자르고, [[PDBR]] + PD index 로 PDE, PDE 의 PFN + PT index 로 PTE 를 찾는다. → [[다단계 주소 변환 계산]], [[page directory]]",
  duration: 12.5,
  build: function () {
    var D = 12.5;
    var C = { pd: "#e09a40", pdL: "#fdeec2", pt: "#c97b2a", ptL: "#fbe2c8", off: "#1d65b3", offL: "#dbe8f7", cpu: "#3b2f4a", cpuL: "#efe9f6", hw: "#d6465f", ok: "#2e9e4f", muted: "#777" };
    function r3(v) { return Math.round(v * 1000) / 1000; }
    function txt(x, y, s, size, fill, extra) {
      var anchor = /text-anchor/.test(extra || "") ? "" : ' text-anchor="middle"';
      return '<text x="' + x + '" y="' + y + '" font-size="' + (size || 13) + '" fill="' + (fill || "#222") + '"' + anchor + (extra || "") + '>' + s + '</text>';
    }
    function rect(x, y, w, h, fill, stroke, sw) { return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="3" fill="' + fill + '" stroke="' + stroke + '" stroke-width="' + (sw || 1.2) + '"/>'; }
    function show(from, to) {
      return '<animate attributeName="opacity" values="0;0;1;1;0;0" keyTimes="0;' + r3(from / D) + ';' + r3(from / D + 0.003) + ';' + r3(to / D) + ';' + r3(Math.min(1, to / D + 0.003)) + ';1" dur="' + D + 's" fill="freeze"/>';
    }
    function during(from, to, inner) {
      if (from <= 0) return '<g>' + inner + '<animate attributeName="opacity" values="1;1;0;0" keyTimes="0;' + r3(to / D) + ';' + r3(Math.min(1, to / D + 0.003)) + ';1" dur="' + D + 's" fill="freeze"/></g>';
      return '<g opacity="0">' + inner + show(from, to) + '</g>';
    }
    function token(path, from, to, label, color) {
      return '<g opacity="0"><circle r="7" fill="' + color + '"/>' + txt(0, -11, label, 11, color, ' font-weight="700"') +
        '<animateMotion path="' + path + '" begin="' + from + 's" dur="' + r3(to - from) + 's" fill="freeze"/>' + show(from, to) + '</g>';
    }

    var s = '<svg viewBox="0 0 760 370" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="2단계 page table walk">';
    s += '<defs><marker id="tlw_arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="#555"/></marker></defs>';
    [
      [0, 1.5, "VA 5844 = 0x16D4 = 0101 | 1011 | 010100 → PD index 5 · PT index 11 · offset 20"],
      [1.5, 4, "① PDBR + PD index 5 → Page Directory 의 PDE[5] 를 읽는다 (메모리 접근 1)"],
      [4, 6.5, "② PDE[5] 가 가리키는 page table page + PT index 11 → PTE[11] = PFN 230 (메모리 접근 2)"],
      [6.5, 8.5, "③ PA = PFN 230 | offset 20 = 230 × 64 + 20 = 14740 → data (메모리 접근 3)"],
      [8.5, 11, "PDE 가 invalid 인 칸 아래에는 page table page 가 아예 없다 → 메모리 절약"],
      [11, D, "TLB miss 한 번 = 메모리 3번(PDE·PTE·data). 메모리를 아끼는 대신 시간 — time-space trade-off"]
    ].forEach(function (c) { s += during(c[0], c[1], txt(380, 22, c[2], 12.5, "#222", ' font-weight="700"')); });

    // VA 필드
    s += txt(380, 48, "Virtual address (14-bit)", 11, C.muted);
    s += rect(270, 56, 60, 28, C.pdL, C.pd) + txt(300, 75, "5", 14, C.pd, ' font-weight="700"');
    s += rect(330, 56, 60, 28, C.ptL, C.pt) + txt(360, 75, "11", 14, C.pt, ' font-weight="700"');
    s += rect(390, 56, 90, 28, C.offL, C.off) + txt(435, 75, "20", 14, C.off, ' font-weight="700"');
    s += txt(300, 98, "4-bit", 10, C.muted) + txt(360, 98, "4-bit", 10, C.muted) + txt(435, 98, "6-bit", 10, C.muted);

    // PDBR
    s += rect(10, 120, 70, 28, C.cpuL, C.cpu) + txt(45, 139, "PDBR", 12, C.cpu, ' font-weight="700"');

    // Page Directory (16 entries)
    var pdx = 130, pdy = 120, rh = 13;
    s += txt(pdx + 45, pdy + 16 * rh + 18, "Page Directory (64B)", 11.5, C.pd, ' font-weight="700"');
    for (var i = 0; i < 16; i++) {
      var valid = (i === 0 || i === 5 || i === 15);
      s += '<rect x="' + pdx + '" y="' + (pdy + i * rh) + '" width="90" height="' + rh + '" fill="' + (valid ? "#fff" : "#f0f0f0") + '" stroke="#999" stroke-width="0.8"/>';
      s += txt(pdx + 100, pdy + i * rh + 10, String(i), 9, C.muted);
      s += txt(pdx + 45, pdy + i * rh + 10, valid ? "valid" : "—", 9, valid ? C.ok : "#aaa");
    }
    s += during(1.5, D, '<rect x="' + pdx + '" y="' + (pdy + 5 * rh) + '" width="90" height="' + rh + '" fill="' + C.pdL + '" stroke="' + C.pd + '" stroke-width="2"/>' + txt(pdx + 45, pdy + 5 * rh + 10, "PDE → PT page", 9, C.pd, ' font-weight="700"'));

    // PT page (16 entries) for PD 5
    var ptx = 380, pty = 130;
    s += txt(ptx + 45, pty + 16 * rh + 18, "PT page (PD 5 의 것, 64B)", 11.5, C.pt, ' font-weight="700"');
    for (var j = 0; j < 16; j++) {
      s += '<rect x="' + ptx + '" y="' + (pty + j * rh) + '" width="90" height="' + rh + '" fill="#fff" stroke="#999" stroke-width="0.8"/>';
      s += txt(ptx + 100, pty + j * rh + 10, String(j), 9, C.muted);
    }
    s += txt(ptx + 45, pty + 11 * rh + 10, "230", 9, "#222");
    s += during(4, D, '<rect x="' + ptx + '" y="' + (pty + 11 * rh) + '" width="90" height="' + rh + '" fill="' + C.ptL + '" stroke="' + C.pt + '" stroke-width="2"/>' + txt(ptx + 45, pty + 11 * rh + 10, "PTE: PFN 230", 9, C.pt, ' font-weight="700"'));

    // 고정 화살표
    s += during(1.5, D, '<path d="M80,134 L104,134 L104,' + (pdy + 5 * rh + 6) + ' L128,' + (pdy + 5 * rh + 6) + '" fill="none" stroke="#555" stroke-width="1.4" marker-end="url(#tlw_arr)"/>' + txt(94, 128, "+5", 10, C.pd, ' font-weight="700"'));
    s += during(4, D, '<path d="M240,' + (pdy + 5 * rh + 6) + ' L330,' + (pdy + 5 * rh + 6) + ' L330,' + (pty + 11 * rh + 6) + ' L378,' + (pty + 11 * rh + 6) + '" fill="none" stroke="#555" stroke-width="1.4" marker-end="url(#tlw_arr)"/>' + txt(352, pty + 11 * rh - 2, "+11", 10, C.pt, ' font-weight="700"'));

    // PA
    var pax = 560, pay = 250;
    s += txt(640, pay - 10, "Physical address", 11, C.muted);
    s += rect(pax, pay, 90, 28, "#f4f4f4", "#bbb") + rect(pax + 90, pay, 70, 28, "#f4f4f4", "#bbb");
    s += during(6.5, D, rect(pax, pay, 90, 28, C.ptL, C.pt) + txt(pax + 45, pay + 19, "230", 14, C.pt, ' font-weight="700"') + rect(pax + 90, pay, 70, 28, C.offL, C.off) + txt(pax + 125, pay + 19, "20", 14, C.off, ' font-weight="700"'));
    s += during(6.5, D, txt(640, pay + 50, "= 230 × 64 + 20 = 14740", 13, "#222", ' font-weight="700"'));
    s += during(6.5, D, '<path d="M492,' + (pty + 11 * rh + 6) + ' L525,' + (pty + 11 * rh + 6) + ' L525,' + (pay + 14) + ' L558,' + (pay + 14) + '" fill="none" stroke="#555" stroke-width="1.4" marker-end="url(#tlw_arr)"/>');
    s += during(6.5, D, '<path d="M480,70 L685,70 L685,' + (pay - 2) + '" fill="none" stroke="' + C.off + '" stroke-width="1.4" stroke-dasharray="5,3" marker-end="url(#tlw_arr)"/>' + txt(715, 140, "offset", 10, C.off) + txt(715, 152, "그대로", 10, C.off));

    // 메모리 접근 카운터
    s += during(1.5, 4, txt(640, 340, "메모리 접근 1 (PDE)", 13, C.pd, ' font-weight="700"'));
    s += during(4, 6.5, txt(640, 340, "메모리 접근 2 (PTE)", 13, C.pt, ' font-weight="700"'));
    s += during(6.5, D, txt(640, 340, "메모리 접근 3 (data)", 13, C.hw, ' font-weight="700"'));

    // invalid 강조
    s += during(8.5, 11, '<rect x="' + (pdx - 3) + '" y="' + (pdy + 1 * rh) + '" width="96" height="' + (4 * rh) + '" fill="none" stroke="' + C.hw + '" stroke-width="2" stroke-dasharray="5,3"/>' +
      '<rect x="' + (pdx - 3) + '" y="' + (pdy + 6 * rh) + '" width="96" height="' + (9 * rh) + '" fill="none" stroke="' + C.hw + '" stroke-width="2" stroke-dasharray="5,3"/>' +
      txt(pdx + 45, pdy + 16 * rh + 36, "invalid PDE 13개 → PT page 13장 할당 안 함", 11, C.hw, ' font-weight="700"') +
      txt(pdx + 45, pdy + 16 * rh + 52, "linear 이면 PT 16장(1KB) 전부 필요", 11, C.hw));

    // 토큰
    s += token("M300,84 L300,110 L45,110 L45,120", 1.5, 2.6, "5", C.pd);
    s += token("M80,134 L104,134 L104,191 L175,191", 2.6, 4, "PDE", C.pd);
    s += token("M360,84 L360,110 L330,110 L330,279 L378,279", 4, 5.3, "11", C.pt);
    s += token("M425,279 L520,279 L520,264 L600,264", 5.3, 6.5, "230", C.pt);

    return s + '</svg>';
  }
};
