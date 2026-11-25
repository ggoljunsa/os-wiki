// ============================================================
// journal_write_flow — 22강 p.23~34: data journaling 의 네 단계
//   0 시작(메모리에 I[v2]·B[v2]·Db) → 1.5 ① Journal write(TxB, I, B, Db) → 4.6 ② Journal commit(TxE)
//   → 6 ③ Checkpoint(최종 위치로) → 9.2 ④ Free(journal superblock) → 12 끝
// ============================================================
window.ANIMS = window.ANIMS || {};
ANIMS["journal_write_flow"] = {
  title: "data journaling — 저널에 먼저, 그다음 제자리에",
  desc: "[[data journaling]] 의 네 단계. ① Journal write ② Journal commit(TxE) ③ Checkpoint ④ Free. 같은 블록을 저널에 한 번, 최종 위치에 한 번 쓴다",
  duration: 12,
  build: function () {
    var D = 12;
    var C = { a: "#1d65b3", aL: "#dbe8f7", g: "#2e9e4f", gL: "#dff3e4", o: "#e09a40", oL: "#fdeec2", k: "#3b2f4a", kL: "#efe9f6", hw: "#d6465f", mu: "#777" };
    function box(x, y, w, h, fill, stroke, extra) {
      return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="5" fill="' + fill + '" stroke="' + stroke + '" stroke-width="1.6"' + (extra || "") + '/>';
    }
    function txt(x, y, s, size, fill, extra) {
      return '<text x="' + x + '" y="' + y + '" font-size="' + (size || 13) + '" fill="' + (fill || "#222") + '"' + (/text-anchor/.test(extra || "") ? "" : ' text-anchor="middle"') + (extra || "") + '>' + s + '</text>';
    }
    function show(from, to) {
      var a = from / D, b = Math.min(1, to / D);
      return '<animate attributeName="opacity" values="0;0;1;1;0;0" keyTimes="0;' + a.toFixed(4) + ';' + Math.min(a + 0.01, b).toFixed(4) + ';' + b.toFixed(4) + ';' + Math.min(1, b + 0.01).toFixed(4) + ';1" dur="' + D + 's" fill="freeze"/>';
    }
    function appear(from) { return show(from, D); }
    // 움직이는 블록: (x1,y1) → (x2,y2), begin 초에 출발, dur 초 동안
    function move(x1, y1, x2, y2, begin, dur, label, fill, stroke) {
      return '<g opacity="0">' + box(-34, -13, 68, 26, fill, stroke) + txt(0, 5, label, 12, "#222", ' font-weight="700"') +
        '<animateMotion path="M' + x1 + ',' + y1 + ' L' + x2 + ',' + y2 + '" begin="' + begin + 's" dur="' + dur + 's" fill="freeze"/>' +
        show(begin, begin + dur) + '</g>';
    }
    var s = '<svg viewBox="0 0 760 350" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="data journaling 네 단계 애니메이션">';

    // ---- 자막 ----
    var caps = [
      [0, 1.5, "append 한 번: I[v2] · B[v2] · Db 세 블록이 메모리에 있다"],
      [1.5, 4.6, "① Journal write: TxB, I[v2], B[v2], Db 를 저널에 쓰고 끝나기를 기다린다"],
      [4.6, 6, "② Journal commit: TxE 를 쓴다. 이제 transaction 이 commit 됐다"],
      [6, 9.2, "③ Checkpoint: 같은 블록을 최종 위치(inode table · bitmap · block 5)에 쓴다"],
      [9.2, 12, "④ Free: journal superblock 에 Tx1 이 끝났다고 적는다. 저널 칸을 다시 쓸 수 있다"]
    ];
    caps.forEach(function (c) { s += '<g opacity="0">' + txt(380, 26, c[2], 14, "#222", ' font-weight="700"') + show(c[0], c[1]) + '</g>'; });

    // ---- 메모리 ----
    s += txt(70, 76, "메모리", 12, C.mu, ' text-anchor="start"');
    var memX = [250, 380, 510], names = ["I[v2]", "B[v2]", "Db"];
    s += box(180, 50, 400, 50, "#fafafa", "#ccc");
    names.forEach(function (n, i) { s += box(memX[i] - 40, 60, 80, 30, C.oL, C.o) + txt(memX[i], 80, n, 13, "#8a6000", ' font-weight="700"'); });

    // ---- 저널 ----
    var jy = 160, jX = [205, 295, 385, 475, 565];
    s += txt(18, jy + 5, "Journal", 12, C.k, ' text-anchor="start" font-weight="700"');
    s += box(80, jy - 18, 80, 36, C.kL, C.k) + txt(120, jy - 2, "Journal", 10, C.k) + txt(120, jy + 11, "Super", 10, C.k);
    jX.forEach(function (x) { s += box(x - 42, jy - 18, 84, 36, "#fff", "#bbb", ' stroke-dasharray="4 3"'); });
    // 도착한 블록(정지)
    var jLab = ["TxB id=1", "I[v2]", "B[v2]", "Db", "TxE id=1"], jArr = [1.7, 2.7, 3.4, 4.1, 5.0];
    jLab.forEach(function (l, i) {
      var tx = i === 0 || i === 4;
      s += '<g opacity="0">' + box(jX[i] - 42, jy - 18, 84, 36, tx ? C.aL : C.oL, tx ? C.a : C.o) + txt(jX[i], jy + 5, l, 12, "#222", ' font-weight="700"') + appear(jArr[i]) + '</g>';
    });
    // TxE 강조 테두리
    s += '<g opacity="0">' + box(jX[4] - 46, jy - 22, 92, 44, "none", C.hw, ' stroke-width="3"') + txt(jX[4], jy + 38, "commit!", 12, C.hw, ' font-weight="700"') + show(5.0, 6.2) + '</g>';
    // 기다림 표시
    s += '<g opacity="0">' + txt(680, jy + 5, "wait()", 12, C.mu, ' font-style="italic"') + show(4.1, 4.7) + '</g>';
    s += '<g opacity="0">' + txt(680, jy + 5, "wait()", 12, C.mu, ' font-style="italic"') + show(5.1, 5.9) + '</g>';
    // free 덮개
    s += '<g opacity="0"><rect x="160" y="' + (jy - 20) + '" width="450" height="40" fill="#fff" opacity="0.88"/>' + txt(385, jy + 5, "Tx1 free (다시 쓸 수 있음)", 13, C.k, ' font-weight="700"') + appear(9.6) + '</g>';
    s += '<g opacity="0">' + box(80, jy - 18, 80, 36, "#fff", C.hw, ' stroke-width="2.5"') + txt(120, jy - 2, "Tx1", 11, C.hw, ' font-weight="700"') + txt(120, jy + 11, "free", 11, C.hw) + appear(9.4) + '</g>';
    // 메모리 → 저널
    s += '<g opacity="0">' + box(jX[0] - 42, jy - 18, 84, 36, C.aL, C.a) + txt(jX[0], jy + 5, "TxB id=1", 12, "#222", ' font-weight="700"') + show(1.5, 1.7) + '</g>';
    s += move(memX[0], 75, jX[1], jy, 1.9, 0.8, "I[v2]", C.oL, C.o);
    s += move(memX[1], 75, jX[2], jy, 2.6, 0.8, "B[v2]", C.oL, C.o);
    s += move(memX[2], 75, jX[3], jy, 3.3, 0.8, "Db", C.oL, C.o);
    s += move(660, jy, jX[4], jy, 4.6, 0.4, "TxE", C.aL, C.a);

    // ---- 최종 위치 ----
    var fy = 270, fX = [250, 400, 550], fName = ["inode table (inode 2)", "data bitmap", "data block 5"], fOld = ["I[v1]", "B[v1]", "옛 내용"];
    s += txt(18, fy + 5, "최종 위치", 12, C.k, ' text-anchor="start" font-weight="700"');
    fX.forEach(function (x, i) {
      s += txt(x, fy - 26, fName[i], 11, C.mu);
      s += box(x - 55, fy - 18, 110, 36, "#eee", "#999") + txt(x, fy + 5, fOld[i], 12, "#666");
    });
    var fArr = [6.9, 7.7, 8.5];
    fX.forEach(function (x, i) {
      s += '<g opacity="0">' + box(x - 55, fy - 18, 110, 36, C.gL, C.g) + txt(x, fy + 5, names[i], 13, "#1d6b2a", ' font-weight="700"') + appear(fArr[i]) + '</g>';
    });
    // 저널 → 최종 위치
    s += move(jX[1], jy, fX[0], fy, 6.1, 0.8, "I[v2]", C.gL, C.g);
    s += move(jX[2], jy, fX[1], fy, 6.9, 0.8, "B[v2]", C.gL, C.g);
    s += move(jX[3], jy, fX[2], fy, 7.7, 0.8, "Db", C.gL, C.g);

    // ---- 요점 ----
    s += txt(380, 334, "같은 블록을 두 번 쓴다(저널 한 번, 최종 위치 한 번). crash 가 나면 TxE 까지 있는 transaction 만 replay", 12, C.mu);
    s += '</svg>';
    return s;
  }
};
