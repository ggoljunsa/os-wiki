// ============================================================
// ctx_switch — 타이머 인터럽트 → 컨텍스트 스위치 (A 저장 → B 복원)
// CONTRACT §7 참조 구현. 시간축(초): 0 A 실행 → 2 타이머 → 3 유저 상태 저장(HW)
//   → 4.5 switch(): A 커널 레지스터 → PCB(A) → 6 PCB(B) → CPU → 7.5 B 실행 → 10 끝
// ============================================================
window.ANIMS = window.ANIMS || {};
ANIMS["ctx_switch"] = {
  title: "컨텍스트 스위치 — CPU 가 A 에서 B 로 넘어가는 10초",
  desc: "[[타이머 인터럽트]] → ① 하드웨어가 유저 상태를 [[커널 스택]]에 → ② [[컨텍스트 스위치|switch()]] 가 커널 레지스터를 [[PCB]](A) 에 저장 → PCB(B) 에서 복원 → B 실행",
  duration: 10,
  build: function () {
    var C = {
      a: "#1d65b3", aL: "#dbe8f7",       // Process A 파랑
      b: "#2e9e4f", bL: "#dff3e4",       // Process B 초록
      cpu: "#3b2f4a", cpuL: "#efe9f6",
      hw: "#d6465f", os: "#e09a40", muted: "#777", line: "#b9c4d8"
    };
    function box(x, y, w, h, fill, stroke, extra) {
      return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="8" fill="' + fill + '" stroke="' + stroke + '" stroke-width="2"' + (extra || "") + '/>';
    }
    function txt(x, y, s, size, fill, extra) {
      return '<text x="' + x + '" y="' + y + '" font-size="' + (size || 13) + '" fill="' + (fill || "#222") + '" text-anchor="middle"' + (extra || "") + '>' + s + '</text>';
    }
    // 특정 구간에만 보이는 요소: opacity 0→1→0
    function show(from, to, dur) {
      return '<animate attributeName="opacity" values="0;0;1;1;0;0" keyTimes="0;' + (from / dur) + ';' + (from / dur + 0.02) + ';' + (to / dur) + ';' + Math.min(1, to / dur + 0.02) + ';1" dur="' + dur + 's" fill="freeze"/>';
    }
    var D = 10;
    var s = '<svg viewBox="0 0 760 330" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="컨텍스트 스위치 애니메이션">';
    s += '<defs><marker id="cs_arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#555"/></marker></defs>';

    // ---- 단계 자막 (위) ----
    var caps = [
      [0, 2, "Process A 가 CPU 에서 실행 중 (유저 모드)"],
      [2, 3, "⏰ 타이머 인터럽트! → 트랩 → 커널 모드"],
      [3, 4.5, "① 하드웨어: A 의 유저 레지스터·PC 를 A 의 커널 스택(trapframe)에 저장"],
      [4.5, 6, "② switch(): A 의 커널 레지스터(ra, sp, callee-saved)를 PCB(A) 에 저장"],
      [6, 7.5, "③ PCB(B) 에서 B 의 커널 레지스터 복원 → B 의 커널 스택으로 갈아탐"],
      [7.5, 10, "④ return-from-trap → Process B 가 유저 모드에서 실행"]
    ];
    caps.forEach(function (c) {
      s += '<g opacity="0">' + txt(380, 26, c[2], 14, "#222", ' font-weight="700"') + show(c[0], c[1], D) + '</g>';
    });

    // ---- Process A (왼쪽) ----
    s += box(30, 60, 200, 230, C.aL, C.a);
    s += txt(130, 84, "Process A", 15, C.a, ' font-weight="700"');
    s += box(50, 100, 160, 70, "#fff", C.a);
    s += txt(130, 120, "커널 스택 (trapframe)", 11, C.muted);
    s += '<g opacity="0">' + txt(130, 150, "PC=0x4a1c  sp  a0…", 12, C.hw, ' font-weight="700"') + show(3.2, 10, D) + '</g>';
    s += box(50, 190, 160, 80, "#fff", C.a);
    s += txt(130, 210, "PCB(A)  p-&gt;context", 11, C.muted);
    s += '<g opacity="0">' + txt(130, 240, "ra  sp  s0–s11", 12, C.os, ' font-weight="700"') + show(4.8, 10, D) + '</g>';
    s += txt(130, 260, "(커널 레지스터)", 10, C.muted);

    // ---- Process B (오른쪽) ----
    s += box(530, 60, 200, 230, C.bL, C.b);
    s += txt(630, 84, "Process B", 15, C.b, ' font-weight="700"');
    s += box(550, 100, 160, 70, "#fff", C.b);
    s += txt(630, 120, "커널 스택 (trapframe)", 11, C.muted);
    s += txt(630, 150, "PC=0x7f00  sp  a0…", 12, C.b, ' font-weight="700"');
    s += box(550, 190, 160, 80, "#fff", C.b);
    s += txt(630, 210, "PCB(B)  p-&gt;context", 11, C.muted);
    // B 의 PCB 값: 복원 전엔 있고, 복원 후엔 CPU 로 갔다는 표시로 흐려짐
    s += '<g>' + txt(630, 240, "ra  sp  s0–s11", 12, C.os, ' font-weight="700"') +
      '<animate attributeName="opacity" values="1;1;0.3;0.3" keyTimes="0;0.6;0.66;1" dur="' + D + 's" fill="freeze"/></g>';
    s += txt(630, 260, "(예전에 저장해 둔 것)", 10, C.muted);

    // ---- CPU (가운데) ----
    s += box(290, 90, 180, 150, C.cpuL, C.cpu);
    s += txt(380, 114, "CPU", 15, C.cpu, ' font-weight="700"');
    // 모드 배지
    s += '<g>' + box(320, 124, 120, 22, "#cdefd2", "#1d6b2a") + txt(380, 140, "user mode", 12, "#1d6b2a", ' font-weight="700"') +
      '<animate attributeName="opacity" values="1;1;0;0;1;1" keyTimes="0;0.2;0.22;0.75;0.77;1" dur="' + D + 's" fill="freeze"/></g>';
    s += '<g opacity="0">' + box(320, 124, 120, 22, "#ffd9d9", "#a52f2f") + txt(380, 140, "kernel mode", 12, "#a52f2f", ' font-weight="700"') + show(2, 7.5, D) + '</g>';
    // 레지스터 내용: A 것 → 비움 → B 것
    s += txt(380, 168, "registers / PC", 11, C.muted);
    s += '<g>' + txt(380, 192, "A: PC=0x4a1c …", 13, C.a, ' font-weight="700"') +
      '<animate attributeName="opacity" values="1;1;0;0" keyTimes="0;0.45;0.5;1" dur="' + D + 's" fill="freeze"/></g>';
    s += '<g opacity="0">' + txt(380, 192, "B: PC=0x7f00 …", 13, C.b, ' font-weight="700"') + show(6.5, 10, D) + '</g>';
    s += '<g opacity="0">' + txt(380, 218, "커널: ra sp s0–s11", 11, C.os) + show(4.5, 6.5, D) + '</g>';

    // ---- 실행 중 표시 (CPU 위에서 도는 점) ----
    s += '<circle r="6" fill="' + C.a + '"><animateMotion dur="1s" repeatCount="3" begin="0s" path="M300,95 L460,95"/>' +
      '<animate attributeName="opacity" values="1;1;0;0" keyTimes="0;0.2;0.21;1" dur="' + D + 's" fill="freeze"/></circle>';
    s += '<circle r="6" fill="' + C.b + '" opacity="0"><animateMotion dur="1s" repeatCount="3" begin="7.5s" path="M300,95 L460,95"/>' +
      '<animate attributeName="opacity" values="0;0;1;1" keyTimes="0;0.74;0.76;1" dur="' + D + 's" fill="freeze"/></circle>';

    // ---- 타이머 인터럽트 번개 ----
    s += '<g opacity="0"><polygon points="380,40 372,66 384,62 376,90 396,58 384,62 392,40" fill="' + C.hw + '"/>' +
      txt(410, 64, "timer!", 12, C.hw, ' font-weight="700" text-anchor="start"') +
      '<animate attributeName="opacity" values="0;0;1;0;1;0;0" keyTimes="0;0.2;0.22;0.25;0.28;0.32;1" dur="' + D + 's" fill="freeze"/></g>';

    // ---- 이동 화살표/패킷 ----
    // ① HW: CPU 유저 상태 → A 커널 스택
    s += '<g opacity="0"><path d="M290,180 C250,180 250,135 210,135" fill="none" stroke="' + C.hw + '" stroke-width="2.5" marker-end="url(#cs_arrow)"/>' +
      txt(250, 120, "① HW 저장", 11, C.hw, ' font-weight="700"') + show(3, 4.5, D) + '</g>';
    s += '<rect width="46" height="16" rx="4" fill="' + C.hw + '" opacity="0"><animateMotion begin="3s" dur="1.2s" fill="freeze" path="M267,172 C230,172 230,127 187,127"/>' +
      '<animate attributeName="opacity" values="0;0;1;1;0;0" keyTimes="0;0.3;0.31;0.42;0.43;1" dur="' + D + 's" fill="freeze"/></rect>';
    // ② switch: CPU 커널 레지스터 → PCB(A)
    s += '<g opacity="0"><path d="M290,215 C250,215 250,230 210,230" fill="none" stroke="' + C.os + '" stroke-width="2.5" marker-end="url(#cs_arrow)"/>' +
      txt(250, 252, "② switch() 저장", 11, C.os, ' font-weight="700"') + show(4.5, 6, D) + '</g>';
    s += '<rect width="46" height="16" rx="4" fill="' + C.os + '" opacity="0"><animateMotion begin="4.5s" dur="1.2s" fill="freeze" path="M267,207 C230,207 230,222 187,222"/>' +
      '<animate attributeName="opacity" values="0;0;1;1;0;0" keyTimes="0;0.45;0.46;0.57;0.58;1" dur="' + D + 's" fill="freeze"/></rect>';
    // ③ PCB(B) → CPU
    s += '<g opacity="0"><path d="M550,230 C510,230 510,215 470,215" fill="none" stroke="' + C.os + '" stroke-width="2.5" marker-end="url(#cs_arrow)"/>' +
      txt(510, 252, "③ switch() 복원", 11, C.os, ' font-weight="700"') + show(6, 7.5, D) + '</g>';
    s += '<rect width="46" height="16" rx="4" fill="' + C.os + '" opacity="0"><animateMotion begin="6s" dur="1.2s" fill="freeze" path="M527,222 C490,222 490,207 447,207"/>' +
      '<animate attributeName="opacity" values="0;0;1;1;0;0" keyTimes="0;0.6;0.61;0.72;0.73;1" dur="' + D + 's" fill="freeze"/></rect>';
    // ④ B 커널 스택 → CPU (return-from-trap 로 유저 상태 복원)
    s += '<g opacity="0"><path d="M550,135 C510,135 510,180 470,180" fill="none" stroke="' + C.b + '" stroke-width="2.5" marker-end="url(#cs_arrow)"/>' +
      txt(510, 120, "④ sret 복원", 11, C.b, ' font-weight="700"') + show(7.5, 9, D) + '</g>';
    s += '<rect width="46" height="16" rx="4" fill="' + C.b + '" opacity="0"><animateMotion begin="7.5s" dur="1.2s" fill="freeze" path="M527,127 C490,127 490,172 447,172"/>' +
      '<animate attributeName="opacity" values="0;0;1;1;0;0" keyTimes="0;0.75;0.76;0.87;0.88;1" dur="' + D + 's" fill="freeze"/></rect>';

    // ---- 아래 요점 ----
    s += txt(380, 316, "유저 레지스터는 ①에서 하드웨어가, 커널 레지스터는 ②③에서 switch() 가 — 저장은 두 번 일어난다", 12, C.muted);
    s += '</svg>';
    return s;
  }
};
