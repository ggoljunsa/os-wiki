// mlfq — Multi-Level Feedback Queue (3-큐, 규칙 1~5, allotment, priority boost)
// 5강 p.29~p.39 의 Example 1/2/3 · Priority Boost · Better Accounting 을 그대로 재현한다.
window.SIMS = window.SIMS || {};

(function () {
  var TOP = 2, NLV = 3, ALLOT = 10;            // 슬라이드 Example 1~3: 세 큐 모두 time slice 10ms
  var COLORS = { A: "#3b82f6", B: "#10b981", C: "#f59e0b" };
  var LVNAME = ["Q0 (최저)", "Q1", "Q2 (최고)"];

  var RULES = {
    id: "RULES", title: "MLFQ 규칙 (5강 p.43)", lang: "txt",
    lines: [
      "Rule 1: Priority(A) > Priority(B) 이면 A 가 실행 (B 는 대기)",
      "Rule 2: Priority(A) = Priority(B) 이면 A, B 를 RR 로 실행",
      "Rule 3: job 이 처음 들어오면 '최상위 큐'에 놓는다",
      "Rule 4: 한 레벨에서 allotment 를 다 쓰면 우선순위를 낮춘다",
      "        (구 Rule 4b: slice 전에 CPU 를 놓으면 같은 레벨 유지 -> gaming 가능)",
      "Rule 5: 주기 S 마다 모든 job 을 최상위 큐로 올린다 (priority boost)",
      "(대기) I/O 중이거나 아직 도착 전"
    ]
  };

  var SCEN = {
    single_long: {
      label: "① 긴 CPU job 하나 (p.33)",
      end: 200, boostS: 0, gaming: false,
      jobs: [{ id: "A", arrival: 0, kind: "cpu", total: 200 }],
      intro: "CPU 만 쓰는 긴 job A 하나. Rule 3 으로 Q2 에서 시작해 allotment(10ms)를 쓸 때마다 Rule 4 로 한 칸씩 내려가 Q0 에 정착한다."
    },
    short_arrives: {
      label: "② 긴 job + 나중에 온 짧은 job (p.34)",
      end: 200, boostS: 0, gaming: false,
      jobs: [
        { id: "A", arrival: 0, kind: "cpu", total: 300 },
        { id: "B", arrival: 100, kind: "cpu", total: 20 }
      ],
      intro: "A 는 이미 Q0 까지 내려와 있고, t=100 에 20ms 짜리 B 가 도착한다. Rule 3 덕에 B 는 Q2 에서 시작해 A 를 선점 — MLFQ 가 [[STCF]] 를 흉내내는 장면."
    },
    io_job: {
      label: "③ slice 직전에 I/O 를 내는 job (p.37·p.39)",
      end: 100, boostS: 0, gaming: null,       // gaming 은 rule4 옵션으로 결정
      jobs: [
        { id: "A", arrival: 0, kind: "cpu", total: 400 },
        { id: "B", arrival: 0, kind: "io", cpuBurst: 9, ioTime: 1, total: 400 }
      ],
      intro: "B 는 slice(10ms)가 끝나기 '직전'인 9ms 에서 일부러 I/O 를 내는 악의적 job. 구 Rule 4b 에서는 '양보했으니 같은 레벨 유지'라 B 가 Q2 를 독점한다 (gaming). 새 Rule 4(allotment 누적)로 막을 수 있다."
    },
    boost: {
      label: "④ starvation → priority boost (p.38)",
      end: 130, boostS: 50, gaming: true,
      jobs: [
        { id: "A", arrival: 0, kind: "cpu", total: 400 },
        { id: "B", arrival: 0, kind: "io", cpuBurst: 5, ioTime: 5, total: 400 },
        { id: "C", arrival: 0, kind: "io", cpuBurst: 5, ioTime: 5, total: 400 }
      ],
      intro: "긴 CPU job A + 인터랙티브 job B·C. B·C 가 번갈아 CPU 를 꽉 채워 A 는 Q0 에서 굶는다(starvation). Rule 5 가 S=50ms 마다 전원을 Q2 로 끌어올려 A 를 구제한다."
    }
  };

  function sim(sc, gaming) {
    var jobs = sc.jobs.map(function (j) {
      return {
        id: j.id, arrival: j.arrival, kind: j.kind, total: j.total,
        cpuBurst: j.cpuBurst || 0, ioTime: j.ioTime || 0,
        remaining: j.total, burstLeft: j.cpuBurst || 0, ioLeft: 0,
        level: TOP, allot: 0, used: 0, arrived: false, state: "미도착"
      };
    });
    var queues = [[], [], []], running = null, trace = [];

    for (var t = 0; t < sc.end; t++) {
      var pre = [], post = [];
      // --- I/O 진행 / 완료
      jobs.forEach(function (j, i) {
        if (j.state !== "blocked") return;
        if (j.ioLeft <= 0) { j.state = "ready"; queues[j.level].push(i); pre.push({ type: "iodone", job: i }); }
        else j.ioLeft--;
      });
      // --- 도착 (Rule 3)
      jobs.forEach(function (j, i) {
        if (j.arrived || j.arrival > t) return;
        j.arrived = true; j.state = "ready"; j.level = TOP; j.allot = 0;
        queues[TOP].push(i); pre.push({ type: "arrive", job: i });
      });
      // --- Rule 5 priority boost
      if (sc.boostS > 0 && t > 0 && t % sc.boostS === 0) {
        queues = [[], [], []];
        jobs.forEach(function (j, i) {
          if (!j.arrived || j.state === "done") return;
          j.level = TOP; j.allot = 0;
          if (j.state === "ready") queues[TOP].push(i);
        });
        pre.push({ type: "boost" });
      }
      // --- Rule 1: 더 높은 큐에 job 이 있으면 선점
      if (running !== null) {
        var rl = jobs[running].level;
        for (var L = TOP; L > rl; L--) {
          if (queues[L].length) {
            jobs[running].state = "ready"; queues[rl].unshift(running);
            pre.push({ type: "preempt", job: running }); running = null; break;
          }
        }
      }
      // --- dispatch (Rule 1 + Rule 2)
      if (running === null) {
        for (var L2 = TOP; L2 >= 0 && running === null; L2--) {
          while (queues[L2].length) {
            var c = queues[L2].shift();
            if (jobs[c].state === "ready") { running = c; jobs[c].state = "running"; pre.push({ type: "dispatch", job: c }); break; }
          }
        }
      }
      // --- 1ms 실행
      var ran = running, ranLevel = running === null ? -1 : jobs[running].level;
      if (running !== null) {
        var j2 = jobs[running];
        j2.used++; j2.allot++; j2.remaining--;
        if (j2.kind === "io") j2.burstLeft--;
        if (j2.remaining <= 0) {
          j2.state = "done"; post.push({ type: "done", job: running }); running = null;
        } else if (j2.kind === "io" && j2.burstLeft <= 0) {
          j2.state = "blocked"; j2.ioLeft = j2.ioTime; j2.burstLeft = j2.cpuBurst;
          if (gaming) j2.allot = 0;                       // 구 Rule 4b: 양보하면 카운터 리셋
          post.push({ type: "io", job: running }); running = null;
        } else if (j2.allot >= ALLOT) {                    // Rule 4
          j2.allot = 0; j2.state = "ready";
          if (j2.level > 0) { j2.level--; post.push({ type: "demote", job: running }); }
          else post.push({ type: "requeue", job: running });
          queues[j2.level].push(running); running = null;
        }
      }
      trace.push({
        t: t, ran: ran, ranLevel: ranLevel, pre: pre, post: post,
        snap: {
          running: running,
          queues: [queues[0].slice(), queues[1].slice(), queues[2].slice()],
          jobs: jobs.map(function (j) { return { level: j.level, allot: j.allot, state: j.state, used: j.used }; })
        }
      });
    }
    return { jobs: jobs, trace: trace };
  }

  // ---------------- SVG ----------------
  function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;"); }

  function svgFor(s, jobs, end, idx) {
    var snap = idx < 0 ? null : s.trace[idx].snap;
    var lanes = [], i;
    for (i = 0; i < NLV; i++) lanes.push((snap ? snap.queues[i] : []).slice());
    var running = snap ? snap.running : null;
    if (idx >= 0 && s.trace[idx].ran !== null && running === null) running = s.trace[idx].ran;

    var W = 760, laneH = 34, laneY0 = 20, laneGap = 8;
    var tlY = laneY0 + NLV * (laneH + laneGap) + 22;
    var H = tlY + 60;
    var o = ['<svg viewBox="0 0 ' + W + ' ' + H + '" width="100%" style="max-width:760px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace">'];

    for (i = 0; i < NLV; i++) {
      var lv = TOP - i;                               // 위에서부터 Q2, Q1, Q0
      var y = laneY0 + i * (laneH + laneGap);
      o.push('<text x="4" y="' + (y + 21) + '" font-size="11" fill="#8b95a5">' + LVNAME[lv] + '</text>');
      o.push('<rect x="72" y="' + y + '" width="' + (W - 82) + '" height="' + laneH +
        '" rx="6" fill="#8b95a5" fill-opacity="0.07" stroke="#8b95a5" stroke-opacity="0.25"/>');
      var x = 80;
      if (running !== null && snap && snap.jobs[running].level === lv) {
        var rc = COLORS[jobs[running].id] || "#3b82f6";
        o.push('<rect x="' + x + '" y="' + (y + 5) + '" width="88" height="' + (laneH - 10) + '" rx="4" fill="' + rc + '"/>');
        o.push('<text x="' + (x + 44) + '" y="' + (y + 21) + '" font-size="11" font-weight="bold" fill="#fff" text-anchor="middle">' +
          esc(jobs[running].id) + ' ▶RUN</text>');
        x += 96;
      }
      lanes[lv].forEach(function (ji) {
        var col = COLORS[jobs[ji].id] || "#888";
        o.push('<rect x="' + x + '" y="' + (y + 7) + '" width="34" height="' + (laneH - 14) + '" rx="4" fill="' + col + '" fill-opacity="0.35" stroke="' + col + '"/>');
        o.push('<text x="' + (x + 17) + '" y="' + (y + 21) + '" font-size="11" fill="' + col + '" text-anchor="middle">' + esc(jobs[ji].id) + '</text>');
        x += 40;
      });
      if (lv === TOP) {
        var blocked = jobs.map(function (j, k) { return k; }).filter(function (k) {
          return snap && snap.jobs[k].state === "blocked";
        });
        if (blocked.length) {
          o.push('<text x="' + (W - 14) + '" y="' + (y + 21) + '" font-size="10" fill="#8b95a5" text-anchor="end">I/O 대기: ' +
            blocked.map(function (k) { return jobs[k].id; }).join(",") + '</text>');
        }
      }
    }

    // 하단 레벨 타임라인 (슬라이드 그림과 같은 형태)
    var L = 72, R = W - 10, sc2 = (R - L) / Math.max(1, end);
    o.push('<text x="4" y="' + (tlY + 12) + '" font-size="10" fill="#8b95a5">시간축</text>');
    for (i = 0; i < NLV; i++) {
      var lv2 = TOP - i, yy = tlY + i * 14;
      o.push('<line x1="' + L + '" y1="' + (yy + 12) + '" x2="' + R + '" y2="' + (yy + 12) + '" stroke="#8b95a5" stroke-opacity="0.2"/>');
      o.push('<text x="' + (L - 6) + '" y="' + (yy + 15) + '" font-size="9" fill="#8b95a5" text-anchor="end">Q' + lv2 + '</text>');
    }
    var upto = idx < 0 ? -1 : idx;
    for (i = 0; i <= upto; i++) {
      var tr = s.trace[i];
      if (tr.ran === null) continue;
      var row = TOP - tr.ranLevel;
      var cx = L + i * sc2;
      var col2 = COLORS[jobs[tr.ran].id] || "#888";
      o.push('<rect x="' + cx.toFixed(1) + '" y="' + (tlY + row * 14) + '" width="' + Math.max(1, sc2).toFixed(2) +
        '" height="11" fill="' + col2 + '"/>');
    }
    var step = end > 160 ? 50 : (end > 60 ? 20 : 10);
    for (var tt = 0; tt <= end; tt += step) {
      o.push('<text x="' + (L + tt * sc2).toFixed(1) + '" y="' + (tlY + NLV * 14 + 12) + '" font-size="9" fill="#8b95a5" text-anchor="middle">' + tt + '</text>');
    }
    var nowX = L + (upto + 1) * sc2;
    o.push('<line x1="' + nowX.toFixed(1) + '" y1="' + (tlY - 2) + '" x2="' + nowX.toFixed(1) + '" y2="' + (tlY + NLV * 14) +
      '" stroke="#ef4444" stroke-width="1.5"/>');
    o.push("</svg>");
    return o.join("");
  }

  // ---------------- 스텝 만들기 ----------------
  var NOTABLE = { arrive: 1, iodone: 1, boost: 1, preempt: 1, io: 1, demote: 1, done: 1 };
  function hasNotable(list) { for (var i = 0; i < list.length; i++) if (NOTABLE[list[i].type]) return true; return false; }

  function blocksOf(trace) {
    var out = [], start = 0;
    for (var i = 0; i < trace.length; i++) {
      var newBlock = (i === 0) || (trace[i].ran !== trace[i - 1].ran) ||
        hasNotable(trace[i].pre) || hasNotable(trace[i - 1].post) || (i - start >= 50);
      if (newBlock && i > 0) { out.push({ s: start, e: i }); start = i; }
    }
    out.push({ s: start, e: trace.length });
    return out;
  }

  function evText(ev, jobs, ruleLine) {
    var j = ev.job !== undefined ? jobs[ev.job].id : "";
    switch (ev.type) {
      case "arrive": return "'''" + j + " 도착''' → Rule 3 에 따라 최상위 Q2 에 넣는다.";
      case "iodone": return j + " 의 I/O 완료 → blocked 에서 ready 로 돌아와 같은 레벨 큐 뒤에 붙는다.";
      case "boost": return "⭐ '''Rule 5 priority boost''' — 모든 job 을 Q2 로 끌어올리고 allotment 를 0 으로 리셋.";
      case "preempt": return j + " 는 더 높은 큐에 job 이 생겨 '''선점당함''' (Rule 1).";
      case "io": return "'''" + j + " 가 I/O 발행''' → blocked. CPU 를 자발적으로 놓았다.";
      case "demote": return "'''Rule 4''': " + j + " 가 allotment 10ms 를 다 씀 → 한 단계 강등.";
      case "done": return "'''" + j + " 완료'''.";
      default: return "";
    }
  }

  SIMS["mlfq"] = {
    title: "MLFQ — 3-큐 피드백 스케줄러",
    desc: "[[MLFQ]] 규칙 1~5 를 눈으로 본다. Rule 3(신규는 최상위), Rule 4(allotment 소진 시 강등), Rule 5(주기 S 마다 [[선점|priority boost]])가 실제로 언제 발동하는지 큐 그림과 시간축으로 보여준다. allotment = 10ms, 큐 3개.",
    options: [
      {
        key: "scenario", label: "시나리오", values: [
          { value: "single_long", label: "① 긴 CPU job 하나 (p.33)" },
          { value: "short_arrives", label: "② 나중에 온 짧은 job (p.34)" },
          { value: "io_job", label: "③ gaming: slice 직전 I/O (p.39)" },
          { value: "boost", label: "④ starvation → boost (p.38)" }
        ]
      },
      {
        key: "rule4", label: "Rule 4 (시나리오 ③ 전용)", values: [
          { value: "gaming", label: "구 Rule 4b — 양보하면 레벨 유지" },
          { value: "allotment", label: "새 Rule 4 — allotment 누적" }
        ]
      }
    ],

    build: function (opts) {
      var key = opts.scenario || "single_long";
      var sc = SCEN[key];
      var gaming = (sc.gaming === null) ? ((opts.rule4 || "gaming") === "gaming") : sc.gaming;
      var s = sim(sc, gaming);
      var jobs = s.jobs;

      var vars = [
        { name: "time", group: "스케줄러" },
        { name: "running", group: "스케줄러" },
        { name: "Q2 (최고)", group: "큐" },
        { name: "Q1", group: "큐" },
        { name: "Q0 (최저)", group: "큐" },
        { name: "I/O blocked", group: "큐" }
      ];
      jobs.forEach(function (j) {
        vars.push({ name: j.id + ".level", group: "job " + j.id });
        vars.push({ name: j.id + ".allot(사용)", group: "job " + j.id });
        vars.push({ name: j.id + ".state", group: "job " + j.id });
        vars.push({ name: j.id + ".CPU누적", group: "job " + j.id });
      });

      function snapVars(idx) {
        var snap = idx < 0
          ? { running: null, queues: [[], [], []], jobs: jobs.map(function (j) { return { level: TOP, allot: 0, state: j.arrival === 0 ? "ready" : "미도착", used: 0 }; }) }
          : s.trace[idx].snap;
        var run = idx < 0 ? null : (snap.running !== null ? snap.running : s.trace[idx].ran);
        function q(i) {
          var arr = snap.queues[i].filter(function (k) { return snap.jobs[k].state === "ready"; });
          return arr.length ? "[" + arr.map(function (k) { return jobs[k].id; }).join(", ") + "]" : "[ ]";
        }
        var v = {
          time: (idx + 1) + " ms",
          running: run === null ? "— (idle)" : jobs[run].id + " @ Q" + snap.jobs[run].level,
          "Q2 (최고)": q(2), "Q1": q(1), "Q0 (최저)": q(0)
        };
        var bl = [];
        snap.jobs.forEach(function (x, k) { if (x.state === "blocked") bl.push(jobs[k].id + "(I/O)"); });
        v["I/O blocked"] = bl.length ? bl.join(", ") : "—";
        jobs.forEach(function (j, k) {
          v[j.id + ".level"] = "Q" + snap.jobs[k].level;
          v[j.id + ".allot(사용)"] = snap.jobs[k].allot + " / " + ALLOT + " ms";
          v[j.id + ".state"] = snap.jobs[k].state === "running" ? "running"
            : snap.jobs[k].state === "blocked" ? "blocked (I/O)" : snap.jobs[k].state;
          v[j.id + ".CPU누적"] = snap.jobs[k].used + " ms";
        });
        return v;
      }

      var steps = [];
      var ruleNote = gaming
        ? "지금은 '''구 Rule 4b''' — slice 를 다 쓰기 전에 CPU 를 놓으면 같은 레벨에 남는다."
        : "지금은 '''새 Rule 4''' — 레벨별 allotment 를 '누적'해서 센다. 중간에 몇 번 양보했든 10ms 를 다 쓰면 강등.";

      steps.push({
        desc: "'''" + sc.label + "''' — " + sc.intro + " " +
          (key === "io_job" ? ruleNote + " " : "") +
          (sc.boostS ? "priority boost 주기 S = " + sc.boostS + "ms. " : "") +
          "아래 시간축 그림이 슬라이드의 Q2/Q1/Q0 막대 그림과 같은 것이다.",
        pc: { RULES: 3 },
        vars: snapVars(-1),
        svg: svgFor(s, jobs, sc.end, -1)
      });

      var blocks = blocksOf(s.trace);
      blocks.forEach(function (b) {
        var first = s.trace[b.s], last = s.trace[b.e - 1];
        var msgs = [];
        first.pre.forEach(function (e) { if (NOTABLE[e.type]) msgs.push(evText(e, jobs)); });
        var head;
        if (first.ran === null) {
          head = "t = " + b.s + " → " + b.e + " ms : CPU idle.";
        } else {
          head = "t = " + b.s + " → " + b.e + " ms : '''" + jobs[first.ran].id + "''' 가 '''Q" + first.ranLevel +
            "''' 에서 " + (b.e - b.s) + "ms 실행.";
        }
        last.post.forEach(function (e) { if (NOTABLE[e.type]) msgs.push(evText(e, jobs)); });

        var line = 2;
        var all = first.pre.concat(last.post);
        for (var i = 0; i < all.length; i++) {
          if (all[i].type === "arrive") line = 3;
          else if (all[i].type === "demote") line = 4;
          else if (all[i].type === "io") line = gaming ? 5 : 4;
          else if (all[i].type === "boost") line = 6;
          else if (all[i].type === "preempt") line = 1;
          else if (all[i].type === "iodone") line = 7;
        }

        steps.push({
          desc: head + (msgs.length ? " " + msgs.join(" ") : ""),
          pc: { RULES: line },
          vars: snapVars(b.e - 1),
          svg: svgFor(s, jobs, sc.end, b.e - 1)
        });
      });

      // 마지막 요약
      var tally = jobs.map(function (j) { return j.id + " " + j.used + "ms (Q" + j.level + ")"; }).join(", ");
      steps.push({
        desc: "'''정리''' — " + sc.end + "ms 동안 받은 CPU: " + tally + ". " + SUMMARY(key, gaming),
        pc: { RULES: 4 },
        vars: snapVars(s.trace.length - 1),
        note: key === "io_job" && gaming
          ? "구 Rule 4b 하에서 B 가 Q2 를 독점하고 A 는 거의 굶는다 — 슬라이드 p.39 왼쪽 그림."
          : null,
        svg: svgFor(s, jobs, sc.end, s.trace.length - 1)
      });

      return { panels: [RULES], vars: vars, steps: steps };
    }
  };

  function SUMMARY(key, gaming) {
    if (key === "single_long")
      return "Q2 에서 10ms, Q1 에서 10ms 쓰고 t=20 부터는 Q0 에 정착 — 슬라이드 p.33 그림 그대로. 더 내려갈 큐가 없으니 Q0 에서는 계속 RR(혼자라 연속 실행)한다.";
    if (key === "short_arrives")
      return "B 는 자기 길이(20ms)를 아무도 모르는데도 Rule 3 덕에 Q2 에서 시작해 20ms 만에 끝났다. 이게 '''MLFQ approximates [[STCF]]''' (p.35) 의 의미. B 의 [[response time]] = 0.";
    if (key === "io_job")
      return gaming
        ? "B 는 9ms 마다 I/O 를 내 '양보'했다고 인정받아 Q2 에 계속 남는다 → CPU 의 90% 를 가져가고 A 는 Q0 에서 굶는다. 슬라이드 p.37 의 '''Attack'''."
        : "allotment 를 누적해서 세니 B 도 결국 10ms 를 채우고 강등된다 → A 가 CPU 를 되찾는다. 슬라이드 p.39 '''Better Accounting''' 오른쪽 그림.";
    return "boost 가 없으면 A 는 Q0 에서 영원히 굶는다. Rule 5 가 S=50ms 마다 전원을 Q2 로 올려 A 에게 최소한의 몫을 보장한다 — 슬라이드 p.38 오른쪽. 대가는 '''짧은 job 의 [[response time]] 이 약간 나빠지는 것'''.";
  }
})();
