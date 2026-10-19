// ============================================================
// mmu_base_bounds — VA 가 MMU 의 비교기(< bounds)와 덧셈기(+ base)를 지나 PA 가 되는 흐름 (13강 p.47~49)
// 시간축(초): 0~1.5 초기(base 32KB, bounds 16KB) → 1.5~4.5 ① fetch 128 → 32896
//   → 4.5~7.5 ② load 15KB → 47KB → 7.5~10.5 ③ (위키 변형) VA 20KB → no → Raise exception → 10.5~12 요점
// 배치는 p.48 그대로: 왼쪽 Address Space(0~16KB), 가운데 MMU(bounds·base·<·+), 오른쪽 Physical Memory(0~64KB)
// ============================================================
window.ANIMS = window.ANIMS || {};
ANIMS["mmu_base_bounds"] = {
  title: "MMU 의 base and bounds — 가상 주소가 '< bounds' 와 '+ base' 를 지나 물리 주소가 되는 12초",
  desc: "p.48~49 그림 그대로: [[base and bounds|bounds register]] 16KB 와 비교해 통과하면 base register 32KB 를 더한다. fetch 128 → 32896, load 15KB → 47KB. 마지막 장면은 bounds 를 넘는 VA 20KB 가 '''Raise exception''' 으로 막히는 위키 변형",
  duration: 12,
  build: function () {
    var D = 12;
    var C = { a: "#1d65b3", aL: "#dbe8f7", b: "#2e9e4f", bL: "#dff3e4", cpu: "#3b2f4a", cpuL: "#efe9f6", hw: "#d6465f", muted: "#777", os: "#c9d9f0" };
    function r3(v) { return Math.round(v * 1000) / 1000; }
    function box(x, y, w, h, fill, stroke, extra) {
      return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="4" fill="' + fill + '" stroke="' + stroke + '" stroke-width="1.5"' + (extra || "") + '/>';
    }
    function txt(x, y, s, size, fill, extra) {
      var anchor = /text-anchor/.test(extra || "") ? "" : ' text-anchor="middle"';
      return '<text x="' + x + '" y="' + y + '" font-size="' + (size || 13) + '" fill="' + (fill || "#222") + '"' + anchor + (extra || "") + '>' + s + '</text>';
    }
    function show(from, to) {
      return '<animate attributeName="opacity" values="0;0;1;1;0;0" keyTimes="0;' + r3(from / D) + ';' + r3(from / D + 0.003) + ';' + r3(to / D) + ';' + r3(Math.min(1, to / D + 0.003)) + ';1" dur="' + D + 's" fill="freeze"/>';
    }
    function during(from, to, inner) {
      if (from <= 0) {
        return '<g>' + inner + '<animate attributeName="opacity" values="1;1;0;0" keyTimes="0;' + r3(to / D) + ';' + r3(Math.min(1, to / D + 0.003)) + ';1" dur="' + D + 's" fill="freeze"/></g>';
      }
      return '<g opacity="0">' + inner + show(from, to) + '</g>';
    }
    // 점 하나가 path 를 따라 이동 (from~to 초)
    function token(path, from, to, label, color) {
      var inner = '<circle r="7" fill="' + color + '"/>' + txt(0, -11, label, 11, color, ' font-weight="700"');
      return '<g opacity="0">' + inner +
        '<animateMotion path="' + path + '" begin="' + from + 's" dur="' + r3(to - from) + 's" fill="freeze"/>' +
        show(from, to) + '</g>';
    }

    var s = '<svg viewBox="0 0 760 360" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="MMU base and bounds 애니메이션">';
    s += '<defs><marker id="mbb_arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#555"/></marker></defs>';

    // ---- 자막 ----
    [
      [0, 1.5, "Process A 가 물리 32KB~48KB 에 로드됨 — OS 가 base = 32KB, bounds = 16KB 설정 (p.42)"],
      [1.5, 3.0, "① Fetch instruction at address 128 — VA 128 이 MMU 로"],
      [3.0, 4.5, "128 < 16KB → yes → 128 + 32KB = 32896 (p.48)"],
      [4.5, 6.0, "② Load from address 15KB — x 의 가상 주소(%ebx)"],
      [6.0, 7.5, "15KB < 16KB → yes → 15KB + 32KB = 47KB (p.49)"],
      [7.5, 9.0, "③ (변형) VA 20KB 에 접근하면?"],
      [9.0, 10.5, "20KB < 16KB → no → Raise exception — B 의 메모리(52KB)에 닿기 전에 막힌다"],
      [10.5, D, "physical address = virtual address + base,  0 ≤ virtual address < bounds (p.43)"]
    ].forEach(function (c) { s += during(c[0], c[1], txt(380, 24, c[2], 13, "#222", ' font-weight="700"')); });

    // ---- 왼쪽: Address Space 0~16KB (y 60~300, 1KB = 15px) ----
    var AX = 40, AW = 130, AY = 60, AH = 240;
    function ay(k) { return AY + AH * k / 16; }
    s += txt(AX + AW / 2, 52, "Address Space (VA)", 12, C.a, ' font-weight="700"');
    s += box(AX, ay(0), AW, ay(2) - ay(0), C.aL, C.a) + txt(AX + AW / 2, ay(1) + 4, "Program Code", 11, C.a);
    s += box(AX, ay(2), AW, ay(4) - ay(2), "#fff", C.a) + txt(AX + AW / 2, ay(3) + 4, "Heap ↓", 11, C.a);
    s += box(AX, ay(4), AW, ay(14) - ay(4), "#f6f6f6", "#bbb") + txt(AX + AW / 2, ay(9) + 4, "(free)", 11, C.muted);
    s += box(AX, ay(14), AW, ay(16) - ay(14), "#fff", C.a) + txt(AX + AW / 2, ay(15) + 4, "Stack ↑  x @15KB", 11, C.a);
    [0, 16].forEach(function (k) { s += txt(AX - 6, ay(k) + 4, k + "KB", 10, C.muted, ' text-anchor="end"'); });
    s += txt(AX - 6, ay(15) + 4, "15KB", 10, C.muted, ' text-anchor="end"');
    // 20KB 표시 (주소 공간 밖)
    s += during(7.5, 10.5, txt(AX + AW / 2, 322, "VA 20KB = 주소 공간 밖", 11, C.hw, ' font-weight="700"'));

    // ---- 가운데: MMU ----
    var MX = 250, MY = 70, MW = 230, MH = 190;
    s += box(MX, MY, MW, MH, "#ececec", "#999") + txt(MX + MW / 2, MY - 6, "MMU", 14, C.cpu, ' font-weight="700"');
    s += box(MX + 15, MY + 15, 90, 30, "#fff", C.cpu) + txt(MX + 60, MY + 12, "bounds register", 10, C.cpu) + txt(MX + 60, MY + 35, "16KB", 13, C.cpu, ' font-weight="700"');
    s += box(MX + 125, MY + 15, 90, 30, "#fff", C.cpu) + txt(MX + 170, MY + 12, "base register", 10, C.cpu) + txt(MX + 170, MY + 35, "32KB", 13, C.cpu, ' font-weight="700"');
    // 비교기 마름모 (60, 120) 기준
    var CX = MX + 60, CY = MY + 110;
    s += '<polygon points="' + CX + ',' + (CY - 22) + ' ' + (CX + 22) + ',' + CY + ' ' + CX + ',' + (CY + 22) + ' ' + (CX - 22) + ',' + CY + '" fill="#fff" stroke="' + C.cpu + '" stroke-width="1.5"/>' + txt(CX, CY + 6, "&lt;", 18, C.cpu, ' font-weight="700"');
    var PX = MX + 170, PY = CY;
    s += '<circle cx="' + PX + '" cy="' + PY + '" r="18" fill="#fff" stroke="' + C.cpu + '" stroke-width="1.5"/>' + txt(PX, PY + 6, "+", 20, C.cpu, ' font-weight="700"');
    s += '<line x1="' + CX + '" y1="' + (MY + 45) + '" x2="' + CX + '" y2="' + (CY - 24) + '" stroke="#555" marker-end="url(#mbb_arrow)"/>';
    s += '<line x1="' + PX + '" y1="' + (MY + 45) + '" x2="' + PX + '" y2="' + (PY - 20) + '" stroke="#555" marker-end="url(#mbb_arrow)"/>';
    s += '<line x1="' + (CX + 22) + '" y1="' + CY + '" x2="' + (PX - 20) + '" y2="' + PY + '" stroke="#555" marker-end="url(#mbb_arrow)"/>' + txt((CX + PX) / 2, CY - 8, "yes", 11, "#1d6b2a");
    s += '<line x1="' + CX + '" y1="' + (CY + 22) + '" x2="' + CX + '" y2="' + (MY + MH + 40) + '" stroke="#555" marker-end="url(#mbb_arrow)"/>' + txt(CX + 14, CY + 40, "no", 11, C.hw, ' text-anchor="start"');
    s += txt(CX, MY + MH + 56, "Raise exception", 13, C.hw, ' font-weight="700"');
    // exception 강조
    s += during(9.0, 10.5, '<rect x="' + (CX - 70) + '" y="' + (MY + MH + 38) + '" width="140" height="26" rx="5" fill="none" stroke="' + C.hw + '" stroke-width="3"/>');

    // ---- 오른쪽: Physical Memory 0~64KB (y 60~300, 1KB = 3.75px) ----
    var RX = 580, RW = 130, RY = 60, RH = 240;
    function ry(k) { return RY + RH * k / 64; }
    s += txt(RX + RW / 2, 52, "Physical Memory (PA)", 12, C.cpu, ' font-weight="700"');
    s += box(RX, ry(0), RW, ry(16) - ry(0), C.os, "#3b5d8f") + txt(RX + RW / 2, ry(8) + 4, "Operating System", 11, "#3b5d8f");
    s += box(RX, ry(16), RW, ry(32) - ry(16), "#f6f6f6", "#bbb") + txt(RX + RW / 2, ry(24) + 4, "(not in use)", 11, C.muted);
    s += box(RX, ry(32), RW, ry(48) - ry(32), C.aL, C.a) + txt(RX + RW / 2, ry(40) + 4, "Process A", 11, C.a, ' font-weight="700"');
    s += box(RX, ry(48), RW, ry(64) - ry(48), C.bL, C.b) + txt(RX + RW / 2, ry(56) + 4, "Process B", 11, C.b);
    [0, 16, 32, 48, 64].forEach(function (k) { s += txt(RX + RW + 6, ry(k) + 4, k + "KB", 10, C.muted, ' text-anchor="start"'); });

    // ---- 토큰 이동 ----
    // ① 128: 주소 공간 위쪽 → 비교기 → + → 물리 32896 (32.125KB)
    var y128 = ay(0.125), y15 = ay(15);
    s += token("M" + (AX + AW) + "," + y128 + " L" + (CX - 22) + "," + CY, 1.5, 3.0, "VA 128", C.a);
    s += token("M" + (CX + 22) + "," + CY + " L" + (PX - 18) + "," + PY + " L" + (PX + 18) + "," + PY + " L" + RX + "," + ry(32.125), 3.0, 4.5, "PA 32896", C.hw);
    // ② 15KB
    s += token("M" + (AX + AW) + "," + y15 + " L" + (CX - 22) + "," + CY, 4.5, 6.0, "VA 15KB", C.a);
    s += token("M" + (CX + 22) + "," + CY + " L" + (PX - 18) + "," + PY + " L" + (PX + 18) + "," + PY + " L" + RX + "," + ry(47), 6.0, 7.5, "PA 47KB", C.hw);
    // ③ 20KB → exception
    s += token("M" + (AX + AW) + "," + (AY + AH + 10) + " L" + (CX - 22) + "," + CY, 7.5, 9.0, "VA 20KB", C.hw);
    s += token("M" + CX + "," + (CY + 22) + " L" + CX + "," + (MY + MH + 30), 9.0, 10.5, "✗", C.hw);
    // 결과 표시 (물리 쪽 마커)
    s += during(3.0, 12, '<line x1="' + (RX - 14) + '" y1="' + ry(32.125) + '" x2="' + RX + '" y2="' + ry(32.125) + '" stroke="' + C.hw + '" stroke-width="2"/>' + txt(RX - 16, ry(32.125) + 4, "32896", 10, C.hw, ' text-anchor="end"'));
    s += during(6.0, 12, '<line x1="' + (RX - 14) + '" y1="' + ry(47) + '" x2="' + RX + '" y2="' + ry(47) + '" stroke="' + C.hw + '" stroke-width="2"/>' + txt(RX - 16, ry(47) + 4, "47KB", 10, C.hw, ' text-anchor="end"'));
    s += during(9.0, 12, '<line x1="' + (RX - 14) + '" y1="' + ry(52) + '" x2="' + RX + '" y2="' + ry(52) + '" stroke="' + C.muted + '" stroke-width="2" stroke-dasharray="3,2"/>' + txt(RX - 16, ry(52) + 4, "52KB ✗", 10, C.muted, ' text-anchor="end"'));

    // ---- 요점 ----
    s += txt(380, 350, "검사가 먼저(VA < bounds), 더하기가 나중(VA + base) — bounds 는 '길이'다", 12, C.cpu, ' font-weight="700"');
    return s + '</svg>';
  }
};
