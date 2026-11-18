// megapage_vs_4k — 과제 3 Problem 2: 같은 2 MB 를 4 KB page 512 장으로 매핑할 때와 level-1 leaf(megapage) 하나로 매핑할 때.
window.ANIMS = window.ANIMS || {};
ANIMS["megapage_vs_4k"] = {
  title: "Megapage 와 4 KB page: 2 MB 를 덮는 두 가지 방법",
  desc: "왼쪽은 level 0 까지 세 번 내려가는 4 KB 경로, 오른쪽은 level 1 에서 멈추는 [[superpage|megapage]] 경로다. VA 를 자르는 방식과 PTE 개수가 달라진다.",
  duration: 13,
  build: function () {
    var D = 13;
    function r3(v) { return Math.round(v * 1000) / 1000; }
    function show(a, b) { return '<animate attributeName="opacity" values="0;0;1;1;0;0" keyTimes="0;' + r3(a / D) + ';' + r3(a / D + 0.003) + ';' + r3(b / D) + ';' + r3(Math.min(0.999, b / D + 0.003)) + ';1" dur="' + D + 's" fill="freeze"/>'; }
    function vis(a, b, s) { return '<g opacity="0">' + s + show(a, b) + '</g>'; }
    function box(x, y, w, h, f, st, dash) { return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="4" fill="' + f + '" stroke="' + st + '"' + (dash ? ' stroke-dasharray="4 3"' : '') + '/>'; }
    function t(x, y, s, sz, c, ex) { return '<text x="' + x + '" y="' + y + '" font-size="' + (sz || 13) + '" fill="' + (c || "#222") + '" text-anchor="middle"' + (ex || "") + '>' + s + '</text>'; }
    function arrow(x1, y1, x2, y2, c) { return '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '" stroke="' + c + '" stroke-width="2" marker-end="url(#mvk_ar)"/>'; }
    var s = '<svg viewBox="0 0 760 370" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="megapage vs 4KB">';
    s += '<defs><marker id="mvk_ar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0L10,5L0,10z" fill="#666"/></marker></defs>';
    [[0, 2, "같은 VA 0x4053A8. 왼쪽은 4 KB page, 오른쪽은 megapage 로 매핑했다"],
     [2, 4, "level 2: 둘 다 VPN[2] 로 level-1 table 을 찾는다"],
     [4, 6.5, "level 1: 왼쪽 PTE 는 branch(R=W=X=0), 오른쪽 PTE 는 leaf(R·W 켜짐)"],
     [6.5, 9, "왼쪽은 level 0 까지 한 번 더. 오른쪽은 VPN[0] 을 offset 으로 쓴다"],
     [9, 12.98, "2 MB 를 덮는 데 왼쪽은 PTE 512 개 + table 한 장, 오른쪽은 PTE 1 개"]].forEach(function (c) {
      s += '<g opacity="0">' + t(380, 24, c[2], 15, "#3b2f4a", ' font-weight="700"') + show(c[0], c[1]) + '</g>';
    });
    // VA 칸 (왼쪽 9|9|9|12, 오른쪽 9|9|21)
    function vaBar(x0, fields) {
      var o = "", x = x0, u = 330 / 39;
      fields.forEach(function (f) { var w = f[1] * u; o += box(x, 44, w, 26, f[2], "#888") + t(x + w / 2, 62, f[0], 11); x += w; });
      return o;
    }
    s += vaBar(30, [["VPN[2] 0", 9, "#dbe8f7"], ["VPN[1] 2", 9, "#dff3e4"], ["VPN[0] 5", 9, "#efe9f6"], ["0x3a8", 12, "#fdeec2"]]);
    s += vis(0, 6.5, vaBar(400, [["VPN[2] 0", 9, "#dbe8f7"], ["VPN[1] 2", 9, "#dff3e4"], ["VPN[0] 5", 9, "#efe9f6"], ["0x3a8", 12, "#fdeec2"]]));
    s += vis(6.5, 12.99, vaBar(400, [["VPN[2] 0", 9, "#dbe8f7"], ["VPN[1] 2", 9, "#dff3e4"], ["offset 0x53a8 (21 bit)", 21, "#fdeec2"]]));
    s += t(195, 92, "4 KB page", 14, "#1d65b3", ' font-weight="700"') + t(565, 92, "megapage (2 MB)", 14, "#2e9e4f", ' font-weight="700"');
    // 왼쪽 경로
    var Lx = 60;
    s += box(Lx, 110, 110, 34, "#fafafa", "#3b2f4a") + t(Lx + 55, 132, "L2 table", 12);
    s += box(Lx, 170, 110, 34, "#fafafa", "#3b2f4a") + t(Lx + 55, 192, "L1 table", 12);
    s += box(Lx, 230, 110, 34, "#fafafa", "#3b2f4a") + t(Lx + 55, 252, "L0 table", 12);
    s += box(Lx + 170, 230, 100, 34, "#dbe8f7", "#1d65b3") + t(Lx + 220, 252, "4 KB page", 12);
    s += vis(2, 12.99, arrow(Lx + 55, 144, Lx + 55, 168, "#1d65b3"));
    s += vis(4, 12.99, arrow(Lx + 55, 204, Lx + 55, 228, "#1d65b3") + t(Lx + 92, 220, "branch", 11, "#777"));
    s += vis(6.5, 12.99, arrow(Lx + 110, 247, Lx + 168, 247, "#1d65b3"));
    s += vis(9, 12.99, t(195, 300, "PTE 512 개, L0 table 4 KB 한 장", 12, "#1d65b3") + t(195, 318, "TLB entry 하나가 4 KB 를 덮음", 12, "#1d65b3"));
    // 오른쪽 경로
    var Rx = 430;
    s += box(Rx, 110, 110, 34, "#fafafa", "#3b2f4a") + t(Rx + 55, 132, "L2 table", 12);
    s += box(Rx, 170, 110, 34, "#fafafa", "#3b2f4a") + t(Rx + 55, 192, "L1 table", 12);
    s += box(Rx, 230, 110, 34, "#f4f4f4", "#bbb", true) + t(Rx + 55, 252, "L0 table 없음", 12, "#999");
    s += box(Rx + 170, 140, 110, 124, "#dff3e4", "#2e9e4f") + t(Rx + 225, 196, "2 MB page", 13, "#2e9e4f", ' font-weight="700"') + t(Rx + 225, 214, "PA 2 MB 정렬", 11, "#2e9e4f");
    s += vis(2, 12.99, arrow(Rx + 55, 144, Rx + 55, 168, "#2e9e4f"));
    s += vis(4, 12.99, arrow(Rx + 110, 187, Rx + 168, 187, "#2e9e4f") + t(Rx + 140, 178, "leaf", 11, "#d6465f", ' font-weight="700"'));
    s += vis(9, 12.99, t(565, 300, "PTE 1 개 (level 1), L0 table 0 장", 12, "#2e9e4f") + t(565, 318, "TLB entry 하나가 2 MB 를 덮음", 12, "#2e9e4f"));
    s += '<line x1="380" y1="86" x2="380" y2="330" stroke="#ddd"/>';
    s += t(380, 356, "4 KB × 512 = 2 MB. PTE 의 위치(level)가 크기를 정하고, R·W·X 가 branch 와 leaf 를 가른다.", 13, "#777");
    return s + '</svg>';
  }
};
