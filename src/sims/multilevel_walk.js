// multilevel_walk — 16강 p.22~29: multi-level page table 을 TLB miss 가정으로 한 단계씩 걷는다 (OSTEP 20장 Figure 20.6 흐름)
// VA → (PD index[es] | PT index | offset) → PDBR 에서 PDE → (다음 레벨 PDE) → PTE → PA. valid 0 이면 exception.
// 옵션 set:
//   two   — p.21~24: 16KB 주소 공간, 64B page → 4 | 4 | 6 비트. VA 5844(0x16D4) → PD 5, PT 11, offset 20 → PFN 230 → PA 14740 (슬라이드 값)
//           + PT 안 invalid PTE(VA 5124 = PD 5, PT 0), invalid PDE(VA 8192 = PD 8)
//   three — p.25~29: 1GB 주소 공간, 512B page → 7 | 7 | 7 | 9 비트. VA 0x2DACED11(=766307601) → 91 | 44 | 118 | 273 → PFN 4131230 → PA 2115190033
//           + 슬라이드에 적힌 0x2DACECBB(offset 187) 비교, invalid Level 0 PDE(index 90)
// PDBR 값과 중간 PDE 의 PFN 은 슬라이드 그림에 없어서 이 sim 이 정한 값(가정)이다. 슬라이드 값은 index·PTE PFN·offset·PA 뿐.
(function (global) {
  "use strict";
  global.SIMS = global.SIMS || {};

  var SETS = {
    two: {
      page: 64, idx: [4, 4], names: ["PD", "PT"], pdbr: 200,
      // tables[level][PFN of that table page] = { index: PFN }
      tables: [
        { 200: { 0: 101, 5: 201, 15: 102 } },
        { 201: { 11: 230 }, 101: { 0: 9 }, 102: { 15: 25 } }
      ],
      assume: "16KB/64B, 4|4|6. PDBR 200, PDE[5] → 201",
      list: [
        { va: 5844, hex: "0x16D4" },
        { va: 5124, hex: "0x1404" },
        { va: 8192, hex: "0x2000" }
      ]
    },
    three: {
      page: 512, idx: [7, 7, 7], names: ["L0 PDT", "L1 PDT", "PT"], pdbr: 1000,
      tables: [
        { 1000: { 91: 1001 } },
        { 1001: { 44: 1002 } },
        { 1002: { 118: 4131230 } }
      ],
      assume: "1GB/512B, 7|7|7|9. PDBR 1000, L0[91]→1001, L1[44]→1002",
      list: [
        { va: 766307601, hex: "0x2DACED11" },
        { va: 766307515, hex: "0x2DACECBB" },
        { va: 754974720, hex: "0x2D000000" }
      ]
    }
  };

  function linesFor(S) {
    if (S.idx.length === 2) return [
      "VPN = VA >> 6;   offset = VA & 0x3F;",
      "PDIndex = VPN >> 4;",
      "PTIndex = VPN & 0xF;",
      "PDE = Mem[PDBR*64 + PDIndex*4];",
      "if (!PDE.valid) RaiseException();",
      "PTE = Mem[PDE.PFN*64 + PTIndex*4];",
      "if (!PTE.valid) RaiseException();",
      "PA = PTE.PFN*64 + offset;",
      "data = Mem[PA];"
    ];
    return [
      "VPN = VA >> 9;   offset = VA & 0x1FF;",
      "i0 = VPN >> 14;",
      "i1 = (VPN >> 7) & 0x7F;",
      "i2 = VPN & 0x7F;",
      "PDE0 = Mem[PDBR*512 + i0*4];",
      "if (!PDE0.valid) RaiseException();",
      "PDE1 = Mem[PDE0.PFN*512 + i1*4];",
      "if (!PDE1.valid) RaiseException();",
      "PTE = Mem[PDE1.PFN*512 + i2*4];",
      "if (!PTE.valid) RaiseException();",
      "PA = PTE.PFN*512 + offset;",
      "data = Mem[PA];"
    ];
  }

  function split(S, va) {
    var ob = Math.log2(S.page), off = va % S.page, vpn = Math.floor(va / S.page), out = [], rest = vpn;
    for (var k = S.idx.length - 1; k >= 0; k--) { var m = Math.pow(2, S.idx[k]); out.unshift(rest % m); rest = Math.floor(rest / m); }
    return { vpn: vpn, off: off, idx: out, ob: ob };
  }
  function bin(v, n) { var s = v.toString(2); while (s.length < n) s = "0" + s; return s; }

  // 그림: 위에 VA 필드, 아래에 테이블 칸들 → PA
  function draw(S, sp, reached, bad, pa) {
    var n = S.idx.length, cols = ["#e09a40", "#2e9e4f", "#c97b2a", "#1d65b3"], light = ["#fdeec2", "#dff3e4", "#fbe2c8", "#dbe8f7"];
    var fields = sp.idx.concat([sp.off]), widths = S.idx.concat([sp.ob]);
    var tot = 0; widths.forEach(function (w) { tot += w; });
    var o = '<svg viewBox="0 0 640 200" width="100%" style="max-width:660px" font-family="sans-serif">';
    var x = 20, unit = 300 / tot;
    o += '<text x="20" y="16" font-size="12" fill="#555">VA = ' + fields.join(" | ") + '</text>';
    widths.forEach(function (w, i) {
      var wd = w * unit, ci = i === widths.length - 1 ? 3 : (n === 2 ? (i === 0 ? 0 : 2) : i);
      o += '<rect x="' + x + '" y="24" width="' + wd + '" height="28" fill="' + light[ci] + '" stroke="' + cols[ci] + '"/>';
      o += '<text x="' + (x + wd / 2) + '" y="43" font-size="13" text-anchor="middle" font-weight="700">' + fields[i] + '</text>';
      o += '<text x="' + (x + wd / 2) + '" y="64" font-size="10" text-anchor="middle" fill="#777">' + w + '-bit</text>';
      x += wd;
    });
    // 레지스터 + 표
    o += '<rect x="20" y="96" width="60" height="30" rx="4" fill="#efe9f6" stroke="#3b2f4a"/><text x="50" y="115" font-size="12" text-anchor="middle">PDBR</text>';
    var bx = 100, bw = (n === 2 ? 150 : 110);
    for (var k = 0; k < n; k++) {
      var on = reached > k, isBad = bad === k, stroke = isBad ? "#d6465f" : (on ? "#3b2f4a" : "#bbb");
      o += '<rect x="' + bx + '" y="86" width="' + bw + '" height="50" rx="4" fill="' + (isBad ? "#ffd9d9" : (on ? "#fff" : "#f4f4f4")) + '" stroke="' + stroke + '" stroke-width="' + (on || isBad ? 2 : 1) + '"/>';
      o += '<text x="' + (bx + bw / 2) + '" y="104" font-size="12" text-anchor="middle" font-weight="700">' + S.names[k] + '</text>';
      o += '<text x="' + (bx + bw / 2) + '" y="124" font-size="11" text-anchor="middle" fill="' + (isBad ? "#a52f2f" : "#333") + '">' + (isBad ? "[" + sp.idx[k] + "] valid 0 ✗" : (on ? "[" + sp.idx[k] + "] → " + (k === n - 1 ? "PFN " : "PFN ") + "✓" : "[" + sp.idx[k] + "] ?")) + '</text>';
      o += '<line x1="' + (bx - 18) + '" y1="111" x2="' + (bx - 2) + '" y2="111" stroke="#555" stroke-width="1.5"/>';
      bx += bw + 22;
    }
    o += '<rect x="' + bx + '" y="86" width="' + (620 - bx) + '" height="50" rx="4" fill="' + (pa != null ? "#dbe8f7" : "#f4f4f4") + '" stroke="' + (pa != null ? "#1d65b3" : "#bbb") + '"/>';
    o += '<text x="' + ((bx + 620) / 2) + '" y="104" font-size="12" text-anchor="middle" font-weight="700">PA</text>';
    o += '<text x="' + ((bx + 620) / 2) + '" y="124" font-size="11" text-anchor="middle">' + (pa != null ? pa : "?") + '</text>';
    o += '<line x1="' + (bx - 18) + '" y1="111" x2="' + (bx - 2) + '" y2="111" stroke="#555" stroke-width="1.5"/>';
    o += '<text x="20" y="170" font-size="12" fill="' + (bad != null ? "#a52f2f" : "#555") + '">' +
      (bad != null ? "exception — 이 아래 레벨은 메모리에 없다 (그래서 메모리를 아낀다)" : "TLB miss 한 번에 메모리 접근 = 표 " + n + "번 + data 1번 = " + (n + 1) + "번") + '</text>';
    return o + '</svg>';
  }

  global.SIMS["multilevel_walk"] = {
    title: "Multi-level page table walk — PDBR → PDE → PTE → PA (16강 p.22~29)",
    desc: "PDBR 에서 PDE, PTE 를 차례로 읽는다.",
    options: [{ key: "set", label: "예제", values: [
      { value: "two", label: "2단계 — p.24 16KB/64B, VA 5844 → 14740" },
      { value: "three", label: "3단계 — p.29 1GB/512B, 7|7|7|9" } ] }],
    build: function (opts) {
      var S = SETS[opts.set] || SETS.two, n = S.idx.length, steps = [], lines = linesFor(S);
      var base = { VA: "-", VPN: "-", offset: "-", PDBR: "PFN " + S.pdbr + " (가정)" };
      for (var k = 0; k < n; k++) base[S.names[k] + " 항목"] = "-";
      base.PA = "-"; base["메모리 접근"] = 0;
      function add(desc, line, v, sp, reached, bad, pa, note) {
        var st = { desc: desc, pc: { HW: line }, vars: Object.assign({}, v), svg: draw(S, sp, reached, bad, pa) };
        if (note) st.note = note;
        steps.push(st);
      }
      add(S.assume, null, base, split(S, 0), 0, null, null);

      S.list.forEach(function (e) {
        var sp = split(S, e.va), v = Object.assign({}, base), tot = 0;
        S.idx.forEach(function (w) { tot += w; });
        var b = bin(e.va, tot + sp.ob), pos = 0, parts = [];
        S.idx.concat([sp.ob]).forEach(function (w) { parts.push(b.substr(pos, w)); pos += w; });
        v.VA = n === 2 ? e.va : e.hex;
        add("VA = " + e.va + " = " + e.hex, null, v, sp, 0, null, null);
        add("2진수: " + parts.join(" | "), null, v, sp, 0, null, null);
        var sh = sp.ob, mask = S.page - 1;
        v.VPN = sp.vpn;
        add("VPN = " + e.va + " >> " + sh + " = " + sp.vpn, 1, v, sp, 0, null, null);
        v.offset = sp.off;
        add("offset = " + e.va + " & 0x" + mask.toString(16).toUpperCase() + " = " + sp.off, 1, v, sp, 0, null, null);
        if (n === 2) {
          add("PDIndex = " + sp.vpn + " >> 4 = " + sp.idx[0], 2, v, sp, 0, null, null);
          add("PTIndex = " + sp.vpn + " & 0xF = " + sp.idx[1], 3, v, sp, 0, null, null);
        } else {
          add("i0 = " + sp.vpn + " >> 14 = " + sp.idx[0], 2, v, sp, 0, null, null);
          add("i1 = (" + sp.vpn + " >> 7) & 0x7F = " + sp.idx[1], 3, v, sp, 0, null, null);
          add("i2 = " + sp.vpn + " & 0x7F = " + sp.idx[2], 4, v, sp, 0, null, null);
        }
        var pfn = S.pdbr, acc = 0;
        for (var k = 0; k < n; k++) {
          var next = (S.tables[k][pfn] || {})[sp.idx[k]], addr = pfn * S.page + sp.idx[k] * 4;
          var read = n + 2 + 2 * k, what = k === n - 1 ? "PTE" : (n === 2 ? "PDE" : "PDE" + k);
          acc++; v["메모리 접근"] = acc;
          add(what + " 주소 = " + pfn + " × " + S.page + " + " + sp.idx[k] + " × 4 = " + addr, read, v, sp, k, null, null);
          if (next == null) {
            v[S.names[k] + " 항목"] = "[" + sp.idx[k] + "] valid 0";
            add(what + "[" + sp.idx[k] + "].valid = 0 → RaiseException", read + 1, v, sp, k, k, null, "invalid " + what + " → exception");
            return;
          }
          v[S.names[k] + " 항목"] = "[" + sp.idx[k] + "] PFN " + next;
          add(what + "[" + sp.idx[k] + "]: valid, PFN = " + next, read + 1, v, sp, k + 1, null, null);
          pfn = next;
        }
        var pa = pfn * S.page + sp.off;
        v.PA = pa;
        add("PA = " + pfn + " × " + S.page + " + " + sp.off + " = " + pa, 3 * n + 2, v, sp, n, null, pa);
        acc++; v["메모리 접근"] = acc;
        add("data = Mem[" + pa + "], 메모리 접근 " + acc + "번째", 3 * n + 3, v, sp, n, null, pa,
          e.hex === "0x2DACECBB" ? "슬라이드 글자 0x2DACECBB 는 offset 187, 그림은 273" : null);
      });
      var vars = [{ name: "VA", group: "가상" }, { name: "VPN", group: "가상" }, { name: "offset", group: "가상" }, { name: "PDBR", group: "레지스터" }];
      for (var k = 0; k < n; k++) vars.push({ name: S.names[k] + " 항목", group: "page table (메모리)" });
      vars.push({ name: "PA", group: "물리" }, { name: "메모리 접근", group: "물리" });
      return { panels: [{ id: "HW", title: "MMU (hardware-managed walk)", lang: "c", lines: lines }], vars: vars, steps: steps };
    }
  };
})(typeof window !== "undefined" ? window : globalThis);
