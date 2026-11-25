// cwd_relative_path — 19강 p.6: 절대 경로 /home/dgist/file1 은 root 에서, 상대 경로 dgist/file1 은 working directory(/home)에서 출발해
//   같은 file1 에 닿는다. chdir("/") 로 출발점이 바뀌면 같은 상대 경로가 /dgist 를 찾다가 실패한다.
window.ANIMS = window.ANIMS || {};
ANIMS["cwd_relative_path"] = {
  title: "절대 경로와 상대 경로: 출발점이 다르다",
  desc: "[[경로와 working directory]] p.6 트리. 절대 경로는 / 에서, 상대 경로는 프로세스의 working directory 에서 이름을 하나씩 따라간다.",
  duration: 13,
  build: function () {
    var D = 13;
    function r3(v) { return Math.round(v * 1000) / 1000; }
    function k(t) { return r3(Math.min(Math.max(t / D, 0), 0.996)); }
    function show(a, b) { return '<animate attributeName="opacity" values="0;0;1;1;0;0" keyTimes="0;' + k(a) + ';' + r3(k(a) + 0.003) + ';' + k(b) + ';' + r3(k(b) + 0.003) + ';1" dur="' + D + 's" fill="freeze"/>'; }
    function from(a) { return '<animate attributeName="opacity" values="0;0;1;1" keyTimes="0;' + k(a) + ';' + r3(k(a) + 0.003) + ';1" dur="' + D + 's" fill="freeze"/>'; }
    function txt(x, y, s, size, fill, extra) { return '<text x="' + x + '" y="' + y + '" font-size="' + size + '" fill="' + fill + '"' + (extra && extra.indexOf('text-anchor') >= 0 ? '' : ' text-anchor="middle"') + (extra || '') + '>' + s + '</text>'; }
    function win(a, b, inner) { return '<g opacity="0">' + inner + show(a, b) + '</g>'; }
    function on(a, inner) { return '<g opacity="0">' + inner + from(a) + '</g>'; }
    var C = { a: "#1d65b3", aL: "#dbe8f7", b: "#2e9e4f", bL: "#dff3e4", hw: "#d6465f", cpu: "#3b2f4a", cpuL: "#efe9f6", muted: "#777", or: "#e09a40" };
    var N = {
      root: [250, 78, "/"], home: [250, 148, "home"], dgist: [170, 218, "dgist"], cor: [330, 218, "coruslab"],
      f1: [120, 288, "file1"], f2: [220, 288, "file2"]
    };
    var edges = [["root", "home"], ["home", "dgist"], ["home", "cor"], ["dgist", "f1"], ["dgist", "f2"]];
    var s = '<svg viewBox="0 0 760 360" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="절대 경로와 상대 경로 탐색">';
    var caps = [
      [0, 1, "셸 프로세스의 working directory 는 /home 이다"],
      [1, 4.6, "절대 경로 /home/dgist/file1: root(/) 에서 출발해 이름을 하나씩 따라간다"],
      [4.6, 8, "상대 경로 dgist/file1: working directory(home) 에서 출발한다. 같은 file1"],
      [8, 9.2, "chdir(“/”): 이 프로세스의 working directory 를 / 로 바꾼다"],
      [9.2, 11.8, "같은 dgist/file1 이 이제는 / 에서 dgist 를 찾는다. 그런 이름은 없다"],
      [11.8, 12.99, "상대 경로의 뜻은 출발점(working directory)에 따라 바뀐다"]
    ];
    caps.forEach(function (c) { s += win(c[0], c[1], txt(380, 26, c[2], 15, "#222", ' font-weight="700"')); });

    // 트리
    edges.forEach(function (e) { var p = N[e[0]], q = N[e[1]]; s += '<line x1="' + p[0] + '" y1="' + (p[1] + 14) + '" x2="' + q[0] + '" y2="' + (q[1] - 14) + '" stroke="#999" stroke-width="2"/>'; });
    Object.keys(N).forEach(function (key) {
      var n = N[key], isFile = key === "f1" || key === "f2", w = n[2].length * 9 + 24;
      s += '<rect x="' + (n[0] - w / 2) + '" y="' + (n[1] - 14) + '" width="' + w + '" height="28" rx="' + (isFile ? 3 : 14) + '" fill="' + (isFile ? "#fff" : "#f4f4f4") + '" stroke="#555" stroke-width="1.5"/>';
      s += txt(n[0], n[1] + 5, n[2], 14, "#222", ' font-weight="700"');
    });
    // file1 도착 표시
    s += '<rect x="' + (N.f1[0] - 34) + '" y="' + (N.f1[1] - 18) + '" width="68" height="36" rx="6" fill="none" stroke="' + C.or + '" stroke-width="3" opacity="0">' + show(4, 8.2) + '</rect>';

    // "We are here" (cwd) 표시: home → / 로 이동
    s += '<g><animateTransform attributeName="transform" type="translate" values="0 0;0 0;0 -70;0 -70" keyTimes="0;' + k(8.2) + ';' + k(9) + ';1" dur="' + D + 's" fill="freeze"/>';
    s += '<path d="M' + (N.home[0] + 44) + ',' + N.home[1] + ' L' + (N.home[0] + 64) + ',' + (N.home[1] - 8) + ' L' + (N.home[0] + 64) + ',' + (N.home[1] + 8) + ' Z" fill="' + C.b + '"/>';
    s += '<rect x="' + (N.home[0] + 64) + '" y="' + (N.home[1] - 12) + '" width="104" height="24" rx="5" fill="' + C.bL + '" stroke="' + C.b + '"/>';
    s += txt(N.home[0] + 116, N.home[1] + 5, "We are here", 13, C.b, ' font-weight="700"') + '</g>';

    // 움직이는 토큰
    function at(key) { return N[key][0] + ',' + N[key][1]; }
    function token(pathKeys, t0, dt, color, tEnd) {
      var d = 'M' + pathKeys.map(at).join(' L');
      return '<circle r="9" fill="' + color + '" opacity="0" stroke="#fff" stroke-width="2"><animateMotion begin="' + t0 + 's" dur="' + dt + 's" fill="freeze" path="' + d + '"/>' + show(t0, tEnd) + '</circle>';
    }
    s += token(["root", "home", "dgist", "f1"], 1.2, 2.8, C.a, 4.6);
    s += token(["home", "dgist", "f1"], 4.8, 2.0, C.b, 8);
    // 실패: / 에서 dgist 를 찾다가 ✗
    s += '<circle r="9" fill="' + C.hw + '" opacity="0" stroke="#fff" stroke-width="2"><animateMotion begin="9.4s" dur="1s" fill="freeze" path="M' + at("root") + ' L' + (N.root[0] - 60) + ',' + (N.root[1] + 40) + '"/>' + show(9.4, 11.99) + '</circle>';
    s += on(10.4, txt(N.root[0] - 78, N.root[1] + 70, "✗ dgist 없음", 14, C.hw, ' font-weight="700"'));

    // ===== 오른쪽 패널 =====
    s += '<rect x="440" y="56" width="300" height="74" rx="8" fill="' + C.cpuL + '" stroke="' + C.cpu + '" stroke-width="2"/>';
    s += txt(590, 80, "셸 프로세스 (PCB 의 cwd)", 13, C.cpu, ' font-weight="700"');
    s += win(0, 8.6, txt(590, 112, "cwd = /home", 18, C.b, ' font-weight="700" font-family="monospace"'));
    s += on(8.6, txt(590, 112, "cwd = /", 18, C.b, ' font-weight="700" font-family="monospace"'));
    // 경로 칩: [이름, 방문 시각]
    function chips(y, title, color, items, a, b) {
      var g = txt(450, y - 12, title, 13, color, ' font-weight="700" text-anchor="start"');
      var x = 450;
      items.forEach(function (it) {
        var w = it[0].length * 11 + 18;
        g += '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="30" rx="5" fill="#fff" stroke="#999"/>';
        g += '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="30" rx="5" fill="' + it[2] + '" opacity="0">' + from(it[1]) + '</rect>';
        g += txt(x + w / 2, y + 21, it[0], 15, "#222", ' font-weight="700" font-family="monospace"');
        x += w + 6;
      });
      return win(a, b, g);
    }
    s += chips(170, "절대 경로", C.a, [["/", 1.2, C.aL], ["home", 2.1, C.aL], ["dgist", 3.0, C.aL], ["file1", 4.0, C.aL]], 1, 12.99);
    s += chips(240, "상대 경로 (cwd = /home 일 때)", C.b, [["dgist", 5.8, C.bL], ["file1", 6.8, C.bL]], 4.6, 8.4);
    s += chips(240, "상대 경로 (cwd = / 일 때)", C.hw, [["dgist", 10.4, "#ffd9d9"], ["file1", 99, "#fff"]], 9.2, 12.99);
    s += on(7, txt(590, 300, "→ 둘 다 /home/dgist/file1", 14, C.or, ' font-weight="700"'));
    s += '<rect x="440" y="286" width="300" height="24" fill="#fff" opacity="0">' + from(9.2) + '</rect>';
    s += on(10.6, txt(590, 300, "→ /dgist/file1 을 찾음: 실패", 14, C.hw, ' font-weight="700"'));

    s += txt(380, 348, "절대 경로는 / 로 시작해 어디서 써도 같고, 상대 경로는 working directory 에서 출발한다", 13, C.muted);
    return s + '</svg>';
  }
};
