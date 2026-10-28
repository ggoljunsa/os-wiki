// kalloc_batch — 과제2 문제 ① kalloc ④-02: STEAL = 2 묶음 steal 을 ④-01 코드 그대로 줄 단위로.
// 초기 CPU0: A→B→C→D→E, CPU1·CPU2 빔. 사건 ① CPU1 kalloc ② CPU2 kalloc ③ CPU1 kalloc ④ CPU2 kfree(A) ⑤ CPU1 kalloc ⑥ CPU0 kalloc.
// 리스트를 직접 시뮬레이션해서 step 을 만든다 (정답표는 결과에서 채운다 — 손으로 적은 값이 아님).
(function (global) {
  "use strict";
  global.SIMS = global.SIMS || {};

  var COL = ["#1d65b3", "#2e9e4f", "#e09a40"];
  var HOT = "#d6465f";
  var STEAL = 2, NCPU = 3;

  var KALLOC = [
    "void *kalloc(void){",
    "  struct run *r;",
    "  push_off();",
    "  int id = cpuid();",
    "  acquire(&kmem[id].lock);",
    "  r = kmem[id].freelist;",
    "  if(r) kmem[id].freelist = r->next;",
    "  release(&kmem[id].lock);",
    "  if(r == 0)",
    "  for(int i = 0; i < NCPU; i++){",
    "    if(i == id) continue;                       // (b)",
    "    acquire(&kmem[i].lock);",
    "    struct run *head = kmem[i].freelist, *tail = head;",
    "    if(head){",
    "      for(int n = 1; n < STEAL && tail->next; n++) tail = tail->next;",
    "      kmem[i].freelist = tail->next;            // (c)",
    "      tail->next = 0;                           // (d) 묶음 끝을 끊음",
    "    }",
    "    release(&kmem[i].lock);",
    "    if(head){",
    "      r = head;",
    "      if(head->next){",
    "        acquire(&kmem[id].lock);",
    "        tail->next = kmem[id].freelist;",
    "        kmem[id].freelist = head->next;         // (e)",
    "        release(&kmem[id].lock);",
    "      }",
    "      break;",
    "    }",
    "  }",
    "  pop_off();                                    // (f)",
    "  return (void*)r;",
    "}"
  ];
  var KFREE = [
    "void kfree(void *pa){",
    "  struct run *r = (struct run*)pa;",
    "  push_off();",
    "  int id = cpuid();",
    "  acquire(&kmem[id].lock);",
    "  r->next = kmem[id].freelist;",
    "  kmem[id].freelist = r;",
    "  release(&kmem[id].lock);",
    "  pop_off();",
    "}"
  ];

  var EVENTS = [
    { mark: "①", cpu: 1, op: "kalloc" },
    { mark: "②", cpu: 2, op: "kalloc" },
    { mark: "③", cpu: 1, op: "kalloc" },
    { mark: "④", cpu: 2, op: "kfree", pa: "A" },
    { mark: "⑤", cpu: 1, op: "kalloc" },
    { mark: "⑥", cpu: 0, op: "kalloc" }
  ];

  function chain(a) { return a.length ? a.join("→") : "0"; }

  function build() {
    var L = [["A", "B", "C", "D", "E"], [], []];
    var lock = [null, null, null];
    var rows = [];                 // 정답표 행 {mark, ret, lists}
    var steps = [];
    var ev = null, loc = {}, batch = null, hl = {}, cut = null;

    function svg() {
      var W = 760, H = 380, o = '<svg viewBox="0 0 ' + W + " " + H + '" width="100%" style="max-width:760px" font-family="sans-serif">';
      o += '<defs><marker id="kb-ar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0L10,5L0,10z" fill="#777"/></marker></defs>';
      // 세 리스트
      for (var i = 0; i < NCPU; i++) {
        var y = 10 + i * 62, me = ev && ev.cpu === i, owner = lock[i];
        o += '<rect x="6" y="' + y + '" width="120" height="48" rx="6" fill="' + COL[i] + '" fill-opacity="' + (me ? 0.22 : 0.07) + '" stroke="' + COL[i] + '" stroke-width="' + (me ? 3 : 1.5) + '"/>';
        o += '<text x="66" y="' + (y + 20) + '" font-size="13" font-weight="700" text-anchor="middle" fill="' + COL[i] + '">kmem[' + i + ']</text>';
        o += '<text x="66" y="' + (y + 38) + '" font-size="10" text-anchor="middle" fill="' + (owner !== null ? HOT : "#666") + '">' + (owner !== null ? "lock: CPU" + owner : "lock: free") + (me ? " · 지금 CPU" : "") + "</text>";
        if (!L[i].length) o += '<text x="146" y="' + (y + 30) + '" font-size="11" fill="#999">freelist = 0 (비어 있음)</text>';
        L[i].forEach(function (p, k) {
          var x = 146 + k * 60;
          o += '<rect x="' + x + '" y="' + (y + 8) + '" width="44" height="32" rx="4" fill="' + (hl[p] ? "#fff4c2" : "#fff") + '" stroke="' + (hl[p] ? "#333" : "#999") + '" stroke-width="' + (hl[p] ? 2.4 : 1.2) + '"/>';
          o += '<text x="' + (x + 22) + '" y="' + (y + 29) + '" font-size="14" font-weight="700" text-anchor="middle" fill="#333">' + p + "</text>";
          if (k < L[i].length - 1) o += '<line x1="' + (x + 44) + '" y1="' + (y + 24) + '" x2="' + (x + 59) + '" y2="' + (y + 24) + '" stroke="#999" marker-end="url(#kb-ar)"/>';
        });
      }
      // 손에 든 묶음 (head ~ tail)
      var by = 200;
      o += '<text x="8" y="' + (by + 4) + '" font-size="11" font-weight="700" fill="#555">손에 든 묶음 (지역 변수 head ~ tail, lock 밖)</text>';
      if (batch && batch.length) {
        batch.forEach(function (p, k) {
          var x = 146 + k * 60, isH = p === loc.head, isT = p === loc.tail, isR = p === loc.r;
          o += '<rect x="' + x + '" y="' + (by + 14) + '" width="44" height="32" rx="4" fill="#fff" stroke="' + HOT + '" stroke-width="2" stroke-dasharray="' + (cut ? "" : "4,2") + '"/>';
          o += '<text x="' + (x + 22) + '" y="' + (by + 35) + '" font-size="14" font-weight="700" text-anchor="middle" fill="#333">' + p + "</text>";
          var tags = [];
          if (isH) tags.push("head"); if (isT) tags.push("tail"); if (isR) tags.push("r");
          if (tags.length) o += '<text x="' + (x + 22) + '" y="' + (by + 60) + '" font-size="10" text-anchor="middle" fill="' + HOT + '">' + tags.join(" · ") + "</text>";
          if (k < batch.length - 1) o += '<line x1="' + (x + 44) + '" y1="' + (by + 30) + '" x2="' + (x + 59) + '" y2="' + (by + 30) + '" stroke="#999" marker-end="url(#kb-ar)"/>';
        });
        var ex = 146 + batch.length * 60 - 14;
        o += '<text x="' + (ex + 2) + '" y="' + (by + 34) + '" font-size="10" fill="#777">' + (cut ? "→ 0 (끊음)" : "→ " + (loc.tailnext || "0")) + "</text>";
      } else {
        o += '<text x="146" y="' + (by + 34) + '" font-size="11" fill="#999">(없음)</text>';
      }
      // 정답표
      var ty = 272, cx = [8, 150, 230, 390, 550];
      var head = ["사건", "반환", "CPU 0", "CPU 1", "CPU 2"];
      o += '<rect x="4" y="' + ty + '" width="700" height="' + (20 + EVENTS.length * 14) + '" fill="#f7f7f7" stroke="#ddd"/>';
      head.forEach(function (h, k) { o += '<text x="' + (cx[k] + 4) + '" y="' + (ty + 14) + '" font-size="11" font-weight="700" fill="#333">' + h + "</text>"; });
      EVENTS.forEach(function (e, k) {
        var r = rows[k], yy = ty + 28 + k * 14, cur = ev === e && !r;
        var name = e.mark + " CPU" + e.cpu + " " + (e.op === "kfree" ? "kfree(" + e.pa + ")" : "kalloc");
        o += '<text x="' + (cx[0] + 4) + '" y="' + yy + '" font-size="10" fill="' + (cur ? HOT : "#333") + '" font-weight="' + (cur ? 700 : 400) + '">' + name + "</text>";
        if (r) {
          o += '<text x="' + (cx[1] + 4) + '" y="' + yy + '" font-size="11" font-weight="700" fill="#333">' + r.ret + "</text>";
          r.lists.forEach(function (s, j) { o += '<text x="' + (cx[j + 2] + 4) + '" y="' + yy + '" font-size="11" fill="' + COL[j] + '">' + s + "</text>"; });
        }
      });
      return o + "</svg>";
    }

    function snap(panel, line, desc, note) {
      var v = {
        "사건": ev ? ev.mark + " CPU" + ev.cpu + " " + (ev.op === "kfree" ? "kfree(" + ev.pa + ")" : "kalloc") : "–",
        id: loc.id !== undefined ? loc.id : "–",
        i: loc.i !== undefined ? loc.i : "–",
        n: loc.n !== undefined ? loc.n : "–",
        r: loc.r !== undefined ? loc.r : "–",
        head: loc.head !== undefined ? loc.head : "–",
        tail: loc.tail !== undefined ? loc.tail : "–",
        "tail->next": loc.tail !== undefined && loc.tail !== "0" ? (loc.tailnext || "0") : "–"
      };
      for (var k = 0; k < NCPU; k++) {
        v["kmem[" + k + "].freelist"] = chain(L[k]);
        v["kmem[" + k + "].lock"] = lock[k] !== null ? "CPU" + lock[k] : "free";
      }
      var pc = { kalloc: null, kfree: null }, status = { kalloc: "ready", kfree: "ready" };
      if (panel) { pc[panel] = line; status[panel] = "CPU" + ev.cpu; }
      var s = { desc: desc, pc: pc, vars: v, status: status, svg: svg() };
      if (note) s.note = note;
      steps.push(s);
      hl = {};
    }

    function record(ret) {
      rows.push({ mark: ev.mark, ret: ret, lists: L.map(function (a) { return a.length ? a.join(",") : "–"; }) });
    }

    function kfree(cpu, pa) {
      loc = { r: pa };
      snap("kfree", 3, "`push_off()` — 인터럽트를 끈다. 이제 이 함수가 끝날 때까지 CPU" + cpu + " 에서 안 옮겨진다.");
      loc.id = cpu;
      snap("kfree", 4, "`id = cpuid()` = " + cpu + ". '''kfree 는 지금 도는 CPU 의 리스트에''' 넣는다 — " + pa + " 가 원래 어느 CPU 에서 왔는지는 아무도 기억하지 않는다.");
      lock[cpu] = cpu;
      snap("kfree", 5, "`acquire(&kmem[" + cpu + "].lock)` — 자기 lock.");
      loc.tailnext = undefined;
      snap("kfree", 6, "`r->next = kmem[" + cpu + "].freelist` → " + pa + "->next = " + (L[cpu][0] || "0") + ".");
      L[cpu].unshift(pa); hl[pa] = true;
      snap("kfree", 7, "`kmem[" + cpu + "].freelist = r` → kmem[" + cpu + "] = " + chain(L[cpu]) + ". '''맨 앞에''' push.");
      lock[cpu] = null;
      snap("kfree", 8, "release.");
      record("–");
      snap("kfree", 9, "`pop_off()`. 반환값 없음. 표에 " + ev.mark + " 행을 채운다.",
        ev.mark === "④" ? "채점 포인트: A 를 CPU0 에 돌려놓으면 오답 — kfree 는 '''지금 CPU(2)''' 앞에 push." : null);
    }

    function kalloc(cpu) {
      loc = {};
      snap("kalloc", 3, "`push_off()` — 인터럽트를 끈다 ([[cpuid]] 를 읽은 뒤 다른 CPU 로 옮겨지지 않게).");
      loc.id = cpu;
      snap("kalloc", 4, "`id = cpuid()` = " + cpu + ".");
      lock[cpu] = cpu;
      snap("kalloc", 5, "`acquire(&kmem[" + cpu + "].lock)` — 자기 lock.");
      loc.r = L[cpu][0] || "0";
      snap("kalloc", 6, "`r = kmem[" + cpu + "].freelist` → r = " + loc.r + (loc.r === "0" ? " — '''내 리스트가 비었다'''." : "."));
      if (loc.r !== "0") {
        L[cpu].shift(); hl[loc.r] = true;
        snap("kalloc", 7, "r 이 있으니 `kmem[" + cpu + "].freelist = r->next` → kmem[" + cpu + "] = " + chain(L[cpu]) + ".");
        lock[cpu] = null;
        snap("kalloc", 8, "release.");
        snap("kalloc", 9, "`r == 0` 이 거짓 → steal 루프 전체를 건너뛴다.");
        record(loc.r);
        snap("kalloc", 32, "`pop_off(); return r` → '''" + loc.r + " 반환'''. 자기 리스트에서 꺼냈으니 남의 lock 은 한 번도 안 잡았다. 표에 " + ev.mark + " 행을 채운다.");
        return;
      }
      snap("kalloc", 7, "r = 0 이라 아무것도 안 한다.");
      lock[cpu] = null;
      snap("kalloc", 8, "`release` — '''내 lock 을 먼저 놓는다'''. 지금부터는 lock 을 한 번에 하나만 쥔다 (circular wait 불가).");
      snap("kalloc", 9, "`r == 0` → steal 루프로.");
      for (var i = 0; i < NCPU; i++) {
        loc.i = i; loc.n = undefined; loc.head = undefined; loc.tail = undefined; loc.tailnext = undefined; batch = null; cut = null;
        snap("kalloc", 10, "`i = " + i + "`.");
        if (i === cpu) { snap("kalloc", 11, "`i == id` → '''자기 자신은 건너뛴다''' (continue)."); continue; }
        snap("kalloc", 11, "i ≠ id → kmem[" + i + "] 에서 훔쳐 본다.");
        lock[i] = cpu;
        snap("kalloc", 12, "`acquire(&kmem[" + i + "].lock)` — 남의 lock. 이 순간 쥔 lock 은 이것 하나.");
        loc.head = L[i][0] || "0"; loc.tail = loc.head; loc.tailnext = L[i][1] || "0";
        snap("kalloc", 13, "`head = tail = kmem[" + i + "].freelist` = " + loc.head + (loc.head === "0" ? " — 비어 있다." : "."));
        if (loc.head !== "0") {
          snap("kalloc", 14, "head ≠ 0.");
          var k = 0;
          for (var n = 1; ; n++) {
            loc.n = n;
            var more = n < STEAL && L[i][k + 1] !== undefined;
            if (!more) {
              snap("kalloc", 15, "`n = " + n + "`: " + (n >= STEAL ? "n < STEAL(" + STEAL + ") 거짓" : "`tail->next` = 0 (뒤에 더 없음)") + " → 루프 끝. 묶음 = " + L[i].slice(0, k + 1).join("→") + " (" + (k + 1) + "장).");
              break;
            }
            k++; loc.tail = L[i][k]; loc.tailnext = L[i][k + 1] || "0";
            snap("kalloc", 15, "`n = " + n + "`: n < " + STEAL + " 이고 tail->next ≠ 0 → `tail = tail->next` = " + loc.tail + ".");
          }
          batch = L[i].slice(0, k + 1);
          L[i] = L[i].slice(k + 1); cut = false;
          snap("kalloc", 16, "`kmem[" + i + "].freelist = tail->next` → kmem[" + i + "] = " + chain(L[i]) + ". 묶음 " + batch.join(",") + " 은 리스트에서 떨어져 '''손에 들렸다''' (아직 tail->next 는 " + loc.tailnext + " 을 가리킴).");
          loc.tailnext = "0"; cut = true;
          snap("kalloc", 17, "`tail->next = 0` — 묶음 끝을 끊는다. (c)(d) 순서를 바꾸면 (c) 에서 tail->next 가 이미 0 이라 kmem[" + i + "] 를 통째로 잃는다.");
        } else {
          snap("kalloc", 14, "head = 0 → 가져올 게 없다.");
        }
        lock[i] = null;
        snap("kalloc", 19, "`release(&kmem[" + i + "].lock)` — 남의 lock 을 놓는다. 이후 작업은 lock 밖에서 지역 변수로만.");
        if (loc.head === "0") { snap("kalloc", 20, "head = 0 → 다음 i 로."); continue; }
        snap("kalloc", 20, "head ≠ 0.");
        loc.r = loc.head;
        snap("kalloc", 21, "`r = head` = " + loc.r + " → 이게 반환할 페이지.");
        if (batch.length > 1) {
          var keep = batch.slice(1);
          snap("kalloc", 22, "`head->next` = " + keep[0] + " ≠ 0 → 남은 " + keep.join(",") + " 을 내 리스트에 보관한다.");
          lock[cpu] = cpu;
          snap("kalloc", 23, "`acquire(&kmem[" + cpu + "].lock)` — 이번엔 내 lock (남의 lock 은 이미 놓았다).");
          loc.tailnext = L[cpu][0] || "0"; cut = false;
          snap("kalloc", 24, "`tail->next = kmem[" + cpu + "].freelist` → " + loc.tail + "->next = " + loc.tailnext + ". 묶음 꼬리를 내 원래 리스트에 잇는 줄이 '''먼저'''.");
          L[cpu] = keep.concat(L[cpu]); keep.forEach(function (p) { hl[p] = true; }); batch = [loc.r];
          snap("kalloc", 25, "`kmem[" + cpu + "].freelist = head->next` → kmem[" + cpu + "] = " + chain(L[cpu]) + ". ((e)에 `head` 를 쓰면 " + loc.r + " 가 반환되면서 리스트에도 남아 '''두 번 할당'''.)");
          lock[cpu] = null;
          snap("kalloc", 26, "release.");
        } else {
          snap("kalloc", 22, "`head->next` = 0 — 한 장뿐이라 보관할 게 없다 → '''내 lock 을 아예 안 잡는다'''.");
        }
        snap("kalloc", 28, "`break` — 하나 얻었으니 다른 CPU 는 안 본다.");
        break;
      }
      if (loc.r === "0") snap("kalloc", 30, "모든 CPU 를 돌았는데 없음 → r = 0 (메모리 부족).");
      batch = null; cut = null;
      record(loc.r);
      snap("kalloc", 32, "`pop_off(); return r` → '''" + loc.r + " 반환'''. 표에 " + ev.mark + " 행을 채운다.");
    }

    snap(null, null, "[[과제2 문제 ① kalloc]] ④-02 를 ④-01 코드 그대로 줄 단위로. `STEAL = 2`, CPU 3개. 처음엔 '''CPU0: A→B→C→D→E''', CPU1·CPU2 는 비어 있다. 아래 표는 사건이 끝날 때마다 채워진다 — 먼저 손으로 풀고 ▶ 로 맞춰 보라.");
    EVENTS.forEach(function (e) {
      ev = e;
      if (e.op === "kfree") kfree(e.cpu, e.pa); else kalloc(e.cpu);
    });
    ev = null; loc = {};
    snap(null, null, "끝. 정답: " + rows.map(function (r) { return r.mark + " " + r.ret + " · " + r.lists.join(" / "); }).join("  ") + ". 요점 셋: ① steal 은 i = 0 부터, 자기는 건너뜀 ② kfree 는 '''지금 CPU''' 리스트 앞 ③ 한 장만 훔치면 내 lock 을 안 잡는다.");
    return { steps: steps, rows: rows };
  }

  var VARS = [
    { name: "사건", group: "지금" },
    { name: "id", group: "지역 변수" }, { name: "i", group: "지역 변수" }, { name: "n", group: "지역 변수" },
    { name: "r", group: "지역 변수" }, { name: "head", group: "지역 변수" }, { name: "tail", group: "지역 변수" },
    { name: "tail->next", group: "지역 변수" }
  ];
  [0, 1, 2].forEach(function (k) {
    VARS.push({ name: "kmem[" + k + "].freelist", group: "kmem[" + k + "]" });
    VARS.push({ name: "kmem[" + k + "].lock", group: "kmem[" + k + "]" });
  });

  global.SIMS["kalloc_batch"] = {
    title: "STEAL = 2 묶음 steal 추적 (④-02)",
    desc: "④-01 의 kalloc/kfree 코드를 사건 ①~⑥ 동안 '''한 줄씩''' 실행한다. head·tail 포인터, 손에 든 묶음, 세 리스트와 lock 주인, 사건별 정답표가 같이 움직인다.",
    options: [],
    build: function () {
      var r = build();
      return {
        panels: [
          { id: "kalloc", title: "kalloc() (④-01 정답 채움)", lang: "c", lines: KALLOC },
          { id: "kfree", title: "kfree()", lang: "c", lines: KFREE }
        ],
        vars: VARS,
        steps: r.steps,
        rows: r.rows
      };
    }
  };
})(typeof window !== "undefined" ? window : globalThis);
