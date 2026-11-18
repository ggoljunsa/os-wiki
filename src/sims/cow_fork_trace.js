// cow_fork_trace — 과제 3 (xv6 COW fork) Problem 1: fork → 공유 → store page fault → 복사 → exit 를 단계별로.
// 커널 패널은 '설계 수준 의사코드' 다 (과제 정답 uvmcopy/usertrap/kfree 가 아님). 원본 xv6 uvmcopy 는 page 마다 kalloc + memmove.
// 물리 frame: A 0x87f40000(text) B 0x87f41000(data) C 0x87f42000(guard) D 0x87f43000(stack) N 0x87f50000(COW 복사본)
// scenario: basic(자식 쓰기 → 복사, 자식 exit, 부모 쓰기 → count 1 이라 복사 없이 W)
//           text_write(원래 read-only 인 text 에 쓰기 → kill)
//           fork_exec(자식이 바로 exec → 복사 0 번)
//           copyout(자식 read() 가 COW page 로 → 원본 copyout 은 −1, 고친 copyout 은 복사 후 씀)
(function (global) {
  "use strict";
  global.SIMS = global.SIMS || {};

  var PA = { A: "0x87f40000", B: "0x87f41000", C: "0x87f42000", D: "0x87f43000", N: "0x87f50000", E: "0x87f60000", F: "0x87f61000" };
  var VAS = ["0x0", "0x1000", "0x2000", "0x3000"];
  var ROLE = { "0x0": "text", "0x1000": "data", "0x2000": "guard", "0x3000": "stack" };
  var BLUE = "#1d65b3", GREEN = "#2e9e4f", WARN = "#d6465f", K = "#3b2f4a";

  var KLINES = [
    "fork() → uvmcopy(부모, 자식, sz):",                    // 1
    "  VA 마다 부모 PTE 를 읽는다",                           // 2
    "  원래 W 였으면 → 부모 PTE 의 W 끄고 COW 표시",           // 3
    "  자식 PTE ← 같은 PA, 같은 flag",                        // 4
    "  refcount[PA] += 1   (새 page 할당 없음)",              // 5
    "usertrap(): scause == 15 (store page fault)",            // 6
    "  va = stval. PTE 가 V·U·COW 인가? 아니면 kill",         // 7
    "  refcount == 1 → W 켜고 COW 지움 (복사 생략)",          // 8
    "  아니면 new = kalloc()  (0 이면 kill)",                 // 9
    "  옛 page 4096 B 를 new 로 복사",                        // 10
    "  PTE ← new | W, COW 지움",                              // 11
    "  kfree(옛 PA)   → refcount − 1",                        // 12
    "  epc 는 그대로 → 돌아가면 같은 store 를 다시",          // 13
    "exit() → uvmunmap(…, do_free=1): VA 마다 kfree",         // 14
    "kfree(pa): refcount − 1, 0 이면 free list 로",           // 15
    "copyout(dst): PTE 가 COW 면 7~12 를 먼저 한다",          // 16
    "exec(): 새 page table 을 만들고 옛 것은 uvmfree"         // 17
  ];

  function World() {
    this.P = {};          // VA → {f, R, W, X, U, cow}
    this.C = null;        // 자식 page table (fork 전에는 없음)
    this.rc = {};         // frame → refcount
    this.freed = {};      // free list 로 간 frame
    this.trap = { scause: "-", stval: "-", epc: "-" };
    this.ps = { P: "running", C: "-" };
    this.hl = {};         // 이번 step 에 강조할 것 ("P:0x1000", "C:0x1000", "f:B")
    this.steps = [];
  }
  World.prototype.flags = function (e) {
    if (!e) return "-";
    return e.f + " " + (e.R ? "R" : "-") + (e.W ? "W" : "-") + (e.X ? "X" : "-") + (e.U ? "U" : "-") + (e.cow ? " COW" : "");
  };
  World.prototype.vars = function () {
    var v = [];
    VAS.forEach(function (va) { v.push({ name: "부모 " + va, group: "부모 PTE" }); });
    VAS.forEach(function (va) { v.push({ name: "자식 " + va, group: "자식 PTE" }); });
    ["A", "B", "C", "D", "N"].forEach(function (f) { v.push({ name: "rc[" + f + "]", group: "refcount" }); });
    v.push({ name: "scause", group: "trap" }, { name: "stval", group: "trap" }, { name: "epc", group: "trap" });
    return v;
  };
  World.prototype.snapVars = function () {
    var self = this, o = {};
    VAS.forEach(function (va) {
      o["부모 " + va] = self.flags(self.P[va]);
      o["자식 " + va] = self.C ? self.flags(self.C[va]) : "(없음)";
    });
    ["A", "B", "C", "D", "N"].forEach(function (f) {
      o["rc[" + f + "]"] = self.freed[f] ? "0 (free)" : (self.rc[f] === undefined ? "-" : self.rc[f]);
    });
    o.scause = this.trap.scause; o.stval = this.trap.stval; o.epc = this.trap.epc;
    return o;
  };
  World.prototype.svg = function () {
    var self = this, W = 760, H = 250;
    var o = '<svg viewBox="0 0 ' + W + ' ' + H + '" width="100%" style="max-width:760px" font-family="sans-serif">';
    o += '<defs><marker id="cft-ar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0L10,5L0,10z" fill="#666"/></marker></defs>';
    var frames = ["A", "B", "C", "D", "N"];
    if (this.rc.E !== undefined) frames = ["A", "B", "C", "D", "E", "F"];
    var fy = {}, fx = 320, fw = 120;
    frames.forEach(function (f, i) { fy[f] = 34 + i * 38; });
    function table(x, title, T, col, who) {
      var s = '<text x="' + (x + 85) + '" y="20" font-size="13" font-weight="700" text-anchor="middle" fill="' + col + '">' + title + ' (' + self.ps[who] + ')</text>';
      VAS.forEach(function (va, i) {
        var y = 34 + i * 46, e = T ? T[va] : null, hl = self.hl[who + ":" + va];
        s += '<rect x="' + x + '" y="' + y + '" width="170" height="36" rx="4" fill="' + (hl ? "#fff4c2" : "#fafafa") + '" stroke="' + (e && e.cow ? WARN : "#999") + '" stroke-width="' + (e && e.cow ? 2 : 1) + '"/>';
        s += '<text x="' + (x + 6) + '" y="' + (y + 15) + '" font-size="11" fill="#555">VA ' + va + ' ' + ROLE[va] + '</text>';
        s += '<text x="' + (x + 6) + '" y="' + (y + 30) + '" font-size="12" font-family="monospace" fill="#222">' + (e ? self.flags(e) : "(없음)") + '</text>';
      });
      return s;
    }
    o += table(10, "부모 page table", this.P, BLUE, "P");
    o += table(580, "자식 page table", this.C, GREEN, "C");
    o += '<text x="' + (fx + fw / 2) + '" y="20" font-size="13" font-weight="700" text-anchor="middle" fill="' + K + '">물리 frame · refcount</text>';
    frames.forEach(function (f) {
      var y = fy[f], dead = self.freed[f], used = self.rc[f] !== undefined || dead;
      if (!used) return;
      o += '<rect x="' + fx + '" y="' + y + '" width="' + fw + '" height="30" rx="4" fill="' + (dead ? "#eee" : self.hl["f:" + f] ? "#fff4c2" : "#efe9f6") + '" stroke="' + (dead ? "#bbb" : K) + '"/>';
      o += '<text x="' + (fx + 6) + '" y="' + (y + 19) + '" font-size="12" fill="' + (dead ? "#999" : "#222") + '">' + f + ' ' + PA[f].slice(6) + '</text>';
      o += '<text x="' + (fx + fw - 6) + '" y="' + (y + 19) + '" font-size="12" font-weight="700" text-anchor="end" fill="' + (dead ? "#999" : (self.rc[f] > 1 ? WARN : "#1d6b2a")) + '">' + (dead ? "free" : "rc " + self.rc[f]) + '</text>';
    });
    function arrows(T, x0, toLeft, col) {
      if (!T) return "";
      var s = "";
      VAS.forEach(function (va, i) {
        var e = T[va]; if (!e || fy[e.f] === undefined) return;
        var y1 = 34 + i * 46 + 18, y2 = fy[e.f] + 15;
        var x2 = toLeft ? fx + fw : fx;
        s += '<line x1="' + x0 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '" stroke="' + col + '" stroke-width="1.4" stroke-opacity="0.75" marker-end="url(#cft-ar)"/>';
      });
      return s;
    }
    o += arrows(this.P, 180, false, BLUE);
    o += arrows(this.C, 580, true, GREEN);
    o += '<text x="380" y="242" font-size="11" text-anchor="middle" fill="#777">빨간 테두리 = COW 표시(RSW bit). rc 가 2 이상이면 그 frame 을 여러 page table 이 같이 가리킨다.</text>';
    return o + '</svg>';
  };
  World.prototype.snap = function (desc, pc, note, status) {
    var st = { U: this.ps.P === "killed" ? "blocked" : "running", K: pc.K ? "running" : "ready" };
    if (status) for (var k in status) st[k] = status[k];
    this.steps.push({ desc: desc, pc: pc, vars: this.snapVars(), status: st, note: note, svg: this.svg() });
    this.hl = {};
  };

  function clone(e) { return { f: e.f, R: e.R, W: e.W, X: e.X, U: e.U, cow: e.cow }; }
  function initParent(w) {
    w.P = {
      "0x0":    { f: "A", R: 1, W: 0, X: 1, U: 1, cow: 0 },
      "0x1000": { f: "B", R: 1, W: 1, X: 0, U: 1, cow: 0 },
      "0x2000": { f: "C", R: 1, W: 1, X: 0, U: 0, cow: 0 },
      "0x3000": { f: "D", R: 1, W: 1, X: 0, U: 1, cow: 0 }
    };
    w.rc = { A: 1, B: 1, C: 1, D: 1 };
  }
  // uvmcopy 를 page 하나씩 (u = 사용자 패널 줄)
  function doFork(w, u) {
    w.snap("부모가 `fork()` 를 부른다. 지금은 모든 frame 의 refcount 가 1 이다.", { U: u, K: 1 });
    w.C = {}; w.ps.C = "생성 중";
    VAS.forEach(function (va) {
      var e = w.P[va], d;
      if (e.W) {
        e.W = 0; e.cow = 1; w.hl["P:" + va] = true;
        d = "VA " + va + "(" + ROLE[va] + ")는 W 였다. 부모 PTE 의 W 를 끄고 COW 를 켠다.";
        w.snap(d, { U: u, K: 3 });
      } else {
        w.snap("VA " + va + "(text)는 원래 W 가 없다. COW 를 붙이지 않고 그대로 공유한다.", { U: u, K: 2 });
      }
      w.C[va] = clone(e); w.rc[e.f] += 1; w.hl["C:" + va] = true; w.hl["f:" + e.f] = true;
      w.snap("자식 PTE 가 같은 frame " + e.f + " 를 가리킨다. rc[" + e.f + "] = " + w.rc[e.f] + ".", { U: u, K: 5 });
    });
    w.ps.C = "ready";
    w.snap("fork 끝. 새로 할당한 user page 는 0 장이다. guard(U=0)도 W 가 있었으니 COW 가 붙었다.", { U: u, K: null });
  }
  function cowFault(w, who, va, u, extra) {
    var T = who === "P" ? w.P : w.C, e = T[va], name = who === "P" ? "부모" : "자식";
    var sv = "0x" + (parseInt(va, 16) + 0x10).toString(16);
    w.trap = { scause: "15", stval: sv, epc: "store 주소" };
    w.snap(name + "가 VA " + sv + " 에 store. W 가 0 이라 HW 가 store page fault 를 낸다.", { U: u, K: 6 }, null, extra);
    w.snap("stval 로 PTE 를 찾는다. V·U·COW 가 다 켜져 있다. 고칠 수 있는 fault 다.", { U: u, K: 7 }, null, extra);
    if (w.rc[e.f] === 1) {
      e.W = 1; e.cow = 0; w.hl[who + ":" + va] = true;
      w.snap("rc[" + e.f + "] 가 이미 1 이다. 혼자 쓰는 page 라 복사 없이 W 만 다시 켠다.", { U: u, K: 8 }, null, extra);
    } else {
      w.rc.N = 1; w.hl["f:N"] = true;
      w.snap("rc[" + e.f + "] = " + w.rc[e.f] + ". kalloc() 이 새 frame N 을 준다. rc[N] = 1.", { U: u, K: 9 }, null, extra);
      w.hl["f:N"] = true;
      w.snap(e.f + " 의 4096 B 를 N 으로 그대로 복사한다.", { U: u, K: 10 }, null, extra);
      var old = e.f; e.f = "N"; e.W = 1; e.cow = 0; w.hl[who + ":" + va] = true;
      w.snap(name + " PTE 를 N 으로 바꾸고 W 를 켠다. COW 표시는 지운다.", { U: u, K: 11 }, null, extra);
      w.rc[old] -= 1; w.hl["f:" + old] = true;
      w.snap("kfree(" + old + ") 는 rc[" + old + "] 를 " + w.rc[old] + " 로 줄인다. 0 이 아니니 free 하지 않는다.", { U: u, K: 12 }, null, extra);
    }
    w.snap("epc 를 건드리지 않고 돌아간다. 같은 store 가 다시 실행돼 이번엔 성공한다.", { U: u, K: 13 }, null, extra);
    w.trap = { scause: "-", stval: "-", epc: "-" };
  }
  function doExit(w, who, u) {
    var T = who === "P" ? w.P : w.C, name = who === "P" ? "부모" : "자식";
    w.snap(name + "가 exit. uvmunmap 이 VA 마다 kfree 를 부른다.", { U: u, K: 14 });
    VAS.forEach(function (va) {
      var f = T[va].f; w.rc[f] -= 1; w.hl["f:" + f] = true;
      if (w.rc[f] === 0) { w.freed[f] = true; delete w.rc[f]; }
      w.snap("VA " + va + " → kfree(" + f + "): " + (w.freed[f] ? "rc 0, free list 로 돌아간다." : "rc[" + f + "] = " + w.rc[f] + ", 아직 남은 참조가 있다."), { U: u, K: 15 });
    });
    if (who === "P") w.P = {}; else w.C = null;
    w.ps[who] = "zombie";
  }

  function buildBasic() {
    var w = new World(); initParent(w);
    var U = [
      "char data[4096];           // VA 0x1000",
      "data[16] = 1;              // fork 전",
      "pid = fork();",
      "if(pid == 0){ data[16] = 2; exit(0); }",
      "wait(0);",
      "data[16] = 3;              // 부모"
    ];
    w.snap("fork 전. 부모의 page 4 장: text(R-X), data, guard(U=0), stack. 모두 rc 1.", { U: 2, K: null });
    doFork(w, 3);
    w.ps.P = "sleeping"; w.ps.C = "running";
    cowFault(w, "C", "0x1000", 4);
    doExit(w, "C", 4);
    w.ps.P = "running";
    w.snap("부모가 wait 에서 깬다. 부모 PTE 는 아직 W=0, COW 그대로다.", { U: 5, K: null });
    cowFault(w, "P", "0x1000", 6);
    w.snap("끝. 이 프로그램에서 실제로 복사한 page 는 자식의 data 한 장뿐이다.", { U: 6, K: null });
    return { w: w, U: U };
  }
  function buildText() {
    var w = new World(); initParent(w);
    var U = [
      "pid = fork();",
      "if(pid == 0){",
      "  *(char*)0 = 1;          // VA 0x0 = text",
      "  exit(0);",
      "}",
      "wait(0);"
    ];
    w.snap("fork 전. text page(VA 0x0)는 R-X 로 매핑돼 있다.", { U: 1, K: null });
    doFork(w, 1);
    w.ps.P = "sleeping"; w.ps.C = "running";
    w.trap = { scause: "15", stval: "0x0", epc: "store 주소" };
    w.snap("자식이 VA 0x0 에 store. text 는 W 가 없으니 store page fault.", { U: 3, K: 6 });
    w.snap("PTE 를 보니 COW 표시가 없다. 원래 쓰면 안 되는 page 다.", { U: 3, K: 7 },
      "고칠 수 없는 접근 → 프로세스 kill (setkilled). 복사하면 안 된다.");
    w.ps.C = "killed";
    w.snap("usertrap 이 setkilled 후 exit(-1). epc 를 다시 실행하지 않는다.", { U: 3, K: 7 }, null, { U: "blocked" });
    w.trap = { scause: "-", stval: "-", epc: "-" };
    doExit(w, "C", 3);
    w.ps.P = "running";
    w.snap("부모는 멀쩡하다. text 의 rc[A] 는 1 로 돌아왔다.", { U: 6, K: null });
    return { w: w, U: U };
  }
  function buildExec() {
    var w = new World(); initParent(w);
    var U = [
      "pid = fork();",
      "if(pid == 0){",
      "  exec(\"ls\", argv);       // 바로 exec",
      "}",
      "wait(0);"
    ];
    w.snap("fork 전. 부모 page 4 장, 모두 rc 1.", { U: 1, K: null });
    doFork(w, 1);
    w.ps.P = "sleeping"; w.ps.C = "running";
    w.rc.E = 1; w.rc.F = 1;
    w.snap("자식이 exec. 새 page table 에 ls 의 page(E, F …)를 따로 할당한다.", { U: 3, K: 17 });
    VAS.forEach(function (va) {
      var f = w.C[va].f; w.rc[f] -= 1; w.hl["f:" + f] = true;
      w.snap("옛 page table 을 uvmfree: kfree(" + f + ") → rc[" + f + "] = " + w.rc[f] + ".", { U: 3, K: 15 });
    });
    w.C = {
      "0x0": { f: "E", R: 1, W: 0, X: 1, U: 1, cow: 0 },
      "0x1000": { f: "F", R: 1, W: 1, X: 0, U: 1, cow: 0 }
    };
    w.C["0x2000"] = null; w.C["0x3000"] = null;
    w.snap("공유하던 frame 은 전부 rc 1 로 돌아왔다. 복사한 page 는 0 장이다.", { U: 3, K: null });
    w.ps.P = "running";
    w.snap("부모 PTE 는 아직 COW 다. 다음 쓰기 때 rc 1 을 보고 W 만 켜면 된다.", { U: 5, K: null });
    return { w: w, U: U };
  }
  function buildCopyout() {
    var w = new World(); initParent(w);
    var U = [
      "char buf[4096];            // VA 0x1000",
      "pipe(fds); pid = fork();",
      "if(pid == 0){",
      "  read(fds[0], buf, 4);    // 커널이 buf 에 쓴다",
      "}"
    ];
    w.snap("cowtest 의 file 테스트와 같은 모양. buf 는 data page(B)에 있다.", { U: 1, K: null });
    doFork(w, 2);
    w.ps.P = "sleeping"; w.ps.C = "running";
    w.trap = { scause: "8", stval: "-", epc: "ecall+4" };
    w.snap("자식의 read() 는 ecall 로 커널에 들어간다. scause 8, epc += 4.", { U: 4, K: null });
    w.snap("커널이 copyout(buf) 으로 쓴다. 커널은 PA 로 직접 쓰므로 HW fault 가 안 난다.", { U: 4, K: 16 });
    w.snap("원본 copyout 은 PTE 의 W 가 0 이면 −1 을 돌려준다.", { U: 4, K: 16 },
      "고치기 전: read() 가 −1 → cowtest \"error: read failed\".");
    w.snap("고친 copyout: PTE 가 COW 인지 먼저 본다. 맞으면 page fault 때와 같은 처리.", { U: 4, K: 16 });
    w.rc.N = 1; w.hl["f:N"] = true;
    w.snap("rc[B] = 2 이므로 kalloc() 으로 N 을 받는다.", { U: 4, K: 9 });
    w.snap("B 를 N 으로 복사한다.", { U: 4, K: 10 });
    w.C["0x1000"].f = "N"; w.C["0x1000"].W = 1; w.C["0x1000"].cow = 0; w.hl["C:0x1000"] = true;
    w.snap("자식 PTE → N, W 켜고 COW 지움.", { U: 4, K: 11 });
    w.rc.B -= 1; w.hl["f:B"] = true;
    w.snap("kfree(B) → rc[B] = 1. 이제 copyout 이 N 에 4 바이트를 쓴다.", { U: 4, K: 12 });
    w.trap = { scause: "-", stval: "-", epc: "-" };
    w.snap("read() 가 4 를 돌려준다. 부모의 buf(B)는 그대로다.", { U: 4, K: null });
    return { w: w, U: U };
  }

  global.SIMS["cow_fork_trace"] = {
    title: "COW fork — 공유, store page fault, 복사, refcount (과제 3 Problem 1)",
    desc: "부모 page 4 장(text·data·guard·stack)으로 [[COW fork]] 를 한 단계씩 돌린다. 커널 코드는 '''설계 수준 의사코드''' 다. 부모·자식 PTE 의 flag, 물리 frame 의 [[reference count]], 트랩 레지스터([[scause]]·stval·[[epc]])가 어떻게 바뀌는지 본다.",
    options: [
      {
        key: "scenario", label: "시나리오",
        values: [
          { value: "basic", label: "basic: 자식 쓰기 → 복사, 자식 exit, 부모 쓰기(rc 1)" },
          { value: "text_write", label: "text_write: text page 에 쓰기 → kill" },
          { value: "fork_exec", label: "fork_exec: 자식이 바로 exec → 복사 0 번" },
          { value: "copyout", label: "copyout: read() 가 COW page 에 쓸 때" }
        ]
      }
    ],
    build: function (opts) {
      var s = opts.scenario || "basic";
      var r = s === "text_write" ? buildText() : s === "fork_exec" ? buildExec() : s === "copyout" ? buildCopyout() : buildBasic();
      return {
        panels: [
          { id: "U", title: "사용자 프로그램", lang: "c", lines: r.U },
          { id: "K", title: "커널 (설계 의사코드)", lang: "c", lines: KLINES }
        ],
        vars: r.w.vars(),
        steps: r.w.steps
      };
    }
  };
})(typeof window !== "undefined" ? window : globalThis);
