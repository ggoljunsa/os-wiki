// ============================================================
// thread_ctx_switch — 프로세스 전환 vs 스레드 전환 나란히 (8강 p.24, p.27)
// 시간축(초): 0 두 장면 소개 → 2 ① 레지스터 저장(PCB(A) / TCB(T1))
//   → 4 ② 레지스터 복원(PCB(B) / TCB(T2)) → 6 ③ 프로세스만 주소 공간 교체 + TLB flush
//   → 8.5 스레드는 주소 공간 그대로 → 12 끝
// ============================================================
window.ANIMS = window.ANIMS || {};
ANIMS["thread_ctx_switch"] = {
  title: "스레드 컨텍스트 스위치 — 레지스터만 바꾸고 주소 공간은 그대로",
  desc: "왼쪽 [[컨텍스트 스위치|프로세스 전환]]과 오른쪽 [[스레드 컨텍스트 스위치|스레드 전환]]을 나란히: 둘 다 레지스터를 저장·복원([[PCB]] / [[TCB]])하지만, '''페이지 테이블 교체와 TLB flush 는 프로세스 전환에만''' 있다.",
  duration: 12,
  build: function () {
    var D = 12;
    var C = {
      a: "#1d65b3", aL: "#dbe8f7",
      b: "#2e9e4f", bL: "#dff3e4",
      cpu: "#3b2f4a", cpuL: "#efe9f6",
      hw: "#d6465f", ok: "#1d6b2a", okL: "#cdefd2", os: "#e09a40", osL: "#fdeec2", muted: "#777", line: "#b9c4d8"
    };
    function f(x) { return Math.round(x * 10000) / 10000; }
    function box(x, y, w, h, fill, stroke, extra) {
      return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="8" fill="' + fill + '" stroke="' + stroke + '" stroke-width="2"' + (extra || "") + '/>';
    }
    function txt(x, y, s, size, fill, extra) {
      return '<text x="' + x + '" y="' + y + '" font-size="' + (size || 13) + '" fill="' + (fill || "#222") + '"' + (/text-anchor/.test(extra || "") ? "" : ' text-anchor="middle"') + (extra || "") + '>' + s + '</text>';
    }
    function show(from, to) {
      var a = from / D, b = to / D;
      if (from <= 0 && to >= D) return '<set attributeName="opacity" to="1" dur="' + D + 's" fill="freeze"/>';
      if (from <= 0) return '<animate attributeName="opacity" values="1;1;0;0" keyTimes="0;' + f(b) + ';' + f(b + 0.003) + ';1" dur="' + D + 's" fill="freeze"/>';
      if (to >= D) return '<animate attributeName="opacity" values="0;0;1;1" keyTimes="0;' + f(a) + ';' + f(a + 0.003) + ';1" dur="' + D + 's" fill="freeze"/>';
      return '<animate attributeName="opacity" values="0;0;1;1;0;0" keyTimes="0;' + f(a) + ';' + f(a + 0.003) + ';' + f(b) + ';' + f(b + 0.003) + ';1" dur="' + D + 's" fill="freeze"/>';
    }
    function win(from, to, inner) { return '<g opacity="0">' + inner + show(from, to) + '</g>'; }
    function kf(attr, fr) {
      var ts = [], vs = [];
      if (fr[0][0] > 0) { ts.push(0); vs.push(fr[0][1]); }
      fr.forEach(function (p) { ts.push(f(p[0] / D)); vs.push(p[1]); });
      if (fr[fr.length - 1][0] < D) { ts.push(1); vs.push(fr[fr.length - 1][1]); }
      return '<animate attributeName="' + attr + '" values="' + vs.join(";") + '" keyTimes="' + ts.join(";") + '" dur="' + D + 's" fill="freeze"/>';
    }
    function mv(fr) {
      var ts = [], vs = [];
      if (fr[0][0] > 0) { ts.push(0); vs.push(fr[0][1] + " " + fr[0][2]); }
      fr.forEach(function (p) { ts.push(f(p[0] / D)); vs.push(p[1] + " " + p[2]); });
      if (fr[fr.length - 1][0] < D) { ts.push(1); vs.push(fr[fr.length - 1][1] + " " + fr[fr.length - 1][2]); }
      return '<animateTransform attributeName="transform" type="translate" values="' + vs.join(";") + '" keyTimes="' + ts.join(";") + '" dur="' + D + 's" fill="freeze"/>';
    }

    var s = '<svg viewBox="0 0 760 360" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="스레드 컨텍스트 스위치 애니메이션">';
    s += '<defs><marker id="tcs_arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#555"/></marker>' +
      '<marker id="tcs_arrow_r" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="' + C.hw + '"/></marker>' +
      '<marker id="tcs_arrow_g" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="' + C.ok + '"/></marker></defs>';

    // ---- 단계 자막 ----
    var caps = [
      [0, 2, "왼쪽: 프로세스 A → B 전환 / 오른쪽: 같은 프로세스 안 스레드 T1 → T2 전환"],
      [2, 4, "① 둘 다: 지금 레지스터(PC, sp, …)를 저장 — PCB(A) / TCB(T1)"],
      [4, 6, "② 둘 다: 다음 실행 흐름의 레지스터를 복원 — PCB(B) / TCB(T2)"],
      [6, 8.5, "③ 프로세스만: 주소 공간 교체 (페이지 테이블 레지스터 변경 → TLB flush)"],
      [8.5, 12, "스레드: The address space remains the same → TLB·캐시 그대로 = simple"]
    ];
    caps.forEach(function (c) { s += win(c[0], c[1], txt(380, 26, c[2], 14, "#222", ' font-weight="700"')); });

    // ---- 한 패널 ----
    function panel(ox, isThread) {
      var o = "";
      var nA = isThread ? "T1" : "A", nB = isThread ? "T2" : "B";
      var saveName = isThread ? "TCB(T1)" : "PCB(A)", restName = isThread ? "TCB(T2)" : "PCB(B)";
      o += box(ox, 42, 360, 280, "#fff", isThread ? C.ok : C.hw, ' stroke-opacity="0.5"');
      o += txt(ox + 180, 62, isThread ? "스레드 전환 T1 → T2 (같은 프로세스)" : "프로세스 전환 A → B", 14, isThread ? C.ok : C.hw, ' font-weight="700"');

      // 저장/복원 상자
      o += box(ox + 10, 76, 90, 70, C.aL, C.a);
      o += txt(ox + 55, 94, saveName, 12, C.a, ' font-weight="700"');
      o += win(3.2, 12, txt(ox + 55, 116, nA + ": PC, sp", 11, "#222", ' font-weight="700"') + txt(ox + 55, 132, "regs …", 11, "#222"));
      o += box(ox + 260, 76, 90, 70, C.bL, C.b);
      o += txt(ox + 305, 94, restName, 12, C.b, ' font-weight="700"');
      o += '<g>' + txt(ox + 305, 116, nB + ": PC, sp", 11, "#222", ' font-weight="700"') + txt(ox + 305, 132, "regs …", 11, "#222") +
        kf("opacity", [[0, 1], [4.2, 1], [4.3, 0.3]]) + '</g>';

      // CPU
      o += box(ox + 110, 76, 140, 104, C.cpuL, C.cpu);
      o += txt(ox + 180, 94, "CPU", 13, C.cpu, ' font-weight="700"');
      o += win(0, 2.3, txt(ox + 180, 118, nA + ": PC, sp, regs", 12, C.a, ' font-weight="700"'));
      o += win(5.2, 12, txt(ox + 180, 118, nB + ": PC, sp, regs", 12, C.b, ' font-weight="700"'));
      o += '<line x1="' + (ox + 120) + '" y1="132" x2="' + (ox + 240) + '" y2="132" stroke="' + C.cpu + '" stroke-opacity="0.3"/>';
      o += txt(ox + 180, 148, "PT reg (satp / CR3)", 10, C.muted);
      if (isThread) {
        o += txt(ox + 180, 168, "→ PT (하나)", 12, "#222", ' font-weight="700"');
      } else {
        o += win(0, 6.5, txt(ox + 180, 168, "→ PT(A)", 12, C.a, ' font-weight="700"'));
        o += win(6.5, 12, txt(ox + 180, 168, "→ PT(B)", 12, C.b, ' font-weight="700"'));
        o += '<rect x="' + (ox + 118) + '" y="153" width="124" height="22" rx="5" fill="none" stroke="' + C.hw + '" stroke-width="2.5" opacity="0">' +
          kf("opacity", [[6.3, 0], [6.35, 1], [6.7, 0.2], [7, 1], [7.3, 0.2], [7.6, 1], [8.5, 1], [8.55, 0]]) + '</rect>';
      }

      // 레지스터 이동 패킷
      o += '<g opacity="0"><rect x="0" y="0" width="54" height="18" rx="4" fill="' + C.a + '"/>' + txt(27, 13, nA + " regs", 10, "#fff", ' font-weight="700"') +
        mv([[2.2, ox + 150, 104], [3.2, ox + 28, 104]]) + kf("opacity", [[2.15, 0], [2.2, 1], [3.2, 1], [3.25, 0]]) + '</g>';
      o += '<g opacity="0"><rect x="0" y="0" width="54" height="18" rx="4" fill="' + C.b + '"/>' + txt(27, 13, nB + " regs", 10, "#fff", ' font-weight="700"') +
        mv([[4.2, ox + 278, 104], [5.2, ox + 150, 104]]) + kf("opacity", [[4.15, 0], [4.2, 1], [5.2, 1], [5.25, 0]]) + '</g>';
      o += win(2, 4, '<path d="M' + (ox + 110) + ',140 L' + (ox + 102) + ',140" stroke="#555" stroke-width="2" marker-end="url(#tcs_arrow)"/>' +
        txt(ox + 55, 160, "① 저장", 11, C.a, ' font-weight="700"'));
      o += win(4, 6, '<path d="M' + (ox + 258) + ',140 L' + (ox + 252) + ',140" stroke="#555" stroke-width="2" marker-end="url(#tcs_arrow)"/>' +
        txt(ox + 305, 160, "② 복원", 11, C.b, ' font-weight="700"'));

      // 주소 공간
      if (!isThread) {
        o += box(ox + 10, 200, 160, 80, "#fff", C.a);
        o += txt(ox + 90, 220, "주소 공간 A", 12, C.a, ' font-weight="700"');
        o += txt(ox + 90, 240, "code · heap · stack", 11, C.muted);
        o += txt(ox + 90, 262, "PT(A)", 11, C.a, ' font-family="monospace"');
        o += box(ox + 190, 200, 160, 80, "#fff", C.b);
        o += txt(ox + 270, 220, "주소 공간 B", 12, C.b, ' font-weight="700"');
        o += txt(ox + 270, 240, "code · heap · stack", 11, C.muted);
        o += txt(ox + 270, 262, "PT(B)", 11, C.b, ' font-family="monospace"');
        // 활성 표시 (굵은 테두리)
        o += '<rect x="' + (ox + 7) + '" y="197" width="166" height="86" rx="10" fill="none" stroke="' + C.a + '" stroke-width="3.5">' + kf("opacity", [[0, 1], [6.5, 1], [6.55, 0]]) + '</rect>';
        o += '<rect x="' + (ox + 187) + '" y="197" width="166" height="86" rx="10" fill="none" stroke="' + C.b + '" stroke-width="3.5" opacity="0">' + kf("opacity", [[6.5, 0], [6.55, 1]]) + '</rect>';
        // PT 포인터
        o += win(0, 6.5, '<path d="M' + (ox + 160) + ',180 L' + (ox + 110) + ',196" stroke="#555" stroke-width="2" marker-end="url(#tcs_arrow)"/>');
        o += win(6.5, 12, '<path d="M' + (ox + 200) + ',180 L' + (ox + 250) + ',196" stroke="' + C.hw + '" stroke-width="2.5" marker-end="url(#tcs_arrow_r)"/>');
        // 결과 배지
        o += win(6.5, 12, '<rect x="' + (ox + 60) + '" y="290" width="240" height="24" rx="12" fill="#ffd9d9" stroke="#a52f2f"/>' +
          txt(ox + 180, 307, "✘ 주소 공간 교체 → TLB flush", 12, "#a52f2f", ' font-weight="700"'));
      } else {
        o += box(ox + 10, 200, 340, 80, "#fff", C.cpu);
        o += txt(ox + 180, 218, "주소 공간 하나 (PT 하나)", 12, C.cpu, ' font-weight="700"');
        var parts = [["code", "#f6f3fa", C.cpu], ["heap", C.osL, C.os], ["Stack (1)", C.aL, C.a], ["Stack (2)", C.bL, C.b]];
        parts.forEach(function (p, i) {
          var x = ox + 20 + i * 81;
          o += '<rect x="' + x + '" y="230" width="75" height="40" rx="5" fill="' + p[1] + '" stroke="' + p[2] + '"/>';
          o += txt(x + 37, 255, p[0], 11, p[2], ' font-weight="700"');
        });
        // 현재 sp 가 가리키는 스택 강조
        o += '<rect x="' + (ox + 179) + '" y="227" width="81" height="46" rx="7" fill="none" stroke="' + C.a + '" stroke-width="3">' + kf("opacity", [[0, 1], [3.2, 1], [3.25, 0]]) + '</rect>';
        o += '<rect x="' + (ox + 260) + '" y="227" width="81" height="46" rx="7" fill="none" stroke="' + C.b + '" stroke-width="3" opacity="0">' + kf("opacity", [[5.2, 0], [5.25, 1]]) + '</rect>';
        // PT 포인터 (그대로)
        o += '<path d="M' + (ox + 180) + ',180 L' + (ox + 180) + ',198" stroke="' + C.ok + '" stroke-width="2.5" marker-end="url(#tcs_arrow_g)"/>';
        o += win(6, 12, '<rect x="' + (ox + 192) + '" y="182" width="72" height="16" rx="8" fill="' + C.okL + '" stroke="' + C.ok + '"/>' +
          txt(ox + 228, 194, "그대로 ✔", 10, C.ok, ' font-weight="700"'));
        o += win(6.5, 12, '<rect x="' + (ox + 60) + '" y="290" width="240" height="24" rx="12" fill="' + C.okL + '" stroke="' + C.ok + '"/>' +
          txt(ox + 180, 307, "✔ 교체 없음 → TLB·캐시 그대로", 12, C.ok, ' font-weight="700"'));
      }
      return o;
    }
    s += panel(10, false);
    s += panel(390, true);

    // ---- 아래 요점 ----
    s += txt(380, 342, "저장하는 레지스터 양은 비슷 — 차이는 주소 공간 교체와 그 뒤의 간접 비용(TLB miss, 캐시 오염)", 12, C.muted);
    s += '</svg>';
    return s;
  }
};
