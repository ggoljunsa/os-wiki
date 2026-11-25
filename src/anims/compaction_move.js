// ============================================================
// compaction_move — 흩어진 빈 칸(8·4·12KB) 때문에 20KB 요청 실패 → compaction 으로 세그먼트를 모아 성공 (14강 p.16~17)
// 시간축(초): 0~1.5 p.17 왼쪽 상태 → 1.5~4 20KB 요청, 구멍마다 ✗ (external fragmentation)
//   → 4~5.2 ① stop → 5.2~8.5 ② copy (A 24→16, B 36→24, C 56→32) → 8.5~10 ③ base 변경 → 10~13 40~64KB 한 덩어리에 20KB 성공
// ============================================================
window.ANIMS = window.ANIMS || {};
ANIMS["compaction_move"] = {
  title: "Compaction — 세그먼트를 한쪽으로 모아 흩어진 빈 칸을 한 덩어리로",
  desc: "[[compaction]] p.16~17. 빈 공간 합은 24KB 인데 8KB · 4KB · 12KB 로 흩어져 20KB 요청이 실패한다([[external fragmentation]]). OS 가 프로세스를 멈추고, 세그먼트를 복사해 붙이고, base 레지스터를 고치면 40KB~64KB 가 한 덩어리로 빈다",
  duration: 13,
  build: function () {
    var D = 13;
    var C = { a: "#1d65b3", aL: "#dbe8f7", b: "#2e9e4f", bL: "#dff3e4", c: "#e09a40", cL: "#fdeec2", k: "#3b2f4a", kL: "#efe9f6", hw: "#d6465f", hwL: "#f7d8dc", m: "#777" };
    function r3(v) { return Math.round(v * 1000) / 1000; }
    function box(x, y, w, h, fill, stroke, sw, extra) { return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="3" fill="' + fill + '" stroke="' + stroke + '" stroke-width="' + (sw || 1.5) + '"' + (extra || "") + '/>'; }
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

    var X = 80, W = 150, Y0 = 52, K = 4.375; // 1KB = 4.375px, 64KB = 280px
    function ky(kb) { return r3(Y0 + kb * K); }
    var s = '<svg viewBox="0 0 760 370" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="compaction 애니메이션">';
    s += '<defs><pattern id="cmp_hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="6" stroke="#c6d3e8" stroke-width="2"/></pattern>' +
      '<marker id="cmp_arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="' + C.hw + '"/></marker></defs>';
    [
      [0, 1.5, "세그먼트를 넣고 빼다 보니 빈 칸이 8KB · 4KB · 12KB 로 흩어졌다"],
      [1.5, 4, "20KB 요청 → 빈 공간 합은 24KB 인데 연속 20KB 가 없다 → 실패 (external fragmentation)"],
      [4, 5.2, "Compaction ① Stop running process — 옮기는 동안 쓰면 안 된다"],
      [5.2, 8.5, "② Copy data — 세그먼트를 한쪽으로 복사해 붙인다 (크기에 비례하는 비용)"],
      [8.5, 10, "③ Change segment register value — 옮긴 세그먼트의 base 를 새 위치로"],
      [10, D, "40KB~64KB 가 한 덩어리 24KB → 20KB 요청 성공. 프로그램은 옮겨진 줄 모른다"]
    ].forEach(function (c) { s += during(c[0], c[1], txt(380, 26, c[2], 14.5, "#222", ' font-weight="700"')); });

    // 메모리 (빈 곳 = 빗금)
    s += txt(X + W / 2, Y0 - 6, "Physical Memory", 12.5, C.k, ' font-weight="700"');
    s += '<rect x="' + X + '" y="' + Y0 + '" width="' + W + '" height="' + (64 * K) + '" fill="url(#cmp_hatch)" stroke="#999" stroke-width="1.5"/>';
    s += box(X, Y0, W, 16 * K, "#c9d7ee", C.a) + txt(X + W / 2, ky(8) + 5, "Operating System", 12.5, C.a, ' font-weight="700"');
    [0, 16, 24, 32, 40, 48, 56, 64].forEach(function (kb) { s += txt(X - 6, ky(kb) + 4, kb + "KB", 11, C.m, ' text-anchor="end"'); });

    // 세그먼트 A, B, C (8KB 씩) → 16, 24, 32 로 이동
    var segs = [["Seg A", 24, 16, 5.2, C.c, C.cL], ["Seg B", 36, 24, 6.4, C.b, C.bL], ["Seg C", 56, 32, 7.5, C.a, C.aL]];
    segs.forEach(function (g) {
      s += '<g><rect x="' + X + '" y="0" width="' + W + '" height="' + (8 * K) + '" fill="' + g[5] + '" stroke="' + g[4] + '" stroke-width="1.8"/>' +
        txt(X + W / 2, 4 * K + 5, g[0] + " (8KB)", 12.5, g[4], ' font-weight="700"') +
        '<animateTransform attributeName="transform" type="translate" values="0,' + ky(g[1]) + ';0,' + ky(g[1]) + ';0,' + ky(g[2]) + ';0,' + ky(g[2]) + '" keyTimes="0;' + r3(g[3] / D) + ';' + r3((g[3] + 1) / D) + ';1" dur="' + D + 's" fill="freeze"/></g>';
    });
    // 멈춤 표시
    s += during(4, 8.6, txt(X + W + 16, ky(28) + 5, "⏸", 15, C.hw, ' text-anchor="start"') + txt(X + W + 16, ky(40) + 5, "⏸", 15, C.hw, ' text-anchor="start"') + txt(X + W + 16, ky(60) + 5, "⏸", 15, C.hw, ' text-anchor="start"'));
    // 구멍 크기 라벨
    s += during(0, 5.2, txt(X + W / 2, ky(20) + 5, "free 8KB", 12, C.a, ' font-weight="700"') + txt(X + W / 2, ky(50) + 5, "free 12KB", 12, C.a, ' font-weight="700"') +
      txt(X + W + 8, ky(34) + 4, "free 4KB", 11.5, C.a, ' text-anchor="start" font-weight="700"'));
    s += during(8.5, 11.2, txt(X + W + 8, ky(52) + 5, "free 24KB", 13, C.a, ' text-anchor="start" font-weight="700"'));

    // 20KB 요청
    var RX = 560, RY = 90;
    s += '<g><rect x="0" y="0" width="' + W + '" height="' + (20 * K) + '" rx="3" fill="' + C.kL + '" stroke="' + C.k + '" stroke-width="2"/>' +
      txt(W / 2, 10 * K + 5, "새 세그먼트 20KB", 12.5, C.k, ' font-weight="700"') +
      '<animateTransform attributeName="transform" type="translate" values="' + RX + ',' + RY + ';' + RX + ',' + RY + ';' + X + ',' + ky(40) + ';' + X + ',' + ky(40) + '" keyTimes="0;' + r3(10.2 / D) + ';' + r3(11.2 / D) + ';1" dur="' + D + 's" fill="freeze"/></g>';
    s += during(1.5, 4, '<path d="M' + RX + ',' + (RY + 20) + ' L' + (X + W + 6) + ',' + ky(20) + '" stroke="' + C.hw + '" stroke-width="2" stroke-dasharray="5,4" marker-end="url(#cmp_arr)"/>');
    s += during(2.2, 4, '<path d="M' + RX + ',' + (RY + 44) + ' L' + (X + W + 66) + ',' + ky(34) + '" stroke="' + C.hw + '" stroke-width="2" stroke-dasharray="5,4" marker-end="url(#cmp_arr)"/>');
    s += during(2.9, 4, '<path d="M' + RX + ',' + (RY + 70) + ' L' + (X + W + 6) + ',' + ky(50) + '" stroke="' + C.hw + '" stroke-width="2" stroke-dasharray="5,4" marker-end="url(#cmp_arr)"/>');
    s += during(1.9, 4.6, txt(RX + W / 2, RY + 20 * K + 22, "8KB ✗", 13, C.hw, ' font-weight="700"'));
    s += during(2.6, 4.6, txt(RX + W / 2, RY + 20 * K + 40, "4KB ✗", 13, C.hw, ' font-weight="700"'));
    s += during(3.3, 4.6, txt(RX + W / 2, RY + 20 * K + 58, "12KB ✗ → 실패", 13, C.hw, ' font-weight="700"'));
    s += during(11.2, D, txt(RX + W / 2, RY + 30, "성공 ✓", 15, C.b, ' font-weight="700"') + txt(X + W + 8, ky(62) + 5, "free 4KB", 12, C.a, ' text-anchor="start" font-weight="700"'));

    // segment base 레지스터
    var TX = 330, TY = 230;
    s += txt(TX + 90, TY - 12, "segment register (base)", 12.5, C.k, ' font-weight="700"');
    segs.forEach(function (g, i) {
      var y = TY + i * 28;
      s += box(TX, y, 180, 26, "#fff", "#bbb") + txt(TX + 40, y + 18, g[0], 12.5, g[4], ' font-weight="700"');
      s += during(0, 8.5 + i * 0.4, txt(TX + 125, y + 18, g[1] + "KB", 13, C.k, ' font-weight="700"'));
      s += during(8.5 + i * 0.4, D, '<rect x="' + (TX + 82) + '" y="' + (y + 3) + '" width="94" height="20" rx="3" fill="' + C.cL + '"/>' + txt(TX + 125, y + 18, g[1] + " → " + g[2] + "KB", 13, C.hw, ' font-weight="700"'));
    });

    s += txt(380, 360, "compaction 은 비싸다: 멈추고 · 복사하고 · base 를 바꾼다 (p.16). 가상 주소를 쓰니까 옮길 수 있다", 13, C.k, ' font-weight="700"');
    return s + '</svg>';
  }
};
