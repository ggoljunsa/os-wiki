// atomic_rename — 19강 p.24: 파일 내용을 안전하게 통째로 바꾸는 순서. tmp 에 쓰고 → fsync → close → rename.
//   어느 줄에서 전원이 나가도 foo.txt 는 옛 내용이거나 새 내용이다 (아래 배너).
window.ANIMS = window.ANIMS || {};
ANIMS["atomic_rename"] = {
  title: "tmp 에 쓰고 fsync 한 뒤 rename: foo.txt 는 옛것 아니면 새것",
  desc: "[[rename과 atomic update]] p.24 코드 다섯 줄. 디렉터리 엔트리, inode, 메모리와 디스크가 줄마다 어떻게 바뀌는지 본다.",
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
    var C = { old: "#777", oldL: "#eeeeee", nw: "#2e9e4f", nwL: "#dff3e4", hw: "#d6465f", cpu: "#3b2f4a", cpuL: "#efe9f6", dir: "#1d65b3", dirL: "#dbe8f7", or: "#e09a40", orL: "#fdeec2", muted: "#777" };
    var s = '<svg viewBox="0 0 760 370" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="rename 으로 파일을 atomic 하게 바꾸기">';
    var caps = [
      [0, 1, "foo.txt 를 새 내용으로 바꾸고 싶다. 지금은 옛 내용"],
      [1, 3, "① 다른 이름 foo.txt.tmp 로 새 파일을 만든다. foo.txt 는 그대로"],
      [3, 5, "② write: 새 내용은 아직 메모리(버퍼)에만 있다"],
      [5, 7, "③ fsync: 새 내용을 디스크에 실제로 내려보낸다"],
      [7, 8.2, "④ close. 아직 foo.txt 는 옛 내용을 가리킨다"],
      [8.2, 10.6, "⑤ rename: 엔트리 foo.txt 가 한 번에 새 inode 를 가리킨다 (atomic)"],
      [10.6, 13.99, "이름을 잃은 옛 inode 는 지워진다. 어느 순간 꺼졌어도 옛것 아니면 새것"]
    ];
    caps.forEach(function (c) { s += win(c[0], c[1], txt(380, 26, c[2], 15, "#222", ' font-weight="700"')); });

    // ===== 코드 =====
    var code = [
      ["fd = open(\"foo.txt.tmp\", …O_CREAT…);", 1, 3],
      ["write(fd, buffer, size);", 3, 5],
      ["fsync(fd);", 5, 7],
      ["close(fd);", 7, 8.2],
      ["rename(\"foo.txt.tmp\", \"foo.txt\");", 8.2, 10.6]
    ];
    s += '<rect x="20" y="48" width="330" height="168" rx="8" fill="' + C.cpuL + '" stroke="' + C.cpu + '" stroke-width="2"/>';
    code.forEach(function (c, i) {
      var y = 76 + i * 30;
      s += '<rect x="28" y="' + (y - 18) + '" width="314" height="26" rx="4" fill="' + C.orL + '" opacity="0">' + show(c[1], c[2]) + '</rect>';
      s += txt(40, y, ["①", "②", "③", "④", "⑤"][i], 13, C.cpu, ' text-anchor="start" font-weight="700"');
      s += '<text x="60" y="' + y + '" font-size="12.5" fill="#222" font-family="monospace">' + c[0] + '</text>';
    });

    // ===== 디렉터리 엔트리 =====
    s += '<rect x="20" y="230" width="330" height="96" rx="8" fill="' + C.dirL + '" stroke="' + C.dir + '" stroke-width="2"/>';
    s += txt(185, 250, "디렉터리 엔트리 (이름 → inode)", 13, C.dir, ' font-weight="700"');
    // foo.txt → X (옛) … rename 후 → Y
    s += '<rect x="36" y="260" width="298" height="26" rx="4" fill="#fff" stroke="#9bb3d6"/>';
    s += '<text x="48" y="278" font-size="14" fill="#222" font-family="monospace">foo.txt</text>';
    s += win(0, 9, txt(250, 278, "→ inode X", 14, C.old, ' font-weight="700"'));
    s += on(9, '<rect x="36" y="260" width="298" height="26" rx="4" fill="' + C.nwL + '" stroke="' + C.nw + '" stroke-width="2"/>' +
      '<text x="48" y="278" font-size="14" fill="#222" font-family="monospace">foo.txt</text>' + txt(250, 278, "→ inode Y", 14, C.nw, ' font-weight="700"'));
    // tmp 엔트리: 1.4 에 생기고 9 에 사라짐
    s += win(1.4, 9, '<rect x="36" y="292" width="298" height="26" rx="4" fill="#fff" stroke="#9bb3d6"/>' +
      '<text x="48" y="310" font-size="14" fill="#222" font-family="monospace">foo.txt.tmp</text>' + txt(270, 310, "→ inode Y", 14, C.nw, ' font-weight="700"'));

    // ===== inode / 메모리 / 디스크 =====
    s += txt(560, 60, "메모리 (버퍼)", 13, C.or, ' font-weight="700"');
    s += '<rect x="390" y="68" width="350" height="62" rx="8" fill="none" stroke="' + C.or + '" stroke-width="2" stroke-dasharray="6 4"/>';
    s += win(3.4, 13.99, '<rect x="590" y="78" width="130" height="42" rx="6" fill="' + C.orL + '" stroke="' + C.or + '"/>' + txt(655, 104, "Y: 새 내용", 14, "#8a6000", ' font-weight="700"'));
    s += txt(560, 152, "디스크", 13, C.cpu, ' font-weight="700"');
    s += '<rect x="390" y="160" width="350" height="110" rx="8" fill="#f4f4f4" stroke="#555" stroke-width="2"/>';
    // inode X (옛)
    s += '<g><rect x="410" y="176" width="130" height="78" rx="6" fill="' + C.oldL + '" stroke="' + C.old + '" stroke-width="2"/>' +
      txt(475, 200, "inode X", 14, "#444", ' font-weight="700"') + txt(475, 226, "옛 내용", 14, "#444") +
      '<animate attributeName="opacity" values="1;1;0.25;0.25" keyTimes="0;' + k(10.6) + ';' + k(11.2) + ';1" dur="' + D + 's" fill="freeze"/></g>';
    s += on(10.8, txt(475, 246, "이름 없음 → 해제", 12, C.hw, ' font-weight="700"'));
    // inode Y
    s += on(1.4, '<rect x="590" y="176" width="130" height="78" rx="6" fill="#fff" stroke="' + C.nw + '" stroke-width="2" stroke-dasharray="4 3"/>' + txt(655, 200, "inode Y", 14, C.nw, ' font-weight="700"'));
    s += win(1.4, 6.6, txt(655, 228, "(비어 있음)", 12, C.muted));
    s += on(6.6, '<rect x="590" y="176" width="130" height="78" rx="6" fill="' + C.nwL + '" stroke="' + C.nw + '" stroke-width="2"/>' + txt(655, 200, "inode Y", 14, C.nw, ' font-weight="700"') + txt(655, 228, "새 내용", 14, C.nw, ' font-weight="700"'));
    // fsync 이동
    s += '<g opacity="0"><rect x="-40" y="-12" width="80" height="24" rx="5" fill="' + C.or + '"/>' + txt(0, 5, "새 내용", 12, "#fff", ' font-weight="700"') +
      '<animateMotion begin="5.4s" dur="1.2s" fill="freeze" path="M655,99 L655,215"/>' + show(5.4, 6.6) + '</g>';

    // ===== 전원이 나가면 배너 =====
    s += '<rect x="390" y="284" width="350" height="44" rx="8" fill="#fff" stroke="' + C.hw + '" stroke-width="2"/>';
    s += txt(410, 302, "⚡ 지금 전원이 나가면 foo.txt 는", 12, C.hw, ' text-anchor="start" font-weight="700"');
    s += win(0, 9, txt(565, 321, "옛 내용" + "", 15, "#444", ' font-weight="700"'));
    s += win(1.4, 9, txt(680, 321, "(+ tmp 쓰레기)", 11, C.muted));
    s += on(9, txt(565, 321, "새 내용", 15, C.nw, ' font-weight="700"'));

    s += txt(380, 356, "fsync 가 빠지면 rename 뒤에 새 내용이 디스크에 없을 수 있다. 그래서 ③ 이 꼭 있어야 한다", 13, C.muted);
    return s + '</svg>';
  }
};
