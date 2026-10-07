// ============================================================
// deadlock_cycle — Holds / Wanted by 화살표가 고리를 이루는 데드락과 lock ordering 해결 (12강 p.10–16)
// 시간축(초): 0~7 ① p.10 코드: T0 lock(L1) → T1 lock(L2) → T0 lock(L2) 대기 → T1 lock(L1) 대기
//   → 네 화살표가 붉은 고리 (circular wait → deadlock)
//   7~13 ② p.15 코드(둘 다 L1 → L2): T0 lock(L1) → T1 lock(L1) 대기(보유 0개) → T0 lock(L2) → 실행
//   → unlock(L2), unlock(L1) → T1 이 L1, L2 획득 (p.16 오른쪽 그림)
// 배치는 슬라이드 p.11 그대로: T0 왼쪽 위, L1 오른쪽 위, T1 오른쪽 아래, L2 왼쪽 아래
// ============================================================
window.ANIMS = window.ANIMS || {};
ANIMS["deadlock_cycle"] = {
  title: "Deadlock — holds/wanted-by 화살표가 고리를 이루는 순간, 그리고 lock ordering 으로 고리를 끊는 순간",
  desc: "p.10 처럼 T0 는 L1 → L2, T1 은 L2 → L1 순서로 잡으면 각자 락 하나를 쥔 채 상대 락을 기다리는 circular wait → [[데드락]]. p.15 처럼 둘 다 L1 → L2 로 맞추면([[lock ordering]]) 늦게 온 쪽은 '''아무 락도 쥐지 않은 채''' 기다리므로 고리가 생기지 않는다 — [[데드락 4조건]] 중 circular wait 를 깨는 것",
  duration: 13,
  build: function () {
    var C = {
      a: "#1d65b3", aL: "#dbe8f7",
      b: "#2e9e4f", bL: "#dff3e4",
      cpu: "#3b2f4a", cpuL: "#efe9f6",
      hw: "#d6465f", muted: "#777",
      runF: "#cdefd2", runS: "#1d6b2a",
      rdyF: "#fdeec2", rdyS: "#8a6000",
      blkF: "#dcdcf2", blkS: "#3c3c88"
    };
    var D = 13;
    function box(x, y, w, h, fill, stroke, extra) {
      return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="6" fill="' + fill + '" stroke="' + stroke + '" stroke-width="1.5"' + (extra || "") + '/>';
    }
    function txt(x, y, s, size, fill, extra) {
      var anchor = /text-anchor/.test(extra || "") ? "" : ' text-anchor="middle"';
      return '<text x="' + x + '" y="' + y + '" font-size="' + (size || 13) + '" fill="' + (fill || "#222") + '"' + anchor + (extra || "") + '>' + s + '</text>';
    }
    function r3(v) { return Math.round(v * 1000) / 1000; }
    function show(from, to) {
      return '<animate attributeName="opacity" values="0;0;1;1;0;0" keyTimes="0;' + r3(from / D) + ';' + r3(from / D + 0.003) + ';' + r3(to / D) + ';' + r3(Math.min(1, to / D + 0.003)) + ';1" dur="' + D + 's" fill="freeze"/>';
    }
    function during(from, to, inner) {
      if (from <= 0) {
        return '<g>' + inner + '<animate attributeName="opacity" values="1;1;0;0" keyTimes="0;' + r3(to / D) + ';' + r3(Math.min(1, to / D + 0.003)) + ';1" dur="' + D + 's" fill="freeze"/></g>';
      }
      return '<g opacity="0">' + inner + show(from, to) + '</g>';
    }
    function badge(x, y, label, kind) {
      var F = { r: C.runF, b: C.blkF, y: C.rdyF, d: "#f2f2f2" }[kind], S = { r: C.runS, b: C.blkS, y: C.rdyS, d: C.muted }[kind];
      var w = 0;
      for (var j = 0; j < label.length; j++) w += label.charCodeAt(j) > 255 ? 11 : 6.6;
      w = Math.round(w + 14);
      return box(r3(x - w), y, w, 19, F, S) + txt(r3(x - w / 2), y + 14, label, 11, S, ' font-weight="700"');
    }

    var s = '<svg viewBox="0 0 760 380" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Deadlock circular wait 애니메이션">';
    var mk = { A: C.a, B: C.b, K: C.blkS, R: C.hw };
    s += '<defs>';
    Object.keys(mk).forEach(function (k) {
      s += '<marker id="dl_arrow' + k + '" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="' + mk[k] + '"/></marker>';
    });
    s += '</defs>';

    // ---- 단계 자막 ----
    [
      [0, 1.0, "T0 와 T1 이 락 L1, L2 를 공유 (p.10) — 두 스레드가 락을 잡는 순서가 반대"],
      [1.0, 2.2, "T0: lock(L1) 성공 → T0 Holds L1"],
      [2.2, 3.4, "T1: lock(L2) 성공 → T1 Holds L2"],
      [3.4, 4.4, "T0: lock(L2) → L2 는 T1 소유 → L1 을 쥔 채 blocked (hold and wait)"],
      [4.4, 5.4, "T1: lock(L1) → L1 은 T0 소유 → L2 를 쥔 채 blocked"],
      [5.4, 7.0, "Holds → Wanted by → Holds → Wanted by 가 고리 → circular wait → deadlock"],
      [7.0, 8.0, "해결 (p.15): 둘 다 L1 → L2 순서로 잡는다 (lock ordering)"],
      [8.0, 9.0, "T0: lock(L1) 성공 → T0 Holds L1"],
      [9.0, 10.0, "T1: lock(L1) → 대기. 하지만 T1 은 아무 락도 쥐지 않은 채 기다린다"],
      [10.0, 11.0, "T0: lock(L2) 성공 — L2 를 원하는 스레드가 없다 → 임계 구역 실행"],
      [11.0, 12.0, "T0: unlock(L2) → unlock(L1) → L1 을 기다리던 T1 이 깨어남"],
      [12.0, D, "Circular wait does not exist after the code change (p.16)"]
    ].forEach(function (c) { s += during(c[0], c[1], txt(380, 24, c[2], 13, "#222", ' font-weight="700"')); });

    s += during(0, 7.0, txt(16, 52, "① p.10 — T0: L1→L2, T1: L2→L1", 12, C.hw, ' font-weight="700" text-anchor="start"'));
    s += during(7.0, D, txt(16, 52, "② p.15 — 둘 다 L1→L2", 12, C.runS, ' font-weight="700" text-anchor="start"'));

    // ---- 왼쪽: 슬라이드 p.11 의 네 노드 ----
    var LX = 120, RX = 300, TY = 118, BY = 268;
    // 화살표: 이름 → [x1,y1,x2,y2, 라벨, 라벨x, 라벨y, 라벨 anchor]
    var AR = {
      t0l1: [LX + 54, TY, RX - 52, TY, "Holds", (LX + RX) / 2, TY - 9, "middle"],
      l1t1: [RX, TY + 25, RX, BY - 32, "Wanted by", RX + 9, (TY + BY) / 2 + 4, "start"],
      t1l2: [RX - 54, BY, LX + 52, BY, "Holds", (LX + RX) / 2, BY + 20, "middle"],
      l2t0: [LX, BY - 25, LX, TY + 32, "Wanted by", LX - 9, (TY + BY) / 2 + 4, "end"],
      t0l2: [LX, TY + 32, LX, BY - 25, "Holds", LX - 9, (TY + BY) / 2 + 4, "end"],
      t1l1: [RX, BY - 32, RX, TY + 25, "Holds", RX + 9, (TY + BY) / 2 + 4, "start"]
    };
    function arrow(name, color, mkr, dashed, label) {
      var a = AR[name];
      var p = '<line x1="' + a[0] + '" y1="' + a[1] + '" x2="' + a[2] + '" y2="' + a[3] + '" stroke="' + color + '" stroke-width="2.5"' +
        (dashed ? ' stroke-dasharray="6 4"' : '') + ' marker-end="url(#dl_arrow' + mkr + ')">' +
        (dashed ? '<animate attributeName="stroke-dashoffset" values="20;0" dur="0.8s" repeatCount="indefinite"/>' : '') + '</line>';
      return p + txt(a[5], a[6], label || a[4], 12, color, ' font-weight="700" text-anchor="' + a[7] + '"');
    }
    // 노드
    function thread(cx, cy, name, col, colL) {
      return '<ellipse cx="' + cx + '" cy="' + cy + '" rx="52" ry="30" fill="' + colL + '" stroke="' + col + '" stroke-width="2"/>' +
        txt(cx, cy - 2, "Thread " + name.slice(1), 13, col, ' font-weight="700"') + txt(cx, cy + 14, "(" + name + ")", 11, col);
    }
    function lock(cx, cy, name) {
      return box(cx - 50, cy - 25, 100, 50, "#fff", C.cpu) + txt(cx, cy - 4, "Lock " + name, 13, C.cpu, ' font-weight="700"');
    }
    s += thread(LX, TY, "T0", C.a, C.aL) + lock(RX, TY, "L1") + thread(RX, BY, "T1", C.b, C.bL) + lock(LX, BY, "L2");
    // 락 소유자 표시
    function owner(cx, cy, segs) {
      var o = "";
      segs.forEach(function (g) {
        var who = g[2], col = who === "T0" ? C.a : who === "T1" ? C.b : C.muted;
        o += during(g[0], g[1], txt(cx, cy + 15, who ? "owner: " + who : "free", 11, col, who ? ' font-weight="700"' : ""));
      });
      return o;
    }
    s += owner(RX, TY, [[0, 1.3, ""], [1.3, 7.0, "T0"], [7.0, 8.2, ""], [8.2, 11.6, "T0"], [11.6, 12.1, ""], [12.1, D, "T1"]]);
    s += owner(LX, BY, [[0, 2.5, ""], [2.5, 7.0, "T1"], [7.0, 10.2, ""], [10.2, 11.3, "T0"], [11.3, 12.5, ""], [12.5, D, "T1"]]);

    // ① 화살표
    s += during(1.3, 7.0, arrow("t0l1", C.a, "A"));
    s += during(2.5, 7.0, arrow("t1l2", C.b, "B"));
    s += during(3.7, 7.0, arrow("l2t0", C.blkS, "K", true));
    s += during(4.7, 7.0, arrow("l1t1", C.blkS, "K", true));
    // 고리 (붉게 덮어쓰기)
    var ring = arrow("t0l1", C.hw, "R") + arrow("l1t1", C.hw, "R", true) + arrow("t1l2", C.hw, "R") + arrow("l2t0", C.hw, "R", true);
    var CX = (LX + RX) / 2, CY = (TY + BY) / 2;
    ring += '<path d="M' + (CX + 30) + ',' + (CY - 40) + ' A50,50 0 1,1 ' + (CX - 30) + ',' + (CY + 40) + '" fill="none" stroke="' + C.hw + '" stroke-width="2" stroke-dasharray="3 3" marker-end="url(#dl_arrowR)"/>';
    ring += txt(CX, CY - 4, "circular wait", 13, C.hw, ' font-weight="700"') + txt(CX, CY + 14, "→ deadlock", 13, C.hw, ' font-weight="700"');
    s += during(5.4, 7.0, ring);
    s += during(5.4, 7.0, txt(LX - 50, 330, "둘 다 상대가 쥔 락을 기다림 → 영원히 진행 불가", 12, C.hw, ' font-weight="700" text-anchor="start"'));

    // ② 화살표
    s += during(8.2, 11.6, arrow("t0l1", C.a, "A"));
    s += during(9.2, 12.0, arrow("l1t1", C.blkS, "K", true));
    s += during(10.2, 11.3, arrow("t0l2", C.a, "A"));
    s += during(12.1, D, arrow("t1l1", C.b, "B"));
    s += during(12.5, D, arrow("t1l2", C.b, "B"));
    s += during(9.2, 12.0, txt(LX - 50, 330, "T1 은 L1 에서 막혀 L2 를 쥘 수 없음 → 고리 불가", 12, C.blkS, ' font-weight="700" text-anchor="start"'));
    s += during(12.0, D, txt(LX - 50, 330, "T1 이 L1 → L2 순서로 획득 → 실행", 12, C.runS, ' font-weight="700" text-anchor="start"'));
    s += during(9.2, D, txt(CX, CY + 4, "고리 없음", 13, C.runS, ' font-weight="700"'));

    // ---- 오른쪽: 코드 패널 ----
    var PX = 396, PW = 350;
    function panel(py, name, col, colL, codes, hl, badges) {
      var o = box(PX, py, PW, 104, "#fafafa", "#ccc");
      o += txt(PX + 10, py + 17, name, 13, col, ' font-weight="700" text-anchor="start"');
      // 줄 하이라이트: [from, to, line, kind]
      hl.forEach(function (h) {
        var f = { y: C.rdyF, b: C.blkF, r: C.runF }[h[3]];
        o += during(h[0], h[1], '<rect x="' + (PX + 6) + '" y="' + (py + 25 + 15 * h[2]) + '" width="' + (PW - 12) + '" height="15" rx="3" fill="' + f + '"/>');
      });
      codes.forEach(function (cd) {
        var lines = "";
        cd[2].forEach(function (ln, i) {
          lines += txt(PX + 12, py + 36 + 15 * i, ln, 12, "#222", ' font-family="monospace" text-anchor="start" xml:space="preserve"');
        });
        o += during(cd[0], cd[1], lines);
      });
      badges.forEach(function (b) { o += during(b[0], b[1], badge(PX + PW - 8, py + 5, b[2], b[3])); });
      return o;
    }
    var ord1 = ["1 pthread_mutex_lock(L1);", "2 pthread_mutex_lock(L2);", "4 ...", "6 pthread_mutex_unlock(L2);", "7 pthread_mutex_unlock(L1);"];
    var ord2 = ["1 pthread_mutex_lock(L2);", "2 pthread_mutex_lock(L1);", "4 ...", "6 pthread_mutex_unlock(L1);", "7 pthread_mutex_unlock(L2);"];
    s += panel(44, "T0", C.a, C.aL, [[0, D, ord1]],
      [[1.0, 3.4, 0, "y"], [3.4, 7.0, 1, "b"], [8.0, 10.0, 0, "y"], [10.0, 10.7, 1, "y"], [10.7, 11.0, 2, "r"], [11.0, 11.4, 3, "y"], [11.4, 12.0, 4, "y"]],
      [[0, 3.7, "running", "r"], [3.7, 7.0, "blocked · L2 대기", "b"], [7.0, 12.0, "running", "r"], [12.0, D, "done", "d"]]);
    s += panel(156, "T1", C.b, C.bL, [[0, 7.0, ord2], [7.0, D, ord1]],
      [[2.2, 4.4, 0, "y"], [4.4, 7.0, 1, "b"], [9.0, 12.0, 0, "b"], [12.0, 12.4, 0, "y"], [12.4, 12.8, 1, "y"], [12.8, D, 2, "r"]],
      [[0, 4.7, "running", "r"], [4.7, 7.0, "blocked · L1 대기", "b"], [7.0, 9.2, "running", "r"], [9.2, 12.0, "blocked · L1 대기 (보유 0개)", "b"], [12.0, D, "running", "r"]]);
    s += during(7.0, D, txt(PX + 34, 173, "← L1→L2 로 변경", 11, C.hw, ' font-weight="700" text-anchor="start"'));

    // ---- 데드락 4조건 (p.12) ----
    var QY = 268;
    s += box(PX, QY, PW, 72, "#fff", "#ccc");
    s += txt(PX + 10, QY + 17, "데드락 4조건 (p.12) — 넷 다 성립해야 deadlock", 12, C.cpu, ' font-weight="700" text-anchor="start"');
    var CONDS = [
      ["1 mutual exclusion", 0, 0, [[1.3, 7.0, "✓", C.hw], [8.2, D, "✓", C.muted]]],
      ["2 hold and wait", 1, 0, [[3.7, 7.0, "✓", C.hw], [9.2, D, "–", C.muted]]],
      ["3 no preemption", 0, 1, [[3.7, 7.0, "✓", C.hw], [8.2, D, "✓", C.muted]]],
      ["4 circular wait", 1, 1, [[5.4, 7.0, "✓", C.hw], [9.2, D, "✗ 깨짐", C.runS]]]
    ];
    CONDS.forEach(function (c) {
      var x = PX + 14 + c[1] * 172, y = QY + 40 + c[2] * 20;
      s += txt(x + 22, y, c[0], 12, "#333", ' text-anchor="start"');
      s += during(0, 1.3, txt(x + 8, y, "○", 12, "#bbb"));
      s += during(7.0, 8.2, txt(x + 8, y, "○", 12, "#bbb"));
      c[3].forEach(function (m) {
        var parts = m[2].split(" ");
        var inner = txt(x + 8, y, parts[0], 13, m[3], ' font-weight="700"');
        if (parts[1]) inner += txt(x + 114, y, parts[1], 12, m[3], ' font-weight="700" text-anchor="start"');
        s += during(m[0], m[1], inner);
      });
      // 아직 성립 전인 구간은 빈 원
      if (c[1] + c[2] > 0 && c[3][0][0] > 1.3) s += during(1.3, c[3][0][0], txt(x + 8, y, "○", 12, "#bbb"));
      if (c[3][1][0] > 8.2) s += during(8.2, c[3][1][0], txt(x + 8, y, "○", 12, "#bbb"));
    });

    // ---- 요점 ----
    s += txt(380, 366, "4조건 중 하나만 깨면 deadlock 은 불가능 — 가장 쉬운 것이 lock ordering", 13, C.cpu, ' font-weight="700"');
    s += '</svg>';
    return s;
  }
};
