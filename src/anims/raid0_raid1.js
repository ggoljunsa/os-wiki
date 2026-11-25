// raid0_raid1 — 18강 p.44~47: 디스크 2개를 RAID 0(striping) 과 RAID 1(mirroring) 으로 묶어 나란히 비교.
//   쓰기(같은 시간에 RAID 0 은 블록 8개, RAID 1 은 4개) → Disk 1 고장 → RAID 0 은 데이터 손실, RAID 1 은 사본으로 버팀
//   → 배열 실패율 r = 5%, n = 2: 0.0975 vs 0.0025.
window.ANIMS = window.ANIMS || {};
ANIMS["raid0_raid1"] = {
  title: "RAID 0 과 RAID 1: 나눠 담기와 똑같이 담기",
  desc: "[[RAID 0과 RAID 1]] p.44~47. 같은 디스크 2개로 쓰기 속도, 용량, 디스크 하나가 고장 났을 때를 비교한다.",
  duration: 14,
  build: function () {
    var D = 14;
    function r3(v) { return Math.round(v * 1000) / 1000; }
    function k(t) { return r3(Math.min(Math.max(t / D, 0), 0.996)); }
    function show(a, b) { return '<animate attributeName="opacity" values="0;0;1;1;0;0" keyTimes="0;' + k(a) + ';' + r3(k(a) + 0.003) + ';' + k(b) + ';' + r3(k(b) + 0.003) + ';1" dur="' + D + 's" fill="freeze"/>'; }
    function from(a) { return '<animate attributeName="opacity" values="0;0;1;1" keyTimes="0;' + k(a) + ';' + r3(k(a) + 0.003) + ';1" dur="' + D + 's" fill="freeze"/>'; }
    function until(b) { return '<animate attributeName="opacity" values="1;1;0;0" keyTimes="0;' + k(b) + ';' + r3(k(b) + 0.003) + ';1" dur="' + D + 's" fill="freeze"/>'; }
    function txt(x, y, s, size, fill, extra) { return '<text x="' + x + '" y="' + y + '" font-size="' + size + '" fill="' + fill + '"' + (extra && extra.indexOf('text-anchor') >= 0 ? '' : ' text-anchor="middle"') + (extra || '') + '>' + s + '</text>'; }
    function win(a, b, inner) { return '<g opacity="0">' + inner + show(a, b) + '</g>'; }
    function on(a, inner) { return '<g opacity="0">' + inner + from(a) + '</g>'; }
    var C = { a: "#1d65b3", aL: "#dbe8f7", b: "#2e9e4f", bL: "#dff3e4", hw: "#d6465f", cpu: "#3b2f4a", muted: "#777", or: "#e09a40" };
    function chip(cx, cy, label, color) { return '<rect x="' + (cx - 19) + '" y="' + (cy - 11) + '" width="38" height="22" rx="4" fill="' + color + '"/>' + txt(cx, cy + 5, label, 12, "#fff", ' font-weight="700"'); }
    function mover(x1, y1, x2, y2, t0, label, color) {
      return '<g opacity="0">' + chip(0, 0, label, color) + '<animateMotion begin="' + t0 + 's" dur="0.7s" fill="freeze" path="M' + x1 + ',' + y1 + ' L' + x2 + ',' + y2 + '"/>' + show(t0, t0 + 0.72) + '</g>';
    }
    function disk(x, label) {
      var s = '<rect x="' + x + '" y="128" width="120" height="150" fill="#f4f4f4" stroke="#555"/>';
      s += '<ellipse cx="' + (x + 60) + '" cy="278" rx="60" ry="9" fill="#f4f4f4" stroke="#555"/>';
      s += '<rect x="' + (x + 1) + '" y="268" width="118" height="10" fill="#f4f4f4"/>';
      s += '<ellipse cx="' + (x + 60) + '" cy="128" rx="60" ry="9" fill="#e6e6e6" stroke="#555"/>';
      s += txt(x + 60, 298, label, 13, "#444", ' font-weight="700"');
      return s;
    }
    function slotY(row) { return 155 + row * 30; }
    var s = '<svg viewBox="0 0 760 380" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="RAID 0 과 RAID 1 비교">';
    var caps = [
      [0, 1, "같은 디스크 2개를 두 방식으로 묶는다"],
      [1, 5, "쓰기: RAID 0 은 나눠 써서 2배로 빠르고, RAID 1 은 같은 블록을 두 번 쓴다"],
      [5, 6.2, "용량: RAID 0 은 전부(1.0), RAID 1 은 절반(1/n)만 실제 용량이다"],
      [6.2, 9.4, "Disk 1 고장! RAID 0 은 블록 절반을 잃고, RAID 1 은 Disk 0 의 사본으로 버틴다"],
      [9.4, 13.99, "배열 실패율 (r = 5%, n = 2): RAID 0 은 0.0975, RAID 1 은 0.0025"]
    ];
    caps.forEach(function (c) { s += win(c[0], c[1], txt(380, 26, c[2], 15, "#222", ' font-weight="700"')); });
    s += '<line x1="380" y1="44" x2="380" y2="345" stroke="#ccc" stroke-dasharray="4 4"/>';

    // ===== 왼쪽 RAID 0 =====
    s += txt(190, 58, "RAID 0 (striping)", 15, C.a, ' font-weight="700"');
    var q0 = [];
    for (var i = 0; i < 8; i++) {
      var qx = 40 + i * 43, t = 1 + Math.floor(i / 2);
      q0.push(qx);
      s += '<g>' + chip(qx, 88, "A" + (i + 1), C.a) + until(t) + '</g>';
    }
    s += disk(40, "Disk 0") + disk(220, "Disk 1");
    for (i = 0; i < 8; i++) {
      var dx = (i % 2 === 0 ? 100 : 280), row = Math.floor(i / 2), t0 = 1 + row;
      s += mover(q0[i], 88, dx, slotY(row), t0, "A" + (i + 1), C.a);
      s += on(t0 + 0.7, chip(dx, slotY(row), "A" + (i + 1), C.a));
    }
    s += on(4.8, txt(190, 116, "4 단위 시간에 블록 8개", 12, C.a, ' font-weight="700"'));
    // ===== 오른쪽 RAID 1 =====
    s += txt(570, 58, "RAID 1 (mirroring)", 15, C.b, ' font-weight="700"');
    var q1 = [];
    for (i = 0; i < 4; i++) {
      var qx1 = 480 + i * 60;
      q1.push(qx1);
      s += '<g>' + chip(qx1, 88, "A" + (i + 1), C.b) + until(1 + i) + '</g>';
    }
    s += disk(420, "Disk 0") + disk(600, "Disk 1");
    for (i = 0; i < 4; i++) {
      var tt = 1 + i;
      s += mover(q1[i], 88, 480, slotY(i), tt, "A" + (i + 1), C.b);
      s += mover(q1[i], 88, 660, slotY(i), tt, "A" + (i + 1), C.b);
      s += on(tt + 0.7, chip(480, slotY(i), "A" + (i + 1), C.b) + chip(660, slotY(i), "A" + (i + 1), C.b));
    }
    s += on(4.8, txt(570, 116, "4 단위 시간에 블록 4개", 12, C.b, ' font-weight="700"'));
    // 용량
    s += on(5, txt(190, 318, "용량: 디스크 2개 전부", 13, "#222", ' font-weight="700"'));
    s += on(5, txt(570, 318, "용량: 디스크 1개 몫", 13, "#222", ' font-weight="700"'));

    // ===== 고장 =====
    [220, 600].forEach(function (x) {
      s += '<g opacity="0"><rect x="' + x + '" y="128" width="120" height="150" fill="#555" opacity="0.55"/>' +
        '<path d="M' + (x + 20) + ',150 L' + (x + 100) + ',260 M' + (x + 100) + ',150 L' + (x + 20) + ',260" stroke="' + C.hw + '" stroke-width="8" stroke-linecap="round"/>' + from(6.2) + '</g>';
    });
    s += on(6.8, '<rect x="30" y="306" width="320" height="20" fill="#fff"/>' + txt(190, 322, "A2·A4·A6·A8 없음 → 파일을 못 읽는다", 13, C.hw, ' font-weight="700"'));
    s += on(6.8, '<rect x="410" y="306" width="320" height="20" fill="#fff"/>' + txt(570, 322, "Disk 0 에 A1~A4 그대로 → 계속 읽힌다", 13, C.b, ' font-weight="700"'));
    s += '<rect x="78" y="140" width="44" height="120" fill="none" stroke="' + C.hw + '" stroke-width="2" stroke-dasharray="4 3" opacity="0">' + from(6.8) + '</rect>';
    s += '<rect x="458" y="140" width="44" height="120" fill="none" stroke="' + C.b + '" stroke-width="3" opacity="0">' + from(6.8) + '</rect>';
    // 실패율
    s += on(9.4, txt(190, 345, "1 − (1 − r)^n = 1 − 0.95² = 0.0975", 13, C.hw, ' font-weight="700"'));
    s += on(9.4, txt(570, 345, "r^n = 0.05² = 0.0025", 13, C.b, ' font-weight="700"'));

    s += txt(380, 372, "RAID 0 은 빠르고 크지만 하나만 고장 나도 끝(“Don’t use”), RAID 1 은 공간을 내주고 버틴다", 12, C.muted);
    return s + '</svg>';
  }
};
