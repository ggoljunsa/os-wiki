// raid4_parity — 18강 p.48~49: RAID 4 의 parity 디스크. 같은 줄의 101, 010, 011 을 bit 마다 XOR 해 parity 100 을 만들고,
//   Disk 1 이 고장 나면 남은 101, 011, 100 을 bit 마다 XOR 해 010 을 되살린다.
window.ANIMS = window.ANIMS || {};
ANIMS["raid4_parity"] = {
  title: "RAID 4 parity: XOR 로 만들고 XOR 로 되살린다",
  desc: "[[RAID 4와 parity]] p.49 숫자 그대로. XOR(101, 010, 011) = 100, Disk 1 이 고장 나면 XOR(101, 011, 100) = 010.",
  duration: 13,
  build: function () {
    var D = 13;
    function r3(v) { return Math.round(v * 1000) / 1000; }
    function k(t) { return r3(Math.min(Math.max(t / D, 0), 0.996)); }
    function show(a, b) { return '<animate attributeName="opacity" values="0;0;1;1;0;0" keyTimes="0;' + k(a) + ';' + r3(k(a) + 0.003) + ';' + k(b) + ';' + r3(k(b) + 0.003) + ';1" dur="' + D + 's" fill="freeze"/>'; }
    function from(a) { return '<animate attributeName="opacity" values="0;0;1;1" keyTimes="0;' + k(a) + ';' + r3(k(a) + 0.003) + ';1" dur="' + D + 's" fill="freeze"/>'; }
    function until(b) { return '<animate attributeName="opacity" values="1;1;0;0" keyTimes="0;' + k(b) + ';' + r3(k(b) + 0.003) + ';1" dur="' + D + 's" fill="freeze"/>'; }
    function txt(x, y, s, size, fill, extra) { return '<text x="' + x + '" y="' + y + '" font-size="' + size + '" fill="' + fill + '"' + (extra && extra.indexOf('text-anchor') >= 0 ? '' : ' text-anchor="middle"') + (extra || '') + '>' + s + '</text>'; }
    function win(a, b, inner) { return '<g opacity="0">' + inner + show(a, b) + '</g>'; }
    function on(a, inner) { return '<g opacity="0">' + inner + from(a) + '</g>'; }
    var C = { a: "#1d65b3", aL: "#dbe8f7", p: "#e09a40", pL: "#fdeec2", hw: "#d6465f", ok: "#2e9e4f", okL: "#dff3e4", cpu: "#3b2f4a", muted: "#777" };
    var data = ["101", "010", "011"], par = "100";
    var DX = [40, 220, 400, 580], W = 140;
    function cellX(d, i) { return DX[d] + 20 + i * 34; }
    var s = '<svg viewBox="0 0 760 360" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="RAID 4 parity 계산과 복구">';
    var caps = [
      [0, 1.2, "RAID 4: 데이터 디스크 3개 + parity 전용 디스크 1개 (Disk 3)"],
      [1.2, 6, "parity 만들기: 같은 자리 bit 를 XOR 한다. 1 이 홀수 개면 1"],
      [6, 7.2, "Disk 1 고장! 010 이 사라졌다"],
      [7.2, 11.8, "복구: 살아 있는 Disk 0, 2, 3 을 같은 방법으로 XOR 하면 빠진 값이 나온다"],
      [11.8, 12.99, "XOR(101, 011, 100) = 010. 디스크 하나까지는 되살릴 수 있다"]
    ];
    caps.forEach(function (c) { s += win(c[0], c[1], txt(380, 26, c[2], 15, "#222", ' font-weight="700"')); });

    // 디스크 4개
    for (var d = 0; d < 4; d++) {
      var isP = d === 3, x = DX[d];
      s += '<rect x="' + x + '" y="52" width="' + W + '" height="128" rx="10" fill="' + (isP ? C.pL : C.aL) + '" stroke="' + (isP ? C.p : C.a) + '" stroke-width="2"/>';
      s += txt(x + W / 2, 76, "Disk " + d + (isP ? " (parity)" : ""), 14, isP ? "#8a6000" : C.a, ' font-weight="700"');
      for (var i = 0; i < 3; i++) {
        var cx = cellX(d, i);
        s += '<rect x="' + cx + '" y="94" width="32" height="44" rx="4" fill="#fff" stroke="#999"/>';
      }
    }
    // 데이터 bit
    for (d = 0; d < 3; d++) {
      for (i = 0; i < 3; i++) {
        var bit = txt(cellX(d, i) + 16, 125, data[d][i], 24, "#222", ' font-weight="700" font-family="monospace"');
        s += d === 1 ? '<g>' + bit + until(6.2) + '</g>' : bit;
      }
    }
    // parity bit 가 하나씩 생긴다 (bit i: 1.2 + 1.6i ~ )
    var tCalc = [1.2, 2.8, 4.4];
    for (i = 0; i < 3; i++) s += on(tCalc[i] + 1.1, txt(cellX(3, i) + 16, 125, par[i], 24, "#8a6000", ' font-weight="700" font-family="monospace"'));
    // 고장
    s += on(6.2, '<rect x="' + DX[1] + '" y="52" width="' + W + '" height="128" rx="10" fill="#555" opacity="0.5"/>' +
      '<path d="M' + (DX[1] + 30) + ',70 L' + (DX[1] + 110) + ',165 M' + (DX[1] + 110) + ',70 L' + (DX[1] + 30) + ',165" stroke="' + C.hw + '" stroke-width="8" stroke-linecap="round"/>');
    s += on(6.2, txt(DX[1] + W / 2, 200, "???", 16, C.hw, ' font-weight="700"'));
    // 복구 칸 (Disk 1 아래)
    s += on(7.2, '<rect x="' + DX[1] + '" y="210" width="' + W + '" height="60" rx="10" fill="' + C.okL + '" stroke="' + C.ok + '" stroke-width="2"/>' + txt(DX[1] + W / 2, 228, "새 디스크 (복구)", 12, C.ok, ' font-weight="700"'));
    var rec = "010", tRec = [7.2, 8.7, 10.2];
    for (i = 0; i < 3; i++) s += on(tRec[i] + 1.1, txt(cellX(1, i) + 16, 260, rec[i], 22, C.ok, ' font-weight="700" font-family="monospace"'));

    // 열 강조 + 계산식
    function hl(dlist, i, a, b, color) {
      var g = '';
      dlist.forEach(function (dd) { g += '<rect x="' + (cellX(dd, i) - 3) + '" y="91" width="38" height="50" rx="6" fill="none" stroke="' + color + '" stroke-width="3"/>'; });
      return win(a, b, g);
    }
    for (i = 0; i < 3; i++) {
      var bits = [data[0][i], data[1][i], data[2][i]];
      s += hl([0, 1, 2, 3], i, tCalc[i], tCalc[i] + 1.5, C.p);
      s += win(tCalc[i], tCalc[i] + 1.5, txt(380, 312, (i + 1) + "번째 bit:  " + bits.join(" ⊕ ") + "  =  " + par[i], 20, "#8a6000", ' font-weight="700" font-family="monospace"'));
      var rb = [data[0][i], data[2][i], par[i]];
      s += hl([0, 2, 3], i, tRec[i], tRec[i] + 1.5, C.ok);
      s += win(tRec[i], tRec[i] + 1.5, txt(380, 312, (i + 1) + "번째 bit:  " + rb.join(" ⊕ ") + "  =  " + rec[i], 20, C.ok, ' font-weight="700" font-family="monospace"'));
    }
    s += win(0, 1.2, txt(380, 312, "parity = XOR(Disk 0, Disk 1, Disk 2)", 18, "#8a6000", ' font-weight="700"'));
    s += win(6, 7.2, txt(380, 312, "남은 것: 101, 011, parity 100", 18, C.hw, ' font-weight="700"'));
    s += win(11.8, 12.99, txt(380, 312, "parity 100 · 복구된 Disk 1 = 010", 18, C.ok, ' font-weight="700"'));

    s += txt(380, 348, "모든 블록(parity 포함)을 XOR 하면 0 이다. 그래서 하나가 빠지면 나머지의 XOR 이 빠진 값이다", 13, C.muted);
    return s + '</svg>';
  }
};
