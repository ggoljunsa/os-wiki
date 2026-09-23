// test_render.js — 빌드된 index.html 안의 스크립트를 그대로 실행해, 등록된 모든 문서를
// renderArticle() 로 렌더링한 뒤 articleArea 의 innerHTML 에 미처리 위키 원시 마크업
// ('''/{|/{박스}/[[ 등)이 남아 있지 않은지 전수 검사한다.
// 사용: node src/test_render.js index.html
const fs=require("fs"),vm=require("vm");
const html=fs.readFileSync(process.argv[2],"utf8");
const body=(html.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/)||[])[1];
if(!body){console.error("script 추출 실패");process.exit(1);}
let captured="";
function stub(id){const e={_id:id,style:{},classList:{add(){},remove(){},toggle(){}},
  appendChild(){},addEventListener(){},setAttribute(){},getAttribute(){return null;},
  querySelectorAll(){return [];},textContent:"",
  get innerHTML(){return this._h||"";},
  set innerHTML(v){this._h=v; if(id==="articleArea") captured=v;}};return e;}
const els={};
const sb={};sb.window=sb;sb.globalThis=sb;sb.console={log(){},error(){},warn(){}};
sb.location={hash:""};
sb.document={getElementById:id=>(els[id]=els[id]||stub(id)),
  querySelectorAll:()=>[],createElement:()=>stub("x"),addEventListener(){}};
sb.window.addEventListener=()=>{};sb.window.scrollTo=()=>{};
sb.setInterval=()=>0;sb.clearInterval=()=>{};
vm.createContext(sb);
vm.runInContext(body,sb,{filename:"index.html#script"});
const A=vm.runInContext("ARTICLES",sb);
const keys=Object.keys(A);
const pats=["'''","{|","{analogy}","{tip}","{warn}","{/","[["];
let bad=0;
keys.forEach(k=>{
  if(!A[k]){console.error("문서 없음: "+k);bad++;return;}
  captured="";sb.renderArticle(k);
  const art=captured;
  const hits=pats.map(p=>[p,art.split(p).length-1]).filter(x=>x[1]>0);
  console.log(`#${k}  len=${art.length}  `+(hits.length?("❌ "+hits.map(x=>x[0]+"×"+x[1]).join(", ")):"✅ '''/{|/{analogy}/{tip}/{warn}/{/ /[[ 모두 0"));
  if(hits.length){bad++;hits.forEach(([p])=>{const i=art.indexOf(p);console.error("    ..."+art.slice(Math.max(0,i-100),i+100).replace(/\n/g," "));});}
});
process.exit(bad?1:0);
