// mkdir_dot_entries — 19강 p.28: mkdir("foo", 0777) 이 하는 일.
//   새 inode(종류 directory) → 새 블록에 . 과 .. 엔트리 → 부모에 foo 엔트리 → 부모 link count +1 (p.28 ls -al 의 ./ 2, ../ 26).
window.ANIMS = window.ANIMS || {};
ANIMS["mkdir_dot_entries"] = {
  title: "mkdir 이 하는 일: 빈 디렉터리에도 . 과 .. 이 있다",
  desc: "[[디렉터리 API]] p.28. 새 디렉터리의 엔트리 두 개와, 부모 쪽에서 바뀌는 것 두 가지(엔트리 하나, link count +1).",
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
    var C = { p: "#1d65b3", pL: "#dbe8f7", n: "#2e9e4f", nL: "#dff3e4", hw: "#d6465f", cpu: "#3b2f4a", or: "#e09a40", orL: "#fdeec2", muted: "#777" };
    var s = '<svg viewBox="0 0 760 360" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="mkdir 과 . .. 엔트리">';
    s += '<defs><marker id="md_arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#555"/></marker></defs>';
    var caps = [
      [0, 1, "부모 디렉터리 P 안에서 mkdir(“foo”, 0777) 을 부른다"],
      [1, 3, "① 빈 inode 하나를 잡아 종류를 directory 로 적는다 (새 inode N)"],
      [3, 5.4, "② N 의 데이터 블록에 (N, “.”) 와 (P, “..”) 두 엔트리를 쓴다"],
      [5.4, 7.4, "③ 부모 P 의 데이터 블록에 (N, “foo”) 엔트리를 더한다"],
      [7.4, 9.6, "④ N 의 “..” 이 P 를 가리키게 됐다. P 의 link count 가 1 오른다"],
      [9.6, 11.6, "foo 의 link count 는 2: 부모의 “foo” 엔트리 + 자기 “.”"],
      [11.6, 12.99, "그래서 p.28 ls -al 에 ./ 은 2, ../ 은 26. 사용자가 넣은 것이 없으면 “비어 있다”"]
    ];
    caps.forEach(function (c) { s += win(c[0], c[1], txt(380, 26, c[2], c[2].length > 48 ? 13.5 : 15, "#222", ' font-weight="700"')); });

    function inode(x, y, color, light, name, extraFn) {
      return '<rect x="' + x + '" y="' + y + '" width="200" height="78" rx="8" fill="' + light + '" stroke="' + color + '" stroke-width="2"/>' + txt(x + 100, y + 22, name, 14, color, ' font-weight="700"');
    }
    function entryRow(x, y, inum, name, color) {
      return '<rect x="' + x + '" y="' + y + '" width="200" height="26" fill="#fff" stroke="#bbb"/>' +
        '<text x="' + (x + 14) + '" y="' + (y + 18) + '" font-size="14" fill="' + color + '" font-weight="700">' + inum + '</text>' +
        '<text x="' + (x + 70) + '" y="' + (y + 18) + '" font-size="15" fill="#222" font-family="monospace" font-weight="700">' + name + '</text>';
    }
    // ===== 부모 P (왼쪽) =====
    s += inode(40, 56, C.p, C.pL, "부모 inode P (directory)");
    s += txt(140, 100, "link count", 12, C.muted);
    s += win(0, 8.4, txt(140, 124, "25", 18, C.p, ' font-weight="700"'));
    s += on(8.4, txt(140, 124, "25 → 26", 18, C.hw, ' font-weight="700"'));
    s += txt(140, 160, "P 의 데이터 블록", 12, C.muted);
    s += entryRow(40, 168, "P", ".", C.p) + entryRow(40, 194, "…", "..", C.muted) + entryRow(40, 220, "…", "(기존 파일들)", C.muted);
    s += on(6.2, '<rect x="40" y="246" width="200" height="26" fill="' + C.nL + '" stroke="' + C.n + '" stroke-width="2"/>' +
      '<text x="54" y="264" font-size="14" fill="' + C.n + '" font-weight="700">N</text><text x="110" y="264" font-size="15" fill="#222" font-family="monospace" font-weight="700">foo</text>');
    s += '<rect x="40" y="246" width="200" height="26" fill="none" stroke="#bbb" stroke-dasharray="4 3"/>';

    // ===== 새 디렉터리 N (오른쪽) =====
    s += on(1.6, inode(520, 56, C.n, C.nL, "새 inode N (directory)") + txt(620, 100, "link count", 12, C.muted));
    s += win(1.6, 3.6, txt(620, 124, "0", 18, C.n, ' font-weight="700"'));
    s += win(3.6, 6.4, txt(620, 124, "1  (“.”)", 18, C.n, ' font-weight="700"'));
    s += on(6.4, txt(620, 124, "2  (“.” + “foo”)", 18, C.n, ' font-weight="700"'));
    s += on(3.2, txt(620, 160, "N 의 데이터 블록", 12, C.muted));
    s += on(3.6, entryRow(520, 168, "N", ".", C.n));
    s += on(4.6, entryRow(520, 194, "P", "..", C.p));
    s += on(3.2, '<rect x="520" y="168" width="200" height="52" fill="none" stroke="' + C.n + '" stroke-width="2"/>');
    // inode bitmap 그림 (①)
    s += win(1, 3, '<g>' + txt(380, 300, "inode bitmap", 12, C.muted) + [1, 1, 1, 0, 1, 0].map(function (b, i) {
      return '<rect x="' + (318 + i * 21) + '" y="308" width="19" height="22" fill="' + (b ? "#cfd8e6" : "#fff") + '" stroke="#888"/>' + txt(327 + i * 21, 324, "" + b, 12, "#333");
    }).join('') + '</g>');
    s += win(1.6, 3, '<rect x="381" y="308" width="19" height="22" fill="' + C.n + '"/>' + txt(390, 324, "1", 12, "#fff", ' font-weight="700"'));

    // 화살표: "." → N(자기), ".." → P, "foo" → N
    s += on(3.8, '<path d="M720,181 C752,181 752,95 722,95" fill="none" stroke="' + C.n + '" stroke-width="2.5" marker-end="url(#md_arrow)"/>' + txt(712, 148, "자기", 11, C.n, ' font-weight="700"'));
    s += on(4.8, '<path d="M520,207 C400,207 380,95 242,95" fill="none" stroke="' + C.p + '" stroke-width="2.5" marker-end="url(#md_arrow)"/>' + txt(462, 238, "“..” = 부모", 12, C.p, ' font-weight="700"'));
    s += on(6.4, '<path d="M240,259 C400,259 420,130 518,118" fill="none" stroke="' + C.n + '" stroke-width="2.5" marker-end="url(#md_arrow)"/>' + txt(372, 244, "“foo”", 13, C.n, ' font-weight="700"'));
    // link count 강조
    s += win(7.4, 9.6, '<rect x="70" y="104" width="140" height="28" rx="5" fill="none" stroke="' + C.hw + '" stroke-width="3"/>');
    s += win(9.6, 11.6, '<rect x="530" y="104" width="180" height="28" rx="5" fill="none" stroke="' + C.hw + '" stroke-width="3"/>');
    // ls -al
    s += on(11.6, '<rect x="200" y="290" width="360" height="46" rx="6" fill="#f6f6f6" stroke="#ccc"/>' +
      '<text x="214" y="309" font-size="12.5" fill="#222" font-family="monospace">drwxr-x---  <tspan fill="' + C.n + '" font-weight="700">2</tspan> remzi remzi    6 … ./</text>' +
      '<text x="214" y="327" font-size="12.5" fill="#222" font-family="monospace">drwxr-x--- <tspan fill="' + C.p + '" font-weight="700">26</tspan> remzi remzi 4096 … ../</text>');

    s += txt(380, 352, "디렉터리 형식은 OS 가 채운다. 그래서 일반 파일 만들기와 따로 mkdir 이라는 API 가 있다", 13, C.muted);
    return s + '</svg>';
  }
};
