// extent_vs_ptr — 21강 p.20: "Disk blocks 50–300 represent blocks 0–250 of file".
//   indirect block 방식은 포인터 칸 250 여 개를 하나씩 채우고 지울 때도 하나씩 비운다. extent 는 한 줄.
//   블록이 다 흩어지면(fragmented) extent 도 블록마다 하나씩 필요하다.
window.ANIMS = window.ANIMS || {};
ANIMS["extent_vs_ptr"] = {
  title: "Extent 와 블록 포인터: 연속이면 한 줄, 흩어지면 블록마다 한 줄",
  desc: "[[extent]] p.20 의 예. 할당, 삭제, 그리고 조각난 파일에서 두 방식이 적어야 하는 양을 비교한다.",
  duration: 14,
  build: function () {
    var D = 14;
    function r3(v) { return Math.round(v * 1000) / 1000; }
    function k(t) { return r3(Math.min(Math.max(t / D, 0), 0.996)); }
    function show(a, b) { return '<animate attributeName="opacity" values="0;0;1;1;0;0" keyTimes="0;' + k(a) + ';' + r3(k(a) + 0.003) + ';' + k(b) + ';' + r3(k(b) + 0.003) + ';1" dur="' + D + 's" fill="freeze"/>'; }
    function from(a) { return '<animate attributeName="opacity" values="0;0;1;1" keyTimes="0;' + k(a) + ';' + r3(k(a) + 0.003) + ';1" dur="' + D + 's" fill="freeze"/>'; }
    function txt(x, y, s, size, fill, extra) { return '<text x="' + x + '" y="' + y + '" font-size="' + size + '" fill="' + fill + '"' + (extra && extra.indexOf('text-anchor') >= 0 ? '' : ' text-anchor="middle"') + (extra || '') + '>' + s + '</text>'; }
    function win(a, b, inner) { return '<g opacity="0">' + inner + show(a, b) + '</g>'; }
    function on(a, inner) { return '<g opacity="0">' + inner + from(a) + '</g>'; }
    var C = { p: "#e09a40", pL: "#fdeec2", e: "#1d65b3", eL: "#dbe8f7", hw: "#d6465f", muted: "#777", ok: "#2e9e4f" };
    var s = '<svg viewBox="0 0 760 370" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="extent 와 indirect block 비교">';
    var caps = [
      [0, 1, "파일 블록 0~250 이 디스크 블록 50~300 에 이어져 있다"],
      [1, 4.8, "할당: indirect 방식은 포인터 칸 250 여 개를 하나씩 채운다. extent 는 한 줄"],
      [4.8, 7.6, "삭제: indirect 방식은 칸마다 free 로 표시한다. extent 는 한 줄을 지운다"],
      [7.6, 12, "조각난 파일: 연속 블록이 없으면 extent 도 블록마다 하나씩 필요하다"],
      [12, 13.99, "그때 extent 는 “a more expensive indirect block scheme” 이 된다"]
    ];
    caps.forEach(function (c) { s += win(c[0], c[1], txt(380, 26, c[2], 15, "#222", ' font-weight="700"')); });

    // 디스크 띠: 블록 0~349 → x 30~730 (2 px/블록)
    s += txt(30, 52, "디스크", 12, C.muted, ' text-anchor="start" font-weight="700"');
    s += '<rect x="30" y="58" width="700" height="22" fill="#f4f4f4" stroke="#999"/>';
    [0, 50, 300, 349].forEach(function (b) { s += txt(30 + b * 2, 94, "" + b, 10, C.muted); });
    s += win(0, 7.6, '<rect x="130" y="58" width="502" height="22" fill="' + C.eL + '" stroke="' + C.e + '" stroke-width="2"/>' + txt(381, 74, "파일 블록 0~250 (연속)", 12, C.e, ' font-weight="700"'));
    var scat = [12, 37, 58, 81, 104, 133, 150, 177, 201, 228, 259, 283, 311, 336];
    scat.forEach(function (b, i) { s += on(7.8 + i * 0.25, '<rect x="' + (30 + b * 2) + '" y="58" width="6" height="22" fill="' + C.hw + '"/>'); });

    // ===== 왼쪽: indirect block 포인터 칸 =====
    s += txt(200, 120, "indirect block 방식 (블록마다 포인터 한 칸)", 13, C.p, ' font-weight="700"');
    var COLS = 25, ROWS = 10, CW = 12, CH = 14, LX = 50, LY = 132;
    s += '<rect x="' + LX + '" y="' + LY + '" width="' + COLS * CW + '" height="' + ROWS * CH + '" fill="#fff" stroke="#999"/>';
    // 칸 채우기: 행마다 왼→오 로 width 를 늘린다 (할당 1.2~4.6), 삭제 5~7.4 에 줄어든다
    for (var r = 0; r < ROWS; r++) {
      var a1 = 1.2 + r * 0.34, a2 = a1 + 0.34, d1 = 7.4 - (r + 1) * 0.24, d2 = d1 + 0.24;
      s += '<rect x="' + LX + '" y="' + (LY + r * CH) + '" width="0" height="' + CH + '" fill="' + C.pL + '"><animate attributeName="width" values="0;0;' + COLS * CW + ';' + COLS * CW + ';0;0;' + COLS * CW + ';' + COLS * CW + '" keyTimes="0;' + k(a1) + ';' + k(a2) + ';' + k(d1) + ';' + k(d2) + ';' + k(7.8 + r * 0.14) + ';' + k(7.94 + r * 0.14) + ';1" dur="' + D + 's" fill="freeze"/></rect>';
    }
    for (var c = 1; c < COLS; c++) s += '<line x1="' + (LX + c * CW) + '" y1="' + LY + '" x2="' + (LX + c * CW) + '" y2="' + (LY + ROWS * CH) + '" stroke="#e6d3b0" stroke-width="0.6"/>';
    for (r = 1; r < ROWS; r++) s += '<line x1="' + LX + '" y1="' + (LY + r * CH) + '" x2="' + (LX + COLS * CW) + '" y2="' + (LY + r * CH) + '" stroke="#e6d3b0" stroke-width="0.6"/>';
    s += win(1.2, 7.6, txt(LX + 30, LY + 13, "50", 9, "#8a6000") + txt(LX + 66, LY + 13, "51 52 …", 9, "#8a6000"));
    // 칸 수 표시
    s += win(1.2, 4.8, txt(200, 296, "포인터 칸을 하나씩 채우는 중 … 250 칸", 13, "#8a6000", ' font-weight="700"'));
    s += win(4.8, 7.6, txt(200, 296, "칸을 하나씩 free 로 … 250 칸", 13, C.hw, ' font-weight="700"'));
    s += on(7.6, txt(200, 296, "흩어져도 똑같이 블록마다 한 칸", 13, "#8a6000", ' font-weight="700"'));

    // ===== 오른쪽: extent =====
    var RX = 410;
    s += txt(570, 120, "extent 방식 (연속 구간마다 한 줄)", 13, C.e, ' font-weight="700"');
    s += '<rect x="' + RX + '" y="132" width="320" height="24" fill="#eee" stroke="#999"/>' + txt(RX + 60, 149, "파일 블록", 12, "#444", ' font-weight="700"') + txt(RX + 170, 149, "디스크 블록", 12, "#444", ' font-weight="700"') + txt(RX + 275, 149, "길이", 12, "#444", ' font-weight="700"');
    s += win(1.5, 6, '<rect x="' + RX + '" y="156" width="320" height="26" fill="' + C.eL + '" stroke="' + C.e + '" stroke-width="2"/>' + txt(RX + 60, 174, "0~250", 14, C.e, ' font-weight="700"') + txt(RX + 170, 174, "50~300", 14, C.e, ' font-weight="700"') + txt(RX + 275, 174, "251", 14, C.e, ' font-weight="700"'));
    s += win(1.6, 4.8, txt(570, 210, "extent 1 개로 끝", 15, C.ok, ' font-weight="700"'));
    s += win(5.9, 7.6, '<line x1="' + RX + '" y1="169" x2="' + (RX + 320) + '" y2="169" stroke="' + C.hw + '" stroke-width="3"/>' + txt(570, 210, "한 줄 지우면 끝", 15, C.ok, ' font-weight="700"'));
    // 조각난 경우: 블록마다 한 줄씩 쌓인다 (작은 줄)
    scat.forEach(function (b, i) {
      if (i > 5) return;
      var y = 156 + i * 20;
      s += on(7.8 + i * 0.25, '<rect x="' + RX + '" y="' + y + '" width="320" height="20" fill="#ffecec" stroke="' + C.hw + '"/>' + txt(RX + 60, y + 15, "" + i, 12, C.hw) + txt(RX + 170, y + 15, "" + b, 12, C.hw) + txt(RX + 275, y + 15, "1", 12, C.hw, ' font-weight="700"'));
    });
    s += on(9.4, txt(570, 290, "… 길이 1 짜리 extent 가 블록 수만큼", 13, C.hw, ' font-weight="700"'));

    s += txt(380, 340, "연속으로 잡혀 있어야 extent 가 이득이다. 그래서 ext4 는 preallocation 과 함께 쓴다", 13, C.muted);
    s += txt(380, 360, "extent 하나는 최대 2^15 블록 = 128 MB (p.21)", 12, C.muted);
    return s + '</svg>';
  }
};
