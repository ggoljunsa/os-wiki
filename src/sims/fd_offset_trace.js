// fd_offset_trace — 19강 p.20~23: open / read / write / lseek / close 에서 fd 표와 current offset 이 어떻게 바뀌나.
(function (global) {
  "use strict";
  global.SIMS = global.SIMS || {};

  // 각 줄: [코드, 동작]. 동작 = {op, ...}
  var SC = {
    strace_cat: {
      title: "p.20 strace cat foo",
      files: { foo: "hello\n" },
      lines: [
        ['open("foo", O_RDONLY)', { op: "open", f: "foo" }],
        ["read(3, buf, 4096)", { op: "read", fd: 3, n: 4096 }],
        ["write(1, buf, 6)", { op: "write", fd: 1, n: 6 }],
        ["read(3, buf, 4096)", { op: "read", fd: 3, n: 4096 }],
        ["close(3)", { op: "close", fd: 3 }]
      ]
    },
    lowest_fd: {
      title: "lowest unused 규칙",
      files: { a: "", b: "", c: "", d: "", e: "" },
      lines: [
        ['open("a", O_RDONLY)', { op: "open", f: "a" }],
        ['open("b", O_RDONLY)', { op: "open", f: "b" }],
        ['open("c", O_RDONLY)', { op: "open", f: "c" }],
        ["close(4)", { op: "close", fd: 4 }],
        ['open("d", O_RDONLY)', { op: "open", f: "d" }],
        ["close(0)", { op: "close", fd: 0 }],
        ['open("e", O_RDONLY)', { op: "open", f: "e" }]
      ]
    },
    lseek: {
      title: "p.22~23 offset 과 lseek",
      files: { foo: "0123456789" },
      lines: [
        ['open("foo", O_RDWR)', { op: "open", f: "foo" }],
        ["read(3, buf, 4)", { op: "read", fd: 3, n: 4 }],
        ["read(3, buf, 4)", { op: "read", fd: 3, n: 4 }],
        ["read(3, buf, 4)", { op: "read", fd: 3, n: 4 }],
        ["read(3, buf, 4)", { op: "read", fd: 3, n: 4 }],
        ["lseek(3, 3, SEEK_SET)", { op: "lseek", fd: 3, off: 3, wh: "SET" }],
        ["lseek(3, 2, SEEK_CUR)", { op: "lseek", fd: 3, off: 2, wh: "CUR" }],
        ["read(3, buf, 2)", { op: "read", fd: 3, n: 2 }],
        ["lseek(3, -4, SEEK_END)", { op: "lseek", fd: 3, off: -4, wh: "END" }],
        ['write(3, "AB", 2)', { op: "write", fd: 3, n: 2, data: "AB" }],
        ["lseek(3, 0, SEEK_END)", { op: "lseek", fd: 3, off: 0, wh: "END" }],
        ['write(3, "Z", 1)', { op: "write", fd: 3, n: 1, data: "Z" }],
        ["close(3)", { op: "close", fd: 3 }]
      ]
    }
  };

  function show(s) { return JSON.stringify(s).replace(/^"|"$/g, ""); }
  function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }

  function draw(fds, files, focus) {
    var s = '<svg viewBox="0 0 640 210" xmlns="http://www.w3.org/2000/svg">';
    s += '<defs><marker id="fdo_a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L10 5L0 10z" fill="#1d65b3"/></marker></defs>';
    s += '<text x="12" y="18" font-size="13" font-weight="700" fill="#3b2f4a">프로세스의 fd 표</text>';
    for (var i = 0; i < 6; i++) {
      var y = 26 + i * 29, e = fds[i];
      s += '<rect x="12" y="' + y + '" width="30" height="25" fill="#efe9f6" stroke="#3b2f4a"/><text x="27" y="' + (y + 17) + '" font-size="13" text-anchor="middle">' + i + '</text>';
      s += '<rect x="42" y="' + y + '" width="160" height="25" fill="' + (e ? "#fff" : "#f6f6f6") + '" stroke="#999"/>';
      var label = !e ? "(비어 있음)" : e.tty ? e.tty : '"' + e.f + '"  off ' + e.off;
      s += '<text x="50" y="' + (y + 17) + '" font-size="12" fill="' + (e ? "#222" : "#bbb") + '">' + esc(label) + '</text>';
    }
    if (focus !== null && fds[focus] && !fds[focus].tty) {
      var e2 = fds[focus], data = files[e2.f];
      s += '<line x1="202" y1="' + (38 + focus * 29) + '" x2="250" y2="90" stroke="#1d65b3" stroke-width="1.5" marker-end="url(#fdo_a)"/>';
      s += '<text x="256" y="40" font-size="13" font-weight="700" fill="#1d65b3">파일 "' + e2.f + '" (크기 ' + data.length + ')</text>';
      var w = Math.min(30, Math.floor(360 / Math.max(data.length, 1)));
      for (var k = 0; k < data.length; k++) {
        var x = 256 + k * w;
        s += '<rect x="' + x + '" y="70" width="' + w + '" height="30" fill="#dbe8f7" stroke="#1d65b3"/>';
        s += '<text x="' + (x + w / 2) + '" y="90" font-size="13" text-anchor="middle">' + esc(data[k] === "\n" ? "\\n" : data[k]) + '</text>';
        s += '<text x="' + (x + w / 2) + '" y="114" font-size="10" text-anchor="middle" fill="#777">' + k + '</text>';
      }
      var ox = 256 + e2.off * w;
      s += '<line x1="' + ox + '" y1="150" x2="' + ox + '" y2="104" stroke="#d6465f" stroke-width="2.5"/><path d="M' + (ox - 6) + ' 112 L' + ox + ' 102 L' + (ox + 6) + ' 112z" fill="#d6465f"/>';
      s += '<text x="' + ox + '" y="166" font-size="13" text-anchor="middle" fill="#d6465f" font-weight="700">offset ' + e2.off + '</text>';
      if (data.length === 0) s += '<text x="256" y="90" font-size="12" fill="#777">(빈 파일)</text>';
    }
    return s + '</svg>';
  }

  global.SIMS["fd_offset_trace"] = {
    title: "fd 표와 current offset (19강 p.20~23)",
    desc: "시스템 콜 한 줄마다 fd 번호와 offset 이 어떻게 바뀌는지 본다. → [[file descriptor]], [[파일 offset과 lseek]]",
    options: [{ key: "scenario", label: "시나리오", values: [
      { value: "strace_cat", label: "p.20 strace cat foo" },
      { value: "lowest_fd", label: "lowest unused fd" },
      { value: "lseek", label: "p.22~23 lseek" }
    ] }],
    build: function (opts) {
      var sc = SC[opts.scenario || "strace_cat"];
      var files = {};
      Object.keys(sc.files).forEach(function (k) { files[k] = sc.files[k]; });
      var fds = [{ tty: "stdin (터미널)" }, { tty: "stdout (터미널)" }, { tty: "stderr (터미널)" }];
      var screen = "";
      function snap(ret, buf) {
        var v = { "반환값": ret, "buf": buf };
        for (var i = 0; i < 6; i++) {
          var e = fds[i];
          v["fd " + i] = !e ? "-" : e.tty ? e.tty.split(" ")[0] : '"' + e.f + '" off ' + e.off;
        }
        v["화면"] = screen === "" ? "-" : show(screen);
        if (opts.scenario === "lseek") v["파일 내용"] = show(files.foo);
        return v;
      }
      function cp(a) { return a.map(function (e) { return e ? { tty: e.tty, f: e.f, off: e.off } : e; }); }
      var steps = [{ desc: "프로세스는 fd 0, 1, 2 가 열린 채로 시작한다", pc: { P: null }, vars: snap("-", "-"), svg: draw(fds, files, null) }];
      sc.lines.forEach(function (ln, idx) {
        var a = ln[1], ret, buf = "-", desc, focus = null;
        if (a.op === "open") {
          var fd = 0;
          while (fds[fd]) fd++;
          fds[fd] = { f: a.f, off: 0 };
          ret = fd; focus = fd;
          desc = "비어 있는 가장 작은 번호를 준다: fd " + fd + ", offset 0";
        } else if (a.op === "read") {
          var e = fds[a.fd], data = files[e.f], got = data.substr(e.off, a.n);
          e.off += got.length; ret = got.length; buf = got.length ? show(got) : '""'; focus = a.fd;
          desc = got.length ? got.length + " 바이트 읽음, offset 이 " + got.length + " 만큼 늘어 " + e.off : "남은 바이트가 없어 0 을 돌려준다 (파일 끝)";
        } else if (a.op === "write") {
          if (a.fd === 1) {
            screen += files.foo.substr(0, a.n); ret = a.n; buf = show(files.foo.substr(0, a.n));
            desc = "fd 1 은 stdout. 화면에 hello 가 찍힌다";
          } else {
            var w = fds[a.fd], d = files[w.f];
            while (d.length < w.off) d += "\0";
            d = d.substr(0, w.off) + a.data + d.substr(w.off + a.data.length);
            files[w.f] = d; w.off += a.data.length; ret = a.n; buf = '"' + a.data + '"'; focus = a.fd;
            desc = "offset 자리에 " + a.n + " 바이트를 덮어씀. offset " + w.off + ", 크기 " + d.length;
          }
        } else if (a.op === "lseek") {
          var f = fds[a.fd], base = a.wh === "SET" ? 0 : a.wh === "CUR" ? f.off : files[f.f].length;
          f.off = base + a.off; ret = f.off; focus = a.fd;
          desc = "SEEK_" + a.wh + ": " + base + (a.off < 0 ? " − " + (-a.off) : " + " + a.off) + " = " + f.off + ". 디스크는 안 움직인다";
        } else if (a.op === "close") {
          fds[a.fd] = null; ret = 0;
          desc = "close: fd " + a.fd + " 칸이 다시 빈다";
        }
        steps.push({ desc: desc, pc: { P: idx + 1 }, vars: snap(ret, buf), svg: draw(cp(fds), files, focus) });
      });
      var vnames = [{ name: "반환값", group: "호출" }, { name: "buf", group: "호출" }];
      for (var i = 0; i < 6; i++) vnames.push({ name: "fd " + i, group: "fd 표" });
      vnames.push({ name: "화면", group: "결과" });
      if (opts.scenario === "lseek") vnames.push({ name: "파일 내용", group: "결과" });
      return {
        panels: [{ id: "P", title: sc.title, lang: "c", lines: sc.lines.map(function (l) { return l[0] + ";"; }) }],
        vars: vnames,
        steps: steps
      };
    }
  };
})(typeof window !== "undefined" ? window : globalThis);
