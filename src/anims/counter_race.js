// ============================================================
// counter_race — counter = counter + 1 의 lost update (8강 p.39~40 표 그대로)
// 시간축(초): 0 counter=50 → 1.2 T1 load(50) → 2.6 T1 add(51) → 4 interrupt: T1 저장, T2 복원
//   → 5.4 T2 load(50) → 6.6 T2 add(51) → 7.8 T2 store(51) → 9 interrupt: T2 저장, T1 복원
//   → 10.2 T1 store(51) → 11.4 결과 51 ≠ 52 → 14 끝
// ============================================================
window.ANIMS = window.ANIMS || {};
ANIMS["counter_race"] = {
  title: "counter++ 의 lost update — 두 번 더했는데 51",
  desc: "counter = counter + 1 은 '''mov / add / mov''' 세 명령어. T1 의 add 직후 [[타이머 인터럽트|interrupt]] 가 끼면 T2 가 옛 값 50 을 읽고, 복귀한 T1 이 자기 eax(51)로 덮어쓴다 → [[race condition]]",
  duration: 14,
  build: function () {
    var D = 14;
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
    // 시간에 따라 바뀌는 값: [[from, to, 문자열, 색], …]
    function seq(x, y, items, size, extra) {
      var o = "";
      items.forEach(function (it) { o += win(it[0], it[1], txt(x, y, it[2], size, it[3], extra)); });
      return o;
    }

    var s = '<svg viewBox="0 0 760 360" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="counter race condition 애니메이션">';
    s += '<defs><marker id="cr_arrow_a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="' + C.a + '"/></marker>' +
      '<marker id="cr_arrow_b" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="' + C.b + '"/></marker></defs>';

    // ---- 단계 자막 ----
    var caps = [
      [0, 1.2, "counter = 50 에서 T1, T2 가 counter = counter + 1 을 한 번씩 → 기대 52"],
      [1.2, 2.6, "T1: mov — counter(50)를 eax 로 load → T1.eax = 50"],
      [2.6, 4, "T1: add — eax = 51 (아직 메모리엔 안 씀)"],
      [4, 5.4, "⚡ interrupt → T1 의 eax=51, PC=108 을 TCB(T1)에 저장, T2 복원"],
      [5.4, 6.6, "T2: mov — 메모리는 아직 50 → T2.eax = 50"],
      [6.6, 7.8, "T2: add — T2.eax = 51"],
      [7.8, 9, "T2: mov — store → counter = 51"],
      [9, 10.2, "⚡ interrupt → T2 저장, T1 복원: PC=108, eax=51 (아까 저장한 값)"],
      [10.2, 11.4, "T1: mov — 낡은 51 을 store → counter = 51"],
      [11.4, 14, "결과 51 ≠ 52 — T2 의 +1 이 T1 의 늦은 store 에 덮여 사라졌다 (lost update)"]
    ];
    caps.forEach(function (c) { s += win(c[0], c[1], txt(380, 26, c[2], 14, "#222", ' font-weight="700"')); });

    // ---- 왼쪽: 실행 순서 표 ----
    s += box(14, 42, 424, 262, "#fff", C.line);
    s += '<rect x="20" y="48" width="200" height="22" rx="5" fill="' + C.aL + '"/>' + txt(120, 64, "Thread 1", 13, C.a, ' font-weight="700"');
    s += '<rect x="232" y="48" width="200" height="22" rx="5" fill="' + C.bL + '"/>' + txt(332, 64, "Thread 2", 13, C.b, ' font-weight="700"');
    var rows = [
      [1.2, "T1", "mov 0x8049a1c, %eax"],
      [2.6, "T1", "add $0x1, %eax"],
      [4.0, "INT", "⚡ interrupt: save T1 → restore T2"],
      [5.4, "T2", "mov 0x8049a1c, %eax"],
      [6.6, "T2", "add $0x1, %eax"],
      [7.8, "T2", "mov %eax, 0x8049a1c"],
      [9.0, "INT", "⚡ interrupt: save T2 → restore T1"],
      [10.2, "T1", "mov %eax, 0x8049a1c"],
      [11.4, "RES", "결과 counter = 51 (기대 52) ✘"]
    ];
    function rowY(i) { return 90 + i * 23; }
    // 현재 줄 강조 막대
    var barFr = [[0, 20, rowY(0) - 17]];
    rows.forEach(function (r, i) { barFr.push([r[0] - 0.05, 20, rowY(Math.max(0, i - 1)) - 17]); barFr.push([r[0], 20, rowY(i) - 17]); });
    s += '<g opacity="0"><rect x="0" y="0" width="412" height="22" rx="5" fill="#fff6c9" stroke="#e0c040"/>' + mv(barFr) + show(1.2, 14) + '</g>';
    rows.forEach(function (r, i) {
      var y = rowY(i), inner;
      if (r[1] === "T1") inner = txt(120, y, r[2], 12, C.a, ' font-family="monospace" font-weight="700"');
      else if (r[1] === "T2") inner = txt(332, y, r[2], 12, C.b, ' font-family="monospace" font-weight="700"');
      else if (r[1] === "INT") inner = txt(226, y, r[2], 12, C.hw, ' font-weight="700"');
      else inner = txt(226, y, r[2], 13, C.hw, ' font-weight="700"');
      s += win(r[0], 14, inner);
    });
    s += txt(226, 298, "PC 100 → 105 → 108 → 113 (x86 명령어 길이가 가변)", 10, C.muted);

    // ---- 오른쪽 위: 공유 메모리 ----
    s += box(520, 42, 160, 64, C.osL, C.os);
    s += txt(600, 58, "공유 메모리  counter", 11, "#8a6000", ' font-weight="700"');
    s += txt(600, 72, "@ 0x8049a1c", 10, C.muted, ' font-family="monospace"');
    s += seq(600, 99, [[0, 7.8, "50", "#222"], [7.8, 14, "51", "#222"]], 22, ' font-weight="700" font-family="monospace"');
    s += '<rect x="517" y="39" width="166" height="70" rx="10" fill="none" stroke="' + C.hw + '" stroke-width="3" opacity="0">' +
      kf("opacity", [[7.8, 0], [7.85, 1], [8.6, 0], [10.2, 0], [10.25, 1], [11, 0], [11.4, 0], [11.45, 1]]) + '</rect>';
    s += win(11.4, 14, txt(600, 126, "✘ 기대 52 → 결과 51", 12, C.hw, ' font-weight="700"'));

    // ---- 스레드 레지스터 상자 ----
    function thread(x, name, col, colL, statusFr, eaxItems, pcItems, runWin) {
      var g = '<g>';
      g += box(x, 140, 140, 110, colL, col);
      g += txt(x + 70, 160, name, 14, col, ' font-weight="700"');
      g += '</g>';
      // 상태 배지
      runWin.forEach(function (w) {
        g += win(w[0], w[1], '<rect x="' + (x + 30) + '" y="168" width="80" height="20" rx="10" fill="' + (w[2] ? "#cdefd2" : "#fdeec2") + '" stroke="' + (w[2] ? "#1d6b2a" : "#8a6000") + '"/>' +
          txt(x + 70, 182, w[2] ? "running" : "ready", 11, w[2] ? "#1d6b2a" : "#8a6000", ' font-weight="700"'));
      });
      g += seq(x + 70, 216, eaxItems, 15, ' font-weight="700" font-family="monospace"');
      g += seq(x + 70, 240, pcItems, 12, ' font-family="monospace"');
      return g;
    }
    s += thread(452, "Thread 1", C.a, C.aL, null,
      [[0, 1.2, "eax = 0", "#222"], [1.2, 2.6, "eax = 50", C.a], [2.6, 14, "eax = 51", C.a]],
      [[0, 1.2, "PC = 100", "#444"], [1.2, 2.6, "PC = 105", "#444"], [2.6, 10.2, "PC = 108", "#444"], [10.2, 14, "PC = 113", "#444"]],
      [[0, 4, true], [4, 9, false], [9, 14, true]]);
    s += thread(604, "Thread 2", C.b, C.bL, null,
      [[0, 5.4, "eax = 0", "#222"], [5.4, 6.6, "eax = 50", C.b], [6.6, 14, "eax = 51", C.b]],
      [[0, 5.4, "PC = 100", "#444"], [5.4, 6.6, "PC = 105", "#444"], [6.6, 7.8, "PC = 108", "#444"], [7.8, 14, "PC = 113", "#444"]],
      [[0, 4, false], [4, 9, true], [9, 14, false]]);
    // 쉬는 스레드는 흐리게 (레지스터는 TCB 안에 있음)
    s += '<rect x="450" y="138" width="144" height="114" rx="9" fill="#fff" opacity="0">' + kf("opacity", [[4, 0], [4.05, 0.5], [9, 0.5], [9.05, 0]]) + '</rect>';
    s += '<rect x="602" y="138" width="144" height="114" rx="9" fill="#fff" opacity="0.5">' + kf("opacity", [[0, 0.5], [4, 0.5], [4.05, 0], [9, 0], [9.05, 0.5]]) + '</rect>';

    // ---- TCB 저장 표시 ----
    s += win(4, 9, box(452, 262, 140, 40, "#fff", C.a, ' stroke-dasharray="5 3"') +
      txt(522, 278, "TCB(T1) 에 저장", 11, C.a, ' font-weight="700"') + txt(522, 294, "eax=51, PC=108", 11, "#222", ' font-family="monospace"'));
    s += win(9, 14, box(604, 262, 140, 40, "#fff", C.b, ' stroke-dasharray="5 3"') +
      txt(674, 278, "TCB(T2) 에 저장", 11, C.b, ' font-weight="700"') + txt(674, 294, "eax=51, PC=113", 11, "#222", ' font-family="monospace"'));
    s += win(9, 10.2, txt(522, 278, "↑ 복원: eax=51", 12, C.a, ' font-weight="700"'));

    // ---- load / store 화살표 ----
    function arrow(x, up, col, mk, from, to, label) {
      var d = up ? 'M' + x + ',138 L' + x + ',110' : 'M' + x + ',108 L' + x + ',136';
      return win(from, to, '<path d="' + d + '" stroke="' + col + '" stroke-width="3" marker-end="url(#' + mk + ')"/>' +
        txt(x + (x < 600 ? -8 : 8), 126, label, 11, col, ' font-weight="700" text-anchor="' + (x < 600 ? "end" : "start") + '"'));
    }
    s += arrow(522, false, C.a, "cr_arrow_a", 1.2, 2.6, "load 50");
    s += arrow(674, false, C.b, "cr_arrow_b", 5.4, 6.6, "load 50");
    s += arrow(674, true, C.b, "cr_arrow_b", 7.8, 9, "store 51");
    s += arrow(522, true, C.a, "cr_arrow_a", 10.2, 11.4, "store 51");

    // ---- 아래 요점 ----
    s += txt(380, 336, "eax 는 스레드마다 따로(TCB), counter 는 공유 메모리 — 이 비대칭이 lost update 를 만든다", 12, C.muted);
    s += txt(380, 353, "load~store 사이에 다른 스레드의 load 가 끼면 결과는 indeterminate", 11, C.muted);
    s += '</svg>';
    return s;
  }
};
