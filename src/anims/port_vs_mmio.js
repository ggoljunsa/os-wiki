// port_vs_mmio — 18강 p.16~18: 장치 레지스터를 부르는 두 방법.
//   왼쪽 Port-mapped I/O: outb(0x1f2, reg) 가 메모리와 따로인 port 번호로 간다.
//   오른쪽 Memory-mapped I/O: 같은 mov(store) 라도 주소가 I/O 범위면 하드웨어가 메인 메모리 대신 장치로 보낸다.
window.ANIMS = window.ANIMS || {};
ANIMS["port_vs_mmio"] = {
  title: "Port-mapped I/O 와 Memory-mapped I/O: 장치 레지스터를 부르는 두 방법",
  desc: "[[memory-mapped I/O]] p.17~18. 왼쪽은 전용 명령 + port 번호, 오른쪽은 보통의 store + 장치에 배정된 주소 구간.",
  duration: 12,
  build: function () {
    var D = 12;
    function r3(v) { return Math.round(v * 1000) / 1000; }
    function k(t) { return r3(Math.min(Math.max(t / D, 0), 0.996)); }
    function show(a, b) { return '<animate attributeName="opacity" values="0;0;1;1;0;0" keyTimes="0;' + k(a) + ';' + r3(k(a) + 0.003) + ';' + k(b) + ';' + r3(k(b) + 0.003) + ';1" dur="' + D + 's" fill="freeze"/>'; }
    function from(a) { return '<animate attributeName="opacity" values="0;0;1;1" keyTimes="0;' + k(a) + ';' + r3(k(a) + 0.003) + ';1" dur="' + D + 's" fill="freeze"/>'; }
    function txt(x, y, s, size, fill, extra) { return '<text x="' + x + '" y="' + y + '" font-size="' + size + '" fill="' + fill + '"' + (extra && extra.indexOf('text-anchor') >= 0 ? '' : ' text-anchor="middle"') + (extra || '') + '>' + s + '</text>'; }
    function box(x, y, w, h, fill, stroke, rx) { return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="' + (rx === undefined ? 8 : rx) + '" fill="' + fill + '" stroke="' + stroke + '" stroke-width="2"/>'; }
    function win(a, b, inner) { return '<g opacity="0">' + inner + show(a, b) + '</g>'; }
    function packet(path, t0, dt, label, color) {
      return '<g opacity="0"><rect x="-30" y="-11" width="60" height="22" rx="5" fill="' + color + '"/>' + txt(0, 5, label, 12, "#fff", ' font-weight="700"') +
        '<animateMotion begin="' + t0 + 's" dur="' + dt + 's" fill="freeze" path="' + path + '"/>' + show(t0, t0 + dt + 0.25) + '</g>';
    }
    var C = { cpu: "#3b2f4a", cpuL: "#efe9f6", mem: "#2e9e4f", memL: "#dff3e4", dev: "#1d65b3", devL: "#dbe8f7", hw: "#d6465f", io: "#e09a40", ioL: "#fdeec2", muted: "#777" };
    var s = '<svg viewBox="0 0 760 370" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="port-mapped I/O 와 memory-mapped I/O 비교">';
    var caps = [
      [0, 1.2, "같은 일을 두 방법으로: 장치 레지스터에 값 하나 쓰기"],
      [1.2, 4.6, "Port-mapped: 전용 명령 out 이 port 번호 0x1f2 로 장치를 부른다"],
      [4.6, 5.8, "in/out 같은 I/O 명령은 보통 privileged 라 OS 만 쓴다"],
      [5.8, 8.4, "Memory-mapped: 보통 주소에 store(mov) 하면 메인 메모리로 간다"],
      [8.4, 11, "같은 store 라도 주소가 I/O 범위면 하드웨어가 장치로 보낸다"],
      [11, 11.99, "Port-mapped 는 “Unlike Memory”, Memory-mapped 는 “Like Memory”"]
    ];
    caps.forEach(function (c) { s += win(c[0], c[1], txt(380, 26, c[2], 15, "#222", ' font-weight="700"')); });
    s += '<line x1="380" y1="44" x2="380" y2="330" stroke="#ccc" stroke-dasharray="4 4"/>';

    // ===== 왼쪽: Port-mapped =====
    s += txt(190, 58, "Port-mapped I/O (I/O instruction)", 14, C.io, ' font-weight="700"');
    s += box(30, 70, 320, 52, C.cpuL, C.cpu);
    s += txt(66, 101, "CPU", 14, C.cpu, ' font-weight="700"');
    s += '<rect x="100" y="80" width="236" height="32" rx="5" fill="#fdeec2" opacity="0">' + show(1.2, 5.8) + '</rect>';
    s += '<text x="112" y="101" font-size="14" fill="#222" font-family="monospace">outb(0x1f2, reg)</text>';
    // 메모리 (왼쪽 아래)
    s += box(30, 200, 130, 110, C.memL, C.mem);
    s += txt(95, 228, "Memory", 14, C.mem, ' font-weight="700"');
    s += txt(95, 256, "주소 공간", 12, C.muted);
    s += txt(95, 276, "이번엔 안 씀", 12, C.muted);
    // I/O port 공간 + 장치
    s += box(200, 160, 150, 150, C.ioL, C.io);
    s += txt(275, 182, "I/O port 공간", 13, C.io, ' font-weight="700"');
    ["0x1f0", "0x1f1", "0x1f2", "0x1f3"].forEach(function (p, i) {
      var y = 194 + i * 26;
      s += '<rect x="216" y="' + y + '" width="118" height="22" rx="4" fill="#fff" stroke="#d9b37a"/>';
      s += '<text x="226" y="' + (y + 16) + '" font-size="12" fill="#444" font-family="monospace">' + p + '</text>';
    });
    s += '<rect x="216" y="246" width="118" height="22" rx="4" fill="none" stroke="' + C.hw + '" stroke-width="3" opacity="0">' + from(2.9) + '</rect>';
    s += '<g opacity="0">' + txt(275, 330, "디스크 레지스터에 기록", 12, C.dev, ' font-weight="700"') + from(3.6) + '</g>';
    s += packet("M218,122 L240,258", 1.6, 1.2, "out", C.io);
    s += win(4.6, 11.99, '<rect x="30" y="128" width="160" height="26" rx="5" fill="#ffd9d9"/>' + txt(110, 146, "privileged 명령", 13, "#a52f2f", ' font-weight="700"'));

    // ===== 오른쪽: Memory-mapped =====
    s += txt(570, 58, "Memory-mapped I/O", 14, C.dev, ' font-weight="700"');
    s += box(400, 70, 340, 52, C.cpuL, C.cpu);
    s += txt(436, 101, "CPU", 14, C.cpu, ' font-weight="700"');
    s += '<rect x="468" y="78" width="262" height="18" rx="4" fill="#fdeec2" opacity="0">' + show(5.8, 8.4) + '</rect>';
    s += '<rect x="468" y="96" width="262" height="18" rx="4" fill="#fdeec2" opacity="0">' + show(8.4, 11) + '</rect>';
    s += '<text x="476" y="92" font-size="13" fill="#222" font-family="monospace">mov [보통 주소], reg</text>';
    s += '<text x="476" y="110" font-size="13" fill="#222" font-family="monospace">mov [I/O 범위 주소], reg</text>';
    // 주소 공간 막대
    s += txt(470, 150, "Memory Space", 12, C.muted);
    s += '<rect x="430" y="160" width="80" height="150" fill="' + C.memL + '" stroke="#555"/>';
    s += '<rect x="430" y="270" width="80" height="40" fill="' + C.devL + '" stroke="#555"/>';
    s += txt(470, 294, "I/O", 13, C.dev, ' font-weight="700"');
    s += '<text x="425" y="170" font-size="11" fill="#777" text-anchor="end" font-family="monospace">0x00000</text>';
    s += '<text x="425" y="312" font-size="11" fill="#777" text-anchor="end" font-family="monospace">0xFFFFF</text>';
    // RAM, 장치
    s += box(590, 150, 150, 70, C.memL, C.mem);
    s += txt(665, 180, "Main memory", 13, C.mem, ' font-weight="700"');
    s += '<g opacity="0">' + txt(665, 204, "값 저장됨", 12, C.mem) + from(7.6) + '</g>';
    s += box(590, 250, 150, 70, C.devL, C.dev);
    s += txt(665, 278, "I/O 장치 레지스터", 13, C.dev, ' font-weight="700"');
    s += '<g opacity="0">' + txt(665, 302, "값이 장치로", 12, C.dev, ' font-weight="700"') + from(10.3) + '</g>';
    // 주소 공간 → 대상 선
    s += '<line x1="510" y1="200" x2="588" y2="185" stroke="#bbb" stroke-width="2"/>';
    s += '<line x1="510" y1="290" x2="588" y2="285" stroke="#bbb" stroke-width="2"/>';
    s += '<rect x="430" y="190" width="80" height="20" fill="none" stroke="' + C.hw + '" stroke-width="3" opacity="0">' + show(6.4, 8.4) + '</rect>';
    s += '<rect x="430" y="280" width="80" height="20" fill="none" stroke="' + C.hw + '" stroke-width="3" opacity="0">' + show(9.0, 11.99) + '</rect>';
    s += packet("M560,122 L470,200 L660,185", 6.0, 1.6, "store", C.cpu);
    s += packet("M560,122 L470,290 L660,285", 8.6, 1.6, "store", C.cpu);
    s += win(8.9, 11.99, txt(560, 250, "HW 가 장치로 보냄", 12, C.hw, ' font-weight="700"'));

    s += txt(380, 356, "Port-mapped 는 새 명령(in/out)이 필요하고, Memory-mapped 는 load/store 를 그대로 쓴다", 13, C.muted);
    return s + '</svg>';
  }
};
