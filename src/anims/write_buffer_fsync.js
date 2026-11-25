// write_buffer_fsync — 20강 p.25: write buffering. 같은 블록을 세 번 write → 메모리에서 합쳐짐, close() 는 flush 를 보장하지 않음.
//   위: fsync() → 디스크 I/O 1 번으로 v3 가 디스크에. 아래: fsync 없이 전원이 나가면 v3 는 사라지고 디스크엔 옛 v0.
window.ANIMS = window.ANIMS || {};
ANIMS["write_buffer_fsync"] = {
  title: "write buffering: 모아서 한 번에 쓰고, 확실히 하려면 fsync",
  desc: "[[caching과 buffering]] p.25. 같은 블록을 세 번 고쳐도 디스크 쓰기는 한 번. 대신 close() 만으로는 디스크에 갔다는 보장이 없다.",
  duration: 14,
  build: function () {
    var D = 14;
    function r3(v) { return Math.round(v * 1000) / 1000; }
    function k(t) { return r3(Math.min(Math.max(t / D, 0), 0.996)); }
    function show(a, b) { return '<animate attributeName="opacity" values="0;0;1;1;0;0" keyTimes="0;' + k(a) + ';' + r3(k(a) + 0.003) + ';' + k(b) + ';' + r3(k(b) + 0.003) + ';1" dur="' + D + 's" fill="freeze"/>'; }
    function from(a) { return '<animate attributeName="opacity" values="0;0;1;1" keyTimes="0;' + k(a) + ';' + r3(k(a) + 0.003) + ';1" dur="' + D + 's" fill="freeze"/>'; }
    function txt(x, y, s, size, fill, extra) { return '<text x="' + x + '" y="' + y + '" font-size="' + size + '" fill="' + fill + '"' + (extra && extra.indexOf('text-anchor') >= 0 ? '' : ' text-anchor="middle"') + (extra || '') + '>' + s + '</text>'; }
    function win(a, b, inner) { return '<g opacity="0">' + inner + show(a, b) + '</g>'; }
    function on(a, inner) { return '<g opacity="0">' + inner + from(a) + '</g>'; }
    var C = { app: "#1d65b3", appL: "#dbe8f7", mem: "#e09a40", memL: "#fdeec2", disk: "#3b2f4a", diskL: "#efe9f6", hw: "#d6465f", ok: "#2e9e4f", muted: "#777" };
    var s = '<svg viewBox="0 0 760 370" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="write buffering 과 fsync">';
    var caps = [
      [0, 1, "두 프로그램이 똑같이 보고서 블록을 고친다. 디스크에는 옛 내용 v0"],
      [1, 4.4, "write() 세 번: 메모리(page cache)의 같은 블록만 v1 → v2 → v3 로 바뀐다"],
      [4.4, 6, "close(): 아무것도 디스크로 가지 않는다. “close() does not guarantee the flush!”"],
      [6, 8.2, "위: fsync() → 마지막 v3 하나만 디스크에 쓴다. write 3 번이 디스크 I/O 1 번"],
      [8.2, 10.4, "아래: fsync 없이 전원이 나갔다. 메모리의 v3 는 사라진다"],
      [10.4, 13.99, "다시 켜면 위는 v3, 아래는 v0. 꼭 남겨야 하는 데이터는 fsync() 를 부른다"]
    ];
    caps.forEach(function (c) { s += win(c[0], c[1], txt(380, 26, c[2], c[2].length > 46 ? 13.5 : 15, "#222", ' font-weight="700"')); });

    function lane(y0, title, col, withFsync) {
      var g = txt(20, y0 + 12, title, 14, col, ' text-anchor="start" font-weight="700"');
      // 앱
      g += '<rect x="20" y="' + (y0 + 22) + '" width="190" height="104" rx="8" fill="' + C.appL + '" stroke="' + C.app + '" stroke-width="2"/>';
      g += txt(115, y0 + 40, "프로그램", 12, C.app, ' font-weight="700"');
      var calls = [["write(v1)", 1], ["write(v2)", 2.2], ["write(v3)", 3.4], ["close()", 4.6]];
      if (withFsync) calls.splice(3, 0, ["fsync()", 6.1]);
      calls.forEach(function (c, i) {
        var yy = y0 + 58 + i * 16, xx = 40;
        g += on(c[1], '<text x="' + xx + '" y="' + yy + '" font-size="13" fill="#222" font-family="monospace" font-weight="700">' + c[0] + '</text>');
      });
      // 메모리
      g += '<rect x="270" y="' + (y0 + 22) + '" width="200" height="104" rx="8" fill="' + C.memL + '" stroke="' + C.mem + '" stroke-width="2" stroke-dasharray="6 4"/>';
      g += txt(370, y0 + 40, "메모리 (page cache)", 12, "#8a6000", ' font-weight="700"');
      g += '<rect x="320" y="' + (y0 + 54) + '" width="100" height="50" rx="6" fill="#fff" stroke="' + C.mem + '" stroke-width="2"/>';
      g += win(0, 1.3, txt(370, y0 + 86, "v0", 20, "#999", ' font-weight="700"'));
      g += win(1.3, 2.5, txt(370, y0 + 86, "v1", 20, C.mem, ' font-weight="700"'));
      g += win(2.5, 3.7, txt(370, y0 + 86, "v2", 20, C.mem, ' font-weight="700"'));
      g += win(3.7, withFsync ? 13.99 : 8.4, txt(370, y0 + 86, "v3", 20, C.mem, ' font-weight="700"'));
      g += on(3.8, txt(370, y0 + 120, "세 번 고쳤지만 블록은 하나", 11, C.muted));
      // 디스크
      g += '<rect x="540" y="' + (y0 + 22) + '" width="200" height="104" rx="8" fill="' + C.diskL + '" stroke="' + C.disk + '" stroke-width="2"/>';
      g += txt(640, y0 + 40, "디스크", 12, C.disk, ' font-weight="700"');
      g += '<rect x="590" y="' + (y0 + 54) + '" width="100" height="50" rx="6" fill="#fff" stroke="' + C.disk + '" stroke-width="2"/>';
      // write 패킷: 앱 → 메모리
      [1, 2.2, 3.4].forEach(function (t, i) {
        g += '<g opacity="0"><rect x="-18" y="-11" width="36" height="22" rx="5" fill="' + C.app + '"/>' + txt(0, 5, "v" + (i + 1), 12, "#fff", ' font-weight="700"') +
          '<animateMotion begin="' + t + 's" dur="0.3s" fill="freeze" path="M210,' + (y0 + 79) + ' L318,' + (y0 + 79) + '"/>' + show(t, t + 0.32) + '</g>';
      });
      return g;
    }
    var YA = 46, YB = 196;
    s += lane(YA, "fsync() 를 부른 경우", C.ok, true);
    s += lane(YB, "fsync() 없이 close() 만", C.hw, false);
    s += '<line x1="20" y1="' + (YB - 8) + '" x2="740" y2="' + (YB - 8) + '" stroke="#ccc" stroke-dasharray="4 4"/>';
    // 위 디스크 내용
    s += win(0, 7, txt(640, YA + 86, "v0", 20, "#999", ' font-weight="700"'));
    s += on(7, txt(640, YA + 86, "v3", 20, C.ok, ' font-weight="700"'));
    s += '<g opacity="0"><rect x="-18" y="-11" width="36" height="22" rx="5" fill="' + C.mem + '"/>' + txt(0, 5, "v3", 12, "#fff", ' font-weight="700"') +
      '<animateMotion begin="6.2s" dur="0.8s" fill="freeze" path="M420,' + (YA + 79) + ' L588,' + (YA + 79) + '"/>' + show(6.2, 7.02) + '</g>';
    s += win(0, 6.2, txt(640, YA + 120, "디스크 쓰기 0 번", 12, C.muted, ' font-weight="700"'));
    s += on(7, txt(640, YA + 120, "디스크 쓰기 1 번", 12, C.ok, ' font-weight="700"'));
    // 아래 디스크 내용: 끝까지 v0
    s += txt(640, YB + 86, "v0", 20, "#999", ' font-weight="700"');
    s += txt(640, YB + 120, "디스크 쓰기 0 번", 12, C.muted, ' font-weight="700"');
    // close() 경고 (양쪽)
    [YA, YB].forEach(function (y) {
      s += win(4.6, 6, txt(505, y + 70, "close()", 11, "#a52f2f", ' font-weight="700"') + txt(505, y + 86, "해도", 11, "#a52f2f", ' font-weight="700"') + txt(505, y + 102, "안 감 ✗", 11, "#a52f2f", ' font-weight="700"'));
    });
    // 전원 꺼짐 (아래)
    s += on(8.2, '<polygon points="380,' + (YB + 26) + ' 368,' + (YB + 60) + ' 382,' + (YB + 56) + ' 370,' + (YB + 92) + ' 396,' + (YB + 50) + ' 382,' + (YB + 54) + ' 392,' + (YB + 26) + '" fill="' + C.hw + '"/>');
    s += on(8.4, '<rect x="270" y="' + (YB + 22) + '" width="200" height="104" rx="8" fill="#555" opacity="0.45"/>' + txt(370, YB + 86, "사라짐", 18, "#fff", ' font-weight="700"'));
    s += txt(380, 358, "모아 쓰면 디스크 I/O 가 줄지만, 디스크에 남았다는 보장은 fsync() 만 준다", 13, C.muted);

    return s + '</svg>';
  }
};
