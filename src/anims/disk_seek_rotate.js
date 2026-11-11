// disk_seek_rotate — 18강 p.26~28: 파란 sector 다음에 빨간 sector 를 읽는다. seek → rotational latency → transfer.
window.ANIMS = window.ANIMS || {};
ANIMS["disk_seek_rotate"] = {
  title: "디스크 접근 한 번: seek, rotational latency, transfer",
  desc: "[[디스크 접근 시간]] p.26. 안쪽 track 의 파란 sector 를 읽은 뒤 바깥쪽 track 의 빨간 sector 를 읽는다.",
  duration: 12,
  build: function () {
    var D = 12, cx = 210, cy = 215;
    function r3(v) { return Math.round(v * 1000) / 1000; }
    function show(a, b) { return '<animate attributeName="opacity" values="0;0;1;1;0;0" keyTimes="0;' + r3(a / D) + ';' + r3(a / D + 0.003) + ';' + r3(b / D) + ';' + r3(Math.min(0.999, b / D + 0.003)) + ';1" dur="' + D + 's" fill="freeze"/>'; }
    function pt(r, deg) { var a = deg * Math.PI / 180; return r3(cx + r * Math.cos(a)) + ' ' + r3(cy + r * Math.sin(a)); }
    function sector(r1, r2, mid, half, fill) {
      return '<path d="M' + pt(r1, mid - half) + ' L' + pt(r2, mid - half) + ' A' + r2 + ' ' + r2 + ' 0 0 1 ' + pt(r2, mid + half) + ' L' + pt(r1, mid + half) + ' A' + r1 + ' ' + r1 + ' 0 0 0 ' + pt(r1, mid - half) + ' Z" fill="' + fill + '" stroke="#333"/>';
    }
    var s = '<svg viewBox="0 0 760 380" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="디스크 접근 세 단계">';
    [[0, 1.5, "파란 sector 읽기 끝. 다음 요청은 바깥 track 의 빨간 sector"], [1.5, 4, "Seek: head 를 빨간 sector 의 track 으로 옮긴다"], [4, 8.55, "Rotational latency: head 는 멈춰 있고 sector 가 올 때까지 기다린다"], [8.55, 9.75, "Transfer: sector 가 head 아래를 지나는 동안 읽는다"], [9.75, 11.99, "Taccess = seek + rotation + transfer"]].forEach(function (c) {
      s += '<text x="380" y="26" font-size="15" text-anchor="middle" font-weight="700" fill="#3b2f4a" opacity="0">' + c[2] + show(c[0], c[1]) + '</text>';
    });
    s += '<g><animateTransform attributeName="transform" type="rotate" values="0 ' + cx + ' ' + cy + ';0 ' + cx + ' ' + cy + ';-200 ' + cx + ' ' + cy + ';-200 ' + cx + ' ' + cy + '" keyTimes="0;0.125;' + r3(10 / D) + ';1" dur="' + D + 's" fill="freeze"/>';
    s += '<circle cx="' + cx + '" cy="' + cy + '" r="135" fill="#f4f4f4" stroke="#555"/>';
    [112, 90, 67, 45].forEach(function (r) { s += '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="none" stroke="#aaa"/>'; });
    for (var i = 0; i < 12; i++) {
      var d = i * 30 + 15;
      s += '<line x1="' + pt(45, d).replace(" ", '" y1="') + '" x2="' + pt(135, d).replace(" ", '" y2="') + '" stroke="#ccc"/>';
    }
    s += sector(45, 67, 0, 14, "#1d65b3") + sector(112, 135, 180, 14, "#d6465f");
    s += '</g><circle cx="' + cx + '" cy="' + cy + '" r="18" fill="#fff" stroke="#555"/><text x="' + cx + '" y="' + (cy + 4) + '" font-size="11" text-anchor="middle" fill="#555">spindle</text>';
    s += '<g><animateTransform attributeName="transform" type="translate" values="0 0;0 0;67 0;67 0" keyTimes="0;0.125;' + r3(4 / D) + ';1" dur="' + D + 's" fill="freeze"/>';
    s += '<rect x="282" y="' + (cy - 4) + '" width="180" height="8" fill="#3b2f4a"/><path d="M266 ' + cy + ' L284 ' + (cy - 10) + ' L284 ' + (cy + 10) + ' Z" fill="#3b2f4a"/><text x="375" y="' + (cy - 12) + '" font-size="12" text-anchor="middle" fill="#3b2f4a">arm + head</text></g>';
    var bars = [["Seek", 9, 1.5, 4, "#1d65b3"], ["Rotation", 4, 4, 8.55, "#e09a40"], ["Transfer", 0.02, 8.55, 9.75, "#d6465f"]];
    bars.forEach(function (b, i) {
      var y = 120 + i * 62, w = Math.max(1.5, b[1] * 20);
      s += '<rect x="536" y="' + (y - 22) + '" width="214" height="54" rx="6" fill="#efe9f6" opacity="0">' + show(b[2], b[3]) + '</rect>';
      s += '<text x="546" y="' + (y - 4) + '" font-size="14" fill="#222">' + b[0] + ' ' + b[1] + ' ms</text>';
      s += '<rect x="546" y="' + (y + 6) + '" width="' + w + '" height="12" fill="' + b[4] + '"/>';
    });
    s += '<text x="546" y="310" font-size="13" fill="#555">p.28 예: 합계 13.02 ms</text>';
    s += '<text x="380" y="372" font-size="14" text-anchor="middle" fill="#777">막대는 실제 비율이다. 접근 시간은 seek 과 rotation 이 거의 전부다</text>';
    return s + '</svg>';
  }
};
