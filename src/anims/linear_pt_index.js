// ============================================================
// linear_pt_index — linear page table 은 VPN 으로 인덱싱하는 배열 (15강 p.15~20)
// 예: 64-byte 주소 공간, 16-byte page, page table [3, 7, 5, 2] (p.16), VA 21 → PA 117 (p.17~18)
// 시간축(초): 0~1.5 구성 → 1.5~3 VA 21 = 01 | 0101 → 3~5 PTEA = PTBR + VPN × 4 → 5~6.5 PFN 7
//   → 6.5~8 PA = 7 | 0101 = 117 → 8~12 32비트·4KB 면 2^20 칸 × 4B = 4MB → 메모리에 둔다
// ============================================================
window.ANIMS = window.ANIMS || {};
ANIMS["linear_pt_index"] = {
  title: "Linear page table — VPN 번째 칸을 읽으면 PFN 이 나온다",
  desc: "[[페이지 테이블]] p.15~16 의 배열 [3, 7, 5, 2] 로 VA 21 을 변환한다. PTE 주소 = PTBR + VPN × PTE 크기(4B 가정, [[PTBR]] 공식). 같은 구조를 32비트·4KB page 로 키우면 2^20 칸 = 4MB 라서 레지스터가 아니라 메모리에 둔다(p.19~20)",
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
    function token(path, from, to, label, color) {
      return '<g opacity="0"><rect x="-34" y="-11" width="68" height="22" rx="4" fill="' + color + '"/>' + txt(0, 5, label, 12.5, "#fff", ' font-weight="700"') +
        '<animateMotion path="' + path + '" begin="' + from + 's" dur="' + r3(to - from) + 's" fill="freeze"/>' + show(from, to) + '</g>';
    }

    var s = '<svg viewBox="0 0 760 370" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="linear page table 인덱싱 애니메이션">';
    [
      [0, 1.5, "linear page table = VPN 으로 인덱싱하는 배열. 한 칸이 PTE 하나"],
      [1.5, 3, "VA 21 = 01 | 0101 → VPN = 1, offset = 5 (64-byte 공간, 16-byte page)"],
      [3, 5, "PTE 주소 = PTBR + VPN × 4 → 배열의 1번 칸. 검색 없이 바로 간다"],
      [5, 6.5, "PTE[1] 의 PFN = 7"],
      [6.5, 8, "PA = PFN | offset = 111 | 0101 = 117. offset 은 그대로"],
      [8, 10, "32비트 · 4KB page 면 VPN 20비트 → 칸이 2^20 개 × 4B = 4MB"],
      [10, D, "레지스터에 못 담는다 → page table 은 메모리에 두고 PTBR 이 시작을 가리킨다"]
    ].forEach(function (c) { s += during(c[0], c[1], txt(380, 26, c[2], 14.5, "#222", ' font-weight="700"')); });

    // VA
    s += txt(110, 62, "Virtual address 21", 12.5, C.k, ' font-weight="700"');
    s += box(40, 70, 60, 34, C.aL, C.a, 2) + txt(70, 93, "01", 16, C.a, ' font-weight="700" font-family="monospace"');
    s += box(100, 70, 100, 34, C.cL, C.c, 2) + txt(150, 93, "0101", 16, C.c, ' font-weight="700" font-family="monospace"');
    s += txt(70, 120, "VPN", 12, C.a) + txt(150, 120, "offset", 12, C.c);
    s += during(1.5, D, txt(70, 138, "= 1", 13, C.a, ' font-weight="700"') + txt(150, 138, "= 5", 13, C.c, ' font-weight="700"'));

    // PTBR
    s += box(40, 168, 160, 34, C.kL, C.k, 2) + txt(120, 190, "PTBR (시작 주소)", 13, C.k, ' font-weight="700"');

    // page table (메모리 안)
    var TX = 290, TY = 70, RH = 34;
    s += txt(TX + 80, TY - 10, "Page Table (메모리)", 12.5, C.k, ' font-weight="700"');
    s += txt(TX - 8, TY - 10, "VPN", 11, C.m, ' text-anchor="end"');
    var pfn = [3, 7, 5, 2];
    pfn.forEach(function (p, i) {
      var y = TY + i * RH;
      s += box(TX, y, 160, RH, "#fff", "#888") + txt(TX + 80, y + 22, "PFN " + p, 14, C.k, ' font-weight="700"');
      s += txt(TX - 8, y + 22, String(i), 13, C.a, ' text-anchor="end" font-weight="700"') + txt(TX + 168, y + 22, "PTBR+" + (i * 4), 11, C.m, ' text-anchor="start"');
    });
    s += '<path d="M200,185 C240,185 250,' + (TY + 8) + ' ' + (TX - 2) + ',' + (TY + 8) + '" fill="none" stroke="' + C.k + '" stroke-width="1.8" stroke-dasharray="4,3"/>';
    s += during(3, 8, '<rect x="' + (TX - 3) + '" y="' + (TY + RH - 3) + '" width="166" height="' + (RH + 6) + '" fill="none" stroke="' + C.hw + '" stroke-width="3"/>');
    s += during(3, 5, txt(TX + 80, TY + 4 * RH + 22, "PTBR + 1 × 4", 14, C.hw, ' font-weight="700"'));

    // 물리 메모리 8 frame
    var PX = 590, PY = 50, FH = 30;
    s += txt(PX + 60, PY - 6, "Physical Memory", 12.5, C.k, ' font-weight="700"');
    for (var f = 0; f < 8; f++) {
      var used = pfn.indexOf(f) >= 0;
      s += box(PX, PY + f * FH, 120, FH, used ? C.bL : "#f4f4f4", used ? C.b : "#bbb", 1.2) + txt(PX - 6, PY + f * FH + 20, String(f), 11.5, C.m, ' text-anchor="end"');
      if (used) s += txt(PX + 60, PY + f * FH + 20, "page " + pfn.indexOf(f), 12, C.b);
    }
    s += during(6.5, 8.5, '<rect x="' + (PX - 3) + '" y="' + (PY + 7 * FH - 3) + '" width="126" height="' + (FH + 6) + '" fill="none" stroke="' + C.hw + '" stroke-width="3"/>');

    // 토큰
    s += token("M70,140 C150,150 230," + (TY + RH + 17) + " " + (TX + 20) + "," + (TY + RH + 17), 3, 4.6, "VPN 1", C.a);
    s += token("M" + (TX + 140) + "," + (TY + RH + 17) + " C520," + (TY + RH + 17) + " 505,170 505,222", 5, 6.4, "PFN 7", C.b);
    s += during(6.5, 8, box(450, 222, 110, 30, "#fff", C.hw, 2.5) + txt(505, 243, "PA 117", 15, C.hw, ' font-weight="700"'));
    s += token("M560,237 C575,250 575,265 " + (PX + 20) + "," + (PY + 7 * FH + 15), 6.8, 8, "117", C.hw);

    // 4MB 로 커지기
    var BY = 252;
    s += during(8, D, txt(40, BY - 8, "PTE 개수 (칸 하나 = 4B)", 12, C.m, ' text-anchor="start"'));
    s += '<g opacity="0"><rect x="40" y="' + BY + '" height="26" width="20" fill="' + C.cL + '" stroke="' + C.c + '" stroke-width="1.5"><animate attributeName="width" values="20;500" begin="8.2s" dur="1.8s" fill="freeze"/></rect>' + show(8, D) + '</g>';
    s += during(8, 8.8, txt(70, BY + 18, "64-byte 예: 4칸 = 16B", 12.5, C.c, ' text-anchor="start" font-weight="700"'));
    s += during(9.6, D, txt(290, BY + 18, "32비트·4KB: 2^20 칸 × 4B = 4MB (프로세스마다)", 13.5, C.hw, ' font-weight="700"'));

    s += txt(380, 352, "PTE 주소 = PTBR + VPN × PTE 크기 — 배열이라 바로 찾지만, 크기는 주소 공간에 비례한다", 13.5, C.k, ' font-weight="700"');
    return s + '</svg>';
  }
};
