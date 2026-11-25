// large_file_chunks — 21강 p.15~17: large-file exception. 위: 일반 규칙대로면 큰 파일 블록 0~9 가 G2 를 꽉 채워
//   같은 디렉터리의 작은 파일이 G3 로 밀려난다. 아래: 두 블록짜리 chunk 로 G2·G4·G6·G8·G0 에 흩으면 작은 파일이 G2 에 들어간다.
window.ANIMS = window.ANIMS || {};
ANIMS["large_file_chunks"] = {
  title: "Large-file exception: 큰 파일은 chunk 로 잘라 여러 그룹에",
  desc: "[[large-file exception]] p.15 그림 그대로(chunk = 2 블록). 그다음 amortization 계산과 FFS 의 실제 방식(p.16~17).",
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
    var C = { big: "#1d65b3", bigL: "#cfe0f5", sm: "#2e9e4f", smL: "#dff3e4", hw: "#d6465f", muted: "#777" };
    var GX = 40, GW = 68;
    function groups(y) {
      var g = '';
      for (var i = 0; i < 10; i++) g += '<rect x="' + (GX + i * GW) + '" y="' + y + '" width="' + GW + '" height="66" fill="#fff" stroke="#555"/>' + txt(GX + i * GW + GW / 2, y + 18, "G" + i, 13, "#444", ' font-weight="700"');
      return g;
    }
    // 그룹 gi 의 칸 si(0~9): 5 칸씩 2 줄
    function slot(y, gi, si) { return { x: GX + gi * GW + 5 + (si % 5) * 12, y: y + 26 + Math.floor(si / 5) * 18 }; }
    function blk(y, gi, si, label, fill, stroke) { var p = slot(y, gi, si); return '<rect x="' + p.x + '" y="' + p.y + '" width="11" height="16" fill="' + fill + '" stroke="' + stroke + '"/>' + txt(p.x + 5.5, p.y + 12, label, 10, stroke, ' font-weight="700"'); }
    var YA = 74, YB = 214;
    var s = '<svg viewBox="0 0 760 380" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="large-file exception">';
    var caps = [
      [0, 1, "큰 파일(블록 0~9)과, 같은 디렉터리의 작은 파일 하나를 둔다"],
      [1, 4, "일반 규칙: 큰 파일이 처음 쓰인 그룹 G2 를 꽉 채운다"],
      [4, 5.6, "같은 디렉터리의 작은 파일은 G2 에 자리가 없어 다른 그룹으로 밀려난다"],
      [5.6, 9.4, "예외: 큰 파일은 chunk(여기선 2 블록)로 잘라 여러 그룹에 흩는다"],
      [9.4, 11, "G2 에 자리가 남아 작은 파일이 디렉터리 곁에 들어간다"],
      [11, 13.99, "대가는 chunk 사이의 seek. chunk 를 크게 잡아 그 비율을 줄인다 (amortization)"]
    ];
    caps.forEach(function (c) { s += win(c[0], c[1], txt(380, 26, c[2], 15, "#222", ' font-weight="700"')); });

    s += txt(GX, YA - 10, "일반 규칙 (p.15 위)", 13, C.hw, ' text-anchor="start" font-weight="700"');
    s += txt(GX, YB - 10, "Large-file exception (p.15 아래)", 13, C.big, ' text-anchor="start" font-weight="700"');
    s += groups(YA) + groups(YB);
    // 위: 0~9 가 G2 를 채움
    for (var b = 0; b < 10; b++) s += on(1.2 + b * 0.26, blk(YA, 2, b, "" + b, C.bigL, C.big));
    // 작은 파일: G2 로 갔다가 튕겨서 G3
    s += '<g opacity="0"><rect x="-8" y="-9" width="16" height="18" fill="' + C.smL + '" stroke="' + C.sm + '" stroke-width="2"/>' + txt(0, 5, "s", 11, C.sm, ' font-weight="700"') +
      '<animateMotion begin="4.1s" dur="1.2s" fill="freeze" path="M' + (GX + 2.5 * GW) + ',' + (YA - 24) + ' L' + (GX + 2.5 * GW) + ',' + (YA + 2) + ' L' + (GX + 3.5 * GW - 26) + ',' + (YA + 34) + '"/>' + show(4.1, 5.35) + '</g>';
    s += win(4.5, 5.6, txt(GX + 2.5 * GW, YA + 82, "꽉 참 ✗", 12, C.hw, ' font-weight="700"'));
    s += on(5.3, blk(YA, 3, 0, "s", C.smL, C.sm));
    s += on(5.3, txt(GX + 3.5 * GW, YA + 82, "밀려남", 12, C.hw, ' font-weight="700"'));
    // 아래: chunk 01→G2, 23→G4, 45→G6, 67→G8, 89→G0
    var ch = [[2, 0], [4, 2], [6, 4], [8, 6], [0, 8]];
    ch.forEach(function (c, i) {
      var t = 5.8 + i * 0.7;
      s += on(t, blk(YB, c[0], 0, "" + c[1], C.bigL, C.big) + blk(YB, c[0], 1, "" + (c[1] + 1), C.bigL, C.big));
    });
    s += on(9.5, blk(YB, 2, 2, "s", C.smL, C.sm) + txt(GX + 1.2 * GW, YB + 84, "s 는 G2 ✓", 12, C.sm, ' font-weight="700"'));
    // 읽는 순서 화살표 (chunk 사이 seek)
    s += on(9.0, '<path d="M' + (GX + 2.5 * GW) + ',' + (YB + 70) + ' Q' + (GX + 3.5 * GW) + ',' + (YB + 100) + ' ' + (GX + 4.5 * GW) + ',' + (YB + 70) + ' Q' + (GX + 5.5 * GW) + ',' + (YB + 100) + ' ' + (GX + 6.5 * GW) + ',' + (YB + 70) + ' Q' + (GX + 7.5 * GW) + ',' + (YB + 100) + ' ' + (GX + 8.5 * GW) + ',' + (YB + 70) + '" fill="none" stroke="' + C.hw + '" stroke-width="2" stroke-dasharray="5 4"/>' + txt(GX + 7.5 * GW, YB + 97, "chunk 마다 seek", 12, C.hw, ' font-weight="700"'));
    // amortization
    s += on(11, '<rect x="40" y="318" width="680" height="42" rx="6" fill="#efe9f6" stroke="#3b2f4a"/>' +
      txt(380, 335, "40 MB/s · positioning 10 ms: chunk 409.6 KB → peak 의 50%, 약 4 MB → 90%", 12.5, "#3b2f4a", ' font-weight="700"') +
      txt(380, 353, "FFS 는 1024 블록(4 MB)마다 다른 그룹에 둔다 (p.17)", 12.5, "#3b2f4a", ' font-weight="700"'));

    s += txt(380, 374, "“Amortization: reducing overhead by doing more work”", 12, C.muted);
    return s + '</svg>';
  }
};
