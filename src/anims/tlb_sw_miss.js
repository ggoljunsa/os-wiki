// ============================================================
// tlb_sw_miss — software-managed TLB miss 처리 6단계 (15강 p.42~44): HW 는 예외만, OS 가 찾아 TLB 를 채운다
// 시간축(초): 0~1.5 구성 → 1.5~2.5 TLB miss → 2.5~4 ① exception(kernel mode) → 4~5 ② trap handler
//   → 5~6.5 ③ page table 조회 → 6.5~8 ④ 특권 명령으로 TLB 갱신 → 8~9.5 ⑤ return-from-trap → 9.5~11 ⑥ retry hit
//   → 11~14 hardware-managed 와 비교 (p.44)
// ============================================================
window.ANIMS = window.ANIMS || {};
ANIMS["tlb_sw_miss"] = {
  title: "Software-managed TLB — miss 가 나면 OS 의 trap handler 가 TLB 를 채운다",
  desc: "[[TLB miss 처리]] p.42~43 의 6단계. 하드웨어는 예외만 올리고(kernel mode, trap handler 로 점프), OS 가 page table 에서 번역을 찾아 특권 명령으로 TLB 에 넣은 뒤 return-from-trap, 하드웨어가 같은 명령을 다시 실행한다. MIPS·RISC 계열",
  duration: 14,
  build: function () {
    var D = 14;
    var C = { a: "#1d65b3", aL: "#dbe8f7", b: "#2e9e4f", bL: "#dff3e4", c: "#e09a40", cL: "#fdeec2", k: "#3b2f4a", kL: "#efe9f6", hw: "#d6465f", hwL: "#f7d8dc", m: "#777" };
    function r3(v) { return Math.round(v * 1000) / 1000; }
    function box(x, y, w, h, fill, stroke, sw) { return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="5" fill="' + fill + '" stroke="' + stroke + '" stroke-width="' + (sw || 1.5) + '"/>'; }
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
      return '<g opacity="0"><rect x="-34" y="-11" width="68" height="22" rx="4" fill="' + color + '"/>' + txt(0, 5, label, 12, "#fff", ' font-weight="700"') +
        '<animateMotion path="' + path + '" begin="' + from + 's" dur="' + r3(to - from) + 's" fill="freeze"/>' + show(from, to) + '</g>';
    }

    var s = '<svg viewBox="0 0 760 380" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="software-managed TLB miss 애니메이션">';
    [
      [0, 1.5, "CPU 가 load 명령을 실행한다. VA 의 VPN v 로 TLB 를 찾는다"],
      [1.5, 2.5, "TLB miss — v 에 대한 번역이 TLB 에 없다"],
      [2.5, 4, "① HW: 예외를 올린다 — 명령 흐름 멈춤, kernel mode 로, trap handler 로 점프"],
      [4, 5, "② OS 의 trap handler 가 실행된다"],
      [5, 6.5, "③ OS 가 page table 에서 v 의 번역(PFN f)을 찾는다"],
      [6.5, 8, "④ OS 가 특권 명령으로 TLB 에 (v → f) 를 써 넣는다"],
      [8, 9.5, "⑤ OS: return from trap — user mode 로"],
      [9.5, 11, "⑥ HW: 같은 명령을 다시 실행(retry) → 이번엔 TLB hit"],
      [11, D, "p.44: HW-managed 는 빠르지만 CPU 가 복잡 · SW-managed 는 느리지만 단순하고 유연"]
    ].forEach(function (c) { s += during(c[0], c[1], txt(380, 26, c[2], 14, "#222", ' font-weight="700"')); });

    // CPU
    s += box(30, 52, 200, 92, C.hwL, C.hw, 2) + txt(130, 74, "CPU (HW)", 14, C.hw, ' font-weight="700"');
    s += box(46, 84, 168, 26, "#fff", "#ccc") + txt(130, 102, "load  [VA: v | offset]", 12.5, C.k, ' font-family="monospace" xml:space="preserve"');
    s += during(0, 2.5, box(80, 116, 100, 22, C.bL, C.b, 1) + txt(130, 132, "user mode", 12, C.b, ' font-weight="700"'));
    s += during(2.5, 9.5, box(80, 116, 100, 22, C.kL, C.k, 1) + txt(130, 132, "kernel mode", 12, C.k, ' font-weight="700"'));
    s += during(9.5, D, box(80, 116, 100, 22, C.bL, C.b, 1) + txt(130, 132, "user mode", 12, C.b, ' font-weight="700"'));
    s += during(2.5, 9.5, '<rect x="46" y="84" width="168" height="26" fill="none" stroke="' + C.hw + '" stroke-width="2" stroke-dasharray="4,3"/>' + txt(222, 102, "⏸", 13, C.hw, ' text-anchor="start"'));

    // TLB
    s += box(30, 176, 200, 120, "#fff", C.k, 2) + txt(130, 196, "TLB", 14, C.k, ' font-weight="700"');
    s += txt(85, 216, "VPN", 11.5, C.m) + txt(175, 216, "PFN", 11.5, C.m);
    [["a", "p"], ["b", "q"]].forEach(function (r, i) { s += txt(85, 238 + i * 22, r[0], 13, C.k) + txt(175, 238 + i * 22, r[1], 13, C.k); });
    s += during(7.5, D, '<rect x="40" y="269" width="180" height="20" fill="' + C.cL + '"/>' + txt(85, 284, "v", 13, C.c, ' font-weight="700"') + txt(175, 284, "f", 13, C.c, ' font-weight="700"'));
    s += during(1.5, 2.5, '<rect x="34" y="180" width="192" height="112" fill="none" stroke="' + C.hw + '" stroke-width="3" stroke-dasharray="6,4"/>' + txt(130, 312, "miss!", 14, C.hw, ' font-weight="700"'));
    s += during(10.2, 11, '<rect x="36" y="267" width="188" height="24" fill="none" stroke="' + C.b + '" stroke-width="3"/>' + txt(130, 312, "hit!", 14, C.b, ' font-weight="700"'));

    // OS trap handler
    s += box(300, 52, 210, 92, C.kL, C.k, 2) + txt(405, 76, "OS: TLB miss trap handler", 13.5, C.k, ' font-weight="700"');
    s += txt(405, 98, "(kernel mode 에서 실행)", 11.5, C.m);
    s += during(4, 9.5, '<rect x="296" y="48" width="218" height="100" rx="7" fill="none" stroke="' + C.c + '" stroke-width="3"/>' + txt(405, 128, "실행 중…", 13, C.c, ' font-weight="700"'));

    // Page table
    s += box(580, 52, 150, 92, C.cL, C.c, 2) + txt(655, 76, "Page Table", 13.5, C.c, ' font-weight="700"') + txt(655, 98, "(메모리)", 11.5, C.m) + txt(655, 124, "… v → f …", 13, C.c, ' font-weight="700"');

    // 단계 목록
    var steps = [
      ["HW", "① raises an exception (pause · kernel mode · jump to handler)", 2.5],
      ["OS", "② trap handler 가 호출된다", 4],
      ["OS", "③ page table 에서 translation 을 찾는다", 5],
      ["OS", "④ special privileged instruction 으로 TLB 갱신", 6.5],
      ["OS", "⑤ return from trap", 8],
      ["HW", "⑥ retry the instruction", 9.5]
    ];
    var SY = 176;
    s += during(0, 11, box(270, SY - 8, 470, 160, "#fff", "#ccc"));
    steps.forEach(function (st, i) {
      var y = SY + 14 + i * 25, ends = i < 5 ? steps[i + 1][2] : 11;
      var color = st[0] === "HW" ? C.hw : C.k;
      s += during(0, 11, txt(290, y, st[0], 12, color, ' text-anchor="start" font-weight="700"') + txt(326, y, st[1], 12.5, "#333", ' text-anchor="start"'));
      s += during(st[2], ends, '<rect x="276" y="' + (y - 16) + '" width="458" height="22" rx="3" fill="' + (st[0] === "HW" ? C.hwL : C.kL) + '" opacity="0.9"/>' +
        txt(290, y, st[0], 12, color, ' text-anchor="start" font-weight="700"') + txt(326, y, st[1], 12.5, "#111", ' text-anchor="start" font-weight="700"'));
    });

    // 토큰
    s += token("M130,110 L130,176", 1.5, 2.3, "VPN v", C.a);
    s += token("M230,90 L300,90", 2.5, 3.8, "exception", C.hw);
    s += token("M510,90 L580,90", 5, 5.7, "lookup", C.c);
    s += token("M580,120 L510,120", 5.8, 6.5, "f", C.c);
    s += token("M300,130 C260,160 260,250 230,270", 6.5, 7.5, "TLB write", C.k);
    s += token("M300,70 L230,70", 8, 9.2, "return", C.k);
    s += token("M130,110 L130,176", 9.6, 10.2, "retry", C.b);

    // 비교 (p.44)
    var CB = '';
    CB += box(270, SY - 8, 470, 160, "#fff", "#ccc");
    CB += txt(290, SY + 18, "Hardware-managed (x86, CR3)", 13, C.hw, ' text-anchor="start" font-weight="700"');
    CB += txt(290, SY + 40, "① PTBR → ② PTE → ③ 추출 → ④ TLB 갱신 → ⑤ retry", 12, "#333", ' text-anchor="start"');
    CB += '<rect x="290" y="' + (SY + 48) + '" width="60" height="14" fill="' + C.hw + '"/>' + txt(358, SY + 60, "(+) Efficient · (−) Complex CPU, 유연성 없음", 12, C.m, ' text-anchor="start"');
    CB += txt(290, SY + 92, "Software-managed (MIPS, RISC)", 13, C.k, ' text-anchor="start" font-weight="700"');
    CB += txt(290, SY + 114, "HW 는 예외만, ②~⑤ 는 OS 코드", 12, "#333", ' text-anchor="start"');
    CB += '<rect x="290" y="' + (SY + 122) + '" width="0" height="14" fill="' + C.k + '"><animate attributeName="width" values="0;200" begin="11.3s" dur="1.2s" fill="freeze"/></rect>' + txt(500, SY + 134, "(−) 느림 · (+) Simple, Flexible", 12, C.m, ' text-anchor="start"');
    s += during(11, D, CB);

    s += txt(380, 368, "software-managed 는 트랩 경로와 같다: HW 가 kernel 로 넘기고, OS 가 일하고, 돌아와 같은 명령을 재시도", 12.5, C.k, ' font-weight="700"');
    return s + '</svg>';
  }
};
