// deadlock_prevention — 12강 Deadlock: 데드락 발생과 prevention 기법을 한 줄씩
// 원본: p.10–11 서로 반대 순서로 L1·L2 → deadlock (circular wait)
//       p.15–16 lock ordering (둘 다 L1 → L2) → circular wait 없음
//       p.18–19 trylock + goto top (No Preemption 깨기)
//       p.20    두 CPU에서 같은 시도를 반복 → livelock, random delay로 탈출
//       p.23–24 CompareAndSwap 기반 lock-free AtomicIncrement (Mutual Exclusion 깨기)
(function (global) {
  "use strict";
  global.SIMS = global.SIMS || {};

  // p.10 / p.15 코드 (슬라이드 줄 번호 1~7 그대로)
  function lockCode(a, b) {
    return [
      "pthread_mutex_lock(" + a + ");",
      "pthread_mutex_lock(" + b + ");",
      "",
      "...   // critical section",
      "",
      "pthread_mutex_unlock(" + b + ");",
      "pthread_mutex_unlock(" + a + ");"
    ];
  }
  // p.19 코드. 슬라이드는 `}` 뒤에서 4·5·6 을 다시 쓰지만 여기서는 7·8·9 로 이어 번호를 매긴다.
  function tryCode(a, b) {
    return [
      "top:",
      "  pthread_mutex_lock(" + a + ");",
      "  if(pthread_mutex_trylock(" + b + ") == -1){",
      "      pthread_mutex_unlock(" + a + "); // release",
      "      goto top;",
      "  }",
      "  ...   // critical section (슬라이드 4...)",
      "  pthread_mutex_unlock(" + b + ");   // 슬라이드 5",
      "  pthread_mutex_unlock(" + a + ");   // 슬라이드 6"
    ];
  }
  var CAS_CODE = [
    "void AtomicIncrement(int *value, int amount){",
    "  do{",
    "    int old = *value;",
    "  } while(CompareAndSwap(value, old, old+amount)==0);",
    "}"
  ];

  // ---------------- 락 기반 variant 공용 상태 기계 ----------------
  function LockWorld(opts) {
    this.L = { L1: { holder: null, waiters: [] }, L2: { holder: null, waiters: [] } };
    this.st = { T0: "running", T1: "ready" };
    this.pc = { T0: 1, T1: null };
    this.tr = { T0: "–", T1: "–" };
    this.round = opts.round ? 1 : null;
    this.useTry = !!opts.useTry;
    this.steps = [];
  }
  LockWorld.prototype.lock = function (t, n) {
    var l = this.L[n];
    if (l.holder === null) { l.holder = t; return true; }
    l.waiters.push(t); this.st[t] = "blocked"; return false;
  };
  LockWorld.prototype.unlock = function (t, n) {
    var l = this.L[n];
    l.holder = null;
    if (l.waiters.length) {           // 대기자에게 락을 넘기고 깨운다
      var w = l.waiters.shift();
      l.holder = w;
      if (this.st[w] === "blocked") this.st[w] = "ready";
      return w;
    }
    return null;
  };
  LockWorld.prototype.trylock = function (t, n) {
    var l = this.L[n];
    if (l.holder === null) { l.holder = t; this.tr[t] = "0 (성공)"; return 0; }
    this.tr[t] = "−1 (실패)"; return -1;
  };
  // 대기 그래프: t 가 기다리는 락과 그 주인
  LockWorld.prototype.waitsFor = function (t) {
    var self = this, r = null;
    ["L1", "L2"].forEach(function (n) {
      if (self.L[n].waiters.indexOf(t) >= 0) r = { lock: n, owner: self.L[n].holder };
    });
    return r;
  };
  LockWorld.prototype.cycle = function () {
    var a = this.waitsFor("T0"), b = this.waitsFor("T1");
    return !!(a && b && a.owner === "T1" && b.owner === "T0");
  };
  LockWorld.prototype.svg = function () {
    var self = this, cyc = this.cycle();
    var W = 380, H = 190;
    var pos = { T0: [20, 20], T1: [250, 20], L1: [250, 130], L2: [20, 130] };
    var SC = { running: "#4caf50", ready: "#e0a526", blocked: "#d64545", sleeping: "#6a6ad0", finished: "#888" };
    var o = '<svg viewBox="0 0 ' + W + ' ' + H + '" width="100%" style="max-width:380px" font-family="sans-serif">';
    o += '<defs>';
    [["g", "#4a8fd6"], ["o", "#e0a526"], ["r", "#d64545"]].forEach(function (m) {
      o += '<marker id="dlp-' + m[0] + '" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0L10,5L0,10z" fill="' + m[1] + '"/></marker>';
    });
    o += '</defs>';
    function center(k) { return [pos[k][0] + 55, pos[k][1] + 20]; }
    function arrow(from, to, kind, label) {
      var a = center(from), b = center(to);
      var dx = b[0] - a[0], dy = b[1] - a[1], len = Math.sqrt(dx * dx + dy * dy);
      var ux = dx / len, uy = dy / len;
      var sx = a[0] + ux * 45, sy = a[1] + uy * 24, ex = b[0] - ux * 50, ey = b[1] - uy * 26;
      var col = cyc ? "#d64545" : (kind === "hold" ? "#4a8fd6" : "#e0a526");
      var mk = cyc ? "r" : (kind === "hold" ? "g" : "o");
      o += '<line x1="' + sx.toFixed(1) + '" y1="' + sy.toFixed(1) + '" x2="' + ex.toFixed(1) + '" y2="' + ey.toFixed(1) + '" stroke="' + col + '" stroke-width="2"' +
        (kind === "want" ? ' stroke-dasharray="5,3"' : '') + ' marker-end="url(#dlp-' + mk + ')"/>';
      var mx = (sx + ex) / 2, my = (sy + ey) / 2;
      o += '<text x="' + (mx + 4).toFixed(1) + '" y="' + (my - 4).toFixed(1) + '" font-size="10" fill="' + col + '">' + label + '</text>';
    }
    ["L1", "L2"].forEach(function (n) {
      var l = self.L[n];
      if (l.holder) arrow(n, l.holder, "hold", "held by");
      l.waiters.forEach(function (w) { arrow(w, n, "want", "wants"); });
    });
    ["T0", "T1"].forEach(function (t) {
      var p = pos[t], col = SC[self.st[t]] || "#888";
      o += '<rect x="' + p[0] + '" y="' + p[1] + '" width="110" height="40" rx="6" fill="none" stroke="' + col + '" stroke-width="2"/>';
      o += '<text x="' + (p[0] + 55) + '" y="' + (p[1] + 17) + '" font-size="12" text-anchor="middle" fill="' + col + '">Thread ' + t.slice(1) + '</text>';
      o += '<text x="' + (p[0] + 55) + '" y="' + (p[1] + 32) + '" font-size="10" text-anchor="middle" fill="' + col + '">' + self.st[t] + '</text>';
    });
    ["L1", "L2"].forEach(function (n) {
      var p = pos[n], col = self.L[n].holder ? "#4a8fd6" : "#9aa";
      o += '<rect x="' + p[0] + '" y="' + p[1] + '" width="110" height="40" rx="2" fill="none" stroke="' + col + '" stroke-width="2"/>';
      o += '<text x="' + (p[0] + 55) + '" y="' + (p[1] + 17) + '" font-size="12" text-anchor="middle" fill="' + col + '">Lock ' + n + '</text>';
      o += '<text x="' + (p[0] + 55) + '" y="' + (p[1] + 32) + '" font-size="10" text-anchor="middle" fill="' + col + '">' + (self.L[n].holder ? "held" : "free") + '</text>';
    });
    if (cyc) o += '<text x="190" y="102" font-size="12" text-anchor="middle" fill="#d64545" font-weight="bold">circular wait!</text>';
    return o + '</svg>';
  };
  LockWorld.prototype.snap = function (desc, note) {
    var v = {
      "L1.holder": this.L.L1.holder || "free",
      "L2.holder": this.L.L2.holder || "free",
      "L1.waiters": this.L.L1.waiters.slice(),
      "L2.waiters": this.L.L2.waiters.slice(),
      "T0.state": this.st.T0,
      "T1.state": this.st.T1,
      "circular": this.cycle() ? "있음" : "없음"
    };
    if (this.useTry) { v["T0.try"] = this.tr.T0; v["T1.try"] = this.tr.T1; }
    if (this.round !== null) v.round = this.round;
    var s = { desc: desc, pc: { T0: this.pc.T0, T1: this.pc.T1 }, vars: v,
      status: { T0: this.st.T0, T1: this.st.T1 }, svg: this.svg() };
    if (note) s.note = note;
    this.steps.push(s);
  };
  LockWorld.prototype.vars = function () {
    var vs = [
      { name: "L1.holder", label: "L1 holder", group: "락" },
      { name: "L2.holder", label: "L2 holder", group: "락" },
      { name: "L1.waiters", label: "L1 waiters", group: "락" },
      { name: "L2.waiters", label: "L2 waiters", group: "락" },
      { name: "T0.state", label: "T0", group: "스레드" },
      { name: "T1.state", label: "T1", group: "스레드" }
    ];
    if (this.useTry) {
      vs.push({ name: "T0.try", label: "T0 trylock 반환값", group: "스레드" });
      vs.push({ name: "T1.try", label: "T1 trylock 반환값", group: "스레드" });
    }
    vs.push({ name: "circular", label: "circular wait", group: "조건" });
    if (this.round !== null) vs.push({ name: "round", label: "round (시도 횟수)", group: "조건" });
    return vs;
  };
  function sw(w, to) {                    // 단일 CPU context switch
    var from = to === "T0" ? "T1" : "T0";
    if (w.st[from] === "running") w.st[from] = "ready";
    w.st[to] = "running";
  }

  // ---------------- variant 별 시나리오 ----------------
  function buildDeadlock() {
    var w = new LockWorld({});
    w.snap("p.10 두 스레드 T0·T1 이 '''L1 과 L2 를 서로 반대 순서로''' 잡는다: T0 는 L1 → L2, T1 은 L2 → L1. 단일 CPU, T0 가 먼저 Running.");
    w.lock("T0", "L1");
    w.snap("T0 가 `pthread_mutex_lock(L1)` — L1 이 비어 있으므로 바로 획득. T0 holds L1.");
    w.pc.T0 = 2; w.pc.T1 = 1; sw(w, "T1");
    w.snap("'''타이머 인터럽트''' → T1 으로 context switch. T0 는 L1 을 쥔 채 Ready (다음 줄은 `lock(L2)`).");
    w.lock("T1", "L2");
    w.snap("T1 이 `pthread_mutex_lock(L2)` — L2 도 비어 있으므로 획득. 이제 '''두 스레드가 락을 하나씩''' 쥐고 있다.");
    w.pc.T1 = 2; w.lock("T1", "L1");
    w.snap("T1 이 `pthread_mutex_lock(L1)` — L1 은 T0 가 쥐고 있으므로 '''blocked'''. T1 은 '''L2 를 쥔 채''' L1 을 기다린다 = hold and wait.");
    sw(w, "T0");
    w.snap("T1 이 잠들었으니 스케줄러가 T0 로 switch. T0 가 2번 줄 `lock(L2)` 를 실행하려 한다.");
    w.lock("T0", "L2");
    w.snap("T0 가 `pthread_mutex_lock(L2)` — L2 는 T1 이 쥐고 있으므로 T0 도 '''blocked'''. T0 → L2 → T1 → L1 → T0 로 대기가 '''고리'''를 이룬다.",
      "p.11: T0 is holding a lock L1 and waiting for another one, L2; T1 that holds L2 is waiting for L1 — circular wait.");
    w.snap("두 스레드 모두 blocked, 깨워 줄 스레드가 없다 → '''[[데드락]]'''. 네 조건(mutual exclusion · hold and wait · no preemption · circular wait)이 동시에 성립했다. 하나라도 깨면 막을 수 있다 — 옵션에서 [[lock ordering]] / [[trylock]] / [[lock-free]] 를 골라 보자.",
      "Deadlock: 둘 다 영원히 blocked. unlock 줄(6·7)에 아무도 도달하지 못한다.");
    return { w: w, panels: [
      { id: "T0", title: "T0 (p.10)", lang: "c", lines: lockCode("L1", "L2") },
      { id: "T1", title: "T1 (p.10)", lang: "c", lines: lockCode("L2", "L1") }] };
  }

  function buildOrdered() {
    var w = new LockWorld({});
    w.snap("p.15 '''[[lock ordering]]''': 코드를 고쳐 '''두 스레드 모두 L1 → L2''' 순서로 잡는다(total ordering). p.10 과 똑같은 인터리빙을 시도해 보자.");
    w.lock("T0", "L1");
    w.snap("T0 가 `lock(L1)` — 획득.");
    w.pc.T0 = 2; w.pc.T1 = 1; sw(w, "T1");
    w.snap("인터럽트 → T1 으로 switch. T0 는 L1 을 쥔 채 Ready.");
    w.lock("T1", "L1");
    w.snap("T1 의 첫 줄도 `lock(L1)` — L1 은 T0 가 쥐고 있으므로 T1 이 '''blocked'''. 그러나 T1 은 '''아무 락도 쥐지 않은 채''' 기다린다 → 고리가 생길 수 없다.");
    sw(w, "T0");
    w.snap("T0 로 switch.");
    w.lock("T0", "L2");
    w.snap("T0 가 `lock(L2)` — L2 는 비어 있으므로 '''성공'''. T0 가 두 락을 모두 쥐었다.",
      "p.16: Circular wait does not exist after the code change.");
    w.pc.T0 = 4;
    w.snap("T0 가 critical section 을 실행한다.");
    w.pc.T0 = 6; w.unlock("T0", "L2");
    w.snap("T0 가 `unlock(L2)`.");
    w.pc.T0 = 7; w.unlock("T0", "L1");
    w.snap("T0 가 `unlock(L1)` — 기다리던 T1 에게 L1 이 넘어가고 T1 은 Ready.");
    w.st.T0 = "finished"; w.pc.T0 = null; sw(w, "T1");
    w.snap("T0 종료(finished) → T1 으로 switch. T1 의 `lock(L1)` 이 반환된다 — L1 획득.");
    w.pc.T1 = 2; w.lock("T1", "L2");
    w.snap("T1 이 `lock(L2)` — 비어 있으므로 획득.");
    w.pc.T1 = 4;
    w.snap("T1 이 critical section 을 실행한다.");
    w.pc.T1 = 6; w.unlock("T1", "L2");
    w.snap("T1 이 `unlock(L2)`.");
    w.pc.T1 = 7; w.unlock("T1", "L1");
    w.snap("T1 이 `unlock(L1)`.");
    w.st.T1 = "finished"; w.pc.T1 = null;
    w.snap("T1 종료. '''두 스레드 모두 finished''' — 순서를 하나로 정하면 circular wait 조건이 깨져 [[데드락]]이 생기지 않는다.",
      "Lock ordering은 '항상 같은 순서'만 지키면 된다. 실제로는 락 주소 순서로 잡는 식(partial ordering)으로 구현한다.");
    return { w: w, panels: [
      { id: "T0", title: "T0 (p.15)", lang: "c", lines: lockCode("L1", "L2") },
      { id: "T1", title: "T1 (p.15, 순서 변경)", lang: "c", lines: lockCode("L1", "L2") }] };
  }

  function buildTrylock() {
    var w = new LockWorld({ useTry: true });
    w.snap("p.18–19 '''No Preemption 조건 깨기''': 두 번째 락을 `pthread_mutex_trylock()` 으로 시도해서 실패(−1)하면 '''쥐고 있던 락을 스스로 내려놓고''' `goto top` 으로 처음부터 다시 한다. T0 는 L1 → L2, T1 은 L2 → L1 (반대 순서 그대로).");
    w.pc.T0 = 2; w.lock("T0", "L1");
    w.snap("T0 가 `top:` 을 지나 `lock(L1)` — 획득.");
    w.pc.T1 = 1; sw(w, "T1");
    w.snap("인터럽트 → T1 으로 switch.");
    w.pc.T1 = 2; w.lock("T1", "L2");
    w.snap("T1 이 `lock(L2)` — 획득. p.10 과 같은 위험한 상태: 서로 락을 하나씩 쥐고 있다.");
    sw(w, "T0"); w.pc.T0 = 3; w.trylock("T0", "L2");
    w.snap("T0 로 switch. T0 가 `trylock(L2)` — L2 는 T1 소유이므로 '''기다리지 않고 −1 을 반환'''한다. blocked 가 아니다.");
    w.pc.T0 = 4; w.unlock("T0", "L1");
    w.snap("T0 가 `unlock(L1)` — '''쥐고 있던 L1 을 놓는다''' (release). p.18: all the resources currently being held by T0 are released.");
    w.pc.T0 = 5;
    w.snap("T0 가 `goto top` — 처음부터 다시 시도할 준비.");
    sw(w, "T1"); w.pc.T0 = 1; w.pc.T1 = 3; w.trylock("T1", "L1");
    w.snap("인터럽트 → T1. T1 이 `trylock(L1)` — T0 가 방금 L1 을 놓았으므로 '''0 (성공)'''. T1 이 L1·L2 를 모두 쥐었다.");
    w.pc.T1 = 7;
    w.snap("T1 이 critical section 을 실행한다.");
    w.pc.T1 = 8; w.unlock("T1", "L1");
    w.snap("T1 이 `unlock(L1)`.");
    w.pc.T1 = 9; w.unlock("T1", "L2");
    w.snap("T1 이 `unlock(L2)`.");
    w.st.T1 = "finished"; w.pc.T1 = null; w.st.T0 = "running"; w.tr.T0 = "–";
    w.snap("T1 종료(finished). T0 가 다시 Running — `top:` 부터 재시도.");
    w.pc.T0 = 2; w.lock("T0", "L1");
    w.snap("T0 가 `lock(L1)` — 획득.");
    w.pc.T0 = 3; w.trylock("T0", "L2");
    w.snap("T0 가 `trylock(L2)` — 이번엔 '''0 (성공)'''. 두 락 획득.");
    w.pc.T0 = 7;
    w.snap("T0 가 critical section 을 실행한다.");
    w.pc.T0 = 8; w.unlock("T0", "L2");
    w.snap("T0 가 `unlock(L2)`.");
    w.pc.T0 = 9; w.unlock("T0", "L1");
    w.snap("T0 가 `unlock(L1)`.");
    w.st.T0 = "finished"; w.pc.T0 = null;
    w.snap("T0 종료. '''두 스레드 모두 finished''' — 실패하면 쥔 것을 내려놓으므로 hold-and-wait 고리가 굳지 않고, 결국 '''progress''' 가 생긴다.",
      "단, 두 스레드가 같은 박자로 계속 실패하면 livelock이 될 수 있다(p.20) — 옵션 livelock 참고. [[trylock]]");
    return { w: w, panels: [
      { id: "T0", title: "T0 (p.19)", lang: "c", lines: tryCode("L1", "L2") },
      { id: "T1", title: "T1 (p.19)", lang: "c", lines: tryCode("L2", "L1") }] };
  }

  function buildLivelock() {
    var w = new LockWorld({ useTry: true, round: true });
    w.st.T1 = "running"; w.pc.T1 = 1;
    w.snap("p.20 T0 는 '''CPU 0''', T1 은 '''CPU 1''' 에서 동시에 실행된다. 둘 다 p.19 의 trylock 코드. 슬라이드의 ①~⑧ 번호처럼 두 스레드가 '''같은 박자로 번갈아''' 한 줄씩 나아가는 경우를 본다.");
    var round;
    for (round = 1; round <= 3; round++) {
      w.round = round; w.tr.T0 = "–"; w.tr.T1 = "–";
      if (round === 1) {
        w.pc.T0 = 2; w.lock("T0", "L1");
        w.snap("① (round 1) T0 가 `lock(L1)` — 획득.");
        w.pc.T1 = 2; w.lock("T1", "L2");
        w.snap("② T1 이 `lock(L2)` — 획득.");
        w.pc.T0 = 3; w.trylock("T0", "L2");
        w.snap("③ T0 가 `trylock(L2)` → '''−1''' (T1 소유).");
        w.pc.T1 = 3; w.trylock("T1", "L1");
        w.snap("④ T1 이 `trylock(L1)` → '''−1''' (T0 소유).");
        w.pc.T0 = 4; w.unlock("T0", "L1");
        w.snap("⑤ T0 가 `unlock(L1)`.");
        w.pc.T1 = 4; w.unlock("T1", "L2");
        w.snap("⑥ T1 이 `unlock(L2)`. 두 락이 모두 비었다 — 하지만 아무도 일을 하지 못했다.");
        w.pc.T0 = 5;
        w.snap("⑦ T0 가 `goto top`.");
        w.pc.T1 = 5;
        w.snap("⑧ T1 이 `goto top`. 둘 다 같은 자리에서 다시 시작한다 → 같은 일이 반복된다.");
      } else {
        w.pc.T0 = 2; w.pc.T1 = 2; w.lock("T0", "L1"); w.lock("T1", "L2");
        w.snap("(round " + round + ") 다시 ①② — T0 는 L1, T1 은 L2 를 획득.");
        w.pc.T0 = 3; w.pc.T1 = 3; w.trylock("T0", "L2"); w.trylock("T1", "L1");
        w.snap("③④ 둘 다 `trylock` → '''−1'''.");
        w.pc.T0 = 4; w.pc.T1 = 4; w.unlock("T0", "L1"); w.unlock("T1", "L2");
        w.snap("⑤⑥ 둘 다 쥔 락을 놓는다.");
        w.pc.T0 = 5; w.pc.T1 = 5;
        w.snap("⑦⑧ 둘 다 `goto top` — round " + round + " 도 실패.",
          round === 3 ? "Livelock: 두 스레드 모두 running 이고 blocked 되지 않지만, 계속 시도하고 계속 실패한다 → No progress is made (p.20)." : null);
      }
    }
    w.round = 4; w.tr.T0 = "–"; w.tr.T1 = "–";
    w.pc.T0 = 1; w.pc.T1 = 1; w.st.T1 = "sleeping";
    w.snap("'''random delay''': T1 이 `goto top` 뒤 무작위로 1 tick 쉰다(sleeping). 이제 두 스레드의 박자가 어긋난다.",
      "Solution: Add a random delay before looping back and trying the entire thing over again (p.20).");
    w.pc.T0 = 2; w.lock("T0", "L1");
    w.snap("T1 이 쉬는 동안 T0 가 `lock(L1)` — 획득.");
    w.pc.T0 = 3; w.trylock("T0", "L2");
    w.snap("T0 가 `trylock(L2)` — L2 가 비어 있으므로 '''0 (성공)'''. T0 가 두 락을 모두 쥐었다.");
    w.st.T1 = "running"; w.pc.T0 = 7; w.pc.T1 = 2; w.lock("T1", "L2");
    w.snap("delay 가 끝난 T1 이 `lock(L2)` — L2 는 T0 소유이므로 T1 은 blocked. 그러나 T1 은 '''아무 락도 쥐지 않고''' 기다리므로 고리는 없다. T0 는 critical section 실행.");
    w.pc.T0 = 8; w.unlock("T0", "L2"); w.st.T1 = "running";
    w.snap("T0 가 `unlock(L2)` — 기다리던 T1 에게 L2 가 넘어가고 T1 은 CPU 1 에서 다시 running.");
    w.pc.T0 = 9; w.unlock("T0", "L1");
    w.snap("T0 가 `unlock(L1)`.");
    w.st.T0 = "finished"; w.pc.T0 = null; w.pc.T1 = 3; w.trylock("T1", "L1");
    w.snap("T0 종료(finished). T1 이 `trylock(L1)` → '''0 (성공)'''. (만약 이 trylock 이 T0 의 unlock(L1) 보다 빨랐다면 한 번 더 `goto top` 했겠지만, T0 가 끝난 뒤의 다음 시도에서는 반드시 성공한다.)");
    w.pc.T1 = 7;
    w.snap("T1 이 critical section 을 실행한다.");
    w.pc.T1 = 8; w.unlock("T1", "L1");
    w.snap("T1 이 `unlock(L1)`.");
    w.pc.T1 = 9; w.unlock("T1", "L2");
    w.snap("T1 이 `unlock(L2)`.");
    w.st.T1 = "finished"; w.pc.T1 = null;
    w.snap("T1 종료. '''두 스레드 모두 finished''' — random delay 로 박자를 어긋나게 하자 [[livelock]] 에서 벗어나 progress 가 생겼다.",
      "Deadlock은 모두 blocked(멈춤), livelock은 모두 running(바쁘게 움직이지만 진전 없음). 둘 다 progress가 없다.");
    return { w: w, panels: [
      { id: "T0", title: "Thread 0 run by CPU 0 (p.20)", lang: "c", lines: tryCode("L1", "L2") },
      { id: "T1", title: "Thread 1 run by CPU 1 (p.20)", lang: "c", lines: tryCode("L2", "L1") }] };
  }

  function buildAtomic() {
    var steps = [];
    var S = { value: 0, o1: "?", o2: "?", cas: "–", st1: "running", st2: "ready" };
    function svg() {
      var o = '<svg viewBox="0 0 360 110" width="100%" style="max-width:360px" font-family="sans-serif">';
      o += '<rect x="130" y="8" width="100" height="40" rx="4" fill="none" stroke="#4a8fd6" stroke-width="2"/>';
      o += '<text x="180" y="23" font-size="10" text-anchor="middle" fill="#9aa">value</text>';
      o += '<text x="180" y="42" font-size="16" text-anchor="middle" fill="#4a8fd6">' + S.value + '</text>';
      [["Thread #1", S.o1, S.st1, 20], ["Thread #2", S.o2, S.st2, 220]].forEach(function (t) {
        var col = { running: "#4caf50", ready: "#e0a526", finished: "#888" }[t[2]] || "#888";
        o += '<rect x="' + t[3] + '" y="62" width="120" height="40" rx="6" fill="none" stroke="' + col + '" stroke-width="2"/>';
        o += '<text x="' + (t[3] + 60) + '" y="78" font-size="11" text-anchor="middle" fill="' + col + '">' + t[0] + ' (' + t[2] + ')</text>';
        o += '<text x="' + (t[3] + 60) + '" y="94" font-size="11" text-anchor="middle" fill="' + col + '">old = ' + t[1] + '</text>';
      });
      return o + '</svg>';
    }
    function snap(pc1, pc2, desc, note) {
      var s = { desc: desc, pc: { T1: pc1, T2: pc2 },
        vars: { value: S.value, "T1.old": S.o1, "T2.old": S.o2, cas: S.cas },
        status: { T1: S.st1, T2: S.st2 }, svg: svg() };
      if (note) s.note = note;
      steps.push(s);
    }
    snap(1, 1, "p.24 두 스레드가 '''동시에''' `AtomicIncrement(&value, 5)` 를 호출한다. 공유 변수 `value` 는 0. '''락이 없다''' — [[compare-and-swap]] 하나로 원자적 증가를 만든다 ([[lock-free]], Mutual Exclusion 조건 자체를 없앰).");
    S.o1 = 0;
    snap(3, 1, "Thread #1 이 `do{` 안에서 `old = *value` → '''old = 0''' (슬라이드 주석 *old=0, value=0).");
    S.st1 = "ready"; S.st2 = "running"; S.o2 = 0;
    snap(4, 3, "switch → Thread #2 도 `old = *value` → '''old = 0'''. 둘 다 같은 옛값 0 을 읽었다 — 락 없는 counter++ 라면 여기서 race 로 업데이트 하나가 사라진다.");
    S.st1 = "running"; S.st2 = "ready"; S.value = 5; S.cas = "T1: 1 (성공)";
    snap(4, 4, "switch → Thread #1 이 `CompareAndSwap(value, 0, 0+5)` — `*value == old(0)` 이므로 '''원자적으로''' value 를 5 로 바꾸고 성공(1)을 반환한다.");
    S.st1 = "finished";
    snap(5, 4, "`CAS(...) == 0` 이 거짓 → 루프를 빠져나와 Thread #1 반환 (finished).");
    S.st2 = "running"; S.cas = "T2: 0 (실패)";
    snap(null, 4, "Thread #2 가 `CompareAndSwap(value, 0, 0+5)` — 기대값 old=0 이지만 '''현재 value 는 5''' → 바꾸지 않고 '''0(실패)''' 을 반환. value 는 5 그대로 — T1 의 업데이트가 덮어써지지 않는다.",
      "CAS 실패 = 내가 읽은 뒤 누군가 값을 바꿨다는 뜻 → 다시 읽고 재시도한다.");
    S.o2 = 5;
    snap(null, 3, "`== 0` 이 참 → `do{` 로 돌아가 '''다시 읽는다''': old = *value → '''old = 5''' (슬라이드 주석 *old=0, value=5 → 재시도).");
    S.value = 10; S.cas = "T2: 1 (성공)";
    snap(null, 4, "Thread #2 가 `CompareAndSwap(value, 5, 5+5)` — 이번엔 `*value == 5` 이므로 '''value = 10''', 성공(1).");
    S.st2 = "finished";
    snap(null, 5, "Thread #2 반환. 최종 '''value = 10''' = 0 + 5 + 5. 두 업데이트 모두 반영됐다.",
      "No lock, no deadlock; starvation is possible — 운 나쁜 스레드는 CAS 가 계속 실패해 무한히 재시도할 수 있다 (p.23).");
    return {
      panels: [
        { id: "T1", title: "Thread #1: AtomicIncrement(&value, 5)", lang: "c", lines: CAS_CODE },
        { id: "T2", title: "Thread #2: AtomicIncrement(&value, 5)", lang: "c", lines: CAS_CODE }],
      vars: [
        { name: "value", label: "value (공유)", group: "공유 메모리" },
        { name: "T1.old", label: "Thread #1 old", group: "스레드" },
        { name: "T2.old", label: "Thread #2 old", group: "스레드" },
        { name: "cas", label: "CAS 결과", group: "CompareAndSwap" }],
      steps: steps
    };
  }

  global.SIMS["deadlock_prevention"] = {
    title: "Deadlock 과 prevention (12강 p.10–24)",
    desc: "L1·L2 두 락을 잡는 두 스레드로 [[데드락]]이 생기는 과정과, 네 조건 중 하나씩을 깨는 prevention — [[lock ordering]](circular wait), [[trylock]](no preemption) 과 그 부작용 [[livelock]], CAS 기반 [[lock-free]] 증가(mutual exclusion) — 를 한 줄씩 따라간다.",
    options: [
      {
        key: "variant", label: "시나리오",
        values: [
          { value: "deadlock", label: "p.10 서로 반대 순서 → deadlock" },
          { value: "ordered", label: "p.15 lock ordering (둘 다 L1 → L2)" },
          { value: "trylock", label: "p.19 trylock + goto top (no preemption 방지)" },
          { value: "livelock", label: "p.20 두 CPU에서 동시에 반복 → livelock, random delay로 탈출" },
          { value: "atomic_increment", label: "p.24 CAS로 lock-free AtomicIncrement" }
        ]
      }
    ],
    build: function (opts) {
      var v = opts.variant || "deadlock";
      if (v === "atomic_increment") return buildAtomic();
      var r = v === "ordered" ? buildOrdered() : v === "trylock" ? buildTrylock() : v === "livelock" ? buildLivelock() : buildDeadlock();
      return { panels: r.panels, vars: r.w.vars(), steps: r.w.steps };
    }
  };
})(typeof window !== "undefined" ? window : globalThis);
