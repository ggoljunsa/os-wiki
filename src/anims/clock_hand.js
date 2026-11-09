// clock_hand — 17강 p.47: hand 가 B(1)를 0 으로 지우고 C(0)를 victim 으로 고른다.
window.ANIMS = window.ANIMS || {};
ANIMS["clock_hand"] = {
  title: "Clock 알고리즘 — 1 은 지우고 넘어가고, 0 이면 내보낸다",
  desc: "[[Clock 알고리즘]] p.47 예제. 교체가 필요하면 hand 가 가리키는 page 의 reference bit 을 본다.",
  duration: 11,
  build: function () {
    var D = 11, cx = 300, cy = 190, R = 118;
    function r3(v) { return Math.round(v * 1000) / 1000; }
    function show(a, b) { return '<animate attributeName="opacity" values="0;0;1;1;0;0" keyTimes="0;' + r3(a / D) + ';' + r3(a / D + 0.003) + ';' + r3(b / D) + ';' + r3(Math.min(0.999, b / D + 0.003)) + ';1" dur="' + D + 's" fill="freeze"/>'; }
    var pages = [["A",0],["B",1],["C",0],["D",1],["E",1],["F",0],["G",0],["H",1]];
    var s = '<svg viewBox="0 0 760 370" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Clock 알고리즘">';
    [[0,2,"page fault 발생. hand 는 B 를 가리킨다"],[2,4.5,"B 의 bit = 1 → 0 으로 지우고 다음 칸으로 (Clear and advance)"],[4.5,7,"C 의 bit = 0 → victim"],[7,10.98,"C 를 내보내고 새 page X 를 넣는다 (bit 1)"]].forEach(function (c) {
      s += '<text x="380" y="26" font-size="15" text-anchor="middle" font-weight="700" fill="#3b2f4a" opacity="0">' + c[2] + show(c[0], c[1]) + '</text>';
    });
    pages.forEach(function (p, i) {
      var a = (-90 + i * 45) * Math.PI / 180, x = Math.round(cx + R * Math.cos(a)), y = Math.round(cy + R * Math.sin(a));
      s += '<rect x="' + (x - 24) + '" y="' + (y - 20) + '" width="48" height="40" rx="6" fill="#dbe8f7" stroke="#1d65b3"/>';
      if (p[0] === "C") {
        s += '<rect x="' + (x - 24) + '" y="' + (y - 20) + '" width="48" height="40" rx="6" fill="#ffd9d9" stroke="#d6465f" stroke-width="2.5" opacity="0">' + show(4.5, 7) + '</rect>';
        s += '<rect x="' + (x - 24) + '" y="' + (y - 20) + '" width="48" height="40" rx="6" fill="#fdeec2" stroke="#e09a40" stroke-width="2.5" opacity="0">' + show(7, 10.99) + '</rect>';
        s += '<text x="' + x + '" y="' + (y + 7) + '" font-size="19" text-anchor="middle" fill="#222" opacity="0">C' + show(0, 7) + '</text>';
        s += '<text x="' + x + '" y="' + (y + 7) + '" font-size="19" text-anchor="middle" fill="#222" opacity="0">X' + show(7, 10.99) + '</text>';
        s += '<text x="' + (x + 36) + '" y="' + (y + 6) + '" font-size="16" text-anchor="middle" fill="#777" opacity="0">0' + show(0, 7) + '</text>';
        s += '<text x="' + (x + 36) + '" y="' + (y + 6) + '" font-size="16" text-anchor="middle" fill="#1d6b2a" font-weight="700" opacity="0">1' + show(7, 10.99) + '</text>';
      } else {
        s += '<text x="' + x + '" y="' + (y + 7) + '" font-size="19" text-anchor="middle" fill="#222">' + p[0] + '</text>';
        var bx = x + (Math.cos(a) < -0.1 ? -36 : 36);
        if (p[0] === "B") {
          s += '<text x="' + bx + '" y="' + (y + 6) + '" font-size="16" text-anchor="middle" fill="#d6465f" font-weight="700" opacity="0">1' + show(0, 3) + '</text>';
          s += '<text x="' + bx + '" y="' + (y + 6) + '" font-size="16" text-anchor="middle" fill="#777" opacity="0">0' + show(3, 10.99) + '</text>';
        } else s += '<text x="' + bx + '" y="' + (y + 6) + '" font-size="16" text-anchor="middle" fill="#777">' + p[1] + '</text>';
      }
    });
    s += '<g><line x1="' + cx + '" y1="' + cy + '" x2="' + cx + '" y2="' + (cy - 84) + '" stroke="#d6465f" stroke-width="4"/><circle cx="' + cx + '" cy="' + cy + '" r="6" fill="#d6465f"/>';
    s += '<animateTransform attributeName="transform" type="rotate" values="45 ' + cx + ' ' + cy + ';45 ' + cx + ' ' + cy + ';90 ' + cx + ' ' + cy + ';90 ' + cx + ' ' + cy + ';135 ' + cx + ' ' + cy + ';135 ' + cx + ' ' + cy + '" keyTimes="0;' + r3(3.6 / D) + ';' + r3(4.5 / D) + ';' + r3(7.6 / D) + ';' + r3(8.4 / D) + ';1" dur="' + D + 's" fill="freeze"/></g>';
    s += '<g font-size="14"><rect x="520" y="130" width="220" height="100" rx="6" fill="#efe9f6" stroke="#3b2f4a"/><text x="630" y="158" text-anchor="middle" font-weight="700" fill="#3b2f4a">Use bit</text><text x="538" y="186" fill="#222">0 → Evict the page</text><text x="538" y="212" fill="#222">1 → Clear, advance hand</text></g>';
    s += '<text x="380" y="358" font-size="14" text-anchor="middle" fill="#777">HW 는 참조 때 bit 을 1 로, OS 는 교체 때 0 으로 — 최근에 안 쓴 page 를 근사로 고른다</text>';
    return s + '</svg>';
  }
};
