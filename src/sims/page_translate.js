// page_translate — 15강 p.13~22: 가상 주소를 VPN + offset 으로 나누고, 페이지 테이블에서 PFN 을 찾아 PA = PFN × page size + offset
// 옵션 set:
//   simple — p.12~16: 64바이트 주소 공간, 16바이트 페이지(VPN 2비트, offset 4비트), PT 0→3, 1→7, 2→5, 3→2. VA 21 → PFN 7 → 117 (p.14)
//   quiz   — p.18 Quiz: 4바이트 페이지(VPN 2비트, offset 2비트), PT 0→5, 1→6, 2→1, 3→2. VA 0·3·9·13 → 20·23·5·9
//   valid  — p.22: 16KB 주소 공간, 2KB 페이지(VPN 3비트, offset 11비트), PTE (PFN, valid, prot): 0=(5,1,RE) 2=(2,1,RW) 7=(7,1,RW), 나머지 valid 0.
//            VA 100 → 10340, 4106(store) → 4106, 15KB(store) → 15KB, 2052 → invalid, VA 100 store → protection fault
(function (global) {
  "use strict";
  global.SIMS = global.SIMS || {};

  var SETS = {
    simple: { page: 16, vbits: 6, pt: { 0: [3, 1, "RW"], 1: [7, 1, "RW"], 2: [5, 1, "RW"], 3: [2, 1, "RW"] }, showProt: false,
      intro: "p.12 — 64바이트 주소 공간(페이지 4개), 페이지 16바이트, 물리 메모리 128바이트(page frame 8개). 페이지 테이블(p.15): VPN 0→3, 1→7, 2→5, 3→2.",
      list: [{ va: 21, why: "p.14 의 그 예제" }, { va: 0, why: "page 0 의 첫 바이트" }, { va: 40, why: "page 2 의 offset 8" }, { va: 63, why: "주소 공간의 마지막 바이트" }] },
    quiz: { page: 4, vbits: 4, pt: { 0: [5, 1, "RW"], 1: [6, 1, "RW"], 2: [1, 1, "RW"], 3: [2, 1, "RW"] }, showProt: false,
      intro: "p.18 Quiz — 16바이트 논리 메모리, 4바이트 페이지 → VPN 2비트, offset 2비트. 페이지 테이블 0→5, 1→6, 2→1, 3→2. 물리 주소의 글자를 맞히는 문제.",
      list: [{ va: 0, why: "→ a (at 20)" }, { va: 3, why: "→ d (at 23)" }, { va: 9, why: "→ j (at 5)" }, { va: 13, why: "→ n (at 9)" }] },
    valid: { page: 2048, vbits: 14, pt: { 0: [5, 1, "RE"], 2: [2, 1, "RW"], 7: [7, 1, "RW"] }, showProt: true,
      intro: "p.22 — 16KB 주소 공간, 2KB 페이지 → VPN 3비트(페이지 8개), offset 11비트. PTE = (PFN, Valid, Prot): VPN0 = (5, 1, RE) code, VPN2 = (2, 1, RW) heap, VPN7 = (7, 1, RW) stack, 나머지는 Valid 0.",
      list: [{ va: 100, w: false, why: "code 페이지에서 fetch" }, { va: 4106, w: true, why: "heap 에 store" }, { va: 15360, w: true, why: "stack 에 store" },
        { va: 2052, w: false, why: "code 와 heap 사이(VPN 1) 접근" }, { va: 100, w: true, why: "code 페이지에 store" }] }
  };
  var HW = [
    "// MMU + 페이지 테이블 (p.17, p.21)",
    "VPN    = VA / page_size;     // 위 비트",
    "offset = VA % page_size;     // 아래 비트 (VPO)",
    "PTE    = PageTable[VPN];     // 메모리에 있는 표를 한 번 읽음",
    "if (!PTE.valid) fault;       // 쓰지 않는 페이지",
    "if (write && !PTE.prot.W) protection fault;",
    "PA = PTE.PFN * page_size + offset;   // offset 은 그대로"
  ];

  function bits(v, n) { var s = v.toString(2); while (s.length < n) s = "0" + s; return s; }
  function log2(x) { var k = 0; while ((1 << k) < x) k++; return k; }

  global.SIMS["page_translate"] = {
    title: "페이징 주소 변환 — VPN·offset·PFN (15강 p.13~22)",
    desc: "가상 주소의 위 비트(VPN)로 [[페이지 테이블]]의 PTE 를 찾아 PFN 으로 바꾸고, 아래 비트 offset 은 그대로 붙인다. valid 0 이면 fault, 쓰기인데 RE 면 protection fault. → [[페이징]], [[VPN과 offset]]",
    options: [{ key: "set", label: "예제", values: [
      { value: "simple", label: "p.14 — 64B 주소 공간, 16B 페이지 (VA 21 → 117)" },
      { value: "quiz", label: "p.18 Quiz — 4B 페이지 (VA 0·3·9·13)" },
      { value: "valid", label: "p.22 — 2KB 페이지 + valid·protection" } ] }],
    build: function (opts) {
      var S = SETS[opts.set] || SETS.simple;
      var ob = log2(S.page), vb = S.vbits - ob, steps = [];
      steps.push({ desc: S.intro + " → VPN " + vb + "비트 + offset " + ob + "비트.", pc: { HW: 1 },
        vars: { VA: "-", "VPN | offset": "-", PTE: "-", PA: "-" } });
      S.list.forEach(function (e) {
        var vpn = Math.floor(e.va / S.page), off = e.va % S.page, b = bits(e.va, S.vbits);
        var v = { VA: e.va + (S.showProt ? (e.w ? " (store)" : " (load/fetch)") : ""), "VPN | offset": b.slice(0, vb) + " | " + b.slice(vb) + "  → VPN " + vpn + ", offset " + off, PTE: "-", PA: "-" };
        steps.push({ desc: "'''VA " + e.va + "''' (" + e.why + ") = " + b.slice(0, vb) + " | " + b.slice(vb) + " → VPN '''" + vpn + "''', offset '''" + off + "'''.", pc: { HW: 3 }, vars: Object.assign({}, v) });
        var pte = S.pt[vpn];
        if (!pte) {
          v.PTE = "VPN " + vpn + ": valid 0"; var st = { desc: "PTE 의 valid 비트가 0 — 이 페이지는 주소 공간에서 쓰지 않는다 → '''fault'''(OS 가 보통 프로세스를 종료).", pc: { HW: 5 }, vars: v }; st.note = "invalid page"; steps.push(st); return;
        }
        v.PTE = "PFN " + pte[0] + ", valid " + pte[1] + (S.showProt ? ", " + pte[2] : "");
        if (e.w && pte[2].indexOf("W") < 0) {
          var st2 = { desc: "valid 는 1 이지만 store 인데 보호 비트가 '''" + pte[2] + "''' → '''protection fault'''(p.25: code 수정은 MMU 가 막는다).", pc: { HW: 6 }, vars: v }; st2.note = "protection fault"; steps.push(st2); return;
        }
        var pa = pte[0] * S.page + off;
        v.PA = pa + " = " + pte[0] + " × " + S.page + " + " + off + "  (" + bits(pte[0], log2(Math.max(2, pte[0] + 1)) < 3 && S.vbits < 8 ? 3 : 0) + (S.vbits < 8 ? " | " + bits(off, ob) : "") + ")";
        if (S.vbits >= 8) v.PA = pa + " = " + pte[0] + " × " + S.page + " + " + off;
        steps.push({ desc: "PTE → PFN '''" + pte[0] + "'''. PA = PFN × " + S.page + " + offset = '''" + pa + "''' — offset " + off + " 은 변환 없이 그대로.", pc: { HW: 7 }, vars: v });
      });
      return { panels: [{ id: "HW", title: "MMU", lang: "c", lines: HW }],
        vars: [{ name: "VA", group: "가상" }, { name: "VPN | offset", group: "가상" }, { name: "PTE", group: "페이지 테이블" }, { name: "PA", group: "물리" }], steps: steps };
    }
  };
})(typeof window !== "undefined" ? window : globalThis);
