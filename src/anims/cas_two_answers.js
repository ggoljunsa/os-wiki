// ============================================================
// cas_two_answers — 9강 CAS vs 12강 CAS: 하는 일은 같고 반환값(대답)만 다르다 (문제집 ④-01 (g))
// 시간축(초): 0~4 ① 질문(손이 자물쇠로) → 4~10 ② flag=0 → 잠금 성공: 9강 0 / 12강 1
//   → 10~16 ③ flag=1(남이 쥠) → 손이 튕김: 9강 1 / 12강 0
//   → 16~24 ④ 실패 숫자가 while 조건으로 내려감: 9강 == 1, 12강 == 0
// ============================================================
window.ANIMS = window.ANIMS || {};
ANIMS["cas_two_answers"] = {
  title: "CAS 9강 vs 12강 — 같은 일을 하고, 대답만 다르다",
  desc: "똑같이 '비었으면 내가 잡는다'를 하지만, 9강 CAS는 '원래 상태'를, 12강 CAS는 '성공했는지'를 대답한다. while 에는 '실패'를 뜻하는 숫자를 쓴다. [[compare-and-swap]]",
  duration: 24,
  build: function () {
    var G = "#2e9e4f", GL = "#dff3e4", R = "#d6465f", RL = "#ffe3e8",
      B = "#1d65b3", BL = "#dbe8f7", O = "#e09a40", OL = "#fdeec2", M = "#777";
    var D = 24;
    function r3(v) { return Math.round(v * 1000) / 1000; }
    function txt(x, y, s, size, fill, extra) {
      var anchor = /text-anchor/.test(extra || "") ? "" : ' text-anchor="middle"';
      return '<text x="' + x + '" y="' + y + '" font-size="' + size + '" fill="' + fill + '"' + anchor + (extra || "") + '>' + s + '</text>';
    }
    function rect(x, y, w, h, rx, fill, stroke, sw) {
      return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="' + rx + '" fill="' + fill + '" stroke="' + stroke + '" stroke-width="' + (sw || 2) + '"/>';
    }
    function show(from, to) {
      return '<animate attributeName="opacity" values="0;0;1;1;0;0" keyTimes="0;' + r3(from / D) + ';' + r3(from / D + 0.008) + ';' + r3(to / D) + ';' + r3(Math.min(1, to / D + 0.002)) + ';1" dur="' + D + 's" fill="freeze"/>';
    }
    function during(from, to, inner) { return '<g opacity="0">' + inner + show(from, to) + '</g>'; }
    function bold(extra) { return ' font-weight="700"' + (extra || ""); }

    var s = '<svg viewBox="0 0 760 380" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="CAS 반환값 비교 애니메이션">';
    s += '<rect x="0" y="0" width="760" height="380" fill="#fff"/>';

    // ---- 자막 (한 번에 한 줄) ----
    [
      [0, 4, "질문: 비어 있으면 잡아 줘"],
      [4, 10, "비어 있을 때 (성공)"],
      [10, 16, "이미 잠겨 있을 때 (실패)"],
      [16, 20, "while 에는 '실패' 숫자를 쓴다"],
      [20, D, "9강은 == 1,  12강은 == 0"]
    ].forEach(function (c) { s += during(c[0], c[1], txt(380, 32, c[2], 20, "#222", bold())); });

    // ---- 자물쇠 패널 ----
    s += rect(250, 50, 280, 104, 14, "#fafafa", "#ccc", 2);
    function padlock(closed, col, fill) {
      var shackle = closed
        ? '<path d="M286,104 V86 a18,18 0 0 1 36,0 V104" fill="none" stroke="' + col + '" stroke-width="8" stroke-linecap="round"/>'
        : '<path d="M286,90 V72 a18,18 0 0 1 36,0 V76" fill="none" stroke="' + col + '" stroke-width="8" stroke-linecap="round"/>';
      return shackle + rect(272, 102, 64, 44, 8, fill, col, 3) +
        '<circle cx="304" cy="120" r="5" fill="' + col + '"/><rect x="302" y="122" width="4" height="12" fill="' + col + '"/>';
    }
    s += during(0, 5.5, padlock(false, G, GL) + txt(436, 116, "flag = 0", 38, G, bold(' font-family="monospace"')) + txt(436, 142, "비어 있음", 16, M));
    s += during(5.5, 10, padlock(true, G, GL) + txt(436, 116, "flag = 1", 38, G, bold(' font-family="monospace"')) + txt(436, 142, "0 → 1 (내가 잡음)", 16, G, bold()));
    s += during(10, D, padlock(true, R, RL) + txt(436, 116, "flag = 1", 38, R, bold(' font-family="monospace"')) + txt(436, 142, "남이 쥐고 있음", 16, R, bold()));

    // ---- 결과 태그 (패널 오른쪽) ----
    s += during(5.5, 10, rect(548, 78, 150, 46, 23, G, G) + txt(623, 109, "잡음 ✓ 성공", 20, "#fff", bold()));
    s += during(12.8, 16, rect(548, 78, 150, 46, 23, R, R) + txt(623, 109, "✗ 실패", 22, "#fff", bold()));

    // ---- 손 (👉): 1~3.5 다가감, 4~5.5 대기, 10~11 리셋, 11~12.5 다가감, 12.5~13.2 튕김 ----
    var hx = [[0, "0,0"], [1, "0,0"], [3.5, "120,0"], [10, "120,0"], [10.05, "0,0"], [11, "0,0"], [12.5, "120,0"], [12.8, "60,0"], [13.2, "40,0"], [D, "40,0"]];
    s += '<g>' + txt(110, 116, "👉", 48, "#222") +
      '<animateTransform attributeName="transform" type="translate" values="' + hx.map(function (e) { return e[1]; }).join(";") +
      '" keyTimes="' + hx.map(function (e) { return r3(e[0] / D); }).join(";") + '" dur="' + D + 's" fill="freeze"/>' +
      '<animate attributeName="opacity" values="1;1;0;0;1;1;0;0" keyTimes="0;' + r3(5.5 / D) + ';' + r3(5.6 / D) + ';' + r3(10.9 / D) + ';' + r3(11 / D) + ';' + r3(16 / D) + ';' + r3(16.1 / D) + ';1" dur="' + D + 's" fill="freeze"/></g>';
    s += during(12.6, 13.4, txt(212, 82, "툭!", 22, R, bold()));

    // ---- 대답하는 두 캐릭터 ----
    function answerer(dx, label, col, light) {
      var o = rect(20 + dx, 172, 350, 128, 14, "#fff", col, 2.5);
      o += txt(195 + dx, 196, label, 18, col, bold());
      o += '<circle cx="' + (70 + dx) + '" cy="252" r="28" fill="' + light + '" stroke="' + col + '" stroke-width="3"/>';
      o += '<circle cx="' + (61 + dx) + '" cy="246" r="3.5" fill="' + col + '"/><circle cx="' + (79 + dx) + '" cy="246" r="3.5" fill="' + col + '"/>';
      o += '<path d="M' + (60 + dx) + ',262 q10,8 20,0" fill="none" stroke="' + col + '" stroke-width="3" stroke-linecap="round"/>';
      return o;
    }
    s += answerer(0, "9강 CAS · 원래 상태를 말함", B, BL);
    s += answerer(370, "12강 CAS · 성공했는지 말함", O, OL);

    function bubble(dx, num, note, ok, extra) {
      var col = ok ? G : R, fill = ok ? GL : RL;
      return '<path d="M' + (122 + dx) + ',244 L' + (102 + dx) + ',252 L' + (122 + dx) + ',260 Z" fill="' + fill + '" stroke="' + col + '" stroke-width="2.5"/>' +
        rect(120 + dx, 210, 236, 80, 16, fill, col, 2.5) +
        '<rect x="' + (121 + dx) + '" y="243" width="4" height="18" fill="' + fill + '"/>' +
        txt(172 + dx, 272, num, 60, col, bold(' font-family="monospace"')) +
        txt(275 + dx, 258, note, 18, col, bold()) + (extra || "");
    }
    s += during(6.5, 10, bubble(0, "0", "원래 0이었어", true) + bubble(370, "1", "성공!", true));
    s += during(13.2, 16, bubble(0, "1", "원래 1이었어", false) + bubble(370, "0", "실패...", false));
    // ④ 실패 대답이 빨갛게 빛남
    function glow(dx) {
      return '<rect x="' + (114 + dx) + '" y="204" width="248" height="92" rx="20" fill="none" stroke="' + R + '" stroke-width="6">' +
        '<animate attributeName="opacity" values="0.15;0.9;0.15" dur="1s" repeatCount="indefinite"/></rect>';
    }
    s += during(16, D, bubble(0, "1", "원래 1이었어", false, glow(0)) + bubble(370, "0", "실패...", false, glow(370)));

    // ---- 실패 숫자가 아래 while 줄로 내려감 (16.5~18.5) ----
    function fly(x, num) {
      return '<g>' + txt(x, 272, num, 60, R, bold(' font-family="monospace"')) +
        '<animateTransform attributeName="transform" type="translate" values="0,0;0,0;92,72;92,72" keyTimes="0;' + r3(16.5 / D) + ';' + r3(18.5 / D) + ';1" dur="' + D + 's" fill="freeze"/></g>';
    }
    s += during(16.5, 18.6, fly(172, "1") + fly(542, "0"));

    // ---- while 코드 두 줄 ----
    function codeLine(nx, col) {
      return txt(nx - 14, 342, "while (CAS(…) ==", 20, "#222", bold(' font-family="monospace" text-anchor="end"')) +
        txt(nx + 16, 342, ") ;", 20, "#222", bold(' font-family="monospace" text-anchor="start"')) +
        '<rect x="' + (nx - 216) + '" y="312" width="280" height="44" rx="8" fill="none" stroke="' + col + '" stroke-width="2"/>';
    }
    s += during(17, D, '<g>' + codeLine(264, B) + codeLine(634, O) + '</g>');
    s += during(18.5, D, txt(264, 344, "1", 40, R, bold(' font-family="monospace"')) + txt(634, 344, "0", 40, R, bold(' font-family="monospace"')));
    s += during(20.5, D, txt(380, 374, "실패하면 다시 시도(spin) = while", 16, M, bold()));

    s += '</svg>';
    return s;
  }
};
