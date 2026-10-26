// seg_translate — 14강 p.7~15: 14비트 가상 주소를 세그먼트(위 2비트) + offset(아래 12비트)으로 나눠
// 세그먼트 테이블(base, size, grows positive?, protection)로 변환하는 과정을 한 주소씩 실행.
// 슬라이드 값: Code 00 base 32K size 2K +, Heap 01 base 34K size 2K +, Stack 11 base 28K size 2K −, 10 미사용.
// 스택(음의 방향)은 OSTEP 16장 규칙: 음수 offset = offset − 최대 세그먼트 크기(4KB), |음수 offset| ≤ size 면 통과.
// 옵션 set:
//   slide  — p.10 VA 100 → 32868, p.11 VA 4200 → 34920, p.12 스택 VA 15KB → 27KB
//   faults — 힙 VA 7KB(offset 3KB ≥ size 2KB → segmentation fault), VA 8200(세그 10 미사용), 코드 VA 100 에 store(RE → protection fault), 스택 경계 14KB / 14KB−1
(function (global) {
  "use strict";
  global.SIMS = global.SIMS || {};

  var KB = 1024, MAXSEG = 4096;
  var TABLE = {
    0: { name: "Code", base: 32 * KB, size: 2 * KB, pos: true, prot: "RE" },
    1: { name: "Heap", base: 34 * KB, size: 2 * KB, pos: true, prot: "RW" },
    3: { name: "Stack", base: 28 * KB, size: 2 * KB, pos: false, prot: "RW" }
  };
  var HW = [
    "// MMU (p.9, p.12, p.15) — 매 메모리 참조마다",
    "seg    = VA >> 12;            // 위 2비트",
    "offset = VA & 0xFFF;          // 아래 12비트",
    "if (seg 가 미사용 '10') fault;",
    "if (GrowsPositive[seg]) {",
    "    if (offset >= Size[seg]) Segmentation Fault;",
    "    PA = Base[seg] + offset;",
    "} else {                      // stack: 아래로 자람",
    "    neg = offset - MAXSEG;    // MAXSEG = 4KB",
    "    if (-neg > Size[seg]) Segmentation Fault;",
    "    PA = Base[seg] + neg;",
    "}",
    "if (write && !(Prot[seg] has W)) Protection Fault;",
    "access PA"
  ];
  var SETS = {
    slide: [
      { va: 100, w: false, why: "p.10 — code 세그먼트의 명령어 fetch" },
      { va: 4200, w: false, why: "p.11 — heap 데이터 load. 'VA + base' 가 아니라 'offset + base'" },
      { va: 15 * KB, w: true, why: "p.12 — stack 에 push(store). 스택은 28KB 에서 26KB 쪽으로 자란다" }
    ],
    faults: [
      { va: 7 * KB, w: false, why: "heap 세그먼트지만 offset 3KB 가 size 2KB 를 넘는다" },
      { va: 8200, w: false, why: "위 2비트가 10 — 슬라이드 표에서 쓰지 않는 세그먼트" },
      { va: 100, w: true, why: "p.15 — code 세그먼트에 store. 범위는 맞지만 Read-Execute 라 쓰기 금지" },
      { va: 14 * KB, w: true, why: "stack 의 가장 아래 칸(offset 2KB → neg −2KB, |−2KB| = size 라 통과)" },
      { va: 14 * KB - 1, w: false, why: "stack 영역 바로 아래 한 바이트 — 세그 11, offset 2047 → neg −2049 로 size 2KB 를 넘는다" }
    ]
  };

  function bin14(v) { var s = v.toString(2); while (s.length < 14) s = "0" + s; return s.slice(0, 2) + " " + s.slice(2); }
  function kb(v) { return (v % KB === 0) ? (v / KB) + "KB (" + v + ")" : String(v); }

  function svg(st) {
    var o = '<svg viewBox="0 0 520 120" width="100%" style="max-width:560px" font-family="sans-serif">';
    o += '<text x="10" y="16" font-size="12" fill="#555">VA (14 bit)</text>';
    var bits = st.bits.replace(" ", "");
    for (var i = 0; i < 14; i++) {
      var x = 10 + i * 24, isSeg = i < 2;
      o += '<rect x="' + x + '" y="24" width="22" height="24" fill="' + (isSeg ? "#fdeec2" : "#dbe8f7") + '" stroke="' + (isSeg ? "#8a6000" : "#1d65b3") + '"/>';
      o += '<text x="' + (x + 11) + '" y="41" font-size="13" text-anchor="middle">' + (bits[i] || "") + '</text>';
    }
    o += '<text x="34" y="64" font-size="11" text-anchor="middle" fill="#8a6000">segment</text>';
    o += '<text x="200" y="64" font-size="11" text-anchor="middle" fill="#1d65b3">offset (0~4095)</text>';
    o += '<text x="10" y="92" font-size="13" fill="' + (st.fault ? "#d6465f" : "#1d6b2a") + '" font-weight="700">' + st.result + '</text>';
    return o + '</svg>';
  }

  global.SIMS["seg_translate"] = {
    title: "세그먼트 주소 변환 (14강 p.7~15)",
    desc: "가상 주소의 위 2비트로 세그먼트를 고르고, 아래 12비트 offset 을 그 세그먼트의 size 와 비교한 뒤 base 에 더한다. stack 은 음의 방향, code 는 Read-Execute. → [[세그멘테이션]], [[세그먼트 주소 변환]]",
    options: [
      { key: "set", label: "주소 묶음", values: [
        { value: "slide", label: "슬라이드 예제 (VA 100 · 4200 · 15KB)" },
        { value: "faults", label: "fault 가 나는 경우 + 스택 경계" }
      ] }
    ],
    build: function (opts) {
      var list = SETS[opts.set] || SETS.slide;
      var steps = [];
      var rows = "Code 00: base 32K size 2K +, RE / Heap 01: base 34K size 2K +, RW / Stack 11: base 28K size 2K −, RW / 10: 미사용";
      steps.push({ desc: "세그먼트 테이블(p.6, p.12, p.13): " + rows + ". 주소 하나씩 MMU 를 통과시킨다.", pc: { HW: 1 },
        vars: { VA: "-", "bits": "-", seg: "-", offset: "-", "검사": "-", PA: "-" },
        svg: svg({ bits: "", result: "", fault: false }) });
      list.forEach(function (e) {
        var bits = bin14(e.va), seg = e.va >> 12, off = e.va & 0xFFF;
        var v = { VA: kb(e.va) + (e.w ? " (store)" : " (load/fetch)"), bits: bits, seg: "-", offset: "-", "검사": "-", PA: "-" };
        steps.push({ desc: "'''VA " + e.va + "''' — " + e.why + ".", pc: { HW: 1 }, vars: Object.assign({}, v), svg: svg({ bits: bits, result: "", fault: false }) });
        v.seg = seg.toString(2).padStart(2, "0") + " → " + (TABLE[seg] ? TABLE[seg].name : "미사용");
        v.offset = String(off);
        steps.push({ desc: "위 2비트 = '''" + v.seg + "''', 아래 12비트 offset = '''" + off + "'''.", pc: { HW: 3 }, vars: Object.assign({}, v), svg: svg({ bits: bits, result: "", fault: false }) });
        var t = TABLE[seg], res, fault = false, line;
        if (!t) {
          v["검사"] = "세그먼트 10 은 테이블에 없음"; res = "Fault — 쓰지 않는 세그먼트"; fault = true; line = 4;
        } else if (t.pos) {
          if (off >= t.size) { v["검사"] = off + " ≥ size " + t.size + " ✗"; res = "Segmentation Fault"; fault = true; line = 6; }
          else { v["검사"] = off + " < size " + t.size + " ✓"; v.PA = kb(t.base + off) + " = " + (t.base / KB) + "K + " + off; res = "PA " + (t.base + off); line = 7; }
        } else {
          var neg = off - MAXSEG;
          if (-neg > t.size) { v["검사"] = "neg = " + off + " − 4096 = " + neg + ", |neg| > size " + t.size + " ✗"; res = "Segmentation Fault"; fault = true; line = 10; }
          else { v["검사"] = "neg = " + off + " − 4096 = " + neg + ", |neg| ≤ " + t.size + " ✓"; v.PA = kb(t.base + neg) + " = 28K − " + (-neg); res = "PA " + (t.base + neg); line = 11; }
        }
        if (!fault && e.w && t.prot.indexOf("W") < 0) { v["검사"] += " / store 인데 " + t.prot; res = "Protection Fault (" + t.name + " 는 " + t.prot + ")"; fault = true; line = 13; v.PA = "-"; }
        var st = { desc: (fault ? "'''" + res + "'''" : "통과 → '''" + res + "'''") + ".", pc: { HW: line }, vars: v, svg: svg({ bits: bits, result: res, fault: fault }) };
        if (fault) st.note = res;
        steps.push(st);
      });
      return {
        panels: [{ id: "HW", title: "MMU + 세그먼트 테이블", lang: "c", lines: HW }],
        vars: [{ name: "VA", group: "주소" }, { name: "bits", group: "주소" }, { name: "seg", group: "분해" }, { name: "offset", group: "분해" }, { name: "검사", group: "MMU" }, { name: "PA", group: "MMU" }],
        steps: steps
      };
    }
  };
})(typeof window !== "undefined" ? window : globalThis);
