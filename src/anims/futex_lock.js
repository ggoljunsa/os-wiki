// ============================================================
// futex_lock — Linux futex two-phase lock (9강 p.39~41, p.40 코드 1~13 / 22~26줄)
// 시간축(초): 0 초기(mutex=0, 큐 비어 있음) → 1.5 T1 lock: bit_test_set 0 반환 → 획득(fast path)
//   → 3 T2 lock: bit_test_set 1 반환 → atomic_increment(대기자 1) → 4.5 T2 루프: 다시 1 → v=*mutex(음수)
//   → 6 futex_wait(mutex, v): Checked → Queued (T2 blocked) → 7 T1 unlock: atomic_add_zero → 1 ≠ 0
//   → 8 futex_wake: 큐에서 T2 꺼냄 → 9.5 T2 루프 처음: bit_test_set 0 → decrement → return → 11.5 결과 → 13 끝
// ============================================================
window.ANIMS = window.ANIMS || {};
ANIMS["futex_lock"] = {
  title: "futex 락 — 유저 공간 atomic 한 번으로 끝내고, 실패할 때만 커널 큐에서 잠든다",
  desc: "p.40 코드 그대로: 정수 하나의 '''bit 31 = 락''', '''나머지 = 대기자 수'''. 경쟁이 없으면 [[atomic]] 연산만(phase 1), 경쟁이 있을 때만 `futex_wait`/`futex_wake` 로 커널에 들어간다(phase 2) — [[two-phase lock]]. `futex_wait` 은 [[park와 unpark|park()]] 의 \"'''Checked'''\" and \"'''Queued'''\" 버전",
  duration: 13,
  build: function () {
    var C = {
      a: "#1d65b3", aL: "#dbe8f7",
      b: "#2e9e4f", bL: "#dff3e4",
      cpu: "#3b2f4a", cpuL: "#efe9f6",
      hw: "#d6465f", os: "#e09a40", muted: "#777"
    };
    var BADGE = {
      running: ["#cdefd2", "#1d6b2a"], ready: ["#fdeec2", "#8a6000"],
      blocked: ["#dcdcf2", "#3c3c88"], idle: ["#eeeeee", "#666666"]
    };
    var D = 13;
    function box(x, y, w, h, fill, stroke, extra) {
      return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="6" fill="' + fill + '" stroke="' + stroke + '" stroke-width="2"' + (extra || "") + '/>';
    }
    function txt(x, y, s, size, fill, extra) {
      var anchor = /text-anchor/.test(extra || "") ? "" : ' text-anchor="middle"';
      return '<text x="' + x + '" y="' + y + '" font-size="' + (size || 13) + '" fill="' + (fill || "#222") + '"' + anchor + (extra || "") + '>' + s + '</text>';
    }
    function mono(x, y, s, size, fill, extra) {
      return txt(x, y, s, size, fill, ' font-family="ui-monospace, Menlo, Consolas, monospace"' + (extra || ""));
    }
    function show(from, to) {
      return '<animate attributeName="opacity" values="0;0;1;1;0;0" keyTimes="0;' + (from / D).toFixed(4) + ';' + (from / D + 0.01).toFixed(4) + ';' + (to / D).toFixed(4) + ';' + Math.min(1, to / D + 0.01).toFixed(4) + ';1" dur="' + D + 's" fill="freeze"/>';
    }
    function during(from, to, inner) { return '<g opacity="0">' + inner + show(from, to) + '</g>'; }
    function badge(cx, y, kind, label) {
      var c = BADGE[kind];
      return box(cx - 62, y, 124, 22, c[0], c[1]) + txt(cx, y + 16, label, 11, c[1], ' font-weight="700"');
    }
    function arrow(d, col) {
      return '<path d="' + d + '" fill="none" stroke="' + col + '" stroke-width="2.5" marker-end="url(#fx_arrow)"/>';
    }
    var START = ' text-anchor="start"';

    var s = '<svg viewBox="0 0 760 380" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Linux futex two-phase lock 애니메이션">';
    s += '<defs><marker id="fx_arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#555"/></marker></defs>';

    // ---- 단계 자막 ----
    [
      [0, 1.5, "초기 상태: mutex = 0 (풀림, 대기자 0) · 커널 futex 큐는 비어 있음"],
      [1.5, 3, "T1 lock(): atomic_bit_test_set(bit31) 이 0 반환 → 획득 (빠른 경로, 커널 안 부름)"],
      [3, 4.5, "T2 lock(): bit_test_set 이 1 반환 → 실패 → atomic_increment (대기자 수 +1)"],
      [4.5, 6, "T2 while 루프: 다시 1 반환 → v = *mutex (음수) → if (v &gt;= 0) continue 는 거짓"],
      [6, 7, "futex_wait(mutex, v): 커널이 *mutex == v 확인(Checked) → 큐에 넣고 재움(Queued)"],
      [7, 8, "T1 unlock(): atomic_add_zero(mutex, 0x80000000) → bit31 꺼짐, 결과 1 ≠ 0"],
      [8, 9.5, "대기자가 있으니 futex_wake(mutex) → 커널이 큐에서 T2 를 꺼내 ready 로"],
      [9.5, 11.5, "T2 깨어나 loop 처음으로: bit_test_set 0 반환 → atomic_decrement → return (획득)"],
      [11.5, 13, "결과: T2 가 락 보유 · mutex = 0x80000000 · 커널 큐는 다시 비어 있음"]
    ].forEach(function (c) { s += during(c[0], c[1], txt(380, 26, c[2], 14, "#222", ' font-weight="700"')); });

    // ================= 왼쪽: 코드 패널 (p.40) =================
    s += box(4, 40, 348, 292, "#fafafa", "#bbb");
    s += txt(14, 56, "p.40 Futex-based lock implementation", 11, C.muted, START + ' font-weight="700"');
    var rows = [
      " 1 void lock(int *mutex) {",
      " 2   if (atomic_bit_test_set(mutex, 31) == 0)",
      "       return;",
      " 3   atomic_increment(mutex);",
      " 4   while (1) {",
      " 5     if (atomic_bit_test_set(mutex, 31) == 0){",
      " 6       atomic_decrement(mutex);",
      " 7       return;",
      " 8     }",
      " 9     v = *mutex;",
      "10     if (v &gt;= 0) continue;",
      "11     futex_wait(mutex, v);",
      "12   }",
      "13 }",
      "14 …",
      "22 void unlock(int *mutex) {",
      "23   if (atomic_add_zero(mutex, 0x80000000))",
      "24     return;",
      "25   futex_wake(mutex);",
      "26 }"
    ];
    var Y0 = 76, DY = 13;
    function rowY(i) { return Y0 + i * DY; }
    // 줄 번호 → 행 인덱스
    var ROW = { 1: 0, 2: 1, 3: 3, 4: 4, 5: 5, 6: 6, 7: 7, 9: 9, 10: 10, 11: 11, 12: 12, 23: 16, 25: 18 };
    // 하이라이트 (코드 글자 아래에 깔리도록 먼저 그림)
    function hl(th, line, from, to) {
      var i = ROW[line], n = line === 2 ? 2 : 1;
      var col = th === 1 ? C.a : C.b, colL = th === 1 ? C.aL : C.bL;
      var y = rowY(i) - 10;
      s += during(from, to,
        '<rect x="6" y="' + y + '" width="344" height="' + (DY * n) + '" fill="' + colL + '" stroke="' + col + '" stroke-width="1.5"/>' +
        '<rect x="7" y="' + (y + 1) + '" width="22" height="' + (DY - 2) + '" rx="3" fill="' + col + '"/>' +
        txt(18, y + 10, "T" + th, 10, "#fff", ' font-weight="700"'));
    }
    hl(1, 2, 1.5, 3);
    hl(2, 2, 3, 3.6);
    hl(2, 3, 3.6, 4.5);
    hl(2, 4, 4.5, 4.8);
    hl(2, 5, 4.8, 5.3);
    hl(2, 9, 5.3, 5.7);
    hl(2, 10, 5.7, 6);
    hl(2, 11, 6, 7);
    hl(1, 23, 7, 8);
    hl(1, 25, 8, 9.5);
    hl(2, 4, 9.5, 9.9);
    hl(2, 5, 9.9, 10.5);
    hl(2, 6, 10.5, 11);
    hl(2, 7, 11, 11.5);
    rows.forEach(function (r, i) {
      s += mono(32, rowY(i), r.replace(/ /g, " "), 11, i >= 15 ? "#333" : "#222", START);
    });
    // phase 표시
    s += txt(128, rowY(2), "← phase 1: 빠른 경로 (fast path)", 11, "#1d6b2a", START + ' font-weight="700"');
    s += txt(222, rowY(11), "← phase 2 (커널)", 11, C.hw, START + ' font-weight="700"');
    s += txt(196, rowY(18), "← 대기자 있을 때만", 11, C.hw, START);

    // ================= 가운데 위: mutex 워드 =================
    s += box(360, 40, 394, 104, C.cpuL, C.cpu);
    s += mono(372, 59, "int *mutex", 13, C.cpu, START + ' font-weight="700"');
    s += txt(456, 59, "32-bit 워드 하나 — 락 상태는 유저 공간이 소유", 11, C.muted, START);
    s += box(370, 66, 44, 30, "#fff", C.hw);
    s += box(418, 66, 326, 30, "#fff", "#999");
    s += txt(392, 110, "bit31 = lock", 11, C.hw, ' font-weight="700"');
    s += txt(581, 110, "bit 0~30 = 대기자 수 (waiter count)", 11, "#555", ' font-weight="700"');
    var Z = "000 0000 0000 0000 0000 0000 0000 000";
    var ONE = "000 0000 0000 0000 0000 0000 0000 001";
    [
      // from, to, bit31, low, hex, signed, 뜻, 색
      [0, 2.2, "0", Z, "0x00000000", "0", "0 이상 = 풀림 · 대기자 0", "#1d6b2a"],
      [2.2, 3.9, "1", Z, "0x80000000", "-2147483648", "음수 = 잠김 · 대기자 0", C.hw],
      [3.9, 7.4, "1", ONE, "0x80000001", "-2147483647", "음수 = 잠김 + 대기자 1", C.hw],
      [7.4, 10.1, "0", ONE, "0x00000001", "1", "양수 = 풀림 · 대기자 1", "#1d6b2a"],
      [10.1, 10.7, "1", ONE, "0x80000001", "-2147483647", "음수 = 잠김 + 대기자 1", C.hw],
      [10.7, 13, "1", Z, "0x80000000", "-2147483648", "음수 = 잠김 · 대기자 0", C.hw]
    ].forEach(function (v) {
      s += during(v[0], v[1],
        mono(392, 88, v[2], 17, v[2] === "1" ? C.hw : C.muted, ' font-weight="700"') +
        mono(581, 86, v[3], 12, "#333", ' font-weight="700"') +
        '<text x="372" y="134" font-size="12" fill="#333" font-family="ui-monospace, Menlo, Consolas, monospace" font-weight="700">' + v[4] +
        '<tspan fill="' + C.muted + '" font-weight="400"> = </tspan>' + v[5] + '</text>' +
        txt(744, 134, v[6], 12, v[7], ' text-anchor="end" font-weight="700"'));
    });
    // 값이 바뀌는 순간 반짝임
    [2.2, 3.9, 7.4, 10.1, 10.7].forEach(function (t) {
      s += during(t, t + 0.7, '<rect x="366" y="62" width="382" height="38" rx="6" fill="none" stroke="' + C.os + '" stroke-width="3"/>');
    });

    // ================= 오른쪽 아래: 스레드 =================
    function thread(y, name, col, colL) {
      return box(360, y, 140, 80, colL, col) + txt(376, y + 20, name, 15, col, START + ' font-weight="700"');
    }
    s += thread(154, "T1", C.a, C.aL);
    s += thread(240, "T2", C.b, C.bL);
    function st(y, from, to, kind, label, note) {
      s += during(from, to, badge(430, y + 30, kind, label) + (note ? txt(430, y + 70, note, 11, "#444") : ""));
    }
    st(154, 0, 1.5, "ready", "ready", "lock() 호출 전");
    st(154, 1.5, 7, "running", "running · 락 보유", "critical section");
    st(154, 7, 9.5, "running", "running · unlock()", "락 반납 중");
    st(154, 9.5, 13, "idle", "락 반납 완료", "");
    st(240, 0, 3, "ready", "ready", "lock() 호출 전");
    st(240, 3, 6.5, "running", "running · lock() 시도", "대기자 수 +1");
    st(240, 6.5, 8.7, "blocked", "blocked (futex 큐)", "");
    st(240, 8.7, 9.5, "ready", "ready · 깨어남", "아직 락은 없음");
    st(240, 9.5, 11.2, "running", "running · 재시도", "loop 처음부터");
    st(240, 11.2, 13, "running", "running · 락 보유", "critical section");
    s += during(6.8, 8.7, '<text x="430" y="312" font-size="16" fill="#3c3c88" text-anchor="middle" font-weight="700">Z z z' +
      '<animate attributeName="opacity" values="1;0.25;1" dur="0.9s" begin="6.8s" repeatCount="2"/></text>');

    // ================= 오른쪽: 커널 futex 대기 큐 =================
    s += box(508, 154, 246, 170, "#f6f3fa", C.cpu);
    s += txt(631, 172, "커널 futex 대기 큐 (address 별)", 12, C.cpu, ' font-weight="700"');
    s += txt(631, 188, "“Checked” and “Queued” version of park()", 11, C.muted);
    s += mono(520, 206, "key = mutex 주소", 11, "#555", START);
    s += box(520, 212, 222, 26, "#fff", "#999", ' stroke-dasharray="4 3"');
    s += during(0, 6.5, txt(631, 230, "(비어 있음)", 11, C.muted));
    s += during(8.7, 13, txt(631, 230, "(비어 있음)", 11, C.muted));
    s += during(6.5, 8.7, box(596, 215, 70, 20, C.b, C.b) + txt(631, 229, "T2 (잠듦)", 11, "#fff", ' font-weight="700"'));
    s += during(6, 7, txt(520, 256, "① Checked: *mutex == v ? → 같음 ✓", 11, C.cpu, START + ' font-weight="700"'));
    s += during(6.5, 7, txt(520, 272, "② Queued: T2 를 큐에 넣고 재움", 11, "#3c3c88", START + ' font-weight="700"'));
    s += during(6, 7, txt(520, 290, "값이 그 사이 바뀌었으면", 11, C.hw, START) +
      txt(520, 304, "잠들지 않고 바로 리턴", 11, C.hw, START) +
      txt(520, 318, "→ wakeup/waiting race 없음", 11, C.hw, START + ' font-weight="700"'));
    s += during(8, 9.5, txt(520, 256, "futex_wake(mutex):", 11, C.os, START + ' font-weight="700"') +
      txt(520, 272, "큐에서 T2 를 꺼내 ready 로", 11, C.os, START + ' font-weight="700"'));

    // 화살표: T2 → 커널 큐 (futex_wait), 커널 큐 → T2 (futex_wake)
    s += during(6, 7, arrow("M500,262 C512,262 506,226 518,226", "#3c3c88"));
    s += during(8.2, 9.5, arrow("M518,232 C506,232 512,290 502,290", C.os));

    // ---- 단계별 한 줄 주석 ----
    [
      [1.5, 3, "phase 1: 유저 공간 atomic 한 번 — 커널 진입 0회"],
      [3, 4.5, "반환 1 = 이미 잠김 → 대기자 수 +1 (0x80000001)"],
      [4.5, 6, "v = -2147483647: 음수 = bit31 이 1 = 잠김 → 잠들 차례"],
      [6, 7, "phase 2: 여기서 처음으로 커널 진입 (시스템 콜)"],
      [7, 8, "0x80000001 + 0x80000000 → 넘침 버림 → 1 (0 아님)"],
      [8, 9.5, "대기자 0 이었다면 23~24줄에서 커널 없이 끝"],
      [9.5, 11.5, "깨어났다 ≠ 획득 — loop 처음에서 다시 bit_test_set"],
      [11.5, 13, "경쟁이 있을 때만 커널 — 없으면 유저 공간에서 끝"]
    ].forEach(function (c) { s += during(c[0], c[1], txt(557, 338, c[2], 12, "#8a6000", ' font-weight="700"')); });

    // ---- 요점 ----
    s += txt(380, 356, "phase 1 = 유저 공간 atomic 한 번(빠름) → 실패 시 phase 2 = futex_wait 로 커널 큐에서 잠듦.", 12, "#444", ' font-weight="700"');
    s += txt(380, 373, "락 상태는 유저 워드 하나, 대기 큐는 커널이 관리", 12, "#444", ' font-weight="700"');
    s += '</svg>';
    return s;
  }
};
