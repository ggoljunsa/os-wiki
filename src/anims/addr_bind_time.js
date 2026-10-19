// ============================================================
// addr_bind_time — 주소 변환 세 시점 비교 (13강 p.31~36)
// 세 줄: ① Compile time(VA = PA, P2 로딩 X) ② Load time(로딩 때 call 주소 고쳐 씀, 보호 없음)
//        ③ Execution time(파일 그대로, CPU 가 실행 중 +100000/+200000)
// 시간축(초): 0~1.5 소개 → 1.5~4.5 ① → 4.5~8 ② → 8~11.5 ③ → 11.5~13 요점
// ============================================================
window.ANIMS = window.ANIMS || {};
ANIMS["addr_bind_time"] = {
  title: "주소 변환 시점 셋 — compile time · load time · execution time",
  desc: "p.31~36 의 swap/main 예제: P1 은 swap 을 0x10052d 에서, P2 는 test 를 0x100320 에서 부른다. [[주소 변환 시점]] — compile time 은 둘째 프로그램을 못 올리고, load time 은 주소를 고쳐 써서 올리지만 '''보호가 없고''', execution time 은 파일을 그대로 두고 CPU([[MMU]])가 실행 중에 더한다",
  duration: 13,
  build: function () {
    var D = 13;
    var C = { a: "#1d65b3", aL: "#dbe8f7", b: "#2e9e4f", bL: "#dff3e4", cpu: "#3b2f4a", cpuL: "#efe9f6", hw: "#d6465f", muted: "#777", file: "#fbf6d0", fileS: "#9a8a30" };
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
    function mono(x, y, s, size, fill, extra) {
      return txt(x, y, s, size || 12, fill || "#222", ' font-family="monospace"' + (extra || ""));
    }
    // 실행 파일 상자
    function exe(x, y, name, sym, call) {
      return box(x, y, 120, 40, C.file, C.fileS) +
        mono(x + 6, y + 16, sym, 11, "#333", ' text-anchor="start"') +
        mono(x + 6, y + 33, call, 11, "#333", ' text-anchor="start"') +
        txt(x + 60, y + 52, name, 10, C.muted);
    }
    function arrow(x1, y1, x2, y2, color) {
      return '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '" stroke="' + (color || "#555") + '" stroke-width="2" marker-end="url(#abt_arrow)"/>';
    }

    function curve(x1, y1, cx, cy, x2, y2, color) {
      return '<path d="M' + x1 + ',' + y1 + ' Q' + cx + ',' + cy + ' ' + x2 + ',' + y2 + '" fill="none" stroke="' + color + '" stroke-width="2" marker-end="url(#abt_arrow)"/>';
    }

    var s = '<svg viewBox="0 0 760 380" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="주소 변환 시점 비교 애니메이션">';
    s += '<defs><marker id="abt_arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#555"/></marker></defs>';

    [
      [0, 1.5, "같은 실행 파일 두 개: P1(swap @0x10052d), P2(test @0x100320) — 둘 다 0x100000 부터라고 컴파일됨"],
      [1.5, 3.0, "① Compile time: virtual address = physical address — P1 이 물리 0x100000 에 그대로"],
      [3.0, 4.5, "P2 도 0x100000 을 원한다 → 이미 P1 자리 → 로딩 불가 (p.32)"],
      [4.5, 6.2, "② Load time: 로딩하면서 +0x100000 / +0x200000, 코드 안 주소를 고쳐 씀 (p.33)"],
      [6.2, 8.0, "동시에 올라가지만 고친 주소 = 진짜 물리 주소 → P1 이 P2 메모리를 건드릴 수 있다 (p.34)"],
      [8.0, 9.8, "③ Execution time: 메모리 속 코드는 그대로 call 10052d / call 100320"],
      [9.8, 11.5, "CPU 가 실행하는 순간 +100000 / +200000 → 0x20052d / 0x300320 (p.36) → MMU"],
      [11.5, D, "실행 시점 변환만 '동시 로드 + 보호 + 재배치' 를 모두 얻는다 → base and bounds"]
    ].forEach(function (c) { s += during(c[0], c[1], txt(380, 24, c[2], 12.5, "#222", ' font-weight="700"')); });

    // ---- 행 라벨 ----
    var rows = [[60, "① Compile time"], [170, "② Load time"], [280, "③ Execution time"]];
    rows.forEach(function (r, i) {
      var active = [[1.5, 4.5], [4.5, 8.0], [8.0, 11.5]][i];
      s += txt(14, r[0] + 10, r[1], 13, C.cpu, ' font-weight="700" text-anchor="start"');
      s += during(active[0], active[1], '<rect x="6" y="' + (r[0] - 8) + '" width="748" height="104" rx="8" fill="none" stroke="' + C.hw + '" stroke-width="2"/>');
      s += '<line x1="6" y1="' + (r[0] + 100) + '" x2="754" y2="' + (r[0] + 100) + '" stroke="#ddd"/>';
    });

    // ---- ① Compile time ----
    var y1 = 75;
    s += exe(30, y1, "Executable P1", "swap: 0x10052d", "call 10052d");
    s += exe(170, y1, "Executable P2", "test: 0x100320", "call 100320");
    // 물리 메모리
    s += box(560, 60, 180, 90, "#fff", "#999") + txt(650, 56, "Physical Memory", 10, C.muted);
    s += during(1.5, 13, box(565, 80, 170, 34, C.aL, C.a) + mono(570, 95, "0x100000 P1", 10, C.a, ' text-anchor="start"') + mono(570, 108, "call 10052d", 10, C.a, ' text-anchor="start"'));
    s += during(1.5, 3.0, curve(150, y1 + 5, 300, y1 - 30, 560, 97, C.a));
    s += during(3.0, 13, arrow(290, y1 + 30, 420, 115, C.hw) + txt(440, 120, "✗", 26, C.hw, ' font-weight="700"') + txt(470, 140, "같은 0x100000 → 충돌", 11, C.hw, ' text-anchor="start"'));

    // ---- ② Load time ----
    var y2 = 185;
    s += exe(30, y2, "Executable P1", "swap: 0x10052d", "call 10052d");
    s += exe(170, y2, "Executable P2", "test: 0x100320", "call 100320");
    s += box(560, 170, 180, 90, "#fff", "#999");
    s += during(4.5, 13, curve(150, y2 + 5, 300, y2 - 45, 560, 190, C.a) + txt(345, 205, "+0x100000", 11, C.a, ' font-weight="700"'));
    s += during(4.5, 13, arrow(290, y2 + 35, 560, 236, C.b) + txt(420, 238, "+0x200000", 11, C.b, ' font-weight="700"'));
    s += during(5.2, 13, box(565, 175, 170, 38, C.aL, C.a) + mono(570, 190, "0x200000 P1", 10, C.a, ' text-anchor="start"') + mono(570, 205, "call 20052d", 10, C.hw, ' text-anchor="start" font-weight="700"'));
    s += during(5.2, 13, box(565, 217, 170, 38, C.bL, C.b) + mono(570, 232, "0x300000 P2", 10, C.b, ' text-anchor="start"') + mono(570, 247, "call 300320", 10, C.hw, ' text-anchor="start" font-weight="700"'));
    s += during(6.2, 8.0, '<path d="M735,198 C756,210 756,228 737,238" fill="none" stroke="' + C.hw + '" stroke-width="2" stroke-dasharray="4,3" marker-end="url(#abt_arrow)"/>' + txt(440, 262, "P1 → P2 메모리 접근을 막을 장치 없음", 11, C.hw, ' font-weight="700"'));

    // ---- ③ Execution time ----
    var y3 = 295;
    s += exe(30, y3, "Executable P1", "swap: 0x10052d", "call 10052d");
    s += exe(170, y3, "Executable P2", "test: 0x100320", "call 100320");
    // CPU 영역
    s += box(320, 285, 150, 80, C.cpuL, C.cpu) + txt(395, 300, "CPU (MMU)", 11, C.cpu, ' font-weight="700"');
    s += box(560, 280, 180, 90, "#fff", "#999");
    s += during(8.0, 13, box(565, 285, 170, 38, C.aL, C.a) + mono(570, 300, "0x200000 P1", 10, C.a, ' text-anchor="start"') + mono(570, 315, "call 10052d", 10, C.a, ' text-anchor="start"'));
    s += during(8.0, 13, box(565, 327, 170, 38, C.bL, C.b) + mono(570, 342, "0x300000 P2", 10, C.b, ' text-anchor="start"') + mono(570, 357, "call 100320", 10, C.b, ' text-anchor="start"'));
    s += during(8.0, 9.8, txt(395, 330, "파일 내용 그대로 로드", 11, C.muted));
    s += during(9.8, 13, mono(395, 322, "0x10052d +100000", 11, C.a, ' font-weight="700"') + mono(395, 340, "0x100320 +200000", 11, C.b, ' font-weight="700"'));
    s += during(9.8, 13, arrow(470, 318, 562, 304, C.a) + arrow(470, 336, 562, 346, C.b));
    s += during(9.8, 13, mono(515, 300, "0x20052d", 10, C.hw, ' font-weight="700"') + mono(515, 362, "0x300320", 10, C.hw, ' font-weight="700"'));

    return s + '</svg>';
  }
};
