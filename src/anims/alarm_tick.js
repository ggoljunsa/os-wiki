// ============================================================
// alarm_tick — 과제1 xv6 alarm: sigalarm(3, handler) 한 주기 (A0, A1~A9)
// 시간축(초): 0 sigalarm 기록 → 1.5/2.7/3.9 tick 1·2·3 (alarm_elapsed++)
//   → 3.9 alarm_saved = *trapframe → 5.2 alarm_active=1, elapsed=0, epc=handler
//   → 6.5 sret → handler 실행 → 8 handler 중 tick: 안 셈(재진입 금지)
//   → 9.4 sigreturn: *trapframe = alarm_saved, active=0 → 11 a0 복원 → 12.4 0x1234 재개 → 14 끝
// ============================================================
window.ANIMS = window.ANIMS || {};
ANIMS["alarm_tick"] = {
  title: "xv6 alarm — tick 3번이면 epc 를 handler 로 바꿔치기, sigreturn 이 되돌린다",
  desc: "[[sigalarm|sigalarm(3, handler)]] → [[usertrap|usertrap]]의 [[which_dev|which_dev]] == 2 분기에서 [[alarm_elapsed|alarm_elapsed]]++ → 발사: [[alarm_saved|alarm_saved]] 백업 → [[alarm_active|alarm_active]] = 1 → [[epc|epc]] = handler → [[sigreturn|sigreturn()]] 이 통째 복원 + [[a0 복원|a0 복원]]",
  duration: 14,
  build: function () {
    var C = {
      a: "#1d65b3", aL: "#dbe8f7",
      b: "#2e9e4f", bL: "#dff3e4",
      c: "#e09a40", cL: "#fdeec2",
      cpu: "#3b2f4a", cpuL: "#efe9f6",
      hw: "#d6465f", os: "#e09a40", muted: "#777"
    };
    var D = 14;
    function box(x, y, w, h, fill, stroke, extra) {
      return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="8" fill="' + fill + '" stroke="' + stroke + '" stroke-width="2"' + (extra || "") + '/>';
    }
    function txt(x, y, s, size, fill, extra) {
      var anchor = /text-anchor/.test(extra || "") ? "" : ' text-anchor="middle"';
      return '<text x="' + x + '" y="' + y + '" font-size="' + (size || 13) + '" fill="' + (fill || "#222") + '"' + anchor + (extra || "") + '>' + s + '</text>';
    }
    function mono(x, y, s, size, fill, extra) {
      return txt(x, y, s, size, fill, ' font-family="ui-monospace, Menlo, Consolas, monospace"' + (extra || ""));
    }
    function show(from, to) {
      return '<animate attributeName="opacity" values="0;0;1;1;0;0" keyTimes="0;' + (from / D) + ';' + (from / D + 0.01) + ';' + (to / D) + ';' + Math.min(1, to / D + 0.01) + ';1" dur="' + D + 's" fill="freeze"/>';
    }
    function during(from, to, inner) { return '<g opacity="0">' + inner + show(from, to) + '</g>'; }
    function seq(list, render) { list.forEach(function (v) { s += during(v[0], v[1], render(v[2], v[3])); }); }
    function arrow(d, col) {
      return '<path d="' + d + '" fill="none" stroke="' + col + '" stroke-width="2.5" marker-end="url(#at_arrow)"/>';
    }

    var s = '<svg viewBox="0 0 760 380" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="xv6 alarm 애니메이션">';
    s += '<defs><marker id="at_arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#555"/></marker></defs>';

    // ---- 단계 자막 ----
    seq([
      [0, 1.5, "sigalarm(3, handler): alarm_interval · alarm_handler 를 기록만 한다"],
      [1.5, 2.7, "tick 1: usertrap, which_dev == 2 → alarm_elapsed++ (1)"],
      [2.7, 3.9, "tick 2: alarm_elapsed++ (2)"],
      [3.9, 5.2, "tick 3: elapsed(3) &gt;= interval(3) → ★ alarm_saved = *p-&gt;trapframe"],
      [5.2, 6.5, "alarm_active = 1 · alarm_elapsed = 0 · trapframe-&gt;epc = alarm_handler"],
      [6.5, 8, "usertrapret: sepc ← epc → sret → 유저 모드에서 handler 실행"],
      [8, 9.4, "handler 실행 중 tick: alarm_active == 1 → 세지 않는다 (재진입 금지)"],
      [9.4, 11, "handler 가 sigreturn() → *p-&gt;trapframe = p-&gt;alarm_saved, alarm_active = 0"],
      [11, 12.4, "return p-&gt;trapframe-&gt;a0 → syscall() 이 a0 에 덮어써도 42 그대로 (a0 복원)"],
      [12.4, 14, "sret → sepc = 0x1234: 끊긴 원래 코드가 그 자리에서 재개"]
    ], function (t) { return txt(380, 24, t, 14, "#222", ' font-weight="700"'); });

    // ============ 왼쪽: CPU + tick ============
    s += box(16, 40, 222, 112, C.cpuL, C.cpu);
    s += txt(127, 60, "CPU", 14, C.cpu, ' font-weight="700"');
    var kernel = [[1.5, 2.1], [2.7, 3.3], [3.9, 6.5], [8, 8.6], [9.4, 12.4]];
    var user = [[0, 1.5], [2.1, 2.7], [3.3, 3.9], [6.5, 8], [8.6, 9.4], [12.4, 14]];
    user.forEach(function (w) { s += during(w[0], w[1], box(67, 68, 120, 22, "#cdefd2", "#1d6b2a") + txt(127, 84, "user mode", 12, "#1d6b2a", ' font-weight="700"')); });
    kernel.forEach(function (w) { s += during(w[0], w[1], box(67, 68, 120, 22, "#ffd9d9", "#a52f2f") + txt(127, 84, "kernel mode", 12, "#a52f2f", ' font-weight="700"')); });
    s += txt(127, 110, "지금 실행 중", 10, C.muted);
    seq([
      [0, 1.5, "유저 코드 (0x1234 근처)", C.a], [1.5, 2.1, "usertrap()", C.hw], [2.1, 2.7, "유저 코드 (0x1234 근처)", C.a],
      [2.7, 3.3, "usertrap()", C.hw], [3.3, 3.9, "유저 코드 (0x1234 근처)", C.a], [3.9, 6.5, "usertrap() — 알람 발사", C.hw],
      [6.5, 8, "handler() (user)", C.os], [8, 8.6, "usertrap() — 안 셈", C.hw], [8.6, 9.4, "handler() (user)", C.os],
      [9.4, 12.4, "sys_sigreturn()", C.hw], [12.4, 14, "유저 코드 0x1234 부터", C.b]
    ], function (t, col) { return txt(127, 136, t, 13, col, ' font-weight="700"'); });

    s += box(16, 166, 222, 120, "#fff", "#bbb");
    s += txt(127, 186, "타이머 tick (which_dev == 2)", 11, C.muted);
    var ticks = [
      [1.5, "tick 1", "+1 → 1", C.hw], [2.7, "tick 2", "+1 → 2", C.hw],
      [3.9, "tick 3", "+1 → 3 발사", C.hw], [8, "tick 4", "✗ 안 셈", "#3c3c88"]
    ];
    ticks.forEach(function (tk, i) {
      var x = 26 + i * 52;
      s += '<g opacity="0">' + box(x, 196, 46, 36, tk[3] === C.hw ? "#ffd9d9" : "#dcdcf2", tk[3]) +
        txt(x + 23, 219, tk[1], 11, tk[3], ' font-weight="700"') +
        txt(x + 23, 252, tk[2].split(" ")[0], 11, tk[3], ' font-weight="700"') +
        txt(x + 23, 268, tk[2].split(" ").slice(1).join(" "), 11, tk[3], ' font-weight="700"') + show(tk[0], D) + '</g>';
    });

    // ============ 가운데: struct proc ============
    s += box(252, 40, 250, 246, "#fff", C.a);
    s += mono(377, 60, "struct proc *p", 13, C.a, ' font-weight="700"');
    function row(y, name) { s += mono(392, y, name, 12, "#333", ' text-anchor="end"'); }
    row(90, "alarm_interval"); row(114, "alarm_handler"); row(138, "alarm_elapsed"); row(162, "alarm_active");
    s += mono(402, 90, "3", 14, C.cpu, ' font-weight="700" text-anchor="start"');
    s += mono(402, 114, "handler", 12, C.os, ' font-weight="700" text-anchor="start"');
    seq([[0, 1.8, "0"], [1.8, 3.0, "1"], [3.0, 4.2, "2"], [4.2, 5.6, "3"], [5.6, 14, "0"]], function (v) {
      return mono(402, 139, v, 15, v === "3" ? C.hw : C.cpu, ' font-weight="700" text-anchor="start"');
    });
    s += during(5.6, 7, mono(420, 139, "re-arm", 11, C.muted, ' text-anchor="start"'));
    seq([[0, 5.4, "0"], [5.4, 10.4, "1"], [10.4, 14, "0"]], function (v) {
      return mono(402, 163, v, 15, v === "1" ? C.hw : C.cpu, ' font-weight="700" text-anchor="start"');
    });
    s += during(5.4, 10.4, txt(420, 162, "잠금", 11, C.hw, ' text-anchor="start"'));
    // alarm_saved
    s += box(262, 176, 230, 100, "#fdf6e6", C.os);
    s += mono(377, 194, "alarm_saved", 12, C.os, ' font-weight="700"');
    s += txt(377, 208, "(struct trapframe — 슬롯 하나)", 10, C.muted);
    s += during(0, 4.4, txt(377, 244, "(아직 비어 있음)", 12, C.muted));
    s += during(4.4, 14, mono(377, 236, "epc = 0x1234", 13, C.a, ' font-weight="700"') +
      mono(377, 256, "a0 = 42 · ra sp … 31개", 12, C.a));

    // ============ 오른쪽: p->trapframe ============
    s += box(516, 40, 228, 246, "#fff", C.hw);
    s += mono(630, 60, "p-&gt;trapframe", 13, C.hw, ' font-weight="700"');
    s += txt(630, 76, "지금 이 트랩의 유저 레지스터", 10, C.muted);
    s += mono(630, 112, "epc", 12, "#333");
    seq([
      [0, 5.5, "0x1234", C.a], [5.5, 8, "handler", C.os], [8, 10.2, "handler 안의 PC", "#3c3c88"], [10.2, 14, "0x1234", C.b]
    ], function (v, col) { return mono(630, 138, v, 16, col, ' font-weight="700"'); });
    s += during(8, 10.2, txt(630, 156, "(handler 의 트랩으로 덮임)", 10, "#3c3c88"));
    s += during(10.2, 14, txt(630, 156, "(alarm_saved 에서 복원)", 10, C.b));
    s += mono(630, 186, "a0", 12, "#333");
    seq([
      [0, 8, "42", C.a], [8, 10.2, "? (handler 값)", "#3c3c88"], [10.2, 11.4, "42 (복원)", C.b], [11.4, 14, "42 = 반환값", C.b]
    ], function (v, col) { return mono(630, 212, v, 16, col, ' font-weight="700"'); });
    s += mono(630, 250, "ra sp gp … s0–s11", 11, C.muted);
    s += txt(630, 270, "(트랩마다 uservec 이 덮어씀)", 10, C.muted);

    // ---- 화살표 ----
    // trapframe → alarm_saved 복사
    s += during(3.9, 5.2, arrow("M540,150 C470,160 520,226 494,226", C.os) + txt(470, 271, "복사", 12, C.os, ' font-weight="700"'));
    // alarm_handler → epc
    s += during(5.2, 6.5, arrow("M470,110 C500,110 520,134 574,134", C.os) + txt(528, 98, "epc = handler", 11, C.os, ' font-weight="700" text-anchor="start"'));
    // alarm_saved → trapframe 복원
    s += during(9.4, 11, arrow("M494,250 C540,250 530,190 560,166", C.b) + txt(470, 271, "복원", 12, C.b, ' font-weight="700"'));

    // ---- 지금 커널이 실행하는 줄 ----
    s += box(16, 296, 728, 28, "#f4f4f4", "#ccc");
    seq([
      [0, 1.5, "p-&gt;alarm_interval = n;  p-&gt;alarm_handler = handler;  p-&gt;alarm_elapsed = 0;"],
      [1.5, 3.9, "if (p-&gt;alarm_interval &gt; 0 &amp;&amp; !p-&gt;alarm_active)  p-&gt;alarm_elapsed++;"],
      [3.9, 5.2, "if (p-&gt;alarm_elapsed &gt;= p-&gt;alarm_interval)  p-&gt;alarm_saved = *p-&gt;trapframe;"],
      [5.2, 6.5, "p-&gt;alarm_active = 1;  p-&gt;alarm_elapsed = 0;  p-&gt;trapframe-&gt;epc = (uint64)p-&gt;alarm_handler;"],
      [6.5, 8, "usertrapret(): w_sepc(p-&gt;trapframe-&gt;epc);  …  sret"],
      [8, 9.4, "if (p-&gt;alarm_interval &gt; 0 &amp;&amp; !p-&gt;alarm_active)   // 거짓 → 세지 않음"],
      [9.4, 11, "sys_sigreturn():  *p-&gt;trapframe = p-&gt;alarm_saved;  p-&gt;alarm_active = 0;"],
      [11, 12.4, "return p-&gt;trapframe-&gt;a0;   →  syscall(): p-&gt;trapframe-&gt;a0 = 42"],
      [12.4, 14, "usertrapret(): w_sepc(0x1234);  sret  → 끊긴 명령어부터"]
    ], function (t) { return mono(380, 315, t, 12, C.cpu, ' font-weight="700"'); });

    // ---- 요점 ----
    s += txt(380, 356, "sret 은 sepc 로, sepc 는 trapframe-&gt;epc 에서 온다 → 그래서 epc 를 바꾼다. 되돌릴 문맥은 alarm_saved 슬롯 하나뿐 → handler 중엔 안 센다", 12, C.muted);
    s += '</svg>';
    return s;
  }
};
