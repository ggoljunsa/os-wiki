// ============================================================
// locality_stride — p.9 sum += a[i] 루프: a[i] 는 spatial, sum·루프는 temporal (13강 p.8~9)
// 가정: int 4 bytes, cache block 64 bytes (p.10 표) → block 하나 = 원소 16개. a[0..31] 두 block
// 시간축(초): 0~1.5 초기 → 1.5 a[0] miss: block 0 전체를 cache 로 → a[1]~a[15] hit → a[16] miss: block 1
//   → a[17]~a[31] hit → 11.6~13 결과 miss 2 · hit 30
// ============================================================
window.ANIMS = window.ANIMS || {};
ANIMS["locality_stride"] = {
  title: "Locality — a[i] 를 차례로 읽으면 miss 한 번에 hit 열다섯 번",
  desc: "[[locality]] p.9 예제. a[i] 는 stride-1 이라 한 번 가져온 64-byte block 안의 다음 원소들이 hit 다(spatial). sum 과 루프 몸체는 매 반복 다시 쓰인다(temporal). int 4B · block 64B 는 그림을 위한 가정",
  duration: 13,
  build: function () {
    var D = 13;
    var C = { a: "#1d65b3", aL: "#dbe8f7", b: "#2e9e4f", bL: "#dff3e4", c: "#e09a40", cL: "#fdeec2", k: "#3b2f4a", kL: "#efe9f6", hw: "#d6465f", hwL: "#f7d8dc", m: "#777" };
    function r3(v) { return Math.round(v * 1000) / 1000; }
    function box(x, y, w, h, fill, stroke, sw) { return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="4" fill="' + fill + '" stroke="' + stroke + '" stroke-width="' + (sw || 1.5) + '"/>'; }
    function txt(x, y, s, size, fill, extra) {
      var anchor = /text-anchor/.test(extra || "") ? "" : ' text-anchor="middle"';
      return '<text x="' + x + '" y="' + y + '" font-size="' + (size || 13) + '" fill="' + (fill || "#222") + '"' + anchor + (extra || "") + '>' + s + '</text>';
    }
    function show(from, to) {
      return '<animate attributeName="opacity" values="0;0;1;1;0;0" keyTimes="0;' + r3(from / D) + ';' + r3(from / D + 0.003) + ';' + r3(to / D) + ';' + r3(Math.min(1, to / D + 0.003)) + ';1" dur="' + D + 's" fill="freeze"/>';
    }
    function during(from, to, inner) {
      if (from <= 0) return '<g>' + inner + '<animate attributeName="opacity" values="1;1;0;0" keyTimes="0;' + r3(to / D) + ';' + r3(Math.min(1, to / D + 0.003)) + ';1" dur="' + D + 's" fill="freeze"/></g>';
      return '<g opacity="0">' + inner + show(from, to) + '</g>';
    }

    var T0 = 1.5, STEP = 0.31, N = 32;
    function ti(i) { return r3(T0 + i * STEP); }
    var s = '<svg viewBox="0 0 760 370" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="locality 애니메이션">';
    [
      [0, T0, "sum += a[i] 루프. 메모리의 a[] 는 64-byte block 단위로 cache 에 올라온다"],
      [T0, ti(1), "a[0] — cache 에 없다 → miss. a[0]~a[15] 가 든 block 0 전체를 가져온다"],
      [ti(1), ti(16), "a[1]~a[15] — 이미 가져온 block 안 → hit (spatial locality)"],
      [ti(16), ti(17), "a[16] — 다음 block → miss. block 1 을 가져온다"],
      [ti(17), ti(32), "a[17]~a[31] — hit. sum 은 매 반복 같은 변수 (temporal locality)"],
      [ti(32), D, "원소 32개 중 miss 2 · hit 30. 루프 명령어도 같은 몸체를 반복(temporal)"]
    ].forEach(function (c) { s += during(c[0], c[1], txt(380, 26, c[2], 14.5, "#222", ' font-weight="700"')); });

    // 코드 (p.9)
    s += box(30, 48, 280, 104, "#fbfbfd", "#ccc");
    var code = ["sum = 0;", "for (i = 0; i &lt; n; i++)", "    sum += a[i];", "return sum;"];
    // 루프 두 줄 하이라이트가 반복 (temporal)
    s += '<rect x="34" y="76" width="272" height="44" rx="3" fill="' + C.cL + '" opacity="0"><animate attributeName="opacity" values="0.3;1;0.3" begin="' + T0 + 's" dur="' + STEP + 's" repeatCount="' + N + '"/><set attributeName="opacity" to="0" begin="' + ti(N) + 's" fill="freeze"/></rect>';
    code.forEach(function (l, i) { s += txt(46, 70 + i * 22, l, 14, C.k, ' text-anchor="start" font-family="monospace" xml:space="preserve"'); });
    s += txt(170, 168, "명령어: 순서대로(spatial) · 같은 루프 반복(temporal)", 12, C.m);

    // sum 레지스터 (temporal)
    s += box(360, 62, 150, 58, C.hwL, C.hw, 2) + txt(435, 84, "sum", 14, C.hw, ' font-weight="700"') + txt(435, 108, "매 반복 다시 씀", 12, C.hw);
    s += '<rect x="356" y="58" width="158" height="66" rx="6" fill="none" stroke="' + C.hw + '" stroke-width="3" opacity="0"><animate attributeName="opacity" values="1;0;0" begin="' + T0 + 's" dur="' + STEP + 's" repeatCount="' + N + '"/></rect>';

    // 카운터 막대: hit / miss
    s += box(550, 54, 190, 76, "#fff", "#ccc") + txt(645, 74, "cache 결과", 13, C.k, ' font-weight="700"');
    s += txt(566, 98, "miss", 12.5, C.hw, ' text-anchor="start" font-weight="700"') + txt(566, 120, "hit", 12.5, C.b, ' text-anchor="start" font-weight="700"');
    var bw = 3.6; // 원소 하나당 막대 폭
    s += '<rect x="600" y="88" height="12" width="0" fill="' + C.hw + '"><set attributeName="width" to="' + bw + '" begin="' + ti(0) + 's" fill="freeze"/><set attributeName="width" to="' + (bw * 2) + '" begin="' + ti(16) + 's" fill="freeze"/></rect>';
    s += '<rect x="600" y="110" height="12" width="0" fill="' + C.b + '">';
    for (var i = 0; i < N; i++) {
      var hits = i < 16 ? i : i - 1;
      s += '<set attributeName="width" to="' + r3(hits * bw) + '" begin="' + ti(i) + 's" fill="freeze"/>';
    }
    s += '</rect>';
    s += during(ti(32), D, txt(730, 99, "2", 13, C.hw, ' text-anchor="end" font-weight="700"') + txt(730, 121, "30", 13, C.b, ' text-anchor="end" font-weight="700"'));

    // 메모리의 a[0..31]
    var X0 = 52, CW = 20.5, Y = 222;
    s += txt(30, Y - 30, "memory", 12.5, C.m, ' text-anchor="start"');
    for (var b = 0; b < 2; b++) {
      var bx = X0 + b * 16 * CW;
      s += '<path d="M' + bx + ',' + (Y - 8) + ' L' + bx + ',' + (Y - 14) + ' L' + (bx + 16 * CW - 2) + ',' + (Y - 14) + ' L' + (bx + 16 * CW - 2) + ',' + (Y - 8) + '" fill="none" stroke="#999"/>';
      s += txt(bx + 8 * CW, Y - 19, "block " + b + " (64 bytes = a[" + (b * 16) + "]~a[" + (b * 16 + 15) + "])", 12, C.m);
    }
    for (var j = 0; j < N; j++) {
      var x = X0 + j * CW;
      s += '<rect x="' + x + '" y="' + Y + '" width="' + (CW - 2) + '" height="30" fill="#f1f1f4" stroke="#bbb">' +
        '<set attributeName="fill" to="' + (j % 16 === 0 ? C.hwL : C.bL) + '" begin="' + ti(j) + 's" fill="freeze"/></rect>';
      if (j % 4 === 0) s += txt(x + CW / 2 - 1, Y + 46, String(j), 11, C.m);
    }
    s += txt(X0 - 20, Y + 20, "a[]", 13, C.k, ' font-weight="700"');
    // 현재 i 커서
    s += '<g opacity="0"><path d="M0,0 L-7,-12 L7,-12 z" fill="' + C.a + '"/>' + txt(0, -16, "i", 13, C.a, ' font-weight="700"') +
      '<animateTransform attributeName="transform" type="translate" calcMode="discrete" values="';
    var tv = [], kv = [];
    for (var q = 0; q < N; q++) { tv.push(r3(X0 + q * CW + CW / 2 - 1) + "," + (Y - 1)); kv.push(r3((T0 + q * STEP) / D)); }
    tv.unshift(tv[0]); kv.unshift(0);
    s += tv.join(";") + '" keyTimes="' + kv.join(";") + '" dur="' + D + 's" fill="freeze"/>' + show(T0, ti(32)) + '</g>';

    // cache line 들 (miss 때 block 째 올라감)
    var CY = 300;
    s += txt(30, CY - 8, "cache", 12.5, C.m, ' text-anchor="start"');
    for (var cb = 0; cb < 2; cb++) {
      var from = ti(cb * 16), cxx = X0 + cb * 16 * CW;
      s += '<g opacity="0"><rect x="' + cxx + '" y="' + CY + '" width="' + (16 * CW - 2) + '" height="26" rx="3" fill="' + C.cL + '" stroke="' + C.c + '" stroke-width="2"/>' +
        txt(cxx + 8 * CW, CY + 18, "cache line ← block " + cb + " (a[" + (cb * 16) + "]~a[" + (cb * 16 + 15) + "] 한꺼번에)", 12.5, C.c, ' font-weight="700"') +
        '<animateTransform attributeName="transform" type="translate" values="0,-60;0,0" begin="' + from + 's" dur="0.3s" fill="freeze"/>' + show(from, D) + '</g>';
    }

    s += txt(380, 360, "spatial: 근처 주소를 곧 쓴다 → block 단위로 가져오면 이득 · temporal: 방금 쓴 것을 또 쓴다", 13, C.k, ' font-weight="700"');
    return s + '</svg>';
  }
};
