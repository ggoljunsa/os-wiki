// ============================================================
// cache_affinity — CPU 를 옮기면 쌓아 둔 캐시를 잃는다 (7강 p.31, SQMS p.34)
// 시간축(초): 0 A 가 CPU0 에서 시작(cold) → 1.5 Miss 로 캐시가 채워짐(warm-up)
//   → 4 Hit → 5.5 SQMS 가 A 를 CPU1 로 → 7 CPU1 캐시는 비어 Miss·메모리 왕복
//   → 9.5 affinity: A 는 CPU0 에 머물러 Hit → 13 끝
// ============================================================
window.ANIMS = window.ANIMS || {};
ANIMS["cache_affinity"] = {
  title: "cache affinity — CPU 를 옮기면 캐시가 식는다",
  desc: "Process A 가 CPU 0 의 캐시를 데워 놓았는데 [[SQMS]] 가 A 를 CPU 1 로 보내면 캐시가 비어 Miss 가 쏟아진다. [[cache affinity]] = '''Keep a process on the same CPU if possible'''",
  duration: 13,
  build: function () {
    var D = 13;
    var C = {
      a: "#1d65b3", aL: "#dbe8f7",
      cpu: "#3b2f4a", cpuL: "#efe9f6",
      hw: "#d6465f", ok: "#1d6b2a", okL: "#cdefd2", muted: "#777", line: "#b9c4d8"
    };
    function f(x) { return Math.round(x * 10000) / 10000; }
    function box(x, y, w, h, fill, stroke, extra) {
      return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="8" fill="' + fill + '" stroke="' + stroke + '" stroke-width="2"' + (extra || "") + '/>';
    }
    function txt(x, y, s, size, fill, extra) {
      return '<text x="' + x + '" y="' + y + '" font-size="' + (size || 13) + '" fill="' + (fill || "#222") + '" text-anchor="middle"' + (extra || "") + '>' + s + '</text>';
    }
    // from~to 초에만 보이기
    function show(from, to) {
      var a = from / D, b = to / D;
      if (from <= 0 && to >= D) return '<set attributeName="opacity" to="1" dur="' + D + 's" fill="freeze"/>';
      if (from <= 0) return '<animate attributeName="opacity" values="1;1;0;0" keyTimes="0;' + f(b) + ';' + f(b + 0.003) + ';1" dur="' + D + 's" fill="freeze"/>';
      if (to >= D) return '<animate attributeName="opacity" values="0;0;1;1" keyTimes="0;' + f(a) + ';' + f(a + 0.003) + ';1" dur="' + D + 's" fill="freeze"/>';
      return '<animate attributeName="opacity" values="0;0;1;1;0;0" keyTimes="0;' + f(a) + ';' + f(a + 0.003) + ';' + f(b) + ';' + f(b + 0.003) + ';1" dur="' + D + 's" fill="freeze"/>';
    }
    function win(from, to, inner) { return '<g opacity="0">' + inner + show(from, to) + '</g>'; }
    // 키프레임 [[t, v], …] → <animate>
    function kf(attr, fr) {
      var ts = [], vs = [];
      if (fr[0][0] > 0) { ts.push(0); vs.push(fr[0][1]); }
      fr.forEach(function (p) { ts.push(f(p[0] / D)); vs.push(p[1]); });
      if (fr[fr.length - 1][0] < D) { ts.push(1); vs.push(fr[fr.length - 1][1]); }
      return '<animate attributeName="' + attr + '" values="' + vs.join(";") + '" keyTimes="' + ts.join(";") + '" dur="' + D + 's" fill="freeze"/>';
    }
    // 이동 [[t, x, y], …] → translate
    function mv(fr) {
      var ts = [], vs = [];
      if (fr[0][0] > 0) { ts.push(0); vs.push(fr[0][1] + " " + fr[0][2]); }
      fr.forEach(function (p) { ts.push(f(p[0] / D)); vs.push(p[1] + " " + p[2]); });
      if (fr[fr.length - 1][0] < D) { ts.push(1); vs.push(fr[fr.length - 1][1] + " " + fr[fr.length - 1][2]); }
      return '<animateTransform attributeName="transform" type="translate" values="' + vs.join(";") + '" keyTimes="' + ts.join(";") + '" dur="' + D + 's" fill="freeze"/>';
    }

    var s = '<svg viewBox="0 0 760 340" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="cache affinity 애니메이션">';
    s += '<defs><marker id="ca_arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#555"/></marker>' +
      '<marker id="ca_arrow_r" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="' + C.hw + '"/></marker></defs>';

    // ---- 단계 자막 ----
    var caps = [
      [0, 1.5, "Process A 가 CPU 0 에서 실행 시작 — 캐시는 아직 비어 있음 (cold)"],
      [1.5, 4, "처음 접근은 Miss → 메모리에서 가져오며 CPU 0 캐시에 A 의 상태가 쌓인다"],
      [4, 5.5, "캐시가 데워지면 A 의 접근은 Hit ✔ — 빠르다"],
      [5.5, 7, "SQMS: 전역 큐에서 A 를 꺼낸 게 CPU 1 → A 가 CPU 1 로 이동"],
      [7, 9.5, "CPU 1 캐시엔 A 의 데이터가 없다 → Miss ✘ → 메모리까지 왕복 (느림)"],
      [9.5, 13, "cache affinity: A 를 CPU 0 에 두면 쌓아 둔 캐시를 그대로 재활용 → Hit ✔"]
    ];
    caps.forEach(function (c) { s += win(c[0], c[1], txt(380, 26, c[2], 14, "#222", ' font-weight="700"')); });

    // ---- CPU 두 개 ----
    var CPUX = [40, 430];
    var SLOTY = 162;
    function slotX(cx, i) { return cx + 96 + i * 46; }
    CPUX.forEach(function (cx, k) {
      s += box(cx, 46, 290, 170, C.cpuL, C.cpu);
      s += txt(cx + 74, 70, "CPU " + k, 15, C.cpu, ' font-weight="700"');
      s += '<rect x="' + (cx + 14) + '" y="82" width="120" height="44" rx="6" fill="#fff" stroke="' + C.line + '" stroke-dasharray="4 3"/>';
      s += box(cx + 10, 146, 272, 54, "#fff", C.cpu);
      s += txt(cx + 50, 178, "Cache", 13, C.cpu, ' font-weight="700"');
      for (var i = 0; i < 4; i++) {
        s += '<rect x="' + slotX(cx, i) + '" y="' + SLOTY + '" width="40" height="28" rx="4" fill="#f4f4f4" stroke="#ccc"/>';
      }
    });

    // ---- 버스 + 메모리 ----
    s += '<path d="M185,200 L185,236 L575,236 L575,200 M380,236 L380,256" fill="none" stroke="' + C.line + '" stroke-width="3"/>';
    s += txt(380, 230, "Bus", 11, C.muted);
    s += box(220, 256, 320, 44, "#f7f7f7", "#888");
    s += txt(284, 283, "Main Memory", 13, "#444", ' font-weight="700"');
    s += txt(284, 296, "(느림)", 10, C.muted);
    var MEMX = 350;
    for (var m = 0; m < 4; m++) {
      s += '<rect x="' + (MEMX + m * 46) + '" y="264" width="40" height="28" rx="4" fill="' + C.aL + '" stroke="' + C.a + '"/>';
      s += txt(MEMX + m * 46 + 20, 283, "D" + (m + 1), 12, C.a, ' font-weight="700"');
    }

    // ---- 캐시 블록 (메모리 → 캐시로 날아옴) ----
    function block(cx, i, t0, opacityFr) {
      var g = '<g opacity="0">';
      g += '<rect x="0" y="0" width="40" height="28" rx="4" fill="' + C.a + '"/>';
      g += txt(20, 19, "D" + (i + 1), 12, "#fff", ' font-weight="700"');
      g += mv([[t0, MEMX + i * 46, 264], [t0 + 0.5, slotX(cx, i), SLOTY]]);
      g += kf("opacity", opacityFr);
      g += '</g>';
      return g;
    }
    // CPU0 warm-up: 1.6, 2.2, 2.8, 3.4 — 이동 중엔 흐리게 → 이동 후 1 → CPU1 로 옮긴 동안 흐림 → affinity 때 다시 선명
    for (var i = 0; i < 4; i++) {
      var t0 = 1.6 + i * 0.6;
      s += block(CPUX[0], i, t0, [[t0 - 0.01, 0], [t0, 1], [5.9, 1], [6.2, 0.3], [9.5, 0.3], [9.7, 1]]);
    }
    // CPU1 refill: 7.2, 7.75, 8.3, 8.85 → affinity 장면에서는 사라짐
    for (i = 0; i < 4; i++) {
      var t1 = 7.2 + i * 0.55;
      s += block(CPUX[1], i, t1, [[t1 - 0.01, 0], [t1, 1], [9.4, 1], [9.6, 0]]);
      // Miss 빨간 번쩍임 (슬롯)
      s += '<rect x="' + (slotX(CPUX[1], i) - 3) + '" y="' + (SLOTY - 3) + '" width="46" height="34" rx="5" fill="none" stroke="' + C.hw + '" stroke-width="3" opacity="0">' +
        kf("opacity", [[t1 - 0.25, 0], [t1 - 0.2, 1], [t1 + 0.3, 1], [t1 + 0.35, 0]]) + '</rect>';
    }
    // CPU0 warm-up 동안의 첫 Miss 번쩍임
    for (i = 0; i < 4; i++) {
      var tw = 1.6 + i * 0.6;
      s += '<rect x="' + (slotX(CPUX[0], i) - 3) + '" y="' + (SLOTY - 3) + '" width="46" height="34" rx="5" fill="none" stroke="' + C.hw + '" stroke-width="3" opacity="0">' +
        kf("opacity", [[tw - 0.2, 0], [tw - 0.15, 1], [tw + 0.3, 1], [tw + 0.35, 0]]) + '</rect>';
    }
    // Hit 초록 테두리 (CPU0 캐시 전체) — 4~5.5, 9.8~13
    s += '<rect x="' + (CPUX[0] + 90) + '" y="' + (SLOTY - 6) + '' + '" width="190" height="40" rx="6" fill="none" stroke="' + C.ok + '" stroke-width="3" opacity="0">' +
      kf("opacity", [[4, 0], [4.05, 1], [4.4, 0.3], [4.7, 1], [5, 0.3], [5.4, 1], [5.5, 0], [9.8, 0], [9.85, 1], [10.3, 0.3], [10.7, 1], [11.1, 0.3], [11.5, 1]]) + '</rect>';

    // ---- 메모리 왕복 화살표 (CPU1 Miss) ----
    s += win(7, 9.5, '<path d="M700,218 L700,282 L546,282" fill="none" stroke="' + C.hw + '" stroke-width="2.5" stroke-dasharray="6 4" marker-end="url(#ca_arrow_r)"/>' +
      txt(622, 276, "memory 왕복", 11, C.hw, ' font-weight="700"'));

    // ---- Process A (이동) ----
    var AX0 = CPUX[0] + 14, AX1 = CPUX[1] + 14;
    s += '<g>' + '<rect x="0" y="82" width="120" height="44" rx="6" fill="' + C.a + '"/>' +
      txt(60, 102, "Process A", 13, "#fff", ' font-weight="700"') + txt(60, 118, "running", 10, "#dbe8f7") +
      mv([[0, AX0, 0], [5.7, AX0, 0], [6.7, AX1, 0], [9.45, AX1, 0], [9.5, AX0, 0]]) +
      kf("opacity", [[0, 1], [9.35, 1], [9.45, 0], [9.6, 0], [9.75, 1]]) + '</g>';
    // 이동 화살표 (SQMS)
    s += win(5.5, 7.2, '<path d="M170,96 C260,58 380,58 440,96" fill="none" stroke="' + C.hw + '" stroke-width="2.5" marker-end="url(#ca_arrow_r)"/>' +
      txt(305, 58, "SQMS: 다음 슬라이스는 CPU 1", 11, C.hw, ' font-weight="700"'));
    // affinity 장면: CPU1 쪽 표시
    s += win(9.6, 13, txt(AX1 + 60, 108, "(A 는 안 옴)", 11, C.muted));
    s += win(9.6, 13, '<rect x="' + (CPUX[0] + 150) + '" y="84" width="124" height="22" rx="11" fill="' + C.okL + '" stroke="' + C.ok + '"/>' +
      txt(CPUX[0] + 212, 99, "affinity: CPU 0 고정", 11, C.ok, ' font-weight="700"'));

    // ---- Hit / Miss 배지 ----
    function badge(x, y, label, fill, stroke) {
      return '<rect x="' + (x - 44) + '" y="' + (y - 14) + '" width="88" height="22" rx="11" fill="' + fill + '" stroke="' + stroke + '"/>' +
        txt(x, y + 2, label, 12, stroke, ' font-weight="700"');
    }
    s += win(1.5, 4, badge(CPUX[0] + 212, 124, "Miss (cold)", "#ffd9d9", "#a52f2f"));
    s += win(4, 5.5, badge(CPUX[0] + 212, 124, "Hit ✔ 빠름", C.okL, C.ok));
    s += win(7, 9.5, badge(CPUX[1] + 212, 124, "Miss ✘ 느림", "#ffd9d9", "#a52f2f"));
    s += win(7, 9.5, txt(CPUX[0] + 212, 110, "A 의 캐시는 여기 남음", 11, C.muted));
    s += win(9.8, 13, badge(CPUX[0] + 212, 130, "Hit ✔ 빠름", C.okL, C.ok));

    // ---- 아래 요점 ----
    s += txt(380, 328, "옮기면 CPU 에 쌓아 둔 캐시(+TLB) 상태를 잃는다 — Keep a process on the same CPU if possible", 12, C.muted);
    s += '</svg>';
    return s;
  }
};
