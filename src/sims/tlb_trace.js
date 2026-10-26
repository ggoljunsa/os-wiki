// tlb_trace — 15강 p.36: int a[10] 을 for 로 훑을 때 메모리 접근 횟수. 페이지 16바이트, int 4바이트, a[0] 은 VPN 6 의 offset 4.
// 옵션 tlb:
//   none — TLB 없음: a[i] 마다 PTE 읽기 1 + 데이터 1 = 20번 (p.36 "Without TLB")
//   tlb  — TLB 있음(처음엔 비어 있음): VPN 6·7·8 이 처음 나올 때만 miss → PTE 3번 + 데이터 10번 = 13번, hit rate 7/10
//   ctx  — TLB 있음 + a[5] 다음에 context switch 로 TLB flush(p.48) → 다시 돌아와 VPN 7 miss 한 번 더 → 14번
(function (global) {
  "use strict";
  global.SIMS = global.SIMS || {};
  var CODE = ["0: int sum = 0;            /* int = 4 bytes */", "1: for (i = 0; i < 10; i++) {", "2:     sum += a[i];", "3: }"];

  global.SIMS["tlb_trace"] = {
    title: "TLB 가 메모리 접근을 줄이는 과정 (15강 p.36)",
    desc: "a[0]~a[9] 는 VPN 6·7·8 세 페이지에 걸쳐 있다. TLB 가 없으면 a[i] 하나마다 PTE 를 메모리에서 읽어야 하지만, TLB 가 있으면 같은 페이지의 두 번째 접근부터 hit — spatial [[locality]]. → [[TLB]], [[TLB hit와 miss]]",
    options: [{ key: "tlb", label: "조건", values: [
      { value: "none", label: "TLB 없음 (20번)" }, { value: "tlb", label: "TLB 있음 (13번, hit 7/10)" }, { value: "ctx", label: "TLB 있음 + a[5] 뒤 context switch 로 flush" } ] }],
    build: function (opts) {
      var mode = opts.tlb || "tlb", tlb = [], mem = 0, hits = 0, miss = 0, steps = [];
      steps.push({ desc: "a[0] 은 가상 주소 6×16+4 = 100 (VPN 6, offset 4). int 4바이트, 페이지 16바이트 → 한 페이지에 int 4개. " + (mode === "none" ? "TLB 가 '''없다'''." : "TLB 는 처음엔 비어 있다."), pc: { C: 1 },
        vars: { i: "-", "a[i] 주소": "-", VPN: "-", "TLB": "(비어 있음)", "이번": "-", "메모리 접근 누계": 0, "hit / miss": "0 / 0" } });
      for (var i = 0; i < 10; i++) {
        if (mode === "ctx" && i === 6) {
          tlb = [];
          var f = { desc: "a[5] 다음에 '''context switch''' → OS(또는 하드웨어)가 TLB 를 flush(모든 valid 0, p.48). 다시 이 프로세스로 돌아왔다.", pc: { C: 2 },
            vars: { i: i, "a[i] 주소": "-", VPN: "-", "TLB": "(flush 됨)", "이번": "flush", "메모리 접근 누계": mem, "hit / miss": hits + " / " + miss } };
          f.note = "ASID 가 있으면(p.49) flush 없이 다른 프로세스 항목과 같이 둘 수 있다";
          steps.push(f);
        }
        var addr = 100 + 4 * i, vpn = addr >> 4, what;
        if (mode === "none") { mem += 2; what = "PTE 읽기(메모리) + a[" + i + "] 읽기 = 2번"; }
        else if (tlb.indexOf(vpn) >= 0) { hits++; mem += 1; what = "'''TLB hit''' → PTE 안 읽음, a[" + i + "] 만 = 1번"; }
        else { miss++; mem += 2; tlb.push(vpn); what = "'''TLB miss''' → PTE 를 메모리에서 읽어 TLB 에 넣고 a[" + i + "] 읽기 = 2번"; }
        steps.push({ desc: "i = " + i + ": a[" + i + "] 주소 " + addr + " → VPN " + vpn + ". " + what + ".", pc: { C: 3 },
          vars: { i: i, "a[i] 주소": addr, VPN: vpn, "TLB": mode === "none" ? "(없음)" : (tlb.length ? "VPN " + tlb.join(", ") : "(비어 있음)"), "이번": what.replace(/'''/g, ""), "메모리 접근 누계": mem, "hit / miss": hits + " / " + miss } });
      }
      var last = steps[steps.length - 1];
      last.note = mode === "none" ? "합계 20번 = a[i] 10 + PTE 10 (p.36 Without TLB)" : "합계 " + mem + "번 = a[i] 10 + PTE " + miss + " · hit rate " + hits + "/10" + (mode === "tlb" ? " (p.36 With TLB: 13번)" : "");
      return { panels: [{ id: "C", title: "p.36 코드", lang: "c", lines: CODE }],
        vars: [{ name: "i", group: "루프" }, { name: "a[i] 주소", group: "루프" }, { name: "VPN", group: "루프" }, { name: "TLB", group: "TLB" }, { name: "이번", group: "TLB" }, { name: "메모리 접근 누계", group: "합계" }, { name: "hit / miss", group: "합계" }],
        steps: steps };
    }
  };
})(typeof window !== "undefined" ? window : globalThis);
