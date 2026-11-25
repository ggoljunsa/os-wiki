// perm_octal — 19강 p.12~13: 9 칸(user·group·others × r·w·x)에 1 1 1 / 1 0 1 / 0 0 1 을 넣고,
//   자리값 4·2·1 을 곱해 더해 751 을 만든 뒤, 같은 권한을 rwxr-x--x 와 ls -l 출력으로 읽는다.
window.ANIMS = window.ANIMS || {};
ANIMS["perm_octal"] = {
  title: "권한 9 칸을 8진수 세 자리로: rwxr-x--x = 751",
  desc: "[[권한 비트]] p.13 의 계산 그대로. 세 칸씩 끊어 r = 4, w = 2, x = 1 을 더한다.",
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
    var C = { u: "#1d65b3", uL: "#dbe8f7", g: "#2e9e4f", gL: "#dff3e4", o: "#e09a40", oL: "#fdeec2", hw: "#d6465f", muted: "#777" };
    var bits = [1, 1, 1, 1, 0, 1, 0, 0, 1], wt = [4, 2, 1], letters = ["r", "w", "x"];
    var groups = [["user", C.u, C.uL], ["group", C.g, C.gL], ["others", C.o, C.oL]];
    var CW = 62, GAP = 22, X0 = 380 - (9 * CW + 2 * GAP) / 2;
    function cx(i) { return X0 + i * CW + Math.floor(i / 3) * GAP + CW / 2; }
    var s = '<svg viewBox="0 0 760 360" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="권한 비트를 8진수로 바꾸기">';
    var caps = [
      [0, 1, "권한은 9 칸: user · group · others 가 각각 r · w · x"],
      [1, 3.4, "켜진 칸은 1, 꺼진 칸은 0. 이 파일은 111 101 001"],
      [3.4, 6.2, "칸마다 자리값: r = 4, w = 2, x = 1. 켜진 칸만 값이 남는다"],
      [6.2, 7.8, "세 칸씩 더하면 8진수 한 자리: 7, 5, 1 → 751"],
      [7.8, 9.6, "글자로 쓰면 1 은 그 칸의 글자, 0 은 - : rwxr-x--x"],
      [9.6, 11.99, "ls -l 에서 첫 글자(-)는 파일 종류, 그다음 9 글자가 이 권한이다"]
    ];
    caps.forEach(function (c) { s += win(c[0], c[1], txt(380, 26, c[2], 15, "#222", ' font-weight="700"')); });

    for (var gi = 0; gi < 3; gi++) {
      var gx0 = cx(gi * 3) - CW / 2, gw = CW * 3;
      s += '<rect x="' + gx0 + '" y="50" width="' + gw + '" height="28" rx="6" fill="' + groups[gi][2] + '" stroke="' + groups[gi][1] + '"/>';
      s += txt(gx0 + gw / 2, 70, groups[gi][0], 15, groups[gi][1], ' font-weight="700"');
    }
    for (var i = 0; i < 9; i++) {
      var x = cx(i), col = groups[Math.floor(i / 3)][1], tb = 1.2 + Math.floor(i / 3) * 0.7, tw = 3.6 + (i % 3) * 0.25 + Math.floor(i / 3) * 0.75;
      s += txt(x, 98, letters[i % 3], 15, C.muted, ' font-weight="700"');
      s += '<rect x="' + (x - CW / 2 + 3) + '" y="106" width="' + (CW - 6) + '" height="46" rx="6" fill="#fff" stroke="' + col + '" stroke-width="2"/>';
      // bit
      s += on(tb, txt(x, 138, "" + bits[i], 26, bits[i] ? "#222" : "#bbb", ' font-weight="700" font-family="monospace"'));
      // 자리값 × bit
      s += on(tw, txt(x, 180, "×" + wt[i % 3], 14, C.muted));
      s += on(tw + 0.35, txt(x, 208, "" + (bits[i] * wt[i % 3]), 20, bits[i] ? col : "#bbb", ' font-weight="700"'));
      // 글자
      s += on(7.9 + Math.floor(i / 3) * 0.4, '<rect x="' + (x - CW / 2 + 3) + '" y="106" width="' + (CW - 6) + '" height="46" rx="6" fill="' + (bits[i] ? groups[Math.floor(i / 3)][2] : "#f4f4f4") + '" stroke="' + col + '" stroke-width="2"/>' +
        txt(x, 138, bits[i] ? letters[i % 3] : "-", 26, bits[i] ? col : "#999", ' font-weight="700" font-family="monospace"'));
    }
    // 합
    var sums = [7, 5, 1];
    for (gi = 0; gi < 3; gi++) {
      var mid = cx(gi * 3 + 1);
      s += on(6.3 + gi * 0.3, '<line x1="' + (mid - 80) + '" y1="220" x2="' + (mid + 80) + '" y2="220" stroke="#999"/>' +
        txt(mid, 254, "" + sums[gi], 30, groups[gi][1], ' font-weight="700"'));
      s += on(6.3 + gi * 0.3, txt(mid - 54, 252, ["4+2+1", "4+0+1", "0+0+1"][gi], 12, C.muted));
    }
    s += on(7.3, '<rect x="300" y="268" width="160" height="40" rx="8" fill="#3b2f4a"/>' + txt(380, 296, "751", 26, "#fff", ' font-weight="700" font-family="monospace"'));
    // ls -l 출력
    s += on(9.7, '<rect x="300" y="268" width="160" height="40" fill="#fff"/>' + '<rect x="40" y="268" width="680" height="44" rx="6" fill="#f6f6f6" stroke="#ccc"/>' +
      '<text x="56" y="296" font-size="17" fill="#222" font-family="monospace">$ ls -l /bin/vi → <tspan fill="#999">-</tspan><tspan fill="' + C.u + '" font-weight="700">rwx</tspan><tspan fill="' + C.g + '" font-weight="700">r-x</tspan><tspan fill="' + C.o + '" font-weight="700">--x</tspan> … student dgist … /bin/vi</text>');
    s += on(9.9, txt(600, 330, "student = owner(user), dgist = group", 13, C.muted));

    s += txt(380, 352, "숫자 → 글자는 거꾸로: 6 = 4+2 = rw-, 5 = 4+1 = r-x, 4 = r--, 0 = ---", 13, C.muted);
    return s + '</svg>';
  }
};
