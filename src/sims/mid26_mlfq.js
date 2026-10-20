// mid26_mlfq — 2026F 중간고사 Problem 5 (MLFQ trace) 를 시험지 규칙 그대로 1 단위씩 시뮬레이션
// 규칙: Q0/Q1/Q2 slice 2/4/8, 새 작업은 Q0 꼬리, 슬라이스를 다 쓰면 한 단계 아래 꼬리(Q2 는 Q2 꼬리) + fresh slice,
//       슬라이스 전 I/O 블록은 우선순위 유지, I/O 완료 시 같은 큐 꼬리 + fresh slice,
//       상위 도착은 즉시 선점, 선점당한 작업은 자기 큐 head 에서 남은 슬라이스로 재개, boost 없음.
// 작업: A(0, CPU 6) / B(0, CPU 1, I/O 3, CPU 1, I/O 3, CPU 1) / C(4, CPU 2)
// 정답: [0,2)A [2,3)B [3,4)A [4,6)C [6,7)B [7,10)A [10,11)B → B response 2, A 10, C 6, B 의 큐 Q0·Q0
(function (global) {
  "use strict";
  global.SIMS = global.SIMS || {};

  var SLICE = [2, 4, 8];
  var COLOR = { A: "#1d65b3", B: "#2e9e4f", C: "#e09a40" };
  var JOBS = [
    { id: "A", arrival: 0, bursts: [{ cpu: 6 }] },
    { id: "B", arrival: 0, bursts: [{ cpu: 1, io: 3 }, { cpu: 1, io: 3 }, { cpu: 1 }] },
    { id: "C", arrival: 4, bursts: [{ cpu: 2 }] }
  ];
  var RULES = [
    "Q0 (slice 2) > Q1 (slice 4) > Q2 (slice 8), 가장 높은 비어 있지 않은 큐의 head 실행",
    "새 작업: Q0 꼬리 (t=0 에 A 가 B 앞)",
    "슬라이스를 다 씀 + 미완료 → 한 단계 아래 큐 꼬리, fresh slice (Q2 는 Q2 꼬리)",
    "슬라이스 전에 I/O 로 블록 → 우선순위 유지, I/O 완료 시 같은 큐 꼬리 + fresh slice",
    "상위 도착 → 즉시 선점. 선점당한 작업은 자기 큐 head, 남은 슬라이스로 재개",
    "같은 시각의 도착·I/O 완료는 선택 전에 반영, I/O 는 CPU 와 겹침, boost 없음"
  ];

  function simulate() {
    var J = {};
    JOBS.forEach(function (j) {
      J[j.id] = { id: j.id, arrival: j.arrival, bursts: j.bursts, bi: 0, left: j.bursts[0].cpu,
        lvl: 0, slice: SLICE[0], ioUntil: null, state: "도착 전", first: null, done: null, ioLevels: [] };
    });
    var Q = [[], [], []], gantt = [], frames = [], t = 0, running = null;

    function qstr(i) { return Q[i].length ? Q[i].join(" ") : "—"; }
    function snap(desc) {
      frames.push({ t: t, desc: desc, Q: [qstr(0), qstr(1), qstr(2)], J: JSON.parse(JSON.stringify(J)), gantt: gantt.slice() });
    }

    var finished = 0, guard = 0;
    while (finished < JOBS.length && guard++ < 50) {
      var events = [];
      JOBS.forEach(function (j) {
        var x = J[j.id];
        if (x.arrival === t && x.state === "도착 전") { Q[0].push(x.id); x.state = "ready"; events.push(x.id + " 도착 → Q0 꼬리"); }
        if (x.ioUntil === t) {
          x.ioUntil = null; x.state = "ready"; x.slice = SLICE[x.lvl]; Q[x.lvl].push(x.id);
          x.ioLevels.push("Q" + x.lvl);
          events.push(x.id + " I/O 완료 → Q" + x.lvl + " 꼬리 (fresh slice " + SLICE[x.lvl] + ")");
        }
      });
      var lvl = -1;
      for (var i = 0; i < 3; i++) if (Q[i].length) { lvl = i; break; }
      if (lvl < 0) { gantt.push({ t: t, id: "idle" }); snap("t=" + t + ": " + (events.join(", ") || "") + " 실행할 작업 없음 → idle"); t++; continue; }
      var id = Q[lvl][0], x = J[id];
      var pre = running && running !== id && J[running].state === "running" && J[running].lvl > lvl;
      var desc = "t=" + t + ": " + (events.length ? events.join(", ") + ". " : "");
      if (pre) desc += "'''" + id + " 가 " + running + " 를 선점''' — " + running + " 는 Q" + J[running].lvl + " head 에 남고 남은 슬라이스 " + J[running].slice + " 유지. ";
      if (x.first === null) x.first = t;
      x.state = "running";
      JOBS.forEach(function (j) { if (j.id !== id && J[j.id].state === "running") J[j.id].state = "ready"; });
      running = id;
      desc += "Q" + lvl + " head '''" + id + "''' 실행 [" + t + ", " + (t + 1) + ").";
      x.left--; x.slice--;
      gantt.push({ t: t, id: id });
      t++;
      if (x.left === 0) {
        Q[lvl].shift();
        var b = x.bursts[x.bi];
        if (b.io) {
          x.ioUntil = t + b.io; x.state = "I/O"; x.bi++; x.left = x.bursts[x.bi].cpu;
          desc += " CPU burst 끝 → I/O [" + t + ", " + x.ioUntil + "). 슬라이스(" + SLICE[lvl] + ")를 다 쓰기 전 블록 → '''Q" + lvl + " 유지'''.";
          running = null;
        } else {
          x.state = "완료"; x.done = t; finished++; running = null;
          desc += " '''" + id + " 완료 (t=" + t + ")'''.";
        }
      } else if (x.slice === 0) {
        Q[lvl].shift();
        x.lvl = Math.min(lvl + 1, 2); x.slice = SLICE[x.lvl]; Q[x.lvl].push(id); x.state = "ready";
        desc += " 슬라이스 " + SLICE[lvl] + " 를 다 씀 → '''Q" + x.lvl + "''' 꼬리로 강등 (fresh slice " + x.slice + ").";
        running = null;
      }
      snap(desc);
    }
    return { frames: frames, J: J, gantt: gantt, end: t };
  }

  function svgOf(fr, end) {
    var W = 560, H = 120, X0 = 40, U = 40;
    var o = '<svg viewBox="0 0 ' + W + ' ' + H + '" width="100%" style="max-width:600px" font-family="sans-serif">';
    o += '<text x="4" y="40" font-size="11" fill="#555">CPU</text>';
    for (var k = 0; k <= end; k++) {
      o += '<line x1="' + (X0 + k * U) + '" y1="22" x2="' + (X0 + k * U) + '" y2="58" stroke="#ddd"/>';
      o += '<text x="' + (X0 + k * U) + '" y="72" font-size="10" text-anchor="middle" fill="#777">' + k + '</text>';
    }
    fr.gantt.forEach(function (g) {
      var c = COLOR[g.id] || "#bbb";
      o += '<rect x="' + (X0 + g.t * U + 1) + '" y="24" width="' + (U - 2) + '" height="32" rx="3" fill="' + c + '" opacity="0.85"/>';
      o += '<text x="' + (X0 + g.t * U + U / 2) + '" y="45" font-size="13" text-anchor="middle" fill="#fff" font-weight="700">' + g.id + '</text>';
    });
    o += '<text x="' + X0 + '" y="96" font-size="11" fill="#3b2f4a">Q0: ' + fr.Q[0] + '    Q1: ' + fr.Q[1] + '    Q2: ' + fr.Q[2] + '</text>';
    return o + '</svg>';
  }

  global.SIMS["mid26_mlfq"] = {
    title: "2026F 중간 P5 — MLFQ trace (slice 2/4/8, I/O 블록 시 우선순위 유지)",
    desc: "시험지 규칙을 1 단위씩 그대로 실행한다. A 는 Q0 슬라이스를 다 써서 Q1 로, B 는 매번 슬라이스 전에 I/O 로 블록해 '''Q0 에 머문다''', t=4 에 온 C 가 Q1 의 A 를 선점. → [[MLFQ]], [[2026F 중간고사]]",
    options: [
      { key: "view", label: "보기", values: [{ value: "exam", label: "시험 문제 그대로 (A·B·C)" }] }
    ],
    build: function () {
      var R = simulate(), steps = [];
      var initQ = { t: 0, Q: ["—", "—", "—"], gantt: [] };
      steps.push({
        desc: "시작 전. 규칙(오른쪽 패널)과 작업: A(t=0, CPU 6), B(t=0, CPU 1 · I/O 3 · CPU 1 · I/O 3 · CPU 1), C(t=4, CPU 2). I/O 는 CPU 와 겹쳐 진행된다.",
        pc: { RULES: 1 },
        vars: { t: 0, Q0: "—", Q1: "—", Q2: "—", "A": "도착 전", "B": "도착 전", "C": "도착 전" },
        svg: svgOf(initQ, R.end)
      });
      R.frames.forEach(function (f) {
        var v = { t: f.t + 1, Q0: f.Q[0], Q1: f.Q[1], Q2: f.Q[2] };
        ["A", "B", "C"].forEach(function (id) {
          var x = f.J[id];
          v[id] = x.state + (x.state === "완료" ? " @" + x.done : " (Q" + x.lvl + ", 남은 slice " + x.slice + ")") + (x.ioUntil ? " I/O~" + x.ioUntil : "");
        });
        var line = /선점/.test(f.desc) ? 5 : /강등/.test(f.desc) ? 3 : /I\/O/.test(f.desc) ? 4 : 1;
        steps.push({ desc: f.desc, pc: { RULES: line }, vars: v, svg: svgOf(f, R.end) });
      });
      var J = R.J, last = steps[steps.length - 1];
      last.note = "정답: B response = " + J.B.first + ", A 완료 " + J.A.done + ", C 완료 " + J.C.done + ", B 의 큐(첫 I/O 후 / 두 번째 I/O 후) = " + J.B.ioLevels.join(" / ") + ". idle 구간 없음.";
      return {
        panels: [{ id: "RULES", title: "시험지 규칙", lang: "txt", lines: RULES }],
        vars: [
          { name: "t", group: "시각" },
          { name: "Q0", group: "큐 (head 먼저)" }, { name: "Q1", group: "큐 (head 먼저)" }, { name: "Q2", group: "큐 (head 먼저)" },
          { name: "A", group: "작업" }, { name: "B", group: "작업" }, { name: "C", group: "작업" }
        ],
        steps: steps
      };
    }
  };
})(typeof window !== "undefined" ? window : globalThis);
