// ============================================================
// code_share_protect — A·B 가 같은 물리 code 세그먼트를 공유하고, RE 권한이 쓰기를 막는다 (14강 p.13~15)
// 시간축(초): 0~2 두 segment table 이 32KB code 를 가리킴 → 2~4.5 A 명령어 fetch(X) OK → 4.5~7 B 읽기(R) OK
//   → 7~8.5 B 가 code 에 store(W): 범위 ✓ · base ✓ · 권한 검사 → 8.5~11 Protection Fault → 11~13 요점
// ============================================================
window.ANIMS = window.ANIMS || {};
ANIMS["code_share_protect"] = {
  title: "코드 공유 — 한 번 올린 code 를 둘이 쓰고, RE 비트가 쓰기를 막는다",
  desc: "[[코드 공유와 protection bit]] p.14 그림. Process A·B 의 segment table 이 둘 다 code 를 물리 32KB 로 가리킨다(Prot RE). 실행·읽기는 통과하고, 쓰기는 범위 검사를 지나도 권한 검사에서 Protection Fault — [[segmentation fault]] 와 구별",
  duration: 13,
  build: function () {
    var D = 13;
    var C = { a: "#1d65b3", aL: "#dbe8f7", b: "#2e9e4f", bL: "#dff3e4", c: "#e09a40", cL: "#fdeec2", k: "#3b2f4a", kL: "#efe9f6", hw: "#d6465f", hwL: "#f7d8dc", m: "#777" };
    function r3(v) { return Math.round(v * 1000) / 1000; }
    function box(x, y, w, h, fill, stroke, sw) { return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="3" fill="' + fill + '" stroke="' + stroke + '" stroke-width="' + (sw || 1.5) + '"/>'; }
    function txt(x, y, s, size, fill, extra) {
      var anchor = /text-anchor/.test(extra || "") ? "" : ' text-anchor="middle"';
      return '<text x="' + x + '" y="' + y + '" font-size="' + (size || 13) + '" fill="' + (fill || "#222") + '"' + anchor + (extra || "") + '>' + s + '</text>';
    }
    function show(from, to) {
      return '<animate attributeName="opacity" values="0;0;1;1;0;0" keyTimes="0;' + r3(from / D) + ';' + r3(from / D + 0.003) + ';' + r3(to / D) + ';' + r3(Math.min(1, to / D + 0.003)) + ';1" dur="' + D + 's" fill="freeze"/>';
    }
    function during(from, to, inner) {
      if (from <= 0) return '<g>' + inner + '<animate attributeName="opacity" values="1;1;0;0" keyTimes="0;' + r3(to / D) + ';' + r3(Math.min(1, to / D + 0.003)) + ';1" dur="' + D + 's" fill="freeze"/></g>';
      return '<g opacity="0">' + inner + show(from, to) + '</g>';
    }
    function token(path, from, to, label, color) {
      return '<g opacity="0"><rect x="-30" y="-11" width="60" height="22" rx="4" fill="' + color + '"/>' + txt(0, 5, label, 12.5, "#fff", ' font-weight="700"') +
        '<animateMotion path="' + path + '" begin="' + from + 's" dur="' + r3(to - from) + 's" fill="freeze"/>' + show(from, to) + '</g>';
    }

    var s = '<svg viewBox="0 0 760 370" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="코드 공유와 protection bit 애니메이션">';
    s += '<defs><marker id="csp_arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="#777"/></marker></defs>';
    [
      [0, 2, "Process A 와 B 의 segment table 이 code 를 같은 물리 32KB 로 가리킨다 (Prot = RE)"],
      [2, 4.5, "A: 명령어 fetch (Execute) → RE 에 X 가 있다 → 통과"],
      [4.5, 7, "B: code 를 읽기 (Read) → 통과. 같은 code 한 벌을 둘이 쓴다"],
      [7, 8.5, "B: code 에 store (Write) → ① offset &lt; size ✓ ② base 더하기 ✓ ③ 권한은?"],
      [8.5, 11, "RE 에는 W 가 없다 → Protection Fault! → OS 트랩 핸들러로"],
      [11, D, "공유 덕에 code 는 메모리에 한 번만. 쓰기 금지(RE)라서 공유해도 안전하다"]
    ].forEach(function (c) { s += during(c[0], c[1], txt(380, 26, c[2], 14.5, "#222", ' font-weight="700"')); });

    // segment table A / B
    function segTable(x, name, color) {
      var g = txt(x + 85, 70, "Segment Table (" + name + ")", 12.5, color, ' font-weight="700"');
      g += txt(x + 30, 92, "Seg", 11.5, C.m) + txt(x + 85, 92, "Base", 11.5, C.m) + txt(x + 140, 92, "Prot", 11.5, C.m);
      g += box(x, 98, 170, 26, "#e8e8ec", "#888") + txt(x + 30, 116, "Code", 13, C.k, ' font-weight="700"') + txt(x + 85, 116, "32KB", 13, C.k, ' font-weight="700"') + txt(x + 140, 116, "RE", 13, C.hw, ' font-weight="700"');
      g += box(x, 124, 170, 26, "#fff", "#bbb") + txt(x + 30, 142, "Heap", 12.5, C.m) + txt(x + 140, 142, "RW", 12.5, C.m);
      g += box(x, 150, 170, 26, "#fff", "#bbb") + txt(x + 30, 168, "Stack", 12.5, C.m) + txt(x + 140, 168, "RW", 12.5, C.m);
      return g;
    }
    s += segTable(30, "Process A", C.a) + segTable(560, "Process B", C.b);

    // 물리 메모리 (p.14 순서, 크기는 비례 아님)
    var MX = 300, MW = 160, y = 60;
    var rows = [["Operating System", 40, "#c9d7ee", C.a], ["not in use", 20, "#f4f4f4", "#bbb"], ["Stack (A)", 20, "#fff", C.a], ["not in use", 20, "#f4f4f4", "#bbb"],
      ["32KB: Code (A &amp; B)", 26, "#e8e8ec", C.k], ["Heap (A)", 20, "#fff", C.a], ["not in use", 20, "#f4f4f4", "#bbb"], ["Stack (B)", 20, "#fff", C.b], ["not in use", 20, "#f4f4f4", "#bbb"], ["Heap (B)", 20, "#fff", C.b], ["not in use", 22, "#f4f4f4", "#bbb"]];
    s += txt(MX + MW / 2, 52, "Physical Memory", 12.5, C.k, ' font-weight="700"');
    var codeY = 0;
    rows.forEach(function (r) {
      s += box(MX, y, MW, r[1], r[2], r[3], 1.2) + txt(MX + MW / 2, y + r[1] / 2 + 4.5, r[0], r[0].indexOf("Code") > 0 ? 13 : 11.5, r[0].indexOf("Code") > 0 ? C.k : "#555", r[0].indexOf("Code") > 0 ? ' font-weight="700"' : "");
      if (r[0].indexOf("Code") > 0) codeY = y + r[1] / 2;
      y += r[1];
    });
    s += txt(MX - 6, 64, "0KB", 11, C.m, ' text-anchor="end"') + txt(MX - 6, y + 4, "64KB", 11, C.m, ' text-anchor="end"');
    // 두 테이블 → code 화살표
    s += '<path d="M200,111 C250,111 250,' + codeY + ' ' + (MX - 4) + ',' + codeY + '" fill="none" stroke="' + C.a + '" stroke-width="2" marker-end="url(#csp_arr)"/>';
    s += '<path d="M560,111 C510,111 510,' + codeY + ' ' + (MX + MW + 4) + ',' + codeY + '" fill="none" stroke="' + C.b + '" stroke-width="2" marker-end="url(#csp_arr)"/>';

    // 접근 토큰
    s += token("M115,200 C200,260 260," + codeY + " 330," + codeY, 2, 3.6, "fetch X", C.a);
    s += during(3.6, 4.5, '<circle cx="' + (MX + MW + 26) + '" cy="' + (codeY - 26) + '" r="12" fill="' + C.b + '"/>' + txt(MX + MW + 26, codeY - 21, "✓", 14, "#fff", ' font-weight="700"'));
    s += token("M645,200 C560,260 500," + codeY + " 430," + codeY, 4.5, 6.1, "read R", C.b);
    s += during(6.1, 7, '<circle cx="' + (MX - 26) + '" cy="' + (codeY - 26) + '" r="12" fill="' + C.b + '"/>' + txt(MX - 26, codeY - 21, "✓", 14, "#fff", ' font-weight="700"'));

    // B 의 store: 검사 3단계 상자
    var GX = 520, GY = 222;
    s += during(7, 11, box(GX, GY, 210, 92, "#fff", C.hw, 2) +
      txt(GX + 12, GY + 22, "① offset &lt; size", 12.5, C.b, ' text-anchor="start" font-weight="700"') + txt(GX + 196, GY + 22, "✓", 13, C.b, ' text-anchor="end" font-weight="700"') +
      txt(GX + 12, GY + 44, "② base + offset", 12.5, C.b, ' text-anchor="start" font-weight="700"') + txt(GX + 196, GY + 44, "✓", 13, C.b, ' text-anchor="end" font-weight="700"') +
      txt(GX + 12, GY + 66, "③ W ∈ RE ?", 12.5, C.hw, ' text-anchor="start" font-weight="700"'));
    s += during(8.5, 11, txt(GX + 196, GY + 66, "✗", 14, C.hw, ' text-anchor="end" font-weight="700"') + txt(GX + 105, GY + 86, "Protection Fault!", 13.5, C.hw, ' font-weight="700"'));
    s += token("M645,200 L600,210", 7, 7.6, "store W", C.hw);
    s += during(7.6, 11, '<g transform="translate(600,210)"><rect x="-30" y="-11" width="60" height="22" rx="4" fill="' + C.hw + '"/>' + txt(0, 5, "store W", 12.5, "#fff", ' font-weight="700"') + '</g>');
    s += during(8.5, 11, '<path d="M' + (MX + MW + 6) + ',' + (codeY + 14) + ' L' + (GX - 6) + ',' + (GY + 40) + '" stroke="' + C.hw + '" stroke-width="2.5" stroke-dasharray="5,4"/>' +
      txt(470, 300, "code 는 그대로", 12, C.hw, ' font-weight="700"'));

    s += txt(380, 358, "공유하려면 세그먼트마다 protection bit(R·W·X) 가 필요하다 — 검사 순서: 범위 → 더하기 → 권한", 13, C.k, ' font-weight="700"');
    return s + '</svg>';
  }
};
