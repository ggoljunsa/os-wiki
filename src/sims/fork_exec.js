// fork_exec — OSTEP p1.c / p2.c / p3.c 출력 추적
// 출처: 3-From_Program_to_Process.pdf p.31~33 (Process API), OSTEP Ch.5 (Process API)
window.SIMS = window.SIMS || {};

(function () {
  var P1 = [
    "int main(int argc, char *argv[]) {",
    "    printf(\"hello world (pid:%d)\\n\", (int) getpid());",
    "    int rc = fork();",
    "    if (rc < 0) {                 // fork 실패",
    "        fprintf(stderr, \"fork failed\\n\");",
    "        exit(1);",
    "    } else if (rc == 0) {         // 자식",
    "        printf(\"hello, I am child (pid:%d)\\n\", (int) getpid());",
    "    } else {                      // 부모",
    "        printf(\"hello, I am parent of %d (pid:%d)\\n\",",
    "               rc, (int) getpid());",
    "    }",
    "    return 0;",
    "}"
  ];

  var P2 = [
    "int main(int argc, char *argv[]) {",
    "    printf(\"hello world (pid:%d)\\n\", (int) getpid());",
    "    int rc = fork();",
    "    if (rc < 0) {                 // fork 실패",
    "        fprintf(stderr, \"fork failed\\n\");",
    "        exit(1);",
    "    } else if (rc == 0) {         // 자식",
    "        printf(\"hello, I am child (pid:%d)\\n\", (int) getpid());",
    "    } else {                      // 부모",
    "        int wc = wait(NULL);      // 자식이 끝날 때까지 정지",
    "        printf(\"hello, I am parent of %d (wc:%d) (pid:%d)\\n\",",
    "               rc, wc, (int) getpid());",
    "    }",
    "    return 0;",
    "}"
  ];

  var P3 = [
    "int main(int argc, char *argv[]) {",
    "    printf(\"hello world (pid:%d)\\n\", (int) getpid());",
    "    int rc = fork();",
    "    if (rc < 0) {                 // fork 실패",
    "        exit(1);",
    "    } else if (rc == 0) {         // 자식",
    "        printf(\"hello, I am child (pid:%d)\\n\", (int) getpid());",
    "        char *myargs[3];",
    "        myargs[0] = strdup(\"wc\");     // 실행할 프로그램",
    "        myargs[1] = strdup(\"p3.c\");   // 인자",
    "        myargs[2] = NULL;",
    "        execvp(myargs[0], myargs);    // wc 로 '변신'",
    "        printf(\"this shouldn't print out\");",
    "    } else {                      // 부모",
    "        int wc = wait(NULL);",
    "        printf(\"hello, I am parent of %d (wc:%d) (pid:%d)\\n\",",
    "               rc, wc, (int) getpid());",
    "    }",
    "    return 0;",
    "}"
  ];

  function esc(t) {
    return String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function procSvg(st, running, caption) {
    function box(x, title, pid, img, alive, hot) {
      var s = '<rect x="' + x + '" y="26" width="150" height="104" rx="6" fill="' +
              (hot ? "#2f6da8" : (alive ? "#343a42" : "#2a2e34")) + '" stroke="' +
              (hot ? "#7fc0ff" : "#4b535d") + '"' + (alive ? '' : ' stroke-dasharray="4 3"') + '/>';
      s += '<text x="' + (x + 75) + '" y="45" font-size="12" text-anchor="middle" fill="#fff">' + title + '</text>';
      s += '<text x="' + (x + 75) + '" y="63" font-size="10" text-anchor="middle" fill="#cbd5e0">pid: ' + esc(pid) + '</text>';
      s += '<rect x="' + (x + 10) + '" y="72" width="130" height="46" rx="4" fill="#1e232a" stroke="#4b535d"/>';
      s += '<text x="' + (x + 75) + '" y="90" font-size="9.5" text-anchor="middle" fill="#9fd0a0">주소 공간</text>';
      s += '<text x="' + (x + 75) + '" y="107" font-size="10" text-anchor="middle" fill="#e0c08a">' + esc(img) + '</text>';
      return s;
    }
    var s = '<svg viewBox="0 0 360 160" width="100%" style="max-width:360px">';
    s += '<text x="4" y="16" font-size="11" fill="#9aa">' + esc(caption) + '</text>';
    s += box(14, "부모", st["parent.pid"], st["parent.image"], true, running === "parent");
    if (st["child.pid"] !== "—") {
      s += box(196, "자식", st["child.pid"], st["child.image"],
               st["child.alive"] !== "종료됨", running === "child");
      s += '<path d="M164 78 L196 78" stroke="#7fc0ff" stroke-width="1.5"/>';
      s += '<polygon points="196,78 188,74 188,82" fill="#7fc0ff"/>';
      s += '<text x="180" y="72" font-size="8.5" text-anchor="middle" fill="#7fc0ff">fork</text>';
    } else {
      s += '<text x="271" y="82" font-size="11" text-anchor="middle" fill="#666">(아직 자식 없음)</text>';
    }
    s += '<text x="180" y="150" font-size="9.5" text-anchor="middle" fill="#9aa">' +
         'fork 직후 두 주소 공간은 거의 같다 · exec 은 그 안을 통째로 갈아끼운다</text>';
    s += '</svg>';
    return s;
  }

  window.SIMS["fork_exec"] = {
    title: "fork / wait / exec 출력 추적 (OSTEP p1~p3)",
    desc: "fork() 가 왜 '한 번 부르고 두 번 리턴' 하는지, wait() 가 출력 순서를 어떻게 확정하는지, exec() 가 무엇을 통째로 바꾸는지 봅니다.",
    options: [
      { key: "program", label: "예제 프로그램", values: [
        { value: "p1", label: "p1.c — fork 만" },
        { value: "p2", label: "p2.c — fork + wait" },
        { value: "p3", label: "p3.c — fork + wait + exec" }
      ]}
    ],
    build: function (opts) {
      opts = opts || {};
      var prog = opts.program || "p1";
      var SRC = prog === "p3" ? P3 : (prog === "p2" ? P2 : P1);
      var PPID = prog === "p3" ? 29383 : 29146;
      var CPID = PPID + 1;

      var st = {
        "running": "부모",
        "parent.pid": String(PPID),
        "child.pid": "—",
        "parent.rc": "?",
        "child.rc": "—",
        "wc": "—",
        "parent.image": prog + " (a.out)",
        "child.image": "—",
        "child.alive": "—",
        "output": []
      };
      var steps = [];
      var childElseLine  = (prog === "p3") ? 6 : 7;
      var childPrintLine = (prog === "p3") ? 7 : 8;
      function snap() { var o = {}; for (var k in st) o[k] = (k === "output") ? st.output.slice() : st[k]; return o; }
      function push(desc, pp, cp, running, caption, note) {
        st["running"] = running === "child" ? "자식" : (running === "none" ? "(둘 다 아님)" : "부모");
        steps.push({
          desc: desc,
          pc: { parent: (pp == null ? null : pp), child: (cp == null ? null : cp) },
          vars: snap(),
          status: {
            parent: running === "parent" ? "running" : (running === "child" ? "ready" : "—"),
            child: st["child.pid"] === "—" ? "없음"
                   : (st["child.alive"] === "종료됨" ? "종료(ZOMBIE)"
                   : (running === "child" ? "running" : "ready"))
          },
          note: note || undefined,
          svg: procSvg(st, running, caption)
        });
      }

      push("프로그램이 하나의 [[프로세스]] 로 시작합니다. pid 는 " + PPID + ".",
           1, null, "parent", "프로세스 1개");

      st["output"].push("hello world (pid:" + PPID + ")");
      push("첫 출력: `hello world (pid:" + PPID + ")`. 아직 프로세스는 하나뿐이므로 이 줄은 '''언제나 맨 앞'''에 나옵니다.",
           2, null, "parent", "프로세스 1개");

      st["child.pid"] = String(CPID);
      st["child.image"] = prog + " (a.out) 복사본";
      st["child.alive"] = "살아있음";
      st["parent.rc"] = String(CPID);
      st["child.rc"] = "0";
      push("'''[[fork]]()''' — 커널이 [[struct proc]] 과 [[주소 공간]] 을 거의 그대로 복사해 새 프로세스를 만듭니다. " +
           "'''한 번 호출했는데 두 곳에서 리턴'''합니다: 부모에게는 자식의 pid(" + CPID + "), " +
           "자식에게는 '''0'''. 자식은 fork 의 '''다음 줄부터''' 시작합니다 — 처음부터가 아닙니다.",
           3, 3, "parent", "fork → 프로세스 2개",
           "자식은 부모의 메모리·레지스터·열린 파일을 물려받지만 '''pid 는 다릅니다'''. 그래서 rc 값 하나로 둘을 구분합니다.");

      push("두 프로세스 모두 `if (rc < 0)` 을 검사하지만 fork 가 성공했으므로 둘 다 건너뜁니다.",
           4, 4, "parent", "두 프로세스 모두 분기 검사");

      // ── 자식 실행
      push("[[스케줄러]] 가 이번에는 자식을 골랐다고 합시다. 자식의 rc 는 0 이므로 `else if (rc == 0)` 으로 들어갑니다.",
           null, childElseLine, "child", "자식 실행 중");

      st["output"].push("hello, I am child (pid:" + CPID + ")");
      push("자식 출력: `hello, I am child (pid:" + CPID + ")`.",
           null, childPrintLine, "child", "자식 실행 중",
           prog === "p1"
             ? "p1.c 에서는 이 줄과 부모 줄의 '''순서가 보장되지 않습니다'''. CPU 스케줄러가 누구를 먼저 돌릴지에 달려 있어 실행할 때마다 달라질 수 있습니다 — 이것이 non-determinism 입니다."
             : undefined);

      if (prog === "p3") {
        push("자식이 실행할 프로그램 이름과 인자를 배열로 준비합니다. `wc p3.c` 를 돌릴 참입니다.",
             null, 9, "child", "exec 준비");
        st["child.image"] = "wc (완전히 교체됨)";
        push("'''[[exec]]()''' — 여기가 결정적입니다. 새 프로세스를 만드는 게 '''아니라''', " +
             "지금 프로세스의 [[주소 공간]] (코드·[[힙]]·[[스택]]) 을 wc 의 것으로 '''통째로 덮어씁니다'''. " +
             "pid 는 그대로 " + CPID + " 인데 '''내용물만 다른 프로그램'''이 됩니다.",
             null, 12, "child", "exec: 이미지 교체",
             "성공한 exec() 는 '''절대 리턴하지 않습니다'''. 돌아올 코드 자체가 메모리에서 사라졌기 때문입니다.");
        st["output"].push("      29     107    1030 p3.c");
        push("wc 가 p3.c 의 줄/단어/바이트 수를 출력합니다. " +
             "'''`this shouldn't print out` 은 영원히 찍히지 않습니다''' — 그 printf 가 있던 코드가 이미 덮어써졌으니까요.",
             null, 13, "child", "wc 실행 중");
        st["child.alive"] = "종료됨";
        push("wc 가 끝나면서 자식 프로세스도 종료됩니다. (원래 p3.c 의 return 0 에는 도달하지 못합니다)",
             null, null, "none", "자식 종료");
      } else {
        st["child.alive"] = "종료됨";
        push("자식이 `return 0` 으로 종료합니다. xv6 라면 [[struct proc]] 의 state 가 ZOMBIE 가 되어 " +
             "부모가 [[wait]] 로 거둬 가기를 기다립니다.",
             null, SRC.length - 1, "none", "자식 종료");
      }

      // ── 부모 실행
      if (prog === "p1") {
        push("부모 차례. rc 가 " + CPID + " (0 이 아님) 이므로 `else` 로 들어갑니다.",
             9, null, "parent", "부모 실행 중");
        st["output"].push("hello, I am parent of " + CPID + " (pid:" + PPID + ")");
        push("부모 출력: `hello, I am parent of " + CPID + " (pid:" + PPID + ")`.",
             10, null, "parent", "부모 실행 중",
             "이번 실행에서는 자식이 먼저 찍혔지만, '''부모가 먼저 찍히는 실행도 똑같이 정상'''입니다. 결과가 실행마다 달라지는 건 버그가 아니라 스케줄러의 자유입니다.");
        push("부모도 종료. 최종 출력 세 줄 중 '''뒤의 두 줄은 순서가 뒤바뀔 수 있습니다'''. " +
             "이 비결정성을 없애려면 [[wait]] 가 필요합니다 → p2.c 로 옵션을 바꿔 보세요.",
             13, null, "parent", "종료");
      } else {
        var waitLine = prog === "p3" ? 15 : 10;
        push("부모 차례. rc = " + CPID + " 이므로 `else` 로 들어가 '''[[wait]](NULL)''' 을 호출합니다. " +
             "자식이 아직 안 끝났다면 부모는 여기서 [[프로세스 상태|Blocked]] 가 됩니다.",
             waitLine, null, "parent", "부모가 wait 로 대기");
        st["wc"] = String(CPID);
        push("자식이 이미 끝났으므로 [[wait]] 가 자식의 pid(" + CPID + ") 를 돌려주고 ZOMBIE 를 거둬 갑니다. " +
             "'''wait 덕분에 자식의 출력이 반드시 먼저''' 나옵니다 — 출력 순서가 '''결정적'''이 됩니다.",
             waitLine, null, "parent", "wait 리턴");
        st["output"].push("hello, I am parent of " + CPID + " (wc:" + CPID + ") (pid:" + PPID + ")");
        push("부모 출력: `hello, I am parent of " + CPID + " (wc:" + CPID + ") (pid:" + PPID + ")`.",
             waitLine + 1, null, "parent", "부모 실행 중");
        push("부모 종료. " + (prog === "p3"
          ? "정리: [[fork]] 는 '''복제''', [[exec]] 는 '''변신''', [[wait]] 는 '''동기화'''. 셸이 명령어 하나를 실행하는 방식이 정확히 이 조합입니다."
          : "정리: [[wait]] 하나로 출력 순서가 고정됐습니다. p1.c 와 비교해 보세요."),
             SRC.length - 1, null, "parent", "종료");
      }

      return {
        panels: [
          { id: "parent", title: "부모 프로세스 (pid:" + PPID + ")", lang: "c", lines: SRC },
          { id: "child",  title: "자식 프로세스 (pid:" + CPID + ")", lang: "c", lines: SRC }
        ],
        vars: [
          { name: "running", group: "누가 CPU 위에 있나" },
          { name: "parent.pid", group: "부모" },
          { name: "parent.rc", group: "부모" },
          { name: "parent.image", group: "부모" },
          { name: "wc", group: "부모" },
          { name: "child.pid", group: "자식" },
          { name: "child.rc", group: "자식" },
          { name: "child.image", group: "자식" },
          { name: "child.alive", group: "자식" },
          { name: "output", group: "표준 출력" }
        ],
        steps: steps
      };
    }
  };
})();
