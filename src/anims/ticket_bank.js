// ============================================================
// ticket_bank — ticket lock 을 은행 번호표로 (문제집 ④-02 그대로)
// ticket = 발급기(다음에 뽑힐 번호), turn = 전광판(지금 번호). 시작: ticket 3, turn 2, H 가 창구(번호표 2)
// 시간축(초): 0 시작 | 2.5 ① P lock | 5.5 ② Q lock | 8.5 ③ H unlock | 12 ④ R lock
//   | 15.5 ⑤ P unlock | 18.5 ⑥ Q unlock | 22 ⑦ R unlock (turn 6 = ticket 6 → free) | 27 마무리
// 숫자는 사건 시작 +0.3초에 바뀌고 노란색으로 번쩍, 사람은 +0.5초부터 1초 동안 걷는다.
// ============================================================
window.ANIMS = window.ANIMS || {};
ANIMS["ticket_bank"] = {
  title: "ticket lock = 은행 번호표 — 문제집 ④-02 그대로",
  desc: "lock() 은 번호표만 뽑고(ticket +1), unlock() 은 전광판만 넘긴다(turn +1). 전광판 번호 = 내 번호표인 사람이 창구(락)에 간다. [[ticket lock]] · [[fetch-and-add]]",
  duration: 30,
  build: function () {
    var D = 30;
    var COL = { H: "#777", P: "#1d65b3", Q: "#2e9e4f", R: "#e09a40" };
    function r3(v) { return Math.round(v * 1000) / 1000; }
    function k(t) { return r3(t / D); }
    function txt(x, y, s, size, fill, extra) {
      return '<text x="' + x + '" y="' + y + '" font-size="' + size + '" fill="' + (fill || "#222") + '" text-anchor="middle"' + (extra || "") + '>' + s + '</text>';
    }
    function show(from, to) {
      var a = k(from), b = Math.min(k(to), 0.996);
      return '<animate attributeName="opacity" values="0;0;1;1;0;0" keyTimes="0;' + a + ';' + r3(a + 0.002) + ';' + b + ';' + r3(b + 0.002) + ';1" dur="' + D + 's" fill="freeze"/>';
    }
    function during(from, to, inner) { return '<g opacity="0">' + inner + show(from, to) + '</g>'; }
    // 노란 번쩍임: t 에서 0.9초 동안
    function flash(x, y, w, h, t) {
      var a = k(t), b = k(t + 0.9);
      return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="8" fill="#ffe14d" opacity="0">' +
        '<animate attributeName="opacity" values="0;0;1;0;0" keyTimes="0;' + a + ';' + r3(a + 0.004) + ';' + b + ';1" dur="' + D + 's" fill="freeze"/></rect>';
    }
    // 위치 키프레임 [[t,x,y],...] → animateTransform
    function moveAnim(kf) {
      var pts = kf.slice();
      if (pts[0][0] > 0) pts.unshift([0, pts[0][1], pts[0][2]]);
      var last = pts[pts.length - 1];
      if (last[0] < D) pts.push([D, last[1], last[2]]);
      return '<animateTransform attributeName="transform" type="translate" values="' +
        pts.map(function (p) { return p[1] + "," + p[2]; }).join(";") + '" keyTimes="' +
        pts.map(function (p) { return k(p[0]); }).join(";") + '" dur="' + D + 's" fill="freeze"/>';
    }

    // ---- 자리 ----
    var ENTR = [120, 224], OWN = [380, 132], EXIT = [610, 222];
    var SLOT = [[330, 312], [240, 312]];

    var s = '<svg viewBox="0 0 760 380" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="ticket lock 은행 번호표 애니메이션">';
    s += '<rect x="0" y="0" width="760" height="380" fill="#fff"/>';

    // ---- 발급기 (ticket) ----
    s += '<rect x="20" y="52" width="200" height="118" rx="12" fill="#eef4fb" stroke="#1d65b3" stroke-width="2"/>';
    s += flash(70, 98, 100, 64, 2.8) + flash(70, 98, 100, 64, 5.8) + flash(70, 98, 100, 64, 12.3);
    s += txt(120, 76, "🎫 발급기 (ticket)", 16, "#1d65b3", ' font-weight="bold"');
    s += txt(120, 94, "다음 번호", 13, "#555");
    [[3, 0, 2.8], [4, 2.8, 5.8], [5, 5.8, 12.3], [6, 12.3, D]].forEach(function (v) {
      s += during(v[1], v[2], txt(120, 152, v[0], 52, "#1d65b3", ' font-weight="bold"'));
    });

    // ---- 전광판 (turn) ----
    s += '<rect x="540" y="52" width="200" height="118" rx="12" fill="#222" stroke="#000" stroke-width="2"/>';
    s += flash(590, 98, 100, 64, 8.8) + flash(590, 98, 100, 64, 15.8) + flash(590, 98, 100, 64, 18.8) + flash(590, 98, 100, 64, 22.3);
    s += txt(640, 76, "📺 전광판 (turn)", 16, "#ffd75e", ' font-weight="bold"');
    s += txt(640, 94, "지금 번호", 13, "#ccc");
    [[2, 0, 8.8], [3, 8.8, 15.8], [4, 15.8, 18.8], [5, 18.8, 22.3], [6, 22.3, D]].forEach(function (v) {
      s += during(v[1], v[2], '<text x="640" y="152" font-size="52" font-weight="bold" fill="#ff5a5a" text-anchor="middle" opacity="1">' + v[0] + '</text>');
    });

    // ---- 창구 (락) ----
    s += '<rect x="290" y="52" width="180" height="140" rx="12" fill="#f7f3e6" stroke="#8a6000" stroke-width="2" stroke-dasharray="6 4"/>';
    s += txt(380, 74, "🔒 창구 = 락", 17, "#8a6000", ' font-weight="bold"');
    s += during(23.0, D, txt(380, 140, "아무도 없음 (free)", 17, "#1d6b2a", ' font-weight="bold"'));

    // ---- 대기 줄 ----
    s += '<rect x="20" y="262" width="400" height="90" rx="12" fill="#f4f4f4" stroke="#bbb" stroke-width="1.5"/>';
    s += '<text x="34" y="284" font-size="15" fill="#555" font-weight="bold">대기 줄</text>';
    s += '<text x="34" y="304" font-size="12" fill="#888">(spin 하며 기다림)</text>';

    // ---- 사람 ----
    function person(name, num, kf, from, to, calls) {
      var c = COL[name];
      var g = '<circle cx="0" cy="-28" r="13" fill="' + c + '"/>' +
        '<rect x="-17" y="-13" width="34" height="38" rx="12" fill="' + c + '"/>' +
        '<text x="0" y="13" font-size="19" font-weight="bold" fill="#fff" text-anchor="middle">' + name + '</text>';
      // 번호표 카드
      g += '<rect x="21" y="-40" width="36" height="34" rx="5" fill="#fff" stroke="' + c + '" stroke-width="2"/>';
      (calls || []).forEach(function (t) { g += flash(21, -40, 36, 34, t); });
      g += '<rect x="21" y="-40" width="36" height="34" rx="5" fill="none" stroke="' + c + '" stroke-width="2"/>';
      g += '<text x="39" y="-14" font-size="24" font-weight="bold" fill="' + c + '" text-anchor="middle">' + num + '</text>';
      return during(from, to, '<g>' + g + moveAnim(kf) + '</g>');
    }
    var o = OWN, e = EXIT, n = ENTR, s0 = SLOT[0], s1 = SLOT[1];
    s += person("H", 2, [[0, o[0], o[1]], [8.8, o[0], o[1]], [9.8, e[0], e[1]]], 0, 9.9, []);
    s += person("P", 3, [[2.5, n[0], n[1]], [3.0, n[0], n[1]], [4.0, s0[0], s0[1]], [9.0, s0[0], s0[1]], [10.0, o[0], o[1]],
      [15.8, o[0], o[1]], [16.8, e[0], e[1]]], 2.5, 16.9, [8.8]);
    s += person("Q", 4, [[5.5, n[0], n[1]], [6.0, n[0], n[1]], [7.0, s1[0], s1[1]], [9.0, s1[0], s1[1]], [10.0, s0[0], s0[1]],
      [16.0, s0[0], s0[1]], [17.0, o[0], o[1]], [18.8, o[0], o[1]], [19.8, e[0], e[1]]], 5.5, 19.9, [15.8]);
    s += person("R", 5, [[12.0, n[0], n[1]], [12.5, n[0], n[1]], [13.5, s1[0], s1[1]], [16.0, s1[0], s1[1]], [17.0, s0[0], s0[1]],
      [19.0, s0[0], s0[1]], [20.0, o[0], o[1]], [22.3, o[0], o[1]], [23.3, e[0], e[1]]], 12.0, 23.4, [18.8]);

    // ---- 오른쪽 아래: 지금 규칙 한 줄 그림 ----
    s += '<rect x="450" y="262" width="290" height="90" rx="12" fill="#fffbe8" stroke="#e0c060" stroke-width="1.5"/>';
    s += txt(595, 292, "lock() → 🎫 발급기 +1", 16, "#1d65b3", ' font-weight="bold"');
    s += txt(595, 318, "unlock() → 📺 전광판 +1", 16, "#a52f2f", ' font-weight="bold"');
    s += txt(595, 342, "전광판 = 내 번호 → 창구로", 14, "#555");

    // ---- 자막 (한 번에 한 줄) ----
    [
      [0, 2.5, "시작: H 가 창구(락) 사용 중 · 번호표 2"],
      [2.5, 5.5, "1) P: 번호표 3 뽑음 → 발급기 4"],
      [5.5, 8.5, "2) Q: 번호표 4 뽑음 → 발급기 5"],
      [8.5, 12, "3) H 끝 → 전광판 3 → P 차례"],
      [12, 15.5, "4) R: 번호표 5 뽑음 → 발급기 6"],
      [15.5, 18.5, "5) P 끝 → 전광판 4 → Q 차례"],
      [18.5, 22, "6) Q 끝 → 전광판 5 → R 차례"],
      [22, 27, "7) R 끝 → 전광판 6 = 발급기 6 → 빈 창구"],
      [27, D, "들어간 순서 H → P → Q → R = 번호표 순서 (fairness)"]
    ].forEach(function (c) {
      s += during(c[0], c[1], txt(380, 32, c[2], 20, "#222", ' font-weight="bold"'));
    });
    s += during(27, D, '<rect x="20" y="200" width="720" height="50" rx="10" fill="#cdefd2" stroke="#1d6b2a" stroke-width="2"/>' +
      txt(380, 232, "lock 은 발급기만, unlock 은 전광판만 바꾼다", 19, "#1d6b2a", ' font-weight="bold"'));

    s += '</svg>';
    return s;
  }
};
