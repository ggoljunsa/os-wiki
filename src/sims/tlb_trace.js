// tlb_trace — 15강 p.36: int a[10] 을 for 로 훑을 때 메모리 접근 횟수. 페이지 16바이트, int 4바이트, a[0] 은 VPN 6 의 offset 4.
// 옵션 tlb:
//   none — TLB 없음: a[i] 마다 PTE 읽기 1 + 데이터 1 = 20번 (p.36 "Without TLB")
//   tlb  — TLB 있음(처음엔 비어 있음): VPN 6·7·8 이 처음 나올 때만 miss → PTE 3번 + 데이터 10번 = 13번, hit rate 7/10
//   ctx  — TLB 있음 + a[5] 다음에 context switch 로 TLB flush(p.48) → 다시 돌아와 VPN 7 miss 한 번 더 → 14번
(function (global) {
  "use strict";
  global.SIMS = global.SIMS || {};
  var CODE = ["0: int sum = 0;", "1: for (i = 0; i < 10; i++) {", "2:     sum += a[i];", "3: }"];

  global.SIMS["tlb_trace"] = {
    title: "TLB 가 메모리 접근을 줄이는 과정 (15강 p.36)",
    desc: "a[10] 순회의 메모리 접근 수를 센다. → [[TLB]]",
    options: [{ key: "tlb", label: "조건", values: [
      { value: "none", label: "TLB 없음 (20번)" }, { value: "tlb", label: "TLB 있음 (13번, hit 7/10)" }, { value: "ctx", label: "TLB 있음 + a[5] 뒤 context switch 로 flush" } ] }],
    build: function (opts) {
      var mode = opts.tlb || "tlb", tlb = [], mem = 0, hits = 0, miss = 0, steps = [];
      function add(desc, line, i, addr, vpn) {
        steps.push({ desc: desc, pc: { C: line },
          vars: { i: i, "a[i] 주소": addr, VPN: vpn, "TLB": mode === "none" ? "(없음)" : (tlb.length ? "VPN " + tlb.join(", ") : "(비어 있음)"), "메모리 접근 누계": mem, "hit / miss": hits + " / " + miss } });
      }
      add("a[0] = 100, page 16B, int 4B" + (mode === "none" ? ", TLB 없음" : ", TLB 비어 있음"), 1, "-", "-", "-");
      for (var i = 0; i < 10; i++) {
        if (mode === "ctx" && i === 6) {
          tlb = [];
          add("context switch → TLB flush", 2, i, "-", "-");
        }
        var addr = 100 + 4 * i, vpn = addr >> 4;
        add("a[" + i + "] 주소 = 100 + 4 × " + i + " = " + addr, 3, i, addr, "-");
        add("VPN = " + addr + " >> 4 = " + vpn, 3, i, addr, vpn);
        var what;
        if (mode === "none") { mem += 2; what = "TLB 없음: PTE 1 + 데이터 1 = 2번"; }
        else if (tlb.indexOf(vpn) >= 0) { hits++; mem += 1; what = "TLB hit: 데이터 1번"; }
        else { miss++; mem += 2; tlb.push(vpn); what = "TLB miss: PTE 1 + 데이터 1 = 2번"; }
        add(what, 3, i, addr, vpn);
      }
      return { panels: [{ id: "C", title: "p.36 코드", lang: "c", lines: CODE }],
        vars: [{ name: "i", group: "루프" }, { name: "a[i] 주소", group: "루프" }, { name: "VPN", group: "루프" }, { name: "TLB", group: "TLB" }, { name: "메모리 접근 누계", group: "합계" }, { name: "hit / miss", group: "합계" }],
        steps: steps };
    }
  };
})(typeof window !== "undefined" ? window : globalThis);
