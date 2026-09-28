// cv_join — 10강(OSTEP 30장) 부모-자식 join: done flag + lock + condition variable
// 원본: OSTEP Figure 30.3 (정답), 30.4 (상태 변수 없음), 30.5 (락 없음)
(function (global) {
  "use strict";
  global.SIMS = global.SIMS || {};

  // bug 종류에 따라 줄 구성이 달라지므로 라벨로 줄 번호를 관리한다
  function makeCode(bug) {
    var P = [], C = [], LP = {}, LC = {};
    function p(label, src) { P.push(src); if (label) LP[label] = P.length; }
    function c(label, src) { C.push(src); if (label) LC[label] = C.length; }

    p(null, "int main(int argc, char *argv[]) {");
    p("begin", "    printf(\"parent: begin\\n\");");
    p("create", "    Pthread_create(&p, NULL, child, NULL);");
    p("join", "    thr_join();");
    p("end", "    printf(\"parent: end\\n\");");
    p(null, "}");
    p(null, "");
    p(null, "void thr_join() {");
    if (bug === "none") {
      p("lock", "    Pthread_mutex_lock(&m);");
      p("check", "    while (done == 0)");
      p("wait", "        Pthread_cond_wait(&c, &m);");
      p("unlock", "    Pthread_mutex_unlock(&m);");
    } else if (bug === "no_state") {
      p("lock", "    Pthread_mutex_lock(&m);");
      p("wait", "    Pthread_cond_wait(&c, &m);   // 확인할 상태가 없다");
      p("unlock", "    Pthread_mutex_unlock(&m);");
    } else {
      p("check", "    if (done == 0)                // 락 없이 검사");
      p("wait", "        Pthread_cond_wait(&c);    // (가짜 API: 락 인자 없음)");
    }
    p("ret", "}");

    c(null, "void *child(void *arg) {");
    c("print", "    printf(\"child\\n\");");
    c("exit", "    thr_exit();");
    c("ret", "    return NULL;");
    c(null, "}");
    c(null, "");
    c(null, "void thr_exit() {");
    if (bug === "none") {
      c("lock", "    Pthread_mutex_lock(&m);");
      c("set", "    done = 1;");
      c("signal", "    Pthread_cond_signal(&c);");
      c("unlock", "    Pthread_mutex_unlock(&m);");
    } else if (bug === "no_state") {
      c("lock", "    Pthread_mutex_lock(&m);");
      c("signal", "    Pthread_cond_signal(&c);    // done 기록 없이 signal 만");
      c("unlock", "    Pthread_mutex_unlock(&m);");
    } else {
      c("set", "    done = 1;                     // 락 없이 기록");
      c("signal", "    Pthread_cond_signal(&c);");
    }
    c(null, "}");
    return { P: P, C: C, LP: LP, LC: LC };
  }

  var FIG = { none: "Figure 30.3", no_state: "Figure 30.4", no_lock: "Figure 30.5" };

  global.SIMS["cv_join"] = {
    title: "join 구현: done + lock + condition variable",
    desc: "OSTEP 30장 부모가 자식을 기다리는 thr_join()/thr_exit(). 상태 변수 `done` 이나 [[락|lock]] 을 빼면 어떤 실행 순서에서 부모가 '''영원히 잠드는지''' 확인한다.",
    options: [
      {
        key: "bug", label: "구현",
        values: [
          { value: "none", label: "정답 (Fig 30.3: done + lock + while)" },
          { value: "no_state", label: "done 없음 (Fig 30.4)" },
          { value: "no_lock", label: "lock 없음 (Fig 30.5)" }
        ]
      },
      {
        key: "order", label: "실행 순서",
        values: [
          { value: "parent_first", label: "부모가 계속 실행 (자식은 나중)" },
          { value: "child_first", label: "자식이 생성 즉시 실행" }
        ]
      }
    ],
    build: function (opts) {
      var bug = opts.bug || "none";
      var order = opts.order || "parent_first";
      var code = makeCode(bug);
      var LP = code.LP, LC = code.LC;
      var hasDone = bug !== "no_state";
      var hasLock = bug !== "no_lock";

      var st = { done: 0, m: "free", waiters: [], output: [], P: "running", C: "—" };
      var steps = [];
      var pcP = null, pcC = null;

      function snap() {
        return {
          done: hasDone ? st.done : "(변수 없음)",
          m: hasLock ? st.m : "(락 사용 안 함)",
          "c.waiters": st.waiters.slice(),
          output: st.output.slice(),
          "parent.state": st.P,
          "child.state": st.C
        };
      }
      function badge(s) {
        if (s === "—") return undefined;
        if (s.indexOf("running") === 0) return "running";
        if (s.indexOf("ready") === 0) return "ready";
        if (s.indexOf("done") === 0) return "done";
        return "blocked";
      }
      function push(desc, note) {
        var status = {};
        var bp = badge(st.P), bc = badge(st.C);
        if (bp) status.parent = bp;
        if (bc) status.child = bc;
        steps.push({ desc: desc, pc: { parent: pcP, child: pcC }, vars: snap(), status: status, note: note });
      }
      function runP() { st.P = "running"; if (st.C === "running") st.C = "ready"; }
      function runC() { st.C = "running"; if (st.P === "running") st.P = "ready"; }

      // --- 공통 도입 ---
      pcP = LP.begin; st.output.push("parent: begin");
      push("'''" + FIG[bug] + "''' 구현. 부모(main) 스레드가 `parent: begin` 을 출력한다. " +
        (hasDone ? "공유 상태 변수 `done = 0` 은 '''자식이 끝났는가''' 를 기록한다. " : "이 구현에는 상태 변수 `done` 이 '''없다''' — [[조건 변수]] 만으로 기다리려 한다. ") +
        (hasLock ? "" : "또 wait/signal 을 '''락 없이''' 호출한다(교재도 '실제로는 컴파일되지 않는 가짜 코드' 라고 밝힘). "));
      pcP = LP.create; st.C = "ready";
      push("`Pthread_create()` 로 자식 스레드를 만든다. 자식은 '''ready''' 상태로 스케줄러 큐에 들어갈 뿐, " +
        "언제 실행될지는 스케줄러 마음이다(단일 CPU 가정). 여기서 실행 순서가 갈린다: " +
        (order === "parent_first" ? "'''부모가 계속 달린다'''." : "'''곧바로 자식으로 전환'''된다."));

      // ================= 헬퍼: 자식 전체 실행 =================
      function childRuns(introDesc) {
        runC(); pcC = LC.print; st.output.push("child");
        push(introDesc + " 자식이 `child` 를 출력한다.");
        pcC = LC.exit;
        push("자식이 `thr_exit()` 를 호출해 '''끝났음을 알리러''' 간다.");
        if (hasLock) {
          pcC = LC.lock; st.m = "child";
          push("자식이 `Pthread_mutex_lock(&m)` — 락이 비어 있어 획득. `m = child`.");
        }
        if (hasDone) {
          pcC = LC.set; st.done = 1;
          push("자식이 `done = 1` 로 '''상태를 먼저 기록'''한다. 이 기록 덕분에 부모가 나중에 오더라도 '이미 끝났다' 는 사실을 알 수 있다.");
        }
        pcC = LC.signal;
        if (st.waiters.length) {
          st.waiters = []; st.P = "ready (깨어남, 락 재획득 대기)";
          push("자식이 `Pthread_cond_signal(&c)` — cv 큐에서 부모를 꺼내 '''ready''' 로 옮긴다. " +
            "부모가 곧바로 실행되는 것은 아니다([[Mesa semantics]]): signal 은 '상태가 바뀌었을지 모른다' 는 '''힌트''' 일 뿐이고, " +
            "부모는 나중에 스케줄될 때 wait() 안에서 락을 다시 잡은 뒤에야 돌아온다.");
        } else {
          push("자식이 `Pthread_cond_signal(&c)` — 그런데 cv 큐가 '''비어 있다'''. 잠든 스레드가 없으니 이 signal 은 " +
            "'''아무 일도 하지 않고 사라진다'''. condition variable 은 신호를 '''저장하지 않는다''' — [[wait와 signal]] 의 핵심 성질.",
            hasDone ? null : "done 같은 상태 변수가 없으면, 이 '지나가 버린 signal' 의 흔적이 어디에도 남지 않는다.");
        }
        if (hasLock) {
          pcC = LC.unlock; st.m = "free";
          push("자식이 `Pthread_mutex_unlock(&m)`. `m = free`.");
        }
        pcC = LC.ret; st.C = "done";
        push("자식이 `return NULL` 로 종료한다.");
        pcC = null;
      }

      // ================= 헬퍼: 부모가 잠든 뒤 깨어나 끝냄 =================
      function parentWakesAndEnds() {
        runP();
        if (bug === "none") {
          pcP = LP.check; st.m = "parent";
          push("부모가 스케줄된다. `Pthread_cond_wait()` 는 반환 '''직전에 락을 다시 획득'''한다(`m = parent`). " +
            "그리고 `while` 이므로 `done == 0` 을 '''다시 검사''' → `done = 1` 이라 루프를 빠져나온다. " +
            "여기서는 `if` 여도 동작하지만, [[Mesa semantics]] 에서는 깨어난 뒤 상태가 또 바뀌었을 수 있으므로 '''항상 while''' 이 안전하다.");
        } else {
          pcP = LP.wait; st.m = "parent";
          push("부모가 스케줄되어 `Pthread_cond_wait()` 에서 락을 재획득하며 돌아온다(`m = parent`).");
        }
        if (hasLock) {
          pcP = LP.unlock; st.m = "free";
          push("부모가 `Pthread_mutex_unlock(&m)`. join 완료.");
        }
        pcP = LP.end; st.output.push("parent: end"); st.P = "done";
        push("부모가 `parent: end` 를 출력하고 종료한다. 출력 순서 `parent: begin → child → parent: end` — 기대한 그대로다.",
          bug === "none" ? "결과: 정상 종료. \"parent: end\" 출력." :
            "결과: 이번 실행 순서에서는 우연히 정상 종료했다. 하지만 다른 순서(옵션을 바꿔 보라)에서는 부모가 영원히 잠든다 — 순서에 따라 맞기도 틀리기도 하는 코드는 틀린 코드다.");
      }

      // ================= 시나리오 =================
      if (order === "parent_first") {
        runP(); pcP = LP.join;
        push("부모가 계속 실행되어 `thr_join()` 을 호출한다. 자식은 아직 ready 로 대기 중.");
        if (hasLock) {
          pcP = LP.lock; st.m = "parent";
          push("부모가 `Pthread_mutex_lock(&m)` 으로 락 획득. `m = parent`. " +
            (hasDone ? "이제 `done` 을 검사하고 잠드는 과정 전체가 락으로 보호된다." : ""));
        }
        if (bug === "none") {
          pcP = LP.check;
          push("`while (done == 0)` → `done` 은 아직 0 이다. 자식이 안 끝났으니 기다려야 한다.");
          pcP = LP.wait; st.m = "free"; st.waiters = ["parent"]; st.P = "blocked (cv c 에서 잠듦)";
          push("부모가 `Pthread_cond_wait(&c, &m)` — '''락을 풀고 잠드는 것을 원자적으로''' 한다. `m = free`, `c.waiters = [parent]`. " +
            "락을 쥔 채로 자면 자식이 thr_exit() 에서 락을 못 잡아 교착되므로 반드시 풀어야 하고, " +
            "'풀기' 와 '잠들기' 사이에 틈이 없어야 signal 을 놓치지 않는다 — 이것이 wait 가 mutex 를 인자로 받는 이유다([[wait와 signal]]).");
          childRuns("부모가 잠들었으니 스케줄러가 '''자식''' 을 실행한다.");
          parentWakesAndEnds();
        } else if (bug === "no_state") {
          pcP = LP.wait; st.m = "free"; st.waiters = ["parent"]; st.P = "blocked (cv c 에서 잠듦)";
          push("부모가 검사할 상태가 없으므로 '''무조건''' `Pthread_cond_wait(&c, &m)` 으로 잠든다. `m = free`, `c.waiters = [parent]`.");
          childRuns("부모가 잠들었으니 스케줄러가 '''자식''' 을 실행한다.");
          parentWakesAndEnds();
        } else {
          pcP = LP.check;
          push("부모가 '''락 없이''' `if (done == 0)` 을 검사 → 참(0). 곧 wait 로 잠들려 한다.");
          pcP = LP.wait; st.P = "ready (wait 직전 인터럽트)";
          push("그런데 `Pthread_cond_wait()` 를 '''호출하기 직전''' 에 timer interrupt → [[컨텍스트 스위치|context switch]]. " +
            "부모는 '자식은 아직 안 끝났다' 는 판단을 쥔 채 멈췄고, 아직 cv 큐에 이름도 올리지 않았다.",
            "검사(done==0)와 잠들기(wait) 사이의 이 틈이 바로 race condition 이다. 락이 있었다면 자식이 done 을 바꾸지 못했을 것이다.");
          childRuns("자식이 실행된다.");
          runP(); pcP = LP.wait; st.waiters = ["parent"]; st.P = "blocked (영원히 잠듦)";
          push("부모가 재개되어 멈췄던 자리에서 `Pthread_cond_wait(&c)` 를 호출하고 '''잠든다'''. " +
            "하지만 `done` 은 이미 1 이고, signal 은 이미 허공으로 지나갔으며, 자식은 종료했다. " +
            "'''부모를 깨울 스레드가 더 이상 없다.''' `parent: end` 는 영원히 출력되지 않는다.",
            "결과: 부모가 영원히 잠듦. 교훈: wait 는 반드시 락을 쥐고 호출(API 가 강제), signal 도 락을 쥐고 호출하라(OSTEP TIP: Always Hold The Lock While Signaling).");
        }
      } else {
        // child_first
        childRuns("스케줄러가 '''생성 직후의 자식''' 으로 전환한다(부모는 ready 로 대기).");
        runP(); pcP = LP.join;
        push("자식이 끝났으니 부모가 다시 실행되어 `thr_join()` 을 호출한다.");
        if (hasLock) {
          pcP = LP.lock; st.m = "parent";
          push("부모가 `Pthread_mutex_lock(&m)` 으로 락 획득. `m = parent`.");
        }
        if (bug === "none" || bug === "no_lock") {
          pcP = LP.check;
          push("`" + (bug === "none" ? "while" : "if") + " (done == 0)` → `done` 은 '''이미 1''' 이다. " +
            "자식이 끝났다는 사실이 상태 변수에 남아 있으므로 '''wait 를 건너뛴다'''. 이것이 [[done flag 예제]] 에서 `done` 이 필요한 이유 — " +
            "signal 은 사라졌어도 `done` 은 남는다.");
          if (hasLock) {
            pcP = LP.unlock; st.m = "free";
            push("부모가 `Pthread_mutex_unlock(&m)`.");
          }
          pcP = LP.end; st.output.push("parent: end"); st.P = "done";
          push("부모가 `parent: end` 를 출력하고 종료한다.",
            bug === "none"
              ? "결과: 정상 종료. \"parent: end\" 출력. 정답 코드는 어느 실행 순서에서도 맞다."
              : "결과: 이번 순서에서는 우연히 정상 종료. 하지만 '부모가 검사 직후 인터럽트' 되는 순서(부모 먼저)에서는 영원히 잠든다.");
        } else {
          pcP = LP.wait; st.m = "free"; st.waiters = ["parent"]; st.P = "blocked (영원히 잠듦)";
          push("부모가 `Pthread_cond_wait(&c, &m)` 으로 잠든다(`m = free`, `c.waiters = [parent]`). " +
            "그런데 자식은 '''이미 signal 을 보내고 종료했다'''. 그 signal 은 아무도 없을 때 와서 사라졌고, " +
            "'자식이 끝났다' 는 사실을 기록한 변수도 없다. '''부모를 깨울 스레드가 영원히 없다.'''",
            "결과: 부모가 영원히 잠듦 (\"parent: end\" 가 출력되지 않음). 교훈: 상태 변수 done 이 있어야 한다 — sleeping, waking, locking 이 모두 이 변수를 중심으로 짜여 있다(OSTEP).");
        }
      }

      return {
        panels: [
          { id: "parent", title: "Parent (main + thr_join)", lang: "c", lines: code.P },
          { id: "child", title: "Child (child + thr_exit)", lang: "c", lines: code.C }
        ],
        vars: [
          { name: "done", label: "done (상태 변수)", group: "공유 변수" },
          { name: "m", label: "mutex m 소유자", group: "공유 변수" },
          { name: "c.waiters", label: "cv c 대기 큐", group: "공유 변수" },
          { name: "output", label: "stdout", group: "출력" },
          { name: "parent.state", label: "parent", group: "스레드 상태" },
          { name: "child.state", label: "child", group: "스레드 상태" }
        ],
        steps: steps
      };
    }
  };
})(typeof window !== "undefined" ? window : globalThis);
