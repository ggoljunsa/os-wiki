// indirect_walk — 20강 p.14~17: p.17 그림의 inode 하나로 파일 블록 0 / 12 / 1036 을 찾아간다.
//   블록 0: inode → 27 (읽기 2) · 블록 12: inode → 72 → 100 (읽기 3) · 블록 1036: inode → 3942 → 104 → 1034 (읽기 4).
window.ANIMS = window.ANIMS || {};
ANIMS["indirect_walk"] = {
  title: "direct · indirect · double indirect 포인터 따라가기",
  desc: "[[multi-level index]] p.17 의 번호 그대로. 단계가 하나 늘 때마다 디스크 읽기가 하나 는다 (캐시가 비어 있을 때).",
  duration: 15,
  build: function () {
    var D = 15;
    function r3(v) { return Math.round(v * 1000) / 1000; }
    function k(t) { return r3(Math.min(Math.max(t / D, 0), 0.996)); }
    function show(a, b) { return '<animate attributeName="opacity" values="0;0;1;1;0;0" keyTimes="0;' + k(a) + ';' + r3(k(a) + 0.003) + ';' + k(b) + ';' + r3(k(b) + 0.003) + ';1" dur="' + D + 's" fill="freeze"/>'; }
    function from(a) { return '<animate attributeName="opacity" values="0;0;1;1" keyTimes="0;' + k(a) + ';' + r3(k(a) + 0.003) + ';1" dur="' + D + 's" fill="freeze"/>'; }
    function txt(x, y, s, size, fill, extra) { return '<text x="' + x + '" y="' + y + '" font-size="' + size + '" fill="' + fill + '"' + (extra && extra.indexOf('text-anchor') >= 0 ? '' : ' text-anchor="middle"') + (extra || '') + '>' + s + '</text>'; }
    function win(a, b, inner) { return '<g opacity="0">' + inner + show(a, b) + '</g>'; }
    function on(a, inner) { return '<g opacity="0">' + inner + from(a) + '</g>'; }
    var C = { g: "#3f9b2e", gL: "#c8ecb6", o: "#e09a40", oL: "#ffd58a", p: "#5b5bbf", pL: "#c9c9f2", hw: "#d6465f", cpu: "#3b2f4a", muted: "#777" };
    var s = '<svg viewBox="0 0 760 380" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="multi-level index 포인터 따라가기">';
    var caps = [
      [0, 1.2, "inode 하나에 direct(27), indirect(72), double indirect(3942) 포인터가 함께 있다"],
      [1.2, 4.6, "파일 블록 0: direct 포인터 27 이 바로 데이터 블록이다"],
      [4.6, 9.2, "파일 블록 12: indirect 포인터 72 → 블록 72 의 첫 칸 100 → 데이터"],
      [9.2, 13.8, "파일 블록 1036: 3942 → 블록 3942 의 첫 칸 104 → 블록 104 의 첫 칸 1034 → 데이터"],
      [13.8, 14.99, "디스크 읽기 2 → 3 → 4 번. “Uncached index blocks require extra disk reads”"]
    ];
    caps.forEach(function (c) { s += win(c[0], c[1], txt(380, 26, c[2], c[2].length > 46 ? 13.5 : 15, "#222", ' font-weight="700"')); });

    // ===== inode =====
    var IX = 40, IW = 150, SH = 24;
    s += '<rect x="' + IX + '" y="50" width="' + IW + '" height="92" fill="#fff" stroke="#555"/>';
    ["Last modified time", "Last access time", "File size", "Permission", "Link count"].forEach(function (l, i) { s += txt(IX + IW / 2, 66 + i * 16, l, 11, "#333"); });
    var slots = [["27", C.gL], ["…", "#fff"], ["…", "#fff"], ["…", "#fff"], ["…", "#fff"], ["…", "#fff"], ["72", C.oL], ["3942", C.pL]];
    slots.forEach(function (sl, i) {
      var y = 142 + i * SH;
      s += '<rect x="' + IX + '" y="' + y + '" width="' + IW + '" height="' + SH + '" fill="' + sl[1] + '" stroke="#555"/>' + txt(IX + IW / 2, y + 17, sl[0], 13, "#222");
    });
    function slotY(i) { return 142 + i * SH + SH / 2; }
    s += txt(IX + IW / 2, 142 + 8 * SH + 18, "inode", 13, C.muted, ' font-weight="700"');
    // ===== 블록 72, 3942, 104 =====
    function iblock(x, y, num, vals, light, color) {
      var g = txt(x + 45, y - 6, "블록 " + num, 13, color, ' font-weight="700"');
      vals.forEach(function (v, i) { g += '<rect x="' + x + '" y="' + (y + i * 24) + '" width="90" height="24" fill="' + light + '" stroke="#555"/>' + txt(x + 45, y + i * 24 + 17, v, 13, "#222"); });
      return g;
    }
    var B72 = [270, 150], B3942 = [270, 262], B104 = [420, 262];
    s += iblock(B72[0], B72[1], "72", ["100", "101", "…"], C.oL, "#a0620a");
    s += iblock(B3942[0], B3942[1], "3942", ["104", "131", "…"], C.pL, C.p);
    s += iblock(B104[0], B104[1], "104", ["1034", "94133", "…"], C.pL, C.p);
    // ===== 데이터 블록 =====
    function dblock(x, y, num) { return '<rect x="' + x + '" y="' + y + '" width="64" height="40" rx="3" fill="' + C.gL + '" stroke="' + C.g + '" stroke-width="2"/>' + txt(x + 32, y + 25, num, 14, "#1d6b2a", ' font-weight="700"'); }
    s += dblock(300, 66, "27") + dblock(420, 150, "100") + dblock(560, 262, "1034");
    s += txt(332, 60, "data", 11, C.muted) + txt(452, 144, "data", 11, C.muted) + txt(592, 256, "data", 11, C.muted);
    // 연결선 (항상 보이는 얇은 선)
    function line(x1, y1, x2, y2, col) { return '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '" stroke="' + col + '" stroke-width="1.5" opacity="0.5"/>'; }
    s += line(IX + IW, slotY(0), 300, 86, C.g);
    s += line(IX + IW, slotY(6), B72[0], B72[1] + 12, C.o) + line(B72[0] + 90, B72[1] + 12, 420, 170, C.o);
    s += line(IX + IW, slotY(7), B3942[0], B3942[1] + 12, C.p) + line(B3942[0] + 90, B3942[1] + 12, B104[0], B104[1] + 12, C.p) + line(B104[0] + 90, B104[1] + 12, 560, 282, C.p);

    // ===== 따라가는 토큰 =====
    function token(pts, t0, dt, col, tEnd) {
      return '<circle r="9" fill="' + col + '" stroke="#fff" stroke-width="2" opacity="0"><animateMotion begin="' + t0 + 's" dur="' + dt + 's" fill="freeze" path="M' + pts.join(' L') + '"/>' + show(t0, tEnd) + '</circle>';
    }
    s += token([(IX + 20) + ',100', (IX + 20) + ',' + slotY(0), (IX + IW) + ',' + slotY(0), '300,86', '332,86'], 1.4, 2.2, C.g, 4.6);
    s += token([(IX + 20) + ',100', (IX + 20) + ',' + slotY(6), (IX + IW) + ',' + slotY(6), B72[0] + ',' + (B72[1] + 12), (B72[0] + 90) + ',' + (B72[1] + 12), '420,170', '452,170'], 4.8, 3.6, C.o, 9.2);
    s += token([(IX + 20) + ',100', (IX + 20) + ',' + slotY(7), (IX + IW) + ',' + slotY(7), B3942[0] + ',' + (B3942[1] + 12), (B3942[0] + 90) + ',' + (B3942[1] + 12), B104[0] + ',' + (B104[1] + 12), (B104[0] + 90) + ',' + (B104[1] + 12), '560,282', '592,282'], 9.4, 4.0, C.p, 13.8);
    // 지나간 칸 강조
    function hl(x, y, w, h, col, a, b) { return win(a, b, '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" fill="none" stroke="' + col + '" stroke-width="3"/>'); }
    s += hl(IX, 142, IW, SH, C.hw, 1.8, 4.6);
    s += hl(IX, 142 + 6 * SH, IW, SH, C.hw, 5.2, 9.2) + hl(B72[0], B72[1], 90, 24, C.hw, 6.6, 9.2);
    s += hl(IX, 142 + 7 * SH, IW, SH, C.hw, 9.8, 13.8) + hl(B3942[0], B3942[1], 90, 24, C.hw, 11, 13.8) + hl(B104[0], B104[1], 90, 24, C.hw, 12, 13.8);

    // ===== 디스크 읽기 카운터 =====
    var PX = 560;
    s += '<rect x="' + PX + '" y="50" width="190" height="196" rx="8" fill="#efe9f6" stroke="' + C.cpu + '" stroke-width="2"/>';
    s += txt(PX + 95, 72, "디스크 읽기", 14, C.cpu, ' font-weight="700"');
    function reads(list, a, b, col, range) {
      var g = txt(PX + 95, 94, range, 12, col, ' font-weight="700"');
      list.forEach(function (it, i) {
        g += on(it[1], '<rect x="' + (PX + 14) + '" y="' + (104 + i * 26) + '" width="162" height="22" rx="4" fill="#fff" stroke="' + col + '"/>' + txt(PX + 95, 120 + i * 26, (i + 1) + ". " + it[0], 12, "#222"));
      });
      g += on(list[list.length - 1][1] + 0.2, txt(PX + 95, 236, list.length + " 번", 18, C.hw, ' font-weight="700"'));
      return win(a, b, g);
    }
    s += reads([["inode", 1.5], ["data 27", 3.4]], 1.2, 4.6, C.g, "블록 0 (0~11: direct)");
    s += reads([["inode", 4.9], ["indirect 블록 72", 6.6], ["data 100", 8.2]], 4.6, 9.2, "#a0620a", "블록 12 (12~1035: indirect)");
    s += reads([["inode", 9.5], ["double 블록 3942", 11], ["indirect 블록 104", 12], ["data 1034", 13.2]], 9.2, 14.99, C.p, "블록 1036 (1036~: double)");

    s += txt(380, 372, "단계가 늘수록 큰 파일을 담지만 접근은 느려진다. 그 손해는 메모리 캐시가 메운다", 13, C.muted);
    return s + '</svg>';
  }
};
