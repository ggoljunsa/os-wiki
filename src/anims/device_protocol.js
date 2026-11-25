// device_protocol — 18강 p.6~9: canonical device 의 세 레지스터(status·command·data)로 요청 하나를 보내는 과정.
//   p.9 코드 네 줄: ① while(STATUS==BUSY) polling → ② data 레지스터에 쓰기(PIO) → ③ command 레지스터에 쓰기 → ④ 다시 polling
window.ANIMS = window.ANIMS || {};
ANIMS["device_protocol"] = {
  title: "장치에 요청 하나 보내기: status · data · command 레지스터",
  desc: "[[canonical device]] p.9 의 네 줄을 그대로 돌린다. CPU 가 status 를 반복해 읽고(polling), data 와 command 를 직접 써 넣는다(PIO).",
  duration: 13,
  build: function () {
    var D = 13;
    function r3(v) { return Math.round(v * 1000) / 1000; }
    function k(t) { return r3(Math.min(Math.max(t / D, 0), 0.996)); }
    function show(a, b) { return '<animate attributeName="opacity" values="0;0;1;1;0;0" keyTimes="0;' + k(a) + ';' + r3(k(a) + 0.003) + ';' + k(b) + ';' + r3(k(b) + 0.003) + ';1" dur="' + D + 's" fill="freeze"/>'; }
    function txt(x, y, s, size, fill, extra) { return '<text x="' + x + '" y="' + y + '" font-size="' + size + '" fill="' + fill + '"' + (extra && extra.indexOf('text-anchor') >= 0 ? '' : ' text-anchor="middle"') + (extra || '') + '>' + s + '</text>'; }
    function box(x, y, w, h, fill, stroke, rx) { return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="' + (rx === undefined ? 8 : rx) + '" fill="' + fill + '" stroke="' + stroke + '" stroke-width="2"/>'; }
    // 시간 [a,b) 에 보이는 조각
    function win(a, b, inner) { return '<g opacity="0">' + inner + show(a, b) + '</g>'; }
    // 왼쪽(CPU)에서 오른쪽(레지스터)으로, 또는 반대로 가는 작은 꼬리표
    function packet(x1, y1, x2, y2, t0, dt, label, color) {
      return '<g opacity="0"><rect x="-34" y="-11" width="68" height="22" rx="5" fill="' + color + '"/>' +
        txt(0, 5, label, 12, "#fff", ' font-weight="700"') +
        '<animateMotion begin="' + t0 + 's" dur="' + dt + 's" fill="freeze" path="M' + x1 + ',' + y1 + ' L' + x2 + ',' + y2 + '"/>' + show(t0, t0 + dt) + '</g>';
    }
    var C = { cpu: "#3b2f4a", cpuL: "#efe9f6", dev: "#1d65b3", devL: "#dbe8f7", hw: "#d6465f", ok: "#2e9e4f", os: "#e09a40", muted: "#777" };
    var s = '<svg viewBox="0 0 760 360" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="장치 레지스터 프로토콜 애니메이션">';
    s += '<defs><marker id="dp_arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#555"/></marker></defs>';

    var caps = [
      [0, 1.5, "장치는 앞의 요청을 처리하는 중이다. status = BUSY"],
      [1.5, 4, "① while (STATUS == BUSY) : CPU 가 status 를 읽고 또 읽는다 (polling)"],
      [4, 5.8, "② data 레지스터에 데이터를 쓴다. CPU 가 직접 옮긴다 (PIO)"],
      [5.8, 7.4, "③ command 레지스터에 명령을 쓴다. 이 순간 장치가 일을 시작한다"],
      [7.4, 11, "④ 다시 polling: 내 요청이 끝날 때까지 status 를 읽는다"],
      [11, 12.99, "status = READY. 요청 하나가 끝났다"]
    ];
    caps.forEach(function (c) { s += win(c[0], c[1], txt(380, 26, c[2], 15, "#222", ' font-weight="700"')); });

    // ---- CPU + 코드 (왼쪽) ----
    s += box(20, 52, 300, 250, C.cpuL, C.cpu);
    s += txt(170, 76, "OS (CPU 에서 실행)", 15, C.cpu, ' font-weight="700"');
    var code = [
      ["while (STATUS == BUSY) ;", 1.5, 4],
      ["write data to DATA", 4, 5.8],
      ["write cmd to COMMAND", 5.8, 7.4],
      ["while (STATUS == BUSY) ;", 7.4, 11]
    ];
    code.forEach(function (c, i) {
      var y = 104 + i * 44;
      s += '<rect x="34" y="' + (y - 20) + '" width="272" height="32" rx="5" fill="#fdeec2" opacity="0">' + show(c[1], c[2]) + '</rect>';
      s += txt(52, y + 1, (i + 1) + "", 14, C.muted, ' text-anchor="start"');
      s += '<text x="72" y="' + (y + 1) + '" font-size="14" fill="#222" font-family="monospace">' + c[0] + '</text>';
    });
    s += txt(170, 286, "1·4줄 = polling, 2줄 = PIO", 13, C.muted);

    // ---- 장치 (오른쪽) ----
    s += box(430, 52, 310, 250, C.devL, C.dev);
    s += txt(585, 76, "Canonical Device", 15, C.dev, ' font-weight="700"');
    s += txt(585, 98, "Interface (OS 가 보는 부분)", 12, C.muted);
    var regs = [["Status", 446], ["Command", 546], ["Data", 646]];
    regs.forEach(function (r) { s += box(r[1], 108, 82, 62, "#fff", C.dev, 6) + txt(r[1] + 41, 126, r[0], 13, C.dev, ' font-weight="700"'); });
    // status 값: BUSY(0~2.95) → READY(2.95~6.6) → BUSY(6.6~10.2) → READY
    s += win(0, 2.95, txt(487, 154, "BUSY", 14, C.hw, ' font-weight="700"'));
    s += win(2.95, 6.6, txt(487, 154, "READY", 14, C.ok, ' font-weight="700"'));
    s += win(6.6, 10.2, txt(487, 154, "BUSY", 14, C.hw, ' font-weight="700"'));
    s += '<g opacity="0">' + txt(487, 154, "READY", 14, C.ok, ' font-weight="700"') + '<animate attributeName="opacity" values="0;0;1;1" keyTimes="0;' + k(10.2) + ';' + r3(k(10.2) + 0.003) + ';1" dur="' + D + 's" fill="freeze"/></g>';
    // command / data 값
    s += '<g opacity="0">' + txt(587, 154, "WRITE", 14, C.cpu, ' font-weight="700"') + '<animate attributeName="opacity" values="0;0;1;1" keyTimes="0;' + k(6.9) + ';' + r3(k(6.9) + 0.003) + ';1" dur="' + D + 's" fill="freeze"/></g>';
    s += '<g opacity="0">' + txt(687, 154, "데이터", 14, C.cpu, ' font-weight="700"') + '<animate attributeName="opacity" values="0;0;1;1" keyTimes="0;' + k(5.3) + ';' + r3(k(5.3) + 0.003) + ';1" dur="' + D + 's" fill="freeze"/></g>';
    // internals
    s += '<line x1="446" y1="186" x2="728" y2="186" stroke="#9bb3d6" stroke-dasharray="5 4"/>';
    s += txt(585, 206, "Internals (장치마다 다름)", 12, C.muted);
    s += box(446, 216, 282, 70, "#fff", "#9bb3d6", 6);
    s += txt(587, 240, "micro-controller + DRAM/SRAM", 13, "#444");
    s += win(0, 2.95, txt(587, 268, "앞 요청 처리 중…", 13, C.hw, ' font-weight="700"'));
    s += win(2.95, 6.6, txt(587, 268, "쉬는 중", 13, C.ok, ' font-weight="700"'));
    s += win(6.6, 10.2, txt(587, 268, "내 요청 실행 중…", 13, C.hw, ' font-weight="700"'));
    s += '<g opacity="0">' + txt(587, 268, "끝", 13, C.ok, ' font-weight="700"') + '<animate attributeName="opacity" values="0;0;1;1" keyTimes="0;' + k(10.2) + ';' + r3(k(10.2) + 0.003) + ';1" dur="' + D + 's" fill="freeze"/></g>';
    // 진행 표시 점(장치가 바쁠 때 도는 점)
    s += '<circle r="5" fill="' + C.hw + '" opacity="0"><animateMotion begin="0s" dur="1.1s" repeatCount="3" path="M470,280 L705,280"/>' + show(0, 2.95) + '</circle>';
    s += '<circle r="5" fill="' + C.hw + '" opacity="0"><animateMotion begin="6.6s" dur="1s" repeatCount="4" path="M470,280 L705,280"/>' + show(6.6, 10.2) + '</circle>';

    // ---- 버스 화살표 ----
    s += '<line x1="322" y1="139" x2="428" y2="139" stroke="#bbb" stroke-width="2"/>';
    s += txt(375, 132, "bus", 12, C.muted);
    // polling: status 를 읽으러 갔다가 값을 들고 돌아옴 (①: 3번, ④: 4번)
    [1.6, 2.2, 2.8].forEach(function (t, i) {
      s += packet(360, 160, 470, 190, t, 0.3, "read", C.os);
      s += packet(470, 190, 360, 160, t + 0.3, 0.3, i < 2 ? "BUSY" : "READY", i < 2 ? C.hw : C.ok);
    });
    [7.5, 8.3, 9.1, 9.9].forEach(function (t, i) {
      s += packet(360, 160, 470, 190, t, 0.35, "read", C.os);
      s += packet(470, 190, 360, 160, t + 0.35, 0.35, i < 3 ? "BUSY" : "READY", i < 3 ? C.hw : C.ok);
    });
    // ② data, ③ command
    s += packet(300, 210, 687, 190, 4.3, 1.0, "data", C.cpu);
    s += packet(300, 230, 587, 190, 6.0, 0.9, "cmd", C.cpu);
    // CPU 가 바쁘게 기다린다는 표시
    s += win(1.5, 3.4, txt(170, 318, "CPU 는 이 동안 다른 일을 못 한다", 13, C.hw, ' font-weight="700"'));
    s += win(7.4, 10.8, txt(170, 318, "CPU 는 이 동안 다른 일을 못 한다", 13, C.hw, ' font-weight="700"'));

    s += txt(380, 348, "OS 는 세 레지스터를 읽고 쓰는 것만으로 장치를 다룬다. 안쪽 구조는 몰라도 된다", 13, C.muted);
    return s + '</svg>';
  }
};
