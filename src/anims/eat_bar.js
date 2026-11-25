// ============================================================
// eat_bar — EAT: 1000번 중 1번의 page fault 가 평균을 40배로 만든다 (17강 p.24~26)
// 가정(p.25): memory access 200 ns, page-fault time 8 ms = 8,000,000 ns
// 시간축(초): 0~1.5 식 → 1.5~4 999번 × 200 ns 막대(아주 짧다) → 4~6.5 fault 1번 8 ms 막대(거의 전부)
//   → 6.5~8.5 ÷1000 = 8,199.8 ns (≈40배) → 8.5~11 10% 이내면 p &lt; 1/400,000 → 11~12.5 요점
// ============================================================
window.ANIMS = window.ANIMS || {};
ANIMS["eat_bar"] = {
  title: "Effective access time — 1000번 중 한 번의 page fault 가 평균을 40배로",
  desc: "[[effective access time]] p.25 의 숫자 그대로(memory 200 ns, page fault 8 ms). p = 1/1000 이면 1000번 접근의 총 시간 거의 전부가 fault 한 번에서 나와 EAT ≈ 8.2 µs 가 된다. 10% 이내로 늦추려면 p &lt; 1/400,000",
  duration: 12.5,
  build: function () {
    var D = 12.5;
    var C = { a: "#1d65b3", aL: "#dbe8f7", b: "#2e9e4f", bL: "#dff3e4", c: "#e09a40", cL: "#fdeec2", k: "#3b2f4a", kL: "#efe9f6", hw: "#d6465f", hwL: "#f7d8dc", m: "#777" };
    function r3(v) { return Math.round(v * 1000) / 1000; }
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
    function bar(x, y, w, h, color, from, dur) {
      return '<rect x="' + x + '" y="' + y + '" width="0" height="' + h + '" fill="' + color + '"><animate attributeName="width" values="0;' + r3(w) + '" begin="' + from + 's" dur="' + dur + 's" fill="freeze"/></rect>';
    }

    var X = 140, FULL = 580; // 8,199,800 ns → 580px
    var k1 = FULL / 8199800;
    var s = '<svg viewBox="0 0 760 360" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="effective access time 막대 애니메이션">';
    [
      [0, 1.5, "EAT = (1 − p) × 200 ns + p × 8 ms. p = page-fault rate"],
      [1.5, 4, "p = 1/1000: 1000번 접근 중 999번은 메모리에서 200 ns 씩"],
      [4, 6.5, "1번은 page fault — 디스크에서 8 ms. 총 시간의 거의 전부가 이 한 번"],
      [6.5, 8.5, "1000 으로 나누면 EAT = 8,199.8 ns ≈ 8.2 µs — 200 ns 의 약 40배"],
      [8.5, 11, "10% 이내로 늦추려면? EAT &lt; 220 → p &lt; 0.0000025 → 400,000번에 1번 미만"],
      [11, D, "Disk 는 DRAM 보다 약 10,000배 느리다 → page fault 는 아주 드물어야 한다 (p.24)"]
    ].forEach(function (c) { s += during(c[0], c[1], txt(380, 26, c[2], 14, "#222", ' font-weight="700"')); });

    // 식
    s += '<rect x="40" y="44" width="680" height="30" rx="4" fill="' + C.kL + '" stroke="' + C.k + '" stroke-width="1.2"/>';
    s += txt(380, 64, "EAT = (1 − p) × 200 + p × 8,000,000 = 200 + 7,999,800 × p  (ns)", 14, C.k, ' font-weight="700" xml:space="preserve"');

    // 1000번 총 시간 막대
    var Y = 112;
    s += txt(X - 10, Y + 18, "1000번 총 시간", 12.5, C.k, ' text-anchor="end" font-weight="700"');
    s += '<rect x="' + X + '" y="' + Y + '" width="' + FULL + '" height="26" fill="none" stroke="#ddd" stroke-dasharray="3,3"/>';
    s += bar(X, Y, 199800 * k1, 26, C.a, 1.8, 0.8);
    s += '<rect x="' + r3(X + 199800 * k1) + '" y="' + Y + '" width="0" height="26" fill="' + C.hw + '"><animate attributeName="width" values="0;' + r3(8000000 * k1) + '" begin="4.2s" dur="1.8s" fill="freeze"/></rect>';
    s += during(1.8, D, txt(X, Y + 44, "▲ 999 × 200 = 199,800 ns", 12.5, C.a, ' text-anchor="start" font-weight="700"'));
    s += during(5, D, txt(X + FULL, Y + 44, "1 × 8,000,000 ns (page fault 1번)", 12.5, C.hw, ' text-anchor="end" font-weight="700"'));
    s += during(5.5, D, txt(X + FULL, Y - 6, "합 8,199,800 ns", 12.5, C.k, ' text-anchor="end" font-weight="700"'));

    // 평균 비교 (같은 축이 아님: 평균 축 8,200 ns → 580px)
    var k2 = FULL / 8200, Y2 = 196;
    s += during(6.5, D, txt(380, Y2 - 12, "÷ 1000 → 접근 한 번의 평균 (막대 축: 8,200 ns = 끝까지)", 12, C.m));
    s += during(6.5, D, txt(X - 10, Y2 + 16, "fault 없을 때", 12.5, C.k, ' text-anchor="end"') + txt(X - 10, Y2 + 46, "p = 1/1000", 12.5, C.k, ' text-anchor="end" font-weight="700"'));
    s += '<g opacity="0">' + bar(X, Y2, 200 * k2, 22, C.a, 6.6, 0.3) + txt(X + 200 * k2 + 8, Y2 + 16, "200 ns", 12.5, C.a, ' text-anchor="start" font-weight="700"') + show(6.5, D) + '</g>';
    s += '<g opacity="0">' + bar(X, Y2 + 30, 8199.8 * k2, 22, C.hw, 6.8, 1.2) + txt(X + 8, Y2 + 46, "8,199.8 ns ≈ 8.2 µs (약 40배)", 13, "#fff", ' text-anchor="start" font-weight="700"') + show(6.5, D) + '</g>';

    // 10% 목표
    var Y3 = 268;
    s += during(8.5, D, txt(X - 10, Y3 + 16, "목표 EAT", 12.5, C.k, ' text-anchor="end" font-weight="700"'));
    s += '<g opacity="0">' + bar(X, Y3, 220 * k2, 22, C.b, 8.6, 0.3) + txt(X + 220 * k2 + 8, Y3 + 16, "220 ns (10% 이내)", 12.5, C.b, ' text-anchor="start" font-weight="700"') + show(8.5, D) + '</g>';
    s += during(9.2, D, txt(450, Y3 + 4, "200 + 7,999,800 × p &lt; 220", 13, C.k, ' text-anchor="start"') + txt(450, Y3 + 22, "7,999,800 × p &lt; 20", 13, C.k, ' text-anchor="start"') +
      txt(450, Y3 + 40, "p &lt; 0.0000025 = 1/400,000", 13, C.hw, ' text-anchor="start" font-weight="700"'));

    s += txt(380, 350, "전개 → p 대입 순서로: EAT = 200 + 7,999,800 × p (p.25 의 799800 은 오타)", 13, C.k, ' font-weight="700"');
    return s + '</svg>';
  }
};
