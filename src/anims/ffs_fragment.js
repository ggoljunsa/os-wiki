// ffs_fragment — 21강 p.4: 옛 Unix 파일 시스템의 문제 2. A1 A2 B1 B2 C1 C2 D1 D2 에서 B, D 를 지우고
//   E(4 블록)를 만들면 E1 E2 와 E3 E4 가 떨어져 놓여, E 를 읽을 때 C 를 건너뛰는 이동이 생긴다.
window.ANIMS = window.ANIMS || {};
ANIMS["ffs_fragment"] = {
  title: "조각난 빈 공간: 지우고 새로 만들면 파일이 흩어진다",
  desc: "[[Fast File System]] p.4 의 여덟 칸 그대로. B 와 D 를 지운 자리에 E 가 둘로 나뉘어 들어간다.",
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
    var FC = { A: ["#1d65b3", "#dbe8f7"], B: ["#2e9e4f", "#dff3e4"], C: ["#a0620a", "#fdeec2"], D: ["#5b5bbf", "#dcdcf2"], E: ["#d6465f", "#ffd9d9"] };
    var X0 = 100, W = 70, Y = 150, H = 56;
    function cx(i) { return X0 + i * W + W / 2; }
    function blk(i, name, col) { return '<rect x="' + (X0 + i * W + 2) + '" y="' + Y + '" width="' + (W - 4) + '" height="' + H + '" rx="4" fill="' + col[1] + '" stroke="' + col[0] + '" stroke-width="2"/>' + txt(cx(i), Y + 35, name, 18, col[0], ' font-weight="700"'); }
    var s = '<svg viewBox="0 0 760 340" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="빈 공간 단편화">';
    s += '<defs><marker id="ff_arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#d6465f"/></marker></defs>';
    var caps = [
      [0, 1.5, "파일 A, B, C, D 가 두 블록씩 나란히 있다"],
      [1.5, 3.2, "File B 와 D 를 지운다. 빈 칸이 두 군데로 떨어져 생긴다"],
      [3.2, 6, "File E(4 블록)를 만든다. 빈 칸을 앞에서부터 채우니 E 가 둘로 나뉜다"],
      [6, 10, "E 를 처음부터 읽으면 E2 다음에 C 를 건너뛰어 E3 로 가야 한다"],
      [10, 11.99, "디스크를 메모리처럼 다루면 파일이 흩어지고, 읽을 때마다 head 가 오간다"]
    ];
    caps.forEach(function (c) { s += win(c[0], c[1], txt(380, 26, c[2], 15, "#222", ' font-weight="700"')); });

    s += win(0, 6, txt(380, 120, "디스크 블록 (왼쪽 → 오른쪽이 이웃한 블록)", 12, "#777"));
    for (var i = 0; i < 8; i++) s += '<rect x="' + (X0 + i * W) + '" y="' + (Y - 4) + '" width="' + W + '" height="' + (H + 8) + '" fill="#f4f4f4" stroke="#ccc"/>';
    var names = ["A1", "A2", "B1", "B2", "C1", "C2", "D1", "D2"];
    names.forEach(function (n, i) {
      var f = n.charAt(0), b = blk(i, n, FC[f]);
      if (f === "B" || f === "D") s += '<g>' + b + '<animate attributeName="opacity" values="1;1;0;0" keyTimes="0;' + k(1.6) + ';' + k(2.4) + ';1" dur="' + D + 's" fill="freeze"/></g>';
      else s += b;
    });
    s += win(2.4, 3.6, txt(cx(2.5), Y + 35, "빈 칸", 14, "#999") + txt(cx(6.5), Y + 35, "빈 칸", 14, "#999"));
    // E 채우기
    [[2, "E1", 3.6], [3, "E2", 4.2], [6, "E3", 4.8], [7, "E4", 5.4]].forEach(function (e) { s += on(e[2], blk(e[0], e[1], FC.E)); });
    s += on(5.6, '<path d="M' + (X0 + 2 * W + 2) + ',' + (Y + H + 12) + ' L' + (X0 + 4 * W - 2) + ',' + (Y + H + 12) + '" stroke="#d6465f" stroke-width="3"/>' +
      '<path d="M' + (X0 + 6 * W + 2) + ',' + (Y + H + 12) + ' L' + (X0 + 8 * W - 2) + ',' + (Y + H + 12) + '" stroke="#d6465f" stroke-width="3"/>' +
      txt(cx(2.5), Y + H + 32, "E 의 앞 절반", 12, "#d6465f", ' font-weight="700"') + txt(cx(6.5), Y + H + 32, "E 의 뒤 절반", 12, "#d6465f", ' font-weight="700"'));

    // head 이동 (E1 → E2 → (C 건너뜀) → E3 → E4)
    var hx = [cx(2), cx(3), cx(6), cx(7)];
    s += '<g opacity="0"><path d="M-10,-16 L10,-16 L0,0 Z" fill="#3b2f4a"/>' + txt(0, -22, "head", 11, "#3b2f4a", ' font-weight="700"') +
      '<animateTransform attributeName="transform" type="translate" values="' + hx[0] + ' ' + (Y - 6) + ';' + hx[0] + ' ' + (Y - 6) + ';' + hx[1] + ' ' + (Y - 6) + ';' + hx[1] + ' ' + (Y - 6) + ';' + hx[2] + ' ' + (Y - 6) + ';' + hx[2] + ' ' + (Y - 6) + ';' + hx[3] + ' ' + (Y - 6) + ';' + hx[3] + ' ' + (Y - 6) + '" keyTimes="0;' + k(6.4) + ';' + k(7) + ';' + k(7.6) + ';' + k(8.8) + ';' + k(9.2) + ';' + k(9.8) + ';1" dur="' + D + 's" fill="freeze"/>' + from(6) + '</g>';
    s += on(7.6, '<path d="M' + (cx(3) + 10) + ',' + (Y - 40) + ' C' + cx(4) + ',' + (Y - 80) + ' ' + cx(5) + ',' + (Y - 80) + ' ' + (cx(6) - 10) + ',' + (Y - 40) + '" fill="none" stroke="#d6465f" stroke-width="2.5" stroke-dasharray="6 4" marker-end="url(#ff_arrow)"/>' +
      txt(cx(4.5), Y - 70, "C1·C2 를 건너뛴다", 13, "#d6465f", ' font-weight="700"'));
    // 읽은 순서
    [[cx(2), 6.4, "①"], [cx(3), 7.0, "②"], [cx(6), 8.8, "③"], [cx(7), 9.8, "④"]].forEach(function (r) { s += on(r[1], txt(r[0], Y + H + 56, r[2], 16, "#3b2f4a", ' font-weight="700"')); });
    s += on(10, '<rect x="160" y="282" width="440" height="30" rx="6" fill="#efe9f6" stroke="#3b2f4a"/>' + txt(380, 302, "FFS 의 답: 디스크 구조를 아는(disk aware) 배치", 14, "#3b2f4a", ' font-weight="700"'));

    s += txt(380, 332, "“Fragmentation makes it worse”: 빈 공간이 조각나면 새 파일도 조각난다", 13, "#777");
    return s + '</svg>';
  }
};
