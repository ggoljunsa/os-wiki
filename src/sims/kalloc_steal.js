// kalloc_steal — 과제 2 (xv6 Lock) Problem 1: per-CPU free list + steal 을 줄 단위로.
// 코드 패널은 일부러 '설계 수준 의사코드' 다 (과제 정답 kalloc.c 가 아님). 원본 xv6 kalloc.c 는 kmem 하나 + kmem.lock 하나.
// scenario: normal(freerange → CPU1 steal → CPU2 kfree → CPU0·CPU2 동시 kalloc, contention 0)
//           deadlock(내 lock 을 쥔 채 남의 lock → CPU0↔CPU1 circular wait)
//           ordered(두 lock 을 번호 작은 것부터 → 한쪽이 아무것도 쥐지 않고 spin → 풀림)
//           cpuid_race(인터럽트 켠 채 cpuid() → 다른 CPU 로 옮겨져 틀린 리스트를 lock 없이 수정 → panic: release, push_off/pop_off 로 고침)
(function (global) {
  "use strict";
  global.SIMS = global.SIMS || {};

  var COL = { CPU0: "#1d65b3", CPU1: "#2e9e4f", CPU2: "#e09a40", P: "#7a4fc0" };
  var WARN = "#d6465f";
  var CPUS = ["CPU0", "CPU1", "CPU2"];

  // ---------------- 코드 패널 (의사코드) ----------------
  var NORMAL = [
    "freerange():   // 부팅 때 한 번 — 지금 도는 CPU 가 전부 받는다",
    "  push_off(); id = cpuid(); 모든 페이지를 kmem[id] 에 push; pop_off()",
    "kalloc():",
    "  push_off(); id = cpuid()          // 인터럽트 끄고 내 CPU 번호",
    "  acquire(kmem[id].lock)",
    "  r = kmem[id].freelist; r 있으면 kmem[id].freelist = r->next",
    "  release(kmem[id].lock)",
    "  r == 0 이면 → steal: 다른 CPU j 를 하나씩",
    "    acquire(kmem[j].lock)             // 한 번에 lock 하나만",
    "    kmem[j] 에서 한 장 떼어 r 로 (없으면 다음 j)",
    "    release(kmem[j].lock)",
    "  pop_off(); return r",
    "kfree(pa):",
    "  push_off(); id = cpuid()",
    "  acquire(kmem[id].lock)",
    "  pa 를 kmem[id] 리스트 맨 앞에 push",
    "  release(kmem[id].lock); pop_off()"
  ];
  var NAIVE = [
    "kalloc():   // 순진한 steal",
    "  push_off(); id = cpuid()",
    "  acquire(kmem[id].lock)               // 내 lock",
    "  내 리스트가 비었으면 → steal (j = 0,1,2 중 나 빼고)",
    "    acquire(kmem[j].lock)              // 내 lock 을 쥔 채로 남의 lock!",
    "    kmem[j] 에서 몇 장 떼어 내 리스트로",
    "    release(kmem[j].lock)",
    "  r = 내 리스트에서 pop",
    "  release(kmem[id].lock)",
    "  pop_off(); return r"
  ];
  var ORDERED = [
    "kalloc():   // lock ordering 버전",
    "  push_off(); id = cpuid()",
    "  acquire(kmem[id].lock); r = 내 리스트에서 pop; release(kmem[id].lock)",
    "  r == 0 이면 → steal (j = 0,1,2 중 나 빼고, 하나씩):",
    "    a = min(id, j); b = max(id, j)     // 번호 작은 lock 먼저",
    "    acquire(kmem[a].lock)",
    "    acquire(kmem[b].lock)",
    "    kmem[j] 에서 몇 장 떼어 내 리스트로, 그중 한 장 → r",
    "    release(kmem[b].lock); release(kmem[a].lock)",
    "    r 이 생겼으면 break",
    "  pop_off(); return r"
  ];
  var RACE_P = [
    "kfree(pa):   // 버그: 인터럽트 켠 채 cpuid() 를 매번 부름",
    "  acquire(kmem[cpuid()].lock)      // 인자 계산 때는 인터럽트 ON",
    "  pa->next = kmem[cpuid()].freelist",
    "  kmem[cpuid()].freelist = pa",
    "  release(kmem[cpuid()].lock)",
    "── 고친 설계 ──",
    "  push_off(); id = cpuid()         // 이제 다른 CPU 로 못 옮겨 간다",
    "  acquire(kmem[id].lock); pa 를 kmem[id] 에 push; release(kmem[id].lock)",
    "  pop_off()                         // 미뤄 둔 인터럽트는 여기서"
  ];
  var RACE_C2 = [
    "kalloc() on CPU2: 내 리스트 빔 → steal j = 1",
    "  acquire(kmem[1].lock)",
    "  r = kmem[1].freelist",
    "  kmem[1].freelist = r->next",
    "  release(kmem[1].lock); return r"
  ];

  // ---------------- 상태 ----------------
  function World(lists) {
    this.L = lists;                 // L[i] = 페이지 id 배열 (앞 = freelist head)
    this.lock = [null, null, null];
    this.tas = [0, 0, 0];
    this.loc = { CPU0: {}, CPU1: {}, CPU2: {} };
    this.st = { CPU0: "ready", CPU1: "ready", CPU2: "ready" };
    this.spin = {};                 // who -> lock index
    this.arrows = [];               // 이번 step 의 steal 화살표 {from,to,label}
    this.hl = {};                   // 방금 움직인 페이지
    this.bad = {};                  // 깨진 페이지
    this.cardNote = {};             // CPU 카드 둘째 줄 덧말
    this.steps = [];
    this.raceVars = false;
  }
  World.prototype.svg = function () {
    var self = this, W = 760, rowH = 78, top = 14, H = top + 3 * rowH + 10;
    var o = '<svg viewBox="0 0 ' + W + ' ' + H + '" width="100%" style="max-width:760px" font-family="sans-serif">';
    o += '<defs><marker id="ks-ar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0L10,5L0,10z" fill="#555"/></marker>' +
      '<marker id="ks-rd" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0L10,5L0,10z" fill="' + WARN + '"/></marker></defs>';
    function rowY(i) { return top + i * rowH; }
    CPUS.forEach(function (c, i) {
      var y = rowY(i), col = COL[c];
      // CPU 카드
      o += '<rect x="8" y="' + y + '" width="128" height="56" rx="7" fill="' + col + '" fill-opacity="0.10" stroke="' + col + '" stroke-width="2"/>';
      o += '<text x="72" y="' + (y + 20) + '" font-size="13" font-weight="700" text-anchor="middle" fill="' + col + '">' + c + '</text>';
      var sub = self.cardNote[c] || self.st[c];
      o += '<text x="72" y="' + (y + 40) + '" font-size="11" text-anchor="middle" fill="' + (self.st[c] === "spinning" || self.st[c] === "panic" ? WARN : "#444") + '">' + sub + '</text>';
      // kmem[i] + 자물쇠
      var h = self.lock[i], hc = h ? (/^P@/.test(h) ? COL.P : COL[h]) : "#b8b8b8";
      o += '<rect x="176" y="' + y + '" width="118" height="56" rx="4" fill="#fafafa" stroke="#999"/>';
      o += '<text x="186" y="' + (y + 19) + '" font-size="12" font-weight="700" fill="#333">kmem[' + i + ']</text>';
      var lx = 264, ly = y + 8;
      o += '<path d="M' + (lx + 4) + ',' + (ly + 10) + ' v-4 a6,6 0 0 1 12,0 v4" fill="none" stroke="' + hc + '" stroke-width="2.4"/>';
      o += '<rect x="' + lx + '" y="' + (ly + 10) + '" width="20" height="14" rx="2" fill="' + hc + '"/>';
      o += '<text x="186" y="' + (y + 36) + '" font-size="10" fill="#555">lock: ' + (h || "free") + '</text>';
      o += '<text x="186" y="' + (y + 50) + '" font-size="10" fill="#555">#tas ' + self.tas[i] + '</text>';
      // 페이지 상자
      o += '<text x="308" y="' + (y + 10) + '" font-size="9" fill="#888">freelist →</text>';
      if (!self.L[i].length) o += '<text x="314" y="' + (y + 38) + '" font-size="11" fill="#999">(비어 있음, 0)</text>';
      self.L[i].forEach(function (p, k) {
        var x = 308 + k * 58, bad = self.bad[p], hl = self.hl[p];
        o += '<rect x="' + x + '" y="' + (y + 16) + '" width="48" height="34" rx="3" fill="' + (bad ? "#fde2e6" : "#fff") + '" stroke="' + (bad ? WARN : hl ? "#333" : "#999") + '" stroke-width="' + (bad || hl ? 2.4 : 1.2) + '"/>';
        o += '<text x="' + (x + 24) + '" y="' + (y + 38) + '" font-size="12" text-anchor="middle" fill="#333">' + p + '</text>';
        if (k < self.L[i].length - 1) o += '<line x1="' + (x + 48) + '" y1="' + (y + 33) + '" x2="' + (x + 58) + '" y2="' + (y + 33) + '" stroke="#999" marker-end="url(#ks-ar)"/>';
      });
      // spin 표시: 이 CPU 가 다른 줄의 lock 을 기다림
      if (self.spin[c] !== undefined) {
        var j = self.spin[c], ty = rowY(j) + 28, sy = y + 28;
        if (j === i) {
          o += '<text x="140" y="' + (y + 70) + '" font-size="10" fill="' + WARN + '">spin on kmem[' + j + '].lock</text>';
        } else {
          var ey = ty + (j > i ? -10 : 10);
          o += '<path d="M136,' + sy + ' C160,' + sy + ' 152,' + ey + ' 175,' + ey + '" fill="none" stroke="' + WARN + '" stroke-width="2" stroke-dasharray="5,3" marker-end="url(#ks-rd)"/>';
          o += '<text x="140" y="' + (sy + (j > i ? 14 : -6)) + '" font-size="10" fill="' + WARN + '">spin→' + j + '</text>';
        }
      }
    });
    // steal 화살표: 오른쪽 여백에서 줄 사이를 잇는다
    self.arrows.forEach(function (a, n) {
      var y1 = rowY(a.from) + 33, y2 = rowY(a.to) + 33, lo = Math.min(a.from, a.to), hi = Math.max(a.from, a.to), m = 1;
      for (var r = lo; r <= hi; r++) m = Math.max(m, self.L[r].length || 2);
      var x0 = 308 + m * 58 + 4 + n * 16, xc = x0 + 46;
      o += '<path d="M' + x0 + ',' + y1 + ' C' + xc + ',' + y1 + ' ' + xc + ',' + y2 + ' ' + x0 + ',' + y2 + '" fill="none" stroke="#333" stroke-width="2" marker-end="url(#ks-ar)"/>';
      o += '<text x="' + (xc - 2) + '" y="' + ((y1 + y2) / 2 + 4) + '" font-size="11" font-weight="700" fill="#333">' + a.label + '</text>';
    });
    return o + '</svg>';
  };
  World.prototype.snap = function (desc, pc, note) {
    var self = this, v = {};
    [0, 1, 2].forEach(function (i) {
      v["L" + i] = self.L[i].slice();
      v["lk" + i] = self.lock[i] || "free";
      v["tas" + i] = self.tas[i];
    });
    CPUS.forEach(function (c) {
      v[c + ".id"] = self.loc[c].id !== undefined ? self.loc[c].id : "–";
      v[c + ".r"] = self.loc[c].r !== undefined ? self.loc[c].r : "–";
    });
    if (this.raceVars) {
      v["P.cpu"] = this.loc.P.cpu; v["P.intr"] = this.loc.P.intr; v["P.cpuid"] = this.loc.P.cpuid;
    }
    var status = {};
    Object.keys(pc).forEach(function (k) { status[k] = self.st[k] || (self.loc[k] && self.loc[k].st) || "ready"; });
    var s = { desc: desc, pc: pc, vars: v, status: status, svg: this.svg() };
    if (note) s.note = note;
    this.steps.push(s);
    this.arrows = []; this.hl = {};
  };
  World.prototype.vars = function () {
    var vs = [];
    [0, 1, 2].forEach(function (i) {
      var g = "kmem[" + i + "]";
      vs.push({ name: "L" + i, label: "freelist (head 먼저)", group: g });
      vs.push({ name: "lk" + i, label: "lock 주인", group: g });
      vs.push({ name: "tas" + i, label: "#test-and-set", group: g });
    });
    CPUS.forEach(function (c) {
      vs.push({ name: c + ".id", label: c + " id", group: "CPU 지역 변수" });
      vs.push({ name: c + ".r", label: c + " r", group: "CPU 지역 변수" });
    });
    if (this.raceVars) {
      vs.push({ name: "P.cpu", label: "P 가 지금 도는 CPU", group: "프로세스 P" });
      vs.push({ name: "P.intr", label: "P 인터럽트", group: "프로세스 P" });
      vs.push({ name: "P.cpuid", label: "방금 cpuid() 값", group: "프로세스 P" });
    }
    return vs;
  };
  World.prototype.take = function (who, i) {    // lock 획득 (비어 있을 때만 호출)
    this.lock[i] = who; delete this.spin[who.replace(/^P@/, "")];
  };
  World.prototype.wait = function (c, i, n) {   // spin
    this.spin[c] = i; this.st[c] = "spinning"; this.tas[i] += n;
  };

  function pages(n, from) { var a = []; for (var k = n - 1; k >= 0; k--) a.push("p" + (k + from)); return a; }

  // ---------------- normal ----------------
  function buildNormal() {
    var w = new World([[], [], []]);
    w.snap("'''[[per-CPU free list]]''': 원본 xv6 는 `kmem` 하나와 `kmem.lock` 하나 → 모든 CPU 의 [[kalloc]]/kfree 가 같은 [[spin lock]] 을 두고 경쟁한다([[lock contention]]). 과제는 이걸 CPU 마다 `kmem[i]`(리스트 + lock) 로 쪼갠다. kinit 이 lock 3개를 초기화(이름은 \"kmem\" 으로 시작). 페이지는 6장(p0~p5)만 있다고 하자.",
      { CPU0: 1, CPU1: null, CPU2: null });
    w.L[0] = pages(6, 0); w.loc.CPU0.id = 0; w.st.CPU0 = "running";
    w.snap("CPU0 이 freerange 를 돈다. 과제 힌트대로 '''freerange 를 실행하는 CPU 에게 전부''' 준다 → kmem[0] = p5→p4→…→p0, 나머지 CPU 리스트는 비어 있다. (헤드가 p5 인 건 앞에 push 했기 때문)",
      { CPU0: 2, CPU1: null, CPU2: null });
    w.st.CPU0 = "ready"; w.st.CPU1 = "running"; w.loc.CPU1.id = 1;
    w.snap("CPU1 에서 [[kalloc]]. 먼저 `push_off()` 로 인터럽트를 끄고 `cpuid()` = 1. 인터럽트를 끄는 이유는 [[cpuid]] 를 읽은 뒤 다른 CPU 로 옮겨지면 id 가 틀어지기 때문이다(옵션 cpuid_race).",
      { CPU0: null, CPU1: 4, CPU2: null });
    w.take("CPU1", 1);
    w.snap("`acquire(kmem[1].lock)` — 자기 lock 이라 아무도 경쟁하지 않는다. #test-and-set 0 그대로.",
      { CPU0: null, CPU1: 5, CPU2: null });
    w.loc.CPU1.r = 0;
    w.snap("내 리스트 head 를 본다 → '''비어 있다''' (r = 0).", { CPU0: null, CPU1: 6, CPU2: null });
    w.lock[1] = null;
    w.snap("내 lock 을 '''먼저 놓는다'''. (내 lock 을 쥔 채 남의 lock 을 잡으면 옵션 deadlock 의 상황이 된다.)",
      { CPU0: null, CPU1: 7, CPU2: null });
    w.snap("r == 0 → '''[[steal]]''': 다른 CPU 의 리스트를 j = 0, 2 순으로 본다. j = 0.", { CPU0: null, CPU1: 8, CPU2: null });
    w.take("CPU1", 0);
    w.snap("`acquire(kmem[0].lock)` — '''이 순간 쥐고 있는 lock 은 이것 하나뿐'''이라 circular wait 가 생길 수 없다. 지금 CPU0 은 kalloc 중이 아니므로 바로 획득.",
      { CPU0: null, CPU1: 9, CPU2: null });
    w.L[0].shift(); w.loc.CPU1.r = "p5"; w.arrows.push({ from: 0, to: 1, label: "steal p5" });
    w.snap("kmem[0] 의 head p5 를 떼어 r 로. (한 장만 가져와도 되고, 여러 장을 내 리스트로 옮겨 다음 steal 을 줄여도 된다 — 설계 선택.)",
      { CPU0: null, CPU1: 10, CPU2: null });
    w.lock[0] = null;
    w.snap("`release(kmem[0].lock)`.", { CPU0: null, CPU1: 11, CPU2: null });
    w.st.CPU1 = "done";
    w.snap("`pop_off()` 후 p5 반환. CPU1 이 p5 를 쓴다.", { CPU0: null, CPU1: 12, CPU2: null });
    w.st.CPU2 = "running"; w.loc.CPU2.id = 2; w.st.CPU1 = "ready";
    w.snap("p5 를 쓰던 프로세스가 '''CPU2 로 옮겨 가서''' kfree(p5). `push_off(); cpuid()` = 2.", { CPU0: null, CPU1: null, CPU2: 14 });
    w.take("CPU2", 2);
    w.snap("`acquire(kmem[2].lock)` — 역시 자기 lock.", { CPU0: null, CPU1: null, CPU2: 15 });
    w.L[2].unshift("p5"); w.hl.p5 = true;
    w.snap("p5 를 '''kfree 하는 CPU 의 리스트'''(kmem[2]) 앞에 push. 누가 kalloc 했던 페이지든 상관없다.", { CPU0: null, CPU1: null, CPU2: 16 });
    w.lock[2] = null; w.st.CPU2 = "ready";
    w.snap("release, pop_off. 이제 kmem[0] 에 5장, kmem[2] 에 1장.", { CPU0: null, CPU1: null, CPU2: 17 });
    w.st.CPU0 = "running"; w.st.CPU2 = "running"; w.loc.CPU0.id = 0; w.loc.CPU2.id = 2;
    w.snap("CPU0 과 CPU2 가 '''동시에''' kalloc. 각자 `cpuid()` = 0, 2.", { CPU0: 4, CPU1: null, CPU2: 4 });
    w.take("CPU0", 0); w.take("CPU2", 2);
    w.snap("둘 다 `acquire` — '''서로 다른 lock''' 이라 같은 순간에 둘 다 성공. #test-and-set 이 전부 0 이다. 원본 xv6 였다면 둘 중 하나가 `kmem.lock` 에서 spin 했을 것.",
      { CPU0: 5, CPU1: null, CPU2: 5 });
    w.L[0].shift(); w.L[2].shift(); w.loc.CPU0.r = "p4"; w.loc.CPU2.r = "p5";
    w.snap("CPU0 은 p4, CPU2 는 p5 를 pop.", { CPU0: 6, CPU1: null, CPU2: 6 });
    w.lock[0] = null; w.lock[2] = null;
    w.snap("release. r ≠ 0 이라 steal 은 건너뛴다.", { CPU0: 7, CPU1: null, CPU2: 7 });
    w.st.CPU0 = "done"; w.st.CPU2 = "done";
    w.snap("둘 다 반환. 정리: '''평소엔 자기 lock 만''' 잡으니 contention 이 거의 0 이고, 경쟁은 steal 할 때만 생긴다. kalloctest 가 출력하는 `kmem` lock 의 `#test-and-set` 이 바로 이 spin 횟수다.",
      { CPU0: 12, CPU1: null, CPU2: 12 });
    return { w: w, panels: CPUS.map(function (c) { return { id: c, title: c, lang: "c", lines: NORMAL }; }) };
  }

  // ---------------- deadlock ----------------
  function buildDeadlock() {
    var w = new World([[], [], pages(4, 0)]);
    w.snap("순진한 [[steal]]: '''내 lock 을 쥔 채로''' 남의 리스트 lock 을 잡는다. 상황: kmem[0]·kmem[1] 은 비었고 페이지 4장은 전부 kmem[2] 에 있다. CPU0 과 CPU1 이 동시에 kalloc 한다.",
      { CPU0: 1, CPU1: 1, CPU2: null });
    w.st.CPU0 = w.st.CPU1 = "running"; w.loc.CPU0.id = 0; w.loc.CPU1.id = 1;
    w.snap("둘 다 `push_off(); cpuid()` → id 0, 1.", { CPU0: 2, CPU1: 2, CPU2: null });
    w.take("CPU0", 0); w.take("CPU1", 1);
    w.snap("각자 자기 lock 획득: CPU0 → kmem[0], CPU1 → kmem[1]. 여기까진 문제없다.", { CPU0: 3, CPU1: 3, CPU2: null });
    w.snap("둘 다 리스트가 비었다 → steal. j 를 0,1,2 순서로 보되 자기는 건너뛰니 '''CPU0 은 j = 1, CPU1 은 j = 0''' 부터.", { CPU0: 4, CPU1: 4, CPU2: null });
    w.wait("CPU0", 1, 1);
    w.snap("CPU0: `acquire(kmem[1].lock)` — CPU1 이 쥐고 있다 → [[test-and-set]] 실패, '''spin'''. CPU0 은 kmem[0] 을 쥔 채다 (hold and wait).",
      { CPU0: 5, CPU1: 4, CPU2: null });
    w.wait("CPU1", 0, 1); w.tas[1] += 1;
    w.snap("CPU1: `acquire(kmem[0].lock)` — CPU0 이 쥐고 있다 → spin. CPU0 → kmem[1] → CPU1 → kmem[0] → CPU0 고리가 닫혔다: '''circular wait'''.",
      { CPU0: 5, CPU1: 5, CPU2: null }, "[[데드락]]: CPU0 은 kmem[0] 을 쥔 채 kmem[1] 을, CPU1 은 kmem[1] 을 쥔 채 kmem[0] 을 기다린다.");
    w.tas[0] += 4096; w.tas[1] += 4096;
    w.snap("시간이 흘러도 둘 다 [[spin lock]] 에서 돈다. `acquire` 가 인터럽트를 꺼 두었으니 타이머도 이 CPU 들을 다른 일로 돌려 주지 못한다. #test-and-set 만 계속 오른다.",
      { CPU0: 5, CPU1: 5, CPU2: null }, "spin 은 영원히 끝나지 않는다 — kalloctest 는 시간 초과로 실패한다.");
    w.st.CPU2 = "running"; w.loc.CPU2.id = 2;
    w.snap("한편 CPU2 의 kalloc 은 자기 lock 만 쓰니 멀쩡히 돈다. 페이지는 CPU2 에 남아 있는데 CPU0·CPU1 은 못 가져간다.", { CPU0: 5, CPU1: 5, CPU2: 2 });
    w.take("CPU2", 2);
    w.snap("CPU2: `acquire(kmem[2].lock)` 성공, 리스트가 비지 않았다.", { CPU0: 5, CPU1: 5, CPU2: 3 });
    w.L[2].shift(); w.loc.CPU2.r = "p3";
    w.snap("CPU2: p3 pop.", { CPU0: 5, CPU1: 5, CPU2: 8 });
    w.lock[2] = null; w.st.CPU2 = "done";
    w.snap("CPU2 반환. 하지만 이후 kmem[0] 이나 kmem[1] 을 잡으려는 CPU 는 전부 같이 멈춘다.", { CPU0: 5, CPU1: 5, CPU2: 10 },
      "고치는 법은 12강 [[lock ordering]]: lock 두 개를 쥘 거면 모두가 같은 순서(번호 작은 것부터)로. 또는 한 번에 lock 하나만 쥐도록(옵션 normal). → 옵션 ordered");
    return { w: w, panels: CPUS.map(function (c) { return { id: c, title: c, lang: "c", lines: NAIVE }; }) };
  }

  // ---------------- ordered ----------------
  function buildOrdered() {
    var w = new World([[], [], pages(4, 0)]);
    var pc = function (a, b) { return { CPU0: a, CPU1: b, CPU2: null }; };
    w.snap("옵션 deadlock 과 같은 상황(kmem[0]·kmem[1] 빔, 페이지는 kmem[2]). 이번엔 steal 할 때 lock 두 개를 '''항상 번호 작은 것부터''' 잡는다([[lock ordering]]).", pc(1, 1));
    w.st.CPU0 = w.st.CPU1 = "running"; w.loc.CPU0.id = 0; w.loc.CPU1.id = 1;
    w.snap("`push_off(); cpuid()` → 0, 1.", pc(2, 2));
    w.loc.CPU0.r = 0; w.loc.CPU1.r = 0;
    w.snap("각자 자기 lock 을 잠깐 잡고 pop 시도 → 비었음, '''바로 놓는다'''. 지금 쥔 lock 없음.", pc(3, 3));
    w.snap("steal: CPU0 은 j = 1, CPU1 은 j = 0.", pc(4, 4));
    w.snap("둘 다 (a, b) = (0, 1). '''누가 훔치든 kmem[0] 부터''' 잡는다.", pc(5, 5));
    w.take("CPU0", 0); w.wait("CPU1", 0, 3);
    w.snap("CPU0 이 kmem[0] 획득. CPU1 도 kmem[0] 을 원하니 spin — 그런데 CPU1 은 '''아무 lock 도 쥐고 있지 않다'''. 그러니 CPU0 을 막을 수 없다.", pc(6, 6));
    w.take("CPU0", 1); w.tas[0] += 5;
    w.snap("CPU0: `acquire(kmem[1].lock)` — 비어 있으므로 성공. 옵션 deadlock 에선 여기서 막혔다.", pc(7, 6));
    w.snap("CPU0: kmem[1] 도 비었다 → 가져올 게 없음.", pc(8, 6));
    w.lock[0] = null; w.lock[1] = null; w.take("CPU1", 0); w.st.CPU1 = "running";
    w.snap("CPU0 이 둘 다 release → CPU1 의 spin 이 끝나 kmem[0] 획득.", pc(9, 6));
    w.take("CPU1", 1);
    w.snap("CPU0: r 없음 → 다음 j = 2, (a, b) = (0, 2). CPU1 은 kmem[1] 획득 (쥔 것: kmem[0], kmem[1]).", pc(5, 7));
    w.wait("CPU0", 0, 2);
    w.snap("CPU0 이 kmem[0] 을 원하지만 CPU1 이 쥐고 있다 → spin (역시 빈손). CPU1: kmem[0] 비었음.", pc(6, 8));
    w.lock[0] = null; w.lock[1] = null; w.take("CPU0", 0); w.st.CPU0 = "running";
    w.snap("CPU1 release → CPU0 이 kmem[0] 획득. CPU1 은 다음 j = 2, (a, b) = (1, 2).", pc(6, 5));
    w.take("CPU0", 2); w.take("CPU1", 1);
    w.snap("CPU0: kmem[2] 획득 (쥔 것: kmem[0], kmem[2]). CPU1: kmem[1] 획득.", pc(7, 6));
    w.L[2].splice(0, 2); w.L[0] = ["p2"]; w.loc.CPU0.r = "p3"; w.hl.p2 = true; w.arrows.push({ from: 2, to: 0, label: "steal p3,p2" });
    w.wait("CPU1", 2, 2);
    w.snap("CPU0: kmem[2] 에서 2장(p3, p2) 을 옮겨 p3 → r, p2 는 내 리스트에. CPU1: kmem[2] 를 원함 → spin (kmem[1] 을 쥐고 있지만, 더 작은 번호를 기다리는 사람은 없다).", pc(8, 7));
    w.lock[0] = null; w.lock[2] = null; w.take("CPU1", 2); w.st.CPU1 = "running";
    w.snap("CPU0 release → CPU1 이 kmem[2] 획득.", pc(9, 7));
    w.st.CPU0 = "done"; w.L[2].splice(0, 2); w.L[1] = ["p0"]; w.loc.CPU1.r = "p1"; w.hl.p0 = true; w.arrows.push({ from: 2, to: 1, label: "steal p1,p0" });
    w.snap("CPU0 은 r = p3 → break → 반환. CPU1 은 kmem[2] 에서 p1, p0 을 옮겨 p1 → r.", pc(11, 8));
    w.lock[1] = null; w.lock[2] = null;
    w.snap("CPU1 release.", pc(11, 9));
    w.st.CPU1 = "done";
    w.snap("CPU1 반환. 대기 그래프에 '''큰 번호 → 작은 번호''' 방향 화살표가 생길 수 없으니 고리도 생길 수 없다 = circular wait 조건을 깼다 (12강 [[lock ordering]]). 남은 페이지: kmem[0] p2, kmem[1] p0.",
      pc(11, 11));
    return { w: w, panels: CPUS.map(function (c) { return { id: c, title: c, lang: "c", lines: ORDERED }; }) };
  }

  // ---------------- cpuid_race ----------------
  function buildRace() {
    var w = new World([["p1"], ["p3", "p4"], []]);
    w.raceVars = true;
    w.loc.P = { cpu: "CPU0", intr: "on", cpuid: "–", st: "running" };
    w.cardNote.CPU0 = "P 실행 중";
    var pc = function (p, c) { return { P: p, CPU2: c }; };
    w.st.P = "running";
    w.snap("[[cpuid]] 함정. 프로세스 P 가 CPU0 에서 kfree(p7) 을 부른다. 이 버전은 `push_off()` 없이 '''인터럽트를 켠 채''' `cpuid()` 를 줄마다 다시 부른다. (원본 xv6 `cpuid()` 주석: \"Must be called with interrupts disabled\")",
      pc(1, null));
    w.loc.P.cpuid = 0;
    w.snap("`acquire(kmem[cpuid()].lock)` 의 '''인자'''를 먼저 계산 → cpuid() = 0. 아직 acquire 전이라 인터럽트는 켜져 있다.", pc(2, null));
    w.loc.P.cpu = "CPU1"; w.cardNote.CPU0 = "다른 일"; w.cardNote.CPU1 = "P 실행 중";
    w.snap("바로 그때 '''타이머 인터럽트''' → yield. 스케줄러가 P 를 다시 고를 때는 '''CPU1''' 에서 돈다. P 손에 든 값은 여전히 0.", pc(2, null));
    w.take("P@CPU1", 0); w.loc.P.intr = "off";
    w.snap("CPU1 위에서 `acquire(kmem[0].lock)` — 0번 lock 을 잡았다. acquire 가 인터럽트를 끄니 이제부터는 안 옮겨진다.", pc(2, null));
    w.st.CPU2 = "running"; w.loc.CPU2.id = 2; w.take("CPU2", 1);
    w.snap("한편 CPU2 는 자기 리스트가 비어 kmem[1] 에서 steal 중: `acquire(kmem[1].lock)` — 정상적으로 1번 lock 을 쥔다.", pc(2, 2));
    w.loc.CPU2.r = "p3";
    w.snap("CPU2: r = kmem[1].freelist = p3.", pc(2, 3));
    w.loc.P.cpuid = 1;
    w.snap("P: `pa->next = kmem[cpuid()].freelist` — 지금 cpuid() 는 '''1''' 이다! P 는 0번 lock 만 쥔 채 '''kmem[1] 을 lock 없이''' 읽는다 → p7->next = p3.", pc(3, 3),
      "kmem[1].lock 은 CPU2 가 쥐고 있는데 P 도 kmem[1] 을 만진다 = race condition.");
    w.L[1] = ["p4"];
    w.snap("CPU2: `kmem[1].freelist = r->next` → head = p4. p3 은 CPU2 가 가져간다.", pc(3, 4));
    w.L[1] = ["p7", "p3"]; w.bad.p3 = true; w.bad.p7 = true;
    w.snap("P: `kmem[cpuid()].freelist = pa` → kmem[1] = p7 → p3. '''p3 은 CPU2 가 쓰는 중인데 free list 에도 있다'''(다음 kalloc 이 또 줌 → 두 곳이 같은 페이지를 씀), '''p4 는 리스트에서 사라졌다'''(lost page).",
      pc(4, 4), "free list 가 깨졌다: 이중 할당 + 페이지 누수.");
    w.lock[1] = null; w.st.CPU2 = "done";
    w.snap("CPU2: release(kmem[1].lock), p3 반환.", pc(4, 5));
    w.loc.P.st = "panic"; w.st.P = "panic"; w.cardNote.CPU1 = "panic";
    w.snap("P: `release(kmem[cpuid()].lock)` = release(kmem[1].lock) — 이 CPU 가 쥔 lock 이 아니다 → xv6 `release` 의 `holding()` 검사에 걸려 '''panic: release'''. kmem[0].lock 은 영영 안 풀린다.",
      pc(5, 5), "panic: release");
    // 고친 설계
    w.L = [["p1"], ["p3", "p4"], []]; w.bad = {}; w.lock = [null, null, null]; w.tas = [0, 0, 0];
    w.loc.P = { cpu: "CPU0", intr: "off", cpuid: 0, st: "running" }; w.st.P = "running";
    w.loc.CPU2 = {}; w.st.CPU2 = "ready"; w.cardNote = { CPU0: "P 실행 중" };
    w.snap("'''같은 순간을 고친 설계로''' 다시. P(CPU0): `push_off()` 로 인터럽트를 끄고 `id = cpuid()` = 0. 타이머 인터럽트가 와도 '''pending''' 으로 미뤄진다.", pc(7, null));
    w.take("P@CPU0", 0);
    w.snap("`acquire(kmem[0].lock)` — '''id 로 고른 리스트와 lock 이 언제나 같은 번호'''.", pc(8, null));
    w.L[0] = ["p7", "p1"]; w.hl.p7 = true; w.lock[0] = null;
    w.snap("p7 을 kmem[0] 에 push, release. CPU2 가 kmem[1] 에서 무엇을 하든 서로 다른 lock·다른 리스트라 안전하다.", pc(8, null));
    w.loc.P.intr = "on"; w.loc.P.cpu = "CPU1"; w.cardNote = { CPU1: "P 실행 중" };
    w.snap("`pop_off()` → 미뤄 둔 인터럽트가 이제 처리되고 P 가 CPU1 로 옮겨 가도 괜찮다. 이미 일이 끝났으니까. 요점: '''cpuid() 는 push_off() 와 pop_off() 사이에서 한 번 읽고, 그 값만 쓴다'''.",
      pc(9, null));
    var panels = [
      { id: "P", title: "프로세스 P: kfree(p7)", lang: "c", lines: RACE_P },
      { id: "CPU2", title: "CPU2: kalloc (steal)", lang: "c", lines: RACE_C2 }];
    return { w: w, panels: panels };
  }

  global.SIMS["kalloc_steal"] = {
    title: "per-CPU free list 와 steal (과제 2 Problem 1)",
    desc: "CPU 3개 · 페이지 몇 장으로 [[per-CPU free list]] 의 [[kalloc]]/kfree 를 줄 단위로 돌린다. 코드는 '''설계 수준 의사코드''' 다. 순진한 [[steal]] 의 [[데드락]], [[lock ordering]] 으로 푸는 법, [[cpuid]] 를 인터럽트 켠 채 읽을 때의 함정까지.",
    options: [
      {
        key: "scenario", label: "시나리오",
        values: [
          { value: "normal", label: "normal — freerange → steal → kfree → 동시 kalloc" },
          { value: "deadlock", label: "deadlock — 내 lock 쥔 채 남의 lock (circular wait)" },
          { value: "ordered", label: "ordered — 번호 작은 lock 먼저 (데드락 없음)" },
          { value: "cpuid_race", label: "cpuid_race — 인터럽트 켠 채 cpuid() → push_off 로 고침" }
        ]
      }
    ],
    build: function (opts) {
      var s = opts.scenario || "normal";
      var r = s === "deadlock" ? buildDeadlock() : s === "ordered" ? buildOrdered() : s === "cpuid_race" ? buildRace() : buildNormal();
      return { panels: r.panels, vars: r.w.vars(), steps: r.w.steps };
    }
  };
})(typeof window !== "undefined" ? window : globalThis);
