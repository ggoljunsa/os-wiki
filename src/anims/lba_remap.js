// lba_remap — 18강 p.29~30: logical block 0~5 를 차례로 읽는다. 0~3 은 이웃 sector 라 한 번에 줄줄이 읽히고,
//   블록 4 는 bad sector 라 안쪽 track 으로 remap 되어 있어 seek 두 번 + 거의 한 바퀴를 더 쓴다.
//   회전: t=1~13 동안 반시계로 540°(45°/s). sector k 가 head 밑에 오는 시각 = 1 + (30 + 30k)/45.
window.ANIMS = window.ANIMS || {};
ANIMS["lba_remap"] = {
  title: "Logical block 을 sector 로: 이웃 배치와 bad sector remap",
  desc: "[[logical block]] p.30. 연속 블록은 이웃 sector 라 한 번 돌며 읽히고, remap 된 블록 4 는 head 를 다른 track 으로 보냈다가 돌아오게 만든다.",
  duration: 14,
  build: function () {
    var D = 14, cx = 545, cy = 210;
    function r3(v) { return Math.round(v * 1000) / 1000; }
    function k(t) { return r3(Math.min(Math.max(t / D, 0), 0.996)); }
    function show(a, b) { return '<animate attributeName="opacity" values="0;0;1;1;0;0" keyTimes="0;' + k(a) + ';' + r3(k(a) + 0.003) + ';' + k(b) + ';' + r3(k(b) + 0.003) + ';1" dur="' + D + 's" fill="freeze"/>'; }
    function from(a) { return '<animate attributeName="opacity" values="0;0;1;1" keyTimes="0;' + k(a) + ';' + r3(k(a) + 0.003) + ';1" dur="' + D + 's" fill="freeze"/>'; }
    function txt(x, y, s, size, fill, extra) { return '<text x="' + x + '" y="' + y + '" font-size="' + size + '" fill="' + fill + '"' + (extra && extra.indexOf('text-anchor') >= 0 ? '' : ' text-anchor="middle"') + (extra || '') + '>' + s + '</text>'; }
    function win(a, b, inner) { return '<g opacity="0">' + inner + show(a, b) + '</g>'; }
    function pt(r, deg) { var a = deg * Math.PI / 180; return r3(cx + r * Math.cos(a)) + ' ' + r3(cy + r * Math.sin(a)); }
    function sector(r1, r2, mid, half, fill) {
      return '<path d="M' + pt(r1, mid - half) + ' L' + pt(r2, mid - half) + ' A' + r2 + ' ' + r2 + ' 0 0 1 ' + pt(r2, mid + half) + ' L' + pt(r1, mid + half) + ' A' + r1 + ' ' + r1 + ' 0 0 0 ' + pt(r1, mid - half) + ' Z" fill="' + fill + '" stroke="#555"/>';
    }
    var C = { blue: "#1d65b3", blueL: "#dbe8f7", hw: "#d6465f", ok: "#2e9e4f", cpu: "#3b2f4a", cpuL: "#efe9f6", muted: "#777", or: "#e09a40" };
    var s = '<svg viewBox="0 0 760 380" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="logical block 과 sector 매핑, bad sector remap">';
    var caps = [
      [0, 1, "OS 가 logical block 0~5 를 차례로 읽는다"],
      [1, 3.9, "연속 블록은 이웃 sector 에 있다. 한 번 돌며 0, 1, 2, 3 을 줄줄이 읽는다"],
      [3.9, 5.9, "블록 4 자리는 bad sector. 안쪽 track 에 remap 된 곳을 읽는다"],
      [5.9, 12.9, "다시 바깥 track 으로. 블록 5 는 방금 지나가서 거의 한 바퀴를 기다린다"],
      [12.9, 13.99, "remap 된 블록 하나 때문에 seek 두 번과 회전 한 바퀴가 더 들었다"]
    ];
    caps.forEach(function (c) { s += win(c[0], c[1], txt(380, 26, c[2], 15, "#222", ' font-weight="700"')); });

    // ===== 왼쪽: OS → logical block 배열 → disk controller =====
    s += '<rect x="20" y="50" width="320" height="36" rx="8" fill="' + C.cpuL + '" stroke="' + C.cpu + '" stroke-width="2"/>';
    s += txt(180, 74, "OS: “블록 n 을 읽어라”", 14, C.cpu, ' font-weight="700"');
    s += txt(180, 108, "Array of logical blocks (4 KB)", 12, C.muted);
    var cells = ["0", "1", "2", "3", "4", "5", "…", "n"];
    var hi = [[1.3, 1.9], [1.95, 2.55], [2.6, 3.2], [3.25, 3.85], [3.9, 5.9], [5.95, 13.4]];
    var done = [1.9, 2.5, 3.2, 3.8, 5.85, 13.25];
    cells.forEach(function (c, i) {
      var x = 30 + i * 38;
      s += '<rect x="' + x + '" y="116" width="36" height="34" fill="#fff" stroke="#555"/>';
      if (i < 6) {
        s += '<rect x="' + x + '" y="116" width="36" height="34" fill="#fdeec2" stroke="' + C.or + '" stroke-width="3" opacity="0">' + show(hi[i][0], hi[i][1]) + '</rect>';
        s += '<rect x="' + x + '" y="116" width="36" height="34" fill="' + C.blueL + '" opacity="0">' + from(done[i]) + '</rect>';
      }
      s += txt(x + 18, 139, c, 15, i === 4 ? C.hw : "#222", ' font-style="italic" font-weight="700"');
    });
    s += '<line x1="180" y1="152" x2="180" y2="176" stroke="#555" stroke-width="2"/>';
    s += '<rect x="20" y="178" width="320" height="120" rx="8" fill="#fff" stroke="' + C.cpu + '" stroke-width="2"/>';
    s += txt(180, 200, "disk controller (firmware)", 14, C.cpu, ' font-weight="700"');
    s += txt(180, 220, "logical block → (surface, track, sector)", 12, C.muted);
    s += win(1, 3.9, txt(180, 252, "블록 0~3 → 바깥 track 의 이웃 sector", 13, "#222", ' font-weight="700"') + txt(180, 276, "head 는 그대로, 디스크만 돈다", 12, C.blue));
    s += win(3.9, 5.9, txt(180, 252, "블록 4 → 표에서 remap 위치 찾음", 13, C.hw, ' font-weight="700"') + txt(180, 276, "head 를 안쪽 track 으로 seek", 12, C.hw));
    s += win(5.9, 12.9, txt(180, 252, "블록 5 → 다시 바깥 track", 13, "#222", ' font-weight="700"') + txt(180, 276, "seek 후 sector 5 가 올 때까지 대기", 12, C.hw));
    s += win(12.9, 13.99, txt(180, 252, "읽기 끝", 13, C.ok, ' font-weight="700"') + txt(180, 276, "0~3: 회전만 / 4·5: seek + 회전", 12, C.muted));
    // 대기 막대
    s += '<g opacity="0">' + txt(180, 322, "회전 대기", 12, C.hw, ' font-weight="700"') + '<rect x="60" y="330" width="240" height="10" fill="#eee"/>' +
      '<rect x="60" y="330" width="0" height="10" fill="' + C.hw + '"><animate attributeName="width" values="0;0;240;240" keyTimes="0;' + k(6.7) + ';' + k(13) + ';1" dur="' + D + 's" fill="freeze"/></rect>' + show(6.7, 13.2) + '</g>';
    s += '<line x1="340" y1="238" x2="398" y2="238" stroke="#555" stroke-width="2" stroke-dasharray="5 4"/>';

    // ===== 오른쪽: 디스크 =====
    var rot = '<animateTransform attributeName="transform" type="rotate" values="0 ' + cx + ' ' + cy + ';0 ' + cx + ' ' + cy + ';-540 ' + cx + ' ' + cy + ';-540 ' + cx + ' ' + cy + '" keyTimes="0;' + k(1) + ';' + k(13) + ';1" dur="' + D + 's" fill="freeze"/>';
    s += '<g>' + rot;
    s += '<circle cx="' + cx + '" cy="' + cy + '" r="135" fill="#f4f4f4" stroke="#555"/>';
    [108, 84, 60].forEach(function (r) { s += '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="none" stroke="#999"/>'; });
    for (var i = 0; i < 12; i++) {
      var d = i * 30 + 15;
      s += '<line x1="' + pt(36, d).replace(" ", '" y1="') + '" x2="' + pt(135, d).replace(" ", '" y2="') + '" stroke="#bbb"/>';
    }
    // 바깥 track: 블록 0~5 (4 는 bad)
    for (var b = 0; b < 6; b++) {
      var mid = 30 + 30 * b;
      s += sector(108, 135, mid, 15, b === 4 ? C.hw : "#fff");
      var p = pt(121.5, mid).split(" ");
      s += txt(p[0], +p[1] + 5, b === 4 ? "✗" : "" + b, 14, b === 4 ? "#fff" : "#222", ' font-weight="700"');
    }
    // remap 된 블록 4: 안쪽 track
    s += sector(84, 108, 210, 15, C.blueL);
    var q = pt(96, 210).split(" ");
    s += txt(q[0], +q[1] + 5, "4", 14, C.blue, ' font-weight="700"');
    s += '</g>';
    s += '<circle cx="' + cx + '" cy="' + cy + '" r="36" fill="#fff" stroke="#555"/>' + txt(cx, cy + 4, "spindle", 11, "#555");
    // 회전 방향 표시
    s += '<path d="M' + (cx - 150) + ',' + (cy - 60) + ' A160 160 0 0 0 ' + (cx - 150) + ',' + (cy + 60) + '" fill="none" stroke="#bbb" stroke-width="6" marker-end="url(#lr_arrow)"/>';
    s += '<defs><marker id="lr_arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="4" markerHeight="4" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="#bbb"/></marker></defs>';
    // head + arm: 바깥 track(r=121.5) ↔ 안쪽(r=96)
    s += '<g><animateTransform attributeName="transform" type="translate" values="0 0;0 0;-25.5 0;-25.5 0;0 0;0 0" keyTimes="0;' + k(3.9) + ';' + k(4.7) + ';' + k(5.9) + ';' + k(6.7) + ';1" dur="' + D + 's" fill="freeze"/>';
    s += '<rect x="' + (cx + 130) + '" y="' + (cy - 4) + '" width="200" height="8" fill="' + C.cpu + '"/>';
    s += '<path d="M' + (cx + 116) + ' ' + cy + ' L' + (cx + 132) + ' ' + (cy - 10) + ' L' + (cx + 132) + ' ' + (cy + 10) + ' Z" fill="' + C.cpu + '"/>';
    s += txt(cx + 180, cy - 14, "head", 12, C.cpu, ' font-weight="700"');
    s += '</g>';
    // 범례
    s += '<rect x="420" y="352" width="14" height="14" fill="' + C.hw + '"/>' + txt(440, 364, "bad sector", 12, "#444", ' text-anchor="start"');
    s += '<rect x="530" y="352" width="14" height="14" fill="' + C.blueL + '" stroke="#555"/>' + txt(550, 364, "remap 된 블록 4", 12, "#444", ' text-anchor="start"');

    s += txt(180, 368, "remap 은 드물게만 쓴다. 성능이 떨어질 수 있다", 12, C.muted);
    return s + '</svg>';
  }
};
