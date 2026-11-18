// cow_fault_flow — 과제 3 Problem 1: 자식의 store → store page fault(scause 15) → kalloc → 복사 → PTE 갱신 → 같은 store 재실행.
window.ANIMS = window.ANIMS || {};
ANIMS["cow_fault_flow"] = {
  title: "COW page fault: 공유 page 에 쓰면 그때 복사한다",
  desc: "[[COW fork]] 뒤 부모·자식이 frame B 를 같이 가리킨다. 자식이 쓰는 순간 [[usertrap]] 이 B 를 복사해 자식에게만 새 frame 을 준다.",
  duration: 14,
  build: function () {
    var D = 14;
    function r3(v) { return Math.round(v * 1000) / 1000; }
    function show(a, b) { return '<animate attributeName="opacity" values="0;0;1;1;0;0" keyTimes="0;' + r3(a / D) + ';' + r3(a / D + 0.003) + ';' + r3(b / D) + ';' + r3(Math.min(0.999, b / D + 0.003)) + ';1" dur="' + D + 's" fill="freeze"/>'; }
    function vis(a, b, s) { return '<g opacity="0">' + s + show(a, b) + '</g>'; }
    function box(x, y, w, h, f, st, sw) { return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="5" fill="' + f + '" stroke="' + st + '" stroke-width="' + (sw || 1) + '"/>'; }
    function t(x, y, s, sz, c, ex) { return '<text x="' + x + '" y="' + y + '" font-size="' + (sz || 13) + '" fill="' + (c || "#222") + '" text-anchor="middle"' + (ex || "") + '>' + s + '</text>'; }
    function line(x1, y1, x2, y2, c, dash) { return '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '" stroke="' + c + '" stroke-width="2" marker-end="url(#cff_ar)"' + (dash ? ' stroke-dasharray="5 4"' : '') + '/>'; }
    function token(path, a, b, label, c) { return '<g opacity="0"><circle r="7" fill="' + c + '"/>' + t(0, -11, label, 12, c, ' font-weight="700"') + '<animateMotion path="' + path + '" begin="' + a + 's" dur="' + r3(b - a) + 's" fill="freeze"/>' + show(a, b) + '</g>'; }
    var s = '<svg viewBox="0 0 760 360" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="COW page fault">';
    s += '<defs><marker id="cff_ar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0L10,5L0,10z" fill="#666"/></marker></defs>';
    [[0, 1.8, "fork 직후: 부모와 자식이 frame B 를 같이 가리킨다 (W 꺼짐, COW 표시)"],
     [1.8, 3.5, "자식이 VA 0x1010 에 store. W 가 0 이라 HW 가 store page fault"],
     [3.5, 5.2, "usertrap: scause 15, stval 0x1010. PTE 에 COW 표시가 있다"],
     [5.2, 7, "kalloc() 으로 새 frame N 을 받는다"],
     [7, 8.8, "B 의 4096 바이트를 N 으로 복사한다"],
     [8.8, 10.5, "자식 PTE 를 N 으로 바꾸고 W 를 켠다. rc[B] 는 2 에서 1"],
     [10.5, 13.98, "epc 그대로 복귀. 같은 store 가 다시 실행되어 N 에 써진다"]].forEach(function (c) {
      s += '<g opacity="0">' + t(380, 26, c[2], 15, "#3b2f4a", ' font-weight="700"') + show(c[0], c[1]) + '</g>';
    });
    // 부모 PTE
    s += t(110, 70, "부모 PTE (VA 0x1000)", 13, "#1d65b3", ' font-weight="700"');
    s += box(40, 82, 140, 44, "#dbe8f7", "#1d65b3") + t(110, 101, "→ B", 13) + t(110, 118, "R-U, COW", 12, "#d6465f");
    // 자식 PTE
    s += t(650, 70, "자식 PTE (VA 0x1000)", 13, "#2e9e4f", ' font-weight="700"');
    s += vis(0, 9.2, box(580, 82, 140, 44, "#dff3e4", "#2e9e4f") + t(650, 101, "→ B", 13) + t(650, 118, "R-U, COW", 12, "#d6465f"));
    s += vis(9.2, 13.99, box(580, 82, 140, 44, "#cdefd2", "#1d6b2a", 2) + t(650, 101, "→ N", 13, "#1d6b2a", ' font-weight="700"') + t(650, 118, "RWU", 12, "#1d6b2a"));
    // frame B
    s += t(380, 70, "물리 메모리", 13, "#3b2f4a", ' font-weight="700"');
    s += box(320, 82, 120, 44, "#efe9f6", "#3b2f4a") + t(380, 101, "frame B", 13);
    s += vis(0, 9.6, t(380, 118, "rc 2", 12, "#d6465f", ' font-weight="700"'));
    s += vis(9.6, 13.99, t(380, 118, "rc 1", 12, "#1d6b2a", ' font-weight="700"'));
    // frame N
    s += vis(5.6, 13.99, box(320, 150, 120, 44, "#efe9f6", "#3b2f4a") + t(380, 169, "frame N (새것)", 12) + t(380, 186, "rc 1", 12, "#1d6b2a", ' font-weight="700"'));
    // 화살표
    s += line(180, 104, 318, 104, "#1d65b3");
    s += vis(0, 9.2, line(580, 104, 442, 104, "#2e9e4f"));
    s += vis(9.2, 13.99, line(580, 112, 442, 168, "#1d6b2a"));
    // 복사 막대
    s += vis(7, 8.8, '<rect x="452" y="128" width="0" height="10" fill="#e09a40"><animate attributeName="width" from="0" to="90" begin="7s" dur="1.6s" fill="freeze"/></rect>' + t(500, 152, "memmove 4096 B", 11, "#8a6000"));
    // 커널 상자
    s += box(250, 230, 260, 84, "#3b2f4a", "#3b2f4a");
    s += t(380, 252, "usertrap()", 13, "#fff", ' font-weight="700"');
    s += vis(3.5, 13.99, t(380, 272, "scause = 15 (store page fault)", 12, "#fff"));
    s += vis(3.5, 13.99, t(380, 290, "stval = 0x1010", 12, "#fff"));
    s += vis(10.5, 13.99, t(380, 306, "epc 그대로 (+4 하지 않음)", 12, "#fdeec2"));
    // 자식 CPU
    s += box(600, 230, 120, 56, "#dff3e4", "#2e9e4f") + t(660, 254, "자식", 13, "#2e9e4f", ' font-weight="700"') + t(660, 274, "sw a0, 16(..)", 12);
    s += vis(1.8, 3.5, t(660, 300, "W=0 → fault", 12, "#d6465f", ' font-weight="700"'));
    s += vis(11.8, 13.99, t(660, 300, "이번엔 성공", 12, "#1d6b2a", ' font-weight="700"'));
    s += token("M600 250 L512 270", 1.9, 3.4, "trap", "#d6465f");
    s += token("M300 230 L306 176", 5.3, 6.6, "kalloc", "#3b2f4a");
    s += token("M512 290 L600 260", 10.6, 11.7, "sret", "#2e9e4f");
    s += t(380, 346, "고칠 수 있는 fault 라서 같은 명령을 다시 실행한다. 시스템 콜은 epc + 4 로 다음 명령에 간다.", 13, "#777");
    return s + '</svg>';
  }
};
