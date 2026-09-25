// ============================================================
// syscall_trap — 시스템 콜 한 바퀴: ecall → uservec → usertrap → syscall → usertrapret → sret
// (sim:syscall_trap 과 이름만 같고 별개 — anims/sims 는 다른 이름공간)
// 시간축(초): 0 li a7 → 1.5 ecall(HW: sepc·mode·pc) → 3 uservec(trapframe 저장, 커널 스택)
//   → 4.5 usertrap(epc = sepc, +4) → 6 syscall(a0 = 10) → 7.5 usertrapret(w_sepc)
//   → 9 userret 복원 → 9.8 sret → user 모드 ret 부터 재개 → 13 끝
// 근거: 41_트랩, 40_제한적 직접 실행, 47_usertrap, 48_usertrapret, 4G_sret, AB_xv6 시스템 콜 경로
// ============================================================
window.ANIMS = window.ANIMS || {};
ANIMS["syscall_trap"] = {
  title: "시스템 콜 한 바퀴 — ecall 에서 sret 까지 13초",
  desc: "'''ecall'''([[트랩]]) → 하드웨어가 [[sepc]]·모드·pc 를 바꿈 → [[trapframe]] 저장 → [[usertrap]] 이 epc += 4 → syscall() → [[usertrapret]] 이 sepc 설정 → [[sret]] 으로 user 모드 복귀",
  duration: 13,
  build: function () {
    var D = 13;
    var C = {
      a: "#1d65b3", aL: "#dbe8f7",
      cpu: "#3b2f4a", cpuL: "#efe9f6",
      hw: "#d6465f", os: "#e09a40", osL: "#fdeec2", ok: "#2e9e4f", muted: "#777"
    };
    var MONO = ' font-family="ui-monospace,Menlo,Consolas,monospace"';
    function r4(x) { return Math.round(x * 10000) / 10000; }
    function box(x, y, w, h, fill, stroke, extra) {
      return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="8" fill="' + fill + '" stroke="' + stroke + '" stroke-width="2"' + (extra || "") + '/>';
    }
    function txt(x, y, s, size, fill, extra) {
      return '<text x="' + x + '" y="' + y + '" font-size="' + (size || 13) + '" fill="' + (fill || "#222") + '"' + (/text-anchor/.test(extra || "") ? "" : ' text-anchor="middle"') + (extra || "") + '>' + s + '</text>';
    }
    function ltxt(x, y, s, size, fill, extra) {
      return txt(x, y, s, size, fill, ' text-anchor="start"' + (extra || ""));
    }
    // from~to 초에만 보이기
    function show(from, to) {
      var f = r4(from / D), t = r4(to / D);
      if (from <= 0) return '<animate attributeName="opacity" values="1;1;0;0" keyTimes="0;' + t + ';' + r4(t + 0.01) + ';1" dur="' + D + 's" fill="freeze"/>';
      if (to >= D) return '<animate attributeName="opacity" values="0;0;1;1" keyTimes="0;' + f + ';' + r4(f + 0.01) + ';1" dur="' + D + 's" fill="freeze"/>';
      return '<animate attributeName="opacity" values="0;0;1;1;0;0" keyTimes="0;' + f + ';' + r4(f + 0.01) + ';' + t + ';' + r4(t + 0.01) + ';1" dur="' + D + 's" fill="freeze"/>';
    }
    function seg(from, to, inner) {
      return '<g opacity="' + (from <= 0 ? 1 : 0) + '">' + inner + show(from, to) + '</g>';
    }
    function packet(from, len, path, color) {
      return '<rect x="-20" y="-7" width="40" height="14" rx="4" fill="' + color + '" opacity="0">' +
        '<animateMotion begin="' + from + 's" dur="' + len + 's" fill="freeze" path="' + path + '"/>' +
        show(from, from + len) + '</rect>';
    }

    var s = '<svg viewBox="0 0 760 370" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="시스템 콜 트랩 왕복 애니메이션">';
    s += '<defs><marker id="st_arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="' + C.a + '"/></marker>' +
      '<marker id="st_arrow_r" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="' + C.hw + '"/></marker>' +
      '<marker id="st_arrow_g" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="' + C.ok + '"/></marker>' +
      '<marker id="st_arrow_o" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="' + C.os + '"/></marker></defs>';

    // ---- 단계 자막 ----
    var caps = [
      [0, 1.5, "유저 프로그램이 read() 스텁 실행 중 — li a7, SYS_read (user mode)"],
      [1.5, 3, "① ecall: 하드웨어가 sepc ← ecall 주소, mode ← kernel, pc ← uservec"],
      [3, 4.5, "② uservec: 유저 레지스터 31개 → trapframe, sp → 커널 스택"],
      [4.5, 6, "③ usertrap(): epc = sepc, scause == 8 이므로 epc += 4 (다음 명령어)"],
      [6, 7.5, "④ syscall(): a7 로 sys_read 선택 → 반환값을 trapframe-&gt;a0 에"],
      [7.5, 9, "⑤ usertrapret(): w_sepc(p-&gt;trapframe-&gt;epc) — 돌아갈 주소 결정"],
      [9, 9.8, "⑥ userret: trapframe → 레지스터 복원"],
      [9.8, 11.3, "⑦ sret: pc ← sepc, mode ← user — ecall 다음 명령어(ret)부터"],
      [11.3, 13, "유저 입장에선 함수 하나 부른 것 같지만, 모드 전환이 두 번 있었다"]
    ];
    caps.forEach(function (c) { s += seg(c[0], c[1], txt(380, 26, c[2], 14, "#222", ' font-weight="700"')); });

    // ================= User 프로그램 (왼쪽) =================
    s += box(20, 48, 210, 180, C.aL, C.a);
    s += ltxt(34, 70, "User 프로그램", 14, C.a, ' font-weight="700"');
    s += ltxt(34, 88, "user/usys.S 의 read 스텁", 11, C.muted);
    // 현재 줄 하이라이트
    s += seg(0, 1.5, '<rect x="28" y="100" width="194" height="24" rx="4" fill="#fff" stroke="' + C.a + '"/>');
    s += seg(1.5, 2.2, '<rect x="28" y="130" width="194" height="24" rx="4" fill="#ffe3e8" stroke="' + C.hw + '"/>');
    s += seg(2.2, 9.8, '<rect x="28" y="130" width="194" height="24" rx="4" fill="#f4f4f4" stroke="#bbb" stroke-dasharray="4 3"/>');
    s += seg(9.8, D, '<rect x="28" y="160" width="194" height="24" rx="4" fill="#dff3e4" stroke="' + C.ok + '"/>');
    s += ltxt(36, 117, "+0x04  li a7, SYS_read", 12.5, "#222", MONO);
    s += ltxt(36, 147, "+0x08  ecall", 12.5, "#222", MONO + ' font-weight="700"');
    s += ltxt(36, 177, "+0x0c  ret", 12.5, "#222", MONO);
    s += seg(2.2, 9.8, ltxt(34, 212, "여기서 멈춰 있음 (커널이 도는 중)", 11, C.muted));
    s += seg(10.4, D, ltxt(34, 212, "a0 = 10 → n = read(...) 의 값", 11.5, C.ok, ' font-weight="700"'));

    // ================= CPU (가운데) =================
    s += box(275, 48, 210, 180, C.cpuL, C.cpu);
    s += ltxt(289, 70, "CPU", 14, C.cpu, ' font-weight="700"');
    // 모드 배지
    s += seg(0, 2.2, box(345, 56, 126, 22, "#cdefd2", "#1d6b2a") + txt(408, 72, "user mode", 12, "#1d6b2a", ' font-weight="700"'));
    s += seg(2.2, 9.8, box(345, 56, 126, 22, "#ffd9d9", "#a52f2f") + txt(408, 72, "kernel mode", 12, "#a52f2f", ' font-weight="700"'));
    s += seg(9.8, D, box(345, 56, 126, 22, "#cdefd2", "#1d6b2a") + txt(408, 72, "user mode", 12, "#1d6b2a", ' font-weight="700"'));
    // pc
    s += ltxt(289, 112, "pc", 12, C.muted, MONO);
    var pcs = [
      [0, 1.5, "read+0x04", "#222"], [1.5, 2.2, "read+0x08", C.hw], [2.2, 4.5, "uservec", C.os],
      [4.5, 6, "usertrap()", C.os], [6, 7.5, "syscall()", C.os], [7.5, 9, "usertrapret()", C.os],
      [9, 9.8, "userret", C.os], [9.8, D, "read+0x0c", C.ok]
    ];
    pcs.forEach(function (p) { s += seg(p[0], p[1], ltxt(335, 112, p[2], 13, p[3], MONO + ' font-weight="700"')); });
    // sepc
    s += ltxt(289, 145, "sepc", 12, C.muted, MONO);
    s += seg(0, 2.2, ltxt(335, 145, "—", 13, "#999", MONO));
    s += seg(2.2, 8.2, ltxt(335, 145, "read+0x08", 13, C.hw, MONO + ' font-weight="700"'));
    s += seg(8.2, D, ltxt(335, 145, "read+0x0c", 13, C.ok, MONO + ' font-weight="700"'));
    // scause
    s += ltxt(289, 178, "scause", 12, C.muted, MONO);
    s += seg(0, 2.2, ltxt(345, 178, "—", 13, "#999", MONO));
    s += seg(2.2, D, ltxt(345, 178, "8 (U-mode ecall)", 12, C.cpu, MONO));
    s += seg(1.5, 3.2, ltxt(289, 212, "HW 가 한 번에 바꿈", 11.5, C.hw, ' font-weight="700"'));
    s += seg(9.8, 11.3, ltxt(289, 212, "sret: 셋을 원자적으로", 11.5, C.ok, ' font-weight="700"'));

    // ================= 커널 (오른쪽) =================
    s += box(530, 48, 210, 180, "#faf6ff", C.cpu);
    s += ltxt(544, 70, "커널 코드 경로", 14, C.cpu, ' font-weight="700"');
    var ks = [
      [2.2, 4.5, "uservec (trampoline.S)"],
      [4.5, 6, "usertrap()"],
      [6, 7.5, "syscall() → sys_read()"],
      [7.5, 9, "usertrapret()"],
      [9, 9.8, "userret → sret"]
    ];
    ks.forEach(function (k, i) {
      var y = 84 + i * 27;
      s += '<rect x="538" y="' + y + '" width="194" height="23" rx="4" fill="#fff" stroke="#d7cfe3"/>';
      s += seg(k[0], k[1], '<rect x="538" y="' + y + '" width="194" height="23" rx="4" fill="' + C.osL + '" stroke="' + C.os + '" stroke-width="2"/>');
      s += ltxt(546, y + 16, k[2], 12, "#222", MONO);
    });

    // ================= trapframe (아래 왼쪽) =================
    s += box(20, 256, 350, 76, "#fff", C.a);
    s += ltxt(34, 276, "p-&gt;trapframe", 13, C.a, ' font-weight="700"');
    s += txt(85, 298, "epc", 12, C.muted, MONO);
    s += txt(200, 298, "a7", 12, C.muted, MONO);
    s += txt(310, 298, "a0", 12, C.muted, MONO);
    s += seg(0, 4.8, txt(85, 322, "—", 13, "#999", MONO));
    s += seg(4.8, 5.4, txt(85, 322, "read+0x08", 13, C.hw, MONO + ' font-weight="700"'));
    s += seg(5.4, D, txt(85, 322, "read+0x0c", 13, C.ok, MONO + ' font-weight="700"'));
    s += seg(5.4, 7, txt(145, 322, "+4", 12, C.os, ' font-weight="700"'));
    s += seg(0, 3.4, txt(200, 322, "—", 13, "#999", MONO));
    s += seg(3.4, D, txt(200, 322, "SYS_read", 13, C.a, MONO + ' font-weight="700"'));
    s += seg(0, 3.4, txt(310, 322, "—", 13, "#999", MONO));
    s += seg(3.4, 6.8, txt(310, 322, "fd", 13, C.a, MONO + ' font-weight="700"'));
    s += seg(6.8, D, txt(310, 322, "10", 13, C.ok, MONO + ' font-weight="700"'));

    // ================= 커널 스택 (아래 오른쪽) =================
    s += box(390, 256, 350, 76, "#fff", C.cpu);
    s += ltxt(404, 276, "커널 스택 (p-&gt;kstack)", 13, C.cpu, ' font-weight="700"');
    s += seg(0, 3.8, ltxt(404, 310, "user 모드 동안 비어 있음 — sp = 유저 스택", 12, C.muted));
    s += seg(3.8, 9.4, '<rect x="404" y="289" width="322" height="32" rx="5" fill="' + C.cpuL + '" stroke="' + C.cpu + '"/>' +
      ltxt(414, 310, "sp → 여기. usertrap()·syscall() 의 지역변수", 12, C.cpu, ' font-weight="700"'));
    s += seg(9.4, D, ltxt(404, 310, "비워짐 — sp 는 다시 유저 스택", 12, C.muted));

    // ================= 화살표 / 이동 =================
    // ① ecall: user → CPU(sepc), CPU → kernel(uservec)
    s += seg(1.5, 3, '<path d="M222,142 C250,142 250,140 283,140" fill="none" stroke="' + C.hw + '" stroke-width="2.5" marker-end="url(#st_arrow_r)"/>' +
      '<path d="M480,104 C505,104 510,96 536,96" fill="none" stroke="' + C.hw + '" stroke-width="2.5" marker-end="url(#st_arrow_r)"/>');
    // ② 레지스터 31개 → trapframe
    s += seg(3, 4.5, '<path d="M350,228 L350,254" fill="none" stroke="' + C.a + '" stroke-width="2.5" marker-end="url(#st_arrow)"/>' +
      ltxt(360, 245, "레지스터 31개 저장", 11.5, C.a, ' font-weight="700"'));
    s += packet(3, 1, "M380,200 L250,318", C.a);
    // ③ sepc → trapframe->epc
    s += seg(4.5, 5.4, '<path d="M300,228 L300,246 L178,246 C155,246 155,317 136,317" fill="none" stroke="' + C.hw + '" stroke-width="2.2" stroke-dasharray="5 3" marker-end="url(#st_arrow_r)"/>' +
      ltxt(185, 241, "epc = r_sepc()", 11.5, C.hw, MONO + ' font-weight="700"'));
    // ④ 반환값 → a0
    s += seg(6, 7.5, '<path d="M560,228 L560,246 L362,246 C345,246 345,317 328,317" fill="none" stroke="' + C.ok + '" stroke-width="2.2" marker-end="url(#st_arrow_g)"/>' +
      ltxt(420, 241, "a0 = return 10", 11.5, C.ok, MONO + ' font-weight="700"'));
    // ⑤ w_sepc(epc): trapframe->epc → sepc
    s += seg(7.5, 9, '<path d="M136,317 C155,317 155,246 178,246 L300,246 L300,231" fill="none" stroke="' + C.os + '" stroke-width="2.5" marker-end="url(#st_arrow_o)"/>' +
      ltxt(185, 241, "w_sepc(epc)", 11.5, C.os, MONO + ' font-weight="700"'));
    // ⑥ userret: trapframe → 레지스터
    s += packet(9, 0.8, "M250,318 L380,200", C.a);
    // ⑦ sret: CPU → user 의 ret 줄
    s += seg(9.8, 11.3, '<path d="M283,172 C258,172 250,172 224,172" fill="none" stroke="' + C.ok + '" stroke-width="2.5" marker-end="url(#st_arrow_g)"/>');

    // ---- 요점 ----
    s += txt(380, 358, "들어갈 땐 HW 가 sepc 에 ecall 주소를, 나올 땐 sret 이 sepc 로 점프 — 그 사이 +4 는 usertrap() 이 한다", 12, C.muted);
    s += '</svg>';
    return s;
  }
};
