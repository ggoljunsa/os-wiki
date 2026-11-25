// crash_scenario — 22강 p.4~11: 파일에 4 KB 블록 하나를 덧붙이는 갱신(I[v2], B[v2], Db) 중
// 어떤 쓰기만 디스크에 도착하고 crash 가 났는지에 따라 결과를 판정한다. p.16 의 fsck 규칙(inode 를 믿는다)도 마지막에 적용.
// 가정(p.4~6): inode 2 = I[v1](size 1, ptr 4), data bitmap bit 4 = 1, block 4 = Da. 갱신 뒤 I[v2](size 2, ptr 4·5), bit 5 = 1, block 5 = Db.
(function (global) {
  "use strict";
  global.SIMS = global.SIMS || {};

  // w = 디스크에 도착한 쓰기 [inode, bitmap, data]
  var CASES = {
    c1a: { w: [0, 0, 1], label: "Case 1a: Db 만" },
    c1b: { w: [1, 0, 0], label: "Case 1b: I[v2] 만" },
    c1c: { w: [0, 1, 0], label: "Case 1c: B[v2] 만" },
    c2a: { w: [1, 1, 0], label: "Case 2a: I + B (Db 없음)" },
    c2b: { w: [1, 0, 1], label: "Case 2b: I + Db (B 없음)" },
    c2c: { w: [0, 1, 1], label: "Case 2c: B + Db (I 없음)" },
    all: { w: [1, 1, 1], label: "셋 다 도착 (crash 없음과 같음)" },
    none: { w: [0, 0, 0], label: "하나도 안 도착" }
  };
  var NAMES = ["I[v2]", "B[v2]", "Db"];

  function verdict(w) {
    var I = w[0], B = w[1], D = w[2];
    if (I && B && D) return { ok: true, short: "consistent, 갱신 완료", why: "세 블록이 다 디스크에 있다. 새 상태로 옮겨 갔다" };
    if (!I && !B && !D) return { ok: true, short: "consistent, 갱신 사라짐", why: "디스크는 옛 상태 그대로다. append 만 없던 일이 된다" };
    if (!I && !B && D) return { ok: true, short: "문제 없음 (1a)", why: "Db 를 가리키는 inode 가 없다. write 가 없었던 것과 같다" };
    if (I && !B && !D) return { ok: false, short: "불일치 + garbage", why: "inode 는 5 를 가리키는데 bitmap 은 5 가 비었다고 한다. 5 의 옛 내용(garbage)을 읽는다" };
    if (!I && B && !D) return { ok: false, short: "불일치: space leak", why: "bitmap 은 5 를 썼다고 하는데 가리키는 inode 가 없다. 5 는 다시는 안 쓰인다" };
    if (I && B && !D) return { ok: false, short: "metadata 는 일치, data garbage", why: "inode 와 bitmap 은 서로 맞는다. 그런데 블록 5 에는 garbage 가 있다" };
    if (I && !B && D) return { ok: false, short: "불일치: inode vs B[v1]", why: "inode 는 맞는 data 를 가리키지만 bitmap 은 옛 판. 다른 파일이 5 를 가져갈 수 있다" };
    return { ok: false, short: "불일치: 주인 없는 블록", why: "bitmap 은 5 를 썼다고 하고 Db 도 있는데, 어느 파일 것인지 모른다" };
  }

  // fsck(p.16 Free blocks): bitmap 과 inode 가 다르면 inode 를 믿는다. garbage 는 못 고친다(p.15).
  function fsck(w) {
    var I = w[0], B = w[1], D = w[2];
    if (I && !B) return { bit: 1, msg: "inode 를 믿고 bit 5 를 1 로 고친다" + (D ? ". 새 블록이 살아남는다" : ". 하지만 블록 5 의 garbage 는 그대로다"), left: D ? "consistent" : "garbage 남음" };
    if (!I && B) return { bit: 0, msg: "5 를 가리키는 inode 가 없으니 bit 5 를 0 으로. " + (D ? "Db 는 버려진다" : "leak 이 풀린다"), left: "consistent" };
    if (I && B && !D) return { bit: 1, msg: "metadata 는 서로 맞아서 fsck 는 고칠 게 없다. garbage 는 못 알아챈다", left: "garbage 남음" };
    return { bit: B, msg: "고칠 불일치가 없다", left: "consistent" };
  }

  function cell(x, y, w, h, fill, label, color, bold, fs) {
    return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" fill="' + fill + '" stroke="#666" stroke-width="0.8"/>' +
      (label ? '<text x="' + (x + w / 2) + '" y="' + (y + h / 2 + 4) + '" font-size="' + (fs || 11) + '" text-anchor="middle" fill="' + (color || "#222") + '"' + (bold ? ' font-weight="700"' : '') + '>' + label + '</text>' : '');
  }
  // 공백 기준으로 n 자 안팎씩 자르기
  function wrap(t, n) {
    var out = [], cur = "";
    String(t).split(" ").forEach(function (w) {
      if ((cur + " " + w).trim().length > n && cur) { out.push(cur); cur = w; } else cur = (cur + " " + w).trim();
    });
    if (cur) out.push(cur);
    return out;
  }
  function lab(x, y, t, fs, fill, bold, anchor) {
    return '<text x="' + x + '" y="' + y + '" font-size="' + fs + '" fill="' + fill + '"' + (anchor ? ' text-anchor="' + anchor + '"' : '') + (bold ? ' font-weight="700"' : '') + '>' + t + '</text>';
  }

  // st: { mem: [bool×3] 메모리에 남은 dirty, disk: {I, B, D}, crashed, fsckBit }
  function draw(st, cap) {
    var s = '<svg viewBox="0 0 380 230" xmlns="http://www.w3.org/2000/svg">';
    s += lab(4, 14, cap, 12, "#3b2f4a", true);
    s += lab(4, 41, "메모리", 11, "#555");
    for (var k = 0; k < 3; k++) {
      var on = st.mem[k];
      s += cell(50 + k * 64, 26, 58, 22, st.crashed ? "#eee" : (on ? "#fdeec2" : "#fff"), st.crashed ? "" : (on ? NAMES[k] : "-"), "#8a6000", on);
    }
    if (st.crashed) s += lab(246, 42, "⚡ crash: 메모리 소실", 11, "#d6465f", true);
    var y = 74;
    s += lab(82, y - 6, "inode bitmap", 10, "#555", false, "middle") + lab(272, y - 6, "data bitmap", 10, "#555", false, "middle");
    for (var i = 0; i < 8; i++) {
      s += cell(10 + i * 18, y, 18, 20, i === 2 ? "#ccc" : "#fff", i === 2 ? "1" : "0", "#333");
      var bit = i === 4 ? 1 : (i === 5 ? (st.fsckBit !== undefined ? st.fsckBit : st.disk.B) : 0);
      var newBit = i === 5 && bit === 1;
      s += cell(200 + i * 18, y, 18, 20, i === 4 ? "#ccc" : (newBit ? "#cdefd2" : (i === 5 && st.fsckBit !== undefined ? "#efe9f6" : "#fff")), String(bit), newBit ? "#1d6b2a" : "#333", i === 5);
      s += lab(200 + i * 18 + 9, y + 30, String(i), 8, "#999", false, "middle");
    }
    var y2 = 130;
    s += lab(82, y2 - 6, "inodes (0~3)", 10, "#555", false, "middle") + lab(284, y2 - 6, "data blocks", 10, "#555", false, "middle");
    for (i = 0; i < 4; i++) {
      s += cell(10 + i * 36, y2, 36, 22, i === 2 ? (st.disk.I ? "#cdefd2" : "#ccc") : "#fff", i === 2 ? (st.disk.I ? "I[v2]" : "I[v1]") : "", st.disk.I && i === 2 ? "#1d6b2a" : "#333", i === 2, 10);
    }
    for (i = 0; i < 8; i++) {
      var f = "#fff", l = "", c = "#333";
      if (i === 4) { f = "#ccc"; l = "Da"; }
      if (i === 5) { if (st.disk.D) { f = "#cdefd2"; l = "Db"; c = "#1d6b2a"; } else { l = "??"; c = "#999"; } }
      s += cell(200 + i * 21, y2, 21, 22, f, l, c, i === 5, 10);
    }
    s += lab(200 + 5 * 21 + 10, y2 + 32, "5", 8, "#999", false, "middle");
    s += lab(82, y2 + 36, "inode 2: " + (st.disk.I ? "size 2 · ptr 4, 5" : "size 1 · ptr 4"), 10, "#1d65b3", false, "middle");
    if (st.disk.I) s += '<path d="M100,' + (y2 + 22) + ' C130,' + (y2 + 48) + ' 290,' + (y2 + 48) + ' 315,' + (y2 + 23) + '" fill="none" stroke="' + (st.disk.D ? "#2e9e4f" : "#d6465f") + '" stroke-width="1.4" stroke-dasharray="4 3"/>';
    var ly = 190;
    if (st.line) { s += lab(4, ly, st.line, 11, st.ok ? "#1d6b2a" : "#d6465f", true); ly += 16; }
    if (st.line2) wrap(st.line2, 34).slice(0, 2).forEach(function (t) { s += lab(4, ly, t, 10, "#3b2f4a"); ly += 14; });
    s += '</svg>';
    return s;
  }

  SIMS["crash_scenario"] = {
    title: "crash 시나리오 판정기 (22강 p.4~11, p.16)",
    desc: "I[v2]·B[v2]·Db 세 쓰기 중 어느 것이 디스크에 도착했는지 고르면, crash 뒤 디스크 상태와 판정, fsck 가 고친 결과를 보여 준다.",
    options: [
      { key: "case", label: "디스크에 도착한 쓰기", values: Object.keys(CASES).map(function (k) { return { value: k, label: CASES[k].label }; }) }
    ],
    build: function (opts) {
      var cs = CASES[opts["case"] || "c1b"], w = cs.w;
      var panels = [{ id: "upd", title: "append 한 블록 (p.7)", lang: "c", lines: [
        "write(I[v2]);  // inode 2: size 2, ptr 5",
        "write(B[v2]);  // data bitmap bit 5 = 1",
        "write(Db);     // data block 5",
        "/* crash! */",
        "check(inode ptr 5 <-> bitmap bit 5);",
        "check(block 5 content);",
        "fsck();        // inode 를 믿는다 (p.16)"
      ] }];
      var vars = [
        { name: "inode 2", group: "디스크" }, { name: "bitmap bit 5", group: "디스크" }, { name: "block 5", group: "디스크" },
        { name: "dirty (메모리)", group: "메모리" }, { name: "판정", group: "결과" }
      ];
      var v = { "inode 2": "I[v1]", "bitmap bit 5": 0, "block 5": "옛 내용", "dirty (메모리)": "I, B, Db", "판정": "?" };
      function snap(o) { for (var k in o) v[k] = o[k]; var r = {}; for (var k2 in v) r[k2] = v[k2]; return r; }
      var st = { mem: [true, true, true], disk: { I: 0, B: 0, D: 0 }, crashed: false };
      function copy() { return { mem: st.mem.slice(), disk: { I: st.disk.I, B: st.disk.B, D: st.disk.D }, crashed: st.crashed, line: st.line, line2: st.line2, ok: st.ok, fsckBit: st.fsckBit }; }
      var steps = [];
      steps.push({ desc: "세 블록이 다 메모리에만 있다(dirty). 디스크는 옛 상태", pc: { upd: null }, vars: snap({}), svg: draw(copy(), "시작: " + cs.label) });
      for (var k = 0; k < 3; k++) {
        var arrived = !!w[k];
        if (arrived) {
          if (k === 0) st.disk.I = 1; else if (k === 1) st.disk.B = 1; else st.disk.D = 1;
          st.mem[k] = false;
        }
        var dirty = []; for (var j = 0; j < 3; j++) if (st.mem[j]) dirty.push(["I", "B", "Db"][j]);
        var o = { "dirty (메모리)": dirty.length ? dirty.join(", ") : "없음" };
        if (k === 0 && arrived) o["inode 2"] = "I[v2]";
        if (k === 1 && arrived) o["bitmap bit 5"] = 1;
        if (k === 2 && arrived) o["block 5"] = "Db";
        steps.push({ desc: NAMES[k] + (arrived ? " 가 디스크에 도착했다" : " 는 아직 메모리에 있다(안 도착)"), pc: { upd: k + 1 }, vars: snap(o), svg: draw(copy(), NAMES[k] + (arrived ? " → 디스크" : " : 메모리에 남음")) });
      }
      st.crashed = true;
      steps.push({ desc: "crash. 메모리에 남은 dirty 블록은 사라진다", pc: { upd: 4 }, vars: snap({ "dirty (메모리)": "사라짐" }), svg: draw(copy(), "crash 직후 디스크") });
      var I = w[0], B = w[1], D = w[2];
      var meta = (I === B) ? "inode 와 bitmap 이 맞다" : (I ? "inode 는 5 를, bitmap 은 비었다고" : "bitmap 은 5 사용, inode 는 모른다");
      st.line = "inode ↔ bitmap: " + meta; st.ok = (I === B);
      steps.push({ desc: "inode 가 5 를 가리키나, bitmap bit 5 는? " + (I === B ? "서로 맞다" : "서로 다르다"), pc: { upd: 5 }, vars: snap({}), svg: draw(copy(), "검사 1: metadata 끼리 맞나") });
      var vd = verdict(w);
      st.line = vd.short; st.line2 = vd.why; st.ok = vd.ok;
      var dmsg = I ? (D ? "inode 가 가리키는 5 에 Db 가 있다" : "inode 가 가리키는 5 에 garbage") : "inode 가 5 를 안 가리킨다";
      steps.push({ desc: dmsg, pc: { upd: 6 }, vars: snap({ "판정": vd.short.length > 18 ? vd.short.slice(0, 18) : vd.short }), svg: draw(copy(), "판정"),
        note: vd.ok ? null : vd.why });
      var fx = fsck(w);
      st.fsckBit = fx.bit; st.line = "fsck 후: " + fx.left; st.line2 = fx.msg; st.ok = fx.left === "consistent";
      steps.push({ desc: "fsck: " + fx.msg.slice(0, 50), pc: { upd: 7 }, vars: snap({ "bitmap bit 5": fx.bit, "판정": "fsck 후 " + fx.left }), svg: draw(copy(), "fsck 가 고친 뒤 (p.16 inode 를 믿는다)") });
      return { panels: panels, vars: vars, steps: steps };
    }
  };
})(typeof window !== "undefined" ? window : globalThis);
