// bitmap_alloc — 20강 p.6~7: 파일 하나를 만들고 블록 하나를 쓸 때 bitmap 두 개가 바뀌는 과정.
//   inode bitmap 1111 0100… 을 앞에서부터 훑어 0 인 4 번 → inode 4, data bitmap 1101 0000… 에서 2 번 → data block 2.
window.ANIMS = window.ANIMS || {};
ANIMS["bitmap_alloc"] = {
  title: "bitmap 으로 빈 inode·빈 블록 찾기",
  desc: "[[bitmap과 free space]] p.7: “Creating a file allocates an inode using the inode bitmap. Allocating a data block also updates the data bitmap.”",
  duration: 12,
  build: function () {
    var D = 12;
    function r3(v) { return Math.round(v * 1000) / 1000; }
    function k(t) { return r3(Math.min(Math.max(t / D, 0), 0.996)); }
    function show(a, b) { return '<animate attributeName="opacity" values="0;0;1;1;0;0" keyTimes="0;' + k(a) + ';' + r3(k(a) + 0.003) + ';' + k(b) + ';' + r3(k(b) + 0.003) + ';1" dur="' + D + 's" fill="freeze"/>'; }
    function from(a) { return '<animate attributeName="opacity" values="0;0;1;1" keyTimes="0;' + k(a) + ';' + r3(k(a) + 0.003) + ';1" dur="' + D + 's" fill="freeze"/>'; }
    function txt(x, y, s, size, fill, extra) { return '<text x="' + x + '" y="' + y + '" font-size="' + size + '" fill="' + fill + '"' + (extra && extra.indexOf('text-anchor') >= 0 ? '' : ' text-anchor="middle"') + (extra || '') + '>' + s + '</text>'; }
    function win(a, b, inner) { return '<g opacity="0">' + inner + show(a, b) + '</g>'; }
    function on(a, inner) { return '<g opacity="0">' + inner + from(a) + '</g>'; }
    var C = { bm: "#a0620a", bmL: "#fdeec2", I: "#1d65b3", IL: "#cfe0f5", Dg: "#1d6b2a", DL: "#d6f0dc", hw: "#d6465f", muted: "#777" };
    var X0 = 150, CW = 36;
    function bx(i) { return X0 + i * CW; }
    var ibits = [1, 1, 1, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    var dbits = [1, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    var s = '<svg viewBox="0 0 760 370" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="bitmap 할당">';
    s += '<defs><marker id="ba_arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="' + C.hw + '"/></marker></defs>';
    var caps = [
      [0, 1, "파일 하나를 만들고(create), 블록 하나를 쓴다(write)"],
      [1, 3.2, "create: inode bitmap 을 앞에서부터 훑어 0 인 비트를 찾는다"],
      [3.2, 4.6, "4 번 비트를 1 로 바꾼다. inode 4 가 새 파일의 inode 다"],
      [4.6, 6.6, "write: 이번엔 data bitmap 에서 0 인 비트를 찾는다"],
      [6.6, 8.2, "2 번 비트를 1 로. data region 의 2 번 블록에 내용을 쓴다"],
      [8.2, 10, "inode 4 의 블록 포인터 칸에 2 를 적는다"],
      [10, 11.99, "bitmap 두 개가 다 바뀌었다. 바꿀 때마다 bitmap 블록을 읽고 다시 쓴다"]
    ];
    caps.forEach(function (c) { s += win(c[0], c[1], txt(380, 26, c[2], 15, "#222", ' font-weight="700"')); });

    function row(y, label, sub, bits, fillOn, stroke, flipIdx, tFlip) {
      var g = txt(X0 - 12, y + 18, label, 14, stroke, ' text-anchor="end" font-weight="700"') + txt(X0 - 12, y + 34, sub, 11, C.muted, ' text-anchor="end"');
      for (var i = 0; i < 16; i++) {
        g += '<rect x="' + bx(i) + '" y="' + y + '" width="' + (CW - 2) + '" height="30" fill="' + (bits[i] ? fillOn : "#fff") + '" stroke="' + stroke + '"/>';
        g += txt(bx(i) + 17, y + 21, "" + bits[i], 15, "#333", ' font-family="monospace"');
        g += txt(bx(i) + 17, y - 4, "" + i, 10, C.muted);
      }
      g += on(tFlip, '<rect x="' + bx(flipIdx) + '" y="' + y + '" width="' + (CW - 2) + '" height="30" fill="' + C.hw + '"/>' + txt(bx(flipIdx) + 17, y + 21, "1", 15, "#fff", ' font-weight="700" font-family="monospace"'));
      return g;
    }
    function blocks(y, label, sub, fill, stroke, prefix, used, newIdx, tNew, newLabel) {
      var g = txt(X0 - 12, y + 18, label, 14, stroke, ' text-anchor="end" font-weight="700"') + txt(X0 - 12, y + 34, sub, 11, C.muted, ' text-anchor="end"');
      for (var i = 0; i < 16; i++) {
        g += '<rect x="' + bx(i) + '" y="' + y + '" width="' + (CW - 2) + '" height="36" rx="3" fill="' + (used[i] ? fill : "#f7f7f7") + '" stroke="' + (used[i] ? stroke : "#ccc") + '"/>';
        g += txt(bx(i) + 17, y + 23, prefix + i, 11, used[i] ? stroke : "#bbb");
      }
      g += on(tNew, '<rect x="' + bx(newIdx) + '" y="' + y + '" width="' + (CW - 2) + '" height="36" rx="3" fill="' + fill + '" stroke="' + C.hw + '" stroke-width="3"/>' + txt(bx(newIdx) + 17, y + 23, newLabel, 11, C.hw, ' font-weight="700"'));
      return g;
    }
    var YI = 58, YIT = 112, YD = 196, YDR = 250;
    s += row(YI, "inode bitmap", "블록 1 (i)", ibits, C.bmL, C.bm, 4, 3.3);
    s += blocks(YIT, "inode table", "블록 3~7 (I)", C.IL, C.I, "", ibits, 4, 3.9, "새 4");
    s += row(YD, "data bitmap", "블록 2 (d)", dbits, C.bmL, C.bm, 2, 6.7);
    s += blocks(YDR, "data region", "블록 8~63 (D)", C.DL, C.Dg, "", dbits, 2, 7.3, "내용");

    // 훑는 화살표 (▼)
    function scanner(y, idxs, t0, step, tEnd) {
      var g = '<g opacity="0"><path d="M-8,12 L8,12 L0,0 Z" fill="' + C.hw + '"/>';
      var v = (bx(idxs[0]) + 17) + ' ' + y + ';' + (bx(idxs[0]) + 17) + ' ' + y, kt = '0;' + k(t0);
      idxs.forEach(function (i, n) { if (n > 0) { v += ';' + (bx(i) + 17) + ' ' + y; kt += ';' + k(t0 + n * step); } });
      v += ';' + (bx(idxs[idxs.length - 1]) + 17) + ' ' + y; kt += ';1';
      g += '<animateTransform attributeName="transform" type="translate" calcMode="discrete" values="' + v + '" keyTimes="' + kt + '" dur="' + D + 's" fill="freeze"/>' + show(t0, tEnd) + '</g>';
      return g;
    }
    // 비트 칸 바로 아래에서 위를 가리킨다
    s += scanner(YI + 32, [0, 1, 2, 3, 4], 1.2, 0.45, 4.6);
    s += scanner(YD + 32, [0, 1, 2], 4.8, 0.6, 8.2);
    // 판정 표시
    s += win(1.2, 3.2, txt(bx(8), YI + 52 - 4, "1 이면 사용 중 → 다음 비트", 12, C.hw, ' text-anchor="start"'));
    s += win(4.8, 6.6, txt(bx(8), YD + 52 - 4, "1 이면 사용 중 → 다음 비트", 12, C.hw, ' text-anchor="start"'));

    // inode 3 → data block 2 포인터
    s += on(8.3, '<path d="M' + (bx(4) + 17) + ',' + (YIT + 38) + ' C' + (bx(4) + 17) + ',' + (YIT + 150) + ' ' + (bx(2) + 17) + ',' + (YDR - 70) + ' ' + (bx(2) + 17) + ',' + (YDR - 2) + '" fill="none" stroke="' + C.hw + '" stroke-width="2.5" stroke-dasharray="6 4" marker-end="url(#ba_arrow)"/>');
    s += on(8.5, '<rect x="' + (bx(5) + 4) + '" y="' + (YIT + 44) + '" width="250" height="24" rx="5" fill="#fff" stroke="' + C.hw + '"/>' + txt(bx(5) + 16, YIT + 61, "inode 4: block pointer = 2", 13, C.hw, ' text-anchor="start" font-weight="700" font-family="monospace"'));
    // I/O 표
    s += on(10, '<rect x="150" y="300" width="570" height="34" rx="6" fill="#efe9f6" stroke="#3b2f4a"/>' +
      txt(435, 322, "바뀐 블록: inode bitmap · inode · data bitmap · data → 모두 디스크에 다시 써야 한다", 13, "#3b2f4a", ' font-weight="700"'));

    s += txt(380, 360, "칸 크기가 고정(inode 256 B, 블록 4 KB)이라 비트 하나로 충분하다", 13, C.muted);
    return s + '</svg>';
  }
};
