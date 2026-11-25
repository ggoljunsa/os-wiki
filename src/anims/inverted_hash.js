// ============================================================
// inverted_hash — inverted page table 조회: VPN 100 → hash 500 → 200 ✗ → 400 ✗ → 100 ✓, 그 칸의 index = PFN (16강 p.32, p.35)
// 시간축(초): 0~1.5 구성 → 1.5~3 hash(VPN 100) = 500 → 3~4.5 VPN 200 ✗ → 4.5~6 400 ✗ → 6~7.5 100 ✓
//   → 7.5~9.5 Table Index = PFN, PA = PFN | VPO → 9.5~12 collision 이면 참조 횟수가 늘어난다
// ============================================================
window.ANIMS = window.ANIMS || {};
ANIMS["inverted_hash"] = {
  title: "Inverted page table — hash 로 칸을 찾고, 맞을 때까지 다음 후보로",
  desc: "[[inverted page table]] p.32 그림. 표는 시스템에 하나, 물리 page 하나당 한 칸이다. VPN 100 을 hash 하면 500 번 칸인데 거기엔 VPN 200 이 있어 다음 후보 400, 그다음 100 에서 일치한다([[hash collision]]). 일치한 칸의 index 가 곧 PFN 이다",
  duration: 12,
  build: function () {
    var D = 12;
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
    function token(path, from, to, label, color) {
      return '<g opacity="0"><rect x="-28" y="-11" width="56" height="22" rx="4" fill="' + color + '"/>' + txt(0, 5, label, 12, "#fff", ' font-weight="700"') +
        '<animateMotion path="' + path + '" begin="' + from + 's" dur="' + r3(to - from) + 's" fill="freeze"/>' + show(from, to) + '</g>';
    }

    var s = '<svg viewBox="0 0 760 370" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="inverted page table hash 조회 애니메이션">';
    s += '<defs><marker id="ivh_arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="#555"/></marker></defs>';
    [
      [0, 1.5, "시스템 전체에 표 하나, 물리 page 하나당 한 칸 (# of PTEs = # of physical pages)"],
      [1.5, 3, "VA 의 VPN 100 을 Hash Function 에 넣는다 → Hashed Index 500"],
      [3, 4.5, "500 번 칸: VPN 200 — 내가 찾는 100 이 아니다 (collision)"],
      [4.5, 6, "다음 후보 칸: VPN 400 — 또 아니다"],
      [6, 7.5, "다음 칸: VPN 100, PID 도 일치 → 찾았다"],
      [7.5, 9.5, "그 칸의 Table Index 가 곧 PFN → PA = PFN | VPO"],
      [9.5, D, "collision 이 없으면 표를 1번 읽고 끝. 있으면 더 읽는다 — worst case 가 고정되지 않는다 (p.35)"]
    ].forEach(function (c) { s += during(c[0], c[1], txt(380, 26, c[2], 14, "#222", ' font-weight="700"')); });

    // CPU, VA
    s += '<rect x="24" y="64" width="80" height="40" rx="4" fill="' + C.hwL + '" stroke="' + C.hw + '" stroke-width="1.5"/>' + txt(64, 89, "CPU", 14, C.hw, ' font-weight="700"');
    s += '<line x1="104" y1="84" x2="126" y2="84" stroke="#555" stroke-width="1.5" marker-end="url(#ivh_arr)"/>';
    s += txt(185, 58, "Virtual address", 12, C.m);
    s += box(130, 66, 60, 36, "#fdf6e3", "#999") + txt(160, 89, "VPN", 13, C.k, ' font-weight="700"') + box(190, 66, 60, 36, "#e4e4f6", "#999") + txt(220, 89, "VPO", 13, C.k, ' font-weight="700"');
    s += txt(176, 124, "100", 13, C.k, ' font-weight="700"');
    s += '<line x1="160" y1="102" x2="160" y2="172" stroke="#555" stroke-width="1.5" marker-end="url(#ivh_arr)"/>';
    s += '<rect x="110" y="176" width="110" height="46" rx="3" fill="' + C.bL + '" stroke="' + C.b + '" stroke-width="1.5"/>' + txt(165, 196, "Hash", 13, C.b, ' font-weight="700"') + txt(165, 213, "Function", 13, C.b, ' font-weight="700"');
    s += during(1.8, 3.2, '<rect x="106" y="172" width="118" height="54" rx="5" fill="none" stroke="' + C.hw + '" stroke-width="2.5"/>');

    // 표
    var TX = 330, TY = 92, RH = 22, NR = 10;
    s += txt(TX + 25, TY - 8, "VPN", 11.5, C.m) + txt(TX + 75, TY - 8, "PID", 11.5, C.m) + txt(TX + 130, TY - 8, "Others", 11.5, C.m);
    for (var i = 0; i < NR; i++) {
      s += box(TX, TY + i * RH, 50, RH, "#f3f3f3", "#999") + box(TX + 50, TY + i * RH, 50, RH, "#f3f3f3", "#999") + box(TX + 100, TY + i * RH, 60, RH, "#f3f3f3", "#999");
    }
    var cand = [[3, "200"], [4, "400"], [5, "100"]];
    cand.forEach(function (c) { s += txt(TX + 25, TY + c[0] * RH + 16, c[1], 13, C.k, ' font-weight="700"'); });
    s += during(6, D, '<rect x="' + TX + '" y="' + (TY + 5 * RH) + '" width="160" height="' + RH + '" fill="' + C.cL + '" stroke="' + C.c + '" stroke-width="2"/>' + txt(TX + 25, TY + 5 * RH + 16, "100", 13, C.k, ' font-weight="700"') + txt(TX + 75, TY + 5 * RH + 16, "✓", 13, C.b, ' font-weight="700"'));
    s += txt(TX + 80, TY + NR * RH + 20, "Inverted Page Table", 13, C.k, ' font-weight="700"');
    s += txt(TX - 8, TY + 3 * RH + 16, "500", 13, C.k, ' text-anchor="end" font-weight="700"');
    s += txt(TX - 8, TY + 3 * RH + 32, "Hashed Index", 11, C.m, ' text-anchor="end"');
    s += '<path d="M220,199 L238,199 L238,' + (TY + 3 * RH + 11) + ' L' + (TX - 40) + ',' + (TY + 3 * RH + 11) + '" fill="none" stroke="#555" stroke-width="1.5" marker-end="url(#ivh_arr)"/>';
    // 후보 강조
    s += during(3, 4.5, '<rect x="' + (TX - 2) + '" y="' + (TY + 3 * RH - 2) + '" width="164" height="' + (RH + 4) + '" fill="none" stroke="' + C.hw + '" stroke-width="3"/>' + txt(TX + 192, TY + 3 * RH + 16, "200 ≠ 100 ✗", 13, C.hw, ' text-anchor="start" font-weight="700"'));
    s += during(4.5, 6, '<rect x="' + (TX - 2) + '" y="' + (TY + 4 * RH - 2) + '" width="164" height="' + (RH + 4) + '" fill="none" stroke="' + C.hw + '" stroke-width="3"/>' + txt(TX + 192, TY + 4 * RH + 16, "400 ≠ 100 ✗", 13, C.hw, ' text-anchor="start" font-weight="700"') +
      '<path d="M' + (TX + 162) + ',' + (TY + 3 * RH + 11) + ' C' + (TX + 185) + ',' + (TY + 3 * RH + 11) + ' ' + (TX + 185) + ',' + (TY + 4 * RH + 11) + ' ' + (TX + 164) + ',' + (TY + 4 * RH + 11) + '" fill="none" stroke="#555" stroke-width="1.5" marker-end="url(#ivh_arr)"/>');
    s += during(6, 7.5, '<rect x="' + (TX - 2) + '" y="' + (TY + 5 * RH - 2) + '" width="164" height="' + (RH + 4) + '" fill="none" stroke="' + C.b + '" stroke-width="3"/>' + txt(TX + 192, TY + 5 * RH + 16, "100 = 100 ✓", 13, C.b, ' text-anchor="start" font-weight="700"') +
      '<path d="M' + (TX + 162) + ',' + (TY + 4 * RH + 11) + ' C' + (TX + 185) + ',' + (TY + 4 * RH + 11) + ' ' + (TX + 185) + ',' + (TY + 5 * RH + 11) + ' ' + (TX + 164) + ',' + (TY + 5 * RH + 11) + '" fill="none" stroke="#555" stroke-width="1.5" marker-end="url(#ivh_arr)"/>');

    // 표 참조 횟수
    s += box(24, 260, 200, 52, "#fff", "#ccc") + txt(124, 280, "표(메모리) 참조 횟수", 12, C.m);
    s += during(3, 4.5, txt(124, 303, "1", 18, C.hw, ' font-weight="700"'));
    s += during(4.5, 6, txt(124, 303, "2", 18, C.hw, ' font-weight="700"'));
    s += during(6, D, txt(124, 303, "3", 18, C.hw, ' font-weight="700"'));

    // PA 와 물리 메모리
    s += during(7.5, D, txt(TX + 170, TY + 7 * RH + 16, "Table Index = PFN", 12.5, C.c, ' text-anchor="start" font-weight="700"') +
      txt(630, 58, "Physical address", 12, C.m) + box(570, 66, 60, 36, "#fdf6e3", "#999") + txt(600, 89, "PFN", 13, C.k, ' font-weight="700"') + box(630, 66, 60, 36, "#e4e4f6", "#999") + txt(660, 89, "VPO", 13, C.k, ' font-weight="700"'));
    var MY = 140;
    var mem = txt(660, MY - 6, "Physical Memory", 12, C.k, ' font-weight="700"');
    for (var f = 0; f < NR; f++) mem += box(610, MY + f * 18, 100, 18, f === 5 ? C.cL : "#fff", "#999");
    s += mem;
    s += token("M" + (TX + 160) + "," + (TY + 5 * RH + 11) + " C540," + (TY + 5 * RH + 11) + " 560,140 590,100", 7.6, 8.6, "PFN", C.c);
    s += during(8.6, D, '<path d="M600,102 C600,140 580,' + (MY + 5 * 18 + 9) + ' 606,' + (MY + 5 * 18 + 9) + '" fill="none" stroke="' + C.hw + '" stroke-width="2" marker-end="url(#ivh_arr)"/>');
    s += '<path d="M250,74 L250,48 L600,48 L600,64" fill="none" stroke="#555" stroke-width="1.2" opacity="0.6"/>';

    s += txt(380, 356, "(PID, VPN) 을 tag 처럼 맞춰 본다 — 일치한 칸의 위치가 PFN", 13.5, C.k, ' font-weight="700"');
    return s + '</svg>';
  }
};
