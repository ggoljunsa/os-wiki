// proc_states — 프로세스 상태 기계 (Running / Ready / Blocked) + OSTEP 추적표
// 출처: 3-From_Program_to_Process.pdf p.34~35, OSTEP Ch.4 Figure 4.3 / 4.4
window.SIMS = window.SIMS || {};

(function () {
  var TRACE_CPU = [
    "Time   Process0   Process1   Notes",
    "  1    Running    Ready",
    "  2    Running    Ready",
    "  3    Running    Ready",
    "  4    Running    Ready      Process0 now done",
    "  5      –        Running",
    "  6      –        Running",
    "  7      –        Running",
    "  8      –        Running    Process1 now done"
  ];

  var TRACE_IO = [
    "Time   Process0   Process1   Notes",
    "  1    Running    Ready",
    "  2    Running    Ready",
    "  3    Running    Ready      Process0 initiates I/O",
    "  4    Blocked    Running    Process0 is blocked,",
    "  5    Blocked    Running    so Process1 runs",
    "  6    Blocked    Running",
    "  7    Ready      Running    I/O done",
    "  8    Ready      Running    Process1 now done",
    "  9    Running      –",
    " 10    Running      –        Process0 now done"
  ];

  // {t, p0, p1, note, event, arrow:[from,to,who]}
  var ROWS_CPU = [
    { t: 1, p0: "Running", p1: "Ready",   ev: "P0 스케줄됨",
      arrow: ["Ready", "Running", "P0"],
      d: "[[스케줄러]] 가 P0 을 골라 CPU 에 올렸습니다. P1 은 '''실행할 준비는 됐지만''' OS 가 지금은 고르지 않았을 뿐인 [[프로세스 상태|Ready]] 입니다." },
    { t: 2, p0: "Running", p1: "Ready", ev: "계속 실행",
      d: "P0 은 CPU 를 계속 씁니다. 이 예제의 P0 은 I/O 를 전혀 하지 않는 '''CPU-bound''' 작업입니다." },
    { t: 3, p0: "Running", p1: "Ready", ev: "계속 실행",
      d: "P1 은 여전히 Ready. Ready 상태의 프로세스는 [[프로세스 목록]] 의 ready 큐에 매달려 있습니다." },
    { t: 4, p0: "Running", p1: "Ready", ev: "P0 종료", note: "Process0 now done",
      d: "P0 이 마지막 명령을 마치고 exit() 합니다. xv6 라면 [[struct proc]] 의 state 가 ZOMBIE 가 되어 부모의 [[wait]] 를 기다립니다." },
    { t: 5, p0: "–", p1: "Running", ev: "P1 스케줄됨",
      arrow: ["Ready", "Running", "P1"],
      d: "P0 이 비워 준 CPU 에 P1 이 올라갑니다. [[컨텍스트 스위치]] 가 여기서 일어납니다." },
    { t: 6, p0: "–", p1: "Running", ev: "계속 실행", d: "P1 실행 중." },
    { t: 7, p0: "–", p1: "Running", ev: "계속 실행", d: "P1 실행 중." },
    { t: 8, p0: "–", p1: "Running", ev: "P1 종료", note: "Process1 now done",
      d: "P1 도 끝났습니다. 두 작업이 '''겹치지 않았으므로''' 이 둘은 [[동시성|concurrent]] 가 아니라 sequential 입니다. (3강 p.29)" }
  ];

  var ROWS_IO = [
    { t: 1, p0: "Running", p1: "Ready", ev: "P0 스케줄됨",
      arrow: ["Ready", "Running", "P0"],
      d: "P0 이 먼저 CPU 를 잡습니다." },
    { t: 2, p0: "Running", p1: "Ready", ev: "계속 실행", d: "P1 은 Ready 큐에서 대기." },
    { t: 3, p0: "Running", p1: "Ready", ev: "P0 이 I/O 요청", note: "Process0 initiates I/O",
      d: "P0 이 디스크 읽기 같은 [[시스템 콜]] 을 겁니다. 디스크는 CPU 보다 '''수십만 배''' 느리므로 " +
         "결과를 기다리며 CPU 를 붙잡고 있는 건 낭비입니다." },
    { t: 4, p0: "Blocked", p1: "Running", ev: "P0: Running → Blocked, P1 스케줄됨",
      arrow: ["Running", "Blocked", "P0"], note: "Process0 is blocked",
      d: "'''Running → Blocked''' 전이 (I/O: initiate). P0 은 이제 스케줄 대상에서 빠지고, " +
         "OS 는 그 CPU 를 P1 에게 줍니다. 이것이 [[I/O와 스케줄링|I/O 중첩(overlap)]] 의 핵심입니다." },
    { t: 5, p0: "Blocked", p1: "Running", ev: "P1 실행 중",
      d: "Blocked 는 Ready 와 '''다릅니다''' — 스케줄러가 골라도 실행할 수 없는 상태입니다. " +
         "고르면 안 되는 게 아니라 '''고를 수 없는''' 상태." },
    { t: 6, p0: "Blocked", p1: "Running", ev: "P1 실행 중", d: "디스크가 아직 응답하지 않았습니다." },
    { t: 7, p0: "Ready", p1: "Running", ev: "I/O 완료 인터럽트", note: "I/O done",
      arrow: ["Blocked", "Ready", "P0"],
      d: "디스크가 [[인터럽트]] 를 올립니다. OS 가 P0 을 '''Blocked → Ready''' 로 옮깁니다. " +
         "'''바로 Running 이 아닙니다''' — CPU 는 아직 P1 이 쓰고 있고, 언제 P0 을 올릴지는 [[스케줄링|정책]] 의 몫입니다.",
      warn: true },
    { t: 8, p0: "Ready", p1: "Running", ev: "P1 종료", note: "Process1 now done",
      d: "P1 이 끝납니다. 이 OS 는 I/O 가 끝나도 즉시 [[선점]] 하지 않는 정책을 쓰고 있습니다." },
    { t: 9, p0: "Running", p1: "–", ev: "P0 재개",
      arrow: ["Ready", "Running", "P0"],
      d: "이제 Ready 였던 P0 이 다시 Running. 여기서는 P0 과 P1 의 실행 구간이 '''겹쳤으므로''' 둘은 concurrent 합니다." },
    { t: 10, p0: "Running", p1: "–", ev: "P0 종료", note: "Process0 now done",
      d: "P0 도 끝. 총 10 단위 — CPU-only 예제(8 단위)보다 길지만, " +
         "P0 이 I/O 를 기다리는 동안 P1 을 돌려 '''CPU 를 놀리지 않았습니다'''." }
  ];

  function stateSvg(p0, p1, arrow) {
    function circle(cx, cy, label, members, hot) {
      var s = '<circle cx="' + cx + '" cy="' + cy + '" r="40" fill="' +
              (hot ? "#2f6da8" : "#343a42") + '" stroke="' + (hot ? "#7fc0ff" : "#4b535d") + '" stroke-width="2"/>';
      s += '<text x="' + cx + '" y="' + (cy - 8) + '" font-size="12" text-anchor="middle" fill="#fff">' + label + '</text>';
      s += '<text x="' + cx + '" y="' + (cy + 12) + '" font-size="13" text-anchor="middle" fill="#ffd98a">' +
           (members || "·") + '</text>';
      return s;
    }
    function who(state) {
      var a = [];
      if (p0 === state) a.push("P0");
      if (p1 === state) a.push("P1");
      return a.join(" ");
    }
    var hi = arrow ? arrow : null;
    var s = '<svg viewBox="0 0 360 240" width="100%" style="max-width:360px">';
    // arrows
    function edge(x1, y1, x2, y2, label, lx, ly, on) {
      var col = on ? "#e8a33d" : "#5b646f";
      var wd = on ? 2.5 : 1.3;
      var out = '<path d="M' + x1 + ' ' + y1 + ' L' + x2 + ' ' + y2 + '" stroke="' + col +
                '" stroke-width="' + wd + '" fill="none"/>';
      var dx = x2 - x1, dy = y2 - y1, L = Math.sqrt(dx * dx + dy * dy) || 1;
      var ux = dx / L, uy = dy / L;
      var px = -uy, py = ux;
      out += '<polygon points="' + x2 + ',' + y2 + ' ' + (x2 - 9 * ux + 4 * px) + ',' + (y2 - 9 * uy + 4 * py) +
             ' ' + (x2 - 9 * ux - 4 * px) + ',' + (y2 - 9 * uy - 4 * py) + '" fill="' + col + '"/>';
      out += '<text x="' + lx + '" y="' + ly + '" font-size="9" text-anchor="middle" fill="' + col + '">' + label + '</text>';
      return out;
    }
    function on(f, t) { return hi && hi[0] === f && hi[1] === t; }
    s += edge(115, 44, 205, 44, "Descheduled", 160, 36, on("Running", "Ready"));
    s += edge(205, 68, 115, 68, "Scheduled", 160, 84, on("Ready", "Running"));
    s += edge(70, 96, 150, 152, "I/O: initiate", 62, 132, on("Running", "Blocked"));
    s += edge(175, 152, 250, 96, "I/O: done", 268, 136, on("Blocked", "Ready"));
    s += circle(70, 56, "Running", who("Running"), p0 === "Running" || p1 === "Running");
    s += circle(250, 56, "Ready", who("Ready"), p0 === "Ready" || p1 === "Ready");
    s += circle(160, 180, "Blocked", who("Blocked"), p0 === "Blocked" || p1 === "Blocked");
    s += '<text x="180" y="232" font-size="9.5" text-anchor="middle" fill="#9aa">' +
         'Running = CPU 위 · Ready = 돌 준비 됨 · Blocked = 돌 수 없음</text>';
    s += '</svg>';
    return s;
  }

  window.SIMS["proc_states"] = {
    title: "프로세스 상태 기계 (Running / Ready / Blocked)",
    desc: "OSTEP 4장의 추적표를 한 단위 시간씩 따라가며 두 프로세스가 어느 상태에 있는지 봅니다.",
    options: [
      { key: "scenario", label: "시나리오", values: [
        { value: "cpu_only", label: "CPU 만 쓰는 두 작업" },
        { value: "with_io",  label: "P0 이 I/O 를 거는 경우" }
      ]}
    ],
    build: function (opts) {
      opts = opts || {};
      var sc = opts.scenario || "cpu_only";
      var rows = (sc === "with_io") ? ROWS_IO : ROWS_CPU;
      var lines = (sc === "with_io") ? TRACE_IO : TRACE_CPU;

      var st = { "time": 0, "P0.state": "Ready", "P1.state": "Ready", "event": "아직 시작 전" };
      var steps = [];
      function snap() { var o = {}; for (var k in st) o[k] = st[k]; return o; }

      steps.push({
        desc: "두 프로세스가 모두 [[프로세스 상태|Ready]] 로 [[프로세스 목록]] 에 올라와 있습니다. " +
              "'''상태는 세 가지''' — Running(CPU 위), Ready(돌 준비는 됐지만 안 뽑힘), Blocked(I/O 등을 기다려 돌 수 없음). (3강 p.34~35)",
        pc: { trace: 1 },
        vars: snap(),
        status: { trace: "t=0" },
        svg: stateSvg("Ready", "Ready", null)
      });

      for (var k = 0; k < rows.length; k++) {
        var r = rows[k];
        st["time"] = r.t;
        st["P0.state"] = r.p0;
        st["P1.state"] = r.p1;
        st["event"] = r.ev;
        steps.push({
          desc: "'''t = " + r.t + "'''  —  " + r.d,
          pc: { trace: k + 2 },
          vars: snap(),
          status: { trace: "t=" + r.t },
          note: r.warn
            ? "시험 단골 함정: I/O 가 끝나면 [[프로세스 상태|Blocked → Ready]] 이지 Blocked → Running 이 아닙니다. Running 으로 올리는 건 [[스케줄러]] 의 별도 결정입니다."
            : undefined,
          svg: stateSvg(r.p0, r.p1, r.arrow || null)
        });
      }

      var last = rows[rows.length - 1];
      st["event"] = "둘 다 종료";
      steps.push({
        desc: (sc === "with_io"
          ? "정리: P0 이 [[I/O와 스케줄링|I/O 로 Blocked]] 된 동안 P1 을 돌려 CPU 를 놀리지 않았습니다. " +
            "이 '겹침(overlap)' 이 [[스케줄링]] 에서 I/O 를 다루는 기본 아이디어입니다."
          : "정리: CPU 만 쓰는 작업 둘은 서로 겹치지 않고 차례로 끝났습니다. " +
            "이 표가 [[FIFO]] 스케줄링의 가장 단순한 모습입니다.") +
          " 실제 xv6 의 [[struct proc]] 은 UNUSED / EMBRYO / SLEEPING / RUNNABLE / RUNNING / ZOMBIE 로 더 잘게 나눕니다. (3강 p.38)",
        pc: { trace: lines.length },
        vars: snap(),
        status: { trace: "완료" },
        svg: stateSvg(last.p0, last.p1, null)
      });

      return {
        panels: [
          { id: "trace", title: (sc === "with_io" ? "Tracing Process State: CPU and I/O" : "Tracing Process State: CPU Only"),
            lang: "txt", lines: lines }
        ],
        vars: [
          { name: "time", group: "시간" },
          { name: "event", group: "시간" },
          { name: "P0.state", group: "프로세스 상태" },
          { name: "P1.state", group: "프로세스 상태" }
        ],
        steps: steps
      };
    }
  };
})();
