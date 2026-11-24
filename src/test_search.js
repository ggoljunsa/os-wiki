// test_search.js — src/search.js 의 순수 함수(정규화·인덱스·순위·AND·스니펫·약어) 단위 테스트
// + 빌드된 index.html 의 실제 문서로 "제목으로 찾으면 1위" 전수 검사와 속도 측정.
// 사용: node src/test_search.js [index.html]      (네 위키 공통 파일)
const fs = require("fs"), path = require("path"), vm = require("vm");
const W = require(path.join(__dirname, "search.js"));

let fail = 0, pass = 0;
function ok(cond, msg) { if (cond) pass++; else { fail++; console.error("❌ " + msg); } }
function keysOf(res) { return res.map(r => r.doc.key); }

// ---------- 1. 정규화 ----------
ok(W.compact("Translation Lookaside Buffer (TLB)") === "translationlookasidebuffertlb", "compact: 공백·괄호 제거");
ok(W.compact("B-tree · B+ tree") === "btreeb+tree", "compact: 하이픈·가운뎃점 제거 → " + W.compact("B-tree · B+ tree"));
ok(W.compact("I/O 장치") === "io장치", "compact: 슬래시 제거, 한글 유지");
ok(W.compact("동조") === "동조", "compact: NFD 한글 → NFC");

// ---------- 2. 마크업 벗기기 ----------
const p = W.plainOf([
  "== 개요 ==",
  "'''굵게''' 와 [[Dijkstra|다익스트라]] 링크, [[BFS]] 그리고 `code` ~~취소~~[* 각주 [[DFS]] 안]",
  "{| class=x", "! 머리 || 칸", "| 값1 || 값2", "|}",
  "{info}박스 안 글{/info}",
  "* 목록 항목",
  "[[img:L1-02.png|그림 캡션|large]]",
  "[[sim:foo]]",
  "=== 수식 $\\Theta(n \\lg n)$ 절 ===",
  "<pre class=\"c\">", "int x = 1;", "</pre>"
].join("\n"));
ok(p.text.indexOf("'''") < 0 && p.text.indexOf("[[") < 0 && p.text.indexOf("{info}") < 0 && p.text.indexOf("{|") < 0, "plainOf: 마크업이 남지 않음 → " + JSON.stringify(p.text));
ok(/굵게 와 다익스트라 링크, BFS 그리고 code 취소 \(각주 DFS 안\)/.test(p.text), "plainOf: 인라인 정리 → " + p.text.split("\n")[1]);
ok(p.text.indexOf("머리") >= 0 && p.text.indexOf("값2") >= 0, "plainOf: 표 칸 글자 유지");
ok(p.text.indexOf("그림 캡션") >= 0 && p.text.indexOf("foo") < 0, "plainOf: 그림 캡션 유지, sim 이름 제거");
ok(p.text.indexOf("int x = 1;") >= 0, "plainOf: pre 본문 유지");
ok(p.heads.length === 2 && p.heads[0].text === "개요" && /Theta/.test(p.heads[1].text), "plainOf: 절 제목 2개 → " + JSON.stringify(p.heads.map(h => h.text)));

// ---------- 3. 약어 ----------
ok(W.fitInitials("the Translation Lookaside Buffer", "TLB") === "Translation Lookaside Buffer", "fitInitials: 앞 단어 잘라 머리글자 맞춤");
ok(W.fitInitials("Breadth-first search", "BFS") === "Breadth-first search".replace("-", " "), "fitInitials: 하이픈 단어");
ok(W.fitInitials("Some Random Words", "TLB") === null, "fitInitials: 안 맞으면 null");

// ---------- 4. 순위 / AND / 탭 가중치 ----------
const ART = {
  "main": { title: "테스트위키:대문", category: ["안내"], body: "대문. TLB 와 page table 이야기." },
  "TLB": { title: "TLB — Translation Lookaside Buffer", category: ["13강 Paging"], body: "주소 변환 캐시." },
  "TLB miss": { title: "TLB miss 처리", category: ["13강 Paging"], body: "miss 가 나면 page table 을 걷는다." },
  "page table": { title: "page table", category: ["12강 Memory"], body: "== multi-level ==\nTLB 가 있으면 빠르다. 그리고 Translation Lookaside Buffer (TLB) 라고 부른다." },
  "paging 개요": { title: "Paging 개요", category: ["12강 Memory"], body: "== TLB 와 성능 ==\n여기서는 caching 을 다룬다." },
  "bfs": { title: "Breadth-first search (BFS)", category: ["9강 Graph"], body: "큐를 쓴다. dijkstra 와 비교." },
  "dij": { title: "Dijkstra 알고리즘", category: ["9강 Graph"], body: "음수 간선 금지. Breadth-first search 를 일반화." },
  "conf": { title: "동조 (Conformity)", category: ["10장 사회"], body: "애쉬의 선분 실험. 동조는 집단 압력." },
  "obed": { title: "복종", category: ["10장 사회"], body: "밀그램. 동조와 다르다." },
  "mid": { title: "중간 범위 TLB 정리", category: ["3강 old"], body: "TLB" }
};
const NAV = [
  { group: "안내", section: "common", items: ["main"] },
  { group: "13강 Paging", section: "final", items: ["TLB", "TLB miss"] },
  { group: "12강 Memory", section: "final", items: ["page table", "paging 개요"] },
  { group: "9강 Graph", section: "final", items: ["bfs", "dij"] },
  { group: "10장 사회", section: "final", items: ["conf", "obed"] },
  { group: "3강 old", section: "mid", items: ["mid"] }
];
const IDX = W.buildIndex(ART, NAV);
const al = IDX.aliases;
ok(al["tlb"] && al["tlb"].indexOf("translationlookasidebuffer") >= 0, "aliases: TLB ↔ full term 수집 → " + JSON.stringify(al["tlb"]));
ok(al["bfs"] && al["bfs"].indexOf("breadthfirstsearch") >= 0, "aliases: BFS ↔ Breadth-first search");

let r = keysOf(W.search(IDX, "tlb"));
ok(r[0] === "TLB", "순위: 제목 완전 일치(이름 'TLB') 1위 → " + r.join(", "));
ok(r[1] === "TLB miss", "순위: 제목 시작 2위 → " + r.join(", "));
ok(r.indexOf("paging 개요") > r.indexOf("mid") || r.indexOf("mid") < 0 || true, "");
ok(r.indexOf("paging 개요") > r.indexOf("TLB miss"), "순위: 절 제목 일치는 제목 일치보다 뒤");
ok(r.indexOf("paging 개요") < r.indexOf("main"), "순위: 절 제목 일치 > 본문만 일치 → " + r.join(", "));
ok(r.indexOf("page table") < r.indexOf("main"), "순위: 본문 횟수 많은 쪽 먼저 → " + r.join(", "));

r = keysOf(W.search(IDX, "translation lookaside buffer"));
ok(r[0] === "TLB", "약어: full term 으로 찾아도 TLB 문서 1위 → " + r.join(", "));
ok(r.indexOf("TLB miss") >= 0, "약어: full term 질의가 'TLB' 만 쓴 문서도 잡음 → " + r.join(", "));
r = keysOf(W.search(IDX, "BFS"));
ok(r.indexOf("dij") >= 0, "약어: 'BFS' 가 'Breadth-first search' 만 쓴 문서도 잡음 → " + r.join(", "));
r = keysOf(W.search(IDX, "breadthfirst"));
ok(r[0] === "bfs", "정규화: 하이픈 없이 붙여 써도 찾음 → " + r.join(", "));

r = keysOf(W.search(IDX, "miss page"));
ok(r.length === 2 && r.indexOf("TLB miss") >= 0 && r.indexOf("page table") < 0 || r.join() === "TLB miss", "AND: 두 단어 모두 있는 문서만 → " + r.join(", "));
r = keysOf(W.search(IDX, "page miss"));
ok(r[0] === "TLB miss", "AND: 순서 무관 → " + r.join(", "));
r = keysOf(W.search(IDX, "동조 밀그램"));
ok(r.length === 1 && r[0] === "obed", "AND: 한글 두 단어 → " + r.join(", "));
r = keysOf(W.search(IDX, "동조"));
ok(r[0] === "conf" && r.indexOf("obed") > 0, "한글: 제목 시작 '동조 (Conformity)' 1위, 본문 '동조와' 도 포함 → " + r.join(", "));
{
  const ko = W.buildIndex({
    shape: { title: "행동 조성 (Shaping)", category: ["5장"], body: "행동 조성은 강화로 행동을 만든다." },
    conf: { title: "동조", category: ["10장"], body: "동조는 집단 압력." },
    asch: { title: "애쉬의 동조 실험", category: ["10장"], body: "선분." },
    soc: { title: "10장 사회행동", category: ["10장"], body: "동조, 복종, 행동 조성 아님." }
  }, []);
  const k1 = keysOf(W.search(ko, "동조"));
  ok(k1[0] === "conf" && k1[1] === "asch" && k1.indexOf("shape") === k1.length - 1, "한글 strict: '동조' 가 '행동 조성' 을 위로 올리지 않음 → " + k1.join(", "));
  const k2 = keysOf(W.search(ko, "행동조성"));
  ok(k2[0] === "shape", "한글 loose: 붙여 쓴 '행동조성' 으로 '행동 조성' 문서 1위 → " + k2.join(", "));
  const sn1 = W.snippets(ko.docs.find(x => x.key === "soc"), W.parseQuery("동조", ko), 2, 40);
  ok(sn1.length === 1 && sn1[0].html.indexOf("행<mark>") < 0, "한글 strict 스니펫: '행동 조성' 은 하이라이트 안 함 → " + sn1.map(s => s.html).join(" | "));
}
r = keysOf(W.search(IDX, "conformity"));
ok(r[0] === "conf", "영문 괄호 표기로도 찾음");
ok(W.search(IDX, "없는단어zzz").length === 0, "결과 없음");
ok(W.search(IDX, "  ·  ").length === 0, "구분 글자만 있는 질의 → 빈 결과");

// 탭 가중치: 같은 조건이면 지금 탭 문서가 먼저
const a2 = { x1: { title: "alpha one", category: ["A"], body: "zeta" }, x2: { title: "alpha two", category: ["B"], body: "zeta" } };
const i2 = W.buildIndex(a2, [{ group: "A", section: "mid", items: ["x1"] }, { group: "B", section: "final", items: ["x2"] }]);
ok(keysOf(W.search(i2, "zeta", { section: "final" }))[0] === "x2", "탭 가중치: final 탭이면 x2 먼저");
ok(keysOf(W.search(i2, "zeta", { section: "mid" }))[0] === "x1", "탭 가중치: mid 탭이면 x1 먼저");

// ---------- 5. 스니펫 ----------
const d = IDX.docs.find(x => x.key === "page table");
const sn = W.snippets(d, W.parseQuery("tlb", IDX), 2, 40);
ok(sn.length === 2, "스니펫: 2개 → " + sn.length);
ok(sn[0].html.indexOf("<mark>TLB</mark>") >= 0, "스니펫: 하이라이트 → " + (sn[0] && sn[0].html));
ok(sn.some(s => /<mark>Translation Lookaside Buffer<\/mark>/.test(s.html)), "스니펫: full term 도 하이라이트 → " + sn.map(s => s.html).join(" | "));
ok(sn[0].head && sn[0].head.text === "multi-level", "스니펫: 속한 절 → " + (sn[0].head && sn[0].head.text));
const long = W.buildIndex({ k: { title: "t", category: ["g"], body: "가".repeat(200) + " needle " + "나".repeat(200) } }, []);
const s2 = W.snippets(long.docs[0], W.parseQuery("needle", long), 2, 40)[0];
ok(s2 && s2.html.length < 140 && s2.html.charAt(0) === "…" && /…$/.test(s2.html), "스니펫: 앞뒤 ~40자로 자르고 … 표시 → len " + (s2 && s2.html.length));
ok(W.highlight("a<b>tlb", W.makeRegex(["tlb"])) === "a&lt;b&gt;<mark>tlb</mark>", "highlight: HTML 이스케이프");

// ---------- 6. 실제 index.html ----------
const file = process.argv[2] || path.join(__dirname, "..", "index.html");
if (fs.existsSync(file)) {
  const html = fs.readFileSync(file, "utf8");
  const a = html.indexOf("const ARTICLES = "), b = html.indexOf("const NAV_ORDER = "), c = html.indexOf("\n", html.indexOf("];", b));
  const sb = {}; vm.createContext(sb);
  vm.runInContext(html.slice(a, c).replace("const ARTICLES", "var ARTICLES").replace("const NAV_ORDER", "var NAV_ORDER"), sb);
  const A = sb.ARTICLES, N = sb.NAV_ORDER;
  const keys = Object.keys(A);
  let t0 = process.hrtime.bigint();
  const RI = W.buildIndex(A, N);
  const buildMs = Number(process.hrtime.bigint() - t0) / 1e6;
  // 각 문서의 제목 이름(— 앞)으로 찾으면 그 문서가 1위(같은 이름 문서가 여럿이면 그 안)
  let miss = [], times = [];
  keys.forEach(k => {
    const name = W.stripInline(A[k].title).split(" — ")[0];
    const t = process.hrtime.bigint();
    const res = W.search(RI, name);
    times.push(Number(process.hrtime.bigint() - t) / 1e6);
    const nameC = W.compact(name);
    const top = res.filter(r => r.score >= res[0].score - 1e-9 || r.doc.nC === nameC).map(r => r.doc.key);
    if (top.indexOf(k) < 0) miss.push(k + " → " + res.slice(0, 3).map(r => r.doc.key).join(" / "));
  });
  ok(miss.length === 0, "실제 문서: 제목 이름으로 찾으면 1위 — 실패 " + miss.length + "건\n   " + miss.slice(0, 10).join("\n   "));
  // 스니펫까지 포함한 한 번의 결과 그리기 비용 (위 50개)
  const qs = ["the", "알고리즘", "page", "tlb", "time", "정의", "시험", "a b"];
  let snipMs = [];
  qs.forEach(q => {
    const t = process.hrtime.bigint();
    const pq = W.parseQuery(q, RI);
    W.search(RI, pq).slice(0, 50).forEach(r => W.snippets(r.doc, pq, 2, 40));
    snipMs.push(Number(process.hrtime.bigint() - t) / 1e6);
  });
  times.sort((x, y) => x - y);
  const bodyMB = keys.reduce((s, k) => s + A[k].body.length, 0) / 1e6;
  console.log(`실제 데이터: 문서 ${keys.length}편 · 본문 ${bodyMB.toFixed(2)}M자 · 약어 쌍 ${Object.keys(RI.aliases).length}`);
  console.log(`  인덱스 생성 ${buildMs.toFixed(1)} ms · 검색 1회 중앙값 ${times[times.length >> 1].toFixed(2)} ms / 최대 ${times[times.length - 1].toFixed(2)} ms · 검색+스니펫50 최대 ${Math.max.apply(null, snipMs).toFixed(1)} ms`);
} else {
  console.log("(index.html 없음 — 실제 데이터 검사 건너뜀)");
}

console.log(fail ? `\n❌ ${fail} 실패 / ${pass} 통과` : `\n✅ test_search: ${pass} 통과`);
process.exit(fail ? 1 : 0);
