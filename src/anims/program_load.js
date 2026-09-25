// ============================================================
// program_load — 디스크의 실행 파일 p 가 메모리 위의 프로세스가 되기까지 (프로세스 생성 5단계)
// 시간축(초): 0 디스크의 p → 1.5 ① 주소 공간 할당 → 3 ② code·data 로드 → 5 ③ stack(argc/argv)
//   → 6.5 ④ heap → 8 ⑤ fd 0·1·2 → 9.3 ⑥ PC ← main(), Ready → 10.2 Running → 13 끝
// 근거: 38_프로그램 로딩 (3강 p.19), 39_주소 공간, 30_프로세스 §5 (3강 p.32~33), 40_제한적 직접 실행 p.9
// ============================================================
window.ANIMS = window.ANIMS || {};
ANIMS["program_load"] = {
  title: "프로그램 로딩 — 실행 파일이 프로세스가 되는 13초",
  desc: "디스크의 실행 파일(code + static data)을 [[주소 공간]]에 올리고, [[스택|stack]]·[[힙|heap]]·fd 를 만든 뒤 [[프로그램 카운터|PC]] 를 '''main()''' 에 — 3강 p.32~33 프로세스 생성 단계",
  duration: 13,
  build: function () {
    var D = 13;
    var C = {
      a: "#1d65b3", aL: "#dbe8f7",
      b: "#2e9e4f", bL: "#dff3e4",
      c: "#e09a40", cL: "#fdeec2", cD: "#8a5a00",
      cpu: "#3b2f4a", cpuL: "#efe9f6", hw: "#d6465f", muted: "#777"
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
    function packet(from, len, path, color) {
      return '<rect x="-12" y="-7" width="24" height="14" rx="3" fill="' + color + '" opacity="0">' +
        '<animateMotion begin="' + from + 's" dur="' + len + 's" fill="freeze" path="' + path + '"/>' +
        show(from, from + len) + '</rect>';
    }

    var s = '<svg viewBox="0 0 760 370" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="프로그램 로딩 애니메이션">';
    s += '<defs><marker id="pld_arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="' + C.hw + '"/></marker></defs>';

    // ---- 단계 자막 ----
    var caps = [
      [0, 1.5, "프로그램 = 디스크 위의 실행 파일 p (code + static data) — 아직 프로세스가 아니다"],
      [1.5, 3, "① OS 가 메모리를 할당해 이 프로세스의 주소 공간을 만든다"],
      [3, 5, "② code 와 static data 를 실행 파일에서 주소 공간으로 로드 (실제로는 lazily)"],
      [5, 6.5, "③ run-time stack 할당 — main() 의 argc / argv 로 초기화 (아래로 자람)"],
      [6.5, 8, "④ heap 생성 — malloc() / free() 용 (위로 자람)"],
      [8, 9.3, "⑤ I/O 준비: stdin(0) · stdout(1) · stderr(2) 를 OS 가 열어 둔다"],
      [9.3, 11, "⑥ PC ← main() — 준비 완료(Ready) → Scheduled 되면 Running"],
      [11, 13, "프로그램이 프로세스가 됐다 = 주소 공간 + control flow(PC)"]
    ];
    caps.forEach(function (c) { s += seg(c[0], c[1], txt(380, 26, c[2], 14, "#222", ' font-weight="700"')); });

    // ================= Disk: 실행 파일 =================
    s += box(20, 50, 200, 260, "#f6f6f6", "#666");
    s += ltxt(34, 72, "Disk", 14, "#444", ' font-weight="700"');
    s += ltxt(34, 90, "실행 파일 p (ELF)", 11.5, C.muted);
    s += '<rect x="36" y="104" width="168" height="24" rx="4" fill="#e6e6e6" stroke="#999"/>' + txt(120, 121, "ELF header", 11.5, "#555");
    s += '<rect x="36" y="136" width="168" height="50" rx="4" fill="' + C.aL + '" stroke="' + C.a + '" stroke-width="1.5"/>' +
      txt(120, 158, "code", 12.5, C.a, ' font-weight="700"') + txt(120, 175, ".text", 11, C.a, MONO);
    s += '<rect x="36" y="194" width="168" height="44" rx="4" fill="' + C.cL + '" stroke="' + C.c + '" stroke-width="1.5"/>' +
      txt(120, 213, "static data", 12.5, C.cD, ' font-weight="700"') + txt(120, 229, ".data · .bss", 11, C.cD, MONO);
    s += txt(120, 266, "정적인 바이트 = Program", 11.5, "#555", ' font-weight="700"');
    s += txt(120, 284, "stack · heap 은 파일에 없다", 11, C.muted);

    // ================= OS: 단계 목록 =================
    s += box(240, 50, 200, 180, C.cpuL, C.cpu);
    s += ltxt(252, 72, "OS (kernel) 가 하는 일", 13, C.cpu, ' font-weight="700"');
    var steps = [
      [1.5, 3, "① 메모리 할당 · 주소 공간 생성"],
      [3, 5, "② code · data 로드 (lazily)"],
      [5, 6.5, "③ stack 할당 — argc / argv"],
      [6.5, 8, "④ heap 생성 (malloc / free)"],
      [8, 9.3, "⑤ fd 0 · 1 · 2 (stdin/out/err)"],
      [9.3, 11, "⑥ PC ← main() → 실행 시작"]
    ];
    steps.forEach(function (st, i) {
      var y = 96 + i * 22;
      s += seg(st[0], st[1], '<rect x="246" y="' + (y - 15) + '" width="188" height="21" rx="4" fill="' + C.cL + '" stroke="' + C.c + '" stroke-width="1.5"/>');
      s += seg(0, st[0], ltxt(252, y, st[2], 11, "#aaa"));
      s += seg(st[0], D, ltxt(252, y, st[2], 11, "#222", ' font-weight="700"'));
    });

    // ================= CPU =================
    s += box(240, 242, 200, 68, "#fff", C.cpu);
    s += ltxt(252, 264, "CPU", 13, C.cpu, ' font-weight="700"');
    s += seg(0, 9.3, box(334, 250, 96, 22, "#eeeeee", "#777") + txt(382, 266, "생성 중", 12, "#555", ' font-weight="700"'));
    s += seg(9.3, 10.2, box(334, 250, 96, 22, "#fdeec2", "#8a6000") + txt(382, 266, "ready", 12, "#8a6000", ' font-weight="700"'));
    s += seg(10.2, D, box(334, 250, 96, 22, "#cdefd2", "#1d6b2a") + txt(382, 266, "running", 12, "#1d6b2a", ' font-weight="700"'));
    s += ltxt(252, 296, "PC =", 12.5, C.muted, MONO);
    s += seg(0, 9.6, ltxt(292, 296, "—", 12.5, "#999", MONO));
    s += seg(9.6, D, ltxt(292, 296, "main()", 12.5, C.hw, MONO + ' font-weight="700"'));
    s += seg(9.6, D, '<path d="M392,292 L470,292" fill="none" stroke="' + C.hw + '" stroke-width="2.5" marker-end="url(#pld_arrow)"/>');

    // ================= Memory: 주소 공간 =================
    var MX = 460, MW = 160;
    s += ltxt(MX, 66, "Memory — 주소 공간", 13, C.cpu, ' font-weight="700"');
    // 아직 없음 (자리)
    s += seg(0, 1.5, '<rect x="' + MX + '" y="76" width="' + MW + '" height="230" rx="4" fill="none" stroke="#bbb" stroke-dasharray="5 4"/>' +
      txt(MX + 80, 195, "(아직 없음)", 12, "#aaa"));
    // 주소 공간 틀 (① 이후)
    s += seg(1.5, D, '<rect x="' + MX + '" y="76" width="' + MW + '" height="230" rx="4" fill="#fff" stroke="' + C.cpu + '" stroke-width="2"/>' +
      '<rect x="' + MX + '" y="76" width="' + MW + '" height="20" fill="#e6e6e6" stroke="' + C.cpu + '" stroke-width="1"/>' +
      txt(MX + 80, 90, "kernel (접근 불가)", 10.5, "#666") +
      txt(MX + 80, 172, "(빈 공간)", 11, "#bbb"));
    // code / data (② 로드 후)
    s += seg(4.2, D, '<rect x="' + MX + '" y="262" width="' + MW + '" height="44" fill="' + C.aL + '" stroke="' + C.a + '" stroke-width="1.5"/>' +
      txt(MX + 80, 280, "code (.text)", 12, C.a, ' font-weight="700"'));
    s += seg(9.6, D, txt(MX + 80, 298, "main() ← 시작", 11, C.hw, MONO + ' font-weight="700"'));
    s += seg(4.8, D, '<rect x="' + MX + '" y="226" width="' + MW + '" height="36" fill="' + C.cL + '" stroke="' + C.c + '" stroke-width="1.5"/>' +
      txt(MX + 80, 249, "data (.data · .bss)", 11.5, C.cD, ' font-weight="700"'));
    // stack: 위에서 아래로 자람
    s += '<rect x="' + MX + '" y="96" width="' + MW + '" height="0" fill="' + C.bL + '" stroke="' + C.b + '" stroke-width="1.5">' +
      '<animate attributeName="height" from="0" to="42" begin="5s" dur="0.8s" fill="freeze"/></rect>';
    s += seg(5.8, D, txt(MX + 80, 114, "stack", 12, C.b, ' font-weight="700"') + txt(MX + 80, 130, "argc=2, argv[]", 10.5, C.b, MONO));
    // heap: 아래에서 위로 자람
    s += '<rect x="' + MX + '" y="226" width="' + MW + '" height="0" fill="#f3e6f7" stroke="#8a4fa0" stroke-width="1.5">' +
      '<animate attributeName="y" from="226" to="196" begin="6.6s" dur="0.8s" fill="freeze"/>' +
      '<animate attributeName="height" from="0" to="30" begin="6.6s" dur="0.8s" fill="freeze"/></rect>';
    s += seg(7.4, D, txt(MX + 80, 216, "heap", 12, "#8a4fa0", ' font-weight="700"'));
    // 오른쪽 라벨
    s += seg(1.5, D, ltxt(630, 92, "높은 주소", 10.5, C.muted) + ltxt(630, 304, "낮은 주소", 10.5, C.muted));
    s += seg(5.8, D, ltxt(630, 122, "stack ↓ (sp)", 11.5, C.b, ' font-weight="700"'));
    s += seg(7.4, D, ltxt(630, 215, "heap ↑ (brk)", 11.5, "#8a4fa0", ' font-weight="700"'));
    s += seg(4.2, D, ltxt(630, 250, "← 파일에서", 10.5, C.muted) + ltxt(630, 264, "   로드됨", 10.5, C.muted));
    // fd 0·1·2 (⑤)
    [["0 stdin", 0], ["1 stdout", 1], ["2 stderr", 2]].forEach(function (f) {
      var x = MX + f[1] * 54;
      s += seg(8.2 + f[1] * 0.25, D, '<rect x="' + x + '" y="314" width="52" height="20" rx="4" fill="#fff" stroke="' + C.cpu + '"/>' +
        txt(x + 26, 328, f[0], 9.5, C.cpu, MONO));
    });

    // ================= 로드 이동 (디스크 → 메모리) =================
    s += seg(3, 5, '<path d="M204,161 L230,161 L230,40 L600,40 L600,74" fill="none" stroke="' + C.a + '" stroke-width="1.5" stroke-dasharray="4 4"/>');
    s += packet(3, 1.2, "M204,161 L230,161 L230,40 L600,40 L600,284", C.a);
    s += packet(3.6, 1.2, "M204,216 L230,216 L230,40 L600,40 L600,244", C.c);

    // ---- 아래 요점 ----
    s += txt(380, 358, "실행 파일에서 오는 것은 code · data 뿐 — stack 과 heap 은 런타임에 OS 가 만든다", 12, C.muted);
    s += '</svg>';
    return s;
  }
};
