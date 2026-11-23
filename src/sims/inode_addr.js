// inode_addr — 20강 p.9: inode 번호 → inode table 안 위치 → 디스크 주소 → sector 번호.
// vsfs 가정(p.5·p.9): block 4 KB, sector 512 B, inode 256 B, inode table = block 3~7 (inodeStartAddr 12 KB), inode 80개.
(function (global) {
  "use strict";
  global.SIMS = global.SIMS || {};

  var INODE = 256, BLOCK = 4096, SECTOR = 512, START = 12288;
  var SETS = {
    slide: { inum: 32, label: "p.9 inode 32" },
    i0: { inum: 0, label: "inode 0" },
    i17: { inum: 17, label: "inode 17" },
    i79: { inum: 79, label: "inode 79 (마지막)" }
  };

  function kb(x) { return x % 1024 === 0 ? (x / 1024) + "KB" : String(x); }

  function draw(inum, stage) {
    var s = '<svg viewBox="0 0 700 230" xmlns="http://www.w3.org/2000/svg">';
    var x0 = 20, bw = 82, y = 60, h = 96;
    var names = ["Super", "i-bmap", "d-bmap"];
    for (var b = 0; b < 8; b++) {
      var x = x0 + b * bw;
      if (b < 3) {
        s += '<rect x="' + x + '" y="' + y + '" width="' + bw + '" height="' + h + '" fill="' + (b === 0 ? "#fff" : "#555") + '" stroke="#333"/>';
        s += '<text x="' + (x + bw / 2) + '" y="' + (y + 52) + '" font-size="13" text-anchor="middle" fill="' + (b === 0 ? "#222" : "#fff") + '">' + names[b] + '</text>';
      } else {
        var ib = b - 3, hit = stage >= 4 && Math.floor(inum / 16) === ib;
        s += '<text x="' + (x + bw / 2) + '" y="' + (y - 8) + '" font-size="12" text-anchor="middle" fill="' + (hit ? "#d6465f" : "#555") + '" font-weight="' + (hit ? 700 : 400) + '">iblock ' + ib + '</text>';
        for (var k = 0; k < 16; k++) {
          var n = ib * 16 + k, cx = x + (k % 4) * (bw / 4), cy = y + Math.floor(k / 4) * (h / 4);
          var me = n === inum && stage >= 1;
          var sameSector = stage >= 3 && Math.floor(n / 2) === Math.floor(inum / 2);
          s += '<rect x="' + cx + '" y="' + cy + '" width="' + (bw / 4) + '" height="' + (h / 4) + '" fill="' + (me ? "#e09a40" : sameSector ? "#fdeec2" : "#fff") + '" stroke="' + (sameSector ? "#1d65b3" : "#999") + '" stroke-width="' + (sameSector ? 1.6 : 0.6) + '"/>';
          s += '<text x="' + (cx + bw / 8) + '" y="' + (cy + 17) + '" font-size="12" text-anchor="middle">' + n + '</text>';
        }
      }
      s += '<text x="' + x + '" y="' + (y + h + 18) + '" font-size="11" text-anchor="middle" fill="#555">' + (b * 4) + 'KB</text>';
    }
    s += '<text x="' + (x0 + 8 * bw) + '" y="' + (y + h + 18) + '" font-size="11" text-anchor="middle" fill="#555">32KB</text>';
    var addr = START + inum * INODE;
    if (stage >= 2) {
      var ax = x0 + (addr / BLOCK) * bw;
      s += '<line x1="' + ax + '" y1="' + (y + h + 26) + '" x2="' + ax + '" y2="' + (y + h + 4) + '" stroke="#d6465f" stroke-width="2"/>';
      s += '<text x="' + ax + '" y="' + (y + h + 42) + '" font-size="14" text-anchor="middle" fill="#d6465f" font-weight="700">주소 ' + addr + ' (' + kb(addr) + ')</text>';
    }
    if (stage >= 3) {
      s += '<text x="20" y="24" font-size="15" fill="#1d65b3" font-weight="700">파란 테두리 = sector ' + (addr / SECTOR) + ' (512 B = inode 2개)</text>';
    } else {
      s += '<text x="20" y="24" font-size="15" fill="#3b2f4a" font-weight="700">vsfs: block 4 KB · inode 256 B · inode table = block 3~7</text>';
    }
    s += '</svg>';
    return s;
  }

  SIMS["inode_addr"] = {
    title: "inode 번호로 디스크 위치 찾기 (20강 p.9)",
    desc: "inode 번호 하나로 inode table 안 위치, 바이트 주소, sector 번호를 차례로 계산한다.",
    options: [
      { key: "set", label: "inode 번호", values: Object.keys(SETS).map(function (k) { return { value: k, label: SETS[k].label }; }) }
    ],
    build: function (opts) {
      var inum = SETS[opts.set || "slide"].inum;
      var region = inum * INODE, addr = START + region, sector = addr / SECTOR, blk = Math.floor(addr / BLOCK);
      var panels = [{ id: "calc", title: "계산", lang: "c", lines: [
        "inodeRegion = inum * sizeof(inode);",
        "addr = inodeStartAddr + inodeRegion;",
        "sector = addr / sectorSize;",
        "blk = addr / blockSize;",
        "slot = inum % (blockSize / sizeof(inode));"
      ] }];
      var vars = [
        { name: "inum", group: "입력" }, { name: "sizeof(inode)", group: "입력" }, { name: "inodeStartAddr", group: "입력" },
        { name: "inodeRegion", group: "계산" }, { name: "addr", group: "계산" }, { name: "sector", group: "계산" },
        { name: "blk", group: "계산" }, { name: "slot", group: "계산" }
      ];
      var v = { inum: inum, "sizeof(inode)": 256, inodeStartAddr: "12288 (12KB)", inodeRegion: "?", addr: "?", sector: "?", blk: "?", slot: "?" };
      function snap(o) { var r = {}; for (var k in v) r[k] = v[k]; for (var k2 in o) { r[k2] = o[k2]; v[k2] = o[k2]; } return r; }
      var steps = [];
      steps.push({ desc: "inode " + inum + " 을 찾는다. 주어진 값은 크기와 시작 주소뿐", pc: { calc: null }, vars: snap({}), svg: draw(inum, 0) });
      steps.push({ desc: inum + " × 256 = " + region + ": table 안에서의 바이트 위치", pc: { calc: 1 }, vars: snap({ inodeRegion: region }), svg: draw(inum, 1) });
      steps.push({ desc: "12288 + " + region + " = " + addr + " (" + kb(addr) + ")", pc: { calc: 2 }, vars: snap({ addr: addr + " (" + kb(addr) + ")" }), svg: draw(inum, 2) });
      steps.push({ desc: addr + " / 512 = sector " + sector + ". 디스크는 sector 단위로 읽는다", pc: { calc: 3 }, vars: snap({ sector: sector }), svg: draw(inum, 3) });
      steps.push({ desc: addr + " / 4096 = block " + blk + " = iblock " + (blk - 3), pc: { calc: 4 }, vars: snap({ blk: blk + " (iblock " + (blk - 3) + ")" }), svg: draw(inum, 4) });
      steps.push({ desc: inum + " % 16 = " + (inum % 16) + ": 그 block 안 " + (inum % 16) + "번째 inode", pc: { calc: 5 }, vars: snap({ slot: inum % 16 }), svg: draw(inum, 5),
        note: inum === 32 ? "슬라이드 답: 8192, 20KB, sector 40" : null });
      return { panels: panels, vars: vars, steps: steps };
    }
  };
})(typeof window !== "undefined" ? window : globalThis);
