// ============================================================
// swap_daemon_watermark — 빈 page 가 LW 아래로 내려가면 swap daemon 이 깨어나 HW 까지 비우고 잔다 (17강 p.28)
// 그림용 가정: frame 20개, LW = 5, HW = 14
// 시간축(초): 0~1.5 빈 page 12 → 1.5~4.5 할당으로 12→4 (LW 아래) → 4.5~8 daemon 깨어남: evict 로 4→14 (HW)
//   → 8~9 daemon 잠 → 9~11.5 다시 할당 14→9 (LW 위라 daemon 은 그대로 잔다) → 11.5~13 요점
// ============================================================
window.ANIMS = window.ANIMS || {};
ANIMS["swap_daemon_watermark"] = {
  title: "Swap daemon — LW 아래로 떨어지면 깨어나 HW 까지 비운다",
  desc: "[[swap daemon]] p.28. 빈 page 가 Low Watermark(LW)보다 적어지면 백그라운드 스레드(swap daemon, page daemon)가 깨어나 page 를 내보내고, High Watermark(HW)만큼 비면 다시 잔다. 메모리가 꽉 찰 때까지 기다리지 않는다. (frame 20개, LW 5, HW 14 는 그림용 가정)",
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

    var N = 20, LW = 5, HWM = 14;
    // 사건: [시각, frame 번호, 'used'|'free']
    var ev = [], free = {}, i;
    for (i = 8; i < N; i++) free[i] = true;            // 처음 빈 page 12
    var t;
    for (i = 0; i < 8; i++) ev.push([r3(1.5 + i * 0.375), 8 + i, "used"]);   // 12 → 4
    for (i = 0; i < 10; i++) ev.push([r3(4.7 + i * 0.32), i, "free"]);       // 4 → 14 (evict)
    for (i = 0; i < 5; i++) ev.push([r3(9 + i * 0.5), i, "used"]);           // 14 → 9
    // 시각별 빈 page 수
    var level = [[0, 12]], cur = 12;
    ev.forEach(function (e) { cur += e[2] === "free" ? 1 : -1; level.push([e[0], cur]); });

    var s = '<svg viewBox="0 0 760 350" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="swap daemon watermark 애니메이션">';
    [
      [0, 1.5, "물리 메모리 frame 20개 중 12개가 비어 있다. swap daemon 은 자는 중"],
      [1.5, 4.5, "프로세스들이 메모리를 쓴다 → 빈 page 가 줄어든다"],
      [4.5, 8.1, "빈 page 4 &lt; LW(5) → swap daemon 이 깨어나 page 를 evict 한다"],
      [8.1, 9, "빈 page 가 HW(14) 에 닿았다 → daemon 은 다시 잔다"],
      [9, 11.5, "다시 할당해 9 개로 줄어도 LW 위라 daemon 은 자는 그대로"],
      [11.5, D, "꽉 찰 때까지 기다리지 않고 미리 비워 두면, page fault 처리 때 빈 frame 이 이미 있다"]
    ].forEach(function (c) { s += during(c[0], c[1], txt(380, 26, c[2], 14, "#222", ' font-weight="700"')); });

    // 게이지 (빈 page 수 × 12px)
    var GX = 70, GB = 300, U = 12;
    s += txt(GX + 30, 52, "빈 page 수", 12.5, C.k, ' font-weight="700"');
    s += '<rect x="' + GX + '" y="' + (GB - N * U) + '" width="60" height="' + (N * U) + '" fill="#f4f4f6" stroke="#999"/>';
    var vals = [], hv = [], kt = [];
    level.forEach(function (l, j) {
      kt.push(r3(l[0] / D)); hv.push(l[1] * U); vals.push(GB - l[1] * U);
    });
    // keyTimes 는 단조 증가, 마지막 1
    kt.push(1); hv.push(hv[hv.length - 1]); vals.push(vals[vals.length - 1]);
    s += '<rect x="' + GX + '" y="' + vals[0] + '" width="60" height="' + hv[0] + '" fill="' + C.bL + '" stroke="' + C.b + '" stroke-width="1.5">' +
      '<animate attributeName="y" values="' + vals.join(";") + '" keyTimes="' + kt.join(";") + '" calcMode="discrete" dur="' + D + 's" fill="freeze"/>' +
      '<animate attributeName="height" values="' + hv.join(";") + '" keyTimes="' + kt.join(";") + '" calcMode="discrete" dur="' + D + 's" fill="freeze"/></rect>';
    // 숫자
    level.forEach(function (l, j) {
      var to = j < level.length - 1 ? level[j + 1][0] : D;
      s += during(l[0], to, txt(GX + 30, GB + 22, String(l[1]), 16, C.b, ' font-weight="700"'));
    });
    // watermark 선
    s += '<line x1="' + (GX - 14) + '" y1="' + (GB - HWM * U) + '" x2="' + (GX + 74) + '" y2="' + (GB - HWM * U) + '" stroke="' + C.a + '" stroke-width="2.5" stroke-dasharray="6,3"/>' + txt(GX + 80, GB - HWM * U + 5, "HW 14", 13, C.a, ' text-anchor="start" font-weight="700"');
    s += '<line x1="' + (GX - 14) + '" y1="' + (GB - LW * U) + '" x2="' + (GX + 74) + '" y2="' + (GB - LW * U) + '" stroke="' + C.hw + '" stroke-width="2.5" stroke-dasharray="6,3"/>' + txt(GX + 80, GB - LW * U + 5, "LW 5", 13, C.hw, ' text-anchor="start" font-weight="700"');
    s += txt(GX + 80, GB - HWM * U + 22, "High Watermark", 10.5, C.m, ' text-anchor="start"') + txt(GX + 80, GB - LW * U + 22, "Low Watermark", 10.5, C.m, ' text-anchor="start"');

    // daemon
    var DX = 250, DY = 70;
    s += box(DX, DY, 200, 70, C.kL, C.k, 2) + txt(DX + 100, DY + 22, "swap daemon (page daemon)", 13, C.k, ' font-weight="700"');
    s += during(0, 4.5, txt(DX + 100, DY + 50, "💤 sleep", 15, C.m, ' font-weight="700"'));
    s += during(4.5, 8.1, '<rect x="' + (DX - 4) + '" y="' + (DY - 4) + '" width="208" height="78" rx="6" fill="none" stroke="' + C.hw + '" stroke-width="3"/>' + txt(DX + 100, DY + 50, "깨어남 — evict 중", 15, C.hw, ' font-weight="700"'));
    s += during(8.1, D, txt(DX + 100, DY + 50, "💤 sleep", 15, C.m, ' font-weight="700"'));

    // frame 격자 (4 × 5)
    var FX = 520, FY = 70, FW = 42, FH = 34;
    s += txt(FX + 2.5 * (FW + 4), FY - 10, "물리 메모리 frame 20개", 12.5, C.k, ' font-weight="700"');
    for (i = 0; i < N; i++) {
      var x = FX + (i % 5) * (FW + 4), y = FY + Math.floor(i / 5) * (FH + 4);
      var r = '<rect x="' + x + '" y="' + y + '" width="' + FW + '" height="' + FH + '" rx="3" stroke="#999" fill="' + (free[i] ? "#fff" : C.cL) + '">';
      ev.forEach(function (e) { if (e[1] === i) r += '<set attributeName="fill" to="' + (e[2] === "free" ? "#fff" : C.cL) + '" begin="' + e[0] + 's" fill="freeze"/>'; });
      s += r + '</rect>';
    }
    s += box(FX, FY + 4 * (FH + 4) + 6, 5 * FW + 16, 18, "#fff", "#fff", 0) + '<rect x="' + FX + '" y="' + (FY + 4 * (FH + 4) + 8) + '" width="14" height="12" fill="' + C.cL + '" stroke="#999"/>' + txt(FX + 20, FY + 4 * (FH + 4) + 19, "사용 중", 11.5, C.m, ' text-anchor="start"') +
      '<rect x="' + (FX + 80) + '" y="' + (FY + 4 * (FH + 4) + 8) + '" width="14" height="12" fill="#fff" stroke="#999"/>' + txt(FX + 100, FY + 4 * (FH + 4) + 19, "빈 frame", 11.5, C.m, ' text-anchor="start"');

    // 디스크와 evict 화살표
    s += box(250, 236, 200, 50, C.aL, C.a, 1.8) + txt(350, 266, "swap space (disk)", 13.5, C.a, ' font-weight="700"');
    s += during(4.6, 8.1, '<path d="M' + (FX - 6) + ',' + (FY + 40) + ' C480,120 470,200 400,232" fill="none" stroke="' + C.hw + '" stroke-width="3" stroke-dasharray="7,5"><animate attributeName="stroke-dashoffset" values="24;0" dur="0.5s" begin="4.6s" repeatCount="7"/></path>' +
      txt(470, 190, "evict", 13, C.hw, ' font-weight="700"'));
    s += '<line x1="350" y1="140" x2="350" y2="232" stroke="#ccc" stroke-dasharray="3,3"/>';

    s += txt(380, 338, "LW 보다 적어지면 시작 · HW 만큼 비면 멈춤 (HW 는 High Watermark, hardware 아님)", 13.5, C.k, ' font-weight="700"');
    return s + '</svg>';
  }
};
