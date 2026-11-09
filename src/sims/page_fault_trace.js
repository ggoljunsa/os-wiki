// page_fault_trace — 17강 p.18~23, p.50: VP 3 접근 → page fault → VP 4 evict → VP 3 swap in → 재실행.
(function (global) {
  "use strict";
  global.SIMS = global.SIMS || {};
  global.SIMS["page_fault_trace"] = {
    title: "Page fault 한 번 따라가기 (17강 p.18~23)",
    desc: "page fault 처리 순서를 따라간다. → [[page fault]]",
    options: [{ key: "victim", label: "Victim VP 4", values: [{ value: "clean", label: "clean (쓰기 없음)" }, { value: "dirty", label: "dirty (디스크에 write back)" }] }],
    build: function (opts) {
      var dirty = opts.victim === "dirty";
      var st = { "PTE 3": "0 / disk", "PTE 4": "1 / PP 3", "PP 3": "VP 4", "디스크 I/O": 0, "모드": "user" };
      var steps = [];
      function add(desc, hw, os, ch) {
        for (var k in ch) st[k] = ch[k];
        steps.push({ desc: desc, pc: { HW: hw, OS: os }, vars: JSON.parse(JSON.stringify(st)) });
      }
      add("1. Reference: `Load M` 이 VP 3 참조", 1, null, {});
      add("2. Trap: PTE 3 valid = 0 → page fault", 2, null, { "모드": "kernel" });
      add("3. disk address 로 저장소 확인", null, 1, {});
      add("victim = VP 4 (빈 frame 없음, p.20)", null, 2, {});
      if (dirty) add("VP 4 dirty → 디스크에 write back (p.50)", null, 3, { "디스크 I/O": 1 });
      else add("VP 4 clean → 쓰기 없이 버림 (p.50)", null, 3, {});
      add("PTE 4 = valid 0, disk address", null, 4, { "PTE 4": "0 / disk" });
      add("4. VP 3 을 디스크에서 PP 3 으로 읽음", null, 5, { "PP 3": "VP 3", "디스크 I/O": dirty ? 2 : 1 });
      add("5. PTE 3 = valid 1, PP 3 (p.21)", null, 6, { "PTE 3": "1 / PP 3" });
      add("return-from-trap", null, 7, { "모드": "user" });
      add("6. 같은 명령 재실행 → page hit (p.22)", 3, null, {});
      return {
        panels: [
          { id: "HW", title: "Hardware", lang: "txt", lines: ["reference VP 3", "PTE.valid == 0 → page fault", "restart the instruction → page hit"] },
          { id: "OS", title: "OS page-fault handler", lang: "txt", lines: ["check storage (disk address)", "select victim (VP 4)", "if dirty: write back to disk", "PTE 4: valid = 0, disk address", "read VP 3 from disk into PP 3", "PTE 3: valid = 1, PP 3", "return from trap"] }
        ],
        vars: [{ name: "PTE 3", group: "Page table" }, { name: "PTE 4", group: "Page table" }, { name: "PP 3", group: "DRAM" }, { name: "디스크 I/O", group: "비용" }, { name: "모드", group: "CPU" }],
        steps: steps };
    }
  };
})(typeof window !== "undefined" ? window : globalThis);
