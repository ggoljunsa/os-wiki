// ============================================================
// 운체위키 renderer — 위키 문법 → HTML, 네비/검색/목차/시뮬레이터
// ARTICLES, NAV_ORDER 는 build.py 가 앞쪽에 삽입한다.
// ============================================================

var BOX_TYPES = ["info", "warn", "tip", "joke", "analogy", "def", "quiz", "exam"];

// 사이드바: 기말 / 중간 / 공통 탭. 한 탭 안에서는 강의별로 접고 편다.
var NAV_TAB_NAMES = ["기말", "중간", "공통"];
var navOpenGroups = {};   // group → true/false (사용자가 직접 접거나 편 것)
var navTab = null;
var navLastActive = null;

function navSectionOf(group) {
  if (/^(기말고사|1[3-8]강|과제2)/.test(group)) return "기말";
  if (/^([1-9]강|1[0-2]강|과제1|퀴즈)/.test(group)) return "중간";
  return "공통";
}

function navGroupOfKey(key) {
  var list = typeof NAV_ORDER !== "undefined" ? NAV_ORDER : [];
  for (var i = 0; i < list.length; i++) {
    if (list[i].items.indexOf(key) >= 0) return list[i].group;
  }
  return null;
}

function navStoredTab() {
  try { return localStorage.getItem("osw-nav-tab"); } catch (e) { return null; }
}

function navStoreTab(t) {
  try { localStorage.setItem("osw-nav-tab", t); } catch (e) { /* 저장 불가 환경 */ }
}

function renderNav(active) {
  var nav = document.getElementById("navList");
  var groups = typeof NAV_ORDER !== "undefined" ? NAV_ORDER : [];
  var activeGroup = navGroupOfKey(active);
  var isHome = !active || active === "main";
  // 문서가 바뀔 때만 그 문서의 탭으로 맞춘다 (탭·그룹 클릭 재렌더에서는 유지)
  if (active !== navLastActive) {
    if (!isHome && activeGroup) navTab = navSectionOf(activeGroup);
    navLastActive = active;
  }
  if (!navTab) navTab = navStoredTab() || "기말";
  if (NAV_TAB_NAMES.indexOf(navTab) < 0) navTab = "기말";

  var tabs = document.getElementById("navTabs");
  if (tabs) {
    tabs.innerHTML = "";
    NAV_TAB_NAMES.forEach(function (t) {
      var b = document.createElement("button");
      b.type = "button";
      b.textContent = t;
      b.className = "nav-tab" + (t === navTab ? " on" : "");
      b.addEventListener("click", function () {
        navTab = t;
        navStoreTab(t);
        renderNav(currentArticle());
      });
      tabs.appendChild(b);
    });
  }

  nav.innerHTML = "";
  var shown = groups.filter(function (g) { return navSectionOf(g.group) === navTab; });
  // 문서를 보고 있지 않을 때 기본으로 펼칠 강의: 그 탭의 마지막 '강의' 그룹
  var lectures = shown.filter(function (g) { return /^\d+강/.test(g.group); });
  var defaultOpen = activeGroup && navSectionOf(activeGroup) === navTab ? activeGroup
    : (lectures.length ? lectures[lectures.length - 1].group : null);

  shown.forEach(function (group) {
    var open = navOpenGroups[group.group];
    if (open === undefined) open = group.group === defaultOpen || group.items.length <= 2;
    var head = document.createElement("li");
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "nav-group" + (open ? " open" : "");
    btn.textContent = group.group;
    btn.addEventListener("click", function () {
      navOpenGroups[group.group] = !open;
      renderNav(currentArticle());
    });
    head.appendChild(btn);
    nav.appendChild(head);
    if (!open) return;
    group.items.forEach(function (key) {
      var li = document.createElement("li");
      var a = document.createElement("a");
      a.href = "#" + encodeURIComponent(key);
      a.textContent = ARTICLES[key] ? ARTICLES[key].title : key;
      if (key === active) a.classList.add("active");
      li.appendChild(a);
      nav.appendChild(li);
    });
  });

  var cur = nav.querySelector ? nav.querySelector("a.active") : null;
  var side = nav.closest ? nav.closest("aside") : null;
  if (cur && side && side.scrollHeight > side.clientHeight) {
    side.scrollTop = Math.max(0, cur.offsetTop - side.clientHeight / 2);
  }
}

function renderArticle(key) {
  var art = ARTICLES[key] || ARTICLES["main"];
  var area = document.getElementById("articleArea");

  if (!art) {
    area.innerHTML = '<h1>문서 없음</h1><p>아직 작성되지 않은 문서입니다.</p>';
    renderNav(key);
    renderTOC();
    return;
  }

  var cats = (art.category || []).map(function (c) {
    return '<span class="cat-tag">' + c + "</span>";
  }).join("");

  var html = "";
  if (key !== "main") {
    html += '<div class="breadcrumb"><a href="#main">운체위키</a> &gt; ' + art.title + "</div>";
  }
  html += "<h1>" + art.title + "</h1>";
  html += '<div class="meta">분류: ' + cats + "</div>";
  html += renderWikiText(art.body);
  html += '<div class="categories">분류: ' + cats + "</div>";

  area.innerHTML = html;

  mountSims(area);
  mountAnims(area);
  renderMath(area);

  renderNav(key);
  renderTOC();
  window.scrollTo(0, 0);
}

function mountSims(scope) {
  var nodes = scope.querySelectorAll(".sim[data-sim]");
  for (var i = 0; i < nodes.length; i++) {
    var node = nodes[i];
    var name = node.getAttribute("data-sim");
    if (typeof SimEngine !== "undefined" && SimEngine && typeof SimEngine.mount === "function") {
      SimEngine.mount(node, name);
    } else {
      node.className = "sim-missing";
      node.textContent = "시뮬레이터 없음: " + name;
    }
  }
}

function mountAnims(scope) {
  var nodes = scope.querySelectorAll(".anim[data-anim]");
  for (var i = 0; i < nodes.length; i++) {
    var node = nodes[i];
    var name = node.getAttribute("data-anim");
    if (typeof AnimEngine !== "undefined" && AnimEngine && typeof AnimEngine.mount === "function") {
      AnimEngine.mount(node, name, node.getAttribute("data-caption") || "");
    } else {
      node.className = "anim-missing";
      node.textContent = "움직이는 그림 없음: " + name;
    }
  }
}

function renderMath(scope) {
  if (typeof renderMathInElement !== "function") return;
  try {
    renderMathInElement(scope, {
      delimiters: [
        { left: "$$", right: "$$", display: true },
        { left: "$", right: "$", display: false }
      ],
      throwOnError: false
    });
  } catch (e) { /* 수식 실패는 무시 */ }
}

// ------------------------------------------------------------
// 블록 단위 파서
// ------------------------------------------------------------
function renderWikiText(text) {
  var lines = String(text == null ? "" : text).split("\n");
  var html = "";
  var inTable = false;
  var tableRows = [];
  var inPre = false;
  var preContent = "";
  var preClass = "";
  var listStack = [];

  function flushTable() {
    if (tableRows.length === 0) { inTable = false; return; }
    var t = "<div class=\"tablewrap\"><table>";
    tableRows.forEach(function (row) {
      t += "<tr>";
      row.cells.forEach(function (c) {
        var tag = c.header ? "th" : "td";
        t += "<" + tag + ">" + inlineFormat(c.text.trim()) + "</" + tag + ">";
      });
      t += "</tr>";
    });
    t += "</table></div>";
    html += t;
    tableRows = [];
    inTable = false;
  }
  function closeList() {
    while (listStack.length) html += "</" + listStack.pop() + ">";
  }
  function escapeCode(s) {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  for (var i = 0; i < lines.length; i++) {
    var line = lines[i];

    // ---- 코드블록 ----
    if (!inPre && /^<pre\b/.test(line)) {
      closeList(); flushTable();
      inPre = true;
      var cm = line.match(/class\s*=\s*"([^"]*)"/);
      preClass = cm ? cm[1] : "";
      preContent = "";
      continue;
    }
    if (inPre) {
      if (line.indexOf("</pre>") === 0) {
        html += '<pre class="' + preClass + '">' + formatPre(preContent.replace(/\n$/, ""), preClass) + "</pre>";
        inPre = false;
      } else {
        preContent += line + "\n";
      }
      continue;
    }

    // ---- 박스 (한 줄 / 여러 줄 공통) ----
    var boxStart = line.match(/^\{(info|warn|tip|joke|analogy|def|quiz|exam|answer)\}([\s\S]*)$/);
    if (boxStart) {
      closeList(); flushTable();
      var cls = boxStart[1];
      var closeRe = new RegExp("\\{/" + cls + "\\}\\s*$");
      var content;
      if (closeRe.test(line)) {
        // 같은 줄에서 열고 닫는 경우
        content = boxStart[2].replace(closeRe, "");
      } else {
        content = boxStart[2];
        while (++i < lines.length) {
          var next = lines[i];
          if (closeRe.test(next)) {           // 닫는 태그는 본문 줄 끝에 붙어도 된다
            content += "\n" + next.replace(closeRe, "");
            break;
          }
          content += "\n" + next;
        }
      }
      var inner = renderBoxBody(content);
      if (cls === "answer") {
        html += '<details class="answer"><summary>정답 보기</summary>' + inner + "</details>";
      } else {
        html += '<div class="' + cls + '">' + inner + "</div>";
      }
      continue;
    }

    // ---- footnotes ----
    if (line.trim() === "{footnotes}") { closeList(); flushTable(); html += '<div class="footnote">'; continue; }
    if (line.trim() === "{/footnotes}") { closeList(); flushTable(); html += "</div>"; continue; }

    // ---- 표 ----
    if (line.indexOf("{|") === 0) { closeList(); inTable = true; tableRows = []; continue; }
    if (line.indexOf("|}") === 0) { flushTable(); continue; }
    if (inTable) {
      if (line.indexOf("|-") === 0) continue;
      if (line.indexOf("!") === 0) {
        tableRows.push({ cells: line.substring(1).split("||").map(function (c) { return { text: c, header: true }; }) });
      } else if (line.indexOf("|") === 0) {
        tableRows.push({ cells: line.substring(1).split("||").map(function (c) { return { text: c, header: false }; }) });
      }
      continue;
    }

    // ---- 헤딩 ----
    if (line.indexOf("==== ") === 0 && /\s====$/.test(line)) {
      closeList(); flushTable();
      var t4 = line.slice(5, -5);
      html += '<h4 id="' + headingId(t4) + '">' + inlineFormat(t4) + "</h4>";
      continue;
    }
    if (line.indexOf("=== ") === 0 && /\s===$/.test(line)) {
      closeList(); flushTable();
      var t3 = line.slice(4, -4);
      html += '<h3 id="' + headingId(t3) + '">' + inlineFormat(t3) + "</h3>";
      continue;
    }
    if (line.indexOf("== ") === 0 && /\s==$/.test(line)) {
      closeList(); flushTable();
      var t2 = line.slice(3, -3);
      html += '<h2 id="' + headingId(t2) + '">' + inlineFormat(t2) + "</h2>";
      continue;
    }

    // ---- 수평선 ----
    if (/^----+\s*$/.test(line)) {
      closeList(); flushTable();
      html += "<hr>";
      continue;
    }

    // ---- 목록 (중첩 1단계까지) ----
    var lm = line.match(/^(\*{1,2}|#{1,2})\s+(.*)$/);
    if (lm) {
      flushTable();
      var depth = lm[1].length;
      var type = lm[1].charAt(0) === "*" ? "ul" : "ol";
      while (listStack.length > depth) html += "</" + listStack.pop() + ">";
      if (listStack.length === depth && listStack[depth - 1] !== type) {
        html += "</" + listStack.pop() + ">";
      }
      while (listStack.length < depth) { html += "<" + type + ">"; listStack.push(type); }
      html += "<li>" + inlineFormat(lm[2]) + "</li>";
      continue;
    }
    closeList();

    if (line.trim() === "") continue;

    // ---- 블록 레벨 단독 태그 ----
    var trimmed = line.trim();
    if (/^\[\[(img|sim|anim):.*\]\]$/.test(trimmed)) {
      html += inlineFormat(trimmed);
      continue;
    }

    html += "<p>" + inlineFormat(line) + "</p>";
  }
  closeList(); flushTable();
  if (inPre) html += '<pre class="' + preClass + '">' + formatPre(preContent, preClass) + "</pre>";
  return html;
}

// 제목에 위키 문법이 섞여 있어도 id 에는 남기지 않는다 ('''굵게''', [[링크]], `code`)
function headingId(text) {
  var t = String(text)
    .replace(/\[\[(?:img|sim|anim):[^\]]*\]\]/g, "")
    .replace(/\[\[(?:[^\]\|]*\|)?([^\]]+)\]\]/g, "$1")
    .replace(/'''/g, "")
    .replace(/''/g, "")
    .replace(/`/g, "");
  return "h_" + t.trim().replace(/\s/g, "_");
}

// 박스 본문: 블록 문법(표/목록/코드/중첩 박스/헤딩/수평선)이 있으면 renderWikiText 로 재귀,
// 없으면 기존처럼 인라인 + <br> (한 줄짜리 박스의 모양을 그대로 유지하기 위함).
var BLOCK_IN_BOX = /^(?:\{\||\*+\s|#+\s|<pre\b|=+\s|----+\s*$|\{(?:info|warn|tip|joke|analogy|def|quiz|exam|answer)\})/;

function renderBoxBody(content) {
  var lines = String(content == null ? "" : content).split("\n");
  var block = false;
  for (var i = 0; i < lines.length; i++) {
    if (BLOCK_IN_BOX.test(lines[i])) { block = true; break; }
  }
  if (block) return renderWikiText(content);
  return inlineFormat(content).replace(/\n/g, "<br>");
}

// <pre> 본문: 항상 HTML 이스케이프한 뒤, txt/ascii 클래스에 한해
// '''굵게''' 와 [[링크]] / [[키|표시]] 만 추가로 처리한다 (c/asm/sh/무클래스는 완전 raw).
function formatPre(src, cls) {
  var out = String(src == null ? "" : src)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  var classes = String(cls || "").split(/\s+/);
  if (classes.indexOf("txt") === -1 && classes.indexOf("ascii") === -1) return out;

  out = out.replace(/\[\[([^\|\]\n]+)\|([^\]\n]+)\]\]/g, function (m, key, label) {
    return wikiLink(key, label);
  });
  out = out.replace(/\[\[([^\]\n]+)\]\]/g, function (m, key) {
    return wikiLink(key, null);
  });
  out = out.replace(/'''([\s\S]+?)'''/g, "<strong>$1</strong>");
  return out;
}

function wikiLink(key, label) {
  key = key.trim();
  var exists = typeof ARTICLES !== "undefined" && !!ARTICLES[key];
  if (label === null || label === undefined) label = exists ? ARTICLES[key].title : key;
  return '<a href="#' + encodeURIComponent(key) + '" class="' +
    (exists ? "wiki" : "wiki wiki-stub") + '">' + label + "</a>";
}

// ------------------------------------------------------------
// 인라인 문법
// ------------------------------------------------------------
function inlineFormat(text) {
  text = String(text == null ? "" : text);

  // [[sim:name]] — 시뮬레이터 자리
  text = text.replace(/\[\[sim:([^\]\|]+)\]\]/g, function (m, name) {
    return '<div class="sim" data-sim="' + name.trim() + '"></div>';
  });

  // [[anim:name|caption]] — 움직이는 그림 자리 (caption 은 인라인 위키 문법 허용)
  text = text.replace(/\[\[anim:([^\]\|\n]+)(?:\|([^\n]*?))?\]\]/g, function (m, name, caption) {
    var cap = (caption || "").replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
    return '<div class="anim" data-anim="' + name.trim() + '" data-caption="' + cap + '"></div>';
  });

  // [[img:file|caption|size]] — caption 안에 ']' 가 들어갈 수 있다 (예: prio_to_weight[40])
  text = text.replace(/\[\[img:([^\|\]\n]+)(?:\|([^\n]*?))?(?:\|(small|medium|large))?\]\]/g,
    function (m, fname, caption, size) {
      var cls = size || "medium";
      var cap = caption ? "<figcaption>" + caption + "</figcaption>" : "";
      return '<figure class="pdf-img ' + cls + '"><img src="images/' + fname.trim() +
        '" alt="' + (caption || fname) + '" loading="lazy">' + cap + "</figure>";
    });

  // [[key|label]]
  text = text.replace(/\[\[([^\|\]]+)\|([^\]]+)\]\]/g, function (m, key, label) {
    return wikiLink(key, label);
  });
  // [[key]]
  text = text.replace(/\[\[([^\]]+)\]\]/g, function (m, key) {
    return wikiLink(key, null);
  });

  // 굵게 먼저(3따옴표), 그 다음 기울임(2따옴표).
  // 본문에 아포스트로피가 섞여도(We'll, Don't, Little's) 끊기지 않도록 lazy 매칭.
  text = text.replace(/'''([\s\S]+?)'''/g, "<strong>$1</strong>");
  text = text.replace(/''([^\n'](?:[\s\S]*?[^\n'])?)''/g, "<em>$1</em>");
  text = text.replace(/`([^`]+)`/g, function (m, code) {
    return "<code>" + code.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;") + "</code>";
  });
  return text;
}
if (typeof window !== "undefined") window.inlineFormat = inlineFormat;

// ------------------------------------------------------------
// 목차 / 검색 / 라우팅
// ------------------------------------------------------------
function renderTOC() {
  var tocList = document.getElementById("tocList");
  if (!tocList) return;
  var headings = document.querySelectorAll("main h2, main h3");
  tocList.innerHTML = "";
  headings.forEach(function (h) {
    var li = document.createElement("li");
    li.className = "toc-item " + (h.tagName === "H2" ? "l2" : "l3");
    var a = document.createElement("a");
    a.href = "#" + h.id;
    a.textContent = h.textContent;
    a.style.color = "#1d65b3";
    a.style.textDecoration = "none";
    a.style.fontSize = "12px";
    a.addEventListener("click", function (ev) {
      ev.preventDefault();
      var target = document.getElementById(h.id);
      if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    li.appendChild(a);
    tocList.appendChild(li);
  });
}

document.getElementById("searchBox").addEventListener("input", function (e) {
  var q = e.target.value.trim().toLowerCase();
  var nav = document.getElementById("navList");
  if (q === "") { renderNav(currentArticle()); return; }
  nav.innerHTML = "";
  var hits = 0;
  Object.keys(ARTICLES).forEach(function (key) {
    var art = ARTICLES[key];
    var haystack = (key + " " + art.title + " " + art.body).toLowerCase();
    if (haystack.indexOf(q) !== -1) {
      hits++;
      var li = document.createElement("li");
      var a = document.createElement("a");
      a.href = "#" + encodeURIComponent(key);
      a.textContent = art.title;
      li.appendChild(a);
      nav.appendChild(li);
    }
  });
  if (!hits) {
    var li0 = document.createElement("li");
    li0.style.cssText = "color:#999; font-size:12px; padding:6px 4px;";
    li0.textContent = "검색 결과 없음";
    nav.appendChild(li0);
  }
});

function currentArticle() {
  var hash = decodeURIComponent(location.hash.substring(1));
  return ARTICLES[hash] ? hash : "main";
}

// 디버그/검증용: index.html?anim=이름&animt=초  → 그 애니메이션 하나만 그 시각에 멈춘 상태로 렌더
//              index.html?animt=초#문서    → 문서 안의 모든 애니메이션을 t초에 멈춤 (스크린샷용)
var QUERY = (function () {
  var q = {};
  try {
    String(location.search || "").replace(/^\?/, "").split("&").forEach(function (kv) {
      if (!kv) return;
      var i = kv.indexOf("=");
      q[decodeURIComponent(i < 0 ? kv : kv.slice(0, i))] = decodeURIComponent(i < 0 ? "" : kv.slice(i + 1));
    });
  } catch (e) { /* ignore */ }
  return q;
})();
if (typeof window !== "undefined") window.ANIM_FREEZE_AT = (QUERY.animt !== undefined) ? parseFloat(QUERY.animt) : null;

function renderSingleAnim(name) {
  var area = document.getElementById("articleArea");
  area.innerHTML = "";
  if (!/^[a-z0-9_]+$/.test(name)) { area.textContent = "잘못된 anim 이름"; return; }
  var node = document.createElement("div");
  node.className = "anim";
  node.setAttribute("data-anim", name);
  area.appendChild(node);
  mountAnims(area);
  renderNav("main");
  renderTOC();
}

window.addEventListener("hashchange", function () { renderArticle(currentArticle()); });
if (QUERY.anim) renderSingleAnim(QUERY.anim); else renderArticle(currentArticle());

// KaTeX 는 defer 로 로드되므로, 첫 렌더 시점엔 아직 없을 수 있다 → load 후 한 번 더.
window.addEventListener("load", function () {
  renderMath(document.getElementById("articleArea"));
});

// 모바일 문서 목록 토글 (☰). 문서로 이동하면 자동으로 닫는다.
(function(){
  const btn=document.getElementById("navToggle");
  if(!btn) return;
  btn.addEventListener("click",()=>document.body.classList.toggle("nav-open"));
  window.addEventListener("hashchange",()=>document.body.classList.remove("nav-open"));
})();
