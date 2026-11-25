// ffs_placement — 21강 p.9~12: 같은 7 개(/, /a, /b, /a/c, /a/d, /a/e, /b/f)를 FFS 정책(p.10)과 "inode 를 고르게 흩기"(p.12)로 배치.
//   그다음 /a/c → /a/d → /a/e 를 차례로 열면 FFS 는 그룹 1 하나, 흩는 쪽은 그룹 3·4·5 를 오간다.
window.ANIMS = window.ANIMS || {};
ANIMS["ffs_placement"] = {
  title: "FFS 배치 정책: 같은 디렉터리의 파일은 같은 그룹에",
  desc: "[[FFS 배치 정책]] p.10 과 p.12 의 표를 한 글자씩 채운다. 그룹마다 inode 10 개, 데이터 블록 10 개. 디렉터리는 1 블록, 파일은 2 블록.",
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
    var FCOL = { "/": "#3b2f4a", a: "#1d65b3", c: "#1d65b3", d: "#1d65b3", e: "#1d65b3", b: "#2e9e4f", f: "#2e9e4f" };
    var FBG = { "/": "#e3dced", a: "#cfe0f5", c: "#dbe8f7", d: "#dbe8f7", e: "#dbe8f7", b: "#cdeed5", f: "#dff3e4" };
    var T = { "/": 1.0, a: 1.6, b: 2.2, c: 2.8, d: 3.4, e: 4.0, f: 4.6 };
    var CWD = 13, RH = 22, Y0 = 102;
    // [이름, 그룹, inode 칸, data 시작 칸, data 블록 수]
    var FFS = [["/", 0, 0, 0, 1], ["a", 1, 0, 0, 1], ["c", 1, 1, 1, 2], ["d", 1, 2, 3, 2], ["e", 1, 3, 5, 2], ["b", 2, 0, 0, 1], ["f", 2, 1, 1, 2]];
    var SPR = [["/", 0, 0, 0, 1], ["a", 1, 0, 0, 1], ["b", 2, 0, 0, 1], ["c", 3, 0, 0, 2], ["d", 4, 0, 0, 2], ["e", 5, 0, 0, 2], ["f", 6, 0, 0, 2]];
    function table(x0, title, sub, items, col) {
      var g = txt(x0 + 160, 58, title, 15, col, ' font-weight="700"') + txt(x0 + 160, 76, sub, 11, "#777");
      var ix = x0 + 30, dx = x0 + 30 + 10 * CWD + 14;
      g += txt(ix + 5 * CWD, Y0 - 6, "inodes", 11, "#777") + txt(dx + 5 * CWD, Y0 - 6, "data", 11, "#777");
      for (var r = 0; r < 8; r++) {
        var y = Y0 + r * RH;
        g += txt(x0 + 14, y + 16, "" + r, 12, "#777");
        for (var c = 0; c < 10; c++) {
          g += '<rect x="' + (ix + c * CWD) + '" y="' + y + '" width="' + CWD + '" height="' + RH + '" fill="#fff" stroke="#e2e2e2"/>';
          g += '<rect x="' + (dx + c * CWD) + '" y="' + y + '" width="' + CWD + '" height="' + RH + '" fill="#fff" stroke="#e2e2e2"/>';
        }
      }
      items.forEach(function (it) {
        var n = it[0], y = Y0 + it[1] * RH, t = T[n], cell = '';
        cell += '<rect x="' + (ix + it[2] * CWD) + '" y="' + y + '" width="' + CWD + '" height="' + RH + '" fill="' + FBG[n] + '" stroke="' + FCOL[n] + '"/>' + txt(ix + it[2] * CWD + CWD / 2, y + 16, n, 13, FCOL[n], ' font-weight="700" font-family="monospace"');
        for (var b = 0; b < it[4]; b++) {
          var xx = dx + (it[3] + b) * CWD;
          cell += '<rect x="' + xx + '" y="' + y + '" width="' + CWD + '" height="' + RH + '" fill="' + FBG[n] + '" stroke="' + FCOL[n] + '"/>' + txt(xx + CWD / 2, y + 16, n, 13, FCOL[n], ' font-weight="700" font-family="monospace"');
        }
        g += on(t, cell);
      });
      return { g: g, ix: ix, dx: dx };
    }
    var s = '<svg viewBox="0 0 760 380" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="FFS 배치 정책 비교">';
    var caps = [
      [0, 1, "같은 디렉터리 3 개와 파일 4 개를 두 정책으로 배치한다"],
      [1, 5.4, "FFS: /a 와 /b 는 다른 그룹으로 퍼뜨리고, 그 안의 파일은 디렉터리 그룹에 모은다"],
      [5.4, 10.4, "/a/c → /a/d → /a/e 를 차례로 연다"],
      [10.4, 13.99, "“Name-based locality”: FFS 는 그룹 하나, 흩어 놓으면 그룹 셋을 오간다"]
    ];
    caps.forEach(function (c) { s += win(c[0], c[1], txt(380, 26, c[2], c[2].length > 46 ? 13.5 : 15, "#222", ' font-weight="700"')); });
    var L = table(20, "FFS (p.10)", "디렉터리는 퍼뜨리고, 파일은 디렉터리 곁에", FFS, "#1d65b3");
    var R = table(400, "inode 를 그룹마다 고르게 (p.12)", "어느 그룹도 빨리 차지 않게 흩는다", SPR, "#d6465f");
    s += L.g + R.g;
    s += '<line x1="388" y1="44" x2="388" y2="282" stroke="#ccc" stroke-dasharray="4 4"/>';

    // 차례로 열기: 행 강조 + 방문 그룹 수
    var opens = [["c", 6.0], ["d", 7.4], ["e", 8.8]];
    function rowBox(x0, ix, row, a, b, col) { return win(a, b, '<rect x="' + (x0 + 4) + '" y="' + (Y0 + row * RH - 1) + '" width="' + (ix - x0 + 20 * CWD + 14) + '" height="' + (RH + 2) + '" fill="none" stroke="' + col + '" stroke-width="3"/>'); }
    opens.forEach(function (o, i) {
      var ffsRow = 1, sprRow = 3 + i, end = i < 2 ? opens[i + 1][1] : 10.4;
      s += rowBox(20, L.ix, ffsRow, o[1], end, "#e09a40");
      s += rowBox(400, R.ix, sprRow, o[1], end, "#e09a40");
    });
    // head 표시: 오른쪽은 행이 바뀔 때마다 이동
    s += win(5.4, 13.99, txt(200, 296, "연 파일: /a/c, /a/d, /a/e", 13, "#222", ' font-weight="700"') + txt(580, 296, "연 파일: /a/c, /a/d, /a/e", 13, "#222", ' font-weight="700"'));
    s += on(6.0, txt(200, 320, "그룹 1 → 1 → 1", 16, "#1d65b3", ' font-weight="700"'));
    s += on(6.0, txt(536, 320, "그룹 3", 16, "#d6465f", ' font-weight="700"'));
    s += on(7.4, txt(590, 320, "→ 4", 16, "#d6465f", ' font-weight="700"'));
    s += on(8.8, txt(640, 320, "→ 5", 16, "#d6465f", ' font-weight="700"'));
    s += on(10.4, txt(200, 344, "seek 없이 이웃 블록", 13, "#1d65b3", ' font-weight="700"') + txt(580, 344, "그룹 사이를 seek", 13, "#d6465f", ' font-weight="700"'));

    s += txt(380, 372, "정책 1: 디렉터리는 디렉터리가 적고 빈 inode 가 많은 그룹에. 정책 2: 파일은 자기 inode·디렉터리와 같은 그룹에", 12, "#777");
    return s + '</svg>';
  }
};
