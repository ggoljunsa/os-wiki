// link_count_trace — 19강 p.32~40: ln / ln -s / rm / stat 을 한 줄씩. 디렉터리 엔트리 · inode · Links 변화.
(function (global) {
  "use strict";
  global.SIMS = global.SIMS || {};

  // 명령 하나를 상태에 적용한다. st = { ents: [[name, ino]], inodes: {ino: {type, links, data}} }
  function clone(st) {
    var c = { ents: st.ents.map(function (e) { return e.slice(); }), inodes: {} };
    Object.keys(st.inodes).forEach(function (k) { var n = st.inodes[k]; c.inodes[k] = { type: n.type, links: n.links, data: n.data, freed: n.freed }; });
    return c;
  }
  function find(st, name) { for (var i = 0; i < st.ents.length; i++) if (st.ents[i][0] === name) return i; return -1; }
  // 이름으로 따라가서 regular inode 를 찾는다 (symlink 면 담긴 경로를 다시 찾는다)
  function resolve(st, name, depth) {
    var i = find(st, name);
    if (i < 0) return null;
    var n = st.inodes[st.ents[i][1]];
    if (n.type === "symlink") return depth > 4 ? null : resolve(st, n.data, depth + 1);
    return st.ents[i][1];
  }

  var SC = {
    hard: {
      title: "p.36 hard link 세 개",
      inos: { reg: "67158084" },
      cmds: [
        ["echo hello > file", "new", "file", "reg"],
        ["stat file", "stat", "file"],
        ["ln file file2", "ln", "file", "file2"],
        ["stat file", "stat", "file"],
        ["stat file2", "stat", "file2"],
        ["ln file2 file3", "ln", "file2", "file3"],
        ["stat file", "stat", "file"],
        ["rm file", "rm", "file"],
        ["stat file2", "stat", "file2"],
        ["rm file2", "rm", "file2"],
        ["stat file3", "stat", "file3"],
        ["rm file3", "rm", "file3"]
      ]
    },
    symlink: {
      title: "p.37~40 symbolic link 와 dangling",
      inos: { reg: "12345", sym: "13579" },
      cmds: [
        ["echo hello > file", "new", "file", "reg"],
        ["ln -s file file2", "sym", "file", "file2"],
        ["cat file2", "cat", "file2"],
        ["stat file2", "stat", "file2"],
        ["rm file", "rm", "file"],
        ["cat file2", "cat", "file2"]
      ]
    },
    revive: {
      title: "응용: hard + soft, 이름을 되살리면",
      inos: { reg: "12345", sym: "13579" },
      cmds: [
        ["echo hello > file", "new", "file", "reg"],
        ["ln file file2", "ln", "file", "file2"],
        ["ln -s file file3", "sym", "file", "file3"],
        ["rm file", "rm", "file"],
        ["cat file2", "cat", "file2"],
        ["cat file3", "cat", "file3"],
        ["ln file2 file", "ln", "file2", "file"],
        ["cat file3", "cat", "file3"]
      ]
    }
  };

  function apply(st, c, inos) {
    var op = c[1], out = "", desc = "", note = null;
    if (op === "new") {
      st.inodes[inos.reg] = { type: "regular", links: 1, data: "hello\\n" };
      st.ents.push([c[2], inos.reg]);
      out = "";
      desc = "새 inode " + inos.reg + " 할당, 이름 file 을 붙임. Links 1";
    } else if (op === "ln") {
      var i = find(st, c[2]), ino = st.ents[i][1];
      st.ents.push([c[3], ino]);
      st.inodes[ino].links++;
      desc = c[3] + " 엔트리가 같은 inode " + ino + " 를 가리킴. Links " + st.inodes[ino].links;
    } else if (op === "sym") {
      st.inodes[inos.sym] = { type: "symlink", links: 1, data: c[2] };
      st.ents.push([c[3], inos.sym]);
      desc = "새 inode " + inos.sym + " (symlink), 데이터 = 경로 \"" + c[2] + "\"";
    } else if (op === "rm") {
      var j = find(st, c[2]), ino2 = st.ents[j][1], n = st.inodes[ino2];
      st.ents.splice(j, 1);
      n.links--;
      if (n.links === 0) {
        n.freed = true;
        desc = "unlink(\"" + c[2] + "\"). Links 0 → inode 와 블록 해제";
      } else {
        desc = "unlink(\"" + c[2] + "\"). 엔트리만 지움, Links " + n.links;
      }
    } else if (op === "stat") {
      var k = find(st, c[2]), ino3 = st.ents[k][1], m = st.inodes[ino3];
      out = "Links: " + m.links;
      if (m.type === "symlink") out = "symlink, Size " + m.data.length;
      desc = "stat 은 inode " + ino3 + " 를 읽는다: " + out;
    } else if (op === "cat") {
      var r = resolve(st, c[2], 0);
      var e = st.ents[find(st, c[2])], via = st.inodes[e[1]].type === "symlink";
      if (r === null) {
        out = "No such file";
        desc = c[2] + " 에 담긴 경로 " + st.inodes[e[1]].data + " 을 찾았지만 없음 (dangling)";
        note = "symlink 는 이름을 담고 있다. 그 이름이 사라지면 가리킬 곳이 없다.";
      } else {
        out = "hello";
        desc = via ? c[2] + " → 경로 \"" + st.inodes[e[1]].data + "\" → inode " + r + " → hello" : c[2] + " → inode " + r + " → hello";
      }
    }
    return { out: out, desc: desc, note: note };
  }

  function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }

  function draw(st, inos, hi) {
    var s = '<svg viewBox="0 0 640 230" xmlns="http://www.w3.org/2000/svg">';
    s += '<defs><marker id="lct_a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L10 5L0 10z" fill="#1d65b3"/></marker>' +
      '<marker id="lct_g" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L10 5L0 10z" fill="#2e9e4f"/></marker></defs>';
    s += '<text x="20" y="20" font-size="13" font-weight="700" fill="#3b2f4a">디렉터리 (name, inode #)</text>';
    s += '<text x="330" y="20" font-size="13" font-weight="700" fill="#3b2f4a">inode</text>';
    var names = ["file", "file2", "file3"], rowY = {};
    names.forEach(function (nm, i) {
      var y = 34 + i * 40, j = find(st, nm);
      rowY[nm] = y;
      var on = j >= 0;
      s += '<rect x="20" y="' + y + '" width="80" height="28" fill="' + (on ? "#fff" : "#f6f6f6") + '" stroke="' + (hi === nm ? "#d6465f" : "#999") + '" stroke-width="' + (hi === nm ? 2.5 : 1) + '"/>';
      s += '<text x="60" y="' + (y + 19) + '" font-size="13" text-anchor="middle" fill="' + (on ? "#222" : "#bbb") + '">' + nm + '</text>';
      s += '<rect x="100" y="' + y + '" width="90" height="28" fill="' + (on ? "#fff" : "#f6f6f6") + '" stroke="#999"/>';
      s += '<text x="145" y="' + (y + 19) + '" font-size="13" text-anchor="middle" fill="' + (on ? "#222" : "#bbb") + '">' + (on ? st.ents[j][1] : "(없음)") + '</text>';
    });
    var boxes = [];
    if (inos.reg) boxes.push([inos.reg, 34]);
    if (inos.sym) boxes.push([inos.sym, 130]);
    var boxY = {};
    boxes.forEach(function (b) {
      var ino = b[0], y = b[1], n = st.inodes[ino];
      boxY[ino] = y;
      if (!n) {
        s += '<rect x="330" y="' + y + '" width="160" height="78" rx="6" fill="#f6f6f6" stroke="#ccc" stroke-dasharray="4 3"/>';
        s += '<text x="410" y="' + (y + 44) + '" font-size="12" text-anchor="middle" fill="#aaa">inode ' + ino + ' (아직 없음)</text>';
        return;
      }
      var reg = n.type === "regular";
      var fill = n.freed ? "#eee" : reg ? "#dbe8f7" : "#dff3e4", stc = n.freed ? "#aaa" : reg ? "#1d65b3" : "#2e9e4f";
      s += '<rect x="330" y="' + y + '" width="160" height="78" rx="6" fill="' + fill + '" stroke="' + stc + '"/>';
      s += '<text x="340" y="' + (y + 18) + '" font-size="13" font-weight="700" fill="' + stc + '">inode ' + ino + '</text>';
      s += '<text x="340" y="' + (y + 38) + '" font-size="12" fill="#222">type: ' + (reg ? "regular file" : "symbolic link") + '</text>';
      s += '<text x="340" y="' + (y + 58) + '" font-size="13" fill="#222">Links: <tspan font-weight="700">' + n.links + '</tspan></text>';
      if (n.freed) s += '<text x="410" y="' + (y + 74) + '" font-size="11" text-anchor="middle" fill="#d6465f">해제됨</text>';
      // 데이터 블록
      s += '<rect x="520" y="' + (y + 14) + '" width="100" height="44" fill="' + (n.freed ? "#eee" : "#fff") + '" stroke="#999"/>';
      s += '<text x="570" y="' + (y + 10) + '" font-size="11" text-anchor="middle" fill="#777">data block</text>';
      s += '<text x="570" y="' + (y + 41) + '" font-size="13" text-anchor="middle" fill="' + (n.freed ? "#aaa" : "#222") + '">"' + esc(n.data) + '"</text>';
      s += '<line x1="490" y1="' + (y + 36) + '" x2="518" y2="' + (y + 36) + '" stroke="#777" marker-end="url(#lct_a)"/>';
    });
    // 엔트리 → inode 화살표
    st.ents.forEach(function (e) {
      if (!(e[0] in rowY) || !(e[1] in boxY)) return;
      var y1 = rowY[e[0]] + 14, y2 = boxY[e[1]] + 39;
      var col = st.inodes[e[1]].type === "symlink" ? "#2e9e4f" : "#1d65b3";
      s += '<line x1="190" y1="' + y1 + '" x2="328" y2="' + y2 + '" stroke="' + col + '" stroke-width="2" marker-end="url(#lct_' + (col === "#1d65b3" ? "a" : "g") + ')"/>';
    });
    // symlink 의 경로가 가리키는 이름
    if (inos.sym && st.inodes[inos.sym] && !st.inodes[inos.sym].freed) {
      var tgt = st.inodes[inos.sym].data, ty = rowY[tgt] + 14, by = boxY[inos.sym] + 58;
      var alive = find(st, tgt) >= 0;
      s += '<path d="M570 ' + by + ' L570 205 L10 205 L10 ' + ty + ' L18 ' + ty + '" fill="none" stroke="' + (alive ? "#2e9e4f" : "#d6465f") + '" stroke-width="1.5" stroke-dasharray="5 4" marker-end="url(#lct_g)"/>';
      s += '<text x="290" y="222" font-size="12" text-anchor="middle" fill="' + (alive ? "#2e9e4f" : "#d6465f") + '">symlink 데이터 "' + tgt + '" 는 이름으로 찾는다' + (alive ? "" : " → 이름 없음 (dangling)") + '</text>';
    }
    return s + '</svg>';
  }

  global.SIMS["link_count_trace"] = {
    title: "ln · ln -s · rm 과 Links 수 (19강 p.32~40)",
    desc: "명령 한 줄마다 디렉터리 엔트리와 inode 의 Links 가 어떻게 바뀌는지 본다. → [[hard link]], [[symbolic link]]",
    options: [{ key: "scenario", label: "시나리오", values: [
      { value: "hard", label: "p.36 hard link" },
      { value: "symlink", label: "p.37~40 symlink · dangling" },
      { value: "revive", label: "응용: 이름을 되살리면" }
    ] }],
    build: function (opts) {
      var sc = SC[opts.scenario || "hard"], inos = sc.inos;
      var st = { ents: [], inodes: {} };
      var varNames = ["file", "file2", "file3"];
      Object.keys(inos).forEach(function (k) { varNames.push(inos[k] + " Links"); });
      varNames.push("출력");
      function snap(out) {
        var v = {};
        ["file", "file2", "file3"].forEach(function (nm) { var j = find(st, nm); v[nm] = j >= 0 ? "→ " + st.ents[j][1] : "-"; });
        Object.keys(inos).forEach(function (k) {
          var n = st.inodes[inos[k]];
          v[inos[k] + " Links"] = !n ? "-" : n.freed ? "0 (해제)" : n.links;
        });
        v["출력"] = out === "" ? "-" : out;
        return v;
      }
      var steps = [{ desc: "빈 디렉터리에서 시작", pc: { SH: null }, vars: snap(""), svg: draw(st, inos, null) }];
      sc.cmds.forEach(function (c, i) {
        var r = apply(st, c, inos);
        var hi = c[1] === "ln" || c[1] === "sym" ? c[3] : c[2];
        var step = { desc: r.desc, pc: { SH: i + 1 }, vars: snap(r.out), svg: draw(clone(st), inos, hi) };
        if (r.note) step.note = r.note;
        steps.push(step);
      });
      return {
        panels: [{ id: "SH", title: sc.title, lang: "sh", lines: sc.cmds.map(function (c) { return "prompt> " + c[0]; }) }],
        vars: varNames.map(function (n) { return { name: n, group: n === "출력" ? "결과" : /Links/.test(n) ? "inode" : "디렉터리 엔트리" }; }),
        steps: steps
      };
    }
  };
})(typeof window !== "undefined" ? window : globalThis);
