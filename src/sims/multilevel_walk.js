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
      intro: "p.21~23 — 주소 공간 16KB(2^14), page 64B(2^6) → VA 14비트 = VPN 8비트 + offset 6비트. PTE 2^8 = 256개 × 4B = 1KB = 64B page '''16장''' → 그 16장을 가리키는 [[page directory]] 는 16 × 4B = 64B = 한 page. 그래서 VPN 8비트 = PD index 4 | PT index 4.",
      assume: "가정(그림에 없음): PDBR = PFN 200, PDE[5] → PT page PFN 201, PDE[0]·PDE[15] 만 valid. 슬라이드 값: PD 5 · PT 11 · PTE 230 · offset 20.",
      list: [
        { va: 5844, why: "p.24 의 그 예제 (0x16D4)" },
        { va: 5124, why: "PD 5 의 page 는 있지만 그 안의 PTE 0 은 invalid" },
        { va: 8192, why: "PD 8 — 주소 공간의 (free) 영역이라 PT page 를 아예 안 만들었다" }
      ]
    },
    three: {
      page: 512, idx: [7, 7, 7], names: ["L0 PDT", "L1 PDT", "PT"], pdbr: 1000,
      tables: [
        { 1000: { 91: 1001 } },
        { 1001: { 44: 1002 } },
        { 1002: { 118: 4131230 } }
      ],
      intro: "p.25~28 — 주소 공간 1GB(2^30), page 512B(2^9) → VPN 21비트 + offset 9비트. page 하나에 PTE 512/4 = 128 = 2^7 개 → PT index 7비트. 남은 14비트를 PD 하나로 쓰면 2^14 × 4B = 64KB = 128 page 라 '''한 page 에 안 들어간다''' → PD 를 둘로 쪼개 7 | 7. 결과 7 | 7 | 7 | 9.",
      assume: "가정(그림에 없음): PDBR = PFN 1000, L0[91] → PFN 1001, L1[44] → PFN 1002. 슬라이드 값: 91 · 44 · 118 · PTE 4131230 · offset 273.",
      list: [
        { va: 766307601, hex: "0x2DACED11", why: "p.29 그림의 필드 91 | 44 | 118 | 273 에 맞는 주소 (슬라이드 글자 '0x2DACECBB' 는 오타 — 아래 둘째 예)" },
        { va: 766307515, hex: "0x2DACECBB", why: "슬라이드 본문에 적힌 16진수 그대로 — 자르면 offset 이 273 이 아니라 187" },
        { va: 754974720, hex: "0x2D000000", why: "Level 0 index 90 — 그 아래 트리를 안 만든 영역" }
      ]
    }
  };

  function linesFor(S) {
    var ob = Math.log2(S.page), n = S.idx.length, L = [];
    if (n === 2) {
      L.push("// 2단계 page table walk (TLB miss 가정, OSTEP Fig 20.6)");
      L.push("VPN = VA >> 6;   offset = VA & 0x3F;");
      L.push("PDIndex = VPN >> 4;   PTIndex = VPN & 0xF;");
      L.push("PDE = Mem[PDBR*64 + PDIndex*4];     // 메모리 접근 ①");
      L.push("if (!PDE.valid) RaiseException();");
      L.push("PTE = Mem[PDE.PFN*64 + PTIndex*4];  // 메모리 접근 ②");
      L.push("if (!PTE.valid) RaiseException();");
      L.push("PA = PTE.PFN*64 + offset;           // offset 은 그대로");
      L.push("data = Mem[PA];                     // 메모리 접근 ③");
    } else {
      L.push("// 3단계 page table walk (TLB miss 가정)");
      L.push("VPN = VA >> 9;   offset = VA & 0x1FF;");
      L.push("i0 = VPN >> 14;  i1 = (VPN >> 7) & 0x7F;  i2 = VPN & 0x7F;");
      L.push("PDE0 = Mem[PDBR*512 + i0*4];      // ① Level 0 PDT");
      L.push("if (!PDE0.valid) RaiseException();");
      L.push("PDE1 = Mem[PDE0.PFN*512 + i1*4];  // ② Level 1 PDT");
      L.push("if (!PDE1.valid) RaiseException();");
      L.push("PTE  = Mem[PDE1.PFN*512 + i2*4];  // ③ Page Table");
      L.push("if (!PTE.valid) RaiseException();");
      L.push("PA = PTE.PFN*512 + offset;");
      L.push("data = Mem[PA];                   // ④");
    }
    return L;
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
    desc: "VA 의 VPN 을 PD index 와 PT index 로 자르고, [[PDBR]] 에서 시작해 [[page directory|PDE]] → PTE 를 차례로 읽는다. 어느 단계든 valid 0 이면 exception. → [[다단계 주소 변환 계산]], [[multi-level page table]]",
    options: [{ key: "set", label: "예제", values: [
      { value: "two", label: "2단계 — p.24 16KB/64B, VA 5844 → 14740" },
      { value: "three", label: "3단계 — p.29 1GB/512B, 7|7|7|9" } ] }],
    build: function (opts) {
      var S = SETS[opts.set] || SETS.two, n = S.idx.length, steps = [], lines = linesFor(S);
      var base = { VA: "-", "인덱스": "-", PDBR: "PFN " + S.pdbr + " (가정)" };
      for (var k = 0; k < n; k++) base[S.names[k] + " 항목"] = "-";
      base.PA = "-"; base["메모리 접근"] = 0;
      var v0 = Object.assign({}, base);
      steps.push({ desc: S.intro + " " + S.assume, pc: { HW: 1 }, vars: v0, svg: draw(S, split(S, 0), 0, null, null) });

      S.list.forEach(function (e) {
        var sp = split(S, e.va), v = Object.assign({}, base), tot = 0;
        S.idx.forEach(function (w) { tot += w; });
        var b = bin(e.va, tot + sp.ob), pos = 0, parts = [];
        S.idx.concat([sp.ob]).forEach(function (w) { parts.push(b.substr(pos, w)); pos += w; });
        v.VA = e.va + (e.hex ? " (" + e.hex + ")" : " (0x" + e.va.toString(16).toUpperCase() + ")");
        v["인덱스"] = sp.idx.join(" | ") + " | offset " + sp.off;
        steps.push({ desc: "'''VA " + v.VA + "''' — " + e.why + ". 2진수로 " + parts.join(" | ") + " → VPN " + sp.vpn + ", 인덱스 '''" + sp.idx.join(" | ") + "''', offset '''" + sp.off + "'''.",
          pc: { HW: n === 2 ? 3 : 3 }, vars: Object.assign({}, v), svg: draw(S, sp, 0, null, null) });
        var pfn = S.pdbr, acc = 0;
        for (var k = 0; k < n; k++) {
          var tbl = S.tables[k][pfn] || {}, next = tbl[sp.idx[k]], addr = pfn * S.page + sp.idx[k] * 4;
          acc++; v["메모리 접근"] = acc;
          var line = n === 2 ? (k === 0 ? 4 : 6) : 4 + k * 2;
          var what = k === n - 1 ? "PTE" : (n === 2 ? "PDE" : "Level " + k + " PDE");
          if (next == null) {
            v[S.names[k] + " 항목"] = "[" + sp.idx[k] + "] @" + addr + " : valid 0";
            var st = { desc: what + " 주소 = " + pfn + " × " + S.page + " + " + sp.idx[k] + " × 4 = " + addr + " → 읽어 보니 '''valid 0''' → '''RaiseException'''. " +
              (k < n - 1 ? "이 PDE 가 invalid 라는 것은 그 아래 page table page 를 '''아예 할당하지 않았다'''는 뜻 — multi-level 이 메모리를 아끼는 바로 그 지점(p.18)." : "PT page 는 있지만 이 page 는 안 쓰는 page."),
              pc: { HW: line + 1 }, vars: Object.assign({}, v), svg: draw(S, sp, k, k, null) };
            st.note = "invalid " + what + " → exception";
            steps.push(st);
            return;
          }
          v[S.names[k] + " 항목"] = "[" + sp.idx[k] + "] @" + addr + " → PFN " + next + (k === n - 1 ? "" : " (가정)");
          steps.push({ desc: what + " 주소 = " + (k === 0 ? "PDBR " : "앞 단계 PFN ") + pfn + " × " + S.page + " + index " + sp.idx[k] + " × 4 = '''" + addr + "''' → valid, PFN '''" + next + "'''" +
            (k === n - 1 ? " (슬라이드 값)." : " — 다음 레벨 표가 있는 page.") + " 메모리 접근 " + acc + "번째.",
            pc: { HW: line }, vars: Object.assign({}, v), svg: draw(S, sp, k + 1, null, null) });
          pfn = next;
        }
        var pa = pfn * S.page + sp.off;
        v.PA = pa + " = " + pfn + " × " + S.page + " + " + sp.off;
        steps.push({ desc: "PA = PFN × page size + offset = " + pfn + " × " + S.page + " + " + sp.off + " = '''" + pa + "'''. offset 은 변환하지 않는다.", pc: { HW: lines.length - 1 }, vars: Object.assign({}, v), svg: draw(S, sp, n, null, pa) });
        acc++; v["메모리 접근"] = acc;
        var last = { desc: "data 를 읽는다 — TLB miss 한 번에 메모리 접근 '''" + acc + "번'''(표 " + n + " + data 1). 이것이 p.20 의 '''time-space trade-off''': 표를 쪼갤수록 메모리는 아끼지만 miss 가 비싸진다.", pc: { HW: lines.length }, vars: Object.assign({}, v), svg: draw(S, sp, n, null, pa) };
        if (e.hex === "0x2DACECBB") last.note = "슬라이드 글자 0x2DACECBB 로는 offset 187, PA " + pa + " — 그림의 273 / 2115190033 과 다르다";
        steps.push(last);
      });
      var vars = [{ name: "VA", group: "가상" }, { name: "인덱스", group: "가상" }, { name: "PDBR", group: "레지스터" }];
      for (var k = 0; k < n; k++) vars.push({ name: S.names[k] + " 항목", group: "page table (메모리)" });
      vars.push({ name: "PA", group: "물리" }, { name: "메모리 접근", group: "물리" });
      return { panels: [{ id: "HW", title: "MMU (hardware-managed walk)", lang: "c", lines: lines }], vars: vars, steps: steps };
    }
  };
})(typeof window !== "undefined" ? window : globalThis);
