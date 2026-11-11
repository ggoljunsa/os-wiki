// dma_flow — 18강 p.15: DMA 전송 6단계. CPU 는 지시만 하고 복사는 DMA controller 가 한다.
window.ANIMS = window.ANIMS || {};
ANIMS["dma_flow"] = {
  title: "DMA 전송 6단계",
  desc: "[[PIO와 DMA]] p.15 그림. 디스크 데이터를 메모리 주소 X 의 buffer 로 옮긴다.",
  duration: 14,
  build: function () {
    var D = 14;
    function r3(v) { return Math.round(v * 1000) / 1000; }
    function show(a, b) { return '<animate attributeName="opacity" values="0;0;1;1;0;0" keyTimes="0;' + r3(a / D) + ';' + r3(a / D + 0.003) + ';' + r3(b / D) + ';' + r3(Math.min(0.999, b / D + 0.003)) + ';1" dur="' + D + 's" fill="freeze"/>'; }
    function box(x, y, w, h, t, fill, st) { return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="6" fill="' + fill + '" stroke="' + st + '"/><text x="' + (x + w / 2) + '" y="' + (y + h / 2 + 5) + '" font-size="14" text-anchor="middle" fill="#222">' + t + '</text>'; }
    function arrow(x1, y1, x2, y2, col, a, b) { return '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '" stroke="' + col + '" stroke-width="3" marker-end="url(#dmaf_arrow_' + (col === "#d6465f" ? "r" : "b") + ')" opacity="0">' + show(a, b) + '</line>'; }
    var s = '<svg viewBox="0 0 760 360" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="DMA 전송 여섯 단계">';
    s += '<defs><marker id="dmaf_arrow_b" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L10 5L0 10z" fill="#1d65b3"/></marker><marker id="dmaf_arrow_r" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L10 5L0 10z" fill="#d6465f"/></marker></defs>';
    [[0.5, 2.5, "1. device driver 가 디스크 데이터를 주소 X 로 옮기라는 지시를 받는다"], [2.5, 4.5, "2. driver 가 disk controller 에게 C bytes 를 X 로 보내라고 한다"], [4.5, 6, "3. disk controller 가 DMA 전송을 시작한다"], [6, 8, "4. disk controller 가 byte 를 DMA controller 로 보낸다"], [8, 11, "5. DMA 가 buffer X 로 옮긴다. 주소는 증가, C 는 감소"], [11, 13.98, "6. C = 0 이면 DMA 가 CPU 에 interrupt 를 건다"]].forEach(function (c) {
      s += '<text x="380" y="26" font-size="15" text-anchor="middle" font-weight="700" fill="#3b2f4a" opacity="0">' + c[2] + show(c[0], c[1]) + '</text>';
    });
    s += '<line x1="170" y1="95" x2="590" y2="95" stroke="#9cc4e8" stroke-width="10"/><text x="520" y="84" font-size="12" text-anchor="middle" fill="#555">memory bus</text>';
    s += '<line x1="380" y1="125" x2="380" y2="235" stroke="#9cc4e8" stroke-width="10"/><text x="396" y="185" font-size="12" fill="#555">PCI bus</text>';
    s += box(60, 65, 110, 60, "CPU", "#efe9f6", "#3b2f4a") + box(310, 65, 140, 60, "DMA controller", "#fdeec2", "#e09a40") + box(590, 55, 140, 80, "", "#dff3e4", "#2e9e4f") + box(310, 235, 140, 60, "disk controller", "#dbe8f7", "#1d65b3");
    s += '<text x="660" y="78" font-size="14" text-anchor="middle" fill="#222">memory</text><rect x="620" y="88" width="80" height="34" fill="#fff" stroke="#2e9e4f"/><text x="660" y="110" font-size="13" text-anchor="middle" fill="#222">buffer X</text>';
    s += '<text x="115" y="150" font-size="13" text-anchor="middle" fill="#1d6b2a" font-weight="700" opacity="0">task 2 실행 중' + show(4.5, 11) + '</text>';
    s += arrow(170, 110, 350, 235, "#1d65b3", 2.5, 4.5);
    s += '<rect x="310" y="235" width="140" height="60" rx="6" fill="none" stroke="#d6465f" stroke-width="3" opacity="0">' + show(4.5, 6) + '</rect>';
    [6.2, 7.2, 8.2, 9.2].forEach(function (b, i) {
      s += '<circle r="7" fill="#e09a40" stroke="#8a6000" opacity="0">' + show(b, b + 1.6) + '<animateMotion path="M380 235 L380 95 L660 105" begin="' + b + 's" dur="1.6s" fill="freeze"/></circle>';
      s += '<rect x="' + (624 + i * 18) + '" y="124" width="14" height="8" fill="#e09a40" opacity="0">' + show(b + 1.6, 13.99) + '</rect>';
    });
    var cs = [[4.5, 7.8, 4], [7.8, 8.8, 3], [8.8, 9.8, 2], [9.8, 10.8, 1], [10.8, 13.99, 0]];
    cs.forEach(function (c) { s += '<text x="380" y="330" font-size="20" text-anchor="middle" font-weight="700" fill="#3b2f4a" opacity="0">C = ' + c[2] + show(c[0], c[1]) + '</text>'; });
    s += arrow(310, 80, 172, 80, "#d6465f", 11, 13.99);
    s += '<text x="240" y="68" font-size="13" text-anchor="middle" fill="#d6465f" font-weight="700" opacity="0">interrupt' + show(11, 13.99) + '</text>';
    s += '<text x="170" y="330" font-size="14" text-anchor="middle" fill="#777">CPU 는 위치와 크기만 알려 준다</text>';
    return s + '</svg>';
  }
};
