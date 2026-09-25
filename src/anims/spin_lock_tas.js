// ============================================================
// spin_lock_tas — test-and-set 스핀락 (9강 p.19~21, p.24)
// 시간축(초): 0 초기(flag=0) → 1.5 T1 TAS 반환 0, flag=1 → 3 T1 critical section
//   → 4 T2 TAS 반환 1, spinning (낭비 tick 증가) → 8 T1 unlock(flag=0)
//   → 9.5 T2 의 다음 TAS 반환 0 → 획득 → 12 끝
// ============================================================
window.ANIMS = window.ANIMS || {};
ANIMS["spin_lock_tas"] = {
  title: "Spin lock — TestAndSet 이 0 을 돌려준 스레드만 들어간다",
  desc: "[[test-and-set]]은 '''옛 값'''을 반환한다: 0 이면 획득, 1 이면 [[spin lock|spin]]. 기다리는 T2 는 그동안 CPU 를 태운다",
  duration: 12,
  build: function () {
    var C = {
      a: "#1d65b3", aL: "#dbe8f7",
      b: "#2e9e4f", bL: "#dff3e4",
      cpu: "#3b2f4a", cpuL: "#efe9f6",
      hw: "#d6465f", os: "#e09a40", muted: "#777"
    };
    var BADGE = {
      running: ["#cdefd2", "#1d6b2a"], ready: ["#fdeec2", "#8a6000"],
      blocked: ["#dcdcf2", "#3c3c88"], spinning: ["#ffd9d9", "#a52f2f"], idle: ["#eeeeee", "#666666"]
    };
    var D = 12;
    function box(x, y, w, h, fill, stroke, extra) {
      return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="8" fill="' + fill + '" stroke="' + stroke + '" stroke-width="2"' + (extra || "") + '/>';
    }
    function txt(x, y, s, size, fill, extra) {
      return '<text x="' + x + '" y="' + y + '" font-size="' + (size || 13) + '" fill="' + (fill || "#222") + '" text-anchor="middle"' + (extra || "") + '>' + s + '</text>';
    }
    function mono(x, y, s, size, fill, extra) {
      return txt(x, y, s, size, fill, ' font-family="ui-monospace, Menlo, Consolas, monospace"' + (extra || ""));
    }
    function show(from, to) {
      return '<animate attributeName="opacity" values="0;0;1;1;0;0" keyTimes="0;' + (from / D) + ';' + (from / D + 0.01) + ';' + (to / D) + ';' + Math.min(1, to / D + 0.01) + ';1" dur="' + D + 's" fill="freeze"/>';
    }
    function during(from, to, inner) { return '<g opacity="0">' + inner + show(from, to) + '</g>'; }
    function badge(cx, y, kind, label) {
      var c = BADGE[kind];
      return box(cx - 60, y, 120, 22, c[0], c[1]) + txt(cx, y + 16, label, 12, c[1], ' font-weight="700"');
    }
    function mv(pts) {
      var v = [], k = [];
      if (pts[0][0] > 0) { v.push(pts[0][1] + "," + pts[0][2]); k.push(0); }
      pts.forEach(function (p) { v.push(p[1] + "," + p[2]); k.push(+(p[0] / D).toFixed(4)); });
      var last = pts[pts.length - 1];
      if (last[0] < D) { v.push(last[1] + "," + last[2]); k.push(1); }
      return '<animateTransform attributeName="transform" type="translate" values="' + v.join(";") + '" keyTimes="' + k.join(";") + '" dur="' + D + 's" fill="freeze"/>';
    }

    var s = '<svg viewBox="0 0 760 330" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="test-and-set 스핀락 애니메이션">';
    s += '<defs><marker id="slt_arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#555"/></marker></defs>';

    // ---- 단계 자막 ----
    [
      [0, 1.5, "lock-&gt;flag = 0 (free) — T1, T2 가 곧 lock() 을 부른다"],
      [1.5, 3, "① T1: TestAndSet(&amp;flag, 1) returns 0, flag becomes 1 → 락 획득"],
      [3, 4, "T1 이 critical section 에 들어간다"],
      [4, 8, "② T2: TestAndSet() returns 1 (1→1 무해하게 덮어씀) → spinning…"],
      [8, 9.5, "③ T1: unlock() → lock-&gt;flag = 0 (store 한 번)"],
      [9.5, 12, "④ T2 의 다음 TestAndSet() returns 0 → while 탈출, 락 획득"]
    ].forEach(function (c) { s += during(c[0], c[1], txt(380, 26, c[2], 14, "#222", ' font-weight="700"')); });

    // ---- T1 / T2 박스 ----
    function thread(x, name, col, colL) {
      var cx = x + 110, g = "";
      g += box(x, 50, 220, 230, colL, col);
      g += txt(cx, 74, name, 15, col, ' font-weight="700"');
      g += mono(cx, 124, "while (TestAndSet(&amp;flag, 1)", 11, "#333");
      g += mono(cx, 140, "         == 1) ;  // spin", 11, "#333");
      g += txt(cx, 172, "TestAndSet 반환값 (옛 값)", 11, C.muted);
      return g;
    }
    s += thread(20, "Thread 1", C.a, C.aL);
    s += thread(520, "Thread 2", C.b, C.bL);

    // 상태 배지
    s += during(0, 1.5, badge(130, 84, "idle", "lock() 전"));
    s += during(1.5, 8, badge(130, 84, "running", "running · 락 보유"));
    s += during(8, 12, badge(130, 84, "idle", "unlock() 완료"));
    s += during(0, 4, badge(630, 84, "idle", "lock() 전"));
    s += during(4, 9.5, badge(630, 84, "spinning", "spinning"));
    s += during(9.5, 12, badge(630, 84, "running", "running · 락 보유"));

    // 반환값
    s += during(1.5, 8, txt(130, 204, "0 → 획득", 20, C.a, ' font-weight="700"'));
    s += during(4, 9.5, txt(630, 204, "1 → 계속 spin", 20, C.hw, ' font-weight="700"'));
    s += during(9.5, 12, txt(630, 204, "0 → 획득", 20, C.b, ' font-weight="700"'));

    // T2 의 낭비된 CPU tick 카운터
    s += during(4, 12, txt(630, 234, "spin 에 쓴 CPU tick", 11, C.muted));
    var ticks = [[4.2, 5], [5, 5.8], [5.8, 6.6], [6.6, 7.4], [7.4, 8.2], [8.2, 9.0], [9.0, 12]];
    ticks.forEach(function (w, i) {
      s += during(w[0], w[1], txt(630, 260, String(i + 1) + " tick 낭비", 16, "#a52f2f", ' font-weight="700"'));
    });

    // ---- 메모리 셀: lock->flag ----
    s += box(300, 56, 160, 84, "#fff", C.cpu);
    s += mono(380, 78, "lock-&gt;flag", 13, C.cpu, ' font-weight="700"');
    s += during(0, 2.3, txt(380, 124, "0", 34, C.b, ' font-weight="700"'));
    s += during(2.3, 8.6, txt(380, 124, "1", 34, C.hw, ' font-weight="700"'));
    s += during(8.6, 10.2, txt(380, 124, "0", 34, C.b, ' font-weight="700"'));
    s += during(10.2, 12, txt(380, 124, "1", 34, C.hw, ' font-weight="700"'));
    // 4~8 초: 1→1 덮어쓰기 표시
    s += during(4, 8, txt(430, 124, "1→1", 11, C.muted));

    // ---- 화살표: T1 ↔ flag ----
    s += during(1.5, 3, '<path d="M240,112 C270,112 272,98 298,98" fill="none" stroke="' + C.a + '" stroke-width="2.5" marker-end="url(#slt_arrow)"/>' +
      txt(268, 150, "TAS(1)", 11, C.a, ' font-weight="700"'));
    s += during(8, 9.5, '<path d="M240,112 C270,112 272,98 298,98" fill="none" stroke="' + C.os + '" stroke-width="2.5" marker-end="url(#slt_arrow)"/>' +
      txt(268, 150, "flag = 0", 11, C.os, ' font-weight="700"'));
    // T2 → flag (spin 중 깜빡임)
    s += '<g opacity="0"><path d="M520,112 C490,112 488,98 462,98" fill="none" stroke="' + C.hw + '" stroke-width="2.5" marker-end="url(#slt_arrow)"/>' +
      txt(492, 150, "TAS(1)", 11, C.hw, ' font-weight="700"') +
      '<animate attributeName="opacity" values="0;0;1;0.2;1;0.2;1;0.2;1;0.2;1;0;0" keyTimes="0;0.333;0.34;0.4;0.46;0.52;0.58;0.62;0.66;0.69;0.72;0.73;1" dur="' + D + 's" fill="freeze"/></g>';
    s += during(9.5, 10.5, '<path d="M520,112 C490,112 488,98 462,98" fill="none" stroke="' + C.b + '" stroke-width="2.5" marker-end="url(#slt_arrow)"/>' +
      txt(492, 150, "TAS(1)", 11, C.b, ' font-weight="700"'));

    // ---- critical section ----
    s += box(280, 180, 200, 100, "#fafafa", "#999", ' stroke-dasharray="6 4"');
    s += txt(380, 200, "critical section", 13, "#555", ' font-weight="700"');
    s += during(3.8, 8.3, txt(380, 268, "안에: T1 하나뿐", 11, C.a));
    s += during(10.8, 12, txt(380, 268, "안에: T2 하나뿐", 11, C.b));

    // 토큰: T1
    s += '<g>' + '<circle r="16" fill="' + C.a + '"/>' + txt(0, 5, "T1", 12, "#fff", ' font-weight="700"') +
      mv([[0, 130, 260], [3, 130, 260], [3.8, 380, 236], [8, 380, 236], [8.8, 130, 260]]) + '</g>';
    // 토큰: T2
    s += '<g>' + '<circle r="16" fill="' + C.b + '"/>' + txt(0, 5, "T2", 12, "#fff", ' font-weight="700"') +
      mv([[0, 712, 262], [10, 712, 262], [10.8, 380, 236]]) + '</g>';

    // ---- 요점 ----
    s += txt(380, 314, "TAS 는 검사와 설정을 한 명령으로 — 반환값 = 옛 값. 0 이면 획득, 1 이면 spin (그동안 CPU 낭비 → Performance No)", 12, C.muted);
    s += '</svg>';
    return s;
  }
};
