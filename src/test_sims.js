#!/usr/bin/env node
// test_sims.js — 모든 시뮬레이터를 모든 옵션 조합으로 build() 해 계약(CONTRACT §6)을 검사한다.
// 사용: node src/test_sims.js
"use strict";

var fs = require("fs");
var path = require("path");
var vm = require("vm");

var SIM_DIR = path.join(__dirname, "sims");

// ------------------------------------------------------------
// 가짜 window 샌드박스
// ------------------------------------------------------------
var sandbox = {};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
sandbox.console = console;
sandbox.setInterval = function () { return 0; };
sandbox.clearInterval = function () {};
// document 는 일부러 제공하지 않는다 (sim 파일이 DOM 을 건드리면 여기서 터진다)
vm.createContext(sandbox);

function load(file) {
  var src = fs.readFileSync(file, "utf8");
  try {
    vm.runInContext(src, sandbox, { filename: file });
  } catch (e) {
    console.error("[LOAD FAIL] " + path.basename(file) + ": " + e.message);
    process.exit(1);
  }
}

var engine = path.join(SIM_DIR, "_engine.js");
if (!fs.existsSync(engine)) {
  console.error("_engine.js 가 없습니다: " + engine);
  process.exit(1);
}
load(engine);

var simFiles = fs.readdirSync(SIM_DIR)
  .filter(function (f) { return f.endsWith(".js") && f !== "_engine.js"; })
  .sort();
simFiles.forEach(function (f) { load(path.join(SIM_DIR, f)); });

var SIMS = sandbox.SIMS || {};
var names = Object.keys(SIMS).sort();

if (!names.length) {
  console.error("시뮬레이터가 하나도 등록되지 않았습니다.");
  process.exit(1);
}

// ------------------------------------------------------------
// 옵션 조합 전개
// ------------------------------------------------------------
function combos(options) {
  var out = [{}];
  (options || []).forEach(function (opt) {
    var next = [];
    (opt.values || []).forEach(function (v) {
      out.forEach(function (base) {
        var o = Object.assign({}, base);
        o[opt.key] = v.value;
        next.push(o);
      });
    });
    if (next.length) out = next;
  });
  return out;
}

// ------------------------------------------------------------
// 검사
// ------------------------------------------------------------
var failures = [];
var rows = [];

names.forEach(function (name) {
  var spec = SIMS[name];
  var combo = combos(spec.options);
  var totalSteps = 0;

  function fail(msg, opts) {
    failures.push(name + " [" + JSON.stringify(opts) + "] " + msg);
  }

  if (typeof spec.build !== "function") {
    failures.push(name + ": build() 가 없습니다");
    rows.push([name, String(combo.length), "-"]);
    return;
  }
  if (!spec.title) failures.push(name + ": title 없음");

  combo.forEach(function (opts) {
    var trace;
    try {
      trace = spec.build(JSON.parse(JSON.stringify(opts)));
    } catch (e) {
      fail("build() 예외: " + e.message + "\n" + (e.stack || "").split("\n").slice(0, 4).join("\n"), opts);
      return;
    }
    if (!trace || typeof trace !== "object") { fail("build() 가 객체를 반환하지 않음", opts); return; }

    var panels = trace.panels || [];
    var vars = trace.vars || [];
    var steps = trace.steps || [];

    if (!Array.isArray(steps) || steps.length === 0) { fail("steps.length === 0", opts); return; }
    totalSteps += steps.length;

    var lineCount = {};
    panels.forEach(function (p, i) {
      if (!p.id) fail("panels[" + i + "] 에 id 없음", opts);
      if (!Array.isArray(p.lines) || p.lines.length === 0) fail("panel " + p.id + " 에 lines 없음", opts);
      if (lineCount.hasOwnProperty(p.id)) fail("panel id 중복: " + p.id, opts);
      lineCount[p.id] = (p.lines || []).length;
    });

    var declared = {};
    vars.forEach(function (v, i) {
      if (!v.name) fail("vars[" + i + "] 에 name 없음", opts);
      declared[v.name] = true;
    });

    steps.forEach(function (s, i) {
      var at = "step " + (i + 1) + ": ";
      if (!s || typeof s !== "object") { fail(at + "step 이 객체가 아님", opts); return; }
      if (typeof s.desc !== "string" || s.desc.trim() === "") fail(at + "desc 없음", opts);
      if (!s.vars || typeof s.vars !== "object") {
        fail(at + "vars 없음", opts);
      } else {
        Object.keys(s.vars).forEach(function (k) {
          if (!declared[k]) fail(at + "vars 에 선언되지 않은 키 '" + k + "'", opts);
        });
      }
      if (s.pc === undefined || s.pc === null) {
        fail(at + "pc 없음", opts);
      } else {
        Object.keys(s.pc).forEach(function (pid) {
          if (!lineCount.hasOwnProperty(pid)) {
            fail(at + "pc 에 존재하지 않는 패널 '" + pid + "'", opts);
            return;
          }
          var v = s.pc[pid];
          if (v === null || v === undefined) return;
          if (typeof v !== "number" || !Number.isInteger(v) || v < 1 || v > lineCount[pid]) {
            fail(at + "pc." + pid + " = " + v + " 가 1.." + lineCount[pid] + " 범위 밖", opts);
          }
        });
      }
      if (s.status) {
        Object.keys(s.status).forEach(function (pid) {
          if (!lineCount.hasOwnProperty(pid)) fail(at + "status 에 존재하지 않는 패널 '" + pid + "'", opts);
        });
      }
      if (s.svg !== undefined && typeof s.svg !== "string" && typeof s.svg !== "function") {
        fail(at + "svg 는 문자열 또는 함수여야 함", opts);
      }
      if (typeof s.svg === "function") {
        var out;
        try { out = s.svg(s, i, trace); } catch (e) { fail(at + "svg() 예외: " + e.message, opts); return; }
        if (typeof out !== "string" || out.indexOf("<svg") === -1) fail(at + "svg() 가 <svg> 문자열을 반환하지 않음", opts);
      }
    });
  });

  rows.push([name, String(combo.length), String(totalSteps)]);
});

// ------------------------------------------------------------
// 출력
// ------------------------------------------------------------
function pad(s, n) { s = String(s); return s + " ".repeat(Math.max(0, n - s.length)); }

var w0 = Math.max(3, Math.max.apply(null, rows.map(function (r) { return r[0].length; })));
console.log("");
console.log(pad("sim", w0) + " | " + pad("combos", 6) + " | steps");
console.log("-".repeat(w0) + "-+-" + "-".repeat(6) + "-+------");
rows.forEach(function (r) {
  console.log(pad(r[0], w0) + " | " + pad(r[1], 6) + " | " + r[2]);
});
console.log("");
console.log("시뮬레이터 " + names.length + "개, 조합 " +
  rows.reduce(function (a, r) { return a + parseInt(r[1], 10); }, 0) + "개 검사");

if (failures.length) {
  console.log("");
  console.error("❌ 실패 " + failures.length + "건:");
  failures.forEach(function (f) { console.error("  - " + f); });
  process.exit(1);
}
console.log("✅ 모든 검사 통과");
process.exit(0);
