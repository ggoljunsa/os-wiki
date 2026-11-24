// ============================================================
// 위키 검색 (2026-11-24) — algo/os/cn-final/psy 위키 공통 모듈.
// 원본: study/2학기/_tools/wiki_search/search.js → 각 repo src/search.js 로 복사 (네 곳 같은 파일).
// build.py 가 renderer.js 뒤에 붙인다. ARTICLES / NAV_ORDER 는 같은 script 태그 안의 전역.
//
//  1. 검색 오버레이 — 폰(≤900px·터치)은 헤더 검색창을 누르면 전체 화면, PC 는 검색창 아래 드롭다운.
//  2. 인덱스 — 문서 body 에서 위키 마크업을 벗긴 평문(제목·절 제목·본문·각주)을 첫 검색 전에 한 번 만든다.
//     비교는 소문자 + 공백·하이픈·가운뎃점·괄호 등을 지운 "compact" 문자열로 한다.
//     "Full Term (ABBR)" / "ABBR (Full Term)" 꼴을 본문에서 모아 약어 ↔ full term 을 서로 바꿔 찾는다.
//  3. 순위 — 제목 완전 일치 1000 > 제목 시작 600 > 제목에 모든 단어 300 > 절 제목 150 > 본문 횟수(≤120).
//     여러 단어는 AND. 지금 사이드바 탭(기말/중간…)의 문서는 +25.
//  4. 결과를 누르면 그 문서로 가서 문서 안 찾기 바(Ctrl+F 대체)를 그 검색어로 연다.
// 노드 테스트(src/test_search.js)는 WikiSearch.* 순수 함수만 쓴다 — DOM 부분은 document 가 진짜일 때만 돈다.
// ============================================================
(function (root) {
  "use strict";

  // ---------- 정규화 ----------
  // 비교에서 무시하는 글자: 공백, 하이픈·대시, 가운뎃점, 괄호, 밑줄, 슬래시, 따옴표. 줄바꿈은 남긴다(문단 경계).
  var SEP_CLASS = "[ \\t\\u00a0\\u3000\\-\\u2010-\\u2015\\u00b7\\u2022\\u2219\\u30fb\\uff65()\\uff08\\uff09\\[\\]_/'\"`\\u2018\\u2019\\u201c\\u201d]";
  var SEP_G = new RegExp(SEP_CLASS, "g");
  var SEP_ANY = SEP_CLASS + "*";
  // 한글 낱말 사이 띄어쓰기는 strict 비교에서 남긴다 ("동조" 가 "행동 조성" 에 걸리지 않게). loose 는 다 지운다.
  var SEP_NOWS = "[\\-\\u2010-\\u2015\\u00b7\\u2022\\u2219\\u30fb\\uff65()\\uff08\\uff09\\[\\]_/'\"`\\u2018\\u2019\\u201c\\u201d]*";
  var HANGUL = /[ㄱ-ㆎ가-힣]/;
  var HANGUL_GAP = /([ㄱ-ㆎ가-힣])[ \t 　]+(?=[ㄱ-ㆎ가-힣])/g;

  function nfc(s) { s = String(s == null ? "" : s); return s.normalize ? s.normalize("NFC") : s; }
  function compact(s) { return nfc(s).toLowerCase().replace(SEP_G, ""); }
  function strictCompact(s) { return nfc(s).toLowerCase().replace(HANGUL_GAP, "$1\u0001").replace(SEP_G, ""); }
  function reEsc(c) { return c.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }
  function escHtml(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }

  // compact 문자열 하나 → 원문에서 그 글자들 사이에 구분 글자가 끼어도 맞는 정규식 조각
  // strict 이면 한글-한글 사이에는 공백을 끼우지 않는다.
  function loosePattern(c, strict) {
    var ch = Array.from(c), out = ch.length ? reEsc(ch[0]) : "";
    for (var i = 1; i < ch.length; i++) {
      out += (strict && HANGUL.test(ch[i - 1]) && HANGUL.test(ch[i]) ? SEP_NOWS : SEP_ANY) + reEsc(ch[i]);
    }
    return out;
  }
  function makeRegex(alts, flags, strict) {
    var list = alts.filter(Boolean).slice().sort(function (a, b) { return b.length - a.length; });
    if (!list.length) return null;
    return new RegExp(list.map(function (c) { return loosePattern(c, strict); }).join("|"), flags || "gi");
  }

  // ---------- 마크업 → 평문 ----------
  // 인라인 위키 문법 → 평문. 여러 줄을 한꺼번에 넣어도 되도록 모든 패턴이 줄바꿈을 넘지 않는다.
  function stripRaw(s) {
    s = String(s);
    s = s.replace(/\[\[sim:[^\]\n]*\]\]/g, " ");
    s = s.replace(/\[\[anim:[^\]|\n]+(?:\|([^\n]*?))?\]\]/g, function (m, c) { return " " + (c || "") + " "; });
    s = s.replace(/\[\[img:[^|\]\n]+(?:\|([^\n]*?))?(?:\|(?:small|medium|large))?\]\]/g, function (m, c) { return " " + (c || "") + " "; });
    s = s.replace(/\[\[([^\]|\n]+)\|([^\]\n]+)\]\]/g, "$2");
    s = s.replace(/\[\[([^\]\n]+)\]\]/g, "$1");
    s = s.replace(/\[\*[ \t]*((?:[^\[\]\n]|\[[^\[\]\n]*\])*)\]/g, " ($1) ");     // [* 각주]
    s = s.replace(/\$\$?([^$\n]*)\$\$?/g, function (m, x) {                      // $수식$ → 읽을 수 있는 글자만
      return x.replace(/\\(?:mathrm|text|mathbf|operatorname)\b/g, "").replace(/\\([a-zA-Z]+)/g, " $1 ").replace(/[{}^\\]/g, " ").replace(/_/g, " ");
    });
    s = s.replace(/'''|''/g, "").replace(/~~/g, "").replace(/`/g, "");
    s = s.replace(/<[^>\n]{1,200}>/g, " ");
    s = s.replace(/&nbsp;/g, " ").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
    s = s.replace(/\{\/?(?:info|warn|tip|joke|analogy|def|quiz|exam|answer|mini|footnotes)\}/g, " ");
    return s.replace(/[ \t]{2,}/g, " ");
  }
  function stripInline(s) { return stripRaw(s).trim(); }

  // body → { text, heads:[{pos, text, c, s}] }. text 는 줄(\n)이 문단 경계.
  // 속도를 위해 줄 구조(표·목록·절 제목·pre)만 줄마다 보고, 인라인 정리는 pre 밖 덩어리째 한 번에 한다.
  function plainOf(body) {
    var lines = String(body == null ? "" : body).split("\n");
    var out = [], buf = [], inPre = false;
    function flush() {
      if (!buf.length) return;
      out.push(stripRaw(buf.join("\n")));
      buf = [];
    }
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      if (!inPre && /^<pre\b/.test(line)) { flush(); inPre = true; continue; }
      if (inPre) {
        if (line.indexOf("</pre>") === 0) inPre = false;
        else out.push(line.replace(/'''/g, "").replace(/\[\[(?:[^\]|\n]*\|)?([^\]\n]*)\]\]/g, "$1"));
        continue;
      }
      var hm = line.match(/^(={2,4}) (.*) \1\s*$/);
      if (hm) { buf.push("\u0002" + hm[2]); continue; }
      if (/^\{\||^\|\}|^\|-|^----+\s*$/.test(line)) continue;
      if (/^[!|]/.test(line)) line = line.substring(1).split("||").join("  ·  ");
      buf.push(line.replace(/^[*#]+\s+/, ""));
    }
    flush();
    var text = nfc(out.join("\n")).replace(/^[ \t]+|[ \t]+$/gm, "").replace(/\n{2,}/g, "\n").replace(/^\n+|\n+$/g, "");
    var heads = [], parts = text.split("\u0002"), acc = parts[0];
    for (var k = 1; k < parts.length; k++) {
      var nl = parts[k].indexOf("\n");
      var ht = (nl === -1 ? parts[k] : parts[k].slice(0, nl)).trim();
      heads.push({ pos: acc.length, text: ht, c: compact(ht), s: strictCompact(ht) });
      acc += parts[k];
    }
    return { text: acc, heads: heads };
  }

  // ---------- 약어 ↔ full term ----------
  var FULL_WORDS = "[A-Za-z][A-Za-z'\\u2019]*(?:[ \\-][A-Za-z][A-Za-z'\\u2019]*){1,7}";
  var RE_FULL_ABBR = new RegExp("(" + FULL_WORDS + ")\\s*[(（]\\s*([A-Z][A-Za-z0-9]{1,9})\\s*[,)）;]", "g");
  var RE_ABBR_FULL = new RegExp("\\b([A-Z][A-Z0-9]{1,9})s?\\s*[(（]\\s*(" + FULL_WORDS + ")\\s*[,)）;]", "g");

  // 단어 머리글자가 약어와 같아지도록 앞쪽 단어를 잘라 본다. 맞으면 full term, 아니면 null.
  function fitInitials(full, abbr) {
    var a = abbr.toLowerCase().replace(/[^a-z]/g, "");
    if (a.length < 2) return null;
    var words = full.split(/[ \-]+/).filter(Boolean);
    for (var i = 0; i <= words.length - 2; i++) {
      var ws = words.slice(i);
      var ini = ws.map(function (w) { return w.charAt(0).toLowerCase(); }).join("");
      if (ini === a) return ws.join(" ");
      if (ws.length < a.length - 1) break;
    }
    return null;
  }

  function addAlias(map, a, b) {
    if (!a || !b || a === b) return;
    (map[a] = map[a] || {})[b] = 1;
    (map[b] = map[b] || {})[a] = 1;
  }

  function collectAliases(texts) {
    var map = {}, m, f;
    texts.forEach(function (t) {
      RE_FULL_ABBR.lastIndex = 0;
      while ((m = RE_FULL_ABBR.exec(t))) { f = fitInitials(m[1], m[2]); if (f) addAlias(map, compact(m[2]), compact(f)); }
      RE_ABBR_FULL.lastIndex = 0;
      while ((m = RE_ABBR_FULL.exec(t))) { f = fitInitials(m[2], m[1]); if (f) addAlias(map, compact(m[1]), compact(f)); }
    });
    var out = {};
    Object.keys(map).forEach(function (k) { out[k] = Object.keys(map[k]); });
    return out;
  }

  // ---------- 인덱스 ----------
  function buildIndex(articles, navOrder) {
    var t0 = Date.now();
    var groupOfKey = {};
    (navOrder || []).forEach(function (g) {
      var sec = g.section || (typeof root.navSectionOf === "function" ? root.navSectionOf(g.group) : "");
      (g.items || []).forEach(function (k) { if (!groupOfKey[k]) groupOfKey[k] = { group: g.group, section: sec }; });
    });
    var docs = [];
    Object.keys(articles).forEach(function (key) {
      var a = articles[key];
      var title = nfc(stripInline(a.title || key));
      var name = title.split(" — ")[0];
      var p = plainOf(a.body);
      var sC = p.text.toLowerCase().replace(HANGUL_GAP, "$1\u0001").replace(SEP_G, "");
      var g = groupOfKey[key] || { group: (a.category && a.category[0]) || "", section: "" };
      docs.push({
        key: key, title: title, name: name, group: g.group, section: g.section,
        kC: compact(key), tC: compact(title), nC: compact(name),
        kS: strictCompact(key), tS: strictCompact(title), nS: strictCompact(name),
        text: p.text, heads: p.heads, s: sC, c: sC.split("\u0001").join("")
      });
    });
    // 약어 후보는 괄호와 대문자 두 글자가 함께 있는 줄에만 있다 — 그 줄만 정규식에 넣는다
    var cand = [];
    docs.forEach(function (d) {
      (d.title + "\n" + d.text).split("\n").forEach(function (l) {
        if ((l.indexOf("(") !== -1 || l.indexOf("\uff08") !== -1) && /[A-Z][A-Z0-9]/.test(l)) cand.push(l);
      });
    });
    var aliases = collectAliases(cand);
    return { docs: docs, aliases: aliases, ms: Date.now() - t0 };
  }

  // ---------- 질의 ----------
  // "tlb  miss" → [{c:"tlb", alts:["tlb","translationlookasidebuffer"]}, {c:"miss", alts:["miss"]}]
  // 질의 전체가 약어/full term 이면 단어로 쪼개지 않고 하나의 term 으로 본다.
  function parseQuery(q, idx) {
    q = nfc(q).trim();
    var whole = compact(q);
    if (!whole) return null;
    var al = (idx && idx.aliases) || {};
    var words = q.split(/\s+/).map(compact).filter(Boolean);
    var seen = {}, terms = [];
    if (words.length > 1 && al[whole]) words = [whole];
    words.forEach(function (w) {
      if (seen[w]) return; seen[w] = 1;
      terms.push({ c: w, alts: [w].concat(al[w] || []) });
    });
    return { q: q, whole: whole, wholeS: strictCompact(q), terms: terms };
  }

  function countIn(hay, needle, cap) {
    var n = 0, i = hay.indexOf(needle);
    while (i !== -1 && n < cap) { n++; i = hay.indexOf(needle, i + needle.length); }
    return n;
  }
  function anyIn(hay, alts) {
    for (var i = 0; i < alts.length; i++) if (hay.indexOf(alts[i]) !== -1) return true;
    return false;
  }

  // 결과: [{doc, score, head}] 점수 내림차순. opts.section = 지금 탭.
  // strict(한글 띄어쓰기 유지) 일치가 기본 점수, loose(띄어쓰기 전부 무시)만 맞으면 약하게.
  function search(idx, q, opts) {
    opts = opts || {};
    var pq = typeof q === "string" ? parseQuery(q, idx) : q;
    if (!pq || !pq.terms.length) return [];
    var terms = pq.terms;
    var exS = terms.length === 1 ? terms[0].alts.concat([pq.wholeS]) : [pq.wholeS];
    var exL = terms.length === 1 ? terms[0].alts : [pq.whole];
    function eq(d, w, kind) { return kind ? (d.nS === w || d.tS === w || d.kS === w) : (d.nC === w || d.tC === w || d.kC === w); }
    function st(d, w, kind) { return kind ? (d.nS.indexOf(w) === 0 || d.tS.indexOf(w) === 0 || d.kS.indexOf(w) === 0) : (d.nC.indexOf(w) === 0 || d.tC.indexOf(w) === 0 || d.kC.indexOf(w) === 0); }
    var res = [];
    for (var di = 0; di < idx.docs.length; di++) {
      var d = idx.docs[di], ok = true, inTitleN = 0, looseTitleN = 0, body = 0;
      for (var ti = 0; ti < terms.length; ti++) {
        var t = terms[ti], ai;
        var inT = anyIn(d.tS, t.alts) || anyIn(d.kS, t.alts);
        var inTl = !inT && (anyIn(d.tC, t.alts) || anyIn(d.kC, t.alts));
        var cnt = 0, cntL = 0;
        for (ai = 0; ai < t.alts.length; ai++) cnt += countIn(d.s, t.alts[ai], 40);
        if (!cnt) for (ai = 0; ai < t.alts.length; ai++) cntL += countIn(d.c, t.alts[ai], 40);
        if (!inT && !inTl && !cnt && !cntL) { ok = false; break; }
        if (inT) inTitleN++; else if (inTl) looseTitleN++;
        body += cnt ? 12 * Math.log(1 + Math.min(cnt, 40)) / Math.LN2 : 3 * Math.log(1 + Math.min(cntL, 40)) / Math.LN2;
      }
      if (!ok) continue;
      var s = 0, w;
      if (exS.some(function (w) { return eq(d, w, 1); })) s += 1000;
      else if (exL.some(function (w) { return eq(d, w, 0); })) s += 950;
      else if (exS.some(function (w) { return st(d, w, 1); })) s += 600;
      else if (exL.some(function (w) { return st(d, w, 0) && !HANGUL.test(w.charAt(0)); })) s += 550;
      else if (inTitleN === terms.length) s += 300;
      else s += 40 * inTitleN + 5 * looseTitleN;
      var head = null;
      for (var hi = 0; hi < d.heads.length && !head; hi++) {
        var hs = d.heads[hi].s, all = true;
        for (var tj = 0; tj < terms.length; tj++) if (!anyIn(hs, terms[tj].alts)) { all = false; break; }
        if (all) head = d.heads[hi];
      }
      var titleTier = s;
      if (head && s < 300) s += 150;
      s += Math.min(body, 120);
      if (opts.section && d.section === opts.section) s += 25;
      s += 4 / (1 + d.tC.length / 16);   // 같은 점수면 짧은 제목 먼저
      // jump: 결과를 누르면 이 절로 스크롤 (제목이 이미 맞은 문서는 본문 첫 일치부터)
      res.push({ doc: d, score: s, head: head, jump: titleTier < 300 ? head : null });
    }
    res.sort(function (a, b) { return b.score - a.score || a.doc.tC.length - b.doc.tC.length; });
    return res;
  }

  function allAlts(pq) {
    var a = [];
    pq.terms.forEach(function (t) { a = a.concat(t.alts); });
    return a;
  }

  // 원문 text 를 그대로 잘라 HTML 로 (일치 부분 <mark>)
  function highlight(text, re) {
    if (!re) return escHtml(text);
    var out = "", last = 0, m;
    re.lastIndex = 0;
    while ((m = re.exec(text))) {
      if (!m[0].length) { re.lastIndex++; continue; }
      out += escHtml(text.slice(last, m.index)) + "<mark>" + escHtml(m[0]) + "</mark>";
      last = m.index + m[0].length;
    }
    return out + escHtml(text.slice(last));
  }

  // 일치 문장 스니펫 최대 n 개: [{html, pos, head}] — 앞뒤 ~40자, 줄(문단) 경계에서 자른다.
  function snippets(doc, pq, n, radius) {
    n = n || 2; radius = radius || 40;
    var re = makeRegex(allAlts(pq), "gi", true);
    if (!re) return [];
    re.lastIndex = 0;
    if (!re.test(doc.text)) re = makeRegex(allAlts(pq), "gi", false);
    var text = doc.text, out = [], m, lastEnd = -1e9, headLines = {}, skipped = [];
    // 절 제목 줄은 결과 행에 "§ 절 제목" 으로 따로 보이므로 스니펫에서는 본문 문장을 먼저 고른다
    doc.heads.forEach(function (h) { headLines[h.pos] = 1; });
    re.lastIndex = 0;
    while (out.length < n) {
      m = re.exec(text);
      if (!m) { if (!skipped.length) break; m = skipped.shift(); re.lastIndex = text.length; }
      if (!m[0].length) { re.lastIndex++; continue; }
      if (m.index < lastEnd) continue;
      var ls = text.lastIndexOf("\n", m.index) + 1;
      if (headLines[ls] && !m.fallback) { var cp = [m[0]]; cp.index = m.index; cp.fallback = 1; skipped.push(cp); re.lastIndex = text.indexOf("\n", m.index) === -1 ? text.length : text.indexOf("\n", m.index); continue; }
      var le = text.indexOf("\n", m.index); if (le === -1) le = text.length;
      var s = Math.max(ls, m.index - radius), e = Math.min(le, m.index + m[0].length + radius);
      // 단어 중간에서 자르지 않도록 가까운 공백까지 넓힌다 (최대 12자)
      for (var k = 0; k < 12 && s > ls && !/\s/.test(text.charAt(s - 1)); k++) s--;
      for (k = 0; k < 12 && e < le && !/\s/.test(text.charAt(e)); k++) e++;
      var piece = text.slice(s, e);
      var head = null;
      for (var h = doc.heads.length - 1; h >= 0; h--) if (doc.heads[h].pos <= m.index) { head = doc.heads[h]; break; }
      out.push({ html: (s > ls ? "…" : "") + highlight(piece, re) + (e < le ? "…" : ""), pos: m.index, head: head });
      lastEnd = e;
      re.lastIndex = e;
    }
    return out;
  }

  var API = {
    compact: compact, strictCompact: strictCompact, plainOf: plainOf, stripInline: stripInline, collectAliases: collectAliases,
    fitInitials: fitInitials, buildIndex: buildIndex, parseQuery: parseQuery, search: search,
    snippets: snippets, highlight: highlight, makeRegex: makeRegex, allAlts: allAlts, SEP_CLASS: SEP_CLASS
  };
  root.WikiSearch = API;
  if (typeof module !== "undefined" && module.exports) module.exports = API;

  // ============================================================
  // DOM — 진짜 브라우저에서만 (test_render.js 의 가짜 document 에서는 건너뛴다)
  // ============================================================
  var doc = root.document;
  if (!doc || !doc.body || typeof doc.createTreeWalker !== "function" || typeof root.matchMedia !== "function") return;
  var box = doc.getElementById("searchBox");
  var area = doc.getElementById("articleArea");
  if (!box || !area || typeof ARTICLES === "undefined") return;

  var NAVO = typeof NAV_ORDER !== "undefined" ? NAV_ORDER : [];
  var logoEl = doc.querySelector("header.top .logo");
  var SITE = (logoEl ? logoEl.textContent : "wiki").replace(/\s+/g, "");
  var RECENT_KEY = "ws-recent:" + SITE;
  var SHORTCUTS = ["main", "시험 정보", "자주 틀리는 함정 모음", "기말 시험 대비", "공식·점화식 모음", "명칭 암기표", "락 그림 요약"];
  var PAGE = 50;
  var mqOverlay = root.matchMedia("(max-width: 900px), (pointer: coarse)");
  function overlayMode() { return mqOverlay.matches; }

  var IDX = null;
  function index() {
    if (!IDX) { IDX = buildIndex(ARTICLES, NAVO); root.__wsIndexMs = IDX.ms; }
    return IDX;
  }

  // ---------- CSS ----------
  var css = [
    "header.top .search{position:relative}",
    "header.top .search input::-webkit-search-cancel-button{-webkit-appearance:none}",
    ".ws-mark,mark.ws-hl{background:#ffe066;color:#111;border-radius:2px;padding:0 1px}",
    "mark.ws-hl.ws-cur{background:#ff9a3c;color:#000;box-shadow:0 0 0 2px #ff9a3c}",
    ".ws-res mark{background:#ffe066;color:#111;border-radius:2px;padding:0 1px}",
    "body.ws-lock{overflow:hidden}",
    // 오버레이 (폰)
    ".ws-ov{position:fixed;inset:0;z-index:1000;background:var(--bg,#f5f5f5);color:var(--text,#222);display:flex;flex-direction:column;height:100%;height:100dvh}",
    ".ws-ov[hidden]{display:none}",
    ".ws-ov-bar{display:flex;align-items:center;gap:6px;padding:8px 8px 8px 4px;padding-top:calc(8px + env(safe-area-inset-top,0px));background:var(--header,#2a3b5a);flex:none}",
    ".ws-ov-bar .ws-back{flex:none;width:44px;height:44px;border:0;background:transparent;color:var(--header-text,#fff);font-size:22px;cursor:pointer;border-radius:8px}",
    ".ws-inbox{flex:1;min-width:0;display:flex;align-items:center;background:#fff;border-radius:10px;height:44px}",
    ".ws-inbox input{flex:1;min-width:0;border:0;outline:0;background:transparent;color:#222;font-size:17px;padding:0 4px 0 12px;height:44px}",
    ".ws-inbox input::-webkit-search-cancel-button{-webkit-appearance:none}",
    ".ws-inbox .ws-clear{flex:none;width:44px;height:44px;border:0;background:transparent;color:#888;font-size:18px;cursor:pointer}",
    ".ws-ov-body{flex:1;overflow-y:auto;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;padding:0 0 calc(24px + env(safe-area-inset-bottom,0px))}",
    // PC 드롭다운
    ".ws-panel{position:absolute;left:0;top:calc(100% + 6px);width:min(560px,calc(100vw - 32px));max-height:72vh;overflow-y:auto;z-index:1000;background:var(--paper,#fff);color:var(--text,#222);border:1px solid var(--border,#d8d8d8);border-radius:8px;box-shadow:0 10px 30px rgba(0,0,0,.25);font-size:14px;line-height:1.5}",
    ".ws-panel[hidden]{display:none}",
    // 결과 공통
    ".ws-res{font-size:15px;line-height:1.5}",
    ".ws-sum{padding:10px 14px 6px;color:var(--muted,#777);font-size:12px}",
    ".ws-h{padding:14px 14px 6px;color:var(--muted,#777);font-size:12px;font-weight:700}",
    ".ws-item{display:block;padding:10px 14px;min-height:44px;color:var(--text,#222);text-decoration:none;border-top:1px solid var(--border,#d8d8d8);background:var(--paper,#fff);overflow-wrap:anywhere}",
    ".ws-item:hover,.ws-item.ws-act{background:var(--table-head,#ecf0f6)}",
    ".ws-ti{font-weight:700;color:var(--link,#1d65b3);font-size:15px}",
    ".ws-ti .ws-sub{font-weight:400;color:var(--muted,#777);font-size:13px}",
    ".ws-meta{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-top:3px;font-size:12px;color:var(--muted,#777)}",
    ".ws-chip{display:inline-block;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;background:var(--code-bg,#f3f3f3);border:1px solid var(--border,#d8d8d8);border-radius:10px;padding:0 8px;font-size:11px;line-height:18px}",
    ".ws-sec{color:var(--text,#222);font-size:12px}",
    ".ws-snip{margin-top:4px;font-size:13px;color:var(--muted,#555);line-height:1.5}",
    ".ws-snip+.ws-snip{margin-top:2px}",
    ".ws-more{display:block;width:calc(100% - 28px);margin:12px 14px;min-height:44px;border:1px solid var(--border,#d8d8d8);border-radius:8px;background:var(--paper,#fff);color:var(--link,#1d65b3);font-size:14px;cursor:pointer}",
    ".ws-row{display:flex;align-items:center;border-top:1px solid var(--border,#d8d8d8);background:var(--paper,#fff)}",
    ".ws-row .ws-item{flex:1;min-width:0;border-top:0;font-weight:400}",
    ".ws-row .ws-del{flex:none;width:44px;height:44px;border:0;background:transparent;color:var(--muted,#999);font-size:15px;cursor:pointer}",
    ".ws-empty{padding:24px 14px;color:var(--muted,#777);font-size:14px}",
    // 문서 안 찾기 바 + 떠 있는 버튼
    ".ws-find{position:fixed;left:0;right:0;bottom:0;z-index:900;display:flex;align-items:center;gap:4px;padding:6px 6px calc(6px + env(safe-area-inset-bottom,0px));background:var(--paper,#fff);border-top:1px solid var(--border,#d8d8d8);box-shadow:0 -4px 16px rgba(0,0,0,.15)}",
    ".ws-find[hidden]{display:none}",
    ".ws-find input{flex:1;min-width:0;height:44px;font-size:16px;padding:0 10px;border:1px solid var(--border,#ccc);border-radius:8px;background:var(--bg,#fff);color:var(--text,#222)}",
    ".ws-find input::-webkit-search-cancel-button{-webkit-appearance:none}",
    ".ws-find .ws-cnt{flex:none;min-width:52px;text-align:center;font-size:13px;color:var(--muted,#777);font-variant-numeric:tabular-nums}",
    ".ws-find button{flex:none;width:44px;height:44px;border:1px solid var(--border,#ccc);border-radius:8px;background:var(--paper,#fff);color:var(--text,#222);font-size:16px;cursor:pointer;padding:0}",
    ".ws-find button:disabled{opacity:.4}",
    "@media (min-width:901px){.ws-find{left:auto;right:16px;bottom:16px;width:440px;border:1px solid var(--border,#ccc);border-radius:10px}}",
    "body.ws-find-open main.article{padding-bottom:90px}",
    ".ws-fab{position:fixed;right:14px;bottom:calc(16px + env(safe-area-inset-bottom,0px));z-index:800;width:52px;height:52px;border-radius:50%;border:0;background:var(--header,#2a3b5a);color:#fff;font-size:22px;box-shadow:0 4px 14px rgba(0,0,0,.3);cursor:pointer;opacity:.92}",
    ".ws-fab[hidden]{display:none}",
    // 다크 (algo 위키의 html[data-theme=dark])
    "html[data-theme=\"dark\"] .ws-inbox{background:#252932}",
    "html[data-theme=\"dark\"] .ws-inbox input{color:var(--text)}",
    "html[data-theme=\"dark\"] .ws-item:hover,html[data-theme=\"dark\"] .ws-item.ws-act{background:#262c38}",
    "html[data-theme=\"dark\"] .ws-res mark,html[data-theme=\"dark\"] mark.ws-hl{background:#c9a400;color:#000}",
    "html[data-theme=\"dark\"] mark.ws-hl.ws-cur{background:#ff9a3c;box-shadow:0 0 0 2px #ff9a3c}",
    "html[data-theme=\"dark\"] .ws-fab{background:#2f4670}"
  ].join("\n");
  var st = doc.createElement("style");
  st.id = "ws-style";
  st.textContent = css;
  doc.head.appendChild(st);

  // ---------- DOM 뼈대 ----------
  function el(tag, cls, html) { var e = doc.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }

  var ov = el("div", "ws-ov");
  ov.hidden = true;
  ov.setAttribute("role", "dialog");
  ov.setAttribute("aria-modal", "true");
  ov.setAttribute("aria-label", "위키 검색");
  ov.innerHTML = '<div class="ws-ov-bar"><button type="button" class="ws-back" aria-label="검색 닫기">←</button>' +
    '<div class="ws-inbox"><input type="search" enterkeyhint="search" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="문서 검색">' +
    '<button type="button" class="ws-clear" aria-label="지우기">✕</button></div></div><div class="ws-ov-body"></div>';
  doc.body.appendChild(ov);
  var ovInput = ov.querySelector("input");
  var ovBody = ov.querySelector(".ws-ov-body");
  ovInput.placeholder = box.getAttribute("placeholder") || "문서 검색";

  var panel = el("div", "ws-panel");
  panel.hidden = true;
  box.parentNode.appendChild(panel);
  box.setAttribute("type", "search");
  box.setAttribute("autocomplete", "off");
  box.setAttribute("enterkeyhint", "search");

  var find = el("div", "ws-find");
  find.hidden = true;
  find.setAttribute("role", "search");
  find.innerHTML = '<input type="search" enterkeyhint="search" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="문서 안에서 찾기" aria-label="문서 안에서 찾기">' +
    '<span class="ws-cnt" aria-live="polite">0/0</span>' +
    '<button type="button" class="ws-prev" aria-label="이전">▲</button><button type="button" class="ws-next" aria-label="다음">▼</button>' +
    '<button type="button" class="ws-x" aria-label="찾기 닫기">✕</button>';
  doc.body.appendChild(find);
  var fInput = find.querySelector("input"), fCnt = find.querySelector(".ws-cnt");
  var fPrev = find.querySelector(".ws-prev"), fNext = find.querySelector(".ws-next");

  var fab = el("button", "ws-fab", "🔎");
  fab.type = "button";
  fab.setAttribute("aria-label", "문서 안에서 찾기");
  fab.title = "문서 안에서 찾기";
  doc.body.appendChild(fab);

  // ---------- 최근 검색어 ----------
  function recentLoad() { try { var a = JSON.parse(localStorage.getItem(RECENT_KEY) || "[]"); return Array.isArray(a) ? a : []; } catch (e) { return []; } }
  function recentSave(a) { try { localStorage.setItem(RECENT_KEY, JSON.stringify(a.slice(0, 5))); } catch (e) {} }
  function recentAdd(q) {
    q = nfc(q).trim(); if (!q) return;
    var a = recentLoad().filter(function (x) { return compact(x) !== compact(q); });
    a.unshift(q); recentSave(a);
  }
  function recentDel(q) { recentSave(recentLoad().filter(function (x) { return x !== q; })); }

  // ---------- 지금 탭 ----------
  function currentSection() {
    var b = doc.querySelector("#navList .nav-tabs button.on, .nav-tab.on");
    if (!b) return "";
    var lab = (b.textContent || "").trim();
    if (typeof NAV_SECTIONS !== "undefined") {
      for (var i = 0; i < NAV_SECTIONS.length; i++) if (NAV_SECTIONS[i].label === lab) return NAV_SECTIONS[i].id;
    }
    return lab;
  }
  function curKey() {
    var h = "";
    try { h = decodeURIComponent(location.hash.substring(1)); } catch (e) {}
    return ARTICLES[h] ? h : "main";
  }

  // ---------- 결과 그리기 ----------
  var state = { q: "", limit: PAGE, results: [], pq: null, act: -1, target: null };

  function titleHtml(d, re) {
    var name = d.name, rest = d.title.length > name.length ? d.title.slice(name.length) : "";
    return highlight(name, re) + (rest ? '<span class="ws-sub">' + highlight(rest, re) + "</span>" : "");
  }

  function itemHtml(r, re, pq, i) {
    var d = r.doc;
    var sn = snippets(d, pq, 2, 40);
    var h = '<a class="ws-item" href="#' + encodeURIComponent(d.key) + '" data-i="' + i + '">';
    h += '<div class="ws-ti">' + titleHtml(d, re) + "</div>";
    h += '<div class="ws-meta">' + (d.group ? '<span class="ws-chip">' + escHtml(d.group) + "</span>" : "") +
      (r.head ? '<span class="ws-sec">§ ' + highlight(r.head.text, re) + "</span>" : "") + "</div>";
    sn.forEach(function (s) { h += '<div class="ws-snip">' + s.html + "</div>"; });
    return h + "</a>";
  }

  function renderEmpty(target) {
    var h = "";
    var rec = recentLoad();
    if (rec.length) {
      h += '<div class="ws-h">최근 검색어</div>';
      rec.forEach(function (q) {
        h += '<div class="ws-row"><a class="ws-item ws-recent" href="javascript:void(0)" data-q="' + escHtml(q) + '">🕘 ' + escHtml(q) + "</a>" +
          '<button type="button" class="ws-del" data-q="' + escHtml(q) + '" aria-label="최근 검색어 지우기">✕</button></div>';
      });
    }
    var sc = SHORTCUTS.filter(function (k) { return ARTICLES[k]; });
    if (sc.length) {
      h += '<div class="ws-h">바로 가기</div>';
      sc.forEach(function (k) {
        h += '<a class="ws-item ws-short" href="#' + encodeURIComponent(k) + '" data-key="' + escHtml(k) + '">📌 ' + escHtml(String(ARTICLES[k].title).split(" — ")[0]) + "</a>";
      });
    }
    h += '<div class="ws-empty">제목·절 제목·본문을 모두 찾습니다. 여러 단어는 모두 들어간 문서만, 띄어쓰기·하이픈·괄호는 무시합니다. 약어와 full term 은 서로 찾아 줍니다 (예: TLB ↔ Translation Lookaside Buffer).</div>';
    target.innerHTML = '<div class="ws-res">' + h + "</div>";
  }

  function runSearch(q, target) {
    state.target = target;
    q = nfc(q);
    if (q !== state.q) { state.limit = PAGE; state.act = -1; }
    state.q = q;
    if (!q.trim()) { state.results = []; state.pq = null; renderEmpty(target); return; }
    var t0 = performance.now();
    var idx = index();
    var pq = parseQuery(q, idx);
    state.pq = pq;
    state.results = pq ? search(idx, pq, { section: currentSection() }) : [];
    var t1 = performance.now();
    drawResults(target);
    root.__wsLastMs = { search: +(t1 - t0).toFixed(1), total: +(performance.now() - t0).toFixed(1), n: state.results.length };
  }

  function drawResults(target) {
    var pq = state.pq, rs = state.results;
    if (!rs.length) {
      target.innerHTML = '<div class="ws-res"><div class="ws-empty">‘' + escHtml(state.q.trim()) + '’ 과(와) 맞는 문서가 없습니다. 단어를 줄이거나 영어/한국어로 바꿔 보세요.</div></div>';
      return;
    }
    var re = makeRegex(allAlts(pq), "gi", true);
    var n = Math.min(rs.length, state.limit);
    var h = '<div class="ws-res"><div class="ws-sum">문서 ' + rs.length + "개" + (rs.length > n ? " · 위에서 " + n + "개" : "") + "</div>";
    for (var i = 0; i < n; i++) h += itemHtml(rs[i], re, pq, i);
    if (rs.length > n) h += '<button type="button" class="ws-more">더 보기 (' + (rs.length - n) + "개 남음)</button>";
    target.innerHTML = h + "</div>";
    setAct(state.act);
  }

  function setAct(i) {
    var items = state.target ? state.target.querySelectorAll(".ws-item[data-i]") : [];
    state.act = Math.max(-1, Math.min(i, items.length - 1));
    for (var k = 0; k < items.length; k++) items[k].classList.toggle("ws-act", k === state.act);
    if (state.act >= 0 && items[state.act].scrollIntoView) items[state.act].scrollIntoView({ block: "nearest" });
  }

  function onResultsClick(ev) {
    var t = ev.target;
    var del = t.closest && t.closest(".ws-del");
    if (del) { ev.preventDefault(); recentDel(del.getAttribute("data-q")); renderEmpty(state.target); return; }
    var more = t.closest && t.closest(".ws-more");
    if (more) { ev.preventDefault(); state.limit += PAGE; drawResults(state.target); return; }
    var rec = t.closest && t.closest(".ws-recent");
    if (rec) {
      ev.preventDefault();
      var q = rec.getAttribute("data-q");
      var inp = state.target === ovBody ? ovInput : box;
      inp.value = q; runSearch(q, state.target); inp.focus();
      return;
    }
    var sh = t.closest && t.closest(".ws-short");
    if (sh) { ev.preventDefault(); choose(sh.getAttribute("data-key"), "", null); return; }
    var a = t.closest && t.closest(".ws-item[data-i]");
    if (a) {
      ev.preventDefault();
      var r = state.results[+a.getAttribute("data-i")];
      if (r) { recentAdd(state.q); choose(r.doc.key, state.q, r.jump); }
    }
  }
  ovBody.addEventListener("click", onResultsClick);
  panel.addEventListener("click", onResultsClick);
  // 패널 안을 누를 때 검색창 blur 로 패널이 먼저 닫히지 않게
  panel.addEventListener("mousedown", function (ev) { ev.preventDefault(); });

  // ---------- 입력 (debounce 120ms) ----------
  var deb = null;
  function debounced(inp, target) {
    clearTimeout(deb);
    deb = setTimeout(function () { runSearch(inp.value, target); }, 120);
  }
  function keyNav(ev, inp, target) {
    if (ev.key === "ArrowDown") { ev.preventDefault(); setAct(state.act + 1); }
    else if (ev.key === "ArrowUp") { ev.preventDefault(); setAct(state.act - 1); }
    else if (ev.key === "Enter") {
      ev.preventDefault();
      clearTimeout(deb);
      if (nfc(inp.value) !== state.q || state.target !== target) runSearch(inp.value, target);
      var r = state.results[state.act >= 0 ? state.act : 0];
      if (r) { recentAdd(state.q); choose(r.doc.key, state.q, r.jump); }
    } else if (ev.key === "Escape") {
      ev.preventDefault();
      if (target === ovBody) closeOverlay(); else closePanel(true);
    }
  }

  // ---------- 폰 오버레이 ----------
  var ovOpen = false, ovPushed = false, pendingGo = null;
  function openOverlay(prefill) {
    if (ovOpen) { ovInput.focus(); return; }
    ovOpen = true;
    closeFind();
    ov.hidden = false;
    doc.body.classList.add("ws-lock");
    fab.hidden = true;
    if (prefill != null) ovInput.value = prefill;
    ovInput.focus();
    try { ovInput.select(); } catch (e) {}
    runSearch(ovInput.value, ovBody);
    try {
      var stt = history.state && typeof history.state === "object" ? history.state : {};
      var copy = {}; for (var k in stt) copy[k] = stt[k];
      copy.wsOverlay = 1;
      history.pushState(copy, "");
      ovPushed = true;
    } catch (e) { ovPushed = false; }
  }
  function hideOverlay() {
    if (!ovOpen) return;
    ovOpen = false;
    ov.hidden = true;
    doc.body.classList.remove("ws-lock");
    ovInput.blur();
    syncFab();
  }
  // 닫기: 넣어 둔 history 항목을 back 으로 걷어낸다 (popstate 에서 마무리)
  function closeOverlay() {
    if (!ovOpen) return;
    if (ovPushed) { ovPushed = false; try { history.back(); return; } catch (e) {} }
    hideOverlay(); flushGo();
  }
  root.addEventListener("popstate", function () {
    if (ovOpen && !(history.state && history.state.wsOverlay)) { ovPushed = false; hideOverlay(); flushGo(); }
  });
  ov.querySelector(".ws-back").addEventListener("click", closeOverlay);
  ov.querySelector(".ws-clear").addEventListener("click", function () { ovInput.value = ""; runSearch("", ovBody); ovInput.focus(); });
  ovInput.addEventListener("input", function () { debounced(ovInput, ovBody); });
  ovInput.addEventListener("keydown", function (ev) { keyNav(ev, ovInput, ovBody); });
  // 결과를 스크롤하면 키보드를 내려 결과가 더 보이게
  ovBody.addEventListener("touchstart", function () { if (doc.activeElement === ovInput) ovInput.blur(); }, { passive: true });

  // ---------- PC 드롭다운 ----------
  function openPanel() { panel.hidden = false; runSearch(box.value, panel); }
  function closePanel(blur) { panel.hidden = true; state.act = -1; if (blur) box.blur(); }
  box.addEventListener("input", function () { if (overlayMode()) return; panel.hidden = false; debounced(box, panel); });
  box.addEventListener("keydown", function (ev) { if (!overlayMode()) { if (panel.hidden) openPanel(); keyNav(ev, box, panel); } });
  box.addEventListener("blur", function () { setTimeout(function () { if (doc.activeElement !== box) closePanel(false); }, 150); });

  // 헤더 검색창: 폰에서는 readOnly 로 두고 누르면 오버레이 (키보드는 오버레이 입력창에서 뜬다)
  function syncMode() { box.readOnly = overlayMode(); if (!overlayMode()) hideOverlay(); syncFab(); }
  if (mqOverlay.addEventListener) mqOverlay.addEventListener("change", syncMode); else if (mqOverlay.addListener) mqOverlay.addListener(syncMode);
  box.addEventListener("click", function (ev) { if (overlayMode()) { ev.preventDefault(); openOverlay(); } });
  box.addEventListener("focus", function () {
    if (overlayMode()) { box.blur(); openOverlay(); }
    else openPanel();
  });

  // ---------- 문서로 이동 ----------
  var pendingFind = null;
  function choose(key, q, head) {
    pendingGo = { key: key, q: q, head: head };
    if (ovOpen) { closeOverlay(); return; }
    closePanel(true);
    flushGo();
  }
  function flushGo() {
    var g = pendingGo; pendingGo = null;
    if (!g) return;
    if (curKey() === g.key && ARTICLES[g.key]) {
      if (g.q) openFind(g.q, g.head, true); else root.scrollTo(0, 0);
      return;
    }
    pendingFind = g.q ? g : null;
    location.hash = "#" + encodeURIComponent(g.key);
  }
  // renderer 의 hashchange(문서 렌더) 다음에 돈다 — 이 파일이 renderer 뒤에 붙으므로
  root.addEventListener("hashchange", function () {
    var pf = pendingFind; pendingFind = null;
    if (pf && pf.key === curKey()) openFind(pf.q, pf.head, true);
    else closeFind();
    syncFab();
  });

  // ============================================================
  // 문서 안 찾기 (Ctrl+F 대체)
  // ============================================================
  var SKIP_SEL = ".sim, .anim, .katex, script, style, svg, sup.fn, .breadcrumb, .meta, .categories, .ws-find, .ws-fab";
  var BLOCK_SEL = "p, li, td, th, h1, h2, h3, h4, h5, pre, figcaption, summary, dt, dd, blockquote, div";
  var F = { q: "", groups: [], cur: -1, userMoved: false };

  function clearMarks() {
    var ms = area.querySelectorAll("mark.ws-hl"), parents = [];
    for (var i = 0; i < ms.length; i++) {
      var m = ms[i], p = m.parentNode;
      if (!p) continue;
      while (m.firstChild) p.insertBefore(m.firstChild, m);
      p.removeChild(m);
      if (parents.indexOf(p) === -1) parents.push(p);
    }
    parents.forEach(function (p) { p.normalize(); });
    F.groups = []; F.cur = -1;
  }

  function findRegexes(q) {
    var idx = index();
    var pq = parseQuery(q, idx);
    if (!pq) return [];
    var whole = [pq.whole].concat(idx.aliases[pq.whole] || []);
    var wholeS = [pq.wholeS].concat(idx.aliases[pq.whole] || []);
    // 구절(띄어쓰기 유지) → 구절(띄어쓰기 무시) → 단어별(유지) → 단어별(무시) 순으로, 처음 걸리는 것을 쓴다
    var list = [makeRegex(wholeS.map(function (x) { return x.replace(/\u0001/g, " "); }), "gi", true), makeRegex(whole, "gi", false)];
    if (pq.terms.length > 1) list.push(makeRegex(allAlts(pq), "gi", true), makeRegex(allAlts(pq), "gi", false));
    return list.filter(Boolean);
  }

  function highlightDoc(q) {
    clearMarks();
    F.q = q;
    if (!compact(q)) return;
    var noKatex = typeof root.renderMathInElement !== "function";
    var nodes = [], starts = [], s = "", lastBlock = null;
    var w = doc.createTreeWalker(area, 4 /* SHOW_TEXT */, {
      acceptNode: function (n) {
        var p = n.parentNode;
        if (!p || !n.nodeValue || (p.closest && p.closest(SKIP_SEL))) return 2;   // REJECT
        if (noKatex && n.nodeValue.indexOf("$") !== -1) return 2;                 // KaTeX 가 아직 안 그린 수식은 건드리지 않음
        return 1;
      }
    });
    var n;
    while ((n = w.nextNode())) {
      var b = n.parentNode.closest ? n.parentNode.closest(BLOCK_SEL) : null;
      if (b !== lastBlock) { if (s) s += "\n"; lastBlock = b; }
      starts.push(s.length); nodes.push(n); s += n.nodeValue;
    }
    var res = findRegexes(q), matches = [];
    for (var r = 0; r < res.length && !matches.length; r++) {
      var re = res[r], m;
      re.lastIndex = 0;
      while ((m = re.exec(s)) && matches.length < 2000) {
        if (!m[0].length) { re.lastIndex++; continue; }
        matches.push([m.index, m.index + m[0].length]);
      }
    }
    // 뒤에서부터 감싸야 앞쪽 text node 의 offset 이 그대로 남는다
    var groups = new Array(matches.length);
    function nodeAt(pos) {
      var lo = 0, hi = starts.length - 1;
      while (lo < hi) { var mid = (lo + hi + 1) >> 1; if (starts[mid] <= pos) lo = mid; else hi = mid - 1; }
      return lo;
    }
    for (var j = matches.length - 1; j >= 0; j--) {
      var ms = matches[j][0], me = matches[j][1], marks = [];
      var k0 = nodeAt(ms), k1 = nodeAt(me - 1);
      for (var k = k1; k >= k0; k--) {
        var node = nodes[k], base = starts[k], L = node.nodeValue.length;
        var a = Math.max(ms, base) - base, e = Math.min(me, base + L) - base;
        if (e <= a) continue;
        var mid2 = a > 0 ? node.splitText(a) : node;
        if (e - a < mid2.nodeValue.length) mid2.splitText(e - a);
        var mk = doc.createElement("mark");
        mk.className = "ws-hl";
        mid2.parentNode.insertBefore(mk, mid2);
        mk.appendChild(mid2);
        marks.unshift(mk);
      }
      groups[j] = marks;
    }
    F.groups = groups.filter(function (g) { return g && g.length; });
  }

  function updateCount() {
    var n = F.groups.length;
    fCnt.textContent = (n ? (F.cur + 1) : 0) + "/" + n;
    fPrev.disabled = fNext.disabled = n === 0;
  }

  function goMatch(i, smooth) {
    var n = F.groups.length;
    if (!n) { F.cur = -1; updateCount(); return; }
    i = ((i % n) + n) % n;
    if (F.cur >= 0 && F.groups[F.cur]) F.groups[F.cur].forEach(function (m) { m.classList.remove("ws-cur"); });
    F.cur = i;
    var g = F.groups[i];
    g.forEach(function (m) { m.classList.add("ws-cur"); });
    // 접힌 정답(details) 안이면 펼친다
    var d = g[0].closest ? g[0].closest("details:not([open])") : null;
    while (d) { d.open = true; d = d.parentNode && d.parentNode.closest ? d.parentNode.closest("details:not([open])") : null; }
    try { g[0].scrollIntoView({ block: "center", behavior: smooth ? "smooth" : "auto" }); } catch (e) { g[0].scrollIntoView(); }
    updateCount();
  }

  // 절 제목이 맞았으면 그 절 안의 첫 일치로
  function firstAfterHead(head) {
    if (!head) {   // 문서 제목(h1) 속 일치는 건너뛰고 본문 첫 일치로
      for (var q = 0; q < F.groups.length; q++) if (!F.groups[q][0].closest("h1")) return q;
      return 0;
    }
    var hs = area.querySelectorAll("h2, h3, h4");
    for (var i = 0; i < hs.length; i++) {
      if (compact(hs[i].textContent) === head.c) {
        for (var j = 0; j < F.groups.length; j++) {
          var m = F.groups[j][0];
          if (hs[i] === m || hs[i].contains(m) || (hs[i].compareDocumentPosition(m) & 4)) return j;
        }
      }
    }
    return firstAfterHead(null);
  }

  var fdeb = null;
  function openFind(q, head, fromSearch) {
    hideOverlay();
    find.hidden = false;
    doc.body.classList.add("ws-find-open");
    fab.hidden = true;
    if (q != null) fInput.value = q;
    if (fromSearch) {
      highlightDoc(fInput.value);
      F.userMoved = false;
      var start = firstAfterHead(head);
      goMatch(start, false);
      // 그림·수식이 늦게 자리를 잡으면 위치가 밀리므로 두 번 더 맞춘다 (사용자가 움직이면 중단)
      [350, 900].forEach(function (t) {
        setTimeout(function () { if (!F.userMoved && F.cur >= 0 && F.groups[F.cur]) try { F.groups[F.cur][0].scrollIntoView({ block: "center" }); } catch (e) {} }, t);
      });
    } else {
      fInput.focus();
      try { fInput.select(); } catch (e) {}
      if (fInput.value) { highlightDoc(fInput.value); goMatch(0, false); } else updateCount();
    }
    positionFind();
  }
  function closeFind() {
    if (find.hidden) return;
    find.hidden = true;
    doc.body.classList.remove("ws-find-open");
    clearMarks();
    fInput.blur();
    syncFab();
  }
  ["touchstart", "wheel"].forEach(function (evn) { root.addEventListener(evn, function () { F.userMoved = true; }, { passive: true }); });

  fInput.addEventListener("input", function () {
    clearTimeout(fdeb);
    fdeb = setTimeout(function () { highlightDoc(fInput.value); goMatch(0, false); }, 120);
  });
  fInput.addEventListener("keydown", function (ev) {
    if (ev.key === "Enter") { ev.preventDefault(); clearTimeout(fdeb); if (fInput.value !== F.q) { highlightDoc(fInput.value); goMatch(0); } else goMatch(F.cur + (ev.shiftKey ? -1 : 1), true); }
    else if (ev.key === "Escape") { ev.preventDefault(); closeFind(); }
  });
  // 버튼을 눌러도 입력창 포커스(=폰 키보드)가 그대로 있도록 mousedown 기본 동작을 막는다
  [fPrev, fNext].forEach(function (b) { b.addEventListener("mousedown", function (ev) { ev.preventDefault(); }); });
  fPrev.addEventListener("click", function () { goMatch(F.cur - 1, true); });
  fNext.addEventListener("click", function () { goMatch(F.cur + 1, true); });
  find.querySelector(".ws-x").addEventListener("click", closeFind);
  fab.addEventListener("click", function () { openFind(null, null, false); });

  function syncFab() { fab.hidden = !overlayMode() || ovOpen || !find.hidden; }

  // 폰 키보드가 올라오면 찾기 바를 키보드 바로 위로
  function positionFind() {
    var vv = root.visualViewport;
    if (!vv || find.hidden) { find.style.bottom = ""; return; }
    var off = Math.max(0, root.innerHeight - vv.height - vv.offsetTop);
    find.style.bottom = off > 1 ? off + "px" : "";
  }
  if (root.visualViewport) {
    root.visualViewport.addEventListener("resize", positionFind);
    root.visualViewport.addEventListener("scroll", positionFind);
  }

  // ---------- 단축키: '/' 로 검색 (Ctrl+F 는 브라우저 기본 그대로) ----------
  doc.addEventListener("keydown", function (ev) {
    if (ev.key !== "/" || ev.ctrlKey || ev.metaKey || ev.altKey) return;
    var t = ev.target, tag = t && t.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || (t && t.isContentEditable)) return;
    ev.preventDefault();
    if (overlayMode()) openOverlay(); else { box.readOnly = false; box.focus(); }
  });
  doc.addEventListener("keydown", function (ev) {
    if (ev.key === "Escape" && !find.hidden && doc.activeElement !== fInput) closeFind();
  });
  // PC: 패널 밖을 누르면 닫기
  doc.addEventListener("mousedown", function (ev) {
    if (!panel.hidden && !panel.contains(ev.target) && ev.target !== box) closePanel(false);
  });

  syncMode();
  // 첫 검색이 바로 뜨도록, 페이지가 한가할 때 인덱스를 미리 만든다
  var pre = function () { try { index(); } catch (e) {} };
  if (root.requestIdleCallback) root.requestIdleCallback(pre, { timeout: 4000 }); else setTimeout(pre, 1500);

  API.ui = { openOverlay: openOverlay, closeOverlay: closeOverlay, openFind: openFind, closeFind: closeFind, runSearch: runSearch, index: index, state: state, F: F };
})(typeof window !== "undefined" ? window : globalThis);
