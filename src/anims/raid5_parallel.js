// raid5_parallel — 18강 p.48·p.50: "A1 and B2 are written at the same time".
//   RAID 4 는 Ap·Bp 가 둘 다 Disk 3 이라 Disk 3 앞에서 줄을 서고(2 단위), RAID 5 는 parity 가 줄마다 다른 디스크라 네 디스크가 한 번에 끝낸다(1 단위).
window.ANIMS = window.ANIMS || {};
ANIMS["raid5_parallel"] = {
  title: "A1 과 B2 를 동시에 쓰기: RAID 4 의 parity 병목과 RAID 5",
  desc: "[[RAID 5와 RAID 6]] p.50 의 예. 데이터 블록 쓰기마다 그 줄의 parity 도 써야 한다. parity 가 한 디스크에 몰려 있으면 거기서 줄을 선다.",
  duration: 12,
  build: function () {
    var D = 12;
    function r3(v) { return Math.round(v * 1000) / 1000; }
    function k(t) { return r3(Math.min(Math.max(t / D, 0), 0.996)); }
    function show(a, b) { return '<animate attributeName="opacity" values="0;0;1;1;0;0" keyTimes="0;' + k(a) + ';' + r3(k(a) + 0.003) + ';' + k(b) + ';' + r3(k(b) + 0.003) + ';1" dur="' + D + 's" fill="freeze"/>'; }
    function from(a) { return '<animate attributeName="opacity" values="0;0;1;1" keyTimes="0;' + k(a) + ';' + r3(k(a) + 0.003) + ';1" dur="' + D + 's" fill="freeze"/>'; }
    function txt(x, y, s, size, fill, extra) { return '<text x="' + x + '" y="' + y + '" font-size="' + size + '" fill="' + fill + '"' + (extra && extra.indexOf('text-anchor') >= 0 ? '' : ' text-anchor="middle"') + (extra || '') + '>' + s + '</text>'; }
    function win(a, b, inner) { return '<g opacity="0">' + inner + show(a, b) + '</g>'; }
    function on(a, inner) { return '<g opacity="0">' + inner + from(a) + '</g>'; }
    var C = { a: "#1d65b3", hw: "#d6465f", ok: "#2e9e4f", cpu: "#3b2f4a", muted: "#777", or: "#e09a40" };
    var rowFill = ["#f3d27a", "#eef08a", "#aee88a", "#86c8ee"];
    var DX = [190, 330, 470, 610], CW = 110, CH = 22;
    var L4 = [["A1", "A2", "A3", "Ap"], ["B1", "B2", "B3", "Bp"], ["C1", "C2", "C3", "Cp"], ["D1", "D2", "D3", "Dp"]];
    var L5 = [["A1", "A2", "A3", "Ap"], ["B1", "B2", "Bp", "B3"], ["C1", "Cp", "C2", "C3"], ["Dp", "D1", "D2", "D3"]];
    function lane(y0, title, layout, color) {
      var g = txt(90, y0 + 30, title, 16, color, ' font-weight="700"');
      for (var d = 0; d < 4; d++) {
        g += txt(DX[d] + CW / 2, y0 + 12, "Disk " + d, 12, "#444", ' font-weight="700"');
        for (var r = 0; r < 4; r++) {
          var x = DX[d], y = y0 + 20 + r * CH, lab = layout[r][d], isP = lab.charAt(1) === "p";
          g += '<rect x="' + x + '" y="' + y + '" width="' + CW + '" height="' + CH + '" fill="' + rowFill[r] + '" stroke="#555"/>';
          g += txt(x + CW / 2, y + 16, isP ? lab.charAt(0) + "<tspan font-size=\"10\" dy=\"3\">p</tspan>" : lab, 14, "#222", isP ? ' font-weight="700"' : '');
        }
      }
      return g;
    }
    function cellRect(y0, d, r) { return { x: DX[d], y: y0 + 20 + r * CH }; }
    // 쓰기 중 표시: 빨간 테두리가 깜빡임
    function writing(y0, d, r, a, b) {
      var c = cellRect(y0, d, r);
      return '<rect x="' + (c.x + 2) + '" y="' + (c.y + 2) + '" width="' + (CW - 4) + '" height="' + (CH - 4) + '" fill="none" stroke="' + C.hw + '" stroke-width="4" opacity="0">' +
        '<animate attributeName="opacity" values="0;0;1;0.3;1;0.3;1;0;0" keyTimes="0;' + k(a) + ';' + r3(k(a) + 0.003) + ';' + k(a + (b - a) * 0.25) + ';' + k(a + (b - a) * 0.5) + ';' + k(a + (b - a) * 0.75) + ';' + k(b - 0.05) + ';' + k(b) + ';1" dur="' + D + 's" fill="freeze"/></rect>';
    }
    function doneMark(y0, d, r, t) {
      var c = cellRect(y0, d, r);
      return on(t, txt(c.x + CW - 10, c.y + 17, "✓", 14, C.ok, ' font-weight="700"'));
    }
    var Y4 = 52, Y5 = 200;
    var s = '<svg viewBox="0 0 760 380" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="RAID 4 와 RAID 5 에서 동시 쓰기">';
    var caps = [
      [0, 1.3, "요청 두 개: A1 과 B2 를 동시에 쓴다. 각 줄의 parity 도 같이 써야 한다"],
      [1.3, 4, "1 단위: RAID 4 는 Ap 와 Bp 가 둘 다 Disk 3 이라 하나만 쓴다. RAID 5 는 네 디스크가 다 쓴다"],
      [4, 6.7, "2 단위: RAID 4 는 그제야 Bp 를 쓴다. RAID 5 는 이미 끝났다"],
      [6.7, 11.99, "parity 디스크가 병목이 아니다 (“a parity disk is not a bottleneck”)"]
    ];
    caps.forEach(function (c) { s += win(c[0], c[1], txt(380, 26, c[2], c[2].length > 46 ? 13.5 : 15, "#222", ' font-weight="700"')); });

    s += lane(Y4, "RAID 4", L4, C.or);
    s += lane(Y5, "RAID 5", L5, C.a);
    s += txt(90, Y4 + 52, "parity 전용 디스크", 12, C.muted);
    s += txt(90, Y5 + 52, "parity 를 줄마다 돌림", 12, C.muted);
    s += '<line x1="20" y1="' + (Y5 - 6) + '" x2="740" y2="' + (Y5 - 6) + '" stroke="#ccc" stroke-dasharray="4 4"/>';

    // RAID 4: 1 단위(1.3~4): A1(D0), B2(D1), Ap(D3) / 2 단위(4~6.7): Bp(D3)
    s += writing(Y4, 0, 0, 1.3, 4) + writing(Y4, 1, 1, 1.3, 4) + writing(Y4, 3, 0, 1.3, 4) + writing(Y4, 3, 1, 4, 6.7);
    s += doneMark(Y4, 0, 0, 4) + doneMark(Y4, 1, 1, 4) + doneMark(Y4, 3, 0, 4) + doneMark(Y4, 3, 1, 6.7);
    var bp = cellRect(Y4, 3, 1);
    s += win(1.3, 4, '<rect x="' + (bp.x + CW + 2) + '" y="' + (bp.y + 2) + '" width="36" height="20" rx="4" fill="#ffd9d9"/>' + txt(bp.x + CW + 20,bp.y + 16, "대기", 12, "#a52f2f", ' font-weight="700"'));
    // RAID 5: 1 단위에 네 개 다
    s += writing(Y5, 0, 0, 1.3, 4) + writing(Y5, 3, 0, 1.3, 4) + writing(Y5, 1, 1, 1.3, 4) + writing(Y5, 2, 1, 1.3, 4);
    s += doneMark(Y5, 0, 0, 4) + doneMark(Y5, 3, 0, 4) + doneMark(Y5, 1, 1, 4) + doneMark(Y5, 2, 1, 4);

    // 시간 막대
    function bar(y, tEnd, label, color) {
      var g = '<rect x="190" y="' + y + '" width="530" height="12" fill="#eee"/>';
      g += '<rect x="190" y="' + y + '" width="0" height="12" fill="' + color + '"><animate attributeName="width" values="0;0;' + ((tEnd - 1.3) / 5.4 * 530) + ';' + ((tEnd - 1.3) / 5.4 * 530) + '" keyTimes="0;' + k(1.3) + ';' + k(tEnd) + ';1" dur="' + D + 's" fill="freeze"/></rect>';
      g += '<line x1="455" y1="' + (y - 3) + '" x2="455" y2="' + (y + 15) + '" stroke="#555"/>';
      g += on(tEnd, txt(90, y + 11, label, 14, color, ' font-weight="700"'));
      return g;
    }
    s += bar(Y4 + 116, 6.7, "2 단위", C.or);
    s += bar(Y5 + 116, 4, "1 단위", C.a);
    s += txt(322, Y5 + 146, "1 단위", 11, C.muted) + txt(588, Y5 + 146, "2 단위", 11, C.muted);

    s += txt(380, 373, "RAID 5 는 parity 를 흩어 놓아 서로 다른 줄의 쓰기를 동시에 한다. 작은 random 쓰기가 빨라진다", 12.5, C.muted);
    return s + '</svg>';
  }
};
