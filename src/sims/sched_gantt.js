// sched_gantt — FIFO / SJF / STCF / Round Robin 간트 차트 시뮬레이터
// 5강 Process Scheduling 슬라이드 예제 + 2025F 중간고사 문제3 숫자를 그대로 재현한다.
window.SIMS = window.SIMS || {};

(function () {
  var COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#a855f7"];

  var PRESETS = {
    abc_equal: {
      label: "A·B·C 각 10초, t=0 동시 도착 (p.10)",
      jobs: [
        { id: "A", arrival: 0, run: 10 },
        { id: "B", arrival: 0, run: 10 },
        { id: "C", arrival: 0, run: 10 }
      ],
      src: "5강 p.10 — FIFO 기본 예제"
    },
    a100_bc10: {
      label: "A=100, B=C=10, t=0 동시 도착 (convoy, p.11·p.13)",
      jobs: [
        { id: "A", arrival: 0, run: 100 },
        { id: "B", arrival: 0, run: 10 },
        { id: "C", arrival: 0, run: 10 }
      ],
      src: "5강 p.11(FIFO 110초) · p.13(SJF 50초)"
    },
    late_arrival: {
      label: "A=100@t=0, B=C=10@t=10 (p.14·p.16)",
      jobs: [
        { id: "A", arrival: 0, run: 100 },
        { id: "B", arrival: 10, run: 10 },
        { id: "C", arrival: 10, run: 10 }
      ],
      src: "5강 p.14(SJF 103.33초) · p.16(STCF 50초)"
    },
    rr_5s: {
      label: "A·B·C 각 5초, t=0 동시 도착 (p.20 response)",
      jobs: [
        { id: "A", arrival: 0, run: 5 },
        { id: "B", arrival: 0, run: 5 },
        { id: "C", arrival: 0, run: 5 }
      ],
      src: "5강 p.20 — RR(slice 1) response 1초 vs SJF 5초"
    },
    midterm2025: {
      label: "2025F 중간 문제3 — A=4, B=5, C=6 (AAAA BBBBB CCCCCC)",
      jobs: [
        { id: "A", arrival: 0, run: 4 },
        { id: "B", arrival: 0, run: 5 },
        { id: "C", arrival: 0, run: 6 }
      ],
      src: "2025F 중간고사 Problem 3 — total turnaround 최소 = 28"
    }
  };

  var PANELS = {
    fifo: {
      id: "FIFO", title: "FIFO (First Come, First Served)", lang: "txt",
      lines: [
        "queue <- 도착한 순서대로 (먼저 온 것이 앞)",
        "while (미완료 job 이 있음):",
        "    job <- queue.pop_front()        // 가장 먼저 도착한 것",
        "    job 을 '끝날 때까지' 실행        // 비선점(non-preemptive)",
        "    T_turnaround[job] = 완료시각 - 도착시각"
      ]
    },
    sjf: {
      id: "SJF", title: "SJF (Shortest Job First)", lang: "txt",
      lines: [
        "while (미완료 job 이 있음):",
        "    ready <- 이미 도착했고 아직 안 끝난 job 들",
        "    job <- argmin(ready, 전체 실행시간)   // 가장 짧은 것",
        "    job 을 '끝날 때까지' 실행             // 비선점",
        "    T_turnaround[job] = 완료시각 - 도착시각"
      ]
    },
    stcf: {
      id: "STCF", title: "STCF (= Preemptive SJF)", lang: "txt",
      lines: [
        "매 tick 마다 (또는 새 job 이 도착할 때마다):",
        "    ready <- 이미 도착했고 아직 안 끝난 job 들",
        "    job <- argmin(ready, '남은' 시간)     // 선점 가능",
        "    job 을 1 tick 실행, 남은시간 -= 1",
        "    (더 짧게 남은 job 이 오면 즉시 preempt)"
      ]
    },
    rr: {
      id: "RR", title: "Round Robin (time slice = q)", lang: "txt",
      lines: [
        "q <- time slice (timer interrupt 주기의 배수)",
        "while (runqueue 가 비어있지 않음):",
        "    job <- runqueue.pop_front()",
        "    job 을 min(q, 남은시간) 만큼 실행",
        "    안 끝났으면 runqueue.push_back(job)   // 뒤로"
      ]
    }
  };

  function simulate(presetKey, policy, slice) {
    var src = PRESETS[presetKey].jobs;
    var jobs = src.map(function (j) {
      return { id: j.id, arrival: j.arrival, run: j.run, remaining: j.run, first: -1, done: -1 };
    });
    var n = jobs.length, finished = 0, t = 0, guard = 0;
    var arrived = jobs.map(function () { return false; });
    var rq = [], cur = null, left = 0;
    var timeline = [], snaps = [];

    function readyList() {
      var out = [];
      for (var i = 0; i < n; i++) {
        if (arrived[i] && jobs[i].remaining > 0 && i !== cur) out.push(i);
      }
      if (policy === "rr") {
        var q = [];
        for (var k = 0; k < rq.length; k++) {
          if (jobs[rq[k]].remaining > 0 && rq[k] !== cur && q.indexOf(rq[k]) < 0) q.push(rq[k]);
        }
        return q;
      }
      out.sort(function (a, b) {
        if (policy === "sjf") return (jobs[a].run - jobs[b].run) || (jobs[a].arrival - jobs[b].arrival) || (a - b);
        if (policy === "stcf") return (jobs[a].remaining - jobs[b].remaining) || (jobs[a].arrival - jobs[b].arrival) || (a - b);
        return (jobs[a].arrival - jobs[b].arrival) || (a - b);
      });
      return out;
    }

    while (finished < n && guard++ < 4000) {
      var newArrivals = [];
      for (var i = 0; i < n; i++) {
        if (!arrived[i] && jobs[i].arrival <= t) { arrived[i] = true; rq.push(i); newArrivals.push(i); }
      }
      if (policy === "rr") {
        if (cur !== null && left <= 0) { rq.push(cur); cur = null; }
        if (cur === null) {
          while (rq.length && jobs[rq[0]].remaining <= 0) rq.shift();
          if (rq.length) { cur = rq.shift(); left = slice; }
        }
      } else if (policy === "stcf") {
        var best = -1;
        for (var k = 0; k < n; k++) {
          if (!arrived[k] || jobs[k].remaining <= 0) continue;
          if (best < 0) { best = k; continue; }
          if (jobs[k].remaining < jobs[best].remaining ||
            (jobs[k].remaining === jobs[best].remaining && jobs[k].arrival < jobs[best].arrival)) best = k;
        }
        cur = best < 0 ? null : best;
      } else {
        if (cur === null || jobs[cur].remaining <= 0) {
          var b = -1;
          for (var m = 0; m < n; m++) {
            if (!arrived[m] || jobs[m].remaining <= 0) continue;
            if (b < 0) { b = m; continue; }
            if (policy === "fifo") {
              if (jobs[m].arrival < jobs[b].arrival) b = m;
            } else {
              if (jobs[m].run < jobs[b].run ||
                (jobs[m].run === jobs[b].run && jobs[m].arrival < jobs[b].arrival)) b = m;
            }
          }
          cur = b < 0 ? null : b;
        }
      }

      snaps.push({
        t: t, running: cur, ready: readyList(),
        remaining: jobs.map(function (j) { return j.remaining; }),
        arrivals: newArrivals
      });

      if (cur === null) { timeline.push(null); t++; continue; }
      if (jobs[cur].first < 0) jobs[cur].first = t;
      jobs[cur].remaining--; left--;
      timeline.push(cur);
      t++;
      if (jobs[cur].remaining === 0) { jobs[cur].done = t; finished++; cur = null; left = 0; }
    }

    snaps.push({
      t: t, running: null, ready: [],
      remaining: jobs.map(function (j) { return j.remaining; }), arrivals: []
    });

    var sumT = 0, sumR = 0;
    jobs.forEach(function (j) { sumT += (j.done - j.arrival); sumR += (j.first - j.arrival); });
    return {
      jobs: jobs, timeline: timeline, snaps: snaps,
      avgT: sumT / n, avgR: sumR / n, total: t
    };
  }

  // ---- SVG Gantt ----------------------------------------------------------
  function tickStep(T) {
    var c = [1, 2, 5, 10, 20, 25, 50, 100, 200, 500];
    for (var i = 0; i < c.length; i++) if (T / c[i] <= 12) return c[i];
    return Math.ceil(T / 10);
  }
  function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;"); }

  function segmentsOf(timeline) {
    var segs = [], i = 0;
    while (i < timeline.length) {
      var j = i;
      while (j < timeline.length && timeline[j] === timeline[i]) j++;
      segs.push({ s: i, e: j, job: timeline[i] });
      i = j;
    }
    return segs;
  }

  function ganttSvg(sim, now) {
    var jobs = sim.jobs, T = Math.max(1, sim.timeline.length);
    var L = 56, R = 744, top = 24, rowH = 24, gap = 10;
    var H = top + jobs.length * (rowH + gap) + 26;
    var sc = (R - L) / T;
    function X(t) { return (L + t * sc).toFixed(1); }
    var o = ['<svg viewBox="0 0 760 ' + H + '" width="100%" style="max-width:760px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace">'];

    var stp = tickStep(T);
    for (var tt = 0; tt <= T; tt += stp) {
      o.push('<line x1="' + X(tt) + '" y1="' + top + '" x2="' + X(tt) + '" y2="' + (H - 22) + '" stroke="#8b95a5" stroke-opacity="0.25"/>');
      o.push('<text x="' + X(tt) + '" y="' + (H - 7) + '" font-size="10" fill="#8b95a5" text-anchor="middle">' + tt + '</text>');
    }

    var segs = segmentsOf(sim.timeline);
    jobs.forEach(function (j, idx) {
      var y = top + idx * (rowH + gap);
      var col = COLORS[idx % COLORS.length];
      o.push('<text x="8" y="' + (y + 16) + '" font-size="12" font-weight="bold" fill="' + col + '">' + esc(j.id) + '</text>');
      o.push('<text x="26" y="' + (y + 16) + '" font-size="9" fill="#8b95a5">' + j.run + 's</text>');
      o.push('<rect x="' + X(0) + '" y="' + y + '" width="' + (R - L) + '" height="' + rowH +
        '" fill="#8b95a5" fill-opacity="0.07" stroke="#8b95a5" stroke-opacity="0.2"/>');
      segs.forEach(function (s) {
        if (s.job !== idx) return;
        var a = s.s, b = s.e;
        if (a < now) {
          var m = Math.min(b, now);
          o.push('<rect x="' + X(a) + '" y="' + y + '" width="' + Math.max(0.8, (m - a) * sc).toFixed(1) +
            '" height="' + rowH + '" fill="' + col + '" fill-opacity="0.85"/>');
        }
        if (b > now) {
          var a2 = Math.max(a, now);
          o.push('<rect x="' + X(a2) + '" y="' + y + '" width="' + Math.max(0.8, (b - a2) * sc).toFixed(1) +
            '" height="' + rowH + '" fill="' + col + '" fill-opacity="0.18"/>');
        }
      });
      // 도착 마커 (▼)
      o.push('<polygon points="' + X(j.arrival) + ',' + (y - 8) + ' ' + (parseFloat(X(j.arrival)) - 5) + ',' + (y - 16) +
        ' ' + (parseFloat(X(j.arrival)) + 5) + ',' + (y - 16) + '" fill="' + col + '"/>');
      // 완료 마커
      if (j.done >= 0 && j.done <= now) {
        o.push('<line x1="' + X(j.done) + '" y1="' + (y - 3) + '" x2="' + X(j.done) + '" y2="' + (y + rowH + 3) +
          '" stroke="' + col + '" stroke-width="2"/>');
        o.push('<text x="' + (parseFloat(X(j.done)) + 4) + '" y="' + (y + 10) + '" font-size="9" fill="' + col + '">' + j.done + '</text>');
      }
    });
    o.push('<line x1="' + X(now) + '" y1="' + (top - 18) + '" x2="' + X(now) + '" y2="' + (H - 22) +
      '" stroke="#ef4444" stroke-width="1.5" stroke-dasharray="3 2"/>');
    o.push('<text x="' + X(now) + '" y="' + (top - 21) + '" font-size="10" fill="#ef4444" text-anchor="middle">t=' + now + '</text>');
    o.push("</svg>");
    return o.join("");
  }

  // ---- steps --------------------------------------------------------------
  var MAXG = 54;

  function groupsOf(sim) {
    var tl = sim.timeline;
    if (tl.length <= MAXG) {
      return tl.map(function (j, i) { return { s: i, e: i + 1, jobs: [j] }; });
    }
    var segs = segmentsOf(tl);
    if (segs.length <= MAXG) {
      return segs.map(function (s) { return { s: s.s, e: s.e, jobs: [s.job] }; });
    }
    var per = Math.ceil(segs.length / MAXG), out = [];
    for (var i = 0; i < segs.length; i += per) {
      var chunk = segs.slice(i, i + per), js = [];
      chunk.forEach(function (c) { if (js.indexOf(c.job) < 0) js.push(c.job); });
      out.push({ s: chunk[0].s, e: chunk[chunk.length - 1].e, jobs: js });
    }
    return out;
  }

  function fmt(x) { return (Math.round(x * 100) / 100).toString(); }

  SIMS["sched_gantt"] = {
    title: "스케줄링 정책 간트 차트 (FIFO / SJF / STCF / RR)",
    desc: "[[FIFO]] · [[SJF]] · [[STCF]] · [[Round Robin]] 을 tick 단위로 돌려 [[turnaround time]] 과 [[response time]] 이 어떻게 갈리는지 본다. preset 은 5강 슬라이드 예제와 2025F 중간고사 문제3 숫자 그대로.",
    options: [
      {
        key: "policy", label: "정책", values: [
          { value: "fifo", label: "FIFO" },
          { value: "sjf", label: "SJF (비선점)" },
          { value: "stcf", label: "STCF (선점 SJF)" },
          { value: "rr", label: "Round Robin" }
        ]
      },
      {
        key: "preset", label: "워크로드", values: [
          { value: "abc_equal", label: "A·B·C 10초씩 (p.10)" },
          { value: "a100_bc10", label: "A=100, B=C=10 동시 (convoy)" },
          { value: "late_arrival", label: "A=100@0, B=C=10@10" },
          { value: "rr_5s", label: "A·B·C 5초씩 (RR p.20)" },
          { value: "midterm2025", label: "2025F 중간 문제3 (4/5/6)" }
        ]
      },
      {
        key: "slice", label: "time slice (RR 전용)", values: [
          { value: "1", label: "1초" },
          { value: "2", label: "2초" },
          { value: "5", label: "5초" }
        ]
      }
    ],

    build: function (opts) {
      var policy = opts.policy || "fifo";
      var presetKey = opts.preset || "abc_equal";
      var slice = parseInt(opts.slice || "1", 10) || 1;
      var preset = PRESETS[presetKey];
      var sim = simulate(presetKey, policy, slice);
      var jobs = sim.jobs, n = jobs.length;
      var panel = PANELS[policy];

      var vars = [
        { name: "time", group: "스케줄러" },
        { name: "running", group: "스케줄러" },
        { name: "ready queue", group: "스케줄러" }
      ];
      jobs.forEach(function (j) {
        vars.push({ name: j.id + ".state", group: "job " + j.id });
        vars.push({ name: j.id + ".remaining", group: "job " + j.id });
        vars.push({ name: j.id + ".turnaround", group: "job " + j.id });
        vars.push({ name: j.id + ".response", group: "job " + j.id });
      });
      vars.push({ name: "avg turnaround", group: "평균" });
      vars.push({ name: "avg response", group: "평균" });

      function snapAt(time, runningIdx, finalize) {
        var idx = Math.min(time, sim.snaps.length - 1);
        var sn = sim.snaps[idx];
        var v = {
          time: time,
          running: runningIdx === null || runningIdx === undefined ? "—" : jobs[runningIdx].id,
          "ready queue": sn.ready.length ? "[" + sn.ready.map(function (i) { return jobs[i].id; }).join(", ") + "]" : "[ ]"
        };
        var sumT = 0, sumR = 0, allDone = true;
        jobs.forEach(function (j, i) {
          var rem = sn.remaining[i];
          var st;
          if (j.arrival > time) st = "미도착";
          else if (rem === 0) st = "done";
          else if (i === runningIdx) st = "running";
          else st = "ready";
          v[j.id + ".state"] = st;
          v[j.id + ".remaining"] = rem;
          var doneYet = (j.done >= 0 && j.done <= time);
          var firstYet = (j.first >= 0 && j.first < time);
          v[j.id + ".turnaround"] = doneYet ? (j.done - j.arrival) : "—";
          v[j.id + ".response"] = firstYet ? (j.first - j.arrival) : "—";
          if (!doneYet) allDone = false;
          sumT += (j.done - j.arrival); sumR += (j.first - j.arrival);
        });
        if (allDone || finalize) {
          v["avg turnaround"] = fmt(sumT / n) + " 초";
          v["avg response"] = fmt(sumR / n) + " 초";
        } else {
          v["avg turnaround"] = "—";
          v["avg response"] = "—";
        }
        return v;
      }

      var steps = [];
      var policyName = { fifo: "FIFO", sjf: "SJF", stcf: "STCF", rr: "Round Robin(q=" + slice + ")" }[policy];

      steps.push({
        desc: "'''" + policyName + "''' / " + preset.label + " — 시작 전 상태. " +
          "도착시각·실행시간은 " + preset.src + " 의 숫자다. " +
          "간트 차트의 흐린 막대는 '앞으로' 실행될 구간, 진한 막대는 이미 실행한 구간이다.",
        pc: makePc(panel.id, 1),
        vars: snapAt(0, null, false),
        svg: ganttSvg(sim, 0)
      });

      var groups = groupsOf(sim);
      groups.forEach(function (g) {
        var last = g.jobs[g.jobs.length - 1];
        var names = g.jobs.map(function (i) { return jobs[i].id; });
        var d;
        if (g.jobs.length === 1) {
          var j = jobs[last];
          d = "t = " + g.s + " → " + g.e + " : '''" + j.id + "''' 실행 (" + (g.e - g.s) + "초). ";
        } else {
          d = "t = " + g.s + " → " + g.e + " : " + names.join(" → ") + " 가 번갈아 실행 (" + (g.e - g.s) + "초 압축 표시). ";
        }
        // 도착 이벤트
        var arrivedHere = jobs.filter(function (j) { return j.arrival > g.s && j.arrival <= g.e; });
        if (arrivedHere.length) {
          d += "이 구간에서 " + arrivedHere.map(function (j) { return "'''" + j.id + "'''(t=" + j.arrival + ", " + j.run + "초)"; }).join(", ") + " 도착. ";
          if (policy === "stcf") d += "STCF 는 도착 즉시 남은 시간을 다시 비교해 '''선점'''한다. ";
          if (policy === "sjf") d += "SJF 는 비선점이라 지금 도는 job 이 끝날 때까지 기다린다 — 이게 103.33초의 원인. ";
        }
        var doneHere = jobs.filter(function (j) { return j.done > g.s && j.done <= g.e; });
        if (doneHere.length) {
          d += doneHere.map(function (j) {
            return "'''" + j.id + " 완료''' (T_turnaround = " + j.done + " − " + j.arrival + " = " + (j.done - j.arrival) + ")";
          }).join(", ") + ". ";
        }
        var line = (policy === "rr") ? (doneHere.length ? 4 : 5) : (doneHere.length ? 5 : 4);
        steps.push({
          desc: d,
          pc: makePc(panel.id, line),
          vars: snapAt(g.e, last, false),
          svg: ganttSvg(sim, g.e)
        });
      });

      // 마지막 요약 스텝
      var tsum = jobs.map(function (j) { return (j.done - j.arrival); });
      var rsum = jobs.map(function (j) { return (j.first - j.arrival); });
      var summary = "'''끝''' — " + policyName + ". " +
        "turnaround = " + jobs.map(function (j, i) { return j.id + ":" + tsum[i]; }).join(", ") +
        " → '''평균 " + fmt(sim.avgT) + "초'''. " +
        "response = " + jobs.map(function (j, i) { return j.id + ":" + rsum[i]; }).join(", ") +
        " → '''평균 " + fmt(sim.avgR) + "초'''. " +
        "([[turnaround time]] = T_completion − T_arrival, [[response time]] = T_firstrun − T_arrival)";
      var extra = HINTS[presetKey] && HINTS[presetKey][policy];
      steps.push({
        desc: summary + (extra ? " " + extra : ""),
        pc: makePc(panel.id, policy === "rr" ? 5 : 5),
        vars: snapAt(sim.total, null, true),
        note: extra || null,
        svg: ganttSvg(sim, sim.total)
      });

      return { panels: [panel], vars: vars, steps: steps };
    }
  };

  function makePc(id, line) { var o = {}; o[id] = line; return o; }

  var HINTS = {
    abc_equal: {
      fifo: "슬라이드 p.10 의 (10+20+30)/3 = '''20초''' 와 정확히 같다.",
      sjf: "실행시간이 모두 같으면 SJF = FIFO. 여전히 20초.",
      stcf: "남은 시간이 같으면 선점할 이유가 없어 FIFO 와 동일하게 20초.",
      rr: "RR 은 response 는 좋지만 turnaround 가 크게 나빠진다 — [[fairness]] 와 성능의 trade-off."
    },
    a100_bc10: {
      fifo: "슬라이드 p.11 의 (100+110+120)/3 = '''110초'''. 무거운 A 뒤에 짧은 B·C 가 줄 서는 게 [[convoy effect]].",
      sjf: "슬라이드 p.13 의 (10+20+120)/3 = '''50초'''. 짧은 것부터 돌리는 것만으로 110 → 50 으로 줄었다.",
      stcf: "모두 t=0 에 도착했으니 선점할 일이 없어 SJF 와 같은 '''50초'''.",
      rr: "turnaround 가 최악에 가까워진다 — RR 은 [[response time]] 전용 정책."
    },
    late_arrival: {
      fifo: "A 가 먼저 왔으니 100초를 다 돌고 나서야 B·C 차례. 평균 103.33초.",
      sjf: "슬라이드 p.14 — 비선점이라 A 를 끊지 못하고 (100 + 100 + 110)/3 = '''103.33초'''.",
      stcf: "슬라이드 p.16 — B·C 도착 시점에 '''남은 시간'''(90 vs 10)을 비교해 선점. (120 + 10 + 20)/3 = '''50초'''.",
      rr: "A 가 계속 끊기므로 A 의 turnaround 가 극단적으로 나빠진다."
    },
    rr_5s: {
      sjf: "슬라이드 p.20 위쪽 — SJF 의 평균 response 는 (0+5+10)/3 = '''5초'''.",
      fifo: "FIFO = SJF (모두 5초씩) — 평균 response 5초.",
      stcf: "역시 평균 response 5초.",
      rr: "슬라이드 p.20 아래 — slice 1 이면 A B C A B C … 로 평균 response (0+1+2)/3 = '''1초'''. 대신 turnaround 는 14초로 악화."
    },
    midterm2025: {
      stcf: "2025F 중간 문제3(a) — total turnaround 를 최소화하는 스케줄은 짧은 것부터(STCF/SJF). T1+T2+T3 = 4+9+15 = '''28'''.",
      sjf: "2025F 중간 문제3(a) 정답 '''28'''. (T1≥4, T2≥9, T3=15 라는 제약의 하한을 동시에 만족)",
      fifo: "A→B→C 순서가 마침 짧은 순서라 FIFO 도 28. 하지만 도착 순서가 C,B,A 였다면 최악이 된다.",
      rr: "문제3(b) 관련 — q=1 RR 은 ABCABCABCABCBCC 가 되어 T1=10, T2=13, T3=15, F = 10/13 + 13/15. 해설은 여기서 한 발 더 나가 ABCABCABCBCCABC (T=13,14,15, 합 '''42''') 가 F 최대임을 보인다 — 'RR 이면 무조건 공정' 이 아니라는 게 함정."
    }
  };
})();
