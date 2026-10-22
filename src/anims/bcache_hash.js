// ============================================================
// bcache_hash — 과제 2 ② buffer cache: bcache.lock 하나 → blockno % 13 해시 버킷마다 lock
// 시간축(초): 0 Before: bcache.lock 하나 + LRU 이중 연결 리스트, P1·P2·P3 줄서기 → 4.4 After: 13 bucket
//   → 5.8 bget(27)=bucket 1 hit(refcnt 1→2) ‖ bget(18)=bucket 5 → 8 bget(40) miss → 9 bcache.lock,
//   refcnt==0 인 bucket 7 의 blk 59 → 9.9 lock 1→7 순서 → 10.4 buf 를 bucket 1 로, blockno=40 → 14 끝
// ============================================================
window.ANIMS = window.ANIMS || {};
ANIMS["bcache_hash"] = {
  title: "bcache 해시 버킷 — 블록 번호로 lock 을 나눈다",
  desc: "Before: '''bcache.lock''' 하나가 LRU 리스트 전체를 지켜서 bget() 이 모두 줄을 선다 → After: '''blockno % 13''' 버킷마다 lock → 다른 블록은 동시에 hit, miss 때만 bcache.lock 을 잡고 refcnt==0 인 buf 를 다른 버킷에서 옮겨 온다 (같은 블록은 사본 하나)",
  duration: 14,
  build: function () {
    var D = 14;
    var C = {
      p1: "#1d65b3", p1L: "#dbe8f7", p2: "#2e9e4f", p2L: "#dff3e4", p3: "#e09a40", p3L: "#fdeec2",
      k: "#3b2f4a", kL: "#efe9f6", hw: "#d6465f", spinF: "#ffd9d9", spinT: "#a52f2f",
      ok: "#1d6b2a", okL: "#cdefd2", muted: "#777", line: "#b9c4d8"
    };
    var P = [[C.p1, C.p1L], [C.p2, C.p2L], [C.p3, C.p3L]];
    function f(x) { return Math.round(x * 10000) / 10000; }
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
    function steps(attr, base, ch) {
      var fr = [[0, base]], cur = base;
      ch.forEach(function (c) { fr.push([c[0], cur]); fr.push([c[0] + 0.05, c[1]]); cur = c[1]; });
      return kf(attr, fr);
    }
    function badge(cx, y, w, fillc, strokec, label) {
      return '<rect x="' + (cx - w / 2) + '" y="' + y + '" width="' + w + '" height="17" rx="8" fill="' + fillc + '" stroke="' + strokec + '"/>' +
        txt(cx, y + 13, label, 11, strokec, ' font-weight="700"');
    }

    var s = '<svg viewBox="0 0 760 372" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="bcache 해시 버킷 애니메이션">';
    s += '<defs><marker id="bh_arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="' + C.p1 + '"/></marker></defs>';

    // ---- 단계 자막 ----
    var caps = [
      [0, 0.6, "Before: bcache.lock 하나가 LRU 이중 연결 리스트 전체를 지킨다"],
      [0.6, 2.1, "P1 이 bget() — lock 을 쥔 채 head 부터 리스트를 훑는다, P2·P3 는 spinning"],
      [2.1, 4.4, "찾는 block 이 서로 달라도 전부 같은 lock 앞에 줄을 선다 (lock contention)"],
      [4.4, 5.8, "After: blockno % 13 으로 bucket 을 정한다 — bucket 마다 lock 하나"],
      [5.8, 7.6, "bget(27) → bucket 1 hit (refcnt 1→2) · 동시에 bget(18) → bucket 5 — 서로 다른 lock"],
      [7.6, 9.0, "bget(40) → 40 % 13 = 1, bucket 1 을 뒤졌지만 없다 → miss"],
      [9.0, 10.4, "miss: bcache.lock 을 잡고 refcnt == 0 인 buf 를 찾는다 → bucket 7 의 blk 59"],
      [10.4, 11.8, "bucket 1 → 7 순서(번호 작은 것 먼저)로 lock, buf 를 bucket 1 로 옮기고 blockno = 40"],
      [11.8, 14, "블록 40 은 bucket 1 에만, 사본 하나 — 그동안 P2 는 bucket 5 에서 따로 일했다"]
    ];
    caps.forEach(function (c) { s += win(c[0], c[1], txt(380, 24, c[2], 14, "#222", ' font-weight="700"')); });

    // ================= Before =================
    var B = '<g>';
    B += '<rect x="10" y="38" width="740" height="236" rx="10" fill="#fafafa" stroke="#ddd"/>';
    B += txt(22, 58, "Before — bcache.lock 하나 + LRU 리스트 하나", 12, C.k, ' font-weight="700" text-anchor="start"');
    B += '<rect x="330" y="84" width="140" height="36" rx="7" stroke="' + C.k + '" stroke-width="2.5" fill="' + C.kL + '">' +
      steps("fill", C.kL, [[0.3, C.p1L], [1.8, C.kL], [2.1, C.p2L], [3.3, C.kL], [3.6, C.p3L], [4.4, C.kL]]) + '</rect>';
    B += txt(400, 107, "🔒 bcache.lock", 13, C.k, ' font-weight="700"');
    var holdIv = [[0.3, 1.8], [2.1, 3.3], [3.6, 4.4]];
    holdIv.forEach(function (h, k) { B += win(h[0], h[1], txt(400, 138, "holder: P" + (k + 1), 11, P[k][0], ' font-weight="700"')); });
    // 프로세스 줄 (holder 250, 대기 170, 90)
    var SX = [250, 170, 90], TY = 88;
    var order = [[0, 1, 2], [1, 2, 0], [2, 0, 1]], rotT = [1.8, 3.3];
    for (var k = 0; k < 3; k++) {
      var fr = [[0, SX[order[0].indexOf(k)], TY]];
      for (var r = 0; r < 2; r++) {
        fr.push([rotT[r], SX[order[r].indexOf(k)], TY]);
        if (order[r].indexOf(k) === 0) fr.push([rotT[r] + 0.15, 170, TY + 34]);
        fr.push([rotT[r] + 0.3, SX[order[r + 1].indexOf(k)], TY]);
      }
      var h = holdIv[k];
      var spin = [[0, h[0] > 0.3 ? 1 : 0]];
      if (h[0] > 0.3) { spin.push([h[0] - 0.35, 1]); spin.push([h[0] - 0.3, 0]); }
      spin.push([h[1], 0]);
      if (h[1] + 0.35 < 4.4) { spin.push([h[1] + 0.3, 0]); spin.push([h[1] + 0.35, 1]); spin.push([4.4, 1]); spin.push([4.45, 0]); }
      var g = '<g>';
      g += '<g>' + badge(33, -21, 62, C.spinF, C.spinT, "spinning") + kf("opacity", spin) + '</g>';
      g += win(h[0], h[1], badge(33, -21, 62, C.okL, C.ok, "bget()"));
      g += '<rect x="0" y="0" width="66" height="28" rx="14" fill="' + P[k][1] + '" stroke="' + P[k][0] + '" stroke-width="2"/>';
      g += txt(33, 19, "P" + (k + 1), 13, P[k][0], ' font-weight="700"') + mv(fr) + '</g>';
      B += g;
    }
    // #test-and-set
    B += txt(640, 108, "#test-and-set (bcache):", 12, C.spinT, ' text-anchor="end"');
    var v = 0, cnt = [];
    for (var t = 0.3, n = 0; t < 4.4 - 1e-6; t += 0.3, n++) { cnt.push([t, v]); v += 520 + (n * 211) % 380; }
    cnt.push([4.4, v]);
    cnt.forEach(function (c, j) {
      var end = j + 1 < cnt.length ? cnt[j + 1][0] : D;
      B += win(j === 0 ? 0 : c[0], end, txt(646, 108, String(c[1]).replace(/\B(?=(\d{3})+(?!\d))/g, ","), 14, C.spinT, ' font-weight="700" text-anchor="start"'));
    });
    // LRU 리스트
    var LB = [27, 5, 18, 13, 59, 30, 12], LY = 168;
    function lx(i) { return 104 + i * 92; }
    B += '<rect x="26" y="' + LY + '" width="58" height="34" rx="6" fill="' + C.kL + '" stroke="' + C.k + '" stroke-width="1.5"/>' + txt(55, LY + 22, "head", 12, C.k, ' font-weight="700"');
    B += txt(94, LY + 22, "⇄", 13, C.muted);
    LB.forEach(function (b, i) {
      B += '<rect x="' + lx(i) + '" y="' + LY + '" width="70" height="34" rx="6" fill="#fff" stroke="' + C.line + '" stroke-width="1.5"/>';
      B += txt(lx(i) + 35, LY + 22, "blk " + b, 12, "#222", ' font-weight="700"');
      if (i < LB.length - 1) B += txt(lx(i) + 81, LY + 22, "⇄", 13, C.muted);
    });
    B += txt(lx(0) + 35, LY + 52, "← MRU", 11, C.muted);
    B += txt(lx(6) + 35, LY + 52, "LRU →", 11, C.muted);
    // 스캔 커서: holder 가 head 부터 목표까지 훑음
    [[0, 0.5, 1.6, 4], [1, 2.3, 3.2, 6], [2, 3.8, 4.35, 2]].forEach(function (sc) {
      var cfr = [[sc[1], lx(0) - 3, LY - 3], [sc[2], lx(sc[3]) - 3, LY - 3]];
      B += '<g opacity="0"><rect x="0" y="0" width="76" height="40" rx="8" fill="none" stroke="' + P[sc[0]][0] + '" stroke-width="3"/>' + mv(cfr) + show(sc[1], sc[2] + 0.15) + '</g>';
    });
    B += txt(380, 252, "bget()·brelse() 가 모두 이 lock 하나를 거친다 — 서로 다른 block 을 찾는데도", 12, C.muted);
    B += kf("opacity", [[0, 1], [4.4, 1], [4.6, 0]]) + '</g>';
    s += B;

    // ================= After =================
    var A = '<g opacity="0">';
    A += txt(20, 46, "[i] = blockno % 13 · bucket 마다 lock", 11, C.muted, ' text-anchor="start"');
    A += txt(320, 46, "buf (blk · refcnt)", 11, C.muted);
    function ry(i) { return 52 + i * 21; }
    function bx(j) { return 198 + j * 82; }
    var lockCh = {
      1: [[6.2, C.p1L], [7.6, C.kL], [8.2, C.p1L], [8.9, C.kL], [9.9, C.p1L], [11.5, C.kL]],
      5: [[6.2, C.p2L], [7.6, C.kL], [9.2, C.p2L], [10.4, C.kL]],
      7: [[10.2, C.p1L], [11.5, C.kL]]
    };
    for (var i = 0; i < 13; i++) {
      var y = ry(i);
      if (i % 2 === 0) A += '<rect x="14" y="' + (y - 2) + '" width="490" height="21" fill="#f6f6f9"/>';
      A += txt(22, y + 13, "[" + i + "]", 11, C.k, ' font-weight="700" text-anchor="start"');
      A += '<rect x="76" y="' + y + '" width="112" height="17" rx="8" stroke="' + C.k + '" stroke-width="1.2" fill="' + C.kL + '">' + (lockCh[i] ? steps("fill", C.kL, lockCh[i]) + steps("stroke", C.k, lockCh[i].map(function (c) { return [c[0], c[1] === C.kL ? C.k : (c[1] === C.p1L ? C.p1 : C.p2)]; })) + steps("stroke-width", "1.2", lockCh[i].map(function (c) { return [c[0], c[1] === C.kL ? "1.2" : "2.5"]; })) : "") + '</rect>';
      A += txt(132, y + 13, "🔒 bcache.bucket", 11, C.k);
    }
    // 잠금 순서 배지
    A += win(9.9, 11.5, txt(60, ry(1) + 13, "①", 13, C.p1, ' font-weight="700"'));
    A += win(10.2, 11.5, txt(60, ry(7) + 13, "②", 13, C.p1, ' font-weight="700"'));
    // buf 들
    function buf(blk, ref, x, y, opt) {
      opt = opt || {};
      var g = '<g>';
      g += '<rect x="0" y="0" width="76" height="17" rx="4" fill="#fff" stroke="' + C.line + '" stroke-width="1.2"/>';
      if (opt.hl) opt.hl.forEach(function (hh) {
        g += win(hh[0], hh[1], '<rect x="-2" y="-2" width="80" height="21" rx="5" fill="none" stroke="' + hh[2] + '" stroke-width="2.5"/>');
      });
      if (opt.texts) opt.texts.forEach(function (tt) { g += win(tt[0], tt[1], txt(38, 13, tt[2], 11, tt[3] || "#222", ' font-weight="700"')); });
      else g += txt(38, 13, "blk " + blk + " · r" + ref, 11, ref ? "#222" : C.muted, ' font-weight="700"');
      g += mv(opt.fr || [[0, x, y]]) + '</g>';
      return g;
    }
    var init = { 0: [[13, 0], [26, 0]], 2: [[2, 0]], 4: [[30, 0]], 8: [[21, 0]], 9: [[22, 0]], 11: [[24, 0]], 12: [[12, 0], [38, 0]] };
    Object.keys(init).forEach(function (bi) { init[bi].forEach(function (b, j) { A += buf(b[0], b[1], bx(j), ry(+bi)); }); });
    // bucket 1: 27(r1→r2), 1(r1)
    A += buf(27, 1, bx(0), ry(1), {
      texts: [[0, 6.8, "blk 27 · r1"], [6.8, D, "blk 27 · r2", C.p1]],
      hl: [[6.3, 7.6, C.p1]]
    });
    A += buf(1, 1, bx(1), ry(1));
    // bucket 1 miss 스캔 커서
    A += '<g opacity="0"><rect x="-2" y="-2" width="80" height="21" rx="5" fill="none" stroke="' + C.hw + '" stroke-width="2.5" stroke-dasharray="4 3"/>' +
      mv([[8.3, bx(0), ry(1)], [8.7, bx(1), ry(1)]]) + show(8.3, 8.9) + '</g>';
    // bucket 5: 18(r1→r2), 5(r1→r2)
    A += buf(18, 1, bx(0), ry(5), { texts: [[0, 6.8, "blk 18 · r1"], [6.8, D, "blk 18 · r2", C.p2]], hl: [[6.3, 7.6, C.p2]] });
    A += buf(5, 1, bx(1), ry(5), { texts: [[0, 9.7, "blk 5 · r1"], [9.7, D, "blk 5 · r2", C.p2]], hl: [[9.3, 10.4, C.p2]] });
    // bucket 7: 59(r0) → bucket 1 로 이동하며 blk 40, 33(r1) 은 왼쪽으로
    A += buf(59, 0, bx(0), ry(7), {
      texts: [[0, 11.2, "blk 59 · r0", C.muted], [11.2, D, "blk 40 · r1", C.p1]],
      hl: [[9.3, 10.4, C.hw], [10.4, 11.8, C.p1]],
      fr: [[0, bx(0), ry(7)], [10.4, bx(0), ry(7)], [10.8, bx(2), ry(3)], [11.2, bx(2), ry(1)]]
    });
    A += buf(33, 1, bx(1), ry(7), { fr: [[0, bx(1), ry(7)], [11.1, bx(1), ry(7)], [11.4, bx(0), ry(7)]] });
    A += win(9.3, 10.4, txt(bx(2) + 4, ry(7) + 13, "blk 59: r0 → 재사용 후보", 11, C.hw, ' font-weight="700" text-anchor="start"'));
    // 이동 경로 화살표
    A += win(10.3, 11.4, '<path d="M' + (bx(0) + 78) + ',' + (ry(7) + 8) + ' C420,' + (ry(6)) + ' 420,' + (ry(3)) + ' ' + (bx(2) + 38) + ',' + (ry(1) + 21) + '" fill="none" stroke="' + C.p1 + '" stroke-width="2" stroke-dasharray="5 4" marker-end="url(#bh_arrow)"/>');
    // 프로세스 토큰 (오른쪽 끝)
    A += win(5.6, D, '<rect x="456" y="' + ry(1) + '" width="40" height="17" rx="8" fill="' + C.p1L + '" stroke="' + C.p1 + '" stroke-width="1.5"/>' + txt(476, ry(1) + 13, "P1", 11, C.p1, ' font-weight="700"'));
    A += win(5.6, D, '<rect x="456" y="' + ry(5) + '" width="40" height="17" rx="8" fill="' + C.p2L + '" stroke="' + C.p2 + '" stroke-width="1.5"/>' + txt(476, ry(5) + 13, "P2", 11, C.p2, ' font-weight="700"'));

    // ---- 오른쪽 패널 ----
    A += '<rect x="516" y="48" width="232" height="104" rx="8" fill="#fff" stroke="' + C.line + '"/>';
    A += txt(632, 66, "bget(blockno) → 어느 bucket?", 12, C.k, ' font-weight="700"');
    A += win(5.8, 8.0, txt(526, 88, "P1: 27 % 13 = 1", 12, C.p1, ' font-weight="700" text-anchor="start"'));
    A += win(8.0, D, txt(526, 88, "P1: 40 % 13 = 1", 12, C.p1, ' font-weight="700" text-anchor="start"'));
    A += win(5.8, 8.6, txt(526, 108, "P2: 18 % 13 = 5", 12, C.p2, ' font-weight="700" text-anchor="start"'));
    A += win(8.6, D, txt(526, 108, "P2: 5 % 13 = 5", 12, C.p2, ' font-weight="700" text-anchor="start"'));
    A += win(6.8, 8.0, txt(740, 88, "hit ✔", 12, C.ok, ' font-weight="700" text-anchor="end"'));
    A += win(8.7, 11.2, txt(740, 88, "miss ✗", 12, C.hw, ' font-weight="700" text-anchor="end"'));
    A += win(11.2, D, txt(740, 88, "새로 캐시 ✔", 12, C.ok, ' font-weight="700" text-anchor="end"'));
    A += win(6.8, 8.6, txt(740, 108, "hit ✔", 12, C.ok, ' font-weight="700" text-anchor="end"'));
    A += win(9.7, D, txt(740, 108, "hit ✔", 12, C.ok, ' font-weight="700" text-anchor="end"'));
    A += win(6.3, 7.6, txt(632, 138, "bucket 1 ‖ bucket 5 — 동시에!", 12, C.ok, ' font-weight="700"'));
    A += win(9.3, 10.4, txt(632, 138, "P2 는 bucket 5 에서 계속", 12, C.p2, ' font-weight="700"'));
    // bcache.lock (eviction 전용)
    A += '<rect x="516" y="166" width="232" height="38" rx="8" stroke="' + C.k + '" stroke-width="2" fill="' + C.kL + '">' + steps("fill", C.kL, [[9.0, C.p1L], [11.8, C.kL]]) + '</rect>';
    A += txt(632, 190, "🔒 bcache.lock (miss/eviction 때만)", 12, C.k, ' font-weight="700"');
    A += win(9.0, 11.8, txt(632, 222, "holder: P1 — 빈 buf 찾기 직렬화", 11, C.p1, ' font-weight="700"'));
    A += win(9.9, 11.8, txt(632, 244, "bucket lock 순서: 1 → 7", 12, C.p1, ' font-weight="700"'));
    A += win(9.9, 11.8, txt(632, 262, "(번호 작은 것 먼저 = 순환 대기 없음)", 11, C.muted));
    A += win(11.8, D, txt(632, 244, "NBUF = 30 그대로", 12, C.k, ' font-weight="700"'));
    A += win(11.8, D, txt(632, 262, "buf 는 bucket 사이를 옮겨 다닐 뿐", 11, C.muted));
    A += txt(632, 300, "hit 는 bucket lock 하나로 끝", 11, C.muted);
    A += txt(632, 318, "같은 blk 는 항상 같은 bucket", 11, C.muted);
    A += kf("opacity", [[0, 0], [4.6, 0], [4.85, 1]]) + '</g>';
    s += A;

    // ---- 요점 ----
    s += txt(380, 360, "요점: 블록 번호로 나누면 다른 블록끼리는 lock 이 안 겹치고, 같은 블록은 사본 하나만", 13, C.k, ' font-weight="700"');
    s += '</svg>';
    return s;
  }
};
