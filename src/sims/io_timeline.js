// io_timeline — 18강 p.10·11·13·14: polling / interrupt / PIO / DMA 의 CPU 사용 그림을 tick 단위로.
(function (global) {
  "use strict";
  global.SIMS = global.SIMS || {};
  var M = {
    polling: { cpu: "11111ppppp11111", dma: "...............", disk: ".....11111.....", cuts: [5, 10],
      lines: ["task 1 실행", "while (STATUS == BUSY) ;", "task 1 계속 실행"] },
    interrupt: { cpu: "111112222211111", dma: "...............", disk: ".....11111.....", cuts: [5, 10],
      lines: ["task 1 실행", "I/O 요청, task 1 sleep, task 2 실행", "interrupt 로 task 1 깨움, 실행"] },
    pio: { cpu: "1111ccc22222111", dma: "...............", disk: ".......11111...", cuts: [4, 7, 12],
      lines: ["task 1 실행", "CPU 가 메모리 → 디바이스 복사", "task 2 실행, 디스크 동작", "task 1 다시 실행"] },
    dma: { cpu: "111122222222111", dma: "....CCC........", disk: ".......11111...", cuts: [4, 7, 12],
      lines: ["task 1 실행", "DMA 가 복사, CPU 는 task 2 실행", "task 2 실행, 디스크 동작", "task 1 다시 실행"] }
  };
  var COL = { "1": "#dbe8f7", "2": "#dff3e4", p: "#ffd9d9", c: "#ffd9d9", C: "#fdeec2" };
  function row(y, label, str, t) {
    var s = '<text x="8" y="' + (y + 20) + '" font-size="13" fill="#3b2f4a" font-weight="700">' + label + '</text>';
    for (var i = 0; i < str.length; i++) {
      var x = 62 + i * 40, ch = i < t ? str[i] : ".";
      s += '<rect x="' + x + '" y="' + y + '" width="38" height="30" fill="' + (ch === "." ? "#f6f6f6" : COL[ch]) + '" stroke="#ccc"/>';
      if (ch !== ".") s += '<text x="' + (x + 19) + '" y="' + (y + 20) + '" font-size="14" text-anchor="middle" fill="#222">' + ch + '</text>';
    }
    return s;
  }
  function chart(m, t) {
    var withDma = m.dma.replace(/\./g, "").length > 0, y = 8;
    var s = '<svg viewBox="0 0 670 ' + (withDma ? 122 : 86) + '" xmlns="http://www.w3.org/2000/svg">';
    s += row(y, "CPU", m.cpu, t); y += 38;
    if (withDma) { s += row(y, "DMA", m.dma, t); y += 38; }
    return s + row(y, "Disk", m.disk, t) + '</svg>';
  }
  function say(m, i, mode) {
    var c = m.cpu[i], prev = i ? m.cpu[i - 1] : null, d = m.disk[i] !== ".", x = m.dma[i] !== ".";
    if (c === "1") return !prev || prev === "1" ? "task 1 실행" : mode === "polling" ? "STATUS 가 BUSY 아님, polling 끝" : mode === "interrupt" ? "interrupt 로 task 1 이 다시 실행" : "task 1 다시 실행";
    if (c === "p") return "CPU 가 STATUS 를 읽으며 기다림 (낭비)";
    if (c === "c") return "CPU 가 데이터를 복사 (낭비)";
    if (x) return prev === "1" ? "task 2 로 전환, DMA 가 복사 시작" : "task 2 실행, DMA 가 복사";
    return prev === "1" ? "task 1 sleep, task 2 로 context switch" : d ? "task 2 실행, 디스크는 task 1 I/O" : "task 2 실행";
  }
  global.SIMS["io_timeline"] = {
    title: "Polling · Interrupt · PIO · DMA 의 CPU 사용 (18강 p.10~14)",
    desc: "tick 마다 CPU 가 무엇을 하는지 본다. → [[polling과 interrupt]], [[PIO와 DMA]]",
    options: [{ key: "mode", label: "방식", values: [{ value: "polling", label: "Polling (p.10)" }, { value: "interrupt", label: "Interrupt (p.11)" }, { value: "pio", label: "PIO (p.13)" }, { value: "dma", label: "DMA (p.14)" }] }],
    build: function (opts) {
      var mode = opts.mode || "polling", m = M[mode], steps = [], waste = 0, n = m.cpu.length;
      function line(i) { for (var k = 0; k < m.cuts.length; k++) if (i < m.cuts[k]) return k + 1; return m.lines.length; }
      steps.push({ desc: "tick 0, 아직 아무것도 실행하지 않음", pc: { P: null }, vars: { "tick": 0, "CPU": "-", "Disk": "-", "CPU 낭비": 0 }, svg: chart(m, 0) });
      for (var i = 0; i < n; i++) {
        var c = m.cpu[i];
        if (c === "p" || c === "c") waste++;
        steps.push({ desc: say(m, i, mode), pc: { P: line(i) },
          vars: { "tick": i + 1, "CPU": c === "p" ? "polling" : c === "c" ? "copy" : "task " + c, "Disk": m.disk[i] === "." ? "idle" : "task 1 I/O", "CPU 낭비": waste },
          svg: chart(m, i + 1) });
      }
      return {
        panels: [{ id: "P", title: mode.toUpperCase(), lang: "txt", lines: m.lines }],
        vars: ["tick", "CPU", "Disk", "CPU 낭비"].map(function (x) { return { name: x, group: "상태" }; }),
        steps: steps
      };
    }
  };
})(typeof window !== "undefined" ? window : globalThis);
