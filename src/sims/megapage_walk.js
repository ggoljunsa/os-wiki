// megapage_walk — 과제 3 Problem 2: Sv39 VA 0x4053A8 를 4 KB 경로와 megapage(level-1 leaf) 경로로 변환.
// 가정값: level-2 table 0x87fff000, level-1 table 0x87ffe000, level-0 table 0x87ffd000,
//         4 KB frame 0x87f3c000, megapage 0x87600000 (2 MB 정렬), 어긋난 megapage 0x87601000.
// set: small(4 KB, 3 단계) / mega(level 1 에서 멈춤) / misaligned(PPN[0] ≠ 0 → page fault)
//      xv6_walk(원본 walk() 는 level-1 leaf 를 table 로 보고 한 번 더 내려간다 → pgpte 가 엉뚱한 값)
(function (global) {
  "use strict";
  global.SIMS = global.SIMS || {};

  var VA = 0x4053A8;
  function hex(n) { return "0x" + n.toString(16); }
  function pte(pa, fl) { return ((pa / 4096) * 1024) + fl; }   // PA2PTE(pa) | flags (32 bit 안이라 정수 연산으로 충분)
  var V = 1, R = 2, Wb = 4, U = 16;
  var L2T = 0x87fff000, L1T = 0x87ffe000, L0T = 0x87ffd000, F4 = 0x87f3c000, MEGA = 0x87600000, MIS = 0x87601000;
  var vpn2 = Math.floor(VA / 0x40000000) % 512, vpn1 = Math.floor(VA / 0x200000) % 512, vpn0 = Math.floor(VA / 0x1000) % 512;
  var off12 = VA % 0x1000, off21 = VA % 0x200000;

  var HW = [
    "satp → level-2 table 의 PA",                              // 1
    "level 2: pte = L2[VPN[2]]",                               // 2
    "  V 가 0 → page fault",                                   // 3
    "  R·W·X 중 하나라도 1 → leaf (1 GB gigapage)",            // 4
    "  아니면 next = PTE2PA(pte)",                             // 5
    "level 1: pte = L1[VPN[1]]",                               // 6
    "  R·W·X 중 하나라도 1 → leaf (2 MB megapage)",            // 7
    "    PPN[0] ≠ 0 → misaligned superpage → page fault",      // 8
    "    PA = PTE2PA(pte) + va[20:0]",                         // 9
    "  아니면 next = PTE2PA(pte)",                             // 10
    "level 0: pte = L0[VPN[0]]  (반드시 leaf)",                // 11
    "  PA = PTE2PA(pte) + va[11:0]"                            // 12
  ];
  var XV6 = [   // 원본 kernel/vm.c walk() (수정 전 그대로)
    "for(int level = 2; level > 0; level--) {",
    "  pte_t *pte = &pagetable[PX(level, va)];",
    "  if(*pte & PTE_V) {",
    "    pagetable = (pagetable_t)PTE2PA(*pte);",
    "  } else {",
    "    if(!alloc || (pagetable = (pde_t*)kalloc()) == 0)",
    "      return 0;",
    "    memset(pagetable, 0, PGSIZE);",
    "    *pte = PA2PTE(pagetable) | PTE_V;",
    "  }",
    "}",
    "return &pagetable[PX(0, va)];"
  ];

  var VARS = [
    { name: "VA", group: "가상 주소" }, { name: "VPN[2]", group: "가상 주소" }, { name: "VPN[1]", group: "가상 주소" },
    { name: "VPN[0]", group: "가상 주소" }, { name: "offset", group: "가상 주소" },
    { name: "L2 PTE", group: "읽은 PTE" }, { name: "L1 PTE", group: "읽은 PTE" }, { name: "L0 PTE", group: "읽은 PTE" },
    { name: "PA", group: "결과" }, { name: "메모리 접근", group: "결과" }
  ];

  function svgOf(st) {
    var o = '<svg viewBox="0 0 760 210" width="100%" style="max-width:760px" font-family="sans-serif">';
    // VA 칸
    var mega = st.split === 21;
    var fields = mega ? [["VPN[2]", 9, "#1d65b3"], ["VPN[1]", 9, "#2e9e4f"], ["offset 21 bit", 21, "#e09a40"]]
                      : [["VPN[2]", 9, "#1d65b3"], ["VPN[1]", 9, "#2e9e4f"], ["VPN[0]", 9, "#7a4fc0"], ["offset 12 bit", 12, "#e09a40"]];
    var x = 20, unit = 720 / 39;
    o += '<text x="20" y="16" font-size="12" fill="#555">VA ' + hex(VA) + ' 의 하위 39 bit</text>';
    fields.forEach(function (f) {
      var w = f[1] * unit, on = st.hl === f[0];
      o += '<rect x="' + x + '" y="24" width="' + w + '" height="30" fill="' + f[2] + '" fill-opacity="' + (on ? 0.45 : 0.15) + '" stroke="' + f[2] + '"/>';
      o += '<text x="' + (x + w / 2) + '" y="44" font-size="12" text-anchor="middle" fill="#222">' + f[0] + '</text>';
      x += w;
    });
    // 단계 상자
    var boxes = [["L2 table", st.lv >= 2], ["L1 table", st.lv >= 1], ["L0 table", st.lv >= 0 && !mega && st.used0], ["data", st.done]];
    var bx = 40;
    boxes.forEach(function (b, i) {
      var skip = i === 2 && mega;
      var col = skip ? "#ccc" : b[1] ? "#3b2f4a" : "#999";
      o += '<rect x="' + bx + '" y="86" width="140" height="44" rx="6" fill="' + (skip ? "#f4f4f4" : b[1] ? "#efe9f6" : "#fafafa") + '" stroke="' + col + '"' + (skip ? ' stroke-dasharray="4 3"' : '') + '/>';
      o += '<text x="' + (bx + 70) + '" y="' + 108 + '" font-size="13" text-anchor="middle" fill="' + col + '">' + (i === 3 ? (mega ? "2 MB page" : "4 KB page") : b[0]) + '</text>';
      o += '<text x="' + (bx + 70) + '" y="' + 124 + '" font-size="10" text-anchor="middle" fill="#777">' + (skip ? "읽지 않음" : st.sub[i] || "") + '</text>';
      if (i < 3) o += '<line x1="' + (bx + 140) + '" y1="108" x2="' + (bx + 180) + '" y2="108" stroke="' + (skip ? "#ccc" : "#666") + '" stroke-width="1.5"/>';
      bx += 180;
    });
    if (st.fault) o += '<text x="380" y="166" font-size="14" font-weight="700" text-anchor="middle" fill="#d6465f">' + st.fault + '</text>';
    else if (st.done) o += '<text x="380" y="166" font-size="14" font-weight="700" text-anchor="middle" fill="#1d6b2a">PA = ' + st.pa + '</text>';
    o += '<text x="380" y="196" font-size="11" text-anchor="middle" fill="#777">' + (mega ? "level-1 PTE 하나가 512 × 4 KB = 2 MB 를 덮는다. VPN[0] 은 offset 의 일부가 된다." : "level 0 까지 내려가면 PTE 하나가 4 KB 를 덮는다.") + '</text>';
    return o + '</svg>';
  }

  function run(set) {
    var steps = [], acc = 0;
    var vars = { VA: hex(VA), "VPN[2]": "?", "VPN[1]": "?", "VPN[0]": "?", offset: "?", "L2 PTE": "-", "L1 PTE": "-", "L0 PTE": "-", PA: "?", "메모리 접근": 0 };
    var st = { split: 12, lv: 3, used0: false, done: false, sub: [], hl: null, fault: null, pa: "" };
    var mega = set === "mega" || set === "misaligned";
    var leaf1 = mega ? (set === "mega" ? MEGA : MIS) : 0;
    var panel = set === "xv6_walk" ? "X" : "H";
    function push(desc, line, note) {
      var pc = {}; pc[panel] = line;
      var copy = {}; for (var k in vars) copy[k] = vars[k];
      var s2 = JSON.parse(JSON.stringify(st));
      steps.push({ desc: desc, pc: pc, vars: copy, note: note, svg: svgOf(s2) });
      st.hl = null;
    }
    vars["VPN[2]"] = vpn2; vars["VPN[1]"] = vpn1;
    if (mega) { vars["VPN[0]"] = "(offset 에 포함)"; vars.offset = hex(off21); st.split = 21; }
    else { vars["VPN[0]"] = vpn0; vars.offset = hex(off12); }

    if (set === "xv6_walk") {
      vars["VPN[0]"] = vpn0; vars.offset = hex(off12);
      st.lv = 2; st.hl = "VPN[2]"; acc++; vars["메모리 접근"] = acc; vars["L2 PTE"] = hex(pte(L1T, V)); st.sub = ["idx " + vpn2];
      push("superpage 를 매핑한 뒤 원본 walk() 로 pgpte(" + hex(VA) + ") 를 부른다. level 2.", 2);
      push("V 가 켜져 있다. 다음 table = " + hex(L1T) + ".", 4);
      st.lv = 1; st.hl = "VPN[1]"; acc++; vars["메모리 접근"] = acc; vars["L1 PTE"] = hex(pte(MEGA, V | R | Wb | U)); st.sub[1] = "idx " + vpn1;
      push("level 1: L1[" + vpn1 + "] 은 R·W 가 켜진 leaf 다. 원본 코드는 V 만 본다.", 2);
      push("leaf 의 PPN(" + hex(MEGA) + ")을 table 주소로 잘못 쓴다.", 4, "superpage 의 데이터 page 를 page table 로 착각했다.");
      st.lv = 0; st.used0 = true; st.sub[2] = "실은 user 데이터";
      vars["L0 PTE"] = hex(MEGA + vpn0 * 8) + " 의 값";
      push("&pagetable[" + vpn0 + "] = " + hex(MEGA + vpn0 * 8) + " 를 PTE 로 돌려준다.", 12);
      vars.PA = "엉뚱한 값";
      st.fault = "pgpte 가 데이터 8 B 를 PTE 라고 돌려준다";
      push("0 으로 채운 page 면 0 → \"error: no pte\". 아니면 VA 마다 값이 달라 \"pte different\".", 12,
        "level 1 에서 leaf 를 만나면 멈추도록 walk 를 고쳐야 superpg 테스트가 통과한다.");
      return { panels: [{ id: "X", title: "원본 xv6 walk() (vm.c)", lang: "c", lines: XV6 }], steps: steps };
    }

    push(mega ? "VA 를 VPN[2] 9 | VPN[1] 9 | offset 21 로 나눈다. megapage 라면 이렇게 읽힌다."
              : "VA 를 VPN[2] 9 | VPN[1] 9 | VPN[0] 9 | offset 12 로 나눈다.", 1);
    st.lv = 2; st.hl = "VPN[2]"; acc++; vars["메모리 접근"] = acc; vars["L2 PTE"] = hex(pte(L1T, V)); st.sub = ["idx " + vpn2];
    push("L2[" + vpn2 + "] 를 읽는다. V=1, R=W=X=0 이라 branch.", 2);
    push("다음 table = PTE2PA = " + hex(L1T) + ".", 5);
    st.lv = 1; st.hl = "VPN[1]"; acc++; vars["메모리 접근"] = acc; st.sub[1] = "idx " + vpn1;
    if (mega) {
      vars["L1 PTE"] = hex(pte(leaf1, V | R | Wb | U));
      push("L1[" + vpn1 + "] = " + vars["L1 PTE"] + ". R·W 가 켜져 있어 leaf 다.", 7);
      if (set === "misaligned") {
        st.fault = "misaligned superpage → page fault";
        push("PPN = " + hex(MIS) + " 의 PPN[0] 이 1 이다. 2 MB 정렬이 아니다.", 8,
          "HW 가 원래 접근 종류의 page fault 를 낸다. superalloc 은 2 MB 정렬 주소만 줘야 한다.");
        return { panels: [{ id: "H", title: "Sv39 하드웨어 walk", lang: "txt", lines: HW }], steps: steps };
      }
      push("PPN[0] = 0. " + hex(MEGA) + " 는 2 MB 정렬이다.", 8);
      st.done = true; st.pa = hex(MEGA + off21); st.hl = "offset 21 bit"; vars.PA = st.pa;
      push("PA = " + hex(MEGA) + " + " + hex(off21) + " = " + st.pa + ". level 0 은 읽지 않는다.", 9);
    } else {
      vars["L1 PTE"] = hex(pte(L0T, V));
      push("L1[" + vpn1 + "] = " + vars["L1 PTE"] + ". R=W=X=0, branch.", 7);
      push("다음 table = " + hex(L0T) + ".", 10);
      st.lv = 0; st.used0 = true; st.hl = "VPN[0]"; acc++; vars["메모리 접근"] = acc; st.sub[2] = "idx " + vpn0;
      vars["L0 PTE"] = hex(pte(F4, V | R | Wb | U));
      push("L0[" + vpn0 + "] = " + vars["L0 PTE"] + ". leaf.", 11);
      st.done = true; st.pa = hex(F4 + off12); st.hl = "offset 12 bit"; vars.PA = st.pa;
      push("PA = " + hex(F4) + " + " + hex(off12) + " = " + st.pa + ".", 12);
    }
    acc++; vars["메모리 접근"] = acc;
    push("마지막으로 data 를 읽는다. 메모리 접근 " + acc + " 번 (TLB miss 가정).", mega ? 9 : 12);
    return { panels: [{ id: "H", title: "Sv39 하드웨어 walk", lang: "txt", lines: HW }], steps: steps };
  }

  global.SIMS["megapage_walk"] = {
    title: "Sv39 megapage walk — level 1 에서 멈추는 주소 변환 (과제 3 Problem 2)",
    desc: "VA 0x4053A8 을 4 KB 경로와 [[superpage|megapage]] 경로로 변환한다. table 주소와 frame 주소는 가정값이다. 원본 xv6 `walk()` 가 superpage 에서 왜 틀린 값을 주는지도 본다. → [[Sv39 PTE]]",
    options: [
      {
        key: "set", label: "경우",
        values: [
          { value: "small", label: "small: 4 KB page (level 0 까지)" },
          { value: "mega", label: "mega: 2 MB megapage (level 1 leaf)" },
          { value: "misaligned", label: "misaligned: PPN[0] ≠ 0 인 level-1 leaf" },
          { value: "xv6_walk", label: "xv6_walk: 원본 walk() 로 megapage 를 읽으면" }
        ]
      }
    ],
    build: function (opts) {
      var r = run(opts.set || "small");
      return { panels: r.panels, vars: VARS, steps: r.steps };
    }
  };
})(typeof window !== "undefined" ? window : globalThis);
