// bget_trace — 과제 2 (xv6 Lock) Problem 2: buffer cache 를 해시 버킷으로 나눈 bget 을 줄 단위로.
// 코드 패널은 '설계 수준 의사코드' (과제 정답 bio.c 가 아님). 원본 xv6 bio.c 는 bcache.lock 하나 + LRU 리스트 하나.
// 작은 모형: 버퍼 4개(b0~b3), 버킷 3개(blockno % 3). 실제 과제는 NBUF = 30, 버킷 13개(소수).
// scenario: hit / miss_move / same_bucket / race_2025 / race_fixed
(function (global) {
  "use strict";
  global.SIMS = global.SIMS || {};

  var COL = { P: "#1d65b3", Q: "#2e9e4f", X: "#888" };
  var WARN = "#d6465f";
  var NB = 3;

  var GOOD = [
    "bget(dev, blockno):",
    "  k = blockno % NBUCKET            // 실제 13개, 여기선 3개",
    "  acquire(bucket[k].lock)",
    "  bucket[k] 체인에서 (dev, blockno) 찾기",
    "  hit → b->refcnt++; release(bucket[k].lock)",
    "        acquiresleep(&b->lock); return b",
    "  miss → release(bucket[k].lock)",
    "  acquire(bcache.lock)             // eviction 은 한 번에 하나",
    "  acquire(bucket[k].lock); 다시 찾기  // 그 사이 누가 넣었을 수 있다",
    "  이번엔 hit → refcnt++; lock 들 놓고 6번 줄로",
    "  victim 찾기: v = k, k+1, … 의 bucket[v] 에서 refcnt == 0 (v ≠ k 일 때만 acquire)",
    "  victim 을 bucket[v] 에서 떼어 bucket[k] 에 붙임 (v == k 면 그대로); release(bucket[v].lock)",
    "  victim: dev·blockno 설정, valid = 0, refcnt = 1",
    "  release(bucket[k].lock); release(bcache.lock)",
    "  acquiresleep(&victim->lock); return victim"
  ];
  var BUGGY_SAME = GOOD.slice();
  BUGGY_SAME[10] = "  victim 찾기: v = k, k+1, … 마다 acquire(bucket[v].lock) 후 refcnt == 0 찾기";
  var R2025 = [
    "bget(dev, blockno):   // 2025 제출물의 흐름 (요약)",
    "  k = blockno % NBUCKET",
    "  acquire(bucket[k].lock); bucket[k] 에서 찾기",
    "  hit → refcnt++; release; acquiresleep; return b",
    "  miss → release(bucket[k].lock)          // ① 여기서 놓는다",
    "  acquire(bucket[k].lock)                  // ② 다시 잡지만 '다시 찾기' 없음",
    "  bucket[k] 안의 refcnt == 0 buf → 재사용 (없으면 아래로)",
    "  release(bucket[k].lock)",
    "  다른 bucket[v]: acquire(v); refcnt == 0 buf 떼어 냄; release(v)",
    "  acquire(bucket[k].lock); 붙이고 blockno 설정·valid = 0·refcnt = 1; release",
    "  acquiresleep(&b->lock); return b"
  ];

  // ---------------- 상태 ----------------
  function World(sameBucket) {
    this.buf = {
      b0: { blk: 3, ref: 0, valid: 1, sl: null },
      b1: { blk: 4, ref: sameBucket ? 0 : 1, valid: 1, sl: null },
      b2: { blk: 5, ref: 0, valid: 1, sl: null },
      b3: { blk: 8, ref: 0, valid: 1, sl: null }
    };
    this.bk = [["b0"], ["b1"], ["b2", "b3"]];
    this.transit = [];
    this.lk = [null, null, null];
    this.gl = null;               // bcache.lock
    this.tas = 0;
    this.spin = {};               // who -> "bucket[1]" / "bcache"
    this.loc = { P: {}, Q: {} };
    this.st = { P: "ready", Q: "ready" };
    this.target = null;           // 강조할 blockno
    this.steps = [];
    this.who = ["P", "Q"];
    this.panelSt = {};
  }
  World.prototype.bucketOf = function (id) {
    for (var k = 0; k < NB; k++) if (this.bk[k].indexOf(id) >= 0) return k;
    return null;
  };
  World.prototype.copies = function () {
    var self = this, n = 0;
    if (this.target === null) return "–";
    Object.keys(this.buf).forEach(function (id) {
      if (self.buf[id].blk === self.target && self.bucketOf(id) !== null) n++;
    });
    return n;
  };
  World.prototype.svg = function () {
    var self = this, W = 760, top = 56, rowH = 76, H = top + NB * rowH + 8;
    var dup = this.copies() > 1;
    var o = '<svg viewBox="0 0 ' + W + ' ' + H + '" width="100%" style="max-width:760px" font-family="sans-serif">';
    o += '<defs><marker id="bg-ar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0L10,5L0,10z" fill="#999"/></marker></defs>';
    function lockIcon(x, y, holder) {
      var c = holder ? (COL[holder] || COL.X) : "#b8b8b8";
      return '<path d="M' + (x + 4) + ',' + (y + 10) + ' v-4 a6,6 0 0 1 12,0 v4" fill="none" stroke="' + c + '" stroke-width="2.4"/>' +
        '<rect x="' + x + '" y="' + (y + 10) + '" width="20" height="14" rx="2" fill="' + c + '"/>';
    }
    // bcache.lock
    o += '<rect x="8" y="8" width="250" height="38" rx="5" fill="#fafafa" stroke="#999"/>';
    o += lockIcon(18, 10, this.gl);
    o += '<text x="48" y="24" font-size="12" font-weight="700" fill="#333">bcache.lock (eviction 전용)</text>';
    o += '<text x="48" y="39" font-size="10" fill="#555">주인: ' + (this.gl || "free") + '</text>';
    // spin / 범례
    var sx = 276;
    this.who.forEach(function (p) {
      var t = self.spin[p] ? p + " spin → " + self.spin[p] : p + ": " + (self.st[p] || "");
      o += '<rect x="' + sx + '" y="14" width="12" height="12" rx="2" fill="' + COL[p] + '"/>';
      o += '<text x="' + (sx + 17) + '" y="24" font-size="11" fill="' + (self.spin[p] || self.st[p] === "panic" ? WARN : "#333") + '">' + t + '</text>';
      sx += 190;
    });
    if (this.target !== null) {
      o += '<text x="276" y="42" font-size="11" fill="' + (dup ? WARN : "#555") + '"' + (dup ? ' font-weight="700"' : '') + '>block ' + this.target + ' 사본 수: ' + this.copies() + (dup ? '  ← 불변식 위반!' : '') + '</text>';
    }
    function bufBox(id, x, y) {
      var b = self.buf[id], hit = self.target !== null && b.blk === self.target;
      var stroke = hit ? (dup ? WARN : "#e09a40") : "#999";
      var o2 = '<rect x="' + x + '" y="' + y + '" width="104" height="56" rx="4" fill="' + (hit && dup ? "#fde2e6" : "#fff") + '" stroke="' + stroke + '" stroke-width="' + (hit ? 2.4 : 1.2) + '"/>';
      o2 += '<text x="' + (x + 8) + '" y="' + (y + 15) + '" font-size="11" font-weight="700" fill="#333">' + id + '</text>';
      o2 += '<text x="' + (x + 96) + '" y="' + (y + 15) + '" font-size="11" text-anchor="end" fill="#333">blk ' + b.blk + '</text>';
      o2 += '<text x="' + (x + 8) + '" y="' + (y + 31) + '" font-size="10" fill="#555">refcnt ' + b.ref + ' · valid ' + b.valid + '</text>';
      if (b.sl) o2 += '<text x="' + (x + 8) + '" y="' + (y + 47) + '" font-size="10" fill="' + COL[b.sl] + '">sleeplock: ' + b.sl + '</text>';
      return o2;
    }
    for (var k = 0; k < NB; k++) {
      var y = top + k * rowH, h = this.lk[k];
      o += '<rect x="8" y="' + y + '" width="156" height="56" rx="4" fill="#fafafa" stroke="' + (h ? COL[h] : "#999") + '" stroke-width="' + (h ? 2 : 1) + '"/>';
      o += '<text x="16" y="' + (y + 19) + '" font-size="12" font-weight="700" fill="#333">bucket[' + k + ']</text>';
      o += '<text x="16" y="' + (y + 34) + '" font-size="10" fill="#666">blockno % 3 = ' + k + '</text>';
      o += '<text x="16" y="' + (y + 49) + '" font-size="10" fill="#555">lock: ' + (h || "free") + '</text>';
      o += lockIcon(134, y + 4, h);
      var ids = this.bk[k];
      if (!ids.length) o += '<text x="186" y="' + (y + 33) + '" font-size="11" fill="#999">(비어 있음)</text>';
      ids.forEach(function (id, n) {
        var x = 180 + n * 124;
        o += '<line x1="' + (n === 0 ? 164 : x - 20) + '" y1="' + (y + 28) + '" x2="' + x + '" y2="' + (y + 28) + '" stroke="#999" marker-end="url(#bg-ar)"/>';
        o += bufBox(id, x, y);
      });
    }
    // 이동 중
    o += '<rect x="560" y="' + top + '" width="192" height="' + (NB * rowH - 20) + '" rx="6" fill="none" stroke="#bbb" stroke-dasharray="5,4"/>';
    o += '<text x="656" y="' + (top + 16) + '" font-size="10" text-anchor="middle" fill="#888">이동 중 (어느 버킷에도 없음)</text>';
    this.transit.forEach(function (id, n) { o += bufBox(id, 604, top + 26 + n * 66); });
    return o + '</svg>';
  };
  World.prototype.snap = function (desc, pc, note) {
    var self = this, v = {};
    v.gl = this.gl || "free";
    for (var k = 0; k < NB; k++) v["lk" + k] = this.lk[k] || "free";
    Object.keys(this.buf).forEach(function (id) {
      var b = self.buf[id], bk = self.bucketOf(id);
      v[id] = "blk " + b.blk + " · ref " + b.ref + " · valid " + b.valid + " · " + (bk === null ? "이동 중" : "bkt " + bk) + (b.sl ? " · sleep:" + b.sl : "");
    });
    this.who.forEach(function (p) {
      var l = self.loc[p];
      v[p + ".blk"] = l.blk !== undefined ? l.blk : "–";
      v[p + ".k"] = l.k !== undefined ? l.k : "–";
      v[p + ".b"] = l.b || "–";
    });
    v.tas = this.tas;
    v.copies = this.copies();
    var status = {};
    Object.keys(pc).forEach(function (id) {
      var who = id.charAt(0);
      if (self.panelSt[id]) status[id] = self.panelSt[id];
      else if (pc[id] === null) status[id] = "ready";
      else status[id] = self.spin[who] ? "spinning" : (self.st[who] || "ready");
    });
    var s = { desc: desc, pc: pc, vars: v, status: status, svg: this.svg() };
    if (note) s.note = note;
    this.steps.push(s);
  };
  World.prototype.vars = function () {
    var vs = [{ name: "gl", label: "bcache.lock", group: "lock" }];
    for (var k = 0; k < NB; k++) vs.push({ name: "lk" + k, label: "bucket[" + k + "].lock", group: "lock" });
    vs.push({ name: "tas", label: "#test-and-set (bcache 계열 합)", group: "lock" });
    ["b0", "b1", "b2", "b3"].forEach(function (id) { vs.push({ name: id, label: id, group: "struct buf" }); });
    this.who.forEach(function (p) {
      vs.push({ name: p + ".blk", label: p + " blockno", group: "프로세스 " + p });
      vs.push({ name: p + ".k", label: p + " k", group: "프로세스 " + p });
      vs.push({ name: p + ".b", label: p + " b", group: "프로세스 " + p });
    });
    vs.push({ name: "copies", label: "목표 블록 사본 수", group: "불변식" });
    return vs;
  };
  World.prototype.lock = function (p, k) { this.lk[k] = p; delete this.spin[p]; };
  World.prototype.wait = function (p, name, n) { this.spin[p] = name; this.tas += n; };
  World.prototype.detach = function (id) {
    var k = this.bucketOf(id); this.bk[k].splice(this.bk[k].indexOf(id), 1); this.transit.push(id);
  };
  World.prototype.attach = function (id, k) {
    var i = this.transit.indexOf(id); if (i >= 0) this.transit.splice(i, 1);
    this.bk[k].push(id);
  };

  // ---------------- hit ----------------
  function buildHit() {
    var w = new World(false);
    var pc = function (a, b) { return { P: a, Q: b }; };
    w.loc.P.blk = 5; w.loc.Q.blk = 3; w.st.P = w.st.Q = "running";
    w.snap("[[bcache 해시 버킷]]: 원본 xv6 [[buffer cache]] 는 `bcache.lock` 하나로 전체 LRU 리스트를 지킨다 → 모든 bget/brelse 가 한 lock 에서 경쟁. 과제는 버퍼를 '''blockno 의 해시 버킷'''에 나눠 담고 버킷마다 lock 을 둔다. 여기선 버퍼 4개·버킷 3개(실제는 [[NBUF]] = 30, 버킷 13개). P 는 block 5, Q 는 block 3 을 동시에 bread.",
      pc(1, 1));
    w.loc.P.k = 2; w.loc.Q.k = 0;
    w.snap("P: k = 5 % 3 = 2. Q: k = 3 % 3 = 0.", pc(2, 2));
    w.lock("P", 2); w.lock("Q", 0);
    w.snap("P 는 bucket[2], Q 는 bucket[0] 의 lock — '''서로 다른 lock 이라 동시에 성공''', #test-and-set 0. 원본이었다면 Q 가 bcache.lock 에서 spin 했다.", pc(3, 3));
    w.loc.P.b = "b2"; w.loc.Q.b = "b0";
    w.snap("체인을 훑어 P 는 b2(blk 5), Q 는 b0(blk 3) 을 찾았다 — '''hit'''.", pc(4, 4));
    w.buf.b2.ref = 1; w.buf.b0.ref = 1; w.lk[2] = null; w.lk[0] = null;
    w.snap("[[refcnt]]++ (0 → 1) 후 버킷 lock 을 놓는다. refcnt ≥ 1 인 동안은 이 버퍼가 다른 블록용으로 재활용(evict)되지 않는다.", pc(5, 5));
    w.buf.b2.sl = "P"; w.buf.b0.sl = "Q"; w.st.P = w.st.Q = "done";
    w.snap("`acquiresleep(&b->lock)` — 버퍼 '''내용'''을 독점하는 [[sleeplock]]. 디스크 I/O 동안 잡고 있어야 하니 spin 이 아니라 sleep 하는 lock 이다. 둘 다 반환.", pc(6, 6));
    w.loc.P = { blk: 8 }; w.loc.Q = { blk: 5 }; w.st.P = w.st.Q = "running";
    w.snap("2라운드: P 가 block 8, Q 가 block 5 를 bread. 이번엔 '''둘 다 버킷 2'''다.", pc(1, 1));
    w.loc.P.k = 2; w.loc.Q.k = 2;
    w.snap("P: k = 8 % 3 = 2. Q: k = 5 % 3 = 2.", pc(2, 2));
    w.lock("P", 2); w.wait("Q", "bucket[2]", 3);
    w.snap("P 가 bucket[2].lock 을 잡고, Q 는 같은 lock 이라 spin ([[lock contention]]). 해시가 같은 버킷으로 몰릴 때만 이런 경쟁이 생긴다 — 버킷 수를 소수 13 으로 두는 이유.", pc(3, 3));
    w.loc.P.b = "b3"; w.tas += 2;
    w.snap("P: b3(blk 8) hit. Q 는 계속 spin.", pc(4, 3));
    w.buf.b3.ref = 1; w.lk[2] = null; w.lock("Q", 2);
    w.snap("P: refcnt++, release → Q 가 bucket[2].lock 획득.", pc(5, 3));
    w.buf.b3.sl = "P"; w.st.P = "done"; w.loc.Q.b = "b2";
    w.snap("P: acquiresleep(b3) 반환. Q: b2(blk 5) hit — refcnt 는 이미 1 (P 가 1라운드에서 받아 아직 쓰는 중).", pc(6, 4));
    w.buf.b2.ref = 2; w.lk[2] = null;
    w.snap("Q: refcnt 1 → 2, release. 같은 블록의 버퍼는 '''하나'''이고 두 사람이 refcnt 로 붙잡고 있다.", pc(6, 5));
    w.st.Q = "sleeping";
    w.snap("Q: `acquiresleep(&b2->lock)` — P 가 sleeplock 을 쥐고 있으니 Q 는 '''잠든다'''(spin 아님). P 가 brelse 하면 깨어난다. refcnt = '캐시에서 쫓겨나지 않게', sleeplock = '내용은 한 명씩'.",
      pc(6, 6));
    return { w: w, panels: [
      { id: "P", title: "P: bget", lang: "c", lines: GOOD },
      { id: "Q", title: "Q: bget", lang: "c", lines: GOOD }] };
  }

  // ---------------- miss_move ----------------
  function buildMiss() {
    var w = new World(false);
    w.who = ["P"]; w.target = 7;
    var pc = function (a) { return { P: a }; };
    w.loc.P.blk = 7; w.st.P = "running";
    w.snap("P 가 block 7 을 bget. 캐시에 없다(miss). 버킷 1 에는 b1(blk 4, 누군가 사용 중 refcnt 1)만 있다.", pc(1));
    w.loc.P.k = 1;
    w.snap("k = 7 % 3 = 1.", pc(2));
    w.lock("P", 1);
    w.snap("`acquire(bucket[1].lock)`.", pc(3));
    w.snap("체인 검색: b1 은 blk 4 → 없다.", pc(4));
    w.lk[1] = null;
    w.snap("'''miss → 버킷 lock 을 먼저 놓는다'''. 왜? eviction 경로의 lock 순서는 언제나 `bcache.lock` → 버킷 lock 이다. 버킷 lock 을 쥔 채 bcache.lock 을 기다리면, bcache.lock 을 쥐고 이 버킷을 원하는 다른 프로세스와 [[데드락]]이 난다.",
      pc(7));
    w.gl = "P";
    w.snap("`acquire(bcache.lock)` — 빈 버퍼를 찾아 옮기는 일(eviction)은 한 번에 한 프로세스만. 과제 힌트: \"It is OK to serialize finding an unused buf\".", pc(8));
    w.lock("P", 1);
    w.snap("bucket[1] 을 다시 잡고 '''한 번 더 찾는다''' — 7번 줄에서 lock 을 놓은 틈에 누가 block 7 을 넣었을 수 있다(옵션 race_2025). 이번엔 여전히 없음.", pc(9));
    w.lk[2] = "P";
    w.snap("victim 찾기: v = 1 (이미 쥔 lock, 다시 acquire 하지 않음) — b1 은 refcnt 1 이라 안 됨. v = 2: `acquire(bucket[2].lock)`, b2 는 refcnt 0 → '''victim = b2'''. (bcache.lock 이 eviction 을 직렬화하니 버킷 lock 두 개를 동시에 쥐는 건 언제나 한 명뿐이다. 번호 순서로 잡도록 짜도 좋다 — [[lock ordering]].)",
      pc(11));
    w.loc.P.b = "b2"; w.detach("b2");
    w.snap("b2 를 bucket[2] 체인에서 떼어 낸다. 두 버킷 lock 을 다 쥐고 있으니 이 '이동 중' 상태를 아무도 볼 수 없다.", pc(12));
    w.attach("b2", 1); w.lk[2] = null;
    w.snap("bucket[1] 체인에 붙이고 `release(bucket[2].lock)`.", pc(12));
    w.buf.b2.blk = 7; w.buf.b2.valid = 0; w.buf.b2.ref = 1;
    w.snap("b2 를 block 7 용으로: blockno = 7, '''valid = 0'''(아직 디스크에서 안 읽음), refcnt = 1. 사본 수 1.", pc(13));
    w.lk[1] = null; w.gl = null;
    w.snap("bucket[1].lock, bcache.lock 을 놓는다.", pc(14));
    w.buf.b2.sl = "P"; w.st.P = "done";
    w.snap("`acquiresleep(&b2->lock)` 후 반환. bread 가 valid == 0 을 보고 디스크에서 읽어 채운다. 전역 LRU 는 없어졌다 — refcnt == 0 인 아무 버퍼나 victim (과제 허용).", pc(15));
    return { w: w, panels: [{ id: "P", title: "P: bget(dev, 7)", lang: "c", lines: GOOD }] };
  }

  // ---------------- same_bucket ----------------
  function buildSame() {
    var w = new World(true);
    w.who = ["P"]; w.target = 7;
    var pc = function (a, b) { return { PA: a, PB: b }; };
    w.loc.P.blk = 7; w.st.P = "running";
    w.snap("이번엔 b1(blk 4) 의 refcnt 가 0 — 목표 블록 7 과 '''같은 버킷 1''' 에 쓸 수 있는 victim 이 있다. 먼저 왼쪽 '버그' 버전.", pc(1, null));
    w.loc.P.k = 1; w.lock("P", 1);
    w.snap("k = 1, `acquire(bucket[1].lock)`.", pc(3, null));
    w.snap("검색: block 7 없음.", pc(4, null));
    w.lk[1] = null;
    w.snap("miss → 버킷 lock 놓기.", pc(7, null));
    w.gl = "P";
    w.snap("`acquire(bcache.lock)`.", pc(8, null));
    w.lock("P", 1);
    w.snap("bucket[1] 다시 잡고 재검색 — 없음. 지금 P 는 '''bucket[1].lock 을 쥐고 있다'''.", pc(9, null));
    w.st.P = "panic";
    w.snap("victim 찾기가 v = 1 부터 '''무조건''' `acquire(bucket[1].lock)` → 이미 이 CPU 가 쥔 lock. xv6 `acquire` 는 `if(holding(lk)) panic(\"acquire\")` 로 막는다 → '''panic: acquire'''. ([[spin lock]] 은 재진입이 안 된다 — 검사가 없으면 자기 자신을 영원히 기다린다.)",
      pc(11, null), "panic: acquire — 같은 버킷 lock 을 두 번 잡았다");
    w = (function (old) {
      var n = new World(true); n.who = ["P"]; n.target = 7; n.steps = old.steps; n.panelSt = { PA: "panic" }; return n;
    })(w);
    w.loc.P = { blk: 7, k: 1 }; w.st.P = "running"; w.gl = "P"; w.lock("P", 1);
    w.snap("오른쪽 '고친' 설계로 같은 상황을 다시: 9번 줄까지 똑같이 와서 bcache.lock + bucket[1].lock 을 쥐고 재검색 miss.", pc(null, 9));
    w.loc.P.b = "b1";
    w.snap("v = 1 == k → '''이미 쥔 lock 이니 acquire 하지 않고''' 그대로 훑는다. b1 refcnt 0 → victim = b1.", pc(null, 11));
    w.snap("v == k 라 옮길 필요가 없다 — 같은 체인에 그대로 둔다. (두 lock 을 '번호 순서로' 잡는 코드라면, 두 번호가 같을 때 한 번만 잡도록 따로 처리해야 한다.)", pc(null, 12));
    w.buf.b1.blk = 7; w.buf.b1.valid = 0; w.buf.b1.ref = 1;
    w.snap("b1: blockno = 7, valid = 0, refcnt = 1.", pc(null, 13));
    w.lk[1] = null; w.gl = null;
    w.snap("release(bucket[1].lock), release(bcache.lock).", pc(null, 14));
    w.buf.b1.sl = "P"; w.st.P = "done";
    w.snap("acquiresleep(b1) 후 반환. 사본 수 1. 요점: '''victim 이 목표와 같은 버킷인 경우'''를 꼭 따로 생각할 것 — bcachetest 에서 실제로 자주 나온다.", pc(null, 15));
    return { w: w, panels: [
      { id: "PA", title: "버그: v 마다 무조건 acquire", lang: "c", lines: BUGGY_SAME },
      { id: "PB", title: "고친 설계", lang: "c", lines: GOOD }] };
  }

  // ---------------- race_2025 ----------------
  function buildRace2025() {
    var w = new World(false);
    w.target = 7;
    var pc = function (a, b) { return { P: a, Q: b }; };
    w.loc.P.blk = 7; w.loc.Q.blk = 7; w.st.P = w.st.Q = "running";
    w.snap("2025 제출물의 bget 흐름(요약). P 와 Q 가 '''같은 block 7''' 을 거의 동시에 bread 한다(예: 같은 파일을 여는 두 프로세스). block 7 은 캐시에 없다.", pc(1, 1));
    w.loc.P.k = 1; w.loc.Q.k = 1;
    w.snap("둘 다 k = 1.", pc(2, 2));
    w.lock("P", 1); w.wait("Q", "bucket[1]", 2);
    w.snap("P 가 bucket[1] 을 잡고 검색 → 없음. Q 는 spin.", pc(3, 3));
    w.lk[1] = null; w.lock("Q", 1);
    w.snap("P: ① miss → lock 을 놓는다. 그 틈에 Q 가 bucket[1] 을 잡고 검색 → '''역시 없음'''.", pc(5, 3));
    w.lk[1] = null; w.lock("P", 1);
    w.snap("Q 도 ① lock 을 놓는다. P 는 ② bucket[1] 을 다시 잡는다 — 그런데 '''다시 찾지 않는다'''.", pc(6, 5));
    w.lk[1] = null;
    w.snap("P: bucket[1] 의 b1 은 refcnt 1 → 재사용 불가, release.", pc(8, 5));
    w.lk[0] = "P"; w.detach("b0"); w.lk[0] = null; w.loc.P.b = "b0";
    w.lock("Q", 1);
    w.snap("P: 다른 버킷 v = 0 을 잠그고 b0(refcnt 0) 을 떼어 낸 뒤 bucket[0] 을 놓는다 — '''b0 는 어느 버킷에도 없다'''(③ 틈). Q: ② bucket[1] 다시 잡음.", pc(9, 6));
    w.lk[1] = null;
    w.snap("Q: bucket[1] 안에 쓸 버퍼 없음, release.", pc(9, 8));
    w.lk[2] = "Q"; w.detach("b2"); w.lk[2] = null; w.loc.Q.b = "b2";
    w.snap("Q: v = 0 은 비었다(b0 는 P 가 들고 이동 중), v = 2 에서 b2(refcnt 0) 를 떼어 낸다.", pc(9, 9));
    w.lock("P", 1); w.attach("b0", 1); w.buf.b0.blk = 7; w.buf.b0.valid = 0; w.buf.b0.ref = 1; w.lk[1] = null;
    w.snap("P: bucket[1] 을 잡고 b0 를 붙여 block 7 로 설정, refcnt 1, release.", pc(10, 9));
    w.lock("Q", 1); w.attach("b2", 1); w.buf.b2.blk = 7; w.buf.b2.valid = 0; w.buf.b2.ref = 1; w.lk[1] = null;
    w.snap("Q: bucket[1] 을 잡고 b2 를 붙여 '''또 block 7''' 로 설정. bucket[1] 에 block 7 이 '''두 개''' 생겼다.", pc(10, 10),
      "불변식 위반: \"at most one copy of each block is cached\" — block 7 사본이 2개.");
    w.buf.b0.sl = "P"; w.buf.b2.sl = "Q";
    w.snap("둘 다 acquiresleep — '''서로 다른 버퍼의 sleeplock''' 이라 둘 다 바로 성공. P 와 Q 가 block 7 을 '''동시에 독점'''한다고 믿는다.", pc(11, 11));
    w.st.P = w.st.Q = "done";
    w.snap("결과: P 가 b0 에 쓴 내용과 Q 가 b2 에 쓴 내용이 따로 디스크로 간다 → 한쪽 갱신이 사라진다(lost update). 그런데 bcachetest 는 같은 블록을 동시에 miss 하는 경우를 거의 만들지 않아 '''채점은 100/100''' 이 나온다.",
      pc(11, 11), "테스트 통과 ≠ 정확함. 과제 힌트: searching and allocating must be atomic.");
    return { w: w, panels: [
      { id: "P", title: "P: bget(dev, 7) — 2025 흐름", lang: "c", lines: R2025 },
      { id: "Q", title: "Q: bget(dev, 7) — 2025 흐름", lang: "c", lines: R2025 }] };
  }

  // ---------------- race_fixed ----------------
  function buildRaceFixed() {
    var w = new World(false);
    w.target = 7;
    var pc = function (a, b) { return { P: a, Q: b }; };
    w.loc.P.blk = 7; w.loc.Q.blk = 7; w.st.P = w.st.Q = "running";
    w.snap("race_2025 와 같은 출발: P·Q 가 동시에 block 7 을 bget, 캐시에 없음. 이번엔 eviction lock(`bcache.lock`) + '''재검색''' 설계.", pc(1, 1));
    w.loc.P.k = 1; w.loc.Q.k = 1;
    w.snap("둘 다 k = 1.", pc(2, 2));
    w.lock("P", 1); w.wait("Q", "bucket[1]", 2);
    w.snap("P 가 bucket[1] 획득, Q spin.", pc(3, 3));
    w.snap("P: 검색 → 없음.", pc(4, 3));
    w.lk[1] = null; w.lock("Q", 1); w.gl = "P";
    w.snap("P: 버킷 lock 을 놓고 `acquire(bcache.lock)`. Q 는 bucket[1] 을 잡아 검색 → 없음.", pc(8, 4));
    w.lk[1] = null;
    w.snap("Q: miss → 버킷 lock 놓기.", pc(8, 7));
    w.lock("P", 1); w.wait("Q", "bcache.lock", 4);
    w.snap("Q: `acquire(bcache.lock)` → P 가 쥐고 있다 → spin. '''eviction 이 직렬화'''된다. P: bucket[1] 다시 잡고 재검색 → 없음.", pc(9, 8));
    w.lk[2] = "P"; w.loc.P.b = "b2"; w.tas += 3;
    w.snap("P: victim 찾기 — v = 1 의 b1 은 refcnt 1, v = 2 의 b2 는 refcnt 0 → victim = b2.", pc(11, 8));
    w.detach("b2"); w.attach("b2", 1); w.lk[2] = null;
    w.snap("P: b2 를 bucket[2] 에서 bucket[1] 로 옮기고 bucket[2].lock 놓기.", pc(12, 8));
    w.buf.b2.blk = 7; w.buf.b2.valid = 0; w.buf.b2.ref = 1;
    w.snap("P: b2 = block 7, valid 0, refcnt 1.", pc(13, 8));
    w.lk[1] = null; w.gl = null; w.spin = {}; w.gl = "Q";
    w.snap("P: bucket[1].lock, bcache.lock release → Q 가 bcache.lock 획득.", pc(14, 8));
    w.buf.b2.sl = "P"; w.st.P = "done"; w.lock("Q", 1); w.loc.Q.b = "b2";
    w.snap("P: acquiresleep(b2) 반환. Q: bucket[1] 을 잡고 '''다시 찾는다''' → P 가 방금 넣은 b2(blk 7) 를 찾았다!", pc(15, 9));
    w.buf.b2.ref = 2; w.lk[1] = null; w.gl = null;
    w.snap("Q: hit → refcnt 1 → 2, 두 lock 을 놓고 6번 줄로. 새 버퍼를 만들지 않으니 '''사본은 하나'''.", pc(15, 10));
    w.st.Q = "sleeping";
    w.snap("Q: `acquiresleep(&b2->lock)` — P 가 쥐고 있으니 잠든다. P 가 디스크에서 읽고(valid = 1) brelse 하면 Q 가 깨어나 '''같은 내용'''을 본다.", pc(15, 6));
    w.buf.b2.sl = "Q"; w.buf.b2.valid = 1; w.buf.b2.ref = 1; w.st.Q = "done";
    w.snap("P 의 brelse 후: refcnt 1(Q), sleeplock 은 Q. 정리: miss 후 lock 을 놓은 틈은 '''bcache.lock 아래에서 다시 찾기'''로 메운다 → \"searching and allocating an entry\" 가 atomic.", pc(15, 6));
    return { w: w, panels: [
      { id: "P", title: "P: bget(dev, 7)", lang: "c", lines: GOOD },
      { id: "Q", title: "Q: bget(dev, 7)", lang: "c", lines: GOOD }] };
  }

  global.SIMS["bget_trace"] = {
    title: "bcache 해시 버킷 bget (과제 2 Problem 2)",
    desc: "버퍼 4개 · 버킷 3개(blockno % 3) 모형으로 [[bcache 해시 버킷]] 의 bget 을 줄 단위로 돌린다. 코드는 '''설계 수준 의사코드'''. hit, miss 후 eviction 이동, victim 이 같은 버킷인 함정, 2025 제출물의 사본 2개 race 와 그 해결.",
    options: [
      {
        key: "scenario", label: "시나리오",
        values: [
          { value: "hit", label: "hit — 다른 버킷은 동시에, 같은 버킷은 spin" },
          { value: "miss_move", label: "miss_move — bcache.lock 아래 재검색 + 버퍼 이동" },
          { value: "same_bucket", label: "same_bucket — victim 이 같은 버킷 (panic: acquire)" },
          { value: "race_2025", label: "race_2025 — 재검색 없음 → block 사본 2개" },
          { value: "race_fixed", label: "race_fixed — eviction lock + 재검색 → 사본 1개" }
        ]
      }
    ],
    build: function (opts) {
      var s = opts.scenario || "hit";
      var r = s === "miss_move" ? buildMiss() : s === "same_bucket" ? buildSame() : s === "race_2025" ? buildRace2025() : s === "race_fixed" ? buildRaceFixed() : buildHit();
      return { panels: r.panels, vars: r.w.vars(), steps: r.w.steps };
    }
  };
})(typeof window !== "undefined" ? window : globalThis);
