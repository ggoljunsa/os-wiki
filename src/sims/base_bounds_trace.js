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
    "128 : movl 0x0(%ebx), %eax",
    "132 : addl $0x03, %eax",
    "135 : movl %eax, 0x0(%ebx)"
  ];
  var MMU = [
    "if (0 <= VA && VA < bounds)",
    "    PA = VA + base;",
    "else",
    "    raise exception;"
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
    desc: "메모리 참조 5번을 [[MMU]] 로 변환한다.",
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
        eax: "?", va: "-", pa: "-", xA: 3000, xB: 3000, exc: false
      };

      function push(desc, pcAsm, pcMmu, note, status) {
        var v = {
          "프로세스": S.cur,
          base: kb(S.base), bounds: kb(S.bounds),
          "%ebx": kb(S.ebx), "%eax": S.eax,
          VA: kb(S.va), PA: kb(S.pa),
          "A 의 x (47KB)": S.xA, "B 의 x (63KB)": S.xB
        };
        var st = { CODE: status || "running", MMU: pcMmu ? "running" : "ready" };
        var step = { desc: desc, pc: { CODE: pcAsm, MMU: pcMmu }, vars: v, status: st, svg: memSvg(S) };
        if (note) step.note = note;
        steps.push(step);
      }

      function ref(kind, va, pcAsm, mark) {
        S.va = va; S.pa = "-"; S.exc = false;
        push(mark + " " + kind + ": VA = " + kb(va), pcAsm, null);
        if (!(va >= 0 && va < S.bounds)) {
          S.exc = true;
          push(va + " < " + S.bounds + " ? no → Raise exception", pcAsm, 4, "exception: VA ≥ bounds", "blocked");
          return false;
        }
        push(va + " < " + S.bounds + " ? yes", pcAsm, 1);
        S.pa = va + S.base;
        push("PA = " + va + " + " + S.base + " = " + S.pa, pcAsm, 2);
        return true;
      }

      function runCode() {
        var who = S.cur;
        if (!ref("fetch", 128, 1, "①")) return;
        if (!ref("load x", S.ebx, 1, "②")) return;
        S.eax = (who === "A" ? S.xA : S.xB);
        S.va = "-";
        push("%eax = Mem[" + S.pa + "] = " + S.eax, 1, null);
        ref("fetch", 132, 2, "③");
        S.va = "-"; S.pa = "-";
        push("%eax = " + S.eax + " + 3 = " + (S.eax + 3), 2, null);
        S.eax = S.eax + 3;
        ref("fetch", 135, 3, "④");
        ref("store x", S.ebx, 3, "⑤");
        if (who === "A") S.xA = S.eax; else S.xB = S.eax;
        S.va = "-";
        push("Mem[" + S.pa + "] = " + S.eax, 3, null);
      }

      push("가정: base 32KB, bounds 16KB, %ebx = " + (S.ebx / KB) + "KB, x = 3000", null, null);
      runCode();
      if (sc === "context_switch") {
        S.va = "-"; S.pa = "-";
        push("PCB A ← base 32KB, bounds 16KB", null, null, null, "ready");
        S.cur = "B"; S.base = 48 * KB; S.bounds = 16 * KB; S.eax = "?";
        push("PCB B → base 48KB, bounds 16KB", null, null);
        runCode();
      }
      return {
        panels: [
          { id: "CODE", title: "x = x + 3 (p.45, 가상 주소)", lang: "asm", lines: ASM },
          { id: "MMU", title: "MMU (하드웨어)", lang: "c", lines: MMU }
        ],
        vars: [
          { name: "프로세스", group: "CPU" },
          { name: "%ebx", group: "CPU" },
          { name: "%eax", group: "CPU" },
          { name: "base", group: "MMU 레지스터" },
          { name: "bounds", group: "MMU 레지스터" },
          { name: "VA", group: "이번 참조" },
          { name: "PA", group: "이번 참조" },
          { name: "A 의 x (47KB)", group: "물리 메모리" },
          { name: "B 의 x (63KB)", group: "물리 메모리" }
        ],
        steps: steps
      };
    }
  };
})(typeof window !== "undefined" ? window : globalThis);
