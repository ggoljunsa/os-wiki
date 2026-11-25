// ============================================================
// swap_space_move — p.15 의 물리 메모리 4 frame + swap block 8칸 사이에서 page 하나 크기로 오가는 모습 (17강 p.12~15)
// 예시 동작(그림용): Proc 0 이 [VPN 1] 을 쓰려 한다 → Block 0 에 있음 → PFN 0 의 Proc 0 [VPN 0] 을 빈 Block 2 로 swap out
//   → Block 0 의 [VPN 1] 을 PFN 0 으로 swap in → Block 0 이 빈 칸
// 시간축(초): 0~1.5 p.15 배치 → 1.5~3.5 VPN 1 은 디스크에 → 3.5~6 swap out → 6~8.5 swap in → 8.5~11 OS 의 기록 갱신 → 11~12.5 요점
// ============================================================
window.ANIMS = window.ANIMS || {};
ANIMS["swap_space_move"] = {
  title: "Swap space — page 하나 크기의 칸으로 메모리와 디스크를 오간다",
  desc: "[[swap space]] p.15 의 배치(PFN 0~3, Block 0~7). 물리 메모리보다 많은 page 를 다루려고 디스크에 page 크기 칸을 예약해 두고, OS 는 어떤 page 가 어느 block 에 있는지 기억한다. 아래 swap out/in 순서는 그림용 예시",
  duration: 12.5,
  build: function () {
    var D = 12.5;
    var C = { a: "#1d65b3", aL: "#dbe8f7", b: "#2e9e4f", bL: "#dff3e4", c: "#e09a40", cL: "#fdeec2", k: "#3b2f4a", kL: "#efe9f6", hw: "#d6465f", hwL: "#f7d8dc", m: "#777" };
    function r3(v) { return Math.round(v * 1000) / 1000; }
    function box(x, y, w, h, fill, stroke, sw) { return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" fill="' + fill + '" stroke="' + stroke + '" stroke-width="' + (sw || 1.2) + '"/>'; }
    function txt(x, y, s, size, fill, extra) {
      var anchor = /text-anchor/.test(extra || "") ? "" : ' text-anchor="middle"';
      return '<text x="' + x + '" y="' + y + '" font-size="' + (size || 13) + '" fill="' + (fill || "#222") + '"' + anchor + (extra || "") + '>' + s + '</text>';
    }
    function show(from, to) {
      return '<animate attributeName="opacity" values="0;0;1;1;0;0" keyTimes="0;' + r3(from / D) + ';' + r3(from / D + 0.003) + ';' + r3(to / D) + ';' + r3(Math.min(1, to / D + 0.003)) + ';1" dur="' + D + 's" fill="freeze"/>';
    }
    function during(from, to, inner) {
      if (from <= 0) return '<g>' + inner + '<animate attributeName="opacity" values="1;1;0;0" keyTimes="0;' + r3(to / D) + ';' + r3(Math.min(1, to / D + 0.003)) + ';1" dur="' + D + 's" fill="freeze"/></g>';
      return '<g opacity="0">' + inner + show(from, to) + '</g>';
    }
    var PC = { 0: "#dcdcdc", 1: "#ffffff", 2: "#bcd0ea", 3: "#ddd8c4" };
    function cell(x, y, w, h, proc, vpn) {
      if (proc === null) return box(x, y, w, h, "#f8c9a0", "#555") + txt(x + w / 2, y + h / 2 + 5, "[Free]", 12.5, "#7a3e00");
      return box(x, y, w, h, PC[proc], "#555") + txt(x + w / 2, y + h / 2 - 3, "Proc " + proc, 12.5, C.k) + txt(x + w / 2, y + h / 2 + 14, "[VPN " + vpn + "]", 12.5, C.k);
    }
    function moving(path, from, to, proc, vpn, w, h) {
      return '<g opacity="0"><g transform="translate(' + (-w / 2) + ',' + (-h / 2) + ')">' + cell(0, 0, w, h, proc, vpn) + '<rect width="' + w + '" height="' + h + '" fill="none" stroke="' + C.hw + '" stroke-width="3"/></g>' +
        '<animateMotion path="' + path + '" begin="' + from + 's" dur="' + r3(to - from) + 's" fill="freeze"/>' + show(from, to) + '</g>';
    }

    var s = '<svg viewBox="0 0 760 360" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="swap space 애니메이션">';
    [
      [0, 1.5, "물리 메모리 4 frame, swap space 8 block — 여러 프로세스의 page 가 섞여 있다 (p.15)"],
      [1.5, 3.5, "Proc 0 이 [VPN 1] 을 쓰려 한다 → 메모리에 없고 swap 의 Block 0 에 있다"],
      [3.5, 6, "빈 frame 이 없다 → PFN 0 의 Proc 0 [VPN 0] 을 빈 Block 2 로 swap out"],
      [6, 8.5, "Block 0 의 [VPN 1] 을 비운 PFN 0 으로 swap in"],
      [8.5, 11, "OS 는 page 가 어디(PFN 또는 Block 번호)에 있는지 page 단위로 기억한다"],
      [11, D, "swap space 덕에 물리 메모리보다 많은 page 를 다룬다 — 메모리 계층의 한 단계 더 아래"]
    ].forEach(function (c) { s += during(c[0], c[1], txt(380, 26, c[2], 14, "#222", ' font-weight="700"')); });

    // 물리 메모리 4 frame
    var MX = 200, MY = 74, MW = 100, MH = 54;
    var mem = [[0, 0], [1, 2], [1, 3], [2, 0]];
    s += txt(MX - 14, MY + 32, "Physical", 13, C.k, ' text-anchor="end" font-weight="700"') + txt(MX - 14, MY + 48, "Memory", 13, C.k, ' text-anchor="end" font-weight="700"');
    mem.forEach(function (m, i) {
      s += txt(MX + i * MW + MW / 2, MY - 8, "PFN " + i, 12, C.m);
      var c = cell(MX + i * MW, MY, MW, MH, m[0], m[1]);
      s += i === 0 ? during(0, 3.6, c) : c;
    });
    s += during(3.6, 8.1, box(MX, MY, MW, MH, "#fff", "#555") + txt(MX + MW / 2, MY + 32, "(비움)", 12, C.m));
    s += during(8.1, D, cell(MX, MY, MW, MH, 0, 1));

    // swap 8 block
    var SX = 40, SY = 200, SW = 84, SH = 54;
    var sw = [[0, 1], [0, 2], [null], [1, 0], [1, 1], [3, 0], [2, 1], [3, 1]];
    s += txt(SX + 4 * SW, SY + SH + 24, "Swap Space (disk)", 13, C.k, ' font-weight="700"');
    sw.forEach(function (m, i) {
      s += txt(SX + i * SW + SW / 2, SY - 8, "Block " + i, 12, C.m);
      var c = cell(SX + i * SW, SY, SW, SH, m[0], m[1]);
      if (i === 0) s += during(0, 6.1, c) + during(6.1, D, cell(SX, SY, SW, SH, null));
      else if (i === 2) s += during(0, 5.9, c) + during(5.9, D, cell(SX + 2 * SW, SY, SW, SH, 0, 0));
      else s += c;
    });
    // 찾는 page 강조
    s += during(1.5, 6.1, '<rect x="' + (SX - 3) + '" y="' + (SY - 3) + '" width="' + (SW + 6) + '" height="' + (SH + 6) + '" fill="none" stroke="' + C.a + '" stroke-width="3" stroke-dasharray="6,4"/>');
    s += during(1.5, 3.5, txt(SX + SW / 2, SY + SH + 44, "여기 있다", 12.5, C.a, ' font-weight="700"'));

    // 이동
    s += moving("M" + (MX + MW / 2) + "," + (MY + MH / 2) + " C" + (MX + MW / 2) + ",160 " + (SX + 2.5 * SW) + ",160 " + (SX + 2.5 * SW) + "," + (SY + SH / 2), 3.6, 5.9, 0, 0, MW - 10, MH - 6);
    s += moving("M" + (SX + SW / 2) + "," + (SY + SH / 2) + " C" + (SX + SW / 2) + ",160 " + (MX + MW / 2) + ",150 " + (MX + MW / 2) + "," + (MY + MH / 2), 6.1, 8.1, 0, 1, MW - 10, MH - 6);
    s += during(3.6, 5.9, txt(130, 160, "swap out", 13, C.hw, ' font-weight="700"'));
    s += during(6.1, 8.1, txt(130, 160, "swap in", 13, C.a, ' font-weight="700"'));

    // OS 의 기록 (Proc 0)
    var TX = 620, TY = 70;
    s += '<rect x="' + (TX - 10) + '" y="' + (TY - 4) + '" width="140" height="94" rx="4" fill="' + C.kL + '" stroke="' + C.k + '" stroke-width="1.5"/>' + txt(TX + 60, TY + 14, "OS 기록 (Proc 0)", 12, C.k, ' font-weight="700"');
    s += during(0, 8.5, txt(TX, TY + 40, "VPN 0 → PFN 0", 12.5, C.k, ' text-anchor="start"') + txt(TX, TY + 62, "VPN 1 → Block 0", 12.5, C.k, ' text-anchor="start"') + txt(TX, TY + 84, "VPN 2 → Block 1", 12.5, C.k, ' text-anchor="start"'));
    s += during(8.5, D, txt(TX, TY + 40, "VPN 0 → Block 2", 12.5, C.hw, ' text-anchor="start" font-weight="700"') + txt(TX, TY + 62, "VPN 1 → PFN 0", 12.5, C.hw, ' text-anchor="start" font-weight="700"') + txt(TX, TY + 84, "VPN 2 → Block 1", 12.5, C.k, ' text-anchor="start"'));

    s += txt(380, 348, "OS needs to remember the swap space, in a page-sized unit (p.14)", 13.5, C.k, ' font-weight="700"');
    return s + '</svg>';
  }
};
