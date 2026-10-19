// base_bounds_trace — 13강 p.44~49, p.54: x = x + 3 의 메모리 참조 5번을 MMU(base/bounds)로 한 단계씩 변환
// 슬라이드 값: base = 32KB, bounds = 16KB, %ebx = 15KB (x 의 가상 주소), x = 3000, 명령 가상 주소 128/132/135
// 옵션 scenario:
//   normal         — p.47~49 그대로: fetch 128 → 32896, load 15KB → 47KB, …, store 47KB (x 3000 → 3003)
//   out_of_bounds  — 같은 코드인데 %ebx = 20KB (bounds 밖) → load 에서 Raise exception (위키 변형)
//   context_switch — p.54: A 가 끝난 뒤 B(base 48KB) 로 전환, base/bounds 를 PCB 에 저장·복원하고 같은 코드를 B 로 실행
(function (global) {
  "use strict";
  global.SIMS = global.SIMS || {};

  var KB = 1024;
  var ASM = [
    "128 : movl 0x0(%ebx), %eax   ; load 0+ebx into eax",
    "132 : addl $0x03, %eax       ; add 3 to eax register",
    "135 : movl %eax, 0x0(%ebx)   ; store eax back to mem"
  ];
  var MMU = [
    "// MMU (p.43, p.48) — 매 메모리 참조마다 하드웨어가",
    "if (0 <= VA && VA < bounds)",
    "    PA = VA + base;",
    "else",
    "    raise exception;   // → OS exception handler"
  ];

  function kb(v) {
    if (v === null || v === undefined || v === "-") return "-";
    if (typeof v !== "number") return v;
    return (v % KB === 0) ? (v / KB) + "KB (" + v + ")" : String(v);
  }

  // 물리 메모리 막대 0~64KB
  function memSvg(st) {
    var W = 520, H = 150, X0 = 20, X1 = 500, Y = 60, BH = 34;
    function px(addr) { return X0 + (X1 - X0) * addr / (64 * KB); }
    var o = '<svg viewBox="0 0 ' + W + ' ' + H + '" width="100%" style="max-width:560px" font-family="sans-serif">';
    o += '<text x="' + X0 + '" y="16" font-size="12" fill="#555">Physical Memory 0 ~ 64KB</text>';
    var regions = [
      [0, 16, "OS", "#c9d9f0", "#3b5d8f"],
      [16, 32, "(not in use)", "#f2f2f2", "#999"],
      [32, 48, "Process A", st.cur === "A" ? "#dbe8f7" : "#eef3fa", "#1d65b3"],
      [48, 64, "Process B", st.cur === "B" ? "#dff3e4" : "#f2f8f3", "#2e9e4f"]
    ];
    regions.forEach(function (r) {
      var x = px(r[0] * KB), w = px(r[1] * KB) - x;
      o += '<rect x="' + x + '" y="' + Y + '" width="' + w + '" height="' + BH + '" fill="' + r[3] + '" stroke="' + r[4] + '"/>';
      o += '<text x="' + (x + w / 2) + '" y="' + (Y + 21) + '" font-size="11" text-anchor="middle" fill="' + r[4] + '">' + r[2] + '</text>';
    });
    [0, 16, 32, 48, 64].forEach(function (k) {
      o += '<text x="' + px(k * KB) + '" y="' + (Y + BH + 14) + '" font-size="10" text-anchor="middle" fill="#777">' + k + 'KB</text>';
    });
    // base ~ base+bounds 괄호
    var bx = px(st.base), ex = px(st.base + st.bounds);
    o += '<path d="M' + bx + ',' + (Y - 6) + ' L' + bx + ',' + (Y - 12) + ' L' + ex + ',' + (Y - 12) + ' L' + ex + ',' + (Y - 6) + '" fill="none" stroke="#3b2f4a" stroke-width="1.5"/>';
    o += '<text x="' + ((bx + ex) / 2) + '" y="' + (Y - 16) + '" font-size="11" text-anchor="middle" fill="#3b2f4a">base ' + (st.base / KB) + 'KB + bounds ' + (st.bounds / KB) + 'KB</text>';
    if (typeof st.pa === "number") {
      var x = px(st.pa);
      o += '<line x1="' + x + '" y1="' + (Y + BH + 18) + '" x2="' + x + '" y2="' + (Y + BH + 2) + '" stroke="#d6465f" stroke-width="2"/>';
      o += '<polygon points="' + (x - 5) + ',' + (Y + BH + 8) + ' ' + (x + 5) + ',' + (Y + BH + 8) + ' ' + x + ',' + (Y + BH + 1) + '" fill="#d6465f"/>';
      o += '<text x="' + x + '" y="' + (Y + BH + 32) + '" font-size="11" text-anchor="middle" fill="#d6465f">PA ' + kb(st.pa) + '</text>';
    }
    if (st.exc) {
      o += '<text x="' + (W / 2) + '" y="' + (H - 4) + '" font-size="13" text-anchor="middle" fill="#d6465f" font-weight="700">Raise exception — VA ' + kb(st.va) + ' ≥ bounds</text>';
    }
    return o + '</svg>';
  }

  global.SIMS["base_bounds_trace"] = {
    title: "Base and Bounds 주소 변환 — x = x + 3 (13강 p.44~49, p.54)",
    desc: "명령어 fetch 3번 + load 1번 + store 1번, 메모리 참조 5번이 모두 [[MMU]] 를 지난다: '''VA < bounds''' 검사 → '''PA = VA + base'''. 옵션으로 bounds 를 넘는 접근(exception)과 context switch 때 base/bounds 를 [[PCB]] 에 저장·복원하는 장면을 본다.",
    options: [
      {
        key: "scenario", label: "시나리오",
        values: [
          { value: "normal", label: "p.47~49 그대로 (base 32KB, %ebx = 15KB)" },
          { value: "out_of_bounds", label: "%ebx = 20KB → bounds 위반 (exception)" },
          { value: "context_switch", label: "p.54 A → B context switch 후 B 로 실행 (base 48KB)" }
        ]
      }
    ],
    build: function (opts) {
      var sc = opts.scenario || "normal";
      var steps = [];
      var S = {
        cur: "A", base: 32 * KB, bounds: 16 * KB, ebx: (sc === "out_of_bounds" ? 20 * KB : 15 * KB),
        eax: "?", va: "-", ok: "-", pa: "-", kind: "-", xA: 3000, xB: 3000, pcbA: "-", pcbB: "base 48KB, bounds 16KB", exc: false
      };

      function push(desc, pcAsm, pcMmu, note, status) {
        var v = {
          "실행 중": "Process " + S.cur,
          base: kb(S.base), bounds: kb(S.bounds),
          "%ebx (x 의 VA)": kb(S.ebx), "%eax": S.eax,
          "참조 종류": S.kind, VA: kb(S.va), "VA < bounds ?": S.ok, PA: kb(S.pa),
          "A 의 x (물리 47KB)": S.xA, "B 의 x (물리 63KB)": S.xB,
          "PCB A": S.pcbA, "PCB B": S.pcbB
        };
        var st = { CODE: status || "running", MMU: pcMmu ? "running" : "ready" };
        var step = { desc: desc, pc: { CODE: pcAsm, MMU: pcMmu }, vars: v, status: st, svg: memSvg(S) };
        if (note) step.note = note;
        steps.push(step);
      }

      function ref(kind, va, pcAsm, descPrefix) {
        S.kind = kind; S.va = va; S.ok = "-"; S.pa = "-"; S.exc = false;
        push(descPrefix + " → MMU 가 가상 주소 '''" + kb(va) + "''' 를 받는다.", pcAsm, 1);
        var ok = va >= 0 && va < S.bounds;
        S.ok = ok ? "yes (" + va + " < " + S.bounds + ")" : "no (" + va + " ≥ " + S.bounds + ")";
        if (!ok) {
          S.exc = true;
          push("bounds 검사: " + va + " < " + S.bounds + " ? → '''no'''. MMU 가 '''Raise exception''' (p.48 아래쪽 화살표). 하드웨어가 [[트랩]]처럼 OS 의 exception handler 로 넘기고, OS 는 보통 이 프로세스를 종료한다.", pcAsm, 5,
            "bounds 는 '''길이'''다(p.40). 검사는 변환 전 VA 로 한다: 0 ≤ VA < bounds. 20KB ≥ 16KB 이므로 물리 52KB(= B 의 메모리!)에 닿기 전에 막힌다 — 이것이 protection.", "blocked");
          return false;
        }
        push("bounds 검사: " + va + " < " + S.bounds + " ? → '''yes'''.", pcAsm, 2);
        S.pa = va + S.base;
        push("PA = VA + base = " + va + " + " + S.base + " = '''" + S.pa + "'''" + (S.pa % KB === 0 ? " (= " + (S.pa / KB) + "KB)" : "") + ". 이 물리 주소로 메모리에 접근한다.", pcAsm, 3);
        return true;
      }

      function runCode(label) {
        var who = S.cur;
        if (!ref("fetch", 128, 1, "① " + label + ": 명령어 fetch, 가상 주소 128")) return;
        if (!ref("load x", S.ebx, 1, "② `movl 0x0(%ebx),%eax` 실행 — x 를 읽는다(%ebx = " + kb(S.ebx) + ")")) return;
        S.eax = (who === "A" ? S.xA : S.xB);
        S.kind = "-"; S.va = "-"; S.ok = "-";
        push("%eax ← 메모리 값 '''" + S.eax + "'''.", 1, null);
        ref("fetch", 132, 2, "③ 명령어 fetch, 가상 주소 132");
        S.eax = S.eax + 3; S.kind = "-"; S.va = "-"; S.ok = "-"; S.pa = "-";
        push("`addl $0x03,%eax` 실행 — '''메모리 참조 없음'''(p.46). %eax = " + S.eax + ". MMU 는 쉰다.", 2, null);
        ref("fetch", 135, 3, "④ 명령어 fetch, 가상 주소 135");
        ref("store x", S.ebx, 3, "⑤ `movl %eax,0x0(%ebx)` 실행 — x 에 쓴다");
        if (who === "A") S.xA = S.eax; else S.xB = S.eax;
        S.kind = "-"; S.va = "-"; S.ok = "-";
        push("물리 " + kb(S.pa) + " 에 " + S.eax + " 저장. 끝 — 메모리 참조는 fetch 3 + load 1 + store 1 = '''5번''', 전부 같은 base/bounds 로 변환됐다.", 3, null);
      }

      push("초기 상태 (p.42, p.47): Process A 가 물리 32KB~48KB 에 로드되어 있고, OS 가 '''base = 32KB, bounds = 16KB''' 를 설정했다. 프로그램은 자기가 0번지에 있다고 믿는다. 실행할 코드는 `x = x + 3` 의 어셈블리 세 줄(p.45).", null, null);

      if (sc === "context_switch") {
        runCode("Process A");
        S.pcbA = "base 32KB, bounds 16KB";
        S.kind = "-"; S.va = "-"; S.ok = "-"; S.pa = "-";
        push("타이머 인터럽트 → [[컨텍스트 스위치]]. OS 가 현재 base/bounds(32KB/16KB)를 '''Process A 의 [[PCB]]''' 에 저장한다 (p.54 오른쪽 위 'Process A PCB').", null, null,
          "CPU 에 base/bounds 레지스터는 한 쌍뿐 → 프로세스마다 PCB 에 보관해야 한다.", "ready");
        S.cur = "B"; S.base = 48 * KB; S.bounds = 16 * KB; S.eax = "?";
        push("OS 가 '''Process B 의 PCB''' 에서 base = 48KB, bounds = 16KB 를 복원 → B 실행 (p.54 오른쪽 그림). B 도 '''똑같은 가상 주소'''(128, 15KB)를 쓴다.", null, null);
        runCode("Process B");
        push("정리: 같은 VA 15KB 가 A 에서는 물리 47KB, B 에서는 물리 63KB. 프로그램은 바뀐 게 없고 '''base 만''' 바뀌었다 — 이것이 private virtual address space.", null, null);
      } else {
        runCode("Process A");
      }
      return {
        panels: [
          { id: "CODE", title: "x = x + 3 (p.45, 가상 주소)", lang: "asm", lines: ASM },
          { id: "MMU", title: "MMU (하드웨어)", lang: "c", lines: MMU }
        ],
        vars: [
          { name: "실행 중", group: "CPU" },
          { name: "base", group: "MMU 레지스터" },
          { name: "bounds", group: "MMU 레지스터" },
          { name: "참조 종류", group: "이번 메모리 참조" },
          { name: "VA", group: "이번 메모리 참조" },
          { name: "VA < bounds ?", group: "이번 메모리 참조" },
          { name: "PA", group: "이번 메모리 참조" },
          { name: "%ebx (x 의 VA)", group: "CPU" },
          { name: "%eax", group: "CPU" },
          { name: "A 의 x (물리 47KB)", group: "물리 메모리" },
          { name: "B 의 x (물리 63KB)", group: "물리 메모리" },
          { name: "PCB A", group: "OS" },
          { name: "PCB B", group: "OS" }
        ],
        steps: steps
      };
    }
  };
})(typeof window !== "undefined" ? window : globalThis);
