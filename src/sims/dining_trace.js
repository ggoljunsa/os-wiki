// dining_trace — 11강 p.35~40 dining philosophers 를 줄 단위로. 포크 = binary semaphore(초기 1).
// broken: 다섯 명이 모두 왼쪽부터 → 전원 오른쪽에서 잠듦(데드락) / fixed: P4 만 오른쪽(f0)부터 → P3 → P2 → P1 → P0 → P4 순으로 풀림
(function (global) {
  "use strict";
  global.SIMS = global.SIMS || {};
  var N = 5;
  function left(p) { return p; }
  function right(p) { return (p + 1) % N; }

  function order(p, fixed) {
    return (fixed && p === 4) ? [right(p), left(p)] : [left(p), right(p)];
  }
  function code(p, fixed) {
    var o = order(p, fixed);
    var swapped = fixed && p === 4;
    return [
      "void philosopher(" + p + ") {",
      "  think();",
      "  sem_wait(forks[" + (swapped ? "right" : "left") + "(" + p + ")]);  // f" + o[0] + (swapped ? " (P4만 오른쪽 먼저)" : ""),
      "  sem_wait(forks[" + (swapped ? "left" : "right") + "(" + p + ")]);  // f" + o[1],
      "  eat();",
      "  sem_post(forks[left(" + p + ")]);   // f" + left(p),
      "  sem_post(forks[right(" + p + ")]);  // f" + right(p),
      "}"
    ];
  }

  var SCHED = {
    broken: [
      ["P0", "모두가 '''거의 동시에''' 배가 고파졌다고 하자. P0 가 왼쪽 f0 을 든다."], ["P1"], ["P2"], ["P3"],
      ["P4", "다섯 명 모두 '''왼쪽 포크 하나씩''' 들었다. 포크 다섯 개가 전부 손에 있다."],
      ["P0", "P0 가 오른쪽 f1 을 원하지만 P1 이 들고 있다 → 잠듦."], ["P1", "P1 은 f2 를 원하지만 P2 가 들고 있다 → 잠듦."],
      ["P2", "P2 는 f3 → P3 가 들고 있음 → 잠듦."], ["P3", "P3 는 f4 → P4 가 들고 있음 → 잠듦."],
      ["P4", "P4 는 f0 → '''P0 가 들고 있음''' → 잠듦. 고리가 닫혔다: P0→P1→P2→P3→P4→P0."]
    ],
    fixed: [
      ["P0", "같은 '''최악의 순서''' 로 시작한다. P0 가 f0 을 든다."], ["P1"], ["P2"], ["P3"],
      ["P4", "P4 는 이제 '''오른쪽 f0 부터''' 잡는다. 그런데 f0 은 P0 가 들고 있다 → P4 는 '''포크를 하나도 들지 않은 채''' 잠든다. 그래서 '''f4 가 남는다'''."],
      ["P0", "P0 는 f1 을 원함 → P1 이 들고 있음 → 잠듦."], ["P1", "P1 은 f2 → 잠듦."], ["P2", "P2 는 f3 → 잠듦."],
      ["P3", "P3 는 f4 를 원하는데 '''비어 있다'''(P4 가 안 들었으니까) → 성공! P3 는 포크 두 개."],
      ["P3", "P3 가 먹는다."],
      ["P3", "P3 가 f3 을 놓는다 → f3 에서 자던 P2 가 깨어나 f3 을 받는다."], ["P3"],
      ["P2", "P2 가 먹는다 (\"After P3, P2 finishes eating\" — p.40)."], ["P2", "f2 를 놓는다 → P1 깨어남."], ["P2"],
      ["P1", "P1 이 먹는다."], ["P1", "f1 을 놓는다 → P0 깨어남."], ["P1"],
      ["P0", "P0 가 먹는다."], ["P0", "f0 을 놓는다 → '''f0 에서 자던 P4''' 가 깨어나 f0 을 받는다."], ["P0"],
      ["P4", "P4 의 두 번째 wait — 왼쪽 f4 는 비어 있다 → 성공."], ["P4", "P4 가 먹는다. 다섯 명 모두 먹었다."], ["P4"], ["P4"]
    ]
  };

  global.SIMS["dining_trace"] = {
    title: "dining philosophers 줄 단위 디버깅",
    desc: "11강 p.37 (broken) 과 p.39 (P4 만 순서를 바꾼 fix) 를 같은 '최악의 순서' 로 돌린다. 포크마다 세마포어(초기 1): 값 0 = 누가 들고 있음, −1 = 들고 있고 한 명이 기다림.",
    options: [
      {
        key: "version",
        label: "구현",
        values: [
          { value: "broken", label: "p.37 broken — 모두 왼쪽부터 (데드락)" },
          { value: "fixed", label: "p.39 fix — P4 만 오른쪽부터 (순환 끊김)" }
        ]
      }
    ],
    build: function (opts) {
      return run(opts.version === "fixed");
    }
  };

  function run(fixed) {
    var fork = [];
    for (var i = 0; i < N; i++) fork.push({ v: 1, q: [], holder: null });
    var ph = [];
    for (var p = 0; p < N; p++) ph.push({ pc: null, state: "think", got: 0, want: null });
    var steps = [];

    function stateText(p) {
      var x = ph[p];
      if (x.state === "think") return "생각 중 (포크 0)";
      if (x.state === "sleep") return "잠듦 — f" + x.want + " 기다림 (포크 " + x.got + ")";
      if (x.state === "eat") return "먹는 중 (포크 2)";
      if (x.state === "done") return "다 먹음";
      return "포크 " + x.got + "개 들고 진행";
    }
    function snap() {
      var v = {};
      for (var i = 0; i < N; i++) {
        v["f" + i] = fork[i].v;
        v["f" + i + ".h"] = fork[i].holder === null ? "-" : "P" + fork[i].holder;
      }
      for (var p = 0; p < N; p++) v["P" + p] = stateText(p);
      return v;
    }
    function badges() {
      var b = {};
      for (var p = 0; p < N; p++) {
        var s = ph[p].state;
        b["P" + p] = s === "sleep" ? "sleeping" : (s === "eat" ? "running" : (s === "done" ? "done" : "ready"));
      }
      return b;
    }
    function pcs() {
      var r = {};
      for (var p = 0; p < N; p++) r["P" + p] = ph[p].state === "done" ? null : ph[p].pc;
      return r;
    }
    function svg() {
      var cx = 280, cy = 125, R = 92, Rf = 60;
      var s = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 560 265" style="max-width:100%;font:12px sans-serif">';
      s += '<defs><marker id="dtar" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="#b33"/></marker></defs>';
      s += '<circle cx="' + cx + '" cy="' + cy + '" r="52" fill="#f6efe2" stroke="#b9a"/>';
      function pos(angleDeg, r) {
        var a = angleDeg * Math.PI / 180;
        return [cx + r * Math.cos(a), cy - r * Math.sin(a)];
      }
      var pAng = function (p) { return 18 + 72 * p; };
      var fAng = function (f) { return (342 + 72 * f) % 360; };
      // 포크
      for (var f = 0; f < N; f++) {
        var fp = pos(fAng(f), Rf), h = fork[f].holder;
        var col = h === null ? "#ddd" : "#f2c14e";
        s += '<rect x="' + (fp[0] - 13) + '" y="' + (fp[1] - 9) + '" width="26" height="18" rx="3" fill="' + col + '" stroke="#555"/>';
        s += '<text x="' + fp[0] + '" y="' + (fp[1] + 4) + '" text-anchor="middle" font-size="11">f' + f + '</text>';
        if (h !== null) {
          var hp = pos(pAng(h), R);
          s += '<line x1="' + fp[0] + '" y1="' + fp[1] + '" x2="' + hp[0] + '" y2="' + hp[1] + '" stroke="#c9a227" stroke-width="3" opacity="0.7"/>';
        }
      }
      // 기다림 화살표
      for (var p = 0; p < N; p++) {
        if (ph[p].state === "sleep") {
          var a = pos(pAng(p), R), b = pos(fAng(ph[p].want), Rf);
          var dx = b[0] - a[0], dy = b[1] - a[1], L = Math.sqrt(dx * dx + dy * dy);
          s += '<line x1="' + (a[0] + dx * 18 / L) + '" y1="' + (a[1] + dy * 18 / L) + '" x2="' + (b[0] - dx * 15 / L) + '" y2="' + (b[1] - dy * 15 / L) + '" stroke="#b33" stroke-width="2" stroke-dasharray="4,3" marker-end="url(#dtar)"/>';
        }
      }
      // 철학자
      for (var q = 0; q < N; q++) {
        var pp = pos(pAng(q), R), st = ph[q].state;
        var fill = st === "eat" ? "#8fd18f" : (st === "done" ? "#cfe8cf" : (st === "sleep" ? "#ffe0e0" : (ph[q].got ? "#fff3c4" : "#f0f0f0")));
        s += '<circle cx="' + pp[0] + '" cy="' + pp[1] + '" r="18" fill="' + fill + '" stroke="' + (st === "sleep" ? "#b33" : "#333") + '" stroke-width="' + (st === "sleep" ? 2.5 : 1.2) + '"/>';
        s += '<text x="' + pp[0] + '" y="' + (pp[1] + 4) + '" text-anchor="middle" font-weight="700">P' + q + '</text>';
      }
      var sleeping = ph.filter(function (x) { return x.state === "sleep"; }).length;
      var msg = sleeping === N ? "다섯 명 모두 잠듦 → DEADLOCK (circular wait)" : (sleeping ? sleeping + "명 잠듦 · 노란 포크 = 누가 들었나 · 빨간 점선 = 기다리는 포크" : "노란 포크 = 누가 들었나 · 빨간 점선 = 기다리는 포크");
      s += '<text x="10" y="255" fill="' + (sleeping === N ? "#b33" : "#555") + '" font-weight="' + (sleeping === N ? 700 : 400) + '">' + msg + '</text>';
      s += '<text x="420" y="30" font-size="11" fill="#555">left(p) = f p</text><text x="420" y="46" font-size="11" fill="#555">right(p) = f (p+1)%5</text>';
      return s + '</svg>';
    }
    function push(desc, pcOverride, note) {
      var r = pcs();
      if (pcOverride) for (var k in pcOverride) r[k] = pcOverride[k];
      steps.push({ desc: desc, pc: r, vars: snap(), status: badges(), note: note, svg: svg() });
    }
    function semWait(p, f) {
      var F = fork[f], before = F.v;
      F.v -= 1;
      if (F.v < 0) {
        F.q.push(p); ph[p].state = "sleep"; ph[p].want = f;
        return "`sem_wait(f" + f + ")`: " + before + " → '''" + F.v + "''' → f" + f + " 은 P" + F.holder + " 가 들고 있음 → '''P" + p + " 잠듦'''";
      }
      F.holder = p; ph[p].got += 1;
      return "`sem_wait(f" + f + ")`: " + before + " → " + F.v + " → f" + f + " 획득 (포크 " + ph[p].got + "개)";
    }
    function semPost(p, f) {
      var F = fork[f], before = F.v;
      F.v += 1; F.holder = null; ph[p].got -= 1;
      if (F.q.length) {
        var u = F.q.shift();
        F.holder = u; ph[u].got += 1; ph[u].want = null; ph[u].state = "go";
        ph[u].pc += 1;
        return "`sem_post(f" + f + ")`: " + before + " → " + F.v + " → f" + f + " 에서 자던 '''P" + u + " 깨움''' (P" + u + " 가 f" + f + " 을 받음)";
      }
      return "`sem_post(f" + f + ")`: " + before + " → " + F.v + " (기다리는 사람 없음)";
    }

    push((fixed ? "'''p.39 fix'''" : "'''p.37 broken'''") + " — 포크 f0~f4 는 모두 세마포어 1 로 시작. 철학자 p 의 왼쪽은 f p, 오른쪽은 f (p+1)%5. " +
      (fixed ? "P0~P3 는 왼쪽 → 오른쪽, '''P4 만 오른쪽(f0) → 왼쪽(f4)'''." : "다섯 명 모두 왼쪽 → 오른쪽."), {});

    SCHED[fixed ? "fixed" : "broken"].forEach(function (e) {
      var name = e[0], p = +name.slice(1), x = ph[p], memo = e[1] || "";
      if (x.state === "sleep" || x.state === "done") throw new Error("dining_trace: " + name + " cannot run");
      if (x.pc === null) { x.pc = 3; x.state = "go"; }
      var line = x.pc, o = order(p, fixed), msg, note;
      if (line === 3) { msg = semWait(p, o[0]); if (x.state !== "sleep") x.pc = 4; }
      else if (line === 4) { msg = semWait(p, o[1]); if (x.state !== "sleep") x.pc = 5; }
      else if (line === 5) { x.state = "eat"; msg = "`eat()` — 포크 두 개로 먹는다"; x.pc = 6; }
      else if (line === 6) { x.state = "go"; msg = semPost(p, left(p)); x.pc = 7; }
      else if (line === 7) { msg = semPost(p, right(p)); x.state = "done"; x.pc = 8; }
      var all = ph.every(function (y) { return y.state === "sleep"; });
      if (all) note = "'''DEADLOCK''' — 모두가 포크 하나를 쥔 채(hold and wait) 옆 사람의 포크를 기다리고(circular wait), 아무도 놓지 않는다. 더 이상 실행할 수 있는 철학자가 없다.";
      var pcShow = {}; pcShow[name] = line;
      push("'''" + name + "''' " + line + "번 줄: " + msg + (memo ? " — " + memo : ""), pcShow, note);
    });

    if (fixed) push("끝. 포크 값이 모두 1 로 돌아왔다. 먹은 순서 '''P3 → P2 → P1 → P0 → P4''' — P4 한 명이 순서를 뒤집어 '''f4 하나를 비워 둔 것''' 이 연쇄의 시작이었다. 포크 번호로 보면 이제 다섯 명 모두 '''작은 번호부터''' 잡는다(lock ordering).", {});

    var panels = [];
    for (var k = 0; k < N; k++) panels.push({ id: "P" + k, title: "P" + k + (fixed && k === 4 ? " (순서 반대)" : ""), lang: "c", lines: code(k, fixed) });
    var vars = [];
    for (var f = 0; f < N; f++) {
      vars.push({ name: "f" + f, label: "f" + f + " 값", group: "포크 세마포어" });
      vars.push({ name: "f" + f + ".h", label: "f" + f + " 든 사람", group: "포크 세마포어" });
    }
    for (var q = 0; q < N; q++) vars.push({ name: "P" + q, label: "P" + q, group: "철학자" });
    return { panels: panels, vars: vars, steps: steps };
  }
})(typeof window !== "undefined" ? window : globalThis);
