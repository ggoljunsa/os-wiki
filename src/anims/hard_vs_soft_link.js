// hard_vs_soft_link — 19강 p.33·p.38·p.40: ln 과 ln -s 를 나란히. rm file 뒤 cat file2 가 갈리는 이유.
window.ANIMS = window.ANIMS || {};
ANIMS["hard_vs_soft_link"] = {
  title: "hard link 와 symbolic link 나란히",
  desc: "왼쪽 `ln file file2`, 오른쪽 `ln -s file file2`. 같은 명령(cat, rm)을 양쪽에 똑같이 준다. → [[hard link]], [[symbolic link]]",
  duration: 14,
  build: function () {
    var D = 14, END = 13.99;
    function r3(v) { return Math.round(v * 1000) / 1000; }
    function show(a, b) { return '<animate attributeName="opacity" values="0;0;1;1;0;0" keyTimes="0;' + r3(a / D) + ';' + r3(a / D + 0.003) + ';' + r3(b / D) + ';' + r3(Math.min(0.999, b / D + 0.003)) + ';1" dur="' + D + 's" fill="freeze"/>'; }
    function txt(x, y, t, size, fill, extra) { return '<text x="' + x + '" y="' + y + '" font-size="' + size + '" text-anchor="middle" fill="' + fill + '"' + (extra || "") + '>' + t + '</text>'; }
    function entry(x, y, name, ino) {
      return '<rect x="' + x + '" y="' + y + '" width="62" height="28" fill="#fff" stroke="#999"/>' + txt(x + 31, y + 19, name, 13, "#222") +
        '<rect x="' + (x + 62) + '" y="' + y + '" width="58" height="28" fill="#fff" stroke="#999"/>' + txt(x + 91, y + 19, ino, 12, "#222");
    }
    function inode(x, y, ino, kind, col, light) {
      return '<rect x="' + x + '" y="' + y + '" width="104" height="66" rx="6" fill="' + light + '" stroke="' + col + '"/>' +
        txt(x + 52, y + 19, "inode " + ino, 13, col, ' font-weight="700"') + txt(x + 52, y + 37, kind, 11, "#222");
    }
    function block(x, y, t) { return '<rect x="' + x + '" y="' + y + '" width="62" height="34" fill="#fff" stroke="#999"/>' + txt(x + 31, y + 22, t, 12, "#222"); }
    function arrow(x1, y1, x2, y2, col, mk, a, b, dash) {
      return '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '" stroke="' + col + '" stroke-width="2"' + (dash ? ' stroke-dasharray="5 4"' : "") + ' marker-end="url(#hvs_' + mk + ')"' + (a === null ? "" : ' opacity="0"') + '>' + (a === null ? "" : show(a, b)) + '</line>';
    }
    var s = '<svg viewBox="0 0 760 370" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="hard link 와 symbolic link 비교">';
    s += '<defs>';
    [["b", "#1d65b3"], ["g", "#2e9e4f"], ["r", "#d6465f"], ["k", "#777"]].forEach(function (m) {
      s += '<marker id="hvs_' + m[0] + '" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L10 5L0 10z" fill="' + m[1] + '"/></marker>';
    });
    s += '</defs>';
    [[0, 1.5, "처음: 이름 file 이 inode 12345 를 가리킨다 (Links 1)"],
     [1.5, 4, "ln file file2 는 엔트리만 하나 더, ln -s file file2 는 새 inode 를 만든다"],
     [4, 6.5, "cat file2: hard 는 바로 inode 로, soft 는 담긴 경로 file 을 다시 찾는다"],
     [6.5, 9, "rm file: 엔트리 file 이 지워지고 Links 가 1 줄어든다"],
     [9, 12, "다시 cat file2: hard 는 그대로 hello, soft 는 갈 곳이 없다 (dangling)"],
     [12, END, "hard link 는 inode 를, symbolic link 는 이름(경로)을 가리킨다"]].forEach(function (c) {
      s += '<text x="380" y="24" font-size="15" text-anchor="middle" font-weight="700" fill="#3b2f4a" opacity="0">' + c[2] + show(c[0], c[1]) + '</text>';
    });
    s += '<line x1="380" y1="40" x2="380" y2="330" stroke="#ccc" stroke-dasharray="4 4"/>';
    s += txt(190, 56, "hard link: ln file file2", 14, "#1d65b3", ' font-weight="700"');
    s += txt(570, 56, "symbolic link: ln -s file file2", 14, "#2e9e4f", ' font-weight="700"');

    // ---- 왼쪽 (hard) ----
    var L = 10;
    s += '<g opacity="0">' + show(0, 6.5) + entry(L + 10, 80, "file", "12345") + '</g>';
    s += arrow(L + 130, 94, L + 168, 104, "#1d65b3", "b", 0, 6.5);
    s += '<g opacity="0">' + show(1.5, END) + entry(L + 10, 130, "file2", "12345") + '</g>';
    s += arrow(L + 130, 144, L + 168, 124, "#1d65b3", "b", 1.5, END);
    s += inode(L + 170, 80, "12345", "regular file", "#1d65b3", "#dbe8f7");
    [[0, 1.5, 1], [1.5, 6.5, 2], [6.5, END, 1]].forEach(function (c) { s += txt(L + 222, 138, "Links " + c[2], 13, "#222", ' font-weight="700" opacity="0"').replace("</text>", show(c[0], c[1]) + "</text>"); });
    s += arrow(L + 274, 113, L + 296, 113, "#777", "k", null);
    s += block(L + 298, 96, "hello");
    // cat file2 강조 (두 번)
    [[4, 6.5], [9, 12]].forEach(function (w) {
      s += '<rect x="' + (L + 8) + '" y="128" width="124" height="32" fill="none" stroke="#e09a40" stroke-width="3" opacity="0">' + show(w[0], w[1]) + '</rect>';
      s += '<rect x="' + (L + 296) + '" y="94" width="66" height="38" fill="none" stroke="#e09a40" stroke-width="3" opacity="0">' + show(w[0] + 0.7, w[1]) + '</rect>';
      s += txt(190, 210, "cat file2 → hello", 15, "#1d6b2a", ' font-weight="700" opacity="0"').replace("</text>", show(w[0] + 1, w[1]) + "</text>");
    });
    s += txt(L + 70, 112, "삭제됨", 12, "#d6465f", ' opacity="0"').replace("</text>", show(6.5, END) + "</text>");

    // ---- 오른쪽 (soft) ----
    var R = 390;
    s += '<g opacity="0">' + show(0, 6.5) + entry(R + 10, 80, "file", "12345") + '</g>';
    s += arrow(R + 130, 94, R + 168, 104, "#1d65b3", "b", 0, 6.5);
    s += '<g opacity="0">' + show(1.5, END) + entry(R + 10, 200, "file2", "13579") + '</g>';
    s += arrow(R + 130, 214, R + 168, 224, "#2e9e4f", "g", 1.5, END);
    s += '<g opacity="0">' + show(0, 6.5) + inode(R + 170, 80, "12345", "regular file", "#1d65b3", "#dbe8f7") + txt(R + 222, 138, "Links 1", 13, "#222", ' font-weight="700"') + '</g>';
    s += '<g opacity="0">' + show(6.5, END) + '<rect x="' + (R + 170) + '" y="80" width="104" height="66" rx="6" fill="#eee" stroke="#aaa" stroke-dasharray="4 3"/>' + txt(R + 222, 108, "inode 12345", 13, "#aaa") + txt(R + 222, 128, "Links 0 → 해제", 12, "#d6465f") + '</g>';
    s += arrow(R + 274, 113, R + 296, 113, "#777", "k", 0, 6.5);
    s += '<g opacity="0">' + show(0, 6.5) + block(R + 298, 96, "hello") + '</g>';
    s += '<g opacity="0">' + show(1.5, END) + inode(R + 170, 192, "13579", "symbolic link", "#2e9e4f", "#dff3e4") + txt(R + 222, 248, "Size 4", 12, "#222") + '</g>';
    s += arrow(R + 274, 225, R + 296, 225, "#777", "k", 1.5, END);
    s += '<g opacity="0">' + show(1.5, END) + block(R + 298, 208, '"file"') + '</g>';
    // 경로 "file" 을 다시 찾는 점선
    s += '<path d="M' + (R + 329) + ' 208 C' + (R + 329) + ' 170 ' + (R + 40) + ' 175 ' + (R + 40) + ' 112" fill="none" stroke="#2e9e4f" stroke-width="2" stroke-dasharray="5 4" marker-end="url(#hvs_g)" opacity="0">' + show(1.5, 9) + '</path>';
    s += '<path d="M' + (R + 329) + ' 208 C' + (R + 329) + ' 170 ' + (R + 40) + ' 175 ' + (R + 40) + ' 112" fill="none" stroke="#d6465f" stroke-width="2" stroke-dasharray="5 4" marker-end="url(#hvs_r)" opacity="0">' + show(9, END) + '</path>';
    s += txt(R + 40, 102, "?", 22, "#d6465f", ' font-weight="700" opacity="0"').replace("</text>", show(9, END) + "</text>");
    s += txt(R + 70, 112, "삭제됨", 12, "#d6465f", ' opacity="0"').replace("</text>", show(6.5, END) + "</text>");
    s += '<rect x="' + (R + 8) + '" y="198" width="124" height="32" fill="none" stroke="#e09a40" stroke-width="3" opacity="0">' + show(4, 6.5) + '</rect>';
    s += '<rect x="' + (R + 296) + '" y="94" width="66" height="38" fill="none" stroke="#e09a40" stroke-width="3" opacity="0">' + show(5.2, 6.5) + '</rect>';
    s += txt(570, 300, "cat file2 → hello", 15, "#1d6b2a", ' font-weight="700" opacity="0"').replace("</text>", show(5.2, 6.5) + "</text>");
    s += '<rect x="' + (R + 8) + '" y="198" width="124" height="32" fill="none" stroke="#d6465f" stroke-width="3" opacity="0">' + show(9, 12) + '</rect>';
    s += txt(570, 300, "cat: file2: No such file or directory", 14, "#d6465f", ' font-weight="700" opacity="0"').replace("</text>", show(10, END) + "</text>");

    s += txt(190, 300, "Links 가 0 이 될 때까지 데이터는 남는다", 12, "#777");
    s += txt(380, 356, "inode 번호는 파일 시스템 안에서만 유일하다 → hard link 는 파티션을 못 넘고, symbolic link 는 넘는다", 12, "#3b2f4a");
    return s + '</svg>';
  }
};
