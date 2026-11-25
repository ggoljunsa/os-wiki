// dir_entry_scan — 20강 p.18: 디렉터리 dir 의 data block 은 (inode #, 이름 길이, 이름) 엔트리를 길이만큼만 이어 적은 것이다.
//   lookup("foobar") 는 첫 엔트리부터 길이를 보고 다음으로 건너뛰며 차례로 비교한다 → inode 24.
//   대비: 이름 칸을 256 B 로 고정하면 4 KB 블록에 16 개뿐 (11/23 수업).
window.ANIMS = window.ANIMS || {};
ANIMS["dir_entry_scan"] = {
  title: "디렉터리 블록에서 이름 찾기: 처음부터 차례로",
  desc: "[[디렉터리 구성]] p.18 표(5 ., 2 .., 12 foo, 13 bar, 24 foobar)를 디스크에 놓인 모양대로 펴고 foobar 를 찾는다.",
  duration: 13,
  build: function () {
    var D = 13;
    function r3(v) { return Math.round(v * 1000) / 1000; }
    function k(t) { return r3(Math.min(Math.max(t / D, 0), 0.996)); }
    function show(a, b) { return '<animate attributeName="opacity" values="0;0;1;1;0;0" keyTimes="0;' + k(a) + ';' + r3(k(a) + 0.003) + ';' + k(b) + ';' + r3(k(b) + 0.003) + ';1" dur="' + D + 's" fill="freeze"/>'; }
    function from(a) { return '<animate attributeName="opacity" values="0;0;1;1" keyTimes="0;' + k(a) + ';' + r3(k(a) + 0.003) + ';1" dur="' + D + 's" fill="freeze"/>'; }
    function txt(x, y, s, size, fill, extra) { return '<text x="' + x + '" y="' + y + '" font-size="' + size + '" fill="' + fill + '"' + (extra && extra.indexOf('text-anchor') >= 0 ? '' : ' text-anchor="middle"') + (extra || '') + '>' + s + '</text>'; }
    function win(a, b, inner) { return '<g opacity="0">' + inner + show(a, b) + '</g>'; }
    function on(a, inner) { return '<g opacity="0">' + inner + from(a) + '</g>'; }
    var C = { a: "#1d65b3", aL: "#dbe8f7", ln: "#e09a40", lnL: "#fdeec2", ok: "#2e9e4f", okL: "#dff3e4", hw: "#d6465f", muted: "#777", cpu: "#3b2f4a" };
    var E = [[5, 2, "."], [2, 3, ".."], [12, 4, "foo"], [13, 4, "bar"], [24, 7, "foobar"]];
    var IW = 40, LW = 32, BW = 14, Y = 92, H = 40, x = 25, pos = [];
    E.forEach(function (e) { var w = IW + LW + e[1] * BW + 8; pos.push([x, w]); x += w; });
    var s = '<svg viewBox="0 0 760 370" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="디렉터리 엔트리 탐색">';
    s += '<defs><marker id="de_arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="' + C.ln + '"/></marker></defs>';
    var caps = [
      [0, 1.2, "dir 의 data block: 엔트리를 이름 길이만큼만 이어 적었다"],
      [1.2, 8.4, "lookup(“foobar”): 첫 엔트리부터 이름을 비교하고, 길이만큼 건너뛰어 다음으로"],
      [8.4, 9.8, "다섯 번째에서 찾았다. foobar 의 inode 번호는 24"],
      [9.8, 12.99, "이름 칸을 256 B 로 고정하면 k 번째로 바로 가지만, 4 KB 에 16 개뿐이다"]
    ];
    caps.forEach(function (c) { s += win(c[0], c[1], txt(380, 26, c[2], 15, "#222", ' font-weight="700"')); });

    s += txt(25, 64, "On-disk data for dir (4 KB 블록의 앞부분)", 13, C.muted, ' text-anchor="start"');
    s += txt(25, 82, "칸: inode # · 이름 길이(NUL 포함) · 이름", 12, C.muted, ' text-anchor="start"');
    E.forEach(function (e, i) {
      var x0 = pos[i][0], w = pos[i][1];
      s += '<rect x="' + x0 + '" y="' + Y + '" width="' + w + '" height="' + H + '" fill="#fff" stroke="#555" stroke-width="2"/>';
      s += '<rect x="' + x0 + '" y="' + Y + '" width="' + IW + '" height="' + H + '" fill="' + C.aL + '" stroke="#999"/>' + txt(x0 + IW / 2, Y + 26, "" + e[0], 15, C.a, ' font-weight="700"');
      s += '<rect x="' + (x0 + IW) + '" y="' + Y + '" width="' + LW + '" height="' + H + '" fill="' + C.lnL + '" stroke="#999"/>' + txt(x0 + IW + LW / 2, Y + 26, "" + e[1], 15, "#8a6000", ' font-weight="700"');
      for (var b = 0; b < e[1]; b++) {
        var cx = x0 + IW + LW + 4 + b * BW, ch = b < e[2].length ? e[2][b] : "\\0";
        s += '<rect x="' + cx + '" y="' + (Y + 8) + '" width="' + (BW - 1) + '" height="24" fill="#f7f7f7" stroke="#ddd"/>' + txt(cx + BW / 2 - 0.5, Y + 25, ch, ch === "\\0" ? 8 : 13, ch === "\\0" ? "#aaa" : "#222", ' font-family="monospace" font-weight="700"');
      }
    });
    // 커서: 엔트리마다 1.4초
    var T0 = 1.4, ST = 1.4;
    E.forEach(function (e, i) {
      var x0 = pos[i][0], w = pos[i][1], a = T0 + i * ST, hit = e[2] === "foobar";
      s += hl(x0, w, a, hit ? 12.99 : a + ST - 0.2, hit ? C.ok : C.hw);
      s += win(a + 0.3, hit ? 9.8 : a + ST, txt(x0 + w / 2, Y + 66, "“" + e[2] + "” " + (hit ? "= foobar ✓" : "≠ ✗"), 13, hit ? C.ok : C.hw, ' font-weight="700"'));
      if (!hit) {
        var nx = pos[i + 1][0];
        s += win(a + 0.6, a + ST, '<path d="M' + (x0 + IW + LW / 2) + ',' + (Y - 4) + ' C' + (x0 + IW + LW / 2) + ',' + (Y - 30) + ' ' + (nx + 10) + ',' + (Y - 30) + ' ' + (nx + 10) + ',' + (Y - 4) + '" fill="none" stroke="' + C.ln + '" stroke-width="2.5" marker-end="url(#de_arrow)"/>');
      }
    });
    function hl(x0, w, a, b, col) { return win(a, b, '<rect x="' + (x0 - 2) + '" y="' + (Y - 2) + '" width="' + (w + 4) + '" height="' + (H + 4) + '" fill="none" stroke="' + col + '" stroke-width="4"/>'); }
    s += win(1.6, 8.4, txt(380, 188, "길이 칸(주황)을 읽어야 다음 엔트리가 어디서 시작하는지 안다", 13, "#8a6000", ' font-weight="700"'));
    s += on(8.4, '<rect x="220" y="170" width="320" height="34" rx="6" fill="' + C.okL + '" stroke="' + C.ok + '" stroke-width="2"/>' + txt(380, 193, "foobar → inode 24 (비교 5 번)", 15, C.ok, ' font-weight="700"'));

    // ===== 고정 크기와 비교 =====
    s += on(9.8, txt(25, 236, "이름 칸을 256 B 로 고정하면 (4 KB 블록 하나)", 13, C.cpu, ' text-anchor="start" font-weight="700"'));
    var fixed = ".|..|foo|bar|foobar".split("|");
    for (var i = 0; i < 16; i++) {
      var fx = 25 + i * 44;
      s += on(9.9 + i * 0.05, '<rect x="' + fx + '" y="246" width="42" height="40" fill="#fff" stroke="#555"/>' +
        (i < 5 ? '<rect x="' + fx + '" y="246" width="' + Math.max(6, fixed[i].length * 6 + 4) + '" height="40" fill="' + C.aL + '"/>' + txt(fx + 21, 271, fixed[i], 11, C.a, ' font-family="monospace" font-weight="700"') : ''));
    }
    s += on(10.8, txt(380, 306, "엔트리 16 개로 블록이 꽉 찬다. 칸 대부분이 빈 공간이다 (4096 / 256 = 16)", 13, C.hw, ' font-weight="700"'));
    s += on(11.4, txt(380, 330, "그래서 실제로는 길이를 적고 이어 붙인다. 공간은 아끼고, 찾기는 처음부터 차례로 한다", 13, "#222"));

    s += txt(380, 358, "“the directory organization is optimized for the size, not for the speed” (11/23 수업)", 12.5, C.muted);
    return s + '</svg>';
  }
};
