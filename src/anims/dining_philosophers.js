// ============================================================
// dining_philosophers — 식사하는 철학자 데드락과 P4 순서 바꾸기 해결 (10강 p.57–62)
// 시간축(초): 0~6.95 ① broken getforks(): 모두 left 포크 획득 → right 대기 → circular wait → deadlock
//   6.95~14 ② p.61 해결: P4 만 right → left. P0~P3 left 획득, P4 는 f0 대기(포크 0개)
//   → P3 가 f4 까지 잡고 eat → putforks → P2 가 f3 → eat → P1 이 f2 → eat
// 배치는 슬라이드 그대로: P1 위, f1 오른쪽 위, P0 오른쪽, f0 오른쪽 아래, P4 오른쪽 아래, f4 아래 ...
// left(p) = p, right(p) = (p + 1) % 5
// ============================================================
window.ANIMS = window.ANIMS || {};
ANIMS["dining_philosophers"] = {
  title: "Dining Philosophers — 다섯 명이 왼쪽 포크만 들면 데드락, P4 만 순서를 바꾸면 풀린다",
  desc: "포크마다 [[세마포어]] 하나(초기값 1). 모두 sem_wait(forks[left(p)]) 부터 하면 각자 포크 하나를 쥔 채 오른쪽을 기다리는 circular wait → [[데드락]]. P4 만 right → left 로 바꾸면 cycle 이 깨진다",
  duration: 14,
  build: function () {
    var C = {
      cpu: "#3b2f4a", cpuL: "#efe9f6",
      hw: "#d6465f", muted: "#777",
      runF: "#cdefd2", runS: "#1d6b2a",
      blkF: "#dcdcf2", blkS: "#3c3c88"
    };
    var D = 14;
    function box(x, y, w, h, fill, stroke, extra) {
      return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="6" fill="' + fill + '" stroke="' + stroke + '" stroke-width="1.5"' + (extra || "") + '/>';
    }
    function txt(x, y, s, size, fill, extra) {
      var anchor = /text-anchor/.test(extra || "") ? "" : ' text-anchor="middle"';
      return '<text x="' + x + '" y="' + y + '" font-size="' + (size || 13) + '" fill="' + (fill || "#222") + '"' + anchor + (extra || "") + '>' + s + '</text>';
    }
    function r3(v) { return Math.round(v * 1000) / 1000; }
    function show(from, to) {
      return '<animate attributeName="opacity" values="0;0;1;1;0;0" keyTimes="0;' + r3(from / D) + ';' + r3(from / D + 0.003) + ';' + r3(to / D) + ';' + r3(Math.min(1, to / D + 0.003)) + ';1" dur="' + D + 's" fill="freeze"/>';
    }
    function during(from, to, inner) { return '<g opacity="0">' + inner + show(from, to) + '</g>'; }

    // ---- 기하 ----
    var CX = 240, CY = 194, R = 112, RF = 64;
    var PANG = { 0: -18, 1: -90, 2: 198, 3: 126, 4: 54 };   // 철학자 각도(도)
    var FANG = { 0: 18, 1: -54, 2: 234, 3: 162, 4: 90 };    // 포크 각도
    function pt(ang, r) { var a = ang * Math.PI / 180; return [r3(CX + r * Math.cos(a)), r3(CY + r * Math.sin(a))]; }
    function wrap(d) { if (d > 180) d -= 360; if (d < -180) d += 360; return d; }
    // 포크 f 를 철학자 p 가 들었을 때의 이동량 (p < 0 이면 테이블 위 제자리)
    function held(f, p) {
      if (p < 0) return [0, 0];
      var fa = FANG[f], pa = PANG[p], d = wrap(fa - pa);
      var tp = pt(pa + d * 0.5, 84), fp = pt(fa, RF);
      return [r3(tp[0] - fp[0]), r3(tp[1] - fp[1])];
    }

    // ---- 포크 타임라인: [시작, 이동시간, 보유자(-1=테이블)] ----
    var EV = {};
    for (var i = 0; i < 5; i++) EV[i] = [[1.0, 0.8, i], [6.95, 0.05, -1]];
    [0, 1, 2, 3].forEach(function (f) { EV[f].push([8.0, 0.5, f]); });
    EV[4].push([9.0, 0.5, 3]);
    EV[3].push([10.6, 0.3, -1]); EV[4].push([10.6, 0.3, -1]);
    EV[3].push([10.95, 0.4, 2]);
    EV[2].push([12.4, 0.3, -1]); EV[3].push([12.4, 0.3, -1]);
    EV[2].push([12.75, 0.4, 1]);
    function sorted(f) { return EV[f].slice().sort(function (x, y) { return x[0] - y[0]; }); }

    var s = '<svg viewBox="0 0 760 380" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Dining Philosophers 애니메이션">';
    s += '<defs><marker id="dp_arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="' + C.hw + '"/></marker>' +
      '<marker id="dp_arrow2" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="' + C.blkS + '"/></marker></defs>';

    // ---- 단계 자막 ----
    [
      [0, 1.0, "철학자 5명, 포크 5개 — 포크마다 세마포어 하나 (초기값 1)"],
      [1.0, 2.4, "모두 동시에 sem_wait(forks[left(p)]) → 각자 왼쪽 포크 획득 (1 → 0)"],
      [2.4, 3.8, "다음 줄 sem_wait(forks[right(p)]) — 오른쪽 포크는 이웃이 쥐고 있다 → 대기"],
      [3.8, 6.95, "모두 왼쪽 포크를 든 채 오른쪽을 기다림 → circular wait → deadlock"],
      [6.95, 8.0, "해결 (p.61): P4 만 right → left 순서로 포크를 든다"],
      [8.0, 9.0, "P0~P3 는 왼쪽 포크 획득, P4 는 오른쪽 f0 부터 → P0 가 쥐고 있어 포크 없이 대기"],
      [9.0, 10.6, "P4 가 f4 를 안 잡았으므로 f4 는 비어 있음 → P3 가 f4 까지 잡고 eat()"],
      [10.6, 12.4, "P3 putforks() → f3 반환 → P2 가 f3 을 잡고 eat()"],
      [12.4, 14, "P2 putforks() → P1 이 f2 로 eat() — 한 명이 순서를 바꾸면 cycle of waiting 이 깨진다"]
    ].forEach(function (c) { s += during(c[0], c[1], txt(380, 24, c[2], 13, "#222", ' font-weight="700"')); });

    // ---- 단계 라벨 (왼쪽 위) ----
    s += during(0, 6.95, txt(16, 52, "① Broken solution", 12, C.hw, ' font-weight="700" text-anchor="start"'));
    s += during(6.95, D, txt(16, 52, "② P4 순서 바꾸기", 12, C.runS, ' font-weight="700" text-anchor="start"'));

    // ---- 테이블 ----
    s += '<circle cx="' + CX + '" cy="' + CY + '" r="80" fill="' + C.cpuL + '" stroke="#c9bfd8" stroke-width="2"/>';

    // ---- circular wait 고리 (① 3.8~6.95): p 는 p+1 이 쥔 f(p+1) 을 기다림 ----
    var ring = "";
    for (var p = 0; p < 5; p++) {
      var q = (p + 1) % 5;
      var d = wrap(PANG[q] - PANG[p]), sgn = d > 0 ? 1 : -1;
      var st = pt(PANG[p] + sgn * 14, R + 22), en = pt(PANG[q] - sgn * 14, R + 22);
      ring += '<path d="M' + st[0] + ',' + st[1] + ' A' + (R + 22) + ',' + (R + 22) + ' 0 0,' + (sgn > 0 ? 1 : 0) + ' ' + en[0] + ',' + en[1] + '" fill="none" stroke="' + C.hw + '" stroke-width="2.5" stroke-dasharray="6 4" marker-end="url(#dp_arrow)">' +
        '<animate attributeName="stroke-dashoffset" values="20;0" dur="0.8s" repeatCount="indefinite"/></path>';
    }
    ring += txt(CX, CY + 18, "circular wait → deadlock", 12, C.hw, ' font-weight="700"');
    s += during(3.8, 6.95, ring);

    // ---- 포크 ----
    for (var f = 0; f < 5; f++) {
      var a = pt(FANG[f], RF - 14), b = pt(FANG[f], RF + 14), lp = pt(FANG[f], RF - 30);
      var vals = ["0,0"], kts = ["0"], cur = held(f, -1);
      sorted(f).forEach(function (e) {
        var nx = held(f, e[2]);
        vals.push(cur.join(",")); kts.push(r3(e[0] / D));
        vals.push(nx.join(",")); kts.push(r3((e[0] + e[1]) / D));
        cur = nx;
      });
      vals.push(cur.join(",")); kts.push("1");
      s += '<g><line x1="' + a[0] + '" y1="' + a[1] + '" x2="' + b[0] + '" y2="' + b[1] + '" stroke="' + C.cpu + '" stroke-width="5" stroke-linecap="round"/>' +
        txt(lp[0], r3(lp[1] + 4), "f" + f, 12, C.cpu, ' font-weight="700"') +
        '<animateTransform attributeName="transform" type="translate" values="' + vals.join(";") + '" keyTimes="' + kts.join(";") + '" dur="' + D + 's" fill="freeze"/></g>';
    }

    // ---- 철학자 (상태 색: t=think 흰색 / b=blocked / r=running) ----
    var ST = {
      0: [[0, "t"], [2.4, "b"], [6.95, "t"], [8.5, "b"]],
      1: [[0, "t"], [2.4, "b"], [6.95, "t"], [8.5, "b"], [13.15, "r"]],
      2: [[0, "t"], [2.4, "b"], [6.95, "t"], [8.5, "b"], [11.35, "r"], [12.4, "t"]],
      3: [[0, "t"], [2.4, "b"], [6.95, "t"], [8.5, "b"], [9.5, "r"], [10.6, "t"]],
      4: [[0, "t"], [2.4, "b"], [6.95, "t"], [8.5, "b"]]
    };
    var FILL = { t: "#fff", b: C.blkF, r: C.runF }, STROKE = { t: "#888", b: C.blkS, r: C.runS };
    function discrete(attr, list, map) {
      var v = list.map(function (e) { return map[e[1]]; }), k = list.map(function (e) { return r3(e[0] / D); });
      return '<animate attributeName="' + attr + '" calcMode="discrete" values="' + v.join(";") + '" keyTimes="' + k.join(";") + '" dur="' + D + 's" fill="freeze"/>';
    }
    for (p = 0; p < 5; p++) {
      var c = pt(PANG[p], R);
      s += '<circle cx="' + c[0] + '" cy="' + c[1] + '" r="22" fill="#fff" stroke="#888" stroke-width="2.5">' +
        discrete("fill", ST[p], FILL) + discrete("stroke", ST[p], STROKE) + '</circle>';
      s += txt(c[0], r3(c[1] + 5), "P" + p, 14, C.cpu, ' font-weight="700"');
    }

    // ---- 상태 배지 ----
    function badge(p, from, to, label, kind) {
      var c = pt(PANG[p], R), w = 0, x, y;
      for (var j = 0; j < label.length; j++) w += label.charCodeAt(j) > 255 ? 11 : 6.5;
      w = Math.round(w + 14);
      if (p === 1) { x = c[0] - w / 2; y = c[1] - 48; }
      else if (p === 0 || p === 4) { x = c[0] + 28; y = c[1] - 10; }
      else { x = c[0] - 28 - w; y = c[1] - 10; }
      var F = kind === "r" ? C.runF : kind === "b" ? C.blkF : "#f2f2f2", S = kind === "r" ? C.runS : kind === "b" ? C.blkS : C.muted;
      return during(from, to, box(r3(x), r3(y), w, 20, F, S) + txt(r3(x + w / 2), r3(y + 14), label, 11, S, ' font-weight="700"'));
    }
    for (p = 0; p < 5; p++) s += badge(p, 2.4, 6.95, "f" + ((p + 1) % 5) + " 대기", "b");
    s += badge(0, 8.5, D, "f1 대기", "b");
    s += badge(1, 8.5, 13.15, "f2 대기", "b");
    s += badge(1, 13.15, D, "eat()", "r");
    s += badge(2, 8.5, 11.35, "f3 대기", "b");
    s += badge(2, 11.35, 12.4, "eat()", "r");
    s += badge(2, 12.4, D, "think", "t");
    s += badge(3, 9.5, 10.6, "eat()", "r");
    s += badge(3, 10.6, D, "think", "t");
    s += badge(4, 8.5, D, "f0 대기 (포크 0개)", "b");

    // P4 → f0 요청 화살표 (② 8.0~14)
    var p4 = pt(PANG[4] - 12, R - 22), f0p = pt(FANG[0] + 4, RF + 20);
    s += during(8.0, D, '<path d="M' + p4[0] + ',' + p4[1] + ' L' + f0p[0] + ',' + f0p[1] + '" stroke="' + C.blkS + '" stroke-width="2" stroke-dasharray="4 3" fill="none" marker-end="url(#dp_arrow2)"/>');

    // ---- 오른쪽: 코드 ----
    var PX = 500, PW = 245;
    s += box(PX, 44, PW, 172, "#fafafa", "#ccc");
    function code(y, line) { return txt(PX + 12, y, line, 12, "#222", ' font-family="monospace" text-anchor="start" xml:space="preserve"'); }
    // ① broken
    var c1 = txt(PX + 12, 62, "getforks() — Broken (p.59)", 11, C.hw, ' font-weight="700" text-anchor="start"');
    c1 += during(1.0, 2.4, '<rect x="' + (PX + 6) + '" y="87" width="' + (PW - 12) + '" height="18" rx="3" fill="#fdeec2"/>');
    c1 += during(2.4, 6.95, '<rect x="' + (PX + 6) + '" y="107" width="' + (PW - 12) + '" height="18" rx="3" fill="' + C.blkF + '"/>');
    c1 += code(82, "void getforks() {") + code(100, "  sem_wait(forks[left(p)]);") + code(120, "  sem_wait(forks[right(p)]);") + code(138, "}");
    c1 += during(2.4, 6.95, txt(PX + 12, 166, "다섯 명 모두 이 줄에서 멈춤 (right 대기)", 11, C.blkS, ' font-weight="700" text-anchor="start"'));
    s += '<g>' + c1 + '<animate attributeName="opacity" values="1;1;0;0" keyTimes="0;' + r3(6.95 / D) + ';' + r3(6.97 / D) + ';1" dur="' + D + 's" fill="freeze"/></g>';
    // ② fix
    var c2 = txt(PX + 12, 62, "getforks() — P4 만 순서 반대 (p.61)", 11, C.runS, ' font-weight="700" text-anchor="start"');
    c2 += '<rect x="' + (PX + 6) + '" y="87" width="' + (PW - 12) + '" height="36" rx="3" fill="#ffd9d9"/>';
    c2 += code(82, "if (p == 4) {") + code(100, "  sem_wait(forks[right(p)]);") + code(118, "  sem_wait(forks[left(p)]);") +
      code(136, "} else {") + code(154, "  sem_wait(forks[left(p)]);") + code(172, "  sem_wait(forks[right(p)]);") + code(190, "}");
    c2 += txt(PX + PW - 10, 82, "← P4 만", 11, C.hw, ' font-weight="700" text-anchor="end"');
    s += during(6.95, D, c2);

    // ---- 오른쪽: 세마포어 값 ----
    s += txt(PX, 240, "sem_t forks[5] 값 (1 = 테이블 위, 0 = 누가 쥠)", 11, C.muted, ' text-anchor="start"');
    for (f = 0; f < 5; f++) {
      var x = PX + f * 49;
      s += box(x, 250, 44, 50, "#fff", "#bbb");
      s += txt(x + 22, 266, "f" + f, 11, C.muted);
      var segs = [[0, -1]];
      sorted(f).forEach(function (e) { segs.push([e[0] + e[1], e[2]]); });
      for (var k = 0; k < segs.length; k++) {
        var t0 = segs[k][0], t1 = k + 1 < segs.length ? segs[k + 1][0] : D, h = segs[k][1];
        var inner = txt(x + 22, 284, h < 0 ? "1" : "0", 14, h < 0 ? C.runS : C.hw, ' font-weight="700"') +
          txt(x + 22, 297, h < 0 ? "free" : "P" + h, 10, C.muted);
        s += during(t0, t1, inner);
      }
    }

    // ---- 요점 ----
    s += txt(380, 354, "데드락 4조건 중 circular wait 를 깨는 것 = lock ordering", 13, C.cpu, ' font-weight="700"');
    s += txt(380, 373, "P4 는 포크를 하나도 안 쥔 채 기다리므로 대기 사슬 P0→P1→P2→P3→P4→P0 의 고리가 끊긴다", 12, C.muted);
    s += '</svg>';
    return s;
  }
};
