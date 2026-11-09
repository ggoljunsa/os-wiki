// page_fault_flow — 17강 p.19~23: VP 3 참조 → fault → VP 4 evict → VP 3 swap in → PTE 갱신 → 재실행.
window.ANIMS = window.ANIMS || {};
ANIMS["page_fault_flow"] = {
  title: "Page fault — Trap, 교체, 가져오기, PTE 갱신, 재실행",
  desc: "[[page fault]] p.19~23. VP 3 은 디스크에 있고 PP 3 에는 VP 4 가 있다.",
  duration: 13,
  build: function () {
    var D = 13;
    function r3(v) { return Math.round(v * 1000) / 1000; }
    function show(a, b) { return '<animate attributeName="opacity" values="0;0;1;1;0;0" keyTimes="0;' + r3(a / D) + ';' + r3(a / D + 0.003) + ';' + r3(b / D) + ';' + r3(Math.min(0.999, b / D + 0.003)) + ';1" dur="' + D + 's" fill="freeze"/>'; }
    function vis(a, b, t) { return '<g opacity="0">' + t + show(a, b) + '</g>'; }
    function box(x, y, w, h, f, st) { return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="5" fill="' + f + '" stroke="' + st + '"/>'; }
    function t(x, y, s, sz, c, ex) { return '<text x="' + x + '" y="' + y + '" font-size="' + (sz || 13) + '" fill="' + (c || "#222") + '" text-anchor="middle"' + (ex || "") + '>' + s + '</text>'; }
    function token(path, a, b, label, c) { return '<g opacity="0"><circle r="7" fill="' + c + '"/>' + t(0, -11, label, 12, c, ' font-weight="700"') + '<animateMotion path="' + path + '" begin="' + a + 's" dur="' + r3(b - a) + 's" fill="freeze"/>' + show(a, b) + '</g>'; }
    var s = '<svg viewBox="0 0 760 350" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Page fault">';
    [[0,1.5,"Load M 이 VP 3 을 참조한다"],[1.5,3.5,"1. Reference — PTE 3 의 valid 가 0"],[3.5,5,"2. Trap — page fault 로 OS 에 진입, 3. Check storage"],[5,7,"OS 가 victim VP 4 를 골라 내보낸다 (page replacement)"],[7,9,"4. Get the page — VP 3 을 디스크에서 PP 3 으로"],[9,10.5,"5. Reset Page Table — PTE 3 = 1, PTE 4 = 0"],[10.5,12.98,"6. 같은 명령을 재실행 → page hit"]].forEach(function (c) { s += '<g opacity="0">' + t(380, 26, c[2], 15, "#3b2f4a", ' font-weight="700"') + show(c[0], c[1]) + '</g>'; });
    s += box(30, 130, 110, 56, "#efe9f6", "#3b2f4a") + t(85, 155, "CPU", 14, "#3b2f4a", ' font-weight="700"') + t(85, 174, "Load M", 12);
    s += t(280, 78, "Page table", 14, "#333", ' font-weight="700"');
    s += box(220, 90, 120, 44, "#dbe8f7", "#1d65b3") + t(280, 118, "PTE 3", 13);
    s += box(220, 142, 120, 44, "#dbe8f7", "#1d65b3") + t(280, 170, "PTE 4", 13);
    s += vis(0, 9.5, t(365, 118, "0", 17, "#d6465f", ' font-weight="700"')) + vis(9.5, 12.99, t(365, 118, "1", 17, "#1d6b2a", ' font-weight="700"'));
    s += vis(0, 9.5, t(365, 170, "1", 17, "#1d6b2a", ' font-weight="700"')) + vis(9.5, 12.99, t(365, 170, "0", 17, "#d6465f", ' font-weight="700"'));
    s += t(600, 78, "DRAM", 14, "#333", ' font-weight="700"') + box(550, 90, 100, 36, "#dbe8f7", "#1d65b3") + t(600, 114, "PP 0: VP 1", 12);
    s += vis(0, 5, box(550, 134, 100, 44, "#dbe8f7", "#1d65b3") + t(600, 162, "PP 3: VP 4", 13));
    s += vis(5, 7, box(550, 134, 100, 44, "#ffd9d9", "#d6465f") + t(600, 162, "VP 4 (victim)", 12));
    s += vis(7, 8.2, box(550, 134, 100, 44, "#fff", "#aaa") + t(600, 162, "(빈 frame)", 12, "#777"));
    s += vis(8.2, 12.99, box(550, 134, 100, 44, "#cdefd2", "#1d6b2a") + t(600, 162, "PP 3: VP 3", 13));
    s += t(600, 232, "Disk (swap space)", 14, "#333", ' font-weight="700"') + box(520, 244, 75, 40, "#fdeec2", "#e09a40") + t(557, 269, "VP 3", 13) + box(605, 244, 75, 40, "#fdeec2", "#e09a40") + t(642, 269, "VP 4", 13);
    s += box(220, 226, 120, 48, "#3b2f4a", "#3b2f4a") + t(280, 256, "OS handler", 13, "#fff");
    s += token("M140 150 L220 112", 1.5, 3.3, "VA", "#1d65b3") + token("M280 134 L280 226", 3.5, 4.9, "trap", "#d6465f");
    s += token("M600 178 L642 244", 5.6, 7, "VP 4", "#d6465f") + token("M557 244 L600 178", 7.1, 8.5, "VP 3", "#2e9e4f") + token("M140 150 L220 112", 10.8, 12, "VA", "#1d65b3");
    s += t(380, 334, "fault 를 낸 명령을 다시 실행한다 — 시스템 콜처럼 다음 명령으로 가지 않는다", 14, "#777");
    return s + '</svg>';
  }
};
