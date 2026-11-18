// path_lookup — 19강 p.9~10: open("/foo/bar.txt") 가 이름 → inode 번호 → inode → 데이터 블록을 따라가는 순서.
window.ANIMS = window.ANIMS || {};
ANIMS["path_lookup"] = {
  title: "/foo/bar.txt 를 inode 따라 찾기",
  desc: "[[디렉터리]] p.10 트리에서 절대 경로 하나를 root 부터 풀어 본다. inode 번호 10·11·20 은 가정값이다.",
  duration: 13,
  build: function () {
    var D = 13;
    function r3(v) { return Math.round(v * 1000) / 1000; }
    function show(a, b) { return '<animate attributeName="opacity" values="0;0;1;1;0;0" keyTimes="0;' + r3(a / D) + ';' + r3(a / D + 0.003) + ';' + r3(b / D) + ';' + r3(Math.min(0.999, b / D + 0.003)) + ';1" dur="' + D + 's" fill="freeze"/>'; }
    var END = 12.99;
    var s = '<svg viewBox="0 0 760 360" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="경로 탐색">';
    s += '<defs><marker id="pl_arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L10 5L0 10z" fill="#1d65b3"/></marker></defs>';
    // 자막
    [[0, 1.5, 'open("/foo/bar.txt"): 경로를 / 부터 한 칸씩 따라간다'],
     [1.5, 3.5, "1. root 의 inode 번호는 미리 정해져 있다. inode 2 를 읽는다"],
     [3.5, 5.5, "2. root 디렉터리 데이터에서 이름 foo 를 찾는다 → inode 10"],
     [5.5, 7.5, "3. inode 10 을 읽는다. type 은 directory"],
     [7.5, 9.5, "4. foo 의 데이터에서 bar.txt 를 찾는다 → inode 20"],
     [9.5, 11.5, "5. inode 20 을 읽고 데이터 블록에 닿는다. 이제 fd 를 돌려준다"],
     [11.5, END, "이름 → inode 번호 → inode → 데이터 블록을 경로 깊이만큼 반복"]].forEach(function (c) {
      s += '<text x="380" y="26" font-size="15" text-anchor="middle" font-weight="700" fill="#3b2f4a" opacity="0">' + c[2] + show(c[0], c[1]) + '</text>';
    });
    // 왼쪽: p.10 트리
    var N = { root: [110, 75, "/"], foo: [55, 140, "foo"], bar: [165, 140, "bar"], t1: [35, 210, "bar.txt"], bb: [130, 210, "bar"], bf: [200, 210, "foo"], t2: [200, 280, "bar.txt"] };
    [["root", "foo"], ["root", "bar"], ["foo", "t1"], ["bar", "bb"], ["bar", "bf"], ["bf", "t2"]].forEach(function (e) {
      s += '<line x1="' + N[e[0]][0] + '" y1="' + N[e[0]][1] + '" x2="' + N[e[1]][0] + '" y2="' + N[e[1]][1] + '" stroke="#999"/>';
    });
    Object.keys(N).forEach(function (k) {
      var n = N[k];
      s += '<circle cx="' + n[0] + '" cy="' + n[1] + '" r="24" fill="#fff" stroke="#777"/>';
      s += '<text x="' + n[0] + '" y="' + (n[1] + 5) + '" font-size="' + (n[2].length > 4 ? 11 : 14) + '" text-anchor="middle" fill="#222">' + n[2] + '</text>';
    });
    [["root", 1.5], ["foo", 5.5], ["t1", 9.5]].forEach(function (h) {
      var n = N[h[0]];
      s += '<circle cx="' + n[0] + '" cy="' + n[1] + '" r="24" fill="#fdeec2" stroke="#e09a40" stroke-width="3" opacity="0">' + show(h[1], END) + '</circle>';
      s += '<text x="' + n[0] + '" y="' + (n[1] + 5) + '" font-size="' + (n[2].length > 4 ? 11 : 14) + '" text-anchor="middle" fill="#222" font-weight="700" opacity="0">' + n[2] + show(h[1], END) + '</text>';
    });
    s += '<text x="120" y="330" font-size="12" text-anchor="middle" fill="#777">p.10 의 디렉터리 트리</text>';
    // 오른쪽: inode 와 데이터 블록 세 줄
    var rows = [
      { y: 60, ino: "inode 2", sub: "/ · directory", t: 1.5, data: [[".", "2"], ["..", "2"], ["foo", "10"], ["bar", "11"]], hit: 2, td: 3.5 },
      { y: 150, ino: "inode 10", sub: "foo · directory", t: 5.5, data: [[".", "10"], ["..", "2"], ["bar.txt", "20"]], hit: 2, td: 7.5 },
      { y: 240, ino: "inode 20", sub: "bar.txt · regular", t: 9.5, data: null, td: 9.5 }
    ];
    rows.forEach(function (r, i) {
      s += '<g opacity="0">' + show(r.t, END);
      s += '<rect x="280" y="' + r.y + '" width="130" height="62" rx="6" fill="#dbe8f7" stroke="#1d65b3"/>';
      s += '<text x="345" y="' + (r.y + 26) + '" font-size="14" text-anchor="middle" font-weight="700" fill="#1d65b3">' + r.ino + '</text>';
      s += '<text x="345" y="' + (r.y + 46) + '" font-size="12" text-anchor="middle" fill="#222">' + r.sub + '</text>';
      s += '<line x1="410" y1="' + (r.y + 31) + '" x2="446" y2="' + (r.y + 31) + '" stroke="#1d65b3" stroke-width="2" marker-end="url(#pl_arrow)"/>';
      s += '</g>';
      s += '<g opacity="0">' + show(r.td, END);
      if (r.data) {
        r.data.forEach(function (d, j) {
          var x = 450 + j * 72;
          s += '<rect x="' + x + '" y="' + (r.y + 8) + '" width="70" height="46" fill="#fff" stroke="#999"/>';
          s += '<text x="' + (x + 35) + '" y="' + (r.y + 27) + '" font-size="12" text-anchor="middle" fill="#222">' + d[0] + '</text>';
          s += '<text x="' + (x + 35) + '" y="' + (r.y + 45) + '" font-size="12" text-anchor="middle" fill="#777">' + d[1] + '</text>';
        });
      } else {
        s += '<rect x="450" y="' + (r.y + 8) + '" width="140" height="46" fill="#dff3e4" stroke="#2e9e4f"/>';
        s += '<text x="520" y="' + (r.y + 37) + '" font-size="14" text-anchor="middle" fill="#222">"hello\\n"</text>';
      }
      s += '</g>';
      if (r.data) {
        var hx = 450 + r.hit * 72;
        s += '<rect x="' + hx + '" y="' + (r.y + 8) + '" width="70" height="46" fill="none" stroke="#d6465f" stroke-width="3" opacity="0">' + show(r.td + 0.6, END) + '</rect>';
        var ny = rows[i + 1].y;
        s += '<path d="M' + (hx + 35) + ' ' + (r.y + 54) + ' C' + (hx + 35) + ' ' + (r.y + 80) + ' 345 ' + (ny - 24) + ' 345 ' + (ny - 2) + '" fill="none" stroke="#d6465f" stroke-width="2" marker-end="url(#pl_arrow)" opacity="0">' + show(r.td + 1, END) + '</path>';
      }
    });
    s += '<text x="520" y="330" font-size="12" text-anchor="middle" fill="#777">디렉터리 데이터 = (name, inode #) 목록</text>';
    s += '<text x="380" y="352" font-size="13" text-anchor="middle" fill="#3b2f4a">상대 경로는 출발점만 working directory 의 inode 로 바뀐다</text>';
    return s + '</svg>';
  }
};
