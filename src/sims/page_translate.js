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
      assume: "가정: page 16B, VPN 2비트 | offset 4비트, PT 0→3 1→7 2→5 3→2",
      list: [{ va: 21 }, { va: 0 }, { va: 40 }, { va: 63 }] },
    quiz: { page: 4, vbits: 4, pt: { 0: [5, 1, "RW"], 1: [6, 1, "RW"], 2: [1, 1, "RW"], 3: [2, 1, "RW"] }, showProt: false,
      assume: "가정: page 4B, VPN 2비트 | offset 2비트, PT 0→5 1→6 2→1 3→2",
      list: [{ va: 0, ch: "a" }, { va: 3, ch: "d" }, { va: 9, ch: "j" }, { va: 13, ch: "n" }] },
    valid: { page: 2048, vbits: 14, pt: { 0: [5, 1, "RE"], 2: [2, 1, "RW"], 7: [7, 1, "RW"] }, showProt: true,
      assume: "가정: page 2KB, VPN 3비트 | offset 11비트, VPN 0·2·7 만 valid",
      list: [{ va: 100, w: false }, { va: 4106, w: true }, { va: 15360, w: true }, { va: 2052, w: false }, { va: 100, w: true }] }
  };
  var HW = [
    "VPN = VA / page_size;",
    "offset = VA % page_size;",
    "PTE = PageTable[VPN];",
    "if (!PTE.valid) fault;",
    "if (write && !PTE.prot.W) protection fault;",
    "PA = PTE.PFN * page_size + offset;"
  ];

  function bits(v, n) { var s = v.toString(2); while (s.length < n) s = "0" + s; return s; }
  function log2(x) { var k = 0; while ((1 << k) < x) k++; return k; }

  global.SIMS["page_translate"] = {
    title: "페이징 주소 변환 — VPN·offset·PFN (15강 p.13~22)",
    desc: "VPN 을 PFN 으로 바꾸고 offset 을 붙인다. → [[페이징]]",
    options: [{ key: "set", label: "예제", values: [
      { value: "simple", label: "p.14 — 64B 주소 공간, 16B 페이지 (VA 21 → 117)" },
      { value: "quiz", label: "p.18 Quiz — 4B 페이지 (VA 0·3·9·13)" },
      { value: "valid", label: "p.22 — 2KB 페이지 + valid·protection" } ] }],
    build: function (opts) {
      var S = SETS[opts.set] || SETS.simple;
      var ob = log2(S.page), vb = S.vbits - ob, steps = [];
      function add(desc, line, v, note) {
        var st = { desc: desc, pc: { HW: line }, vars: Object.assign({}, v) };
        if (note) st.note = note;
        steps.push(st);
      }
      add(S.assume, null, { VA: "-", VPN: "-", offset: "-", PTE: "-", PA: "-" });
      S.list.forEach(function (e) {
        var vpn = Math.floor(e.va / S.page), off = e.va % S.page, b = bits(e.va, S.vbits);
        var v = { VA: e.va + (S.showProt ? (e.w ? " (store)" : " (load/fetch)") : ""), VPN: "-", offset: "-", PTE: "-", PA: "-" };
        add("VA = " + e.va + " = " + b.slice(0, vb) + " | " + b.slice(vb), null, v);
        v.VPN = vpn;
        add("VPN = " + e.va + " / " + S.page + " = " + vpn, 1, v);
        v.offset = off;
        add("offset = " + e.va + " % " + S.page + " = " + off, 2, v);
        var pte = S.pt[vpn];
        if (!pte) {
          v.PTE = "valid 0";
          add("PTE[" + vpn + "].valid = 0 → fault", 4, v, "invalid page");
          return;
        }
        v.PTE = "PFN " + pte[0] + ", valid " + pte[1] + (S.showProt ? ", " + pte[2] : "");
        add("PTE[" + vpn + "] = " + v.PTE, 3, v);
        if (e.w && pte[2].indexOf("W") < 0) {
          add("store, prot " + pte[2] + " → protection fault", 5, v, "protection fault");
          return;
        }
        var pa = pte[0] * S.page + off;
        v.PA = pa;
        add("PA = " + pte[0] + " × " + S.page + " + " + off + " = " + pa + (e.ch ? " (" + e.ch + ")" : ""), 6, v);
      });
      return { panels: [{ id: "HW", title: "MMU", lang: "c", lines: HW }],
        vars: [{ name: "VA", group: "가상" }, { name: "VPN", group: "가상" }, { name: "offset", group: "가상" }, { name: "PTE", group: "페이지 테이블" }, { name: "PA", group: "물리" }], steps: steps };
    }
  };
})(typeof window !== "undefined" ? window : globalThis);
