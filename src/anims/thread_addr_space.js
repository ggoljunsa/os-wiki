// ============================================================
// thread_addr_space — 한 주소 공간, 스택·TCB 는 스레드마다 (8강 p.26~29)
// 시간축(초): 0 main(T1) 하나 → 2 pthread_create: Stack (2) + TCB(T2) 생김
//   → 4 T2 의 PC 가 work() 에서 시작 → 5.5 T2 가 힙의 s->n 0→1
//   → 7.5 T1 도 work() 로 와서 s->n 1→2 → 9.5 정리 → 13 끝
// ============================================================
window.ANIMS = window.ANIMS || {};
ANIMS["thread_addr_space"] = {
  title: "스레드의 주소 공간 — 코드·힙은 하나, 스택·PC 는 스레드마다",
  desc: "[[pthread_create]] 가 만드는 것은 '''새 [[스레드 스택|스택]] + 새 [[TCB]]''' 뿐이다. 두 스레드의 PC 가 같은 코드 위를 각자 움직이고, 같은 [[힙]] 변수를 함께 건드린다.",
  duration: 13,
  build: function () {
    var D = 13;
    var C = {
      a: "#1d65b3", aL: "#dbe8f7",
      b: "#2e9e4f", bL: "#dff3e4",
      cpu: "#3b2f4a", cpuL: "#efe9f6",
      hw: "#d6465f", os: "#e09a40", osL: "#fdeec2", muted: "#777", line: "#b9c4d8"
    };
    function f(x) { return Math.round(x * 10000) / 10000; }
    function box(x, y, w, h, fill, stroke, extra) {
      return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="8" fill="' + fill + '" stroke="' + stroke + '" stroke-width="2"' + (extra || "") + '/>';
    }
    function txt(x, y, s, size, fill, extra) {
      return '<text x="' + x + '" y="' + y + '" font-size="' + (size || 13) + '" fill="' + (fill || "#222") + '"' + (/text-anchor/.test(extra || "") ? "" : ' text-anchor="middle"') + (extra || "") + '>' + s + '</text>';
    }
    function ltxt(x, y, s, size, fill, extra) { return txt(x, y, s, size, fill, ' text-anchor="start"' + (extra || "")); }
    function show(from, to) {
      var a = from / D, b = to / D;
      if (from <= 0 && to >= D) return '<set attributeName="opacity" to="1" dur="' + D + 's" fill="freeze"/>';
      if (from <= 0) return '<animate attributeName="opacity" values="1;1;0;0" keyTimes="0;' + f(b) + ';' + f(b + 0.003) + ';1" dur="' + D + 's" fill="freeze"/>';
      if (to >= D) return '<animate attributeName="opacity" values="0;0;1;1" keyTimes="0;' + f(a) + ';' + f(a + 0.003) + ';1" dur="' + D + 's" fill="freeze"/>';
      return '<animate attributeName="opacity" values="0;0;1;1;0;0" keyTimes="0;' + f(a) + ';' + f(a + 0.003) + ';' + f(b) + ';' + f(b + 0.003) + ';1" dur="' + D + 's" fill="freeze"/>';
    }
    function win(from, to, inner) { return '<g opacity="0">' + inner + show(from, to) + '</g>'; }
    function kf(attr, fr) {
      var ts = [], vs = [];
      if (fr[0][0] > 0) { ts.push(0); vs.push(fr[0][1]); }
      fr.forEach(function (p) { ts.push(f(p[0] / D)); vs.push(p[1]); });
      if (fr[fr.length - 1][0] < D) { ts.push(1); vs.push(fr[fr.length - 1][1]); }
      return '<animate attributeName="' + attr + '" values="' + vs.join(";") + '" keyTimes="' + ts.join(";") + '" dur="' + D + 's" fill="freeze"/>';
    }
    function mv(fr) {
      var ts = [], vs = [];
      if (fr[0][0] > 0) { ts.push(0); vs.push(fr[0][1] + " " + fr[0][2]); }
      fr.forEach(function (p) { ts.push(f(p[0] / D)); vs.push(p[1] + " " + p[2]); });
      if (fr[fr.length - 1][0] < D) { ts.push(1); vs.push(fr[fr.length - 1][1] + " " + fr[fr.length - 1][2]); }
      return '<animateTransform attributeName="transform" type="translate" values="' + vs.join(";") + '" keyTimes="' + ts.join(";") + '" dur="' + D + 's" fill="freeze"/>';
    }

    var s = '<svg viewBox="0 0 760 370" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="스레드 주소 공간 애니메이션">';
    s += '<defs><marker id="ta_arrow_a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="' + C.a + '"/></marker>' +
      '<marker id="ta_arrow_b" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="' + C.b + '"/></marker></defs>';

    // ---- 단계 자막 ----
    var caps = [
      [0, 2, "처음엔 스레드 1개(main = T1): 코드·전역·힙 + 스택 1개 + TCB 1개"],
      [2, 4, "pthread_create() → 새 Stack (2) 와 새 TCB(T2) 만 생긴다 (코드·힙은 그대로)"],
      [4, 5.5, "T2 는 자기 PC 로 work() 에서 시작 — 한 주소 공간에 PC 가 2개"],
      [5.5, 7.5, "두 PC 가 같은 코드 위를 각자 움직인다 · T2 가 힙의 s-&gt;n 을 0 → 1"],
      [7.5, 9.5, "T1 도 work() 로 와서 같은 s-&gt;n 을 1 → 2 — 힙은 공유 데이터"],
      [9.5, 13, "따로: PC·레지스터·스택 (TCB) / 공유: 코드·전역 변수·힙"]
    ];
    caps.forEach(function (c) { s += win(c[0], c[1], txt(380, 26, c[2], 14, "#222", ' font-weight="700"')); });

    // ---- 주소 공간 (왼쪽 기둥) ----
    var X = 66, W = 280;
    s += txt(X + W / 2, 46, "주소 공간 (프로세스에 하나)", 12, C.muted, ' font-weight="700"');
    s += txt(X - 6, 64, "0KB", 10, C.muted, ' text-anchor="end"');
    s += txt(X - 6, 344, "16KB", 10, C.muted, ' text-anchor="end"');
    // Program Code
    s += '<rect x="' + X + '" y="54" width="' + W + '" height="98" fill="#f6f3fa" stroke="' + C.cpu + '"/>';
    s += ltxt(X + 8, 70, "Program Code (공유)", 12, C.cpu, ' font-weight="700"');
    var LY = [90, 108, 126, 144];
    var code = [
      ["main:", "s = malloc(sizeof *s);"],
      ["", "pthread_create(&amp;p2,NULL,work,s);"],
      ["", "work(s);"],
      ["work:", "s-&gt;n = s-&gt;n + 1;"]
    ];
    code.forEach(function (c, i) {
      s += ltxt(X + 8, LY[i], c[0], 11, C.muted, ' font-family="monospace"');
      s += ltxt(X + 50, LY[i], c[1], 11, "#222", ' font-family="monospace"');
    });
    // Data
    s += '<rect x="' + X + '" y="152" width="' + W + '" height="26" fill="#f7f7f7" stroke="#999"/>';
    s += ltxt(X + 8, 170, "Data — 전역·static 변수 (공유)", 11, "#555");
    // Heap
    s += '<rect x="' + X + '" y="178" width="' + W + '" height="44" fill="' + C.osL + '" stroke="' + C.os + '"/>';
    s += ltxt(X + 8, 196, "Heap (공유)", 12, "#8a6000", ' font-weight="700"');
    s += '<rect x="' + (X + 150) + '" y="186" width="116" height="28" rx="5" fill="#fff" stroke="' + C.os + '" stroke-width="2"/>';
    s += win(0, 6.4, txt(X + 208, 205, "s-&gt;n = 0", 13, "#222", ' font-weight="700" font-family="monospace"'));
    s += win(6.4, 8.8, txt(X + 208, 205, "s-&gt;n = 1", 13, C.b, ' font-weight="700" font-family="monospace"'));
    s += win(8.8, 13, txt(X + 208, 205, "s-&gt;n = 2", 13, C.a, ' font-weight="700" font-family="monospace"'));
    // 힙 칸 번쩍임
    s += '<rect x="' + (X + 147) + '" y="183" width="122" height="34" rx="6" fill="none" stroke="' + C.b + '" stroke-width="3" opacity="0">' +
      kf("opacity", [[6.1, 0], [6.15, 1], [7.2, 1], [7.3, 0]]) + '</rect>';
    s += '<rect x="' + (X + 147) + '" y="183" width="122" height="34" rx="6" fill="none" stroke="' + C.a + '" stroke-width="3" opacity="0">' +
      kf("opacity", [[8.5, 0], [8.55, 1], [9.5, 1], [9.6, 0]]) + '</rect>';
    // free
    s += '<rect x="' + X + '" y="222" width="' + W + '" height="26" fill="#fff" stroke="#ccc" stroke-dasharray="4 3"/>';
    s += txt(X + W / 2, 239, "(free)", 11, "#aaa");
    // Stack (2): 처음엔 free, 2.3초에 생김
    s += '<rect x="' + X + '" y="248" width="' + W + '" height="36" fill="#fff" stroke="#ccc" stroke-dasharray="4 3"/>';
    s += win(0, 2.3, txt(X + W / 2, 270, "(free)", 11, "#aaa"));
    s += win(2.3, 13, '<rect x="' + X + '" y="248" width="' + W + '" height="36" fill="' + C.bL + '" stroke="' + C.b + '" stroke-width="2"/>' +
      ltxt(X + 8, 264, "Stack (2) — T2", 12, C.b, ' font-weight="700"') +
      ltxt(X + 8, 279, "work 프레임: 인자 s", 10, "#555"));
    s += '<rect x="' + X + '" y="284" width="' + W + '" height="22" fill="#fff" stroke="#ccc" stroke-dasharray="4 3"/>';
    s += txt(X + W / 2, 299, "(free)", 11, "#aaa");
    // Stack (1)
    s += '<rect x="' + X + '" y="306" width="' + W + '" height="36" fill="' + C.aL + '" stroke="' + C.a + '" stroke-width="2"/>';
    s += ltxt(X + 8, 322, "Stack (1) — T1 (main)", 12, C.a, ' font-weight="700"');
    s += ltxt(X + 8, 337, "main 프레임: s, p2", 10, "#555");

    // ---- PC 표시 ----
    // T1 (왼쪽, 오른쪽을 가리킴)
    s += '<g>' + '<rect x="0" y="-10" width="40" height="18" rx="4" fill="' + C.a + '"/>' + txt(20, 3, "T1 PC", 10, "#fff", ' font-weight="700"') +
      '<path d="M40,-1 L50,-1" stroke="' + C.a + '" stroke-width="2" marker-end="url(#ta_arrow_a)"/>' +
      mv([[0, 8, LY[0] - 4], [1.6, 8, LY[0] - 4], [1.9, 8, LY[1] - 4], [5.6, 8, LY[1] - 4], [5.9, 8, LY[2] - 4], [7.6, 8, LY[2] - 4], [7.9, 8, LY[3] - 4]]) + '</g>';
    // T2 (오른쪽, 왼쪽을 가리킴) — 4초에 나타남
    s += '<g opacity="0">' + '<rect x="12" y="-10" width="40" height="18" rx="4" fill="' + C.b + '"/>' + txt(32, 3, "T2 PC", 10, "#fff", ' font-weight="700"') +
      '<path d="M12,-1 L2,-1" stroke="' + C.b + '" stroke-width="2" marker-end="url(#ta_arrow_b)"/>' +
      mv([[0, X + W, LY[3] - 4]]) + show(4, 13) + '</g>';

    // ---- 힙 접근 화살표 ----
    s += win(5.9, 7.4, '<path d="M' + (X + W + 30) + ',' + (LY[3] + 8) + ' C' + (X + W + 40) + ',180 ' + (X + W + 20) + ',200 ' + (X + W - 12) + ',200" fill="none" stroke="' + C.b + '" stroke-width="2.5" marker-end="url(#ta_arrow_b)"/>');
    s += win(8.3, 9.6, '<path d="M28,' + (LY[3] + 6) + ' C28,208 60,208 ' + (X + 144) + ',208" fill="none" stroke="' + C.a + '" stroke-width="2.5" marker-end="url(#ta_arrow_a)"/>');

    // ---- TCB 들 ----
    function tcb(x, name, col, colL, sub) {
      return box(x, 60, 170, 132, colL, col) +
        txt(x + 85, 82, name, 14, col, ' font-weight="700"') +
        '<line x1="' + (x + 10) + '" y1="90" x2="' + (x + 160) + '" y2="90" stroke="' + col + '" stroke-opacity="0.4"/>' + sub;
    }
    var T1X = 400, T2X = 585;
    var t1sub = ltxt(T1X + 12, 132, "sp → Stack (1)", 12, "#222") + ltxt(T1X + 12, 154, "regs: eax, … (자기 것)", 11, "#555") +
      ltxt(T1X + 12, 178, "상태·스케줄링 정보", 11, "#555");
    t1sub += win(0, 1.9, ltxt(T1X + 12, 110, "PC → main L1", 12, "#222", ' font-weight="700"'));
    t1sub += win(1.9, 5.9, ltxt(T1X + 12, 110, "PC → main L2", 12, "#222", ' font-weight="700"'));
    t1sub += win(5.9, 7.9, ltxt(T1X + 12, 110, "PC → main L3", 12, "#222", ' font-weight="700"'));
    t1sub += win(7.9, 13, ltxt(T1X + 12, 110, "PC → work", 12, "#222", ' font-weight="700"'));
    s += tcb(T1X, "TCB(T1)", C.a, C.aL, t1sub);
    var t2sub = ltxt(T2X + 12, 110, "PC → work", 12, "#222", ' font-weight="700"') +
      ltxt(T2X + 12, 132, "sp → Stack (2)", 12, "#222") + ltxt(T2X + 12, 154, "regs: eax, … (자기 것)", 11, "#555") +
      ltxt(T2X + 12, 178, "상태·스케줄링 정보", 11, "#555");
    s += '<g opacity="0">' + tcb(T2X, "TCB(T2)", C.b, C.bL, t2sub) + show(2.8, 13) + '</g>';
    s += win(2.0, 2.8, '<rect x="' + T2X + '" y="60" width="170" height="132" rx="8" fill="none" stroke="' + C.b + '" stroke-width="2" stroke-dasharray="6 4"/>' +
      txt(T2X + 85, 130, "새 TCB 할당 중…", 12, C.b));

    // sp 연결선
    s += '<path d="M' + (T1X + 20) + ',192 L' + (T1X + 20) + ',324 L' + (X + W + 4) + ',324" fill="none" stroke="' + C.a + '" stroke-width="2" stroke-dasharray="5 4" marker-end="url(#ta_arrow_a)"/>';
    s += win(2.8, 13, '<path d="M' + (T2X + 20) + ',192 L' + (T2X + 20) + ',266 L' + (X + W + 4) + ',266" fill="none" stroke="' + C.b + '" stroke-width="2" stroke-dasharray="5 4" marker-end="url(#ta_arrow_b)"/>');

    // 새로 생기지 않는 것
    s += win(2, 5.5, '<rect x="440" y="282" width="315" height="44" rx="8" fill="#fff" stroke="' + C.os + '" stroke-dasharray="5 4"/>' +
      txt(597, 300, "pthread_create 가 새로 만들지 않는 것:", 12, "#8a6000", ' font-weight="700"') +
      txt(597, 318, "코드 · 힙 · 페이지 테이블 (주소 공간 그대로)", 12, "#8a6000"));
    s += win(9.5, 13, '<rect x="440" y="282" width="315" height="44" rx="8" fill="#fff" stroke="' + C.cpu + '"/>' +
      txt(597, 300, "따로: PC·레지스터·스택 (TCB)", 12, C.cpu, ' font-weight="700"') +
      txt(597, 318, "공유: 코드·전역·힙 → race 의 씨앗", 12, C.hw, ' font-weight="700"'));

    // ---- 아래 요점 ----
    s += txt(380, 364, "There will be one stack per thread — 스택은 스레드마다, 주소 공간은 하나", 12, C.muted);
    s += '</svg>';
    return s;
  }
};
