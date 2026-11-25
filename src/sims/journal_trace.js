// journal_trace — 22강 p.23~34: data journaling 의 4단계(Journal write → Journal commit → Checkpoint → Free)를
// 블록 하나씩 쓰다가 고른 지점에서 crash 를 내고, p.30 의 recovery(commit 된 transaction 만 replay)를 돌린다.
// 옵션 unsafe = p.27 "한 번에 다 쓰기": 디스크가 TxE 를 Db 보다 먼저 써 버린 경우.
(function (global) {
  "use strict";
  global.SIMS = global.SIMS || {};

  // 쓰기 순서. ph = 단계(코드 줄), j = 저널 칸 / f = 최종 위치 칸
  var SAFE = [
    { ph: 1, j: "TxB", d: "TxB(id=1) 를 저널에" },
    { ph: 1, j: "I", d: "I[v2] 사본을 저널에" },
    { ph: 1, j: "B", d: "B[v2] 사본을 저널에" },
    { ph: 1, j: "Db", d: "Db 사본을 저널에" },
    { ph: 2, j: "TxE", d: "TxE(id=1) 를 저널에. 이제 commit 됐다" },
    { ph: 3, f: "I", d: "checkpoint: I[v2] 를 inode table 에" },
    { ph: 3, f: "B", d: "checkpoint: B[v2] 를 data bitmap 에" },
    { ph: 3, f: "Db", d: "checkpoint: Db 를 block 5 에" },
    { ph: 4, free: true, d: "free: journal superblock 이 Tx1 을 빈 칸으로" }
  ];
  var UNSAFE = [
    { ph: 1, j: "TxB", d: "TxB 저널에 (디스크가 고른 순서)" },
    { ph: 1, j: "I", d: "I[v2] 저널에" },
    { ph: 1, j: "B", d: "B[v2] 저널에" },
    { ph: 1, j: "TxE", d: "TxE 를 Db 보다 먼저 써 버렸다" },
    { ph: 1, j: "Db", d: "Db 저널에 (마지막)" }
  ];
  var POINTS = {
    none: { n: 99, label: "crash 없음" },
    mid_write: { n: 2, label: "journal write 중 (TxB·I 만)" },
    before_commit: { n: 4, label: "TxE 쓰기 전" },
    after_commit: { n: 5, label: "commit 뒤, checkpoint 전" },
    mid_ckpt: { n: 6, label: "checkpoint 중 (I 만)" },
    before_free: { n: 8, label: "checkpoint 끝, free 전" }
  };

  var SLOT_J = ["TxB", "I", "B", "Db", "TxE"], LAB_J = { TxB: "TxB 1", I: "I[v2]", B: "B[v2]", Db: "Db", TxE: "TxE 1" };
  var SLOT_F = ["I", "B", "Db"], LAB_F = { I: ["inode 2", "I[v1]", "I[v2]"], B: ["bitmap", "B[v1]", "B[v2]"], Db: ["block 5", "옛 내용", "Db"] };

  function box(x, y, w, h, fill, stroke, label, color, bold) {
    return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="3" fill="' + fill + '" stroke="' + stroke + '" stroke-width="1.2"/>' +
      '<text x="' + (x + w / 2) + '" y="' + (y + h / 2 + 4) + '" font-size="11" text-anchor="middle" fill="' + (color || "#222") + '"' + (bold ? ' font-weight="700"' : '') + '>' + label + '</text>';
  }
  function lab(x, y, t, fs, fill, bold, anchor) {
    return '<text x="' + x + '" y="' + y + '" font-size="' + fs + '" fill="' + fill + '"' + (anchor ? ' text-anchor="' + anchor + '"' : '') + (bold ? ' font-weight="700"' : '') + '>' + t + '</text>';
  }
  function wrap(t, n) {
    var out = [], cur = "";
    String(t).split(" ").forEach(function (w) {
      if ((cur + " " + w).trim().length > n && cur) { out.push(cur); cur = w; } else cur = (cur + " " + w).trim();
    });
    if (cur) out.push(cur);
    return out;
  }

  // st: { j: {slot: 0|1|"garbage"}, f: {slot: 0|1|"replayed"|"garbage"}, freed, crashed, msg, ok }
  function draw(st, cap) {
    var s = '<svg viewBox="0 0 380 230" xmlns="http://www.w3.org/2000/svg">';
    s += lab(4, 14, cap.length > 30 ? cap.slice(0, 30) + "…" : cap, 12, "#3b2f4a", true);
    s += lab(4, 36, "Journal", 10, "#555");
    s += box(4, 42, 46, 30, st.freed ? "#efe9f6" : "#eee", "#3b2f4a", st.freed ? "free" : "J-Sup", "#3b2f4a", st.freed);
    SLOT_J.forEach(function (k, i) {
      var v = st.j[k], fill = "#fff", stroke = "#bbb", col = "#bbb", l = LAB_J[k];
      if (v === 1) { fill = (k === "TxB" || k === "TxE") ? "#dbe8f7" : "#fdeec2"; stroke = "#1d65b3"; col = "#222"; }
      if (v === "garbage") { fill = "#ffd9d9"; stroke = "#d6465f"; col = "#d6465f"; l = "??"; }
      if (st.freed && v) { fill = "#f4f4f4"; col = "#999"; }
      s += box(54 + i * 64, 42, 60, 30, fill, stroke, l, col, v === 1 && !st.freed);
    });
    s += lab(4, 98, "최종 위치", 10, "#555");
    SLOT_F.forEach(function (k, i) {
      var v = st.f[k], L = LAB_F[k], x = 54 + i * 108;
      s += lab(x + 50, 98, L[0], 10, "#777", false, "middle");
      var fill = "#eee", stroke = "#999", col = "#555", l = L[1];
      if (v === 1 || v === "replayed") { fill = "#cdefd2"; stroke = "#1d6b2a"; col = "#1d6b2a"; l = L[2] + (v === "replayed" ? " (replay)" : ""); }
      if (v === "garbage") { fill = "#ffd9d9"; stroke = "#d6465f"; col = "#d6465f"; l = "garbage!"; }
      s += box(x, 104, 100, 30, fill, stroke, l, col, v && v !== 0);
    });
    if (st.crashed) s += lab(4, 158, "⚡ crash (메모리 내용 소실)", 11, "#d6465f", true);
    var ly = 180;
    if (st.msg) wrap(st.msg, 34).slice(0, 2).forEach(function (t) { s += lab(4, ly, t, 11, st.ok ? "#1d6b2a" : "#d6465f", true); ly += 15; });
    if (st.msg2) wrap(st.msg2, 38).slice(0, 2).forEach(function (t) { s += lab(4, ly, t, 10, "#3b2f4a"); ly += 13; });
    s += '</svg>';
    return s;
  }

  SIMS["journal_trace"] = {
    title: "data journaling 따라가기: crash 지점별 recovery (22강 p.23~34)",
    desc: "TxB → I[v2]·B[v2]·Db → TxE → checkpoint → free 를 한 블록씩 쓰다가 고른 지점에서 crash 를 내고 recovery 결과를 본다.",
    options: [
      { key: "crash", label: "crash 지점", values: Object.keys(POINTS).map(function (k) { return { value: k, label: POINTS[k].label }; }) },
      { key: "write", label: "저널 쓰기 방식", values: [{ value: "two_step", label: "두 단계 (p.28, TxE 따로)" }, { value: "unsafe", label: "한 번에 다 (p.27, unsafe)" }] }
    ],
    build: function (opts) {
      var unsafe = opts.write === "unsafe";
      var seq = unsafe ? UNSAFE : SAFE;
      var crashAt = unsafe ? 4 : POINTS[opts.crash || "after_commit"].n;  // unsafe 는 TxE 뒤 Db 전에 crash (p.27 의 (1)과 (2) 사이)
      var panels = [{ id: "proto", title: unsafe ? "한 번에 다 쓰기 (p.27)" : "쓰기 순서 (p.34)", lang: "c", lines: unsafe ? [
        "write(TxB, I[v2], B[v2], Db, TxE); // 한 번에",
        "/* 디스크가 순서를 바꿀 수 있다 */",
        "checkpoint(I[v2], B[v2], Db);",
        "free(Tx1);"
      ] : [
        "write(TxB, I[v2], B[v2], Db); wait();  // 1. Journal write",
        "write(TxE); wait();                    // 2. Journal commit",
        "write I[v2], B[v2], Db to final;       // 3. Checkpoint",
        "update journal superblock;             // 4. Free"
      ] }, { id: "rec", title: "recovery (p.30)", lang: "c", lines: [
        "scan log from journal superblock;",
        "if (TxB ... TxE same TID) replay(tx);",
        "else skip(tx);   // pending update 버림"
      ] }];
      var vars = [
        { name: "단계", group: "진행" }, { name: "저널", group: "디스크" }, { name: "TxE", group: "디스크" },
        { name: "최종 위치", group: "디스크" }, { name: "결과", group: "recovery" }
      ];
      var v = { "단계": "시작", "저널": "비어 있음", "TxE": "없음", "최종 위치": "I[v1] B[v1] 옛", "결과": "?" };
      function snap(o) { for (var k in o) v[k] = o[k]; var r = {}; for (var k2 in v) r[k2] = v[k2]; return r; }
      var st = { j: {}, f: {}, freed: false, crashed: false };
      function copy() { return JSON.parse(JSON.stringify(st)); }
      var PH = ["", "1. Journal write", "2. Journal commit", "3. Checkpoint", "4. Free"];
      var steps = [];
      steps.push({ desc: "I[v2]·B[v2]·Db 가 메모리에 있다. 디스크는 옛 상태", pc: { proto: null, rec: null }, vars: snap({}), svg: draw(copy(), "시작") });
      var n = Math.min(crashAt, seq.length);
      for (var i = 0; i < n; i++) {
        var w = seq[i];
        if (w.j) st.j[w.j] = 1;
        if (w.f) st.f[w.f] = 1;
        if (w.free) st.freed = true;
        var jl = SLOT_J.filter(function (k) { return st.j[k]; }).map(function (k) { return k === "I" ? "I" : k; }).join(" ");
        var fl = SLOT_F.filter(function (k) { return st.f[k]; });
        var pcl = unsafe ? (w.j === "TxE" ? 2 : 1) : w.ph;
        steps.push({ desc: w.d, pc: { proto: pcl, rec: null },
          vars: snap({ "단계": unsafe ? "한 번에" : PH[w.ph], "저널": jl.length > 18 ? jl.slice(0, 18) : jl, "TxE": st.j.TxE ? "있음 (id=1)" : "없음", "최종 위치": fl.length ? fl.join(",") + " 새 판" : "I[v1] B[v1] 옛" }),
          svg: draw(copy(), (unsafe ? "한 번에 쓰기" : PH[w.ph]) + ": " + w.d) });
      }
      if (crashAt >= 99) {
        st.msg = "crash 없이 끝났다. 저널 칸은 재사용할 수 있다"; st.ok = true;
        steps.push({ desc: "4단계가 다 끝났다. Tx1 칸은 다음 transaction 이 쓴다", pc: { proto: 4, rec: null }, vars: snap({ "결과": "정상 종료" }), svg: draw(copy(), "끝") });
        return { panels: panels, vars: vars, steps: steps };
      }
      st.crashed = true;
      if (unsafe) st.j.Db = "garbage";
      steps.push({ desc: unsafe ? "Db 를 쓰기 전에 crash. 저널의 Db 칸은 garbage" : "crash! 메모리 내용은 사라진다", pc: { proto: unsafe ? 2 : null, rec: null },
        vars: snap({ "단계": "crash" }), svg: draw(copy(), "crash 직후") });
      // recovery
      steps.push({ desc: "재부팅. journal superblock 부터 log 를 훑는다", pc: { proto: null, rec: 1 }, vars: snap({ "단계": "recovery" }), svg: draw(copy(), "recovery: log 를 훑는다") });
      if (st.freed) {
        st.msg = "Tx1 은 이미 free. replay 할 게 없다"; st.ok = true;
      } else if (st.j.TxE) {
        SLOT_F.forEach(function (k) { if (st.f[k] !== 1) st.f[k] = (unsafe && k === "Db") ? "garbage" : "replayed"; else st.f[k] = "replayed"; });
        if (unsafe) { st.msg = "TxE 가 있어 유효한 transaction 처럼 보인다 → garbage 를 block 5 에 replay"; st.ok = false; st.msg2 = "p.27: 파일 시스템은 Db 가 garbage 인 줄 모른다. superblock 이면 더 나쁘다"; }
        else { st.msg = "TxB~TxE 가 다 있다(commit 됨) → I[v2]·B[v2]·Db 를 다시 쓴다"; st.ok = true; st.msg2 = crashAt === 6 ? "이미 쓴 I[v2] 를 한 번 더 써도 결과는 같다" : "redo logging: 저널 사본으로 최종 위치를 덮어쓴다"; }
        steps.push({ desc: unsafe ? "TxE 가 있다 → replay. Db 자리에 garbage 가 간다" : "TxE 를 찾았다(commit 됨) → replay", pc: { proto: null, rec: 2 },
          vars: snap({ "최종 위치": unsafe ? "I B 새, 5=garbage" : "I B Db 새 판", "결과": unsafe ? "garbage 복구" : "replay 성공" }), svg: draw(copy(), "replay"),
          note: unsafe ? "TxE 를 다른 블록과 함께 쓰면 안 되는 이유: 디스크가 순서를 바꾼다(p.27). 그래서 p.28 처럼 두 단계로 쓴다" : null });
        return { panels: panels, vars: vars, steps: steps };
      } else {
        st.msg = "TxE 가 없다 → commit 안 된 transaction. 건너뛴다(skip)"; st.ok = true;
        st.msg2 = "최종 위치는 한 번도 안 건드렸으니 옛 상태 그대로, consistent. 이번 갱신만 사라진다";
      }
      steps.push({ desc: st.freed ? "free 된 transaction 은 log 에 없다" : "TxE 가 없다 → skip. 디스크는 옛 상태 그대로", pc: { proto: null, rec: st.freed ? 1 : 3 },
        vars: snap({ "결과": st.freed ? "할 일 없음" : "skip (갱신 버림)" }), svg: draw(copy(), "recovery 결과") });
      return { panels: panels, vars: vars, steps: steps };
    }
  };
})(typeof window !== "undefined" ? window : globalThis);
