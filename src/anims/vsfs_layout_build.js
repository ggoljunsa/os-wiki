// vsfs_layout_build — 20강 p.3~8: 블록 64 개짜리 디스크에 vsfs 배치를 슬라이드 순서대로 채운다.
//   D(8~63) → I(3~7, 256 B inode 16 개씩 = 80 개) → i(1)·d(2) bitmap → S(0) → mount 는 S 부터 읽는다.
window.ANIMS = window.ANIMS || {};
ANIMS["vsfs_layout_build"] = {
  title: "vsfs 디스크 배치를 한 칸씩: D → I → i·d → S",
  desc: "[[vsfs 디스크 배치]] p.3~8 의 순서 그대로. 블록 64 개 가운데 56 개가 data, 5 개가 inode table, 3 개가 관리용이다.",
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
    var C = { S: ["#3b2f4a", "#d9cdea"], bm: ["#a0620a", "#fdeec2"], I: ["#1d65b3", "#cfe0f5"], D: ["#1d6b2a", "#d6f0dc"], hw: "#d6465f", muted: "#777" };
    var X0 = 34, Y0 = 56, CW = 44, CH = 30;
    function cell(n) { return { x: X0 + (n % 8) * CW, y: Y0 + Math.floor(n / 8) * CH }; }
    function paint(n, kind, letter, t) {
      var c = cell(n), col = C[kind];
      return on(t, '<rect x="' + (c.x + 1) + '" y="' + (c.y + 1) + '" width="' + (CW - 2) + '" height="' + (CH - 2) + '" fill="' + col[1] + '" stroke="' + col[0] + '"/>' + txt(c.x + CW / 2, c.y + 21, letter, 15, col[0], ' font-weight="700"'));
    }
    var s = '<svg viewBox="0 0 760 360" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="vsfs 디스크 배치 만들기">';
    var caps = [
      [0, 1.2, "p.3: 디스크를 4 KB 블록으로 자른다. 예제는 블록 64 개 (0~63)"],
      [1.2, 3.6, "p.4: 대부분은 사용자 데이터를 담는 data region (D)"],
      [3.6, 6.2, "p.5: inode 를 모아 두는 inode table (I), 블록 3~7"],
      [6.2, 8.6, "p.6~7: 빈 칸 장부 bitmap. 블록 1 = inode bitmap(i), 블록 2 = data bitmap(d)"],
      [8.6, 10.6, "p.8: 맨 앞 블록 0 은 superblock (S)"],
      [10.6, 13.99, "mount 할 때 OS 는 S 부터 읽는다. 나머지를 어떻게 읽을지 거기 적혀 있다"]
    ];
    caps.forEach(function (c) { s += win(c[0], c[1], txt(380, 26, c[2], 15, "#222", ' font-weight="700"')); });

    // 빈 격자 + 번호
    for (var n = 0; n < 64; n++) {
      var c = cell(n);
      s += '<rect x="' + c.x + '" y="' + c.y + '" width="' + CW + '" height="' + CH + '" fill="#fff" stroke="#bbb"/>';
    }
    for (var r = 0; r < 8; r++) s += txt(X0 - 6, Y0 + r * CH + 19, "" + r * 8, 10, C.muted, ' text-anchor="end"');
    s += txt(X0 + 4 * CW, Y0 + 8 * CH + 18, "한 줄 = 블록 8 개 = 32 KB", 12, C.muted);
    // 칠하기
    for (n = 8; n < 64; n++) s += paint(n, "D", "D", 1.3 + (Math.floor(n / 8) - 1) * 0.3 + (n % 8) * 0.03);
    for (n = 3; n < 8; n++) s += paint(n, "I", "I", 3.8 + (n - 3) * 0.2);
    s += paint(1, "bm", "i", 6.4) + paint(2, "bm", "d", 6.9);
    s += paint(0, "S", "S", 8.8);

    // ===== 오른쪽 설명 =====
    var RX = 420;
    s += win(0, 1.2, txt(RX, 90, "블록 하나 = 4 KB = sector 8 개", 15, "#222", ' text-anchor="start"') + txt(RX, 118, "paging 의 page 크기와 맞췄다", 13, C.muted, ' text-anchor="start"'));
    s += win(1.2, 3.6, txt(RX, 90, "Data region: 블록 8~63", 16, C.D[0], ' text-anchor="start" font-weight="700"') +
      txt(RX, 120, "56 블록. 파일 내용과 디렉터리 내용이 여기 들어간다", 13, "#333", ' text-anchor="start"') +
      txt(RX, 146, "그런데 어느 블록이 누구 것인지는 어디에 적나?", 13, C.hw, ' text-anchor="start" font-weight="700"'));
    // inode table 확대
    var it = '<g>' + txt(RX, 84, "Inode table: 블록 3~7", 16, C.I[0], ' text-anchor="start" font-weight="700"') + txt(RX, 108, "블록 하나 확대: 256 B inode 가 16 개", 13, "#333", ' text-anchor="start"');
    for (var q = 0; q < 16; q++) {
      var qx = RX + (q % 8) * 38, qy = 118 + Math.floor(q / 8) * 30;
      it += '<rect x="' + qx + '" y="' + qy + '" width="36" height="26" fill="' + C.I[1] + '" stroke="' + C.I[0] + '"/>' + txt(qx + 18, qy + 18, "" + q, 11, C.I[0]);
    }
    it += txt(RX, 204, "4096 / 256 = 16 개, 5 블록 × 16 = 80 개", 14, "#222", ' text-anchor="start" font-weight="700"');
    it += txt(RX, 228, "→ 이 디스크에 파일+디렉터리는 80 개까지", 13, C.muted, ' text-anchor="start"') + '</g>';
    s += win(3.6, 6.2, it);
    // bitmap
    var bm = txt(RX, 84, "Bitmap: 비트 하나 = 칸 하나", 16, C.bm[0], ' text-anchor="start" font-weight="700"') + txt(RX, 108, "0 = 빈 칸, 1 = 사용 중", 13, "#333", ' text-anchor="start"');
    var ib = [1, 1, 0, 1, 0, 0, 0, 0], db = [1, 0, 1, 0, 0, 0, 0, 0];
    bm += txt(RX, 138, "i:", 14, C.bm[0], ' text-anchor="start" font-weight="700"') + txt(RX, 172, "d:", 14, C.bm[0], ' text-anchor="start" font-weight="700"');
    for (q = 0; q < 8; q++) {
      bm += '<rect x="' + (RX + 24 + q * 28) + '" y="120" width="26" height="26" fill="' + (ib[q] ? "#fbd9a6" : "#fff") + '" stroke="#a0620a"/>' + txt(RX + 37 + q * 28, 139, "" + ib[q], 13, "#333");
      bm += '<rect x="' + (RX + 24 + q * 28) + '" y="154" width="26" height="26" fill="' + (db[q] ? "#fbd9a6" : "#fff") + '" stroke="#a0620a"/>' + txt(RX + 37 + q * 28, 173, "" + db[q], 13, "#333");
    }
    bm += txt(RX, 206, "i 의 k 번째 비트 → inode k", 13, "#333", ' text-anchor="start"') + txt(RX, 228, "d 의 k 번째 비트 → data region 의 k 번째 블록", 13, "#333", ' text-anchor="start"');
    s += win(6.2, 8.6, bm);
    // superblock
    var sb = txt(RX, 84, "Superblock: 블록 0", 16, C.S[0], ' text-anchor="start" font-weight="700"');
    sb += '<rect x="' + RX + '" y="98" width="300" height="104" rx="6" fill="' + C.S[1] + '" stroke="' + C.S[0] + '"/>';
    ["inode 수: 80", "inode table 시작: 블록 3", "data region 시작: 블록 8", "블록 크기: 4 KB …"].forEach(function (l, i) {
      sb += txt(RX + 14, 122 + i * 22, l, 13, "#222", ' text-anchor="start" font-family="monospace"');
    });
    s += on(8.6, sb);
    // mount 화살표
    var s0 = cell(0), s3 = cell(3), s8 = cell(8);
    s += win(10.6, 13.99, '<rect x="' + (s0.x - 2) + '" y="' + (s0.y - 2) + '" width="' + (CW + 4) + '" height="' + (CH + 4) + '" fill="none" stroke="' + C.hw + '" stroke-width="3"/>');
    s += on(10.6, txt(RX, 232, "① mount: 블록 0 을 먼저 읽는다", 14, C.hw, ' text-anchor="start" font-weight="700"'));
    s += on(11.4, txt(RX, 256, "② 그 값으로 I 와 D 의 위치를 안다", 14, C.hw, ' text-anchor="start" font-weight="700"'));
    s += on(11.4, '<path d="M' + (s0.x + CW / 2) + ',' + (s0.y - 4) + ' C' + (s0.x + CW / 2) + ',' + (s0.y - 22) + ' ' + (s3.x + CW / 2) + ',' + (s3.y - 22) + ' ' + (s3.x + CW / 2) + ',' + (s3.y - 2) + '" fill="none" stroke="' + C.hw + '" stroke-width="2.5"/>');
    s += on(11.8, '<rect x="' + (s3.x - 1) + '" y="' + (s3.y - 1) + '" width="' + (5 * CW + 2) + '" height="' + (CH + 2) + '" fill="none" stroke="' + C.hw + '" stroke-width="3" stroke-dasharray="6 4"/>' + '<rect x="' + (s8.x - 1) + '" y="' + (s8.y - 1) + '" width="' + (8 * CW + 2) + '" height="' + (7 * CH + 2) + '" fill="none" stroke="' + C.hw + '" stroke-width="3" stroke-dasharray="6 4"/>');

    s += txt(380, 350, "S · i · d · I×5 · D×56. 관리용 3 블록 + inode table 5 블록, 나머지는 전부 data 다", 13, C.muted);
    return s + '</svg>';
  }
};
