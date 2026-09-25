#!/usr/bin/env node
// test_anims.js — 모든 움직이는 그림(src/anims/*.js)을 로드해 계약(CONTRACT §7)을 검사한다.
//   · ANIMS["이름"] = { title, desc, duration, build } 형태인가
//   · build() 가 <svg …> 문자열을 돌려주는가 (DOM 접근 없이)
//   · viewBox 가 있고, SMIL 애니메이션 요소(<animate|animateTransform|animateMotion|set>)가 1개 이상인가
//   · 태그가 짝이 맞는가 (간단한 XML 균형 검사), begin/dur 이 duration 을 넘지 않는가
//   · 파일명 == 이름 인가
// 사용: node src/test_anims.js
"use strict";

var fs = require("fs");
var path = require("path");
var vm = require("vm");

var DIR = path.join(__dirname, "anims");

var sandbox = {};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
sandbox.console = console;
sandbox.requestAnimationFrame = function () { return 0; };
sandbox.cancelAnimationFrame = function () {};
// document 는 일부러 없다 — anim 파일이 DOM 을 만지면 여기서 터진다
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

if (!fs.existsSync(path.join(DIR, "_anim_engine.js"))) {
  console.error("_anim_engine.js 가 없습니다");
  process.exit(1);
}
load(path.join(DIR, "_anim_engine.js"));

var files = fs.readdirSync(DIR).filter(function (f) { return f.endsWith(".js") && f !== "_anim_engine.js"; }).sort();
var before = {};
var fileOf = {};
files.forEach(function (f) {
  var prev = Object.keys(sandbox.ANIMS || {});
  load(path.join(DIR, f));
  Object.keys(sandbox.ANIMS).forEach(function (k) { if (prev.indexOf(k) === -1) fileOf[k] = f; });
});

var ANIMS = sandbox.ANIMS || {};
var names = Object.keys(ANIMS).sort();
if (!names.length) { console.error("애니메이션이 하나도 등록되지 않았습니다."); process.exit(1); }

var VOID = { br: 1, hr: 1, img: 1, input: 1, meta: 1, link: 1 };

function checkBalance(svg) {
  // 주석·CDATA 제거 후 태그 스택 검사
  var s = svg.replace(/<!--[\s\S]*?-->/g, "").replace(/<!\[CDATA\[[\s\S]*?\]\]>/g, "");
  var re = /<\/?([A-Za-z][\w:-]*)\b[^>]*?(\/?)>/g;
  var stack = [];
  var m;
  while ((m = re.exec(s))) {
    var tag = m[1];
    var closing = m[0].charAt(1) === "/";
    var selfClosing = m[2] === "/";
    if (closing) {
      var top = stack.pop();
      if (top !== tag) return "닫는 태그 불일치: </" + tag + "> (기대: " + (top ? "</" + top + ">" : "없음") + ")";
    } else if (!selfClosing && !VOID[tag]) {
      stack.push(tag);
    }
  }
  if (stack.length) return "안 닫힌 태그: <" + stack.join(">, <") + ">";
  // 따옴표 안 닫힘·'<' 텍스트 등 흔한 실수
  var lt = s.replace(/<[^>]*>/g, "");
  if (/[<>]/.test(lt.replace(/&lt;|&gt;/g, ""))) return "태그 밖에 원시 '<' 또는 '>' 가 있음 (텍스트는 &lt; &gt; 로)";
  if (/&(?!(amp|lt|gt|quot|apos|#\d+|#x[0-9a-fA-F]+);)/.test(s)) return "이스케이프 안 된 '&' 가 있음 (&amp; 로)";
  return null;
}

function secs(v) {
  if (v === undefined) return null;
  var m = String(v).match(/^\s*([\d.]+)\s*(ms|s)?\s*$/);
  if (!m) return null;
  return m[2] === "ms" ? parseFloat(m[1]) / 1000 : parseFloat(m[1]);
}

var fail = 0;
names.forEach(function (name) {
  var spec = ANIMS[name];
  var errs = [];
  if (fileOf[name] !== name + ".js") errs.push("파일명이 이름과 다름: " + fileOf[name] + " (기대 " + name + ".js)");
  if (!spec.title) errs.push("title 없음");
  if (!spec.desc) errs.push("desc 없음");
  var dur = Number(spec.duration);
  if (!(dur > 0)) errs.push("duration(초) 없음/0");
  if (typeof spec.build !== "function") errs.push("build 가 함수가 아님");

  var svg = "";
  if (typeof spec.build === "function") {
    try { svg = String(spec.build() || ""); } catch (e) { errs.push("build() 예외: " + e.message); }
  }
  if (svg && !/^\s*<svg\b/.test(svg)) errs.push("build() 결과가 <svg 로 시작하지 않음");
  if (svg && !/\bviewBox\s*=/.test(svg)) errs.push("viewBox 없음");
  if (svg && !/<(animate|animateTransform|animateMotion|set)\b/.test(svg)) errs.push("SMIL 애니메이션 요소가 하나도 없음");
  if (svg && /\bwidth\s*=\s*"\d+px"/.test(svg.slice(0, 200))) errs.push("<svg> 에 고정 px width 쓰지 말 것 (viewBox 만)");
  if (svg) {
    var b = checkBalance(svg);
    if (b) errs.push(b);
    // begin+dur 이 duration 을 넘는 애니메이션 요소 → 끝까지 못 봄
    var re = /<(animate|animateTransform|animateMotion|set)\b([^>]*)>/g, m, over = 0;
    while ((m = re.exec(svg))) {
      var attrs = m[2];
      var bm = attrs.match(/\bbegin\s*=\s*"([^"]*)"/);
      var dm = attrs.match(/\bdur\s*=\s*"([^"]*)"/);
      var bs = bm ? secs(bm[1]) : 0;
      var ds = dm ? secs(dm[1]) : 0;
      if (bs !== null && ds !== null && dur > 0 && bs + ds > dur + 1e-6) over++;
      if (/\brepeatCount\s*=\s*"indefinite"/.test(attrs) && !/\bdur\s*=/.test(attrs)) over++;
    }
    if (over) errs.push(over + "개 애니메이션 요소의 begin+dur 이 duration(" + dur + "s) 을 넘음");
    if (svg.length > 60000) errs.push("SVG 가 60KB 를 넘음 (" + svg.length + ")");
  }

  if (errs.length) {
    fail++;
    console.log("❌ " + name);
    errs.forEach(function (e) { console.log("    - " + e); });
  } else {
    console.log("✅ " + name + "  (" + dur + "s, " + (svg.length / 1024).toFixed(1) + "KB)");
  }
});

console.log("\n" + names.length + "개 중 " + (names.length - fail) + "개 통과");
process.exit(fail ? 1 : 0);
