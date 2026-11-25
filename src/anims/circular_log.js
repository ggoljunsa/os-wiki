// ============================================================
// circular_log — 22강 p.31~34: 저널은 크기가 정해져 있다 → circular log + journal superblock
//   0~4.5 Tx1~Tx8 이 차례로 들어와 log 가 가득 참 → 5~7 Tx1~3 checkpoint → 7.6 Free(oldest 가 Tx4 로)
//   → 8.8~9.6 Tx9, Tx10 이 앞쪽 빈칸으로 돌아 들어감(wrap) → 12 끝
// ============================================================
window.ANIMS = window.ANIMS || {};
ANIMS["circular_log"] = {
  title: "circular log — checkpoint 한 칸을 비워서 다시 쓴다",
  desc: "[[circular log]]: 저널이 가득 차면 더 commit 할 수 없다. checkpoint 가 끝난 transaction 을 journal superblock 에서 free 로 표시하면 그 칸을 처음부터 다시 쓴다",
  duration: 12,
  build: function () {
    var D = 12;
    var C = { a: "#1d65b3", aL: "#dbe8f7", g: "#2e9e4f", gL: "#dff3e4", o: "#e09a40", oL: "#fdeec2", k: "#3b2f4a", kL: "#efe9f6", hw: "#d6465f", mu: "#777" };
    function box(x, y, w, h, fill, stroke, extra) {
      return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="4" fill="' + fill + '" stroke="' + stroke + '" stroke-width="1.6"' + (extra || "") + '/>';
    }
    function txt(x, y, s, size, fill, extra) {
      return '<text x="' + x + '" y="' + y + '" font-size="' + (size || 13) + '" fill="' + (fill || "#222") + '"' + (/text-anchor/.test(extra || "") ? "" : ' text-anchor="middle"') + (extra || "") + '>' + s + '</text>';
    }
    function show(from, to) {
      var a = from / D, b = Math.min(1, to / D);
      return '<animate attributeName="opacity" values="0;0;1;1;0;0" keyTimes="0;' + a.toFixed(4) + ';' + Math.min(a + 0.01, b).toFixed(4) + ';' + b.toFixed(4) + ';' + Math.min(1, b + 0.01).toFixed(4) + ';1" dur="' + D + 's" fill="freeze"/>';
    }
    // 화살표 포인터를 시각마다 칸 x 로 옮긴다 (계단식)
    function hop(pts) {
      return '<animateTransform attributeName="transform" type="translate" calcMode="discrete" values="' +
        pts.map(function (p) { return p[1] + ",0"; }).join(";") + '" keyTimes="' + pts.map(function (p) { return (p[0] / D).toFixed(4); }).join(";") + '" dur="' + D + 's" fill="freeze"/>';
    }
    var s = '<svg viewBox="0 0 760 320" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="circular log 애니메이션">';
    s += '<defs><marker id="cl_arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="#555"/></marker></defs>';

    var caps = [
      [0, 4.6, "transaction 이 commit 될 때마다 저널 뒤쪽에 하나씩 붙는다"],
      [4.6, 5.2, "저널이 가득 찼다. 이대로면 더 commit 할 수 없다"],
      [5.2, 7.4, "③ Checkpoint: Tx1·Tx2·Tx3 의 블록을 최종 위치에 다 썼다"],
      [7.4, 8.6, "④ Free: journal superblock 의 oldest 를 Tx4 로 옮긴다. 앞 세 칸이 빈다"],
      [8.6, 12, "새 transaction 은 끝에서 앞으로 돌아와 빈칸에 쓴다 (circular log)"]
    ];
    caps.forEach(function (c) { s += '<g opacity="0">' + txt(380, 26, c[2], 14, "#222", ' font-weight="700"') + show(c[0], c[1]) + '</g>'; });

    var y = 130, x0 = 170, w = 68, N = 8;
    function sx(i) { return x0 + i * w; }
    // journal superblock
    s += box(40, y - 4, 110, 44, C.kL, C.k) + txt(95, y + 14, "Journal", 12, C.k, ' font-weight="700"') + txt(95, y + 30, "Super", 12, C.k, ' font-weight="700"');
    s += txt(95, y + 66, "oldest · newest", 11, C.mu);
    s += txt(95, y + 82, "를 적어 둔다", 11, C.mu);
    // 빈 칸
    for (var i = 0; i < N; i++) s += box(sx(i) + 2, y - 4, w - 4, 44, "#fff", "#bbb", ' stroke-dasharray="4 3"');
    // 칸 번호
    for (i = 0; i < N; i++) s += txt(sx(i) + w / 2, y + 58, String(i), 10, "#aaa");
    // wrap 화살표 (끝 → 처음)
    s += '<path d="M' + (sx(N - 1) + w - 10) + ',' + (y + 64) + ' C' + (sx(N - 1) + w + 20) + ',' + (y + 120) + ' ' + (x0 - 20) + ',' + (y + 120) + ' ' + (x0 + 14) + ',' + (y + 66) + '" fill="none" stroke="#bbb" stroke-width="2" marker-end="url(#cl_arrow)"/>';
    s += '<g opacity="0"><path d="M' + (sx(N - 1) + w - 10) + ',' + (y + 64) + ' C' + (sx(N - 1) + w + 20) + ',' + (y + 120) + ' ' + (x0 - 20) + ',' + (y + 120) + ' ' + (x0 + 14) + ',' + (y + 66) + '" fill="none" stroke="' + C.hw + '" stroke-width="3" marker-end="url(#cl_arrow)"/>' +
      txt(440, y + 134, "wrap: 끝에 닿으면 처음으로", 12, C.hw, ' font-weight="700"') + show(8.6, 12) + '</g>';

    // transaction 블록
    var put = [0.8, 1.3, 1.8, 2.3, 2.8, 3.3, 3.8, 4.3];
    var freeAt = 7.6;
    for (i = 0; i < N; i++) {
      var end = i < 3 ? freeAt : D;
      s += '<g opacity="0">' + box(sx(i) + 2, y - 4, w - 4, 44, C.aL, C.a) + txt(sx(i) + w / 2, y + 23, "Tx" + (i + 1), 13, "#222", ' font-weight="700"') + show(put[i], end) + '</g>';
    }
    // checkpoint 표시 (Tx1~3)
    [5.4, 5.9, 6.4].forEach(function (t, k) {
      s += '<g opacity="0">' + box(sx(k) + 2, y - 4, w - 4, 44, C.gL, C.g) + txt(sx(k) + w / 2, y + 15, "Tx" + (k + 1), 13, "#1d6b2a", ' font-weight="700"') + txt(sx(k) + w / 2, y + 32, "ckpt ✓", 11, "#1d6b2a") + show(t, freeAt) + '</g>';
    });
    // 가득 참
    s += '<g opacity="0">' + box(x0, y - 10, N * w, 56, "none", C.hw, ' stroke-width="3"') + txt(x0 + N * w / 2, y + 78, "FULL: 새 transaction 을 commit 할 수 없다 (p.31)", 13, C.hw, ' font-weight="700"') + show(4.4, 5.3) + '</g>';
    // 다시 쓰인 칸
    [[0, 8.8, "Tx9"], [1, 9.6, "Tx10"]].forEach(function (r) {
      s += '<g opacity="0">' + box(sx(r[0]) + 2, y - 4, w - 4, 44, C.oL, C.o) + txt(sx(r[0]) + w / 2, y + 23, r[2], 13, "#8a6000", ' font-weight="700"') + show(r[1], D) + '</g>';
    });

    // 포인터: newest (위), oldest (위, 다른 높이)
    function ptr(label, color, yy, pts) {
      return '<g transform="translate(' + pts[0][1] + ',0)">' + hop(pts) +
        '<line x1="' + (w / 2) + '" y1="' + yy + '" x2="' + (w / 2) + '" y2="' + (y - 8) + '" stroke="' + color + '" stroke-width="2" marker-end="url(#cl_arrow)"/>' +
        txt(w / 2, yy - 4, label, 12, color, ' font-weight="700"') + '</g>';
    }
    var newest = [[0, sx(0)]];
    for (i = 0; i < N; i++) newest.push([put[i], sx(i)]);
    newest.push([8.8, sx(0)]); newest.push([9.6, sx(1)]);
    var oldest = [[0, sx(0)], [freeAt, sx(3)]];
    s += '<g opacity="0">' + ptr("newest", C.o, 62, newest) + show(0.8, D) + '</g>';
    s += '<g opacity="0">' + ptr("oldest", C.k, 84, oldest) + show(0.8, D) + '</g>';
    // superblock 갱신 강조
    s += '<g opacity="0">' + box(36, y - 8, 118, 52, "none", C.hw, ' stroke-width="3"') + txt(95, y - 14, "superblock 갱신", 11, C.hw, ' font-weight="700"') + show(7.4, 8.8) + '</g>';

    s += txt(380, 306, "checkpoint 가 끝난 transaction 만 free 할 수 있다. free 는 journal superblock 의 oldest 를 옮기는 것", 12, C.mu);
    s += '</svg>';
    return s;
  }
};
