// ============================================================
// kmem_percpu — 과제 2 ① kalloc: lock 하나 → CPU 마다 kmem[i] + 비었을 때만 steal
// 시간축(초): 0 Before: kmem.lock 하나에 CPU0·1·2 가 줄 → 0.3~4.8 한 번에 하나만 acquire,
//   나머지 spinning, #test-and-set 증가 → 4.8 After: kmem[0..2] → 5.5·6.7 세 CPU 동시 kalloc
//   → 7.8 CPU1 free list 빔 → 8.6~10.2 kmem[0].lock 만 잡고 page 3개 steal → 10.6 kalloc 성공 → 13 끝
// ============================================================
window.ANIMS = window.ANIMS || {};
ANIMS["kmem_percpu"] = {
  title: "kalloc per-CPU free list — lock 하나를 CPU 수만큼 쪼개기",
  desc: "Before: free list 하나를 '''kmem.lock''' 하나가 지켜서 CPU 들이 [[spin lock|spinning]] 하며 줄을 선다 → After: CPU 마다 kmem[i] (lock·free list 각자) → 세 CPU 가 동시에 kalloc(), 자기 list 가 비었을 때만 다른 CPU 에서 '''steal'''",
  duration: 13,
  build: function () {
    var D = 13;
    var C = {
      c0: "#1d65b3", c0L: "#dbe8f7", c1: "#2e9e4f", c1L: "#dff3e4", c2: "#e09a40", c2L: "#fdeec2",
      k: "#3b2f4a", kL: "#efe9f6", hw: "#d6465f", spinF: "#ffd9d9", spinT: "#a52f2f",
      ok: "#1d6b2a", okL: "#cdefd2", muted: "#777", line: "#b9c4d8", page: "#8a7aa6"
    };
    var CPU = [[C.c0, C.c0L], [C.c1, C.c1L], [C.c2, C.c2L]];
    function f(x) { return Math.round(x * 10000) / 10000; }
    function box(x, y, w, h, fill, stroke, extra) {
      return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="7" fill="' + fill + '" stroke="' + stroke + '" stroke-width="2"' + (extra || "") + '/>';
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
    function win(from, to, inner) { return '<g opacity="' + (from <= 0 ? 1 : 0) + '">' + inner + show(from, to) + '</g>'; }
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
    // 계단식 색 변화: [[t, color], ...] → 각 지점에서 0.05초 만에 바뀜
    function steps(attr, base, ch) {
      var fr = [[0, base]], cur = base;
      ch.forEach(function (c) { fr.push([c[0], cur]); fr.push([c[0] + 0.05, c[1]]); cur = c[1]; });
      return kf(attr, fr);
    }
    // ---- page 이동 모델: 위치 기록 → animateTransform ----
    function Page(x, y) { this.fr = [[0, x, y]]; this.op = [[0, 1]]; this.x = x; this.y = y; }
    Page.prototype.to = function (t, dt, x, y, mid) {
      var last = this.fr[this.fr.length - 1][0];
      if (t > last + 1e-6) this.fr.push([t, this.x, this.y]);
      if (mid) this.fr.push([t + dt / 2, mid[0], mid[1]]);
      this.fr.push([t + dt, x, y]); this.x = x; this.y = y;
    };
    Page.prototype.fade = function (t) { this.op.push([t - 0.15, 1]); this.op.push([t, 0]); };
    Page.prototype.svg = function (fill) {
      return '<g><rect x="0" y="0" width="20" height="20" rx="3" fill="' + fill + '" stroke="#fff" stroke-width="1"/>' + mv(this.fr) + kf("opacity", this.op) + '</g>';
    };
    function tok(label, k, inner, frames) {
      return '<g>' + inner + '<rect x="0" y="0" width="66" height="28" rx="14" fill="' + CPU[k][1] + '" stroke="' + CPU[k][0] + '" stroke-width="2"/>' +
        txt(33, 19, label, 13, CPU[k][0], ' font-weight="700"') + (frames ? mv(frames) : "") + '</g>';
    }
    function badge(w, fillc, strokec, label) {
      return '<rect x="' + ((66 - w) / 2) + '" y="-21" width="' + w + '" height="17" rx="8" fill="' + fillc + '" stroke="' + strokec + '"/>' +
        txt(33, -8, label, 11, strokec, ' font-weight="700"');
    }

    var s = '<svg viewBox="0 0 760 380" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="kalloc per-CPU free list 애니메이션">';
    s += '<defs><marker id="kp_arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="' + C.c1 + '"/></marker></defs>';

    // ---- 단계 자막 ----
    var caps = [
      [0, 0.6, "Before: free list 하나를 kmem.lock 하나가 지킨다 — CPU 3개가 동시에 kalloc()"],
      [0.6, 2.1, "CPU0 이 acquire → CPU1·CPU2 는 test-and-set 을 돌며 spinning"],
      [2.1, 4.8, "한 번에 한 CPU 만 — 기다리는 동안 #test-and-set 이 계속 쌓인다 (lock contention)"],
      [4.8, 5.5, "After: kmem 을 CPU 마다 하나씩 — kmem[0..2], lock 3개, free list 3개"],
      [5.5, 7.6, "세 CPU 가 각자 자기 lock 만 잡고 동시에 kalloc() — #test-and-set 0"],
      [7.6, 8.6, "CPU1 의 free list 가 비었다 → 자기 list 만으로는 kalloc() 불가"],
      [8.6, 10.4, "steal: CPU1 이 kmem[0].lock 만 잠깐 잡고 page 몇 개를 가져온다 (CPU2 는 계속 혼자 일함)"],
      [10.4, 13, "가져온 page 로 kalloc() 성공 — steal 은 비었을 때만, 평소엔 lock 이 안 겹친다"]
    ];
    caps.forEach(function (c) { s += win(c[0], c[1], txt(380, 24, c[2], 14, "#222", ' font-weight="700"')); });

    // ================= Before (위) =================
    var B = '<g>';
    B += '<rect x="10" y="38" width="740" height="134" rx="10" fill="#fafafa" stroke="#ddd"/>';
    B += txt(22, 56, "Before — kmem 하나 (lock 1개 · free list 1개)", 12, C.k, ' font-weight="700" text-anchor="start"');
    // lock
    B += '<rect x="300" y="92" width="120" height="36" rx="7" stroke="' + C.k + '" stroke-width="2.5" fill="' + C.kL + '">' +
      steps("fill", C.kL, [[0.3, C.c0L], [1.8, C.kL], [2.1, C.c1L], [3.3, C.kL], [3.6, C.c2L], [4.8, C.kL]]) + '</rect>';
    B += txt(360, 115, "🔒 kmem.lock", 13, C.k, ' font-weight="700"');
    B += win(0.3, 1.8, txt(360, 146, "holder: CPU0", 11, C.c0, ' font-weight="700"'));
    B += win(2.1, 3.3, txt(360, 146, "holder: CPU1", 11, C.c1, ' font-weight="700"'));
    B += win(3.6, 4.8, txt(360, 146, "holder: CPU2", 11, C.c2, ' font-weight="700"'));
    B += txt(440, 88, "freelist →", 11, C.muted, ' text-anchor="start"');
    // CPU 줄 (holder 슬롯 220, 대기 140, 60)
    var SX = [220, 140, 60], TY = 96;
    var order = [[0, 1, 2], [1, 2, 0], [2, 0, 1]];
    var rotT = [1.8, 3.3];
    var holdIv = [[0.3, 1.8], [2.1, 3.3], [3.6, 4.8]];
    for (var k = 0; k < 3; k++) {
      var fr = [[0, SX[order[0].indexOf(k)], TY]];
      for (var r = 0; r < 2; r++) {
        var a = SX[order[r].indexOf(k)], b = SX[order[r + 1].indexOf(k)];
        fr.push([rotT[r], a, TY]);
        if (order[r].indexOf(k) === 0) fr.push([rotT[r] + 0.15, 140, TY + 34]);
        fr.push([rotT[r] + 0.3, b, TY]);
      }
      // spinning: holder 가 아닐 때 (4.8 까지)
      var h = holdIv[k];
      var spin = [[0, h[0] > 0.3 ? 1 : 0]];
      if (h[0] > 0.3) { spin.push([h[0] - 0.35, 1]); spin.push([h[0] - 0.3, 0]); }
      spin.push([h[1], 0]);
      if (h[1] + 0.35 < 4.8) { spin.push([h[1] + 0.3, 0]); spin.push([h[1] + 0.35, 1]); spin.push([4.8, 1]); spin.push([4.85, 0]); }
      var inner = '<g>' + badge(62, C.spinF, C.spinT, "spinning") + kf("opacity", spin) + '</g>';
      inner += win(h[0], h[1], badge(62, C.okL, C.ok, "kalloc()"));
      B += tok("CPU" + k, k, inner, fr);
    }
    // free list pages (8개, head 가 왼쪽)
    B += (function () {
      var out = "", ps = [];
      for (var i = 0; i < 8; i++) ps.push(new Page(440 + i * 26, 100));
      var list = ps.slice();
      [0.6, 2.4, 3.9].forEach(function (t) {
        var p = list.shift();
        p.to(t, 0.45, 243, 104, [340, 70]); p.fade(t + 0.45);
        list.forEach(function (q, j) { q.to(t + 0.1, 0.35, 440 + j * 26, 100); });
      });
      ps.forEach(function (p) { out += p.svg(C.page); });
      return out;
    })();
    // #test-and-set 카운터
    B += txt(560, 146, "#test-and-set (kmem):", 12, C.spinT, ' text-anchor="end"');
    var v = 0, cnt = [];
    for (var t = 0.3, n = 0; t < 4.8 - 1e-6; t += 0.3, n++) { cnt.push([t, v]); v += 640 + (n * 173) % 420; }
    cnt.push([4.8, v]);
    cnt.forEach(function (c, j) {
      var end = j + 1 < cnt.length ? cnt[j + 1][0] : D;
      B += win(j === 0 ? 0 : c[0], end, txt(566, 146, String(c[1]).replace(/\B(?=(\d{3})+(?!\d))/g, ","), 14, C.spinT, ' font-weight="700" text-anchor="start"'));
    });
    B += txt(140, 160, "기다리는 CPU 는 일을 못 하고 lock 만 두드린다", 11, C.muted);
    B += kf("opacity", [[0, 1], [4.8, 1], [5.1, 0.35]]) + '</g>';
    s += B;

    // ================= After (아래) =================
    var A = '<g>';
    A += '<rect x="10" y="180" width="740" height="172" rx="10" fill="#fafafa" stroke="#ddd"/>';
    A += txt(22, 197, "After — CPU 마다 kmem[i] (lock 3개)", 12, C.k, ' font-weight="700" text-anchor="start"');
    A += '<g transform="translate(0,10)">';
    var COLX = [20, 270, 520], PY = 262;
    function px(c, j) { return COLX[c] + 12 + j * 26; }
    // 각 열: CPU 토큰 · lock · list
    var lockCh = [
      [[5.5, C.c0L], [6.1, C.kL], [6.7, C.c0L], [7.3, C.kL], [8.6, C.c1L], [10.2, C.kL]],
      [[5.5, C.c1L], [6.1, C.kL], [6.7, C.c1L], [7.3, C.kL], [7.8, C.c1L], [8.4, C.kL], [10.6, C.c1L], [11.2, C.kL]],
      [[5.5, C.c2L], [6.1, C.kL], [6.7, C.c2L], [7.3, C.kL], [9.0, C.c2L], [9.6, C.kL]]
    ];
    for (var c = 0; c < 3; c++) {
      var x0 = COLX[c];
      A += '<rect x="' + (x0 + 88) + '" y="208" width="128" height="30" rx="7" stroke="' + C.k + '" stroke-width="2" fill="' + C.kL + '">' + steps("fill", C.kL, lockCh[c]) + '</rect>';
      A += txt(x0 + 152, 228, "🔒 kmem[" + c + "].lock", 12, C.k, ' font-weight="700"');
      A += '<rect x="' + (x0 + 4) + '" y="256" width="214" height="32" rx="6" fill="#fff" stroke="' + C.line + '"/>';
      A += txt(x0 + 111, 303, "kmem[" + c + "].freelist", 11, C.muted);
    }
    // CPU 토큰 + 상태 배지
    A += tok("CPU0", 0, win(5.5, 6.1, badge(62, C.okL, C.ok, "kalloc()")) + win(6.7, 7.3, badge(62, C.okL, C.ok, "kalloc()")), [[0, COLX[0] + 12, 210]]);
    A += tok("CPU1", 1,
      win(5.5, 6.1, badge(62, C.okL, C.ok, "kalloc()")) + win(6.7, 7.3, badge(62, C.okL, C.ok, "kalloc()")) +
      win(7.8, 8.6, badge(62, C.spinF, C.spinT, "비었음!")) + win(8.6, 10.2, badge(62, C.c1L, C.c1, "steal")) +
      win(10.6, 11.2, badge(62, C.okL, C.ok, "kalloc()")), [[0, COLX[1] + 12, 210]]);
    A += tok("CPU2", 2, win(5.5, 6.1, badge(62, C.okL, C.ok, "kalloc()")) + win(6.7, 7.3, badge(62, C.okL, C.ok, "kalloc()")) +
      win(9.0, 9.6, badge(62, C.okL, C.ok, "kalloc()")), [[0, COLX[2] + 12, 210]]);
    // pages
    var init = [7, 2, 5], lists = [[], [], []], allP = [];
    for (c = 0; c < 3; c++) for (i = 0; i < init[c]; i++) { var p = new Page(px(c, i), PY + 6); p.c = c; lists[c].push(p); allP.push(p); }
    function pop(c, t) {
      var p = lists[c].shift();
      p.to(t, 0.45, COLX[c] + 35, 214); p.fade(t + 0.45);
      lists[c].forEach(function (q, j) { q.to(t + 0.15, 0.3, px(c, j), PY + 6); });
    }
    pop(0, 5.5); pop(1, 5.5); pop(2, 5.5);
    pop(0, 6.7); pop(1, 6.7); pop(2, 6.7);
    [8.8, 9.2, 9.6].forEach(function (t) {
      var p = lists[0].shift();
      lists[1].push(p);
      p.to(t, 0.4, px(1, lists[1].length - 1), PY + 6, [(p.x + px(1, lists[1].length - 1)) / 2, PY + 40]);
      lists[0].forEach(function (q, j) { q.to(t + 0.4, 0.15, px(0, j), PY + 6); });
    });
    pop(2, 9.0);
    pop(1, 10.6);
    allP.forEach(function (p) { A += p.svg(C.page); });
    // CPU1 비었음 표시
    A += win(7.8, 8.8, txt(COLX[1] + 111, PY + 21, "(비어 있음)", 12, C.hw, ' font-weight="700"'));
    // steal 화살표: kmem[0] list → kmem[1] list (아래로 휘어서)
    A += win(8.6, 10.2, '<path d="M' + (COLX[0] + 120) + ',290 C' + (COLX[0] + 160) + ',324 ' + (COLX[1] + 20) + ',324 ' + (COLX[1] + 70) + ',292" fill="none" stroke="' + C.c1 + '" stroke-width="2.5" stroke-dasharray="6 4" marker-end="url(#kp_arrow)"/>');
    A += win(8.6, 10.2, txt(COLX[0] + 152, 251, "CPU1 이 잠깐 잡음", 11, C.c1, ' font-weight="700"'));
    // 카운터
    A += win(5.5, D, txt(540, 332, "#test-and-set (kmem*): 0 — 서로 다른 lock 이라 기다릴 일이 없다", 12, C.ok, ' font-weight="700"'));
    A += win(8.6, 10.2, txt(200, 332, "steal 중에도 CPU2 는 영향 없음", 11, C.muted));
    A += '</g>';
    A += kf("opacity", [[0, 0.15], [4.8, 0.15], [5.1, 1]]) + '</g>';
    s += A;

    // ---- 아래 요점 ----
    s += txt(380, 372, "요점: lock 하나를 CPU 수만큼 쪼개면 contention 이 사라지고, 비었을 때만 steal 한다", 13, C.k, ' font-weight="700"');
    s += '</svg>';
    return s;
  }
};
