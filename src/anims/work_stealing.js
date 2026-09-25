// ============================================================
// work_stealing — MQMS 의 load imbalance 를 한가한 쪽이 훔쳐서 푼다 (7강 p.37~40)
// 시간축(초): 0 Q0={A,B,C,D}, Q1={E} → 2 E 종료 → 3.5 CPU1 idle, 4:0 불균형
//   → 5 source(Q1)가 target(Q0)을 peek → 6.5 D, C 를 steal → 8.2 2:2 균형 → 12 끝
// ============================================================
window.ANIMS = window.ANIMS || {};
ANIMS["work_stealing"] = {
  title: "work stealing — 노는 CPU 가 옆 큐에서 일을 훔쳐 온다",
  desc: "[[MQMS]] 에서 Q1 의 E 가 끝나 CPU 1 이 놀게 되면(load imbalance), 일이 적은 source 큐가 target 큐를 '''peek''' 하고, 더 차 있으면 job 을 '''steal''' 한다 → [[로드 밸런싱|균형]]",
  duration: 12,
  build: function () {
    var D = 12;
    var C = {
      a: "#1d65b3", b: "#2e9e4f", c: "#e09a40", d: "#7a4fb0", e: "#1f8a8a",
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

    var s = '<svg viewBox="0 0 760 340" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="work stealing 애니메이션">';
    s += '<defs><marker id="ws_arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="' + C.cpu + '"/></marker></defs>';

    // ---- 단계 자막 ----
    var caps = [
      [0, 2, "MQMS: CPU 마다 자기 큐 — Q0 = {A, B, C, D}, Q1 = {E}"],
      [2, 3.5, "Q1 의 E 가 끝났다 → Q1 이 텅 빈다"],
      [3.5, 5, "CPU 1 은 idle, CPU 0 은 job 4개 — load imbalance (부하 불균형)"],
      [5, 6.5, "① 일이 적은 source(Q1)가 가끔 target(Q0)을 peek 👀"],
      [6.5, 8.2, "② target 이 더 차 있다 → steal! D, C 를 Q1 으로 가져옴"],
      [8.2, 12, "Q0 = {A, B}, Q1 = {D, C} → 2 : 2 균형, 두 CPU 모두 일한다"]
    ];
    caps.forEach(function (c) { s += win(c[0], c[1], txt(380, 26, c[2], 14, "#222", ' font-weight="700"')); });

    // ---- CPU 박스 ----
    var CX = [60, 450], CW = 250;
    CX.forEach(function (x, k) {
      s += box(x, 44, CW, 64, C.cpuL, C.cpu);
      s += txt(x + 44, 81, "CPU " + k, 15, C.cpu, ' font-weight="700"');
    });
    // CPU0: 항상 A 실행 (RR, 큐 앞)
    s += '<rect x="' + (CX[0] + 96) + '" y="58" width="140" height="36" rx="18" fill="#cdefd2" stroke="#1d6b2a"/>' +
      txt(CX[0] + 166, 81, "running: Q0 의 job", 12, "#1d6b2a", ' font-weight="700"');
    // CPU1: E 실행 → idle → C 실행
    s += win(0, 2.9, '<rect x="' + (CX[1] + 96) + '" y="58" width="140" height="36" rx="18" fill="#cdefd2" stroke="#1d6b2a"/>' +
      txt(CX[1] + 166, 81, "running: E", 12, "#1d6b2a", ' font-weight="700"'));
    s += '<g opacity="0"><rect x="' + (CX[1] + 96) + '" y="58" width="140" height="36" rx="18" fill="#ffd9d9" stroke="#a52f2f"/>' +
      txt(CX[1] + 166, 81, "idle 💤", 13, "#a52f2f", ' font-weight="700"') +
      kf("opacity", [[2.9, 0], [2.95, 1], [3.8, 1], [4.1, 0.4], [4.4, 1], [4.7, 0.4], [5, 1], [8.1, 1], [8.15, 0]]) + '</g>';
    s += win(8.15, 12, '<rect x="' + (CX[1] + 96) + '" y="58" width="140" height="36" rx="18" fill="#cdefd2" stroke="#1d6b2a"/>' +
      txt(CX[1] + 166, 81, "running: Q1 의 job", 12, "#1d6b2a", ' font-weight="700"'));

    // CPU ↔ 큐 연결선
    s += '<path d="M185,108 L185,132 M575,108 L575,132" stroke="' + C.line + '" stroke-width="3"/>';

    // ---- 큐 ----
    var QY = 132, QH = 58, SW = 50, GAP = 8;
    function slot(qi, i) { return CX[qi] + 14 + i * (SW + GAP); }
    [0, 1].forEach(function (qi) {
      s += box(CX[qi], QY, CW, QH, "#fff", C.line);
      s += txt(CX[qi] - 22, QY + 34, "Q" + qi, 14, C.cpu, ' font-weight="700"');
    });
    // job 블록
    function job(name, color, fr, opFr) {
      var g = '<g>';
      g += '<rect x="0" y="0" width="' + SW + '" height="38" rx="6" fill="' + color + '"/>';
      g += txt(SW / 2, 25, name, 15, "#fff", ' font-weight="700"');
      g += mv(fr);
      if (opFr) g += kf("opacity", opFr);
      g += '</g>';
      return g;
    }
    var JY = QY + 10;
    s += job("A", C.a, [[0, slot(0, 0), JY]]);
    s += job("B", C.b, [[0, slot(0, 1), JY]]);
    // D: 6.6~7.3 에 Q0 슬롯3 → Q1 슬롯0 (위로 호를 그리며)
    s += job("D", C.d, [[0, slot(0, 3), JY], [6.6, slot(0, 3), JY], [6.95, 390, 104], [7.3, slot(1, 0), JY]]);
    // C: 7.4~8.1 에 Q0 슬롯2 → Q1 슬롯1
    s += job("C", C.c, [[0, slot(0, 2), JY], [7.4, slot(0, 2), JY], [7.75, 400, 104], [8.1, slot(1, 1), JY]]);
    // E: 진행 후 사라짐
    s += job("E", C.e, [[0, slot(1, 0), JY]], [[0, 1], [2.6, 1], [2.9, 0]]);
    // E 진행 막대
    s += '<rect x="' + slot(1, 0) + '" y="' + (JY + 42) + '" width="0" height="4" fill="' + C.e + '">' +
      kf("width", [[0, 10], [2.6, 50]]) + kf("opacity", [[2.6, 1], [2.9, 0]]) + '</rect>';
    s += win(2.6, 3.8, txt(slot(1, 0) + 25, QY - 6, "E 종료 ✔", 12, C.e, ' font-weight="700"'));
    // Q1 비었을 때 표시
    s += win(2.95, 7.3, txt(CX[1] + 125, QY + 36, "(비어 있음)", 13, C.muted));

    // ---- peek / steal 화살표 ----
    s += win(5, 6.6, '<path d="M' + (CX[1] + 10) + ',' + (QY + 20) + ' C400,' + (QY - 4) + ' 360,' + (QY - 4) + ' 312,' + (QY + 20) + '" fill="none" stroke="' + C.cpu + '" stroke-width="2.5" stroke-dasharray="6 4" marker-end="url(#ws_arrow)"/>' +
      txt(380, QY - 10, "👀 peek", 13, C.cpu, ' font-weight="700"'));
    s += win(6.5, 8.2, txt(380, QY + 76, "steal!", 15, C.hw, ' font-weight="700"'));
    s += win(5, 12, txt(CX[1] + 125, QY + QH + 18, "source (일 적은 쪽, 주도)", 11, C.muted));
    s += win(5, 12, txt(CX[0] + 125, QY + QH + 18, "target (더 차 있음)", 11, C.muted));

    // ---- 부하 막대 ----
    var BY = 256;
    s += txt(380, BY - 10, "큐 길이 (load)", 12, C.muted);
    [0, 1].forEach(function (qi) {
      s += '<rect x="' + CX[qi] + '" y="' + BY + '" width="' + CW + '" height="18" rx="4" fill="#f1f1f1" stroke="#ddd"/>';
    });
    s += '<rect x="' + CX[0] + '" y="' + BY + '" width="240" height="18" rx="4" fill="' + C.cpu + '" opacity="0.75">' +
      kf("width", [[0, 240], [6.6, 240], [6.65, 180], [7.4, 180], [7.45, 120]]) + '</rect>';
    s += '<rect x="' + CX[1] + '" y="' + BY + '" width="60" height="18" rx="4" fill="' + C.cpu + '" opacity="0.75">' +
      kf("width", [[0, 60], [2.9, 60], [2.95, 0], [7.3, 0], [7.35, 60], [8.1, 60], [8.15, 120]]) + '</rect>';
    // 숫자
    s += win(0, 6.65, txt(CX[0] + CW + 18, BY + 14, "4", 14, C.cpu, ' font-weight="700"'));
    s += win(6.65, 7.45, txt(CX[0] + CW + 18, BY + 14, "3", 14, C.cpu, ' font-weight="700"'));
    s += win(7.45, 12, txt(CX[0] + CW + 18, BY + 14, "2", 14, C.cpu, ' font-weight="700"'));
    s += win(0, 2.95, txt(CX[1] + CW + 18, BY + 14, "1", 14, C.cpu, ' font-weight="700"'));
    s += win(2.95, 7.35, txt(CX[1] + CW + 18, BY + 14, "0", 14, C.hw, ' font-weight="700"'));
    s += win(7.35, 8.15, txt(CX[1] + CW + 18, BY + 14, "1", 14, C.cpu, ' font-weight="700"'));
    s += win(8.15, 12, txt(CX[1] + CW + 18, BY + 14, "2", 14, C.cpu, ' font-weight="700"'));
    // 판정
    s += win(3.5, 8.15, '<rect x="310" y="' + (BY + 26) + '" width="140" height="24" rx="12" fill="#ffd9d9" stroke="#a52f2f"/>' +
      txt(380, BY + 43, "4 : 0 ⚠ 불균형", 13, "#a52f2f", ' font-weight="700"'));
    s += win(8.15, 12, '<rect x="310" y="' + (BY + 26) + '" width="140" height="24" rx="12" fill="' + C.okL + '" stroke="' + C.ok + '"/>' +
      txt(380, BY + 43, "2 : 2 ✔ 균형", 13, C.ok, ' font-weight="700"'));

    // ---- 아래 요점 ----
    s += txt(380, 330, "한가한 쪽이 주도한다 · 훔친 job 은 cache affinity 를 잃는다 · 얼마나 자주 peek 할지는 black art", 12, C.muted);
    s += '</svg>';
    return s;
  }
};
