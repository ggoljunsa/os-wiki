// ============================================================
// lock_door — flag 락이 깨지는 순간을 화장실 문 팻말로 (9강 flag 락, 코드 없이 보는 판)
// 시간축(초): 0~3 팻말 소개 → 3~6 T1 확인 "비었네" → 6~9 interrupt 로 T1 멈춤
//   → 9~13 T2 확인·팻말 1·입장 → 13~17 T1 재개, 옛 판단대로 입장 → 17~22 둘 다 안 + 원인/해결
// ============================================================
window.ANIMS = window.ANIMS || {};
ANIMS["lock_door"] = {
  title: "flag 락이 깨지는 순간 — 화장실 문 팻말로 보기",
  desc: "flag = 문에 거는 '사용 중' 팻말. 팻말을 '보는 것'과 '거는 것'이 따로라서 그 틈에 남이 끼어든다. [[flag 락]] · [[test-and-set]]",
  duration: 22,
  build: function () {
    var D = 22;
    var BLUE = "#1d65b3", BLUEL = "#dbe8f7", GREEN = "#2e9e4f", GREENL = "#dff3e4", RED = "#d6465f", GREY = "#9a9a9a";
    function r3(v) { return Math.round(v * 1000) / 1000; }
    function txt(x, y, s, size, fill, extra) {
      return '<text x="' + x + '" y="' + y + '" font-size="' + size + '" fill="' + fill + '" text-anchor="middle" font-weight="700"' + (extra || "") + '>' + s + '</text>';
    }
    function show(from, to) {
      return '<animate attributeName="opacity" values="0;0;1;1;0;0" keyTimes="0;' + r3(from / D) + ';' + r3(from / D + 0.004) + ';' + r3(to / D) + ';' + r3(Math.min(1, to / D + 0.004)) + ';1" dur="' + D + 's" fill="freeze"/>';
    }
    function during(from, to, inner) { return '<g opacity="0">' + inner + show(from, to) + '</g>'; }
    function blink(period) { return '<animate attributeName="opacity" values="1;0.25;1" dur="' + period + 's" repeatCount="indefinite"/>'; }
    // 위치 키프레임 [[t, x], ...] → translate(x, 0)
    function moveX(keys) {
      var v = [keys[0][1] + ",0"], k = ["0"];
      keys.forEach(function (e) { v.push(e[1] + ",0"); k.push(r3(e[0] / D)); });
      v.push(keys[keys.length - 1][1] + ",0"); k.push("1");
      return '<animateTransform attributeName="transform" type="translate" values="' + v.join(";") + '" keyTimes="' + k.join(";") + '" dur="' + D + 's" fill="freeze"/>';
    }
    var FLOOR = 290;
    // 사람 (원점 = 발 중앙)
    function person(label, color, light) {
      return '<circle cx="0" cy="' + (FLOOR - 104) + '" r="19" fill="' + light + '" stroke="' + color + '" stroke-width="4"/>' +
        '<rect x="-25" y="' + (FLOOR - 80) + '" width="50" height="78" rx="22" fill="' + color + '"/>' +
        txt(0, FLOOR - 34, label, 20, "#fff");
    }
    function bubble(dx) {
      var x = dx - 50, y = 112;
      return '<path d="M' + x + ',' + y + ' h100 a8,8 0 0 1 8,8 v24 a8,8 0 0 1 -8,8 h-42 l-8,12 l-8,-12 h-42 a8,8 0 0 1 -8,-8 v-24 a8,8 0 0 1 8,-8 z" fill="#fff" stroke="#555" stroke-width="2"/>' +
        txt(dx + 4, y + 26, "비었네!", 18, "#222");
    }
    function glow(from, to) {
      return during(from, to, '<rect x="318" y="106" width="124" height="56" rx="12" fill="none" stroke="#f2b400" stroke-width="5">' + blink(0.5) + '</rect>');
    }

    var s = '<svg viewBox="0 0 760 360" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="flag 락이 화장실 문 팻말처럼 깨지는 애니메이션">';
    s += '<rect x="0" y="0" width="760" height="360" fill="#fbfaf7"/>';

    // ---- 자막 (한 번에 한 줄) ----
    [
      [0, 3, "flag = 문 팻말. 0 비었음, 1 사용 중"],
      [3, 6, "① T1: 팻말 확인 → 비었네"],
      [6, 9, "② 그 순간 T1이 멈춤 (interrupt)"],
      [9, 13, "③ T2: 확인 → 팻말 걸고 들어감"],
      [13, 17, "④ T1: 아까 본 대로 '비었다'고 믿고 들어감"],
      [17, D, "결과: mutual exclusion 깨짐"]
    ].forEach(function (c) { s += during(c[0], c[1], txt(380, 38, c[2], 20, "#222")); });

    // ---- 바닥 + 문 ----
    s += '<line x1="20" y1="' + FLOOR + '" x2="740" y2="' + FLOOR + '" stroke="#bbb" stroke-width="3"/>';
    s += '<rect x="316" y="96" width="128" height="' + (FLOOR - 96) + '" rx="6" fill="#efe9f6" stroke="#7a5a3a" stroke-width="7"/>';
    s += during(0, 17, txt(380, 316, "문 안 = 화장실 = critical section (한 명만!)", 15, "#777", ' font-weight="400"'));

    // ---- 팻말 (끈 + 판) ----
    s += '<line x1="350" y1="96" x2="342" y2="116" stroke="#555" stroke-width="2"/><line x1="410" y1="96" x2="418" y2="116" stroke="#555" stroke-width="2"/>';
    s += during(0, 11.6, '<rect x="324" y="112" width="112" height="44" rx="8" fill="' + GREEN + '"/>' + txt(380, 141, "비었음 0", 20, "#fff"));
    s += during(11.6, D, '<rect x="324" y="112" width="112" height="44" rx="8" fill="' + RED + '"/>' + txt(380, 141, "사용 중 1", 20, "#fff"));
    s += glow(11.4, 12.4);   // T2 가 거는 순간
    s += glow(14.6, 15.6);   // T1 도 거는 순간 (이미 1)

    // ---- T2 (오른쪽) ----
    var t2 = '<g>' + person("T2", GREEN, GREENL) +
      during(10.4, 12.0, bubble(0)) +
      moveX([[9, 650], [10.4, 500], [12.2, 500], [13, 408]]) + '</g>';
    s += t2;

    // ---- T1 (왼쪽) : 색 사람 + 멈췄을 때 회색 사람 겹침 ----
    var t1 = '<g>' + person("T1", BLUE, BLUEL) +
      during(6.3, 13.4, person("T1", GREY, "#e6e6e6") + txt(-58, FLOOR - 8, "멈춤", 18, "#555")) +
      during(4.5, 15.6, bubble(0)) +
      during(13.4, 15.6, '<path d="M-50,112 h108 v40 h-108 z" fill="none" stroke="' + BLUE + '" stroke-width="3" stroke-dasharray="6 4"/>') +
      moveX([[3, 110], [4.4, 262], [15.6, 262], [16.8, 352]]) + '</g>';
    s += t1;

    // ---- interrupt 번개 ----
    s += during(6, 9,
      '<polyline points="168,150 214,182 194,192 236,226" fill="none" stroke="' + RED + '" stroke-width="7" stroke-linejoin="round" stroke-linecap="round">' + blink(0.45) + '</polyline>' +
      txt(118, 140, "⚡ 전환", 20, RED) + txt(118, 164, "(interrupt)", 16, RED));

    // ---- 결과: 둘이 동시에 ----
    s += during(17, D,
      '<rect x="306" y="88" width="148" height="' + (FLOOR - 82) + '" rx="10" fill="none" stroke="' + RED + '" stroke-width="5">' + blink(0.8) + '</rect>' +
      '<g>' + txt(580, 150, "둘이 동시에! ✗", 30, RED) + blink(0.8) + '</g>');
    s += during(18.3, D,
      txt(380, 320, "원인: '보기'와 '걸기' 사이에 틈", 17, "#222") +
      txt(380, 346, "→ 해결: test-and-set (보기+걸기를 한 동작으로)", 17, BLUE));

    s += '</svg>';
    return s;
  }
};
