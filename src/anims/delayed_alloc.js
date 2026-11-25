// delayed_alloc — 21강 p.23: 두 파일 A, B 를 번갈아 write 하고 임시 파일 T 를 만들었다 지운다.
//   위(write 때 바로 할당): 디스크에 A B A B T A B 가 섞이고 T 자리가 구멍으로 남는다 (할당 7 번).
//   아래(delayed allocation): page cache 에 모았다가 flush 때 A 3 블록, B 3 블록을 각각 한 번에 이어서 잡는다. T 는 할당조차 안 한다.
window.ANIMS = window.ANIMS || {};
ANIMS["delayed_alloc"] = {
  title: "Delayed allocation: 블록 할당을 flush 때까지 미룬다",
  desc: "[[preallocation과 delayed allocation]] p.23. 할당 요청을 모으면 조각이 줄고, 금방 지운 파일은 블록을 아예 안 잡는다. 대가는 reliability.",
  duration: 14,
  build: function () {
    var D = 14;
    function r3(v) { return Math.round(v * 1000) / 1000; }
    function k(t) { return r3(Math.min(Math.max(t / D, 0), 0.996)); }
    function show(a, b) { return '<animate attributeName="opacity" values="0;0;1;1;0;0" keyTimes="0;' + k(a) + ';' + r3(k(a) + 0.003) + ';' + k(b) + ';' + r3(k(b) + 0.003) + ';1" dur="' + D + 's" fill="freeze"/>'; }
    function from(a) { return '<animate attributeName="opacity" values="0;0;1;1" keyTimes="0;' + k(a) + ';' + r3(k(a) + 0.003) + ';1" dur="' + D + 's" fill="freeze"/>'; }
    function txt(x, y, s, size, fill, extra) { return '<text x="' + x + '" y="' + y + '" font-size="' + size + '" fill="' + fill + '"' + (extra && extra.indexOf('text-anchor') >= 0 ? '' : ' text-anchor="middle"') + (extra || '') + '>' + s + '</text>'; }
    function win(a, b, inner) { return '<g opacity="0">' + inner + show(a, b) + '</g>'; }
    function on(a, inner) { return '<g opacity="0">' + inner + from(a) + '</g>'; }
    var FC = { A: ["#1d65b3", "#cfe0f5"], B: ["#2e9e4f", "#d3efda"], T: ["#a0620a", "#fdeec2"] };
    var CX0 = 170, CW = 56;
    function chip(x, y, w, h, name) { var c = FC[name.charAt(0)]; return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="4" fill="' + c[1] + '" stroke="' + c[0] + '" stroke-width="2"/>' + txt(x + w / 2, y + h / 2 + 5, name, 14, c[0], ' font-weight="700"'); }
    function strip(y) { var g = ''; for (var i = 0; i < 10; i++) g += '<rect x="' + (CX0 + i * CW) + '" y="' + y + '" width="' + CW + '" height="36" fill="#f4f4f4" stroke="#bbb"/>'; return g + txt(CX0 - 8, y + 23, "디스크", 12, "#777", ' text-anchor="end"'); }
    var seq = [["A0", 1.0], ["B0", 1.6], ["A1", 2.2], ["B1", 2.8], ["T", 3.4], ["A2", 4.0], ["B2", 4.6]];
    var s = '<svg viewBox="0 0 760 375" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="delayed allocation 비교">';
    var caps = [
      [0, 1, "파일 A 와 B 를 번갈아 write 하고, 중간에 임시 파일 T 를 만든다"],
      [1, 5.4, "위는 write() 마다 블록을 바로 잡는다. 아래는 메모리(page cache)에만 쓴다"],
      [5.4, 7.4, "T 를 지운다. 위에는 구멍이 남고, 아래는 메모리에서 지우면 끝"],
      [7.4, 9.8, "flush: 아래는 이제서야 할당한다. A 세 블록, B 세 블록을 각각 한 번에 이어서"],
      [9.8, 13.99, "대가: flush 전에 전원이 나가면 메모리에만 있던 데이터를 잃는다"]
    ];
    caps.forEach(function (c) { s += win(c[0], c[1], txt(380, 26, c[2], 15, "#222", ' font-weight="700"')); });

    // write 순서 (공통)
    s += txt(CX0 - 8, 66, "write 순서", 12, "#777", ' text-anchor="end"');
    seq.forEach(function (w, i) { s += on(w[1], chip(CX0 + i * 62, 48, 54, 26, w[0])); });
    s += on(5.5, '<rect x="' + (CX0 + 7 * 62) + '" y="48" width="70" height="26" rx="4" fill="#ffd9d9" stroke="#d6465f" stroke-width="2"/>' + txt(CX0 + 7 * 62 + 35, 66, "rm T", 14, "#a52f2f", ' font-weight="700"'));

    // ===== 위: 바로 할당 =====
    var YA = 112;
    s += txt(20, YA - 8, "write() 때 바로 할당", 14, "#d6465f", ' text-anchor="start" font-weight="700"');
    s += strip(YA);
    seq.forEach(function (w, i) {
      var c = chip(CX0 + i * CW + 3, YA + 3, CW - 6, 30, w[0]);
      if (w[0] === "T") s += win(w[1] + 0.2, 5.6, c);
      else s += on(w[1] + 0.2, c);
    });
    s += on(5.6, txt(CX0 + 4 * CW + CW / 2, YA + 23, "구멍", 13, "#d6465f", ' font-weight="700"'));
    s += on(5.9, '<path d="M' + (CX0 + 0.5 * CW) + ',' + (YA + 40) + ' Q' + (CX0 + 1.5 * CW) + ',' + (YA + 56) + ' ' + (CX0 + 2.5 * CW) + ',' + (YA + 40) + ' Q' + (CX0 + 4 * CW) + ',' + (YA + 60) + ' ' + (CX0 + 5.5 * CW) + ',' + (YA + 40) + '" fill="none" stroke="#1d65b3" stroke-width="2" stroke-dasharray="5 3"/>' +
      txt(CX0 + 3 * CW, YA + 70, "A 를 읽으려면 세 군데를 오간다", 12, "#1d65b3", ' font-weight="700"'));
    s += on(4.8, txt(CX0 + 10 * CW - 4, YA - 8, "할당 7 번", 13, "#d6465f", ' text-anchor="end" font-weight="700"'));

    // ===== 아래: delayed allocation =====
    var YM = 214, YB = 284;
    s += '<line x1="20" y1="' + (YM - 28) + '" x2="740" y2="' + (YM - 28) + '" stroke="#ccc" stroke-dasharray="4 4"/>';
    s += txt(20, YM - 8, "delayed allocation", 14, "#1d65b3", ' text-anchor="start" font-weight="700"');
    s += '<rect x="' + CX0 + '" y="' + YM + '" width="' + 10 * CW + '" height="40" rx="6" fill="#fffaf0" stroke="#e09a40" stroke-dasharray="6 4"/>' + txt(CX0 - 8, YM + 25, "메모리", 12, "#777", ' text-anchor="end"');
    seq.forEach(function (w, i) {
      var c = chip(CX0 + i * CW + 5, YM + 6, CW - 10, 28, w[0]);
      s += win(w[1] + 0.2, w[0] === "T" ? 5.6 : 7.6, c);
    });
    s += strip(YB);
    var order = ["A0", "A1", "A2", "B0", "B1", "B2"];
    order.forEach(function (n, i) { s += on(i < 3 ? 8.0 : 8.8, chip(CX0 + i * CW + 3, YB + 3, CW - 6, 30, n)); });
    s += on(8.0, '<rect x="' + (CX0 + 1) + '" y="' + (YB - 2) + '" width="' + (3 * CW - 2) + '" height="40" fill="none" stroke="#1d65b3" stroke-width="3"/>');
    s += on(8.8, '<rect x="' + (CX0 + 3 * CW + 1) + '" y="' + (YB - 2) + '" width="' + (3 * CW - 2) + '" height="40" fill="none" stroke="#2e9e4f" stroke-width="3"/>');
    s += on(7.4, '<path d="M' + (CX0 + 5 * CW) + ',' + (YM + 42) + ' L' + (CX0 + 5 * CW) + ',' + (YB - 4) + '" stroke="#e09a40" stroke-width="3"/>' + txt(CX0 + 5 * CW + 8, YM + 58, "flush", 12, "#e09a40", ' text-anchor="start" font-weight="700"'));
    s += on(9.0, txt(CX0 + 10 * CW - 4, YM - 8, "할당 요청 2 번", 13, "#1d65b3", ' text-anchor="end" font-weight="700"'));
    s += on(9.2, txt(CX0 + 7 * CW + 14, YB + 23, "T 는 할당 안 함", 12, "#a0620a", ' text-anchor="start" font-weight="700"'));
    // 대가
    s += on(9.8, '<rect x="' + CX0 + '" y="' + YM + '" width="' + 10 * CW + '" height="40" rx="6" fill="#ffd9d9" stroke="#d6465f"/>' + txt(CX0 + 5 * CW, YM + 25, "⚡ flush 전에 꺼졌다면? 여기 있던 A·B 가 사라진다", 13, "#a52f2f", ' font-weight="700"'));

    s += txt(380, 362, "“trade-off between performance and reliability”: throughput 30% ↑, CPU 50% ↓ (p.23)", 12.5, "#777");
    return s + '</svg>';
  }
};
