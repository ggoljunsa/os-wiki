// ============================================================
// segment_map — 세그먼트마다 base/size 를 따로 두어 code·heap·stack 을 물리 메모리 여기저기에 놓는 그림 (14강 p.6, p.10~12)
// 시간축(초): 0~2 주소 공간 16KB 와 물리 64KB → 2~4.5 세 세그먼트가 각자 다른 곳으로(가운데 free 는 안 옮김)
//   → 4.5~7 VA 4200 = 01|000001101000 → heap, offset 104 → 7~9 104 + 34K = 34920
//   → 9~11.5 VA 15KB = 11|110000000000 → stack, offset 3072 − 4096 = −1024 → 28K − 1K = 27KB → 11.5~13 요점
// ============================================================
window.ANIMS = window.ANIMS || {};
ANIMS["segment_map"] = {
  title: "Segmentation — code·heap·stack 을 따로따로 옮기고, 위 2비트로 세그먼트를 고르는 13초",
  desc: "base and bounds 는 주소 공간 16KB 를 통째로 옮겨 가운데 빈 공간까지 물리 메모리를 차지했다. [[세그멘테이션]]은 세그먼트마다 base/size 를 따로 두어 '''쓰는 부분만''' 옮긴다(p.6). 변환은 위 2비트로 세그먼트, 아래 12비트 offset 을 base 에 더하기 — stack 은 음의 방향(p.12)",
  duration: 13,
  build: function () {
    var D = 13;
    var C = { a: "#1d65b3", aL: "#dbe8f7", b: "#2e9e4f", bL: "#dff3e4", c: "#e09a40", cL: "#fdeec2", cpu: "#3b2f4a", hw: "#d6465f", muted: "#777", os: "#c9d9f0" };
    function r3(v) { return Math.round(v * 1000) / 1000; }
    function box(x, y, w, h, fill, stroke) { return '<rect x="' + r3(x) + '" y="' + r3(y) + '" width="' + r3(w) + '" height="' + r3(h) + '" rx="3" fill="' + fill + '" stroke="' + stroke + '" stroke-width="1.5"/>'; }
    function txt(x, y, s, size, fill, extra) {
      var anchor = /text-anchor/.test(extra || "") ? "" : ' text-anchor="middle"';
      return '<text x="' + r3(x) + '" y="' + r3(y) + '" font-size="' + (size || 13) + '" fill="' + (fill || "#222") + '"' + anchor + (extra || "") + '>' + s + '</text>';
    }
    function show(from, to) {
      return '<animate attributeName="opacity" values="0;0;1;1;0;0" keyTimes="0;' + r3(from / D) + ';' + r3(from / D + 0.003) + ';' + r3(to / D) + ';' + r3(Math.min(1, to / D + 0.003)) + ';1" dur="' + D + 's" fill="freeze"/>';
    }
    function during(from, to, inner) {
      if (from <= 0) return '<g>' + inner + '<animate attributeName="opacity" values="1;1;0;0" keyTimes="0;' + r3(to / D) + ';' + r3(Math.min(1, to / D + 0.003)) + ';1" dur="' + D + 's" fill="freeze"/></g>';
      return '<g opacity="0">' + inner + show(from, to) + '</g>';
    }
    function token(path, from, to, label, color) {
      return '<g opacity="0"><circle r="7" fill="' + color + '"/>' + txt(0, -11, label, 11, color, ' font-weight="700"') +
        '<animateMotion path="' + path + '" begin="' + from + 's" dur="' + r3(to - from) + 's" fill="freeze"/>' + show(from, to) + '</g>';
    }

    var s = '<svg viewBox="0 0 760 360" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Segmentation 애니메이션">';
    s += '<defs><marker id="sm_arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#555"/></marker></defs>';

    [
      [0, 2, "주소 공간 16KB (code 0~2KB · heap 4~6KB · stack 14~16KB) 와 물리 메모리 64KB"],
      [2, 4.5, "세그먼트마다 base 를 따로 — Code 32K · Heap 34K · Stack 28K (가운데 free 는 물리 메모리를 안 쓴다)"],
      [4.5, 7, "VA 4200 = 01 | 000001101000 → 위 2비트 01 = Heap, 아래 12비트 offset = 104"],
      [7, 9, "offset 104 < size 2K → PA = 104 + 34K = 34920 (VA + base 가 아니다)"],
      [9, 11.5, "VA 15KB = 11 | 110000000000 → Stack, offset 3072 → 음의 방향: 3072 − 4096 = −1024"],
      [11.5, D, "|−1024| ≤ size 2K → PA = 28K − 1K = 27KB. 세그먼트 테이블 = (base, size, grows positive?, protection)"]
    ].forEach(function (c) { s += during(c[0], c[1], txt(380, 24, c[2], 12.5, "#222", ' font-weight="700"')); });

    // 왼쪽: 주소 공간 0~16KB (y 50~306, 1KB = 16px)
    var AX = 40, AW = 120, AY = 50;
    function ay(k) { return AY + 16 * k; }
    s += txt(AX + AW / 2, 44, "Address Space (VA)", 12, C.cpu, ' font-weight="700"');
    s += box(AX, ay(0), AW, 32, C.aL, C.a) + txt(AX + AW / 2, ay(1) + 4, "Code", 12, C.a, ' font-weight="700"');
    s += box(AX, ay(2), AW, 32, "#f6f6f6", "#bbb");
    s += box(AX, ay(4), AW, 32, C.bL, C.b) + txt(AX + AW / 2, ay(5) + 4, "Heap", 12, C.b, ' font-weight="700"');
    s += box(AX, ay(6), AW, ay(14) - ay(6), "#f6f6f6", "#bbb") + txt(AX + AW / 2, ay(10) + 4, "(free)", 11, C.muted);
    s += box(AX, ay(14), AW, 32, C.cL, C.c) + txt(AX + AW / 2, ay(15) + 4, "Stack ↑", 12, C.c, ' font-weight="700"');
    [0, 2, 4, 6, 14, 16].forEach(function (k) { s += txt(AX - 5, ay(k) + 4, k + "KB", 9.5, C.muted, ' text-anchor="end"'); });

    // 가운데: 세그먼트 테이블
    var TX = 250, TY = 120;
    s += txt(TX + 105, TY - 10, "Segment Table (per process)", 11.5, C.cpu, ' font-weight="700"');
    s += box(TX, TY, 210, 96, "#fff", C.cpu);
    [["Seg", "Base", "Size", "Grows+"], ["Code 00", "32K", "2K", "1"], ["Heap 01", "34K", "2K", "1"], ["Stack 11", "28K", "2K", "0"]].forEach(function (r, i) {
      var y = TY + 18 + i * 22, col = [C.cpu, C.a, C.b, C.c][i];
      s += txt(TX + 32, y, r[0], 11, col, i ? "" : ' font-weight="700"') + txt(TX + 95, y, r[1], 11, col) + txt(TX + 140, y, r[2], 11, col) + txt(TX + 182, y, r[3], 11, col);
    });
    s += during(4.5, 9, '<rect x="' + TX + '" y="' + (TY + 50) + '" width="210" height="20" fill="none" stroke="' + C.b + '" stroke-width="2.5"/>');
    s += during(9, D, '<rect x="' + TX + '" y="' + (TY + 72) + '" width="210" height="20" fill="none" stroke="' + C.c + '" stroke-width="2.5"/>');

    // 오른쪽: 물리 메모리 0~64KB (y 50~306, 1KB = 4px)
    var PX = 600, PW = 120, PY = 50;
    function py(k) { return PY + 4 * k; }
    s += txt(PX + PW / 2, 44, "Physical Memory", 12, C.cpu, ' font-weight="700"');
    s += box(PX, py(0), PW, py(16) - py(0), C.os, "#3b5d8f") + txt(PX + PW / 2, py(8) + 4, "OS", 11, "#3b5d8f");
    s += box(PX, py(16), PW, py(64) - py(16), "#f6f6f6", "#bbb") + txt(PX + PW / 2, py(48) + 4, "(not in use)", 10, C.muted);
    [0, 16, 26, 28, 32, 34, 36, 64].forEach(function (k) { s += txt(PX + PW + 5, py(k) + 4, k + "K", 9.5, C.muted, ' text-anchor="start"'); });
    s += during(2, D, box(PX, py(26), PW, 8, C.cL, C.c) + box(PX, py(32), PW, 8, C.aL, C.a) + box(PX, py(34), PW, 8, C.bL, C.b));
    s += during(4.5, D, txt(PX - 6, py(27) + 3, "Stack", 10, C.c, ' text-anchor="end"') + txt(PX - 6, py(33) + 3, "Code", 10, C.a, ' text-anchor="end"') + txt(PX - 6, py(35) + 3, "Heap", 10, C.b, ' text-anchor="end"'));
    // 매핑 화살표
    s += during(2, 4.5,
      '<path d="M' + (AX + AW) + ',' + ay(1) + ' C 400,' + ay(1) + ' 480,' + py(33) + ' ' + (PX - 2) + ',' + py(33) + '" fill="none" stroke="' + C.a + '" stroke-width="2" marker-end="url(#sm_arrow)"/>' +
      '<path d="M' + (AX + AW) + ',' + ay(5) + ' C 400,' + ay(5) + ' 480,' + py(35) + ' ' + (PX - 2) + ',' + py(35) + '" fill="none" stroke="' + C.b + '" stroke-width="2" marker-end="url(#sm_arrow)"/>' +
      '<path d="M' + (AX + AW) + ',' + ay(15) + ' C 400,' + ay(15) + ' 480,' + py(27) + ' ' + (PX - 2) + ',' + py(27) + '" fill="none" stroke="' + C.c + '" stroke-width="2" marker-end="url(#sm_arrow)"/>');

    // VA 4200 비트 분해
    var BY = 250;
    s += during(4.5, 9, txt(355, BY, "VA 4200 =", 12, C.cpu, ' font-weight="700"') +
      box(270, BY + 8, 34, 22, C.bL, C.b) + txt(287, BY + 24, "01", 13, C.b, ' font-weight="700"') +
      box(306, BY + 8, 150, 22, "#fff", C.b) + txt(381, BY + 24, "000001101000", 13, C.b) +
      txt(287, BY + 46, "Heap", 11, C.b) + txt(381, BY + 46, "offset 104", 11, C.b));
    s += during(7, 9, txt(365, BY + 70, "104 < 2K ✓ → 34K + 104 = 34920", 12.5, C.hw, ' font-weight="700"'));
    s += token("M" + (AX + AW) + "," + (ay(4) + 2) + " Q 380,-60 " + (PX - 4) + "," + (py(34) + 2), 7, 9, "34920", C.b);

    // VA 15KB
    s += during(9, D, txt(355, BY, "VA 15KB =", 12, C.cpu, ' font-weight="700"') +
      box(270, BY + 8, 34, 22, C.cL, C.c) + txt(287, BY + 24, "11", 13, C.c, ' font-weight="700"') +
      box(306, BY + 8, 150, 22, "#fff", C.c) + txt(381, BY + 24, "110000000000", 13, C.c) +
      txt(287, BY + 46, "Stack", 11, C.c) + txt(381, BY + 46, "offset 3072 − 4096 = −1024", 11, C.c));
    s += during(11.5, D, txt(365, BY + 70, "|−1024| ≤ 2K ✓ → 28K − 1K = 27KB", 12.5, C.hw, ' font-weight="700"'));
    s += token("M" + (AX + AW) + "," + (ay(15)) + " Q 380,-50 " + (PX - 4) + "," + (py(27)), 11.5, D, "27KB", C.c);

    return s + '</svg>';
  }
};
