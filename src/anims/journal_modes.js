// ============================================================
// journal_modes — 22강 p.35: ext3/4 의 세 journaling mode 가 같은 append 를 어떤 순서로 쓰나
//   Journal(data journaling): 저널에 I·B·Db 다 → TxE → 제자리에 I·B·Db
//   Ordered(기본): Db 를 먼저 제자리에 → 저널에 I·B → TxE → 제자리에 I·B
//   Writeback: 저널에 I·B → TxE → 제자리에 I·B, Db 는 아무 때나
// ============================================================
window.ANIMS = window.ANIMS || {};
ANIMS["journal_modes"] = {
  title: "ext3/4 journaling mode 세 가지 — 쓰는 순서 비교",
  desc: "[[ext3 journaling mode]]: Journal 은 data 까지 저널에, Ordered(기본)는 data 를 먼저 제자리에 쓰고 metadata 만 저널에, Writeback 은 data 순서를 신경 쓰지 않는다",
  duration: 12,
  build: function () {
    var D = 12;
    var C = { a: "#1d65b3", aL: "#dbe8f7", g: "#2e9e4f", gL: "#dff3e4", o: "#e09a40", oL: "#fdeec2", k: "#3b2f4a", kL: "#efe9f6", hw: "#d6465f", mu: "#777" };
    function box(x, y, w, h, fill, stroke, extra) {
      return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="4" fill="' + fill + '" stroke="' + stroke + '" stroke-width="1.6"' + (extra || "") + '/>';
    }
    function txt(x, y, s, size, fill, extra) {
      return '<text x="' + x + '" y="' + y + '" font-size="' + (size || 13) + '" fill="' + (fill || "#222") + '"' + (/text-anchor/.test(extra || "") ? "" : ' text-anchor="middle"') + (extra || "") + '>' + s + '</text>';
    }
    function show(from, to) {
      var a = from / D, b = Math.min(1, to / D);
      return '<animate attributeName="opacity" values="0;0;1;1;0;0" keyTimes="0;' + a.toFixed(4) + ';' + Math.min(a + 0.01, b).toFixed(4) + ';' + b.toFixed(4) + ';' + Math.min(1, b + 0.01).toFixed(4) + ';1" dur="' + D + 's" fill="freeze"/>';
    }
    var s = '<svg viewBox="0 0 760 360" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="ext3/4 journaling mode 비교 애니메이션">';
    var caps = [
      [0, 1.2, "같은 append(I[v2], B[v2], Db)를 ext3/4 의 세 모드로 쓰면"],
      [1.2, 8, "파란 칸 = 저널에 쓰기, 초록 칸 = 최종 위치에 쓰기. 왼쪽부터 쓰는 순서"],
      [8, 12, "Ordered(기본): Db 를 먼저 제자리에 쓰니 inode 가 garbage 를 가리킬 일이 없다"]
    ];
    caps.forEach(function (c) { s += '<g opacity="0">' + txt(380, 26, c[2], 14, "#222", ' font-weight="700"') + show(c[0], c[1]) + '</g>'; });

    var x0 = 170, cw = 64, gap = 8, T0 = 1.2, dt = 0.85;
    function cx(i) { return x0 + i * (cw + gap); }
    // [J|F, 라벨, 강조]
    var ROWS = [
      { name: "Journal", sub: "data 까지 저널에", y: 80, seq: [["J", "TxB"], ["J", "I[v2]"], ["J", "B[v2]"], ["J", "Db"], ["J", "TxE"], ["F", "I[v2]"], ["F", "B[v2]"], ["F", "Db"]] },
      { name: "Ordered", sub: "기본값", y: 170, seq: [["F", "Db", 1], ["J", "TxB"], ["J", "I[v2]"], ["J", "B[v2]"], ["J", "TxE"], ["F", "I[v2]"], ["F", "B[v2]"]] },
      { name: "Writeback", sub: "data 순서 상관없음", y: 260, seq: [["J", "TxB"], ["J", "I[v2]"], ["J", "B[v2]"], ["J", "TxE"], ["F", "I[v2]"], ["F", "B[v2]"]] }
    ];
    ROWS.forEach(function (r) {
      s += txt(20, r.y + 2, r.name, 15, C.k, ' text-anchor="start" font-weight="700"');
      s += txt(20, r.y + 20, r.sub, 11, C.mu, ' text-anchor="start"');
      s += '<line x1="' + (x0 - 6) + '" y1="' + (r.y + 26) + '" x2="740" y2="' + (r.y + 26) + '" stroke="#ddd"/>';
      r.seq.forEach(function (c, i) {
        var J = c[0] === "J", tx = c[1] === "TxB" || c[1] === "TxE";
        var fill = J ? (tx ? C.aL : "#eef4fb") : C.gL, stroke = J ? C.a : C.g;
        s += '<g opacity="0">' + box(cx(i), r.y - 16, cw, 34, fill, stroke) +
          txt(cx(i) + cw / 2, r.y - 2, J ? "저널" : "제자리", 9, J ? C.a : "#1d6b2a") +
          txt(cx(i) + cw / 2, r.y + 12, c[1], 12, "#222", ' font-weight="700"') + show(T0 + i * dt, D) + '</g>';
        if (c[2]) s += '<g opacity="0">' + box(cx(i) - 4, r.y - 20, cw + 8, 42, "none", C.hw, ' stroke-width="3"') + txt(cx(i) + cw / 2, r.y + 40, "data 먼저", 11, C.hw, ' font-weight="700"') + show(8, D) + '</g>';
      });
    });
    // Journal 모드: data 를 두 번 쓴다
    s += '<g opacity="0">' + txt(cx(3) + cw / 2, 80 + 40, "Db 를 두 번 쓴다", 11, C.hw, ' font-weight="700"') + show(8, D) + '</g>';
    // Writeback: Db 가 아무 데나 끼어든다
    var wy = 260 + 40;
    s += '<g opacity="0"><g>' +
      '<animateTransform attributeName="transform" type="translate" calcMode="discrete" values="' + cx(0) + ',0;' + cx(3) + ',0;' + cx(1) + ',0;' + cx(5) + ',0;' + cx(2) + ',0" keyTimes="0;0.3;0.5;0.7;0.85" dur="' + D + 's" fill="freeze"/>' +
      box(0, wy - 14, cw, 30, C.gL, C.g, ' stroke-dasharray="5 3"') + txt(cw / 2, wy + 6, "Db ?", 12, "#1d6b2a", ' font-weight="700"') + '</g>' + show(T0, D) + '</g>';
    s += '<g opacity="0">' + txt(cx(6) + 10, wy + 6, "아무 때나", 12, C.hw, ' text-anchor="start" font-weight="700"') + show(2, D) + '</g>';

    s += txt(380, 348, "Journal: data 까지 두 번 쓴다 · Ordered: data 먼저, metadata 만 저널 · Writeback: inode 가 garbage 를 가리킬 수 있다", 12, C.mu);
    s += '</svg>';
    return s;
  }
};
