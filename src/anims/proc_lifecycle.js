// ============================================================
// proc_lifecycle — Running / Ready / Blocked 상태 기계 위를 프로세스 A·B 가 이동
// 시간축(초): 0 둘 다 Ready → 1.5 A Scheduled → 3 A Descheduled(타이머) → 4.8 B Scheduled
//   → 6.3 B I/O: initiate(→Blocked) → 8 A Scheduled(빈 CPU 채움) → 9.8 B I/O: done(→Ready) → 14 끝
// 근거: 31_프로세스 상태 (3강 p.34~35), sims/proc_states.js
// ============================================================
window.ANIMS = window.ANIMS || {};
ANIMS["proc_lifecycle"] = {
  title: "프로세스 상태 — Running · Ready · Blocked 사이를 오가는 14초",
  desc: "Scheduled / Descheduled / I/O: initiate / I/O: done 네 화살표만 있다. B 가 Blocked 인 동안 A 가 CPU 를 쓰고, I/O 가 끝난 B 는 '''Ready''' 로 간다 ([[프로세스 상태]])",
  duration: 14,
  build: function () {
    var D = 14;
    var C = {
      a: "#1d65b3", aL: "#dbe8f7",
      b: "#2e9e4f", bL: "#dff3e4",
      cpu: "#3b2f4a", hw: "#d6465f", os: "#e09a40", muted: "#777", line: "#9aa6b8"
    };
    var ST = {
      run: ["#cdefd2", "#1d6b2a"], ready: ["#fdeec2", "#8a6000"], blocked: ["#dcdcf2", "#3c3c88"]
    };
    function r4(x) { return Math.round(x * 10000) / 10000; }
    function txt(x, y, s, size, fill, extra) {
      return '<text x="' + x + '" y="' + y + '" font-size="' + (size || 13) + '" fill="' + (fill || "#222") + '"' +
        (/text-anchor/.test(extra || "") ? "" : ' text-anchor="middle"') + (extra || "") + '>' + s + '</text>';
    }
    function show(from, to) {
      var f = r4(from / D), t = r4(to / D);
      if (from <= 0) return '<animate attributeName="opacity" values="1;1;0;0" keyTimes="0;' + t + ';' + r4(t + 0.01) + ';1" dur="' + D + 's" fill="freeze"/>';
      if (to >= D) return '<animate attributeName="opacity" values="0;0;1;1" keyTimes="0;' + f + ';' + r4(f + 0.01) + ';1" dur="' + D + 's" fill="freeze"/>';
      return '<animate attributeName="opacity" values="0;0;1;1;0;0" keyTimes="0;' + f + ';' + r4(f + 0.01) + ';' + t + ';' + r4(t + 0.01) + ';1" dur="' + D + 's" fill="freeze"/>';
    }
    function seg(from, to, inner) {
      return '<g opacity="' + (from <= 0 ? 1 : 0) + '">' + inner + show(from, to) + '</g>';
    }
    function mk(id, color) {
      return '<marker id="' + id + '" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="' + color + '"/></marker>';
    }

    // 좌표: Running (190,150) · Ready (570,150) · Blocked (380,285)
    var P = {
      desched: "M232,110 Q380,30 528,110",
      sched: "M514,178 L250,178",
      init: "M223,197 L334,262",
      done: "M426,262 L537,197"
    };

    var s = '<svg viewBox="0 0 760 370" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="프로세스 상태 전이 애니메이션">';
    s += '<defs>' + mk("pl_arrow", C.line) + mk("pl_arrow_hot", C.hw) + '</defs>';

    // ---- 단계 자막 ----
    var caps = [
      [0, 1.5, "새 프로세스는 Ready 에서 시작 — A, B 둘 다 Ready (CPU 만 주면 바로 뜀)"],
      [1.5, 3, "Scheduled: 스케줄러가 A 를 골라 CPU 에 올림 (Ready → Running)"],
      [3, 4.8, "Descheduled: 타이머 인터럽트(time slice 만료) → A 는 Ready 로"],
      [4.8, 6.3, "Scheduled: 이번엔 B 가 CPU 로 (Ready → Running)"],
      [6.3, 8, "I/O: initiate — B 가 디스크 읽기 요청 → Blocked (CPU 를 줘도 못 뜀)"],
      [8, 9.8, "B 가 기다리는 동안 CPU 를 놀리지 않는다 — A 가 Scheduled"],
      [9.8, 11.8, "I/O: done — 디스크 인터럽트 → B 는 Blocked → Ready (Running 직행 ✗)"],
      [11.8, 14, "B 는 Ready 에서 다시 스케줄러의 선택을 기다린다. A 는 계속 Running"]
    ];
    caps.forEach(function (c) { s += seg(c[0], c[1], txt(380, 26, c[2], 14, "#222", ' font-weight="700"')); });

    // ---- 전이 화살표 (기본: 회색) ----
    s += '<path d="' + P.desched + '" fill="none" stroke="' + C.line + '" stroke-width="2.5" marker-end="url(#pl_arrow)"/>';
    s += '<path d="' + P.sched + '" fill="none" stroke="' + C.line + '" stroke-width="2.5" marker-end="url(#pl_arrow)"/>';
    s += '<path d="' + P.init + '" fill="none" stroke="' + C.line + '" stroke-width="2.5" marker-end="url(#pl_arrow)"/>';
    s += '<path d="' + P.done + '" fill="none" stroke="' + C.line + '" stroke-width="2.5" marker-end="url(#pl_arrow)"/>';
    // 활성 전이만 빨갛게
    function hot(from, to, d) {
      return seg(from, to, '<path d="' + d + '" fill="none" stroke="' + C.hw + '" stroke-width="3.5" marker-end="url(#pl_arrow_hot)"/>');
    }
    s += hot(1.5, 3, P.sched) + hot(3.2, 4.8, P.desched) + hot(4.8, 6.3, P.sched) +
      hot(6.3, 8, P.init) + hot(8, 9.8, P.sched) + hot(9.8, 11.8, P.done);
    // 화살표 이름 (슬라이드 표기)
    s += txt(380, 56, "Descheduled", 13, "#444", ' font-weight="700"');
    s += txt(380, 200, "Scheduled", 13, "#444", ' font-weight="700"');
    s += txt(268, 250, "I/O: initiate", 13, "#444", ' font-weight="700" text-anchor="end"');
    s += txt(492, 250, "I/O: done", 13, "#444", ' font-weight="700" text-anchor="start"');

    // ---- 상태 원 ----
    function state(cx, cy, r, name, sub, col) {
      return '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="' + col[0] + '" stroke="' + col[1] + '" stroke-width="2.5"/>' +
        txt(cx, cy - 20, name, 15, col[1], ' font-weight="700"') +
        txt(cx, cy + (r > 50 ? 36 : 32), sub, 11, C.muted);
    }
    s += state(190, 150, 58, "Running", "CPU 위에서 실행", ST.run);
    s += state(570, 150, 58, "Ready", "ready 큐에서 대기", ST.ready);
    s += state(380, 285, 48, "Blocked", "사건 대기", ST.blocked);

    // ---- 사건 표시 ----
    // 타이머 번개 (A descheduled)
    s += '<g opacity="0"><polygon points="108,72 100,96 112,92 104,118 124,86 112,90 120,72" fill="' + C.hw + '"/>' +
      txt(128, 90, "timer!", 12, C.hw, ' font-weight="700" text-anchor="start"') +
      '<animate attributeName="opacity" values="0;0;1;0;1;0;0" keyTimes="0;' + r4(3 / D) + ';' + r4(3.15 / D) + ';' + r4(3.4 / D) + ';' + r4(3.6 / D) + ';' + r4(3.9 / D) + ';1" dur="' + D + 's" fill="freeze"/></g>';
    // 디스크 (B 의 I/O 진행)
    s += seg(7.3, 11.8, '<rect x="470" y="300" width="96" height="40" rx="6" fill="#fff" stroke="' + C.cpu + '" stroke-width="2"/>' +
      txt(518, 317, "Disk", 13, C.cpu, ' font-weight="700"') + txt(518, 333, "B 의 I/O 처리 중", 10.5, C.muted));
    s += seg(9.8, 11, '<polygon points="590,292 582,312 594,308 586,330 606,302 594,306 602,292" fill="' + C.hw + '"/>' +
      txt(612, 318, "I/O 완료 인터럽트", 12, C.hw, ' font-weight="700" text-anchor="start"'));
    // Blocked → Running 은 없다
    s += seg(10.4, D, '<rect x="84" y="290" width="200" height="30" rx="6" fill="#ffd9d9" stroke="#a52f2f"/>' +
      txt(184, 310, "Blocked → Running 직행 ✗", 13, "#a52f2f", ' font-weight="700"'));

    // ---- 프로세스 토큰 ----
    function token(label, color, motions) {
      var t = '<g><circle r="14" fill="' + color + '" stroke="#fff" stroke-width="2"/>' +
        txt(0, 5, label, 14, "#fff", ' font-weight="700"');
      motions.forEach(function (m) {
        t += '<animateMotion begin="' + m[0] + 's" dur="' + m[1] + 's" fill="freeze" path="' + m[2] + '"/>';
      });
      return t + '</g>';
    }
    // Running 안 (190,158) · Ready 안 A(546,158) B(594,158) · Blocked 안 (380,294)
    var SCHED_A = "M546,158 L514,178 L250,178 L190,158";
    var SCHED_B = "M594,158 L514,178 L250,178 L190,158";
    s += token("A", C.a, [
      [0, 1.5, "M546,158 L546,158"],
      [1.5, 1.2, SCHED_A],
      [3.4, 1.2, "M190,158 L232,110 Q380,30 528,110 L546,158"],
      [8.1, 1.2, SCHED_A]
    ]);
    s += token("B", C.b, [
      [0, 1.5, "M594,158 L594,158"],
      [4.9, 1.2, SCHED_B],
      [6.5, 1.2, "M190,158 L223,197 L334,262 L380,294"],
      [10, 1.2, "M380,294 L426,262 L537,197 L594,158"]
    ]);

    // ---- 아래 요점 ----
    s += txt(380, 364, "Blocked → Running 화살표는 없다: I/O 가 끝나면 Ready 로 가서 다시 Scheduled 를 기다린다", 12, C.muted);
    s += '</svg>';
    return s;
  }
};
