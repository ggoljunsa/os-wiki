// ============================================================
// dirty_writeback — clean page 는 그냥 버리고, dirty page 는 디스크에 써야 내보낼 수 있다. 쓰기는 모아서 한 번에 (17강 p.50, p.53)
// 시간축(초): 0~1.5 frame 4개(dirty bit 표시) → 1.5~4.5 clean page 를 victim: 디스크 쓰기 없음
//   → 4.5~7.5 dirty page 를 victim: write back 후에야 비움 → 7.5~11 clustering: pending write 셋을 모아 한 번에 → 11~13 요점
// ============================================================
window.ANIMS = window.ANIMS || {};
ANIMS["dirty_writeback"] = {
  title: "Dirty bit — clean page 는 공짜로, dirty page 는 디스크에 써야 내보낸다",
  desc: "[[demand paging]] p.50·p.53. 하드웨어의 modified(dirty) bit 가 1 이면 그 page 는 메모리에서 고쳐졌으므로 내보내기 전에 디스크에 써야 한다. 0(clean)이면 디스크 사본과 같아 그냥 버리면 된다 — 그래서 보통 clean page 를 victim 으로 고른다. 쓸 것은 모아서 한 번의 큰 write 로(clustering)",
  duration: 13,
  build: function () {
    var D = 13;
    var C = { a: "#1d65b3", aL: "#dbe8f7", b: "#2e9e4f", bL: "#dff3e4", c: "#e09a40", cL: "#fdeec2", k: "#3b2f4a", kL: "#efe9f6", hw: "#d6465f", hwL: "#f7d8dc", m: "#777" };
    function r3(v) { return Math.round(v * 1000) / 1000; }
    function box(x, y, w, h, fill, stroke, sw) { return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="4" fill="' + fill + '" stroke="' + stroke + '" stroke-width="' + (sw || 1.5) + '"/>'; }
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
      w = w || 64;
      return '<g opacity="0"><rect x="' + (-w / 2) + '" y="-12" width="' + w + '" height="24" rx="4" fill="' + color + '"/>' + txt(0, 5, label, 12.5, "#fff", ' font-weight="700"') +
        '<animateMotion path="' + path + '" begin="' + from + 's" dur="' + r3(to - from) + 's" fill="freeze"/>' + show(from, to) + '</g>';
    }

    var s = '<svg viewBox="0 0 760 350" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="dirty bit write back 애니메이션">';
    [
      [0, 1.5, "메모리 frame 4개. 각 page 의 dirty(modified) bit — 메모리에 올라온 뒤 고쳐졌나?"],
      [1.5, 4.5, "victim 이 clean page(D=0) 면 디스크 사본과 같다 → 그냥 버린다. eviction is free"],
      [4.5, 7.5, "victim 이 dirty page(D=1) 면 먼저 디스크에 write back 해야 frame 을 비울 수 있다"],
      [7.5, 9.5, "Clustering: 쓸 page(pending writes)들을 메모리에 모아 둔다"],
      [9.5, 11, "모은 것을 한 번의 큰 write 로 — 작은 write 여러 번보다 효율적"],
      [11, D, "Usually, a clean page is selected as a victim (p.50) · dirty 쓰기는 모아서 (p.53)"]
    ].forEach(function (c) { s += during(c[0], c[1], txt(380, 26, c[2], 14, "#222", ' font-weight="700"')); });

    // frames
    var FX = 92, FY = 64, FW = 136, FH = 70, G = 16;
    var pages = [["page A", 0], ["page B", 1], ["page C", 1], ["page E", 1]];
    s += txt(84, FY + 40, "Memory", 12.5, C.k, ' text-anchor="end" font-weight="700"');
    pages.forEach(function (p, i) {
      var x = FX + i * (FW + G);
      s += box(x, FY, FW, FH, "#f4f4f6", "#999");
      var body = box(x + 6, FY + 6, FW - 12, FH - 12, p[1] ? C.hwL : C.bL, p[1] ? C.hw : C.b, 1.8) + txt(x + FW / 2, FY + 32, p[0], 14, C.k, ' font-weight="700"') +
        txt(x + FW / 2, FY + 52, p[1] ? "dirty bit 1" : "dirty bit 0 (clean)", 12, p[1] ? C.hw : C.b, ' font-weight="700"');
      if (i === 0) s += during(0, 3, body);
      else if (i === 1) s += during(0, 6.8, body);
      else s += during(0, 9.5, body);
    });
    // 새 page 가 들어옴
    s += during(3.2, D, box(FX + 6, FY + 6, FW - 12, FH - 12, C.aL, C.a, 1.8) + txt(FX + FW / 2, FY + 40, "새 page", 14, C.a, ' font-weight="700"'));
    s += during(7, D, box(FX + FW + G + 6, FY + 6, FW - 12, FH - 12, C.aL, C.a, 1.8) + txt(FX + FW + G + FW / 2, FY + 40, "새 page", 14, C.a, ' font-weight="700"'));
    s += during(9.7, D, box(FX + 2 * (FW + G) + 6, FY + 6, FW - 12, FH - 12, C.bL, C.b, 1.8) + txt(FX + 2 * (FW + G) + FW / 2, FY + 32, "page C", 14, C.k, ' font-weight="700"') + txt(FX + 2 * (FW + G) + FW / 2, FY + 52, "clean", 12, C.b, ' font-weight="700"') +
      box(FX + 3 * (FW + G) + 6, FY + 6, FW - 12, FH - 12, C.bL, C.b, 1.8) + txt(FX + 3 * (FW + G) + FW / 2, FY + 32, "page E", 14, C.k, ' font-weight="700"') + txt(FX + 3 * (FW + G) + FW / 2, FY + 52, "clean", 12, C.b, ' font-weight="700"'));
    // victim 표시
    s += during(1.5, 3, '<rect x="' + (FX - 3) + '" y="' + (FY - 3) + '" width="' + (FW + 6) + '" height="' + (FH + 6) + '" rx="5" fill="none" stroke="' + C.k + '" stroke-width="3" stroke-dasharray="6,4"/>' + txt(FX + FW / 2, FY + FH + 18, "victim", 13, C.k, ' font-weight="700"'));
    s += during(1.8, 3.2, txt(FX + FW / 2, FY + FH + 36, "✕ 버림 (I/O 없음)", 13, C.b, ' font-weight="700"'));
    s += during(4.5, 6.8, '<rect x="' + (FX + FW + G - 3) + '" y="' + (FY - 3) + '" width="' + (FW + 6) + '" height="' + (FH + 6) + '" rx="5" fill="none" stroke="' + C.k + '" stroke-width="3" stroke-dasharray="6,4"/>' + txt(FX + FW + G + FW / 2, FY + FH + 18, "victim", 13, C.k, ' font-weight="700"'));

    // disk
    var DY = 250;
    s += box(60, DY, 620, 56, C.aL, C.a, 2) + txt(370, DY + 34, "swap space (disk)", 14, C.a, ' font-weight="700"');
    // write back 토큰 (B)
    var bx = FX + FW + G + FW / 2;
    s += token("M" + bx + "," + (FY + FH) + " L" + bx + "," + (DY + 10), 5, 6.6, "write B", C.hw, 72);
    s += during(5, 6.8, txt(bx + 50, 190, "디스크 쓰기 → 느리다", 13, C.hw, ' text-anchor="start" font-weight="700"'));

    // 디스크 쓰기 횟수
    s += box(560, 160, 160, 54, "#fff", "#ccc") + txt(640, 180, "디스크 write 횟수", 12, C.m);
    s += during(0, 6.6, txt(640, 204, "0", 18, C.k, ' font-weight="700"'));
    s += during(6.6, 10.8, txt(640, 204, "1", 18, C.k, ' font-weight="700"'));
    s += during(10.8, D, txt(640, 204, "2 (셋을 한 번에)", 16, C.k, ' font-weight="700"'));

    // clustering: pending writes 버퍼
    var PX = 330, PY = 162;
    s += during(7.5, 11, box(PX - 110, PY, 220, 52, "#fff", C.c, 2) + txt(PX, PY + 16, "pending writes", 12, C.c, ' font-weight="700"'));
    var c1 = FX + 2 * (FW + G) + FW / 2, c2 = FX + 3 * (FW + G) + FW / 2;
    s += token("M" + c1 + "," + (FY + FH) + " L" + (PX - 70) + "," + (PY + 36), 7.6, 8.4, "C", C.hw, 40);
    s += during(8.4, 9.8, '<g transform="translate(' + (PX - 70) + ',' + (PY + 36) + ')"><rect x="-20" y="-12" width="40" height="24" rx="4" fill="' + C.hw + '"/>' + txt(0, 5, "C", 12.5, "#fff", ' font-weight="700"') + '</g>');
    s += token("M" + c2 + "," + (FY + FH) + " L" + PX + "," + (PY + 36), 8, 8.8, "E", C.hw, 40);
    s += during(8.8, 9.8, '<g transform="translate(' + PX + ',' + (PY + 36) + ')"><rect x="-20" y="-12" width="40" height="24" rx="4" fill="' + C.hw + '"/>' + txt(0, 5, "E", 12.5, "#fff", ' font-weight="700"') + '</g>');
    s += during(8.6, 9.8, '<g transform="translate(' + (PX + 70) + ',' + (PY + 36) + ')"><rect x="-20" y="-12" width="40" height="24" rx="4" fill="' + C.hw + '"/>' + txt(0, 5, "F", 12.5, "#fff", ' font-weight="700"') + '</g>' + txt(PX + 100, PY + 64, "(다른 dirty page)", 11, C.m));
    s += token("M" + PX + "," + (PY + 36) + " L" + PX + "," + (DY + 14), 9.8, 10.8, "C · E · F 한 번에", C.hw, 150);

    s += txt(380, 336, "dirty bit = 메모리에 올라온 뒤 수정됐나 (PTE 플래그). 내보내기 비용을 결정한다", 13.5, C.k, ' font-weight="700"');
    return s + '</svg>';
  }
};
