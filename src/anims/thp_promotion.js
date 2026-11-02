// ============================================================
// thp_promotion — 16강 p.41~44: Transparent Huge Page 의 compaction → promotion → demotion
// 시간축(초): 0~2 virtually-contiguous 8 page 가 물리적으로는 흩어져 있음 → 2~5 compaction(복사해 물리적으로도 연속·정렬)
//   → 5~8 promotion(PDE 가 page table 대신 huge page 를 직접 가리킴, PT page 필요 없음, TLB 항목 8 → 1)
//   → 8~11 demotion(huge page 안 한 조각이 안 쓰이는데 따로 free 못 함 → 다시 작은 page 로 쪼개고 그 frame 반납) → 11~13 요점
// 그림의 page 개수(8)는 설명용 축소. 실제 x86_64 는 4KB × 512 = 2MB.
// ============================================================
window.ANIMS = window.ANIMS || {};
ANIMS["thp_promotion"] = {
  title: "Transparent Huge Page — compaction · promotion · demotion",
  desc: "p.41~44: 가상으로 연속인 작은 page 들을 물리적으로도 연속으로 모은 뒤(compaction) huge page 하나로 합치고(promotion), 안 쓰는 조각이 생기면 다시 쪼갠다(demotion). → [[transparent huge page]], [[huge page]]",
  duration: 13,
  build: function () {
    var D = 13;
    var C = { a: "#1d65b3", aL: "#dbe8f7", g: "#2e9e4f", gL: "#dff3e4", o: "#e09a40", oL: "#fdeec2", cpu: "#3b2f4a", cpuL: "#efe9f6", hw: "#d6465f", muted: "#777" };
    function r3(v) { return Math.round(v * 1000) / 1000; }
    function txt(x, y, s, size, fill, extra) {
      var anchor = /text-anchor/.test(extra || "") ? "" : ' text-anchor="middle"';
      return '<text x="' + x + '" y="' + y + '" font-size="' + (size || 13) + '" fill="' + (fill || "#222") + '"' + anchor + (extra || "") + '>' + s + '</text>';
    }
    function rect(x, y, w, h, fill, stroke, sw, extra) { return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="2" fill="' + fill + '" stroke="' + stroke + '" stroke-width="' + (sw || 1) + '"' + (extra || "") + '/>'; }
    function show(from, to) {
      return '<animate attributeName="opacity" values="0;0;1;1;0;0" keyTimes="0;' + r3(from / D) + ';' + r3(from / D + 0.003) + ';' + r3(to / D) + ';' + r3(Math.min(1, to / D + 0.003)) + ';1" dur="' + D + 's" fill="freeze"/>';
    }
    function during(from, to, inner) {
      if (from <= 0) return '<g>' + inner + '<animate attributeName="opacity" values="1;1;0;0" keyTimes="0;' + r3(to / D) + ';' + r3(Math.min(1, to / D + 0.003)) + ';1" dur="' + D + 's" fill="freeze"/></g>';
      return '<g opacity="0">' + inner + show(from, to) + '</g>';
    }

    var s = '<svg viewBox="0 0 760 370" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="THP promotion compaction demotion">';
    s += '<defs><marker id="thp_arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="#555"/></marker>' +
      '<marker id="thp_arrR" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="#d6465f"/></marker></defs>';
    [
      [0, 2, "가상으로 연속인 page 8개 — 그러나 물리 frame 은 흩어져 있다 (virtually-contiguous ≠ physically-contiguous)"],
      [2, 5, "① Compaction — 흩어진 frame 을 복사해 연속·정렬된 자리로 모은다 (linear mapping 만들기)"],
      [5, 8, "② Promotion — 조건(virtually- and physically-contiguous) 충족 → 상위 PDE 가 huge page 를 직접 가리킨다"],
      [8, 11, "③ Demotion — huge page 안 한 조각을 안 쓰는데 따로 free 할 수 없다(internal fragmentation) → 다시 쪼갬"],
      [11, D, "THP = 커널이 자동으로 promote/demote → TLB miss·page table 감소, 대신 메모리 증가·tail latency"]
    ].forEach(function (c) { s += during(c[0], c[1], txt(380, 22, c[2], 12, "#222", ' font-weight="700"')); });

    // Level 1 PDE
    s += txt(85, 100, "Level 1 PDT", 11.5, C.cpu, ' font-weight="700"');
    s += rect(40, 110, 90, 24, C.cpuL, C.cpu, 1.5) + txt(85, 127, "PDE", 12, C.cpu, ' font-weight="700"');
    s += during(5, 8, txt(85, 152, "Page Size = 1", 11, C.hw, ' font-weight="700"') + txt(85, 166, "(leaf: huge page)", 10, C.hw));

    // Page table page (8 PTEs)
    var ptx = 230, pty = 90, rh = 24;
    s += txt(ptx + 50, pty - 8, "Page Table page", 11.5, C.o, ' font-weight="700"');
    for (var i = 0; i < 8; i++) s += rect(ptx, pty + i * rh, 100, rh, C.oL, C.o) + txt(ptx + 50, pty + i * rh + 16, "VPN " + i, 11, "#5a3a00");
    // PT 비활성 (promotion 동안)
    s += during(5, 8, rect(ptx - 2, pty - 2, 104, 8 * rh + 4, "#fff", "#bbb", 1, ' fill-opacity="0.82" stroke-dasharray="4,3"') + txt(ptx + 50, pty + 4 * rh, "PT page", 12, C.muted, ' font-weight="700"') + txt(ptx + 50, pty + 4 * rh + 16, "필요 없음", 12, C.muted, ' font-weight="700"'));
    // demotion: VPN 7 안 씀
    s += during(8, D, rect(ptx, pty + 7 * rh, 100, rh, "#fff", C.hw, 1.5) + txt(ptx + 50, pty + 7 * rh + 16, "VPN 7 (안 씀)", 11, C.hw));

    // PDE → PT
    s += during(0, 5, '<path d="M130,122 L228,102" stroke="#555" stroke-width="1.4" marker-end="url(#thp_arr)"/>');
    s += during(8, D, '<path d="M130,122 L228,102" stroke="#555" stroke-width="1.4" marker-end="url(#thp_arr)"/>');

    // Physical memory: 16 frames
    var fx = 560, fy = 50, fh = 19;
    s += txt(fx + 60, fy - 8, "Physical Memory", 11.5, "#333", ' font-weight="700"');
    for (var f = 0; f < 16; f++) {
      s += rect(fx, fy + f * fh, 120, fh, "#fafafa", "#999", 0.8);
      s += txt(fx - 12, fy + f * fh + 13, String(f), 9, C.muted);
    }
    var before = [1, 4, 6, 13, 3, 10, 15, 0];
    function frameY(fr) { return fy + fr * fh + fh / 2; }
    // 흩어진 frame 채움 (0~5)
    var fillBefore = "", linesBefore = "";
    before.forEach(function (fr, i) {
      fillBefore += rect(fx + 1, fy + fr * fh + 1, 118, fh - 2, C.aL, C.a) + txt(fx + 60, fy + fr * fh + 13, "VPN " + i + " 의 data", 9.5, C.a);
      linesBefore += '<path d="M330,' + (pty + i * rh + 12) + ' L558,' + frameY(fr) + '" stroke="#555" stroke-width="1" marker-end="url(#thp_arr)"/>';
    });
    s += during(0, 5, fillBefore);
    s += during(0, 2, linesBefore);
    // compaction 화살표 (2~5): before[i] → 8+i
    var red = "";
    before.forEach(function (fr, i) {
      var to = 8 + i; if (fr === to) return;
      var y1 = frameY(fr), y2 = frameY(to), bend = 700 + (i % 4) * 12;
      red += '<path d="M680,' + y1 + ' C' + bend + ',' + y1 + ' ' + bend + ',' + y2 + ' 682,' + y2 + '" fill="none" stroke="' + C.hw + '" stroke-width="1.3" marker-end="url(#thp_arrR)"/>';
    });
    s += during(2, 5, red);
    // 정렬된 자리 (2~D)
    var fillAfter = "", linesAfter = "";
    for (var k = 0; k < 8; k++) {
      fillAfter += rect(fx + 1, fy + (8 + k) * fh + 1, 118, fh - 2, C.gL, C.g) + txt(fx + 60, fy + (8 + k) * fh + 13, "VPN " + k, 9.5, C.g);
      linesAfter += '<path d="M330,' + (pty + k * rh + 12) + ' L558,' + frameY(8 + k) + '" stroke="#555" stroke-width="1" marker-end="url(#thp_arr)"/>';
    }
    s += during(3.5, 8, fillAfter);
    s += during(3.5, 5, linesAfter);
    // promotion: huge page 테두리 + PDE 직행
    s += during(5, 8, rect(fx - 3, fy + 8 * fh - 3, 126, 8 * fh + 6, "none", C.hw, 2.5) + txt(fx + 60, fy + 8 * fh - 8, "Huge Page", 12, C.hw, ' font-weight="700"') +
      '<path d="M130,122 C300,40 440,180 555,' + (fy + 12 * fh) + '" fill="none" stroke="' + C.hw + '" stroke-width="2" marker-end="url(#thp_arrR)"/>');
    // TLB 카운터
    s += during(0, 5, txt(380, 330, "TLB 항목 8개 필요 (page 마다 하나)", 12.5, C.a, ' font-weight="700"'));
    s += during(5, 8, txt(380, 330, "TLB 항목 1개 · page table page 1장 절약", 12.5, C.hw, ' font-weight="700"'));
    // demotion (8~D): 7개만 다시 매핑, VPN 7 frame 반납
    var fillDem = "", linesDem = "";
    for (var m = 0; m < 7; m++) {
      fillDem += rect(fx + 1, fy + (8 + m) * fh + 1, 118, fh - 2, C.gL, C.g) + txt(fx + 60, fy + (8 + m) * fh + 13, "VPN " + m, 9.5, C.g);
      linesDem += '<path d="M330,' + (pty + m * rh + 12) + ' L558,' + frameY(8 + m) + '" stroke="#555" stroke-width="1" marker-end="url(#thp_arr)"/>';
    }
    s += during(8, D, fillDem + linesDem + txt(fx + 60, fy + 15 * fh + 13, "free (반납)", 9.5, C.hw, ' font-weight="700"'));
    s += during(8, D, txt(380, 330, "다시 작은 page 7개 + frame 1개 반납", 12.5, C.g, ' font-weight="700"'));
    s += txt(380, 356, "그림은 page 8개로 축소 — 실제 x86_64 huge page 는 4KB × 512 = 2MB", 10.5, C.muted);

    return s + '</svg>';
  }
};
