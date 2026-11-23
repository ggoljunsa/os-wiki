// fs_access_path — 20강 p.19~23: open/read 와 create/write 때 디스크 I/O 를 한 번씩 (OSTEP 40장 Figure 40.3·40.4).
// 캐시가 비어 있다고 가정한다(슬라이드 표와 같은 조건).
(function (global) {
  "use strict";
  global.SIMS = global.SIMS || {};

  var COLS = ["data bitmap", "inode bitmap", "root inode", "foo inode", "bar inode", "root data", "foo data", "bar data[0]", "bar data[1]", "bar data[2]"];
  var C = { dbm: 0, ibm: 1, ri: 2, fi: 3, bi: 4, rd: 5, fd: 6, b0: 7, b1: 8, b2: 9 };

  // [호출 줄 번호, 칸, "read"|"write", 설명]
  var READ = [
    [1, "ri", "read", "root inode(2번) 읽기: root 데이터 블록 위치를 얻는다"],
    [1, "rd", "read", "root data 읽기: 엔트리 \"foo\" → foo 의 inode 번호"],
    [1, "fi", "read", "foo inode 읽기: foo 데이터 블록 위치"],
    [1, "fd", "read", "foo data 읽기: 엔트리 \"bar\" → bar 의 inode 번호"],
    [1, "bi", "read", "bar inode 읽기: 권한 확인, fd 할당. open 끝"],
    [2, "bi", "read", "read(): bar inode 에서 data[0] 의 블록 번호"],
    [2, "b0", "read", "bar data[0] 읽기"],
    [2, "bi", "write", "bar inode 쓰기: last-access time 갱신"],
    [3, "bi", "read", "두 번째 read(): inode 다시 읽기"],
    [3, "b1", "read", "bar data[1] 읽기"],
    [3, "bi", "write", "access time 갱신"],
    [4, "bi", "read", "세 번째 read(): inode 읽기"],
    [4, "b2", "read", "bar data[2] 읽기"],
    [4, "bi", "write", "access time 갱신"]
  ];
  var CREATE = [
    [1, "ri", "read", "root inode 읽기"],
    [1, "rd", "read", "root data 읽기: \"foo\" 찾기"],
    [1, "fi", "read", "foo inode 읽기"],
    [1, "fd", "read", "foo data 읽기: \"bar\" 가 없는지 확인"],
    [1, "ibm", "read", "inode bitmap 읽기: 빈 inode 찾기"],
    [1, "ibm", "write", "inode bitmap 쓰기: 그 inode 를 사용 중(1)으로"],
    [1, "fd", "write", "foo data 쓰기: 엔트리 (bar, inode #) 추가"],
    [1, "bi", "read", "bar inode 읽기"],
    [1, "bi", "write", "bar inode 쓰기: 초기화"],
    [1, "fi", "write", "foo inode 쓰기: 디렉터리 크기·시간 갱신. create 끝"],
    [2, "bi", "read", "write(): bar inode 읽기"],
    [2, "dbm", "read", "data bitmap 읽기: 빈 data block 찾기"],
    [2, "dbm", "write", "data bitmap 쓰기: 할당 표시"],
    [2, "b0", "write", "bar data[0] 쓰기: 실제 내용"],
    [2, "bi", "write", "bar inode 쓰기: 블록 포인터·크기 갱신"],
    [3, "bi", "read", "두 번째 write(): inode 읽기"],
    [3, "dbm", "read", "data bitmap 읽기"],
    [3, "dbm", "write", "data bitmap 쓰기"],
    [3, "b1", "write", "bar data[1] 쓰기"],
    [3, "bi", "write", "bar inode 쓰기"],
    [4, "bi", "read", "세 번째 write(): inode 읽기"],
    [4, "dbm", "read", "data bitmap 읽기"],
    [4, "dbm", "write", "data bitmap 쓰기"],
    [4, "b2", "write", "bar data[2] 쓰기"],
    [4, "bi", "write", "bar inode 쓰기"]
  ];

  function draw(rows, upto, calls) {
    var cw = 60, x0 = 74, top = 36, rh = 20;
    var nrow = upto + 1, H = top + 24 + Math.max(nrow, 14) * rh + 14;
    var s = '<svg viewBox="0 0 ' + (x0 + cw * COLS.length + 8) + ' ' + H + '" xmlns="http://www.w3.org/2000/svg">';
    for (var c = 0; c < COLS.length; c++) {
      var parts = COLS[c].split(" ");
      s += '<text x="' + (x0 + c * cw + cw / 2) + '" y="' + (top - 18) + '" font-size="12" text-anchor="middle" font-weight="700">' + parts[0] + '</text>';
      s += '<text x="' + (x0 + c * cw + cw / 2) + '" y="' + (top - 2) + '" font-size="12" text-anchor="middle" font-weight="700">' + (parts[1] || "") + '</text>';
    }
    s += '<line x1="4" y1="' + (top + 4) + '" x2="' + (x0 + cw * COLS.length) + '" y2="' + (top + 4) + '" stroke="#333"/>';
    var prevCall = 0;
    for (var i = 0; i <= upto; i++) {
      var r = rows[i], y = top + 18 + i * rh;
      if (r[0] !== prevCall) {
        if (i > 0) s += '<line x1="4" y1="' + (y - 14) + '" x2="' + (x0 + cw * COLS.length) + '" y2="' + (y - 14) + '" stroke="#bbb"/>';
        s += '<text x="6" y="' + y + '" font-size="13" font-weight="700">' + calls[r[0] - 1] + '</text>';
        prevCall = r[0];
      }
      var cx = x0 + C[r[1]] * cw + cw / 2, cur = i === upto;
      s += '<text x="' + cx + '" y="' + y + '" font-size="14" text-anchor="middle" fill="' + (r[2] === "write" ? "#d6465f" : "#1d65b3") + '" font-weight="' + (cur ? 700 : 400) + '">' + (cur ? "▶ " : "") + r[2] + '</text>';
    }
    s += '</svg>';
    return s;
  }

  SIMS["fs_access_path"] = {
    title: "파일 읽기·만들기의 디스크 I/O (20강 p.21·p.23)",
    desc: "캐시가 빈 상태에서 /foo/bar 를 열고 세 블록을 읽거나, 만들고 세 블록을 쓸 때 I/O 를 하나씩 센다.",
    options: [
      { key: "op", label: "동작", values: [
        { value: "read", label: "open + read() 3번 (p.21)" },
        { value: "create", label: "create + write() 3번 (p.23)" }
      ] }
    ],
    build: function (opts) {
      var isRead = (opts.op || "read") === "read";
      var rows = isRead ? READ : CREATE;
      var calls = isRead ? ["open", "read()", "read()", "read()"] : ["create", "write()", "write()", "write()"];
      var lines = isRead
        ? ['fd = open("/foo/bar", O_RDONLY);', "read(fd, buf, 4096);   // data[0]", "read(fd, buf, 4096);   // data[1]", "read(fd, buf, 4096);   // data[2]", "close(fd);"]
        : ['fd = open("/foo/bar", O_CREAT|O_WRONLY);', "write(fd, buf, 4096);  // data[0]", "write(fd, buf, 4096);  // data[1]", "write(fd, buf, 4096);  // data[2]", "close(fd);"];
      var panels = [{ id: "P", title: "프로세스", lang: "c", lines: lines }];
      var vars = [
        { name: "이번 I/O", group: "디스크" }, { name: "이 호출의 I/O", group: "디스크" },
        { name: "read 합계", group: "누적" }, { name: "write 합계", group: "누적" }, { name: "I/O 합계", group: "누적" }
      ];
      var steps = [], nr = 0, nw = 0, per = 0, prev = 0;
      steps.push({ desc: "캐시가 비어 있다. 디스크에서 무엇을 몇 번 읽고 쓰나", pc: { P: null },
        vars: { "이번 I/O": "-", "이 호출의 I/O": 0, "read 합계": 0, "write 합계": 0, "I/O 합계": 0 }, svg: draw(rows, -1, calls) });
      for (var i = 0; i < rows.length; i++) {
        var r = rows[i];
        if (r[0] !== prev) { per = 0; prev = r[0]; }
        per++;
        if (r[2] === "read") nr++; else nw++;
        steps.push({ desc: r[3], pc: { P: r[0] },
          vars: { "이번 I/O": r[2] + " " + COLS[C[r[1]]], "이 호출의 I/O": per, "read 합계": nr, "write 합계": nw, "I/O 합계": nr + nw },
          svg: draw(rows, i, calls) });
      }
      steps.push({ desc: "close(): 이 예에서는 디스크 I/O 없음. 총 " + (nr + nw) + "번", pc: { P: 5 },
        vars: { "이번 I/O": "없음", "이 호출의 I/O": 0, "read 합계": nr, "write 합계": nw, "I/O 합계": nr + nw },
        svg: draw(rows, rows.length - 1, calls),
        note: isRead ? "open 5 + read() 마다 3 → 5 + 3×3 = 14" : "create 10 + write() 마다 5 → 10 + 5×3 = 25" });
      return { panels: panels, vars: vars, steps: steps };
    }
  };
})(typeof window !== "undefined" ? window : globalThis);
