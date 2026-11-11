// looping_lru — 17강 p.42 Looping Sequential 을 page 5개로 줄였다. frame 4개면 LRU 가 매번 곧 쓸 page 를 내보내고, 5개면 둘째 바퀴가 전부 hit.
window.ANIMS = window.ANIMS || {};
ANIMS["looping_lru"] = {
  title: "Looping Sequential 에서 LRU 가 매번 miss 나는 이유",
  desc: "[[페이지 교체 정책]] p.42 를 page 5개(0~4)로 줄였다. 같은 참조를 frame 4개와 5개로 돌린다.",
  duration: 13,
  build: function () {
    var D = 13, refs = [0, 1, 2, 3, 4, 0, 1, 2, 3, 4];
    function r3(v) { return Math.round(v * 1000) / 1000; }
    function show(a, b) { return '<animate attributeName="opacity" values="0;0;1;1;0;0" keyTimes="0;' + r3(a / D) + ';' + r3(a / D + 0.003) + ';' + r3(b / D) + ';' + r3(Math.min(0.999, b / D + 0.003)) + ';1" dur="' + D + 's" fill="freeze"/>'; }
    function T(i) { return 1 + i; }
    function E(i) { return i === refs.length - 1 ? D - 0.01 : T(i + 1); }
    function sim(F) {
      var slots = [], last = {}, out = [];
      refs.forEach(function (p, i) {
        var r = { hit: false, evict: null, slot: -1 }, k = slots.indexOf(p);
        if (k >= 0) { r.hit = true; r.slot = k; }
        else if (slots.length < F) { slots.push(p); r.slot = slots.length - 1; }
        else {
          var v = 0;
          for (var j = 1; j < F; j++) if (last[slots[j]] < last[slots[v]]) v = j;
          r.evict = slots[v]; slots[v] = p; r.slot = v;
        }
        last[p] = i; r.slots = slots.slice(); out.push(r);
      });
      return out;
    }
    var s = '<svg viewBox="0 0 760 375" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Looping Sequential 에서 LRU">';
    [[0, 1, "0 → 1 → 2 → 3 → 4 를 두 바퀴 참조한다"], [1, 5, "첫 바퀴: 처음 보는 page 라 위아래 모두 miss"], [5, 6, "page 4: frame 4개는 자리가 없어 가장 오래된 0 을 내보낸다"], [6, 11, "다음 참조가 방금 내보낸 0 → miss. 이후 계속 반복"], [11, 12.99, "frame 4개 hit 0번, frame 5개 hit 5번 (둘째 바퀴 전부)"]].forEach(function (c) {
      s += '<text x="380" y="24" font-size="15" text-anchor="middle" font-weight="700" fill="#3b2f4a" opacity="0">' + c[2] + show(c[0], c[1]) + '</text>';
    });
    // 참조열: 결과 칸과 같은 열
    s += '<text x="470" y="62" font-size="13" text-anchor="end" fill="#555">참조</text>';
    refs.forEach(function (p, i) {
      var x = 480 + i * 27;
      s += '<rect x="' + x + '" y="44" width="24" height="26" rx="3" fill="#f6f6f6" stroke="#ccc"/>';
      s += '<rect x="' + x + '" y="44" width="24" height="26" rx="3" fill="#efe9f6" stroke="#3b2f4a" stroke-width="2" opacity="0">' + show(T(i), E(i)) + '</rect>';
      s += '<text x="' + (x + 12) + '" y="62" font-size="14" text-anchor="middle" fill="#222">' + p + '</text>';
    });
    function row(y, F, title, sub) {
      var out = sim(F), g = '', hits = 0;
      g += '<text x="12" y="' + (y + 18) + '" font-size="14" font-weight="700" fill="#3b2f4a">' + title + '</text>';
      g += '<text x="12" y="' + (y + 36) + '" font-size="12" fill="#777">' + sub + '</text>';
      for (var j = 0; j < F; j++) g += '<rect x="' + (120 + j * 62) + '" y="' + y + '" width="54" height="44" rx="6" fill="#fff" stroke="#1d65b3"/>';
      out.forEach(function (r, i) {
        var a = T(i), b = E(i);
        if (r.hit) hits++;
        r.slots.forEach(function (p, j) {
          var x = 120 + j * 62, fill = j === r.slot ? (r.hit ? "#cdefd2" : "#fdeec2") : "#dbe8f7";
          g += '<rect x="' + x + '" y="' + y + '" width="54" height="44" rx="6" fill="' + fill + '" stroke="#1d65b3" opacity="0">' + show(a, b) + '</rect>';
          g += '<text x="' + (x + 27) + '" y="' + (y + 29) + '" font-size="19" text-anchor="middle" fill="#222" opacity="0">' + p + show(a, b) + '</text>';
        });
        if (r.evict !== null) {
          var nx = i + 1 < refs.length ? refs[i + 1] : refs[0], msg = '내보냄: ' + r.evict + (nx === r.evict ? (i + 1 < refs.length ? '  ← 바로 다음 참조가 ' : '  ← 다음 바퀴 첫 참조가 ') + nx : '');
          g += '<text x="120" y="' + (y + 64) + '" font-size="13" fill="#a52f2f" font-weight="700" opacity="0">' + msg + show(a, b) + '</text>';
        }
        var cx = 480 + i * 27;
        g += '<rect x="' + cx + '" y="' + (y + 10) + '" width="24" height="24" rx="3" fill="' + (r.hit ? "#cdefd2" : "#ffd9d9") + '" opacity="0">' + show(a, D - 0.01) + '</rect>';
        g += '<text x="' + (cx + 12) + '" y="' + (y + 27) + '" font-size="13" text-anchor="middle" font-weight="700" fill="' + (r.hit ? "#1d6b2a" : "#a52f2f") + '" opacity="0">' + (r.hit ? "H" : "M") + show(a, D - 0.01) + '</text>';
        g += '<text x="480" y="' + (y + 56) + '" font-size="13" fill="#555" opacity="0">hit ' + hits + ' / ' + (i + 1) + show(a, b) + '</text>';
      });
      return g;
    }
    s += row(96, 4, "frame 4개", "LRU (FIFO 도 같음)");
    s += row(226, 5, "frame 5개", "page 가 전부 들어감");
    s += '<text x="380" y="362" font-size="14" text-anchor="middle" fill="#777">반복해서 훑을 때는 가장 오래 안 쓴 page 가 곧 쓸 page 다</text>';
    return s + '</svg>';
  }
};
