// ============================================================
// 운체위키 renderer — 위키 문법 → HTML, 네비/검색/목차/시뮬레이터
// ARTICLES, NAV_ORDER 는 build.py 가 앞쪽에 삽입한다.
// ============================================================

var BOX_TYPES = ["info", "warn", "tip", "joke", "analogy", "def", "quiz", "exam"];

function renderNav(active) {
  var nav = document.getElementById("navList");
  nav.innerHTML = "";
  (typeof NAV_ORDER !== "undefined" ? NAV_ORDER : []).forEach(function (group) {
    var groupHeader = document.createElement("li");
    var gdiv = document.createElement("div");
    gdiv.style.cssText = "font-weight:700; color:#34466b; padding:6px 4px 2px; font-size:12px;";
    gdiv.textContent = group.group;
    groupHeader.appendChild(gdiv);
    nav.appendChild(groupHeader);
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
    var t = "<table>";
    tableRows.forEach(function (row) {
      t += "<tr>";
      row.cells.forEach(function (c) {
        var tag = c.header ? "th" : "td";
        t += "<" + tag + ">" + inlineFormat(c.text.trim()) + "</" + tag + ">";
      });
      t += "</tr>";
    });
    t += "</table>";
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
        html += '<pre class="' + preClass + '">' + escapeCode(preContent.replace(/\n$/, "")) + "</pre>";
        inPre = false;
      } else {
        preContent += line + "\n";
      }
      continue;
    }

    // ---- 한 줄짜리 박스 ----
    var boxOne = line.match(/^\{(info|warn|tip|joke|analogy|def|quiz|exam)\}(.*)\{\/\1\}\s*$/);
    if (boxOne) {
      closeList(); flushTable();
      html += '<div class="' + boxOne[1] + '">' + inlineFormat(boxOne[2]) + "</div>";
      continue;
    }
    var ansOne = line.match(/^\{answer\}(.*)\{\/answer\}\s*$/);
    if (ansOne) {
      closeList(); flushTable();
      html += '<details class="answer"><summary>정답 보기</summary>' + inlineFormat(ansOne[1]) + "</details>";
      continue;
    }

    // ---- 여러 줄 박스 ----
    var boxStart = line.match(/^\{(info|warn|tip|joke|analogy|def|quiz|exam|answer)\}(.*)$/);
    if (boxStart && line.indexOf("{/") === -1) {
      closeList(); flushTable();
      var cls = boxStart[1];
      var content = boxStart[2];
      var closeRe = new RegExp("\\{/" + cls + "\\}\\s*$");
      while (++i < lines.length) {
        var next = lines[i];
        if (closeRe.test(next)) {
          content += "\n" + next.replace(closeRe, "");
          break;
        }
        content += "\n" + next;
      }
      var inner = inlineFormat(content).replace(/\n/g, "<br>");
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
    if (/^\[\[(img|sim):.*\]\]$/.test(trimmed)) {
      html += inlineFormat(trimmed);
      continue;
    }

    html += "<p>" + inlineFormat(line) + "</p>";
  }
  closeList(); flushTable();
  if (inPre) html += '<pre class="' + preClass + '">' + escapeCode(preContent) + "</pre>";
  return html;
}

function headingId(text) {
  return "h_" + String(text).replace(/\s/g, "_");
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

  // [[img:file|caption|size]]
  text = text.replace(/\[\[img:([^\|\]]+)(?:\|([^\|\]]*))?(?:\|(small|medium|large))?\]\]/g,
    function (m, fname, caption, size) {
      var cls = size || "medium";
      var cap = caption ? "<figcaption>" + caption + "</figcaption>" : "";
      return '<figure class="pdf-img ' + cls + '"><img src="images/' + fname.trim() +
        '" alt="' + (caption || fname) + '" loading="lazy">' + cap + "</figure>";
    });

  // [[key|label]]
  text = text.replace(/\[\[([^\|\]]+)\|([^\]]+)\]\]/g, function (m, key, label) {
    var exists = typeof ARTICLES !== "undefined" && !!ARTICLES[key];
    return '<a href="#' + encodeURIComponent(key) + '" class="' +
      (exists ? "wiki" : "wiki wiki-stub") + '">' + label + "</a>";
  });
  // [[key]]
  text = text.replace(/\[\[([^\]]+)\]\]/g, function (m, key) {
    var exists = typeof ARTICLES !== "undefined" && !!ARTICLES[key];
    var label = exists ? ARTICLES[key].title : key;
    return '<a href="#' + encodeURIComponent(key) + '" class="' +
      (exists ? "wiki" : "wiki wiki-stub") + '">' + label + "</a>";
  });

  text = text.replace(/'''([^']+)'''/g, "<strong>$1</strong>");
  text = text.replace(/''([^']+)''/g, "<em>$1</em>");
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

window.addEventListener("hashchange", function () { renderArticle(currentArticle()); });
renderArticle(currentArticle());

// KaTeX 는 defer 로 로드되므로, 첫 렌더 시점엔 아직 없을 수 있다 → load 후 한 번 더.
window.addEventListener("load", function () {
  renderMath(document.getElementById("articleArea"));
});
