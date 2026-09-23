// cfs_eevdf — Linux CFS(vruntime) 와 EEVDF(lag / virtual deadline) 선택 과정
// 6강 p.31~p.45 (sched_latency 48ms, min_granularity 6ms, nice→weight 테이블) 기준.
window.SIMS = window.SIMS || {};

(function () {
  var LATENCY = 48, MIN_GRAN = 6, W0 = 1024;
  // Linux prio_to_weight[] 발췌 — 한 단계마다 약 1.25배
  var NICE_W = { "-20": 88761, "-10": 9548, "-5": 3121, "-1": 1277, "0": 1024, "1": 820, "5": 335, "10": 110, "19": 15 };
  var COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#a855f7"];

  var WL = {
    nice0_5: {
      label: "A(nice 0) + B(nice 5) — 퀴즈 계산 문제",
      procs: [{ id: "A", nice: 0, run: Infinity }, { id: "B", nice: 5, run: Infinity }]
    },
    four_same: {
      label: "A·B·C·D 전부 nice 0, C·D 는 24ms 뒤 종료 (p.33)",
      procs: [
        { id: "A", nice: 0, run: Infinity }, { id: "B", nice: 0, run: Infinity },
        { id: "C", nice: 0, run: 24 }, { id: "D", nice: 0, run: 24 }
      ]
    },
    latency: {
      label: "A·B·C·D nice 0, D 만 latency_nice = −10 (p.44)",
      procs: [
        { id: "A", nice: 0, run: Infinity }, { id: "B", nice: 0, run: Infinity },
        { id: "C", nice: 0, run: Infinity }, { id: "D", nice: 0, run: Infinity, latencyNice: -10 }
      ]
    }
  };

  var P_CFS = {
    id: "CFS", title: "CFS 스케줄링 (6강 p.31~p.36)", lang: "c",
    lines: [
      "slice_i = sched_latency * weight_i / SUM(weight);   // 48ms 를 weight 비율로",
      "if (slice_i < min_granularity) slice_i = min_granularity;  // 6ms 하한",
      "next = rb_tree_leftmost();          // vruntime 이 가장 작은 프로세스",
      "run(next, slice_next);",
      "next->vruntime += runtime * 1024 / weight_next;     // weight 클수록 천천히",
      "rb_insert(next);                    // O(log n) 으로 다시 삽입"
    ]
  };
  var P_EEVDF = {
    id: "EEVDF", title: "EEVDF 스케줄링 (6강 p.43~p.45)", lang: "c",
    lines: [
      "ideal_i = (weight_i / SUM(weight)) * t;   // 받았어야 할 CPU 시간",
      "lag_i   = ideal_i - received_i;           // + 면 덜 받음, - 면 더 받음",
      "eligible_i = (lag_i >= 0);                // 슬라이드: lag > 0 이면 eligible",
      "te_i = lag_i 가 0 이 되는 시각;            // = received_i / share_i",
      "VD_i = te_i + slice_i / share_i;          // 슬라이드 표기: t_now + slice_i/weight_i",
      "next = argmin(VD_i) among eligible;       // Earliest Eligible Virtual Deadline First",
      "run(next, slice_next);"
    ]
  };

  function w(nice) { return NICE_W[String(nice)] || 1024; }
  function f2(x) {
    if (x === Infinity) return "∞";
    var r = Math.round(x * 100) / 100;
    return (Math.abs(r) < 0.005 ? 0 : r).toString();
  }
  function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;"); }

  // ---------------- SVG ----------------
  function barSvg(procs, title, valueOf, labelOf, pick, signed) {
    var W = 760, rowH = 26, gap = 10, top = 26;
    var H = top + procs.length * (rowH + gap) + 12;
    var mx = 1;
    procs.forEach(function (p) { mx = Math.max(mx, Math.abs(valueOf(p))); });
    var L = 130, R = 660;
    var mid = signed ? (L + R) / 2 : L;
    var sc = (signed ? (R - L) / 2 : (R - L)) / mx;
    var o = ['<svg viewBox="0 0 ' + W + ' ' + H + '" width="100%" style="max-width:760px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace">'];
    o.push('<text x="4" y="15" font-size="11" fill="#8b95a5">' + esc(title) + '</text>');
    if (signed) o.push('<line x1="' + mid + '" y1="' + (top - 6) + '" x2="' + mid + '" y2="' + (H - 6) + '" stroke="#8b95a5" stroke-opacity="0.5" stroke-dasharray="3 2"/>');
    procs.forEach(function (p, i) {
      var y = top + i * (rowH + gap), v = valueOf(p), col = p.color;
      o.push('<text x="4" y="' + (y + 18) + '" font-size="11" font-weight="bold" fill="' + col + '">' + esc(p.id) + '</text>');
      o.push('<text x="20" y="' + (y + 18) + '" font-size="9" fill="#8b95a5">' + esc(labelOf(p)) + '</text>');
      o.push('<rect x="' + L + '" y="' + y + '" width="' + (R - L) + '" height="' + rowH +
        '" fill="#8b95a5" fill-opacity="0.07" stroke="#8b95a5" stroke-opacity="0.2"/>');
      var len = Math.abs(v) * sc, x0 = v < 0 ? mid - len : mid;
      o.push('<rect x="' + x0.toFixed(1) + '" y="' + y + '" width="' + Math.max(1.5, len).toFixed(1) + '" height="' + rowH +
        '" fill="' + col + '" fill-opacity="' + (p.id === pick ? "0.95" : "0.4") + '"/>');
      o.push('<text x="' + (R + 8) + '" y="' + (y + 18) + '" font-size="11" fill="' + col + '">' + f2(v) + '</text>');
      if (p.id === pick) {
        o.push('<rect x="' + (L - 2) + '" y="' + (y - 2) + '" width="' + (R - L + 4) + '" height="' + (rowH + 4) +
          '" fill="none" stroke="#ef4444" stroke-width="2" rx="3"/>');
        o.push('<text x="' + (R + 54) + '" y="' + (y + 18) + '" font-size="10" fill="#ef4444">◀ 선택</text>');
      }
      if (p.done) o.push('<text x="' + (R + 54) + '" y="' + (y + 18) + '" font-size="10" fill="#8b95a5">done</text>');
    });
    o.push("</svg>");
    return o.join("");
  }

  SIMS["cfs_eevdf"] = {
    title: "CFS(vruntime) vs EEVDF(lag / virtual deadline)",
    desc: "[[CFS]] 는 [[sched_latency]](48ms)를 [[weight]] 비율로 쪼개 슬라이스를 주고 [[vruntime]] 이 최소인 프로세스를 고른다. " +
      "[[EEVDF]] 는 [[lag]] ≥ 0 인(= 덜 받은) 프로세스 중 [[virtual deadline]] 이 가장 이른 것을 고른다. min_granularity = 6ms.",
    options: [
      {
        key: "policy", label: "정책", values: [
          { value: "cfs", label: "CFS (vruntime)" },
          { value: "eevdf", label: "EEVDF (lag + VD)" }
        ]
      },
      {
        key: "workload", label: "워크로드", values: [
          { value: "nice0_5", label: "A(nice 0) + B(nice 5)" },
          { value: "four_same", label: "A·B·C·D nice 0 (C·D 24ms 뒤 종료)" },
          { value: "latency", label: "A·B·C·D + D 는 latency_nice −10" }
        ]
      }
    ],

    build: function (opts) {
      return (opts.policy || "cfs") === "eevdf"
        ? buildEevdf(opts.workload || "nice0_5")
        : buildCfs(opts.workload || "nice0_5");
    }
  };

  function mkProcs(key) {
    return WL[key].procs.map(function (p, i) {
      return {
        id: p.id, nice: p.nice, weight: w(p.nice), latencyNice: p.latencyNice || 0,
        run: p.run, left: p.run, vruntime: 0, received: 0, done: false, color: COLORS[i % COLORS.length]
      };
    });
  }
  function live(procs) { return procs.filter(function (p) { return !p.done; }); }
  function sumW(list) { return list.reduce(function (a, p) { return a + p.weight; }, 0); }

  function sliceOf(p, list, useLatencyNice) {
    var s = LATENCY * p.weight / sumW(list);
    if (s < MIN_GRAN) s = MIN_GRAN;
    if (useLatencyNice && p.latencyNice < 0) s = Math.max(MIN_GRAN, s / 2);  // 슬라이드 예: 12ms → 6ms
    return s;
  }

  // ---------------- CFS ----------------
  function buildCfs(key) {
    var procs = mkProcs(key), t = 0;
    var vars = [
      { name: "time", group: "스케줄러" },
      { name: "running", group: "스케줄러" },
      { name: "runnable n", group: "스케줄러" },
      { name: "Σ weight", group: "스케줄러" },
      { name: "sched_latency", group: "스케줄러" },
      { name: "min_granularity", group: "스케줄러" }
    ];
    procs.forEach(function (p) {
      vars.push({ name: p.id + ".nice", group: "프로세스 " + p.id });
      vars.push({ name: p.id + ".weight", group: "프로세스 " + p.id });
      vars.push({ name: p.id + ".slice", group: "프로세스 " + p.id });
      vars.push({ name: p.id + ".vruntime", group: "프로세스 " + p.id });
      vars.push({ name: p.id + ".받은 CPU", group: "프로세스 " + p.id });
      vars.push({ name: p.id + ".state", group: "프로세스 " + p.id });
    });

    function snap(running) {
      var L = live(procs), SW = sumW(L);
      var v = {
        time: f2(t) + " ms",
        running: running || "—",
        "runnable n": L.length,
        "Σ weight": SW,
        "sched_latency": LATENCY + " ms",
        "min_granularity": MIN_GRAN + " ms"
      };
      procs.forEach(function (p) {
        v[p.id + ".nice"] = p.nice;
        v[p.id + ".weight"] = p.weight;
        v[p.id + ".slice"] = p.done ? "—" : f2(sliceOf(p, L, false)) + " ms";
        v[p.id + ".vruntime"] = f2(p.vruntime);
        v[p.id + ".받은 CPU"] = f2(p.received) + " ms";
        v[p.id + ".state"] = p.done ? "done" : (p.id === running ? "running" : "runnable");
      });
      return v;
    }

    var steps = [], L0 = live(procs), SW0 = sumW(L0);
    steps.push({
      desc: "'''CFS''' — " + WL[key].label + ". 슬라이스는 " +
        procs.map(function (p) { return p.id + " = 48 × " + p.weight + "/" + SW0 + " = " + f2(LATENCY * p.weight / SW0) + "ms"; }).join(", ") +
        " (6ms 미만이면 [[min_granularity]] 로 올림). [[vruntime]] 은 모두 0 에서 시작하고, " +
        "'''vruntime += runtime × 1024 / weight''' 로 쌓인다 — weight 가 크면(우선순위 높으면) 천천히 쌓여 더 자주 뽑힌다.",
      pc: { CFS: 1 },
      vars: snap(null),
      svg: barSvg(procs, "vruntime (ms) — 가장 짧은 막대가 다음 차례", function (p) { return p.vruntime; },
        function (p) { return "nice " + p.nice + " / w " + p.weight; }, null, false)
    });

    for (var k = 0; k < 13; k++) {
      var Lv = live(procs);
      if (!Lv.length) break;
      var pick = Lv[0];
      Lv.forEach(function (p) { if (p.vruntime < pick.vruntime - 1e-9) pick = p; });
      var SW = sumW(Lv);
      var sl = sliceOf(pick, Lv, false);
      var ran = Math.min(sl, pick.left);
      var dv = ran * W0 / pick.weight;
      var before = pick.vruntime, t0 = t;
      pick.vruntime += dv; pick.received += ran; pick.left -= ran; t += ran;
      var finished = (pick.left <= 1e-9);
      if (finished) pick.done = true;

      var d = "'''t = " + f2(t0) + " → " + f2(t) + "ms''' : vruntime 최소인 '''" + pick.id + "'''(" + f2(before) + ") 선택. " +
        "슬라이스 = 48 × " + pick.weight + "/" + SW + " = " + f2(sl) + "ms" + (sl === MIN_GRAN && LATENCY * pick.weight / SW < MIN_GRAN ? " ([[min_granularity]] 6ms 로 올림)" : "") + ". " +
        "실행 후 vruntime += " + f2(ran) + " × 1024/" + pick.weight + " = " + f2(dv) + " → '''" + f2(pick.vruntime) + "'''.";
      if (finished) d += " '''" + pick.id + " 종료''' → runnable 이 " + live(procs).length + "개로 줄어 다음 슬라이스가 " +
        f2(LATENCY / Math.max(1, live(procs).length)) + "ms 로 늘어난다.";
      if (key === "nice0_5" && k === 1) d += " ⭐ nice 0 과 nice 5 는 슬라이스 길이가 3배 넘게 다르지만 '''Δvruntime 은 둘 다 " + f2(dv) + "ms 로 같다''' — 그래서 정확히 번갈아 돈다.";

      steps.push({
        desc: d,
        pc: { CFS: 5 },
        vars: snap(pick.id),
        svg: barSvg(procs, "vruntime (ms) — 가장 짧은 막대가 다음 차례", function (p) { return p.vruntime; },
          function (p) { return "nice " + p.nice + " / w " + p.weight; }, pick.id, false)
      });
    }

    steps.push({
      desc: "'''정리''' — " + CFS_SUMMARY(key),
      pc: { CFS: 3 },
      vars: snap(null),
      svg: barSvg(procs, "vruntime (ms)", function (p) { return p.vruntime; },
        function (p) { return "nice " + p.nice + " / w " + p.weight; }, null, false)
    });

    return { panels: [P_CFS], vars: vars, steps: steps };
  }

  function CFS_SUMMARY(key) {
    if (key === "nice0_5")
      return "nice 0(weight 1024) 은 36.17ms, nice 5(weight 335) 는 11.83ms 를 받는다 — [[sched_latency]] 48ms 안에서 weight 비율 1024:335. " +
        "퀴즈 계산: B 가 물리 시간 10ms 를 돌면 Δ[[vruntime]] = 10 × 1024/335 ≈ '''30.6ms'''. 가중치가 낮을수록 vruntime 이 빨리 쌓여 덜 뽑힌다.";
    if (key === "four_same")
      return "n=4 일 때 슬라이스 48/4 = '''12ms''', C·D 가 24ms 씩 쓰고 끝나면 n=2 가 되어 '''24ms''' 로 늘어난다 — 슬라이드 p.33 의 그림 그대로. " +
        "[[sched_latency]] 는 '슬라이스 길이'가 아니라 '한 바퀴 도는 데 걸리는 목표 시간'이다.";
    return "CFS 에는 latency 개념이 없어 D 의 latency_nice 를 반영하지 못한다 — 4개 모두 12ms. " +
      "'지연에 민감한 프로세스를 더 자주, 더 짧게' 돌릴 방법이 없다는 것이 CFS 의 한계이고, [[EEVDF]] 가 나온 이유다 (6강 p.42).";
  }

  // ---------------- EEVDF ----------------
  function buildEevdf(key) {
    var procs = mkProcs(key), t = 0, epoch = 0;   // epoch = lag 회계를 시작한 시각
    var vars = [
      { name: "time", group: "스케줄러" },
      { name: "running", group: "스케줄러" },
      { name: "Σ weight", group: "스케줄러" },
      { name: "eligible 집합", group: "스케줄러" }
    ];
    procs.forEach(function (p) {
      vars.push({ name: p.id + ".weight", group: "프로세스 " + p.id });
      vars.push({ name: p.id + ".slice", group: "프로세스 " + p.id });
      vars.push({ name: p.id + ".received", group: "프로세스 " + p.id });
      vars.push({ name: p.id + ".ideal", group: "프로세스 " + p.id });
      vars.push({ name: p.id + ".lag", group: "프로세스 " + p.id });
      vars.push({ name: p.id + ".eligible", group: "프로세스 " + p.id });
      vars.push({ name: p.id + ".VD", group: "프로세스 " + p.id });
    });

    function share(p, L) { return p.weight / sumW(L); }
    function lagOf(p, L) { return share(p, L) * (t - epoch) - p.received; }
    function vdOf(p, L) { return p.received / share(p, L) + sliceOf(p, L, true) / share(p, L) + epoch; }

    function snap(running) {
      var L = live(procs);
      var el = [];
      L.forEach(function (p) { if (lagOf(p, L) >= -1e-9) el.push(p.id); });
      var v = {
        time: f2(t) + " ms",
        running: running || "—",
        "Σ weight": sumW(L),
        "eligible 집합": el.length ? "{" + el.join(", ") + "}" : "{ }"
      };
      procs.forEach(function (p) {
        var isL = !p.done;
        v[p.id + ".weight"] = p.weight;
        v[p.id + ".slice"] = isL ? f2(sliceOf(p, L, true)) + " ms" : "—";
        v[p.id + ".received"] = f2(p.received) + " ms";
        v[p.id + ".ideal"] = isL ? f2(share(p, L) * (t - epoch)) + " ms" : "—";
        v[p.id + ".lag"] = isL ? f2(lagOf(p, L)) : "—";
        v[p.id + ".eligible"] = !isL ? "—" : (lagOf(p, L) >= -1e-9 ? "✔ (lag ≥ 0)" : "✘ (이미 더 받음)");
        v[p.id + ".VD"] = isL ? f2(vdOf(p, L)) : "—";
      });
      return v;
    }

    var steps = [], L0 = live(procs);
    steps.push({
      desc: "'''EEVDF''' (Earliest Eligible Virtual Deadline First, 리눅스 6.6~) — " + WL[key].label + ". " +
        "[[lag]] = 받았어야 할 시간(ideal) − 실제로 받은 시간(received). '''lag ≥ 0 이면 eligible'''(아직 덜 받았다). " +
        "[[virtual deadline]] VD = t_e + slice / share (t_e = lag 이 0 이 되는 시각). " +
        "eligible 중 VD 가 가장 이른 것을 고른다. 슬라이스는 " +
        L0.map(function (p) { return p.id + " " + f2(sliceOf(p, L0, true)) + "ms"; }).join(", ") +
        (key === "latency" ? " — D 는 latency_nice −10 이라 12ms 대신 '''6ms''' (6강 p.44)." : "."),
      pc: { EEVDF: 1 },
      vars: snap(null),
      svg: barSvg(procs, "lag (ms) — 0 보다 오른쪽(양수)이 eligible", function (p) { return p.done ? 0 : lagOf(p, live(procs)); },
        function (p) { return "w " + p.weight; }, null, true)
    });

    for (var k = 0; k < 12; k++) {
      var L = live(procs);
      if (!L.length) break;
      var elig = L.filter(function (p) { return lagOf(p, L) >= -1e-9; });
      if (!elig.length) elig = L.slice();               // 이론상 항상 하나는 eligible
      var pick = elig[0];
      elig.forEach(function (p) { if (vdOf(p, L) < vdOf(pick, L) - 1e-9) pick = p; });
      var sl = sliceOf(pick, L, true);
      var ran = Math.min(sl, pick.left);
      var t0 = t, lagBefore = lagOf(pick, L), vdBefore = vdOf(pick, L);
      var eligTxt = elig.map(function (p) { return p.id + "(lag " + f2(lagOf(p, L)) + ", VD " + f2(vdOf(p, L)) + ")"; }).join(", ");
      var outTxt = L.filter(function (p) { return elig.indexOf(p) < 0; })
        .map(function (p) { return p.id + "(lag " + f2(lagOf(p, L)) + ")"; }).join(", ");
      pick.received += ran; pick.left -= ran; t += ran;
      var finished = pick.left <= 1e-9;

      var d = "'''t = " + f2(t0) + " → " + f2(t) + "ms''' : eligible = {" + eligTxt + "}" +
        (outTxt ? " / 탈락(lag < 0) = {" + outTxt + "}" : "") + ". " +
        "이 중 VD 가 가장 이른 '''" + pick.id + "'''(VD = " + f2(vdBefore) + ") 선택. " +
        "lag(" + pick.id + ") = " + f2(lagBefore) + " 였고 슬라이스 " + f2(ran) + "ms 를 받으면 lag 이 음수가 되어 다음 바퀴에서는 eligible 에서 빠진다.";
      if (finished) {
        pick.done = true;
        epoch = t; live(procs).forEach(function (p) { p.received = 0; });
        d += " '''" + pick.id + " 종료''' — 런큐 구성이 바뀌어 lag 회계를 t=" + f2(t) + " 부터 새로 시작한다.";
      }
      if (key === "latency" && k === 0)
        d += " ⭐ 모두 lag=0(전원 eligible)인데 D 만 슬라이스가 절반이라 VD 가 24 로 가장 이르다 → '''지연에 민감한 D 가 먼저'''.";
      if (key === "nice0_5" && k === 0)
        d += " ⚠ 슬라이스를 weight 에 정확히 비례해 주면 slice/share 가 모두 sched_latency 와 같아져 '''VD 가 전부 48 로 동률'''이 된다 — latency_nice 가 필요한 이유가 여기 있다.";

      steps.push({
        desc: d,
        pc: { EEVDF: 6 },
        vars: snap(pick.id),
        svg: barSvg(procs, "lag (ms) — 0 보다 오른쪽(양수)이 eligible",
          function (p) { return p.done ? 0 : lagOf(p, live(procs)); },
          function (p) { return "w " + p.weight + " / slice " + f2(sliceOf(p, live(procs), true)); }, pick.id, true)
      });
    }

    steps.push({
      desc: "'''정리''' — " + EEVDF_SUMMARY(key),
      pc: { EEVDF: 6 },
      vars: snap(null),
      svg: barSvg(procs, "lag (ms)", function (p) { return p.done ? 0 : lagOf(p, live(procs)); },
        function (p) { return "w " + p.weight; }, null, true)
    });

    return { panels: [P_EEVDF], vars: vars, steps: steps };
  }

  function EEVDF_SUMMARY(key) {
    if (key === "latency")
      return "D 는 슬라이스가 절반(6ms)이라 '''VD 가 늘 더 이르다''' → 같은 48ms 주기 안에서 '''두 번''' 돌아온다. " +
        "그런데 받은 총량은 A·B·C 와 똑같은 12ms — [[lag]] 이 음수가 되면 eligible 에서 빠지기 때문이다. " +
        "즉 EEVDF 는 '''CPU 양(weight)'''과 '''반응 속도(slice)'''를 분리해서 제어한다. 이게 [[CFS]] 가 못 하던 것.";
    if (key === "nice0_5")
      return "lag 이 음수인 프로세스는 eligible 에서 빠지므로 A·B 가 정확히 번갈아 돈다. " +
        "[[lag]] 의 상한이 수학적으로 증명돼 있어 CFS 의 휴리스틱(interactive bonus 등)보다 '''예측 가능'''하다 (6강 p.45).";
    return "런큐에서 프로세스가 빠지면 share 가 바뀌므로 [[lag]] 회계를 다시 맞춰야 한다. " +
      "EEVDF 의 핵심은 '''lag ≥ 0 (eligible)''' 필터 + '''가장 이른 [[virtual deadline]]''' 두 조건이고, 이름이 곧 알고리즘이다.";
  }
})();
