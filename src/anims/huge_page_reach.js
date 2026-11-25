// ============================================================
// huge_page_reach — 같은 2MB 영역을 4KB page 로 덮으면 TLB 항목이 모자라고, 2MB page 하나면 한 칸으로 끝 (16강 p.38)
// 그림용 가정: TLB 4칸, 영역 안 서로 다른 8곳 접근. 숫자 512 = 2MB / 4KB (영상 50:57)
// 시간축(초): 0~1.5 구성 → 1.5~6.3 4KB: 8번 모두 다른 page → 매번 TLB miss·walk, 오래된 항목 밀려남
//   → 6.5~11.3 2MB: 첫 접근만 miss, 나머지 7번 hit → 11.3~13 요점
// ============================================================
window.ANIMS = window.ANIMS || {};
ANIMS["huge_page_reach"] = {
  title: "Huge page — TLB 한 칸이 덮는 범위(TLB reach)가 512배",
  desc: "[[huge page]] p.38 의 'High TLB pressure'. TLB 항목 수는 고정이라, 4KB page 로 2MB 영역을 쓰면 서로 다른 page 마다 miss 와 page walk 가 난다. 2MB page 하나는 4KB page 512개와 같은 범위를 TLB 한 칸으로 덮는다. (TLB 4칸·접근 8곳은 그림용 가정)",
  duration: 13,
  build: function () {
    var D = 13;
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

    var acc = [25, 153, 317, 76, 435, 230, 368, 486]; // 512 page 중 접근하는 page 번호
    var STEP = 0.6, T1 = 1.5, T2 = 6.5;
    var BX = 40, BW = 512, PXW = 1; // page 하나 = 1px
    var s = '<svg viewBox="0 0 760 370" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="huge page TLB reach 애니메이션">';
    s += '<defs><pattern id="hpr_tick" width="8" height="10" patternUnits="userSpaceOnUse"><line x1="0" y1="0" x2="0" y2="10" stroke="#d4d4dc" stroke-width="1"/></pattern></defs>';
    [
      [0, T1, "같은 2MB 영역 = 4KB page 512개. TLB 는 4칸뿐(그림용)"],
      [T1, T2, "4KB page: 영역 안 8곳이 모두 다른 page → 매번 TLB miss, page walk, 오래된 항목이 밀려난다"],
      [T2, T2 + STEP, "2MB huge page: 첫 접근 → miss 한 번, TLB 에 2MB 항목 하나"],
      [T2 + STEP, T2 + 8 * STEP, "나머지 7곳은 전부 같은 2MB page 안 → hit"],
      [T2 + 8 * STEP, D, "2MB page 1개 = 4KB page 512개 범위. TLB pressure 와 walk 비용이 준다"]
    ].forEach(function (c) { s += during(c[0], c[1], txt(380, 26, c[2], 14, "#222", ' font-weight="700"')); });

    function row(y, label, sub) {
      return txt(BX, y - 12, label, 13.5, C.k, ' text-anchor="start" font-weight="700"') + txt(BX + BW, y - 12, sub, 11.5, C.m, ' text-anchor="end"') +
        '<rect x="' + BX + '" y="' + y + '" width="' + BW + '" height="40" fill="url(#hpr_tick)" stroke="#999" stroke-width="1.2"/>';
    }
    var Y1 = 80, Y2 = 222;
    s += row(Y1, "① 4KB pages", "2MB = 4KB × 512 (눈금 하나 = 8 page)");
    s += row(Y2, "② 2MB huge page", "같은 2MB 영역");
    // 2MB page 하나가 통째로 TLB 에 (6.5~)
    s += during(T2 + 0.3, D, '<rect x="' + BX + '" y="' + Y2 + '" width="' + BW + '" height="40" fill="' + C.bL + '" fill-opacity="0.75" stroke="' + C.b + '" stroke-width="2.5"/>' + txt(BX + BW / 2, Y2 + 34, "TLB 항목 1개가 덮는 범위", 12, C.b, ' font-weight="700"'));

    // 접근 점과 4KB 칸 강조
    acc.forEach(function (p, i) {
      var t1 = r3(T1 + i * STEP), t2 = r3(T2 + i * STEP), x = BX + p * PXW;
      // ① 행: 접근한 page 를 눈에 띄게(폭 과장 6px) — miss
      s += '<g opacity="0"><rect x="' + (x - 3) + '" y="' + (Y1 - 4) + '" width="6" height="48" fill="' + C.hw + '"/>' + show(t1, D) + '</g>';
      s += during(t1, r3(t1 + STEP), txt(x, Y1 + 60, "miss", 12, C.hw, ' font-weight="700"'));
      // ② 행
      s += '<g opacity="0"><circle cx="' + x + '" cy="' + (Y2 + 11) + '" r="5" fill="' + (i === 0 ? C.hw : C.a) + '"/>' + show(t2, D) + '</g>';
      s += during(t2, r3(t2 + STEP), txt(x, Y2 + 60, i === 0 ? "miss" : "hit", 12, i === 0 ? C.hw : C.b, ' font-weight="700"'));
    });

    // TLB 상자들
    function tlbBox(y, title) { return box(590, y - 8, 150, 108, "#fff", C.k, 1.8) + txt(665, y + 10, title, 12.5, C.k, ' font-weight="700"'); }
    s += tlbBox(Y1 - 18, "TLB (4칸)") + tlbBox(Y2 - 18, "TLB (4칸)");
    for (var k = 0; k < 4; k++) {
      s += '<rect x="602" y="' + (Y1 + 4 + k * 19) + '" width="126" height="17" fill="#f4f4f6" stroke="#ccc"/>';
      s += '<rect x="602" y="' + (Y2 + 4 + k * 19) + '" width="126" height="17" fill="#f4f4f6" stroke="#ccc"/>';
    }
    // ① FIFO 처럼 최근 4개 유지
    for (var i2 = 0; i2 < acc.length; i2++) {
      var from = T1 + i2 * STEP, to = i2 < acc.length - 1 ? T1 + (i2 + 1) * STEP : D;
      var g = '';
      var recent = acc.slice(Math.max(0, i2 - 3), i2 + 1);
      recent.forEach(function (p, j) { g += txt(665, Y1 + 17 + j * 19, "4KB page " + p, 11.5, j === recent.length - 1 ? C.hw : C.k, j === recent.length - 1 ? ' font-weight="700"' : ""); });
      s += during(r3(from), r3(to), g);
    }
    s += during(T2 + 0.3, D, txt(665, Y2 + 17, "2MB page", 12, C.b, ' font-weight="700"'));

    // 카운터
    s += box(40, 318, 300, 30, "#fff", "#ccc") + box(420, 318, 300, 30, "#fff", "#ccc");
    for (var c1 = 0; c1 < acc.length; c1++) {
      s += during(r3(T1 + c1 * STEP), c1 < 7 ? r3(T1 + (c1 + 1) * STEP) : D, txt(190, 338, "① TLB miss " + (c1 + 1) + " / " + (c1 + 1) + " (walk " + (c1 + 1) + "번)", 13, C.hw, ' font-weight="700"'));
      s += during(r3(T2 + c1 * STEP), c1 < 7 ? r3(T2 + (c1 + 1) * STEP) : D, txt(570, 338, "② TLB miss 1 / " + (c1 + 1) + " (walk 1번)", 13, C.b, ' font-weight="700"'));
    }
    s += during(0, T1, txt(190, 338, "① 4KB", 13, C.m));
    s += during(0, T2, txt(570, 338, "② 2MB", 13, C.m));

    s += txt(380, 364, "모든 page 를 키우면 internal fragmentation → 큰 영역만 huge page 로, 크기를 섞어 쓴다 (p.38)", 12.5, C.k, ' font-weight="700"');
    return s + '</svg>';
  }
};
