// ============================================================
// tlb_lookup — TLB hit 은 메모리 1번, TLB miss 는 페이지 테이블(메모리)을 한 번 더 읽어 2번 (15강 p.33~35, p.38)
// 시간축(초): 0~1.5 구성(CPU · MMU 안 TLB · 메모리 안 page table 과 data) → 1.5~6 hit: VPN 27 → TLB 병렬 검색 → PFN 59 → 메모리 1번
//   → 6~12 miss: VPN 40 → TLB 에 없음 → PTEA 로 page table 읽기(메모리 1번째) → PTE(PFN 12) → TLB 갱신 → PA → data(2번째)
//   → 12~13 요점
// ============================================================
window.ANIMS = window.ANIMS || {};
ANIMS["tlb_lookup"] = {
  title: "TLB — hit 이면 메모리 1번, miss 면 page table 을 한 번 더 읽어 2번",
  desc: "[[TLB]] 는 MMU 안의 작은 하드웨어 캐시로, 자주 쓰는 VPN → PFN 번역(PTE)을 담는다. hit 이면 page table 을 안 읽고 바로 PA 를 만든다(p.34). miss 면 메모리의 [[페이지 테이블]]에서 PTE 를 읽어 TLB 에 넣은 뒤 다시 한다(p.35) — [[TLB hit와 miss]]",
  duration: 13,
  build: function () {
    var D = 13;
    var C = { a: "#1d65b3", aL: "#dbe8f7", b: "#2e9e4f", bL: "#dff3e4", c: "#e09a40", cL: "#fdeec2", cpu: "#3b2f4a", cpuL: "#efe9f6", hw: "#d6465f", muted: "#777" };
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
      return '<g opacity="0"><circle r="7" fill="' + color + '"/>' + txt(0, -11, label, 11, color, ' font-weight="700"') +
        '<animateMotion path="' + path + '" begin="' + from + 's" dur="' + r3(to - from) + 's" fill="freeze"/>' + show(from, to) + '</g>';
    }

    var s = '<svg viewBox="0 0 760 360" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="TLB hit miss 애니메이션">';
    [
      [0, 1.5, "CPU 가 VA(VPN | VPO)를 MMU 에 준다. MMU 안에는 TLB, 메모리 안에는 page table 과 data"],
      [1.5, 3.2, "① VA 의 VPN 27 로 TLB 를 병렬 검색 (fully associative, p.38)"],
      [3.2, 4.6, "TLB hit — 27 → PFN 59. page table 을 읽지 않는다"],
      [4.6, 6, "PA = 59 | VPO → 메모리에서 data 1번 읽기 → 메모리 접근 1번"],
      [6, 7.4, "② VPN 40 — TLB 에 없다 → TLB miss"],
      [7.4, 8.8, "PTBR + VPN 으로 PTE 주소(PTEA)를 만들어 메모리의 page table 을 읽는다 (1번째 메모리 접근)"],
      [8.8, 10.4, "PTE(PFN 12)를 TLB 에 넣는다 — 다음 접근부터는 hit"],
      [10.4, 12, "PA = 12 | VPO → data 읽기 (2번째 메모리 접근)"],
      [12, D, "hit: 메모리 1번 · miss: 2번. 프로그램은 locality 가 있어 miss 가 드물다(p.35)"]
    ].forEach(function (c) { s += during(c[0], c[1], txt(380, 24, c[2], 12.5, "#222", ' font-weight="700"')); });

    // CPU
    s += box(30, 150, 90, 60, "#f7d8dc", C.hw) + txt(75, 185, "CPU", 15, C.hw, ' font-weight="700"');
    // MMU + TLB
    s += box(180, 70, 250, 230, C.cpuL, C.cpu) + txt(305, 92, "MMU (CPU chip)", 13, C.cpu, ' font-weight="700"');
    s += box(220, 110, 170, 150, "#fff", C.cpu) + txt(305, 128, "TLB", 12, C.cpu, ' font-weight="700"');
    s += txt(265, 148, "VPN", 11, C.muted) + txt(345, 148, "PFN", 11, C.muted);
    var rows = [["19", "14"], ["37", "90"], ["27", "59"], ["—", "—"]];
    rows.forEach(function (r, i) {
      var y = 168 + i * 22;
      s += txt(265, y, r[0], 12, C.cpu) + txt(345, y, r[1], 12, C.cpu);
    });
    // 새 항목 (miss 뒤)
    s += during(8.8, D, '<rect x="226" y="221" width="158" height="20" fill="' + C.cL + '"/>' + txt(265, 234, "40", 12, C.c, ' font-weight="700"') + txt(345, 234, "12", 12, C.c, ' font-weight="700"'));
    // hit 강조
    s += during(3.2, 6, '<rect x="226" y="199" width="158" height="20" fill="none" stroke="' + C.b + '" stroke-width="2.5"/>');
    // miss 표시
    s += during(6, 8.8, '<rect x="222" y="112" width="166" height="146" fill="none" stroke="' + C.hw + '" stroke-width="3" stroke-dasharray="6,4"/>' + txt(305, 278, "miss!", 14, C.hw, ' font-weight="700"'));

    // Memory
    s += box(530, 60, 200, 260, "#f6f6f6", "#999") + txt(630, 82, "Memory", 13, C.cpu, ' font-weight="700"');
    s += box(550, 100, 160, 90, C.cL, C.c) + txt(630, 120, "Page Table", 12, C.c, ' font-weight="700"') + txt(630, 145, "… 40 → 12 …", 12, C.c) + txt(630, 168, "(PTBR 가 가리킴)", 10.5, C.muted);
    s += box(550, 210, 160, 90, C.bL, C.b) + txt(630, 260, "Data (page frames)", 12, C.b, ' font-weight="700"');

    // 메모리 접근 카운터
    s += during(4.6, 6, txt(630, 345, "메모리 접근 1번", 13, C.b, ' font-weight="700"'));
    s += during(7.4, 10.4, txt(630, 345, "메모리 접근 1번째 (PTE)", 13, C.c, ' font-weight="700"'));
    s += during(10.4, D, txt(630, 345, "메모리 접근 2번째 (data)", 13, C.hw, ' font-weight="700"'));

    // 토큰: hit
    s += token("M120,170 L222,208", 1.5, 3.2, "VPN 27", C.a);
    s += token("M384,208 L430,208 L520,250 L552,250", 4.6, 6, "PA 59|VPO", C.b);
    // 토큰: miss
    s += token("M120,190 L222,240", 6, 7.4, "VPN 40", C.a);
    s += token("M430,150 L552,150", 7.4, 8.4, "PTEA", C.c);
    s += token("M552,160 L440,200 L384,230", 8.4, 9.8, "PTE 12", C.c);
    s += token("M384,232 L430,232 L520,265 L552,265", 10.4, 12, "PA 12|VPO", C.hw);

    return s + '</svg>';
  }
};
