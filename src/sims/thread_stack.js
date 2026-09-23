// thread_stack — 주소 공간 안의 스레드 스택 + pthread_create
// 출처: 8-Concurrency.pdf p.23~32 (Address Space of Multi-Threaded Programs, Thread Creation)
window.SIMS = window.SIMS || {};

(function () {
  function src(n) {
    var a = [
      "void *mythread(void *arg) {",
      "    printf(\"%s\\n\", (char *) arg);",
      "    return NULL;",
      "}",
      "",
      "int main(int argc, char *argv[]) {",
      (n === 2 ? "    pthread_t p1, p2;" : "    pthread_t p1;"),
      "    printf(\"main: begin\\n\");",
      "    pthread_create(&p1, NULL, mythread, \"A\");"
    ];
    if (n === 2) a.push("    pthread_create(&p2, NULL, mythread, \"B\");");
    a.push("    pthread_join(p1, NULL);");
    if (n === 2) a.push("    pthread_join(p2, NULL);");
    a.push("    printf(\"main: end\\n\");");
    a.push("    return 0;");
    a.push("}");
    return a;
  }

  function esc(t) {
    return String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  // segs: 각 구간 {label, kb, on, hot}
  function spaceSvg(s1, s2, hot, caption) {
    var rows = [
      { lab: "Program Code", sub: "명령어 (공유)", on: true, key: "code" },
      { lab: "Heap", sub: "malloc 데이터 (공유)", on: true, key: "heap" },
      { lab: "(free)", sub: "", on: true, key: "free1" },
      { lab: "Stack (2)", sub: s2 ? esc(s2) : "아직 없음", on: !!s2, key: "s2" },
      { lab: "(free)", sub: "", on: true, key: "free2" },
      { lab: "Stack (1)", sub: s1 ? esc(s1) : "아직 없음", on: !!s1, key: "s1" },
      { lab: "Stack (main)", sub: "main 의 지역 변수", on: true, key: "sm" }
    ];
    var y0 = 26, rh = 26, w = 196, x = 84;
    var h = y0 + rows.length * rh + 34;
    var out = '<svg viewBox="0 0 320 ' + h + '" width="100%" style="max-width:320px">';
    out += '<text x="4" y="15" font-size="11" fill="#9aa">' + esc(caption) + '</text>';
    out += '<text x="' + (x - 6) + '" y="' + (y0 + 10) + '" font-size="9" text-anchor="end" fill="#9aa">0KB</text>';
    out += '<text x="' + (x - 6) + '" y="' + (y0 + rows.length * rh) + '" font-size="9" text-anchor="end" fill="#9aa">16KB</text>';
    for (var i = 0; i < rows.length; i++) {
      var r = rows[i], y = y0 + i * rh;
      var isHot = (hot === r.key);
      var fill = !r.on ? "#262a30" : (isHot ? "#2f6da8" : (r.lab === "(free)" ? "#22262c" : "#343a42"));
      out += '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + (rh - 2) + '" fill="' + fill +
             '" stroke="' + (isHot ? "#7fc0ff" : "#4b535d") + '"' + (r.on ? '' : ' stroke-dasharray="4 3"') + '/>';
      out += '<text x="' + (x + 8) + '" y="' + (y + 12) + '" font-size="10" fill="' +
             (r.on ? "#fff" : "#666") + '">' + esc(r.lab) + '</text>';
      if (r.sub) {
        out += '<text x="' + (x + 8) + '" y="' + (y + 22) + '" font-size="8.5" fill="' +
               (r.on ? "#c8d2dd" : "#5a6068") + '">' + r.sub + '</text>';
      }
    }
    // 성장 방향 화살표
    out += '<text x="' + (x + w + 6) + '" y="' + (y0 + rh + 14) + '" font-size="9" fill="#9fd0a0">&#8595; heap</text>';
    out += '<text x="' + (x + w + 6) + '" y="' + (y0 + rows.length * rh - 8) + '" font-size="9" fill="#e0c08a">&#8593; stack</text>';
    out += '<text x="160" y="' + (h - 8) + '" font-size="9.5" text-anchor="middle" fill="#9aa">' +
           '코드·힙은 모든 스레드가 공유 · 스택만 스레드마다 따로</text>';
    out += '</svg>';
    return out;
  }

  window.SIMS["thread_stack"] = {
    title: "스레드 스택과 pthread_create",
    desc: "스레드를 하나 만들 때마다 주소 공간 안에 스택이 하나씩 더 생깁니다. 코드와 힙은 공유되고 스택만 갈라진다는 점을 봅니다.",
    options: [
      { key: "threads", label: "만들 스레드 수", values: [
        { value: "2", label: "2개 (멀티 스레드 주소 공간)" },
        { value: "1", label: "1개 (스택 하나만 추가)" }
      ]}
    ],
    build: function (opts) {
      opts = opts || {};
      var n = String(opts.threads || "2") === "1" ? 1 : 2;
      var SRC = src(n);
      // 줄 번호 계산
      var L_BEGIN   = 8;
      var L_CREATE1 = 9;
      var L_CREATE2 = n === 2 ? 10 : null;
      var L_JOIN1   = n === 2 ? 11 : 10;
      var L_JOIN2   = n === 2 ? 12 : null;
      var L_END     = n === 2 ? 13 : 11;
      var L_RET     = n === 2 ? 14 : 12;

      var st = {
        "스레드 수": 1,
        "실행 중": "main",
        "main.pc": "main:" + L_BEGIN,
        "T1.pc": "—",
        "T2.pc": "—",
        "stack(main)": "argc, argv, p1" + (n === 2 ? ", p2" : ""),
        "stack1": "— (없음)",
        "stack2": "— (없음)",
        "output": []
      };
      var steps = [];
      function snap() { var o = {}; for (var k in st) o[k] = (k === "output") ? st.output.slice() : st[k]; return o; }
      function push(desc, line, hot, caption, note) {
        steps.push({
          desc: desc,
          pc: { code: (line == null ? null : line) },
          vars: snap(),
          status: { code: st["실행 중"] },
          note: note || undefined,
          svg: spaceSvg(
            st["stack1"] === "— (없음)" ? null : st["stack1"],
            st["stack2"] === "— (없음)" ? null : st["stack2"],
            hot, caption)
        });
      }

      push("프로그램이 시작될 때는 '''단일 스레드'''입니다. [[주소 공간]] 은 [[스택|Program Code]] / [[힙|Heap]] / " +
           "그리고 스택 하나 — 슬라이드 p.28 왼쪽 그림이 바로 이 상태입니다.",
           L_BEGIN, "sm", "단일 스레드 주소 공간");

      st["output"].push("main: begin");
      push("`main: begin` 출력.", L_BEGIN, "sm", "단일 스레드 주소 공간");

      st["스레드 수"] = 2;
      st["T1.pc"] = "mythread:1 (대기)";
      st["stack1"] = "arg=\"A\", printf 프레임";
      push("'''[[pthread_create]](&p1, NULL, mythread, \"A\")''' — 네 인자는 각각 " +
           "① 이 스레드를 다룰 핸들 ② 속성(스택 크기·우선순위 등, NULL 이면 기본) ③ 시작 함수 ④ 그 함수에 넘길 void* 인자입니다. (p.29) " +
           "이 호출로 '''[[스레드 스택|Stack (1)]] 과 [[TCB]] 가 새로 할당''' 됩니다.",
           L_CREATE1, "s1", "스택 1개 추가됨",
           "중요한 건 '''무엇이 안 생기는가'''입니다. 코드도 힙도 페이지 테이블도 새로 만들지 않습니다. 그래서 [[스레드와 프로세스 비교|스레드 생성이 fork 보다 훨씬 쌉니다]].");

      push("T1 은 만들어졌을 뿐 아직 실행되진 않았습니다 ([[프로세스 상태|Ready]]). " +
           "'''pthread_create 가 리턴한 순간 T1 이 이미 돌고 있을 수도, 아직 시작도 안 했을 수도 있습니다''' — 순서는 스케줄러 마음입니다.",
           L_CREATE1, "s1", "T1 = Ready");

      if (n === 2) {
        st["스레드 수"] = 3;
        st["T2.pc"] = "mythread:1 (대기)";
        st["stack2"] = "arg=\"B\", printf 프레임";
        push("'''pthread_create(&p2, ..., \"B\")''' — 스택이 하나 더 생깁니다. " +
             "이제 한 [[주소 공간]] 안에 '''[[프로그램 카운터|PC]] 가 세 개''' (main, T1, T2), '''스택도 세 개''' 입니다. " +
             "슬라이드 p.28 오른쪽 그림이 이 상태입니다.",
             L_CREATE2, "s2", "스택 2개 추가됨",
             "스택이 여러 개가 되면서 '''(free) 공간을 가운데에 두고''' 배치됩니다. 스택이 무한정 자랄 수 없다는 뜻이기도 합니다 — 재귀가 깊으면 옆 스택을 침범합니다.");
      }

      st["실행 중"] = "main (blocked)";
      st["main.pc"] = "main:" + L_JOIN1 + " (blocked)";
      push("'''[[pthread_join]](p1, NULL)''' — T1 이 끝날 때까지 main 이 기다립니다. " +
           "main 은 [[프로세스 상태|Running → Blocked]] 가 되고 CPU 를 내놓습니다.",
           L_JOIN1, "sm", "main 이 join 으로 대기");

      st["실행 중"] = "T1";
      st["T1.pc"] = "mythread:2";
      push("[[스케줄러]] 가 T1 을 올립니다. '''[[스레드 컨텍스트 스위치]]''' 가 일어나지만 " +
           "[[주소 공간]] 은 바뀌지 않습니다 — [[TCB]] 의 레지스터만 갈아 끼우면 됩니다. " +
           "(프로세스 전환은 페이지 테이블까지 바꿔야 해서 더 비쌉니다)",
           2, "s1", "T1 실행 중");

      st["output"].push("A");
      push("T1 이 자기 [[스레드 스택|Stack (1)]] 위에서 printf 를 돌려 `A` 를 출력합니다. " +
           "arg 는 T1 의 스택에 있지만, 문자열 \"A\" 자체는 '''공유되는''' 읽기 전용 영역에 있습니다.",
           2, "s1", "T1 실행 중");

      st["T1.pc"] = "종료";
      st["stack1"] = "(해제됨)";
      st["실행 중"] = "main";
      st["main.pc"] = "main:" + L_JOIN1 + " (리턴)";
      push("T1 이 `return NULL` 로 끝나고 스택도 회수됩니다. main 이 [[프로세스 상태|Blocked → Ready → Running]] 으로 깨어납니다.",
           3, "sm", "T1 종료");

      if (n === 2) {
        st["실행 중"] = "T2";
        st["T2.pc"] = "mythread:2";
        st["main.pc"] = "main:" + L_JOIN2 + " (blocked)";
        push("main 이 `pthread_join(p2, NULL)` 로 다시 기다리고, T2 가 실행됩니다.",
             L_JOIN2, "s2", "T2 실행 중");
        st["output"].push("B");
        push("T2 가 `B` 를 출력합니다.", 2, "s2", "T2 실행 중",
             "T1 과 T2 중 '''누가 먼저 찍힐지는 정해져 있지 않습니다'''. A→B 일 수도 B→A 일 수도 있습니다. 8강 뒷부분의 [[race condition]] 이 여기서 출발합니다.");
        st["T2.pc"] = "종료";
        st["stack2"] = "(해제됨)";
        st["실행 중"] = "main";
        st["main.pc"] = "main:" + L_JOIN2 + " (리턴)";
        push("T2 도 종료. join 이 즉시 리턴합니다.", 3, "sm", "T2 종료");
      }

      st["스레드 수"] = 1;
      st["main.pc"] = "main:" + L_END;
      st["output"].push("main: end");
      push("`main: end` 출력. [[pthread_join]] 덕분에 이 줄은 '''언제나 마지막'''입니다.",
           L_END, "sm", "다시 단일 스레드");

      st["main.pc"] = "main:" + L_RET;
      push("정리: [[스레드]] 는 '''실행 흐름(PC + 레지스터 + 스택)''' 만 여러 개이고 " +
           "[[주소 공간]] 은 하나입니다. 이 '공유' 가 [[스레드와 프로세스 비교|스레드를 가볍게]] 만들지만, " +
           "동시에 다음 시간의 [[race condition]] 을 만들어 냅니다.",
           L_RET, null, "종료");

      return {
        panels: [
          { id: "code", title: "pthread 예제 (8강 p.32)", lang: "c", lines: SRC }
        ],
        vars: [
          { name: "실행 중", group: "CPU" },
          { name: "스레드 수", group: "CPU" },
          { name: "main.pc", group: "PC (스레드마다 하나)" },
          { name: "T1.pc", group: "PC (스레드마다 하나)" },
          { name: "T2.pc", group: "PC (스레드마다 하나)" },
          { name: "stack(main)", group: "주소 공간 — 스택" },
          { name: "stack1", group: "주소 공간 — 스택" },
          { name: "stack2", group: "주소 공간 — 스택" },
          { name: "output", group: "표준 출력" }
        ],
        steps: steps
      };
    }
  };
})();
