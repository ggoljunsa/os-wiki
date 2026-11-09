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
    "seg = VA >> 12;",
    "offset = VA & 0xFFF;",
    "if (seg == 2) fault;",
    "if (GrowsPositive[seg]) {",
    "    if (offset >= Size[seg]) segfault;",
    "    PA = Base[seg] + offset;",
    "} else {",
    "    neg = offset - MAXSEG;",
    "    if (-neg > Size[seg]) segfault;",
    "    PA = Base[seg] + neg;",
    "}",
    "if (write && !W[seg]) protection fault;"
  ];
  var SETS = {
    slide: [{ va: 100, w: false }, { va: 4200, w: false }, { va: 15 * KB, w: true }],
    faults: [{ va: 7 * KB, w: false }, { va: 8200, w: false }, { va: 100, w: true }, { va: 14 * KB, w: true }, { va: 14 * KB - 1, w: false }]
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
    desc: "VA 를 seg·offset 으로 나눠 변환한다. → [[세그멘테이션]]",
    options: [
      { key: "set", label: "주소 묶음", values: [
        { value: "slide", label: "슬라이드 예제 (VA 100 · 4200 · 15KB)" },
        { value: "faults", label: "fault 가 나는 경우 + 스택 경계" }
      ] }
    ],
    build: function (opts) {
      var list = SETS[opts.set] || SETS.slide;
      var steps = [];
      function add(desc, line, v, bits, res, fault, note) {
        var st = { desc: desc, pc: { HW: line }, vars: Object.assign({}, v), svg: svg({ bits: bits, result: res || "", fault: !!fault }) };
        if (note) st.note = note;
        steps.push(st);
      }
      add("가정: Code 32K/2K RE, Heap 34K/2K, Stack 28K/2K(−)", null,
        { VA: "-", "접근": "-", bits: "-", seg: "-", offset: "-", neg: "-", "검사": "-", PA: "-" }, "", "", false);
      list.forEach(function (e) {
        var bits = bin14(e.va), seg = e.va >> 12, off = e.va & 0xFFF, t = TABLE[seg];
        var v = { VA: kb(e.va), "접근": e.w ? "store" : "load/fetch", bits: bits, seg: "-", offset: "-", neg: "-", "검사": "-", PA: "-" };
        add("VA = " + e.va + " = " + bits, null, v, bits);
        v.seg = seg.toString(2).padStart(2, "0") + " " + (t ? t.name : "미사용");
        add("seg = " + e.va + " >> 12 = " + seg, 1, v, bits);
        v.offset = off;
        add("offset = " + e.va + " & 0xFFF = " + off, 2, v, bits);
        var res;
        if (!t) {
          v["검사"] = "fault"; res = "Fault — 쓰지 않는 세그먼트";
          add("seg == 2 → 미사용 세그먼트 fault", 3, v, bits, res, true, res);
          return;
        }
        var pa, paLine;
        if (t.pos) {
          if (off >= t.size) {
            v["검사"] = "segfault"; res = "Segmentation Fault";
            add(off + " >= size " + t.size + " → Segmentation Fault", 5, v, bits, res, true, res);
            return;
          }
          v["검사"] = "통과";
          add(off + " < size " + t.size + " → 통과", 5, v, bits);
          pa = t.base + off; paLine = 6;
          v.PA = kb(pa);
          add("PA = " + t.base + " + " + off + " = " + pa, paLine, v, bits, "PA " + pa);
        } else {
          var neg = off - MAXSEG;
          v.neg = neg;
          add("neg = " + off + " − 4096 = " + neg, 8, v, bits);
          if (-neg > t.size) {
            v["검사"] = "segfault"; res = "Segmentation Fault";
            add("|" + neg + "| > size " + t.size + " → Segmentation Fault", 9, v, bits, res, true, res);
            return;
          }
          v["검사"] = "통과";
          add("|" + neg + "| <= size " + t.size + " → 통과", 9, v, bits);
          pa = t.base + neg; paLine = 10;
          v.PA = kb(pa);
          add("PA = " + t.base + " − " + (-neg) + " = " + pa, paLine, v, bits, "PA " + pa);
        }
        if (e.w && t.prot.indexOf("W") < 0) {
          v["검사"] = "prot fault"; v.PA = "-";
          res = "Protection Fault (" + t.name + " 는 " + t.prot + ")";
          add("store, Prot = " + t.prot + " → Protection Fault", 12, v, bits, res, true, res);
        }
      });
      return {
        panels: [{ id: "HW", title: "MMU + 세그먼트 테이블", lang: "c", lines: HW }],
        vars: [{ name: "VA", group: "주소" }, { name: "접근", group: "주소" }, { name: "bits", group: "주소" }, { name: "seg", group: "분해" }, { name: "offset", group: "분해" }, { name: "neg", group: "분해" }, { name: "검사", group: "MMU" }, { name: "PA", group: "MMU" }],
        steps: steps
      };
    }
  };
})(typeof window !== "undefined" ? window : globalThis);
