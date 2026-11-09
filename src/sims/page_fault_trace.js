// page_fault_trace — 17강 p.18~23, p.50: VP 3 접근 → page fault → VP 4 evict → VP 3 swap in → 재실행.
(function (global) {
  "use strict";
  global.SIMS = global.SIMS || {};
  global.SIMS["page_fault_trace"] = {
    title: "Page fault 한 번 따라가기 (17강 p.18~23)",
    desc: "VP 3 은 디스크에 있고 DRAM 의 PP 3 에는 VP 4 가 있다. 옵션으로 victim 이 clean 인지 dirty 인지 바꿔 디스크 쓰기 차이를 본다. → [[page fault]]",
    options: [{ key: "victim", label: "Victim VP 4", values: [{ value: "clean", label: "clean (쓰기 없음)" }, { value: "dirty", label: "dirty (디스크에 write back)" }] }],
    build: function (opts) {
      var dirty = opts.victim === "dirty";
      var st = { "PTE 3": "0 / disk", "PTE 4": "1 / PP 3", "PP 3": "VP 4", "디스크 I/O": 0, "모드": "user" };
      var steps = [];
      function add(desc, hw, os, ch, note) {
        for (var k in ch) st[k] = ch[k];
        var s = { desc: desc, pc: { HW: hw, OS: os }, vars: JSON.parse(JSON.stringify(st)) };
        if (note) s.note = note;
        steps.push(s);
      }
      add("명령 `Load M` 이 VP 3 의 주소를 참조한다 (1. Reference).", 1, null, {});
      add("PTE 3 의 valid 가 0 → '''page fault''' (exception). 2. Trap, kernel mode 로.", 2, null, { "모드": "kernel" });
      add("3. OS 가 PTE 의 disk address 로 page 가 저장소에 있는지 확인한다.", null, 1, {});
      add("빈 frame 이 없어 교체 정책으로 '''victim VP 4''' 를 고른다 (p.20).", null, 2, {});
      if (dirty) add("VP 4 는 dirty → 디스크에 '''write back''' (p.50).", null, 3, { "디스크 I/O": 1 });
      else add("VP 4 는 clean → 디스크 쓰기 없이 버린다 (\"the eviction is free\", p.50).", null, 3, {});
      add("PTE 4 를 valid 0, disk address 로 바꾼다.", null, 4, { "PTE 4": "0 / disk" });
      add("4. VP 3 을 디스크에서 PP 3 으로 읽어 온다.", null, 5, { "PP 3": "VP 3", "디스크 I/O": dirty ? 2 : 1 });
      add("5. PTE 3 을 valid 1, PP 3 으로 고친다 (Reset Page Table, p.21).", null, 6, { "PTE 3": "1 / PP 3" });
      add("OS 가 return-from-trap.", null, 7, { "모드": "user" });
      add("6. 같은 명령을 '''재실행''' → 이번엔 page hit (p.22).", 3, null, {}, "디스크 I/O " + (dirty ? 2 : 1) + "번. 시스템 콜과 달리 다음 명령이 아니라 같은 명령을 다시 실행한다.");
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
