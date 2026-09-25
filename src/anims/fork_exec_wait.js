// ============================================================
// fork_exec_wait — OSTEP p3.c: fork() 로 복제 → 자식 execvp("wc") 로 내용물 교체 → 부모 wait() 로 회수
// 시간축(초): 0 부모 실행 → 1.5 fork 복제 → 3.5 반환값 차이 → 5 부모 wait(Blocked)
//   → 6.5 자식 exec(주소 공간 교체) → 8.5 wc 실행·exit(ZOMBIE) → 9.8 부모 깨어남 → 11.5 rc_wait → 14 끝
// 근거: 32_프로세스 API, 35_fork, 36_exec (p3.c 출력: 29383 / 29384), 37_wait, sims/fork_exec.js
// ============================================================
window.ANIMS = window.ANIMS || {};
ANIMS["fork_exec_wait"] = {
  title: "fork → exec → wait — 몸을 늘리고, 내용물을 바꾸고, 회수하는 14초",
  desc: "[[fork]] 는 새 PID 의 복사본을, [[exec]] 는 같은 PID 안의 주소 공간을 새 프로그램으로 교체, [[wait]] 는 부모를 Blocked 로 재웠다가 끝난 자식의 PID 를 돌려준다 (OSTEP p3.c)",
  duration: 14,
  build: function () {
    var D = 14;
    var C = {
      a: "#1d65b3", aL: "#dbe8f7",
      b: "#2e9e4f", bL: "#dff3e4",
      c: "#e09a40", cL: "#fdeec2", cD: "#8a5a00",
      cpu: "#3b2f4a", hw: "#d6465f", muted: "#777"
    };
    var BADGE = {
      running: ["#cdefd2", "#1d6b2a"], ready: ["#fdeec2", "#8a6000"], blocked: ["#dcdcf2", "#3c3c88"],
      zombie: ["#e6e6e6", "#555"], reaped: ["#f4f4f4", "#999"]
    };
    var MONO = ' font-family="ui-monospace,Menlo,Consolas,monospace"';
    function r4(x) { return Math.round(x * 10000) / 10000; }
    function box(x, y, w, h, fill, stroke, extra) {
      return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="8" fill="' + fill + '" stroke="' + stroke + '" stroke-width="2"' + (extra || "") + '/>';
    }
    function txt(x, y, s, size, fill, extra) {
      return '<text x="' + x + '" y="' + y + '" font-size="' + (size || 13) + '" fill="' + (fill || "#222") + '"' +
        (/text-anchor/.test(extra || "") ? "" : ' text-anchor="middle"') + (extra || "") + '>' + s + '</text>';
    }
    function ltxt(x, y, s, size, fill, extra) { return txt(x, y, s, size, fill, ' text-anchor="start"' + (extra || "")); }
    function show(from, to) {
      var f = r4(from / D), t = r4(to / D);
      if (from <= 0) return '<animate attributeName="opacity" values="1;1;0;0" keyTimes="0;' + t + ';' + r4(t + 0.01) + ';1" dur="' + D + 's" fill="freeze"/>';
      if (to >= D) return '<animate attributeName="opacity" values="0;0;1;1" keyTimes="0;' + f + ';' + r4(f + 0.01) + ';1" dur="' + D + 's" fill="freeze"/>';
      return '<animate attributeName="opacity" values="0;0;1;1;0;0" keyTimes="0;' + f + ';' + r4(f + 0.01) + ';' + t + ';' + r4(t + 0.01) + ';1" dur="' + D + 's" fill="freeze"/>';
    }
    function seg(from, to, inner) {
      return '<g opacity="' + (from <= 0 ? 1 : 0) + '">' + inner + show(from, to) + '</g>';
    }
    function badge(x, y, kind, label) {
      var b = BADGE[kind];
      return box(x, y, 104, 22, b[0], b[1]) + txt(x + 52, y + 16, label, 12, b[1], ' font-weight="700"');
    }
    // 주소 공간 세그먼트 3칸 (stack / data·heap / code)
    function space(x, fill, stroke, lines) {
      var out = "";
      [118, 166, 214].forEach(function (y, i) {
        out += '<rect x="' + x + '" y="' + y + '" width="140" height="44" rx="4" fill="' + fill + '" stroke="' + stroke + '" stroke-width="1.5"/>';
        var L = lines[i];
        if (L.length === 1) out += txt(x + 70, y + 27, L[0], 11.5, stroke, ' font-weight="700"');
        else out += txt(x + 70, y + 19, L[0], 11.5, stroke, ' font-weight="700"') + txt(x + 70, y + 35, L[1], 10.5, stroke, MONO);
      });
      return out;
    }
    var PX = 30, CX = 430;   // 부모 / 자식 상자 x

    var s = '<svg viewBox="0 0 760 360" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="fork exec wait 애니메이션">';
    s += '<defs><marker id="few_arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="' + C.cpu + '"/></marker>' +
      '<marker id="few_arrow_g" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="' + C.b + '"/></marker></defs>';

    // ---- 단계 자막 ----
    var caps = [
      [0, 1.5, "부모 p3 (PID 29383) 실행 중 — 다음 줄은 rc = fork()"],
      [1.5, 3.5, "fork(): 부모를 통째로 복제 → 자식 (새 PID 29384, 같은 코드, 주소 공간 복사본)"],
      [3.5, 5, "반환값만 다르다: 부모는 rc = 29384 (자식 PID), 자식은 rc = 0"],
      [5, 6.5, "부모: wait(NULL) → Blocked (자식이 끝날 때까지 CPU 를 양보)"],
      [6.5, 8.5, "자식: execvp(\"wc\") → 주소 공간을 wc 로 통째로 교체 (PID 는 그대로)"],
      [8.5, 9.8, "wc 가 main() 부터 실행·출력 → exit() → 자식은 ZOMBIE"],
      [9.8, 11.5, "커널이 부모를 깨움: Blocked → Ready → Running, 자식 PCB 회수"],
      [11.5, 14, "wait() 는 끝난 자식의 PID 를 반환 → rc_wait = 29384 (= rc)"]
    ];
    caps.forEach(function (c) { s += seg(c[0], c[1], txt(380, 26, c[2], 14, "#222", ' font-weight="700"')); });

    // ================= 부모 =================
    s += box(PX, 48, 300, 250, C.aL, C.a);
    s += ltxt(PX + 15, 72, "부모 (p3)", 14, C.a, ' font-weight="700"');
    s += txt(PX + 285, 72, "PID 29383", 13, C.a, MONO + ' font-weight="700" text-anchor="end"');
    s += seg(0, 5, badge(PX + 15, 84, "running", "running"));
    s += seg(5, 10.3, badge(PX + 15, 84, "blocked", "blocked"));
    s += seg(10.3, 10.9, badge(PX + 15, 84, "ready", "ready"));
    s += seg(10.9, D, badge(PX + 15, 84, "running", "running"));
    s += space(PX + 15, "#fff", C.a, [["stack"], ["data · heap"], ["code: p3"]]);
    s += txt(PX + 85, 280, "주소 공간", 11, C.muted);
    s += ltxt(PX + 168, 135, "rc = fork();", 12, "#222", MONO);
    s += seg(2.6, D, ltxt(PX + 168, 158, "rc = 29384", 12.5, C.a, MONO + ' font-weight="700"'));
    s += seg(5, D, ltxt(PX + 168, 190, "wait(NULL);", 12, "#222", MONO));
    s += seg(5, 10.3, ltxt(PX + 168, 212, "↳ 여기서 잠듦", 11.5, "#3c3c88", ' font-weight="700"'));
    s += seg(11.5, D, '<rect x="' + (PX + 162) + '" y="236" width="128" height="24" rx="4" fill="#fff" stroke="' + C.a + '"/>' +
      ltxt(PX + 168, 253, "rc_wait = 29384", 12, C.a, MONO + ' font-weight="700"'));

    // ================= fork 복제 (유령 이동) =================
    s += '<g opacity="0">' +
      '<g>' + [118, 166, 214].map(function (y) {
        return '<rect x="' + (PX + 15) + '" y="' + y + '" width="140" height="44" rx="4" fill="' + C.bL + '" fill-opacity="0.35" stroke="' + C.b + '" stroke-width="2" stroke-dasharray="5 3"/>';
      }).join("") +
      '<animateTransform attributeName="transform" type="translate" from="0 0" to="400 0" begin="1.6s" dur="0.9s" fill="freeze"/></g>' +
      show(1.6, 2.6) + '</g>';

    // ================= 자식 =================
    var child = "";
    child += box(CX, 48, 300, 250, C.bL, C.b);
    child += seg(0, 7, ltxt(CX + 15, 72, "자식 (p3 복사본)", 14, C.b, ' font-weight="700"'));
    child += seg(7, D, ltxt(CX + 15, 72, "자식 (이제 wc)", 14, C.cD, ' font-weight="700"'));
    child += txt(CX + 285, 72, "PID 29384", 13, C.b, MONO + ' font-weight="700" text-anchor="end"');
    child += seg(7, 9.5, txt(CX + 285, 106, "PID 그대로", 11, C.muted, ' text-anchor="end"'));
    child += seg(0, 9.5, badge(CX + 15, 84, "running", "running"));
    child += seg(9.5, 10.9, badge(CX + 15, 84, "zombie", "ZOMBIE"));
    child += seg(10.9, D, badge(CX + 15, 84, "reaped", "회수됨"));
    // 주소 공간: 복사본 → exec 로 교체
    child += seg(0, 7, space(CX + 15, "#fff", C.b, [["stack (복사본)"], ["data · heap (복사본)"], ["code: p3"]]));
    child += seg(7, D, space(CX + 15, C.cL, C.cD, [["stack", "argv: wc p3.c"], ["wc 의 data · heap"], ["code: wc"]]));
    child += seg(6.6, 7.4, '<rect x="' + (CX + 11) + '" y="114" width="148" height="148" rx="6" fill="none" stroke="' + C.c + '" stroke-width="4"/>');
    child += txt(CX + 85, 280, "주소 공간", 11, C.muted);
    child += seg(0, 7.2, ltxt(CX + 168, 135, "rc = fork();", 12, "#222", MONO) +
      ltxt(CX + 168, 158, "rc = 0", 12.5, C.b, MONO + ' font-weight="700"'));
    child += seg(7.2, D, ltxt(CX + 168, 146, "(p3 코드는 사라짐)", 11, C.muted));
    s += '<g opacity="0">' + child +
      '<animate attributeName="opacity" values="0;0;1;1;0.4;0.4" keyTimes="0;' + r4(2.5 / D) + ';' + r4(2.6 / D) + ';' + r4(10.9 / D) + ';' + r4(11.2 / D) + ';1" dur="' + D + 's" fill="freeze"/></g>';
    // 자식 쪽 시간 의존 줄 (자식 그룹 밖: 자식 그룹의 opacity 와 곱해지지 않게 따로)
    s += seg(6.5, 10.9, ltxt(CX + 168, 190, "execvp(\"wc\")", 12, C.cD, MONO + ' font-weight="700"'));
    s += seg(7.8, 10.9, ltxt(CX + 168, 212, "→ wc 의 main()", 11.5, C.cD));
    s += seg(8.6, 10.9, ltxt(CX + 168, 235, "29 107 1030 p3.c", 11, "#222", MONO));
    s += seg(9.3, 10.9, ltxt(CX + 168, 258, "exit()", 12, C.hw, MONO + ' font-weight="700"'));

    // ================= 화살표 =================
    s += seg(1.5, 3.5, '<path d="M334,128 L426,128" fill="none" stroke="' + C.cpu + '" stroke-width="2.5" marker-end="url(#few_arrow)"/>' +
      txt(380, 118, "fork()", 13, C.cpu, MONO + ' font-weight="700"'));
    s += seg(9.8, 12, '<path d="M426,250 L334,250" fill="none" stroke="' + C.b + '" stroke-width="2.5" marker-end="url(#few_arrow_g)"/>' +
      txt(380, 240, "exit → 깨움", 11.5, C.b, ' font-weight="700"') +
      txt(380, 268, "PID 29384", 11.5, C.b, MONO + ' font-weight="700"'));

    // ---- 아래 요점 ----
    s += txt(380, 334, "fork = 몸을 하나 더 (새 PID) · exec = 내용물만 교체 (PID 그대로, 성공하면 리턴 안 함)", 12, C.muted);
    s += txt(380, 352, "wait = 부모를 Blocked 로 재웠다가, 끝난 자식의 PID 를 돌려받으며 ZOMBIE 를 회수", 12, C.muted);
    s += '</svg>';
    return s;
  }
};
