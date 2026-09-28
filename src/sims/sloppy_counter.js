// sloppy_counter — OSTEP 29장 approximate (sloppy) counter
// 원본: Figure 29.3 (S=5, 4 CPU 추적표), 29.4 (update 구현), 29.5/29.6 (성능)
(function (global) {
  "use strict";
  global.SIMS = global.SIMS || {};

  var CODE = [
    "void update(counter_t *c, int threadID, int amt) {",
    "    int cpu = threadID % NUMCPUS;",
    "    pthread_mutex_lock(&c->llock[cpu]);",
    "    c->local[cpu] += amt;",
    "    if (c->local[cpu] >= c->threshold) {",
    "        // transfer to global (assumes amt>0)",
    "        pthread_mutex_lock(&c->glock);",
    "        c->global += c->local[cpu];",
    "        pthread_mutex_unlock(&c->glock);",
    "        c->local[cpu] = 0;",
    "    }",
    "    pthread_mutex_unlock(&c->llock[cpu]);",
    "}"
  ];
  var LN = { local: 4, check: 5, glock: 7, global: 8, reset: 10, unlock: 12 };

  // Figure 29.3 의 증가 패턴 (Time 1..7 에 증가한 CPU; 그림의 L1..L4 = 여기 CPU0..CPU3)
  var SCHEDULE = [
    [2, 3],        // t=1: L3, L4
    [0, 2],        // t=2: L1, L3
    [0, 2],        // t=3
    [0, 3],        // t=4
    [0, 1, 3],     // t=5
    [0, 3],        // t=6: L1 이 5 → flush (S=5)
    [1, 2, 3]      // t=7: L4 가 5 → flush (S=5)
  ];

  global.SIMS["sloppy_counter"] = {
    title: "sloppy (approximate) counter",
    desc: "CPU 마다 local 카운터를 두고, local 이 threshold S 에 닿을 때만 global 락을 잡아 옮긴다. S 를 바꿔 '''global 락 경합''' 과 '''global 값의 부정확도''' 가 어떻게 맞바뀌는지 본다([[sloppy counter]]).",
    options: [
      {
        key: "S", label: "threshold S",
        values: [
          { value: "5", label: "S = 5 (Fig 29.3 그대로)" },
          { value: "1", label: "S = 1 (매번 flush = 사실상 락 하나짜리 카운터)" },
          { value: "1024", label: "S = 1024 (Fig 29.5 의 Approximate)" }
        ]
      }
    ],
    build: function (opts) {
      var S = Number(opts.S || 5);
      var st = { L: [0, 0, 0, 0], G: 0, acq: 0, wait: 0, t: 0, total: 0 };
      var steps = [];

      function snap() {
        return {
          time: st.t, L0: st.L[0], L1: st.L[1], L2: st.L[2], L3: st.L[3], G: st.G,
          actual: st.total, lag: st.total - st.G, glock_acq: st.acq, glock_wait: st.wait
        };
      }
      function svg() {
        var W = 340, H = 150, base = 120, maxv = Math.max(S, 5);
        var o = '<svg viewBox="0 0 ' + W + ' ' + H + '" width="100%" style="max-width:340px" font-family="sans-serif">';
        o += '<text x="' + (W / 2) + '" y="13" font-size="10" text-anchor="middle" fill="#9aa">t=' + st.t + '  S=' + S + '  실제 합=' + st.total + '  G=' + st.G + '</text>';
        for (var i = 0; i < 4; i++) {
          var x = 22 + i * 58, hgt = Math.min(1, st.L[i] / maxv) * 80;
          o += '<rect x="' + x + '" y="' + (base - 80) + '" width="36" height="80" fill="none" stroke="#8aa" stroke-dasharray="3,2"/>';
          o += '<rect x="' + x + '" y="' + (base - hgt) + '" width="36" height="' + hgt + '" fill="#4a8fd6"/>';
          o += '<text x="' + (x + 18) + '" y="' + (base + 13) + '" font-size="10" text-anchor="middle" fill="#9aa">L' + i + '=' + st.L[i] + '</text>';
        }
        var gx = 262, gmax = 16, gh = Math.min(1, st.G / gmax) * 80;
        o += '<rect x="' + gx + '" y="' + (base - 80) + '" width="50" height="80" fill="none" stroke="#e0a526"/>';
        o += '<rect x="' + gx + '" y="' + (base - gh) + '" width="50" height="' + gh + '" fill="#e0a526"/>';
        o += '<text x="' + (gx + 25) + '" y="' + (base + 13) + '" font-size="10" text-anchor="middle" fill="#e0a526">G=' + st.G + '</text>';
        o += '<text x="' + (W / 2) + '" y="' + (H - 4) + '" font-size="9.5" text-anchor="middle" fill="#9aa">global lock 획득 ' + st.acq + '회, 경합 대기 ' + st.wait + '회</text>';
        return o + '</svg>';
      }
      function push(desc, pc, status, note) {
        steps.push({ desc: desc, pc: { code: pc }, vars: snap(), status: { code: status || "running" }, note: note, svg: svg() });
      }

      push("초기 상태. CPU 4개에 스레드가 하나씩 있고, 각자 `update(c, tid, 1)` 로 카운터를 1씩 올린다. " +
        "논리적 카운터 값 = `G + L0 + L1 + L2 + L3` 이지만, 다른 스레드가 `get()` 으로 읽을 수 있는 것은 '''G 뿐''' 이다. " +
        "증가 순서는 OSTEP '''Figure 29.3''' 의 Time 1~7 과 똑같이 재생한다(그림의 L1~L4 = 여기 L0~L3). threshold '''S = " + S + "'''.",
        null, "ready");

      SCHEDULE.forEach(function (cpus, ti) {
        st.t = ti + 1;
        var flushedThisTick = 0;
        cpus.forEach(function (cpu) {
          st.L[cpu] += 1; st.total += 1;
          if (st.L[cpu] < S) {
            push("t=" + st.t + ": '''CPU" + cpu + "''' 가 자기 local 락 `llock[" + cpu + "]` 만 잡고 `local[" + cpu + "] += 1` → " + st.L[cpu] +
              ". 다른 CPU 와 '''공유하는 것이 없으니 경합이 없다''' — 이것이 확장성(scalability)의 원천. S(" + S + ") 미만이라 global 은 건드리지 않는다.",
              LN.local);
            return;
          }
          // flush
          var v = st.L[cpu];
          var contended = flushedThisTick > 0;
          st.acq += 1;
          if (contended) st.wait += 1;
          st.G += v; st.L[cpu] = 0;
          flushedThisTick += 1;
          push("t=" + st.t + ": '''CPU" + cpu + "''' 의 `local[" + cpu + "]` 가 " + v + " 이 되어 `>= threshold(" + S + ")` → " +
            (contended ? "`glock` 을 잡으려는데 '''같은 시각에 다른 CPU 가 이미 쥐고 있어 기다린다'''(경합). 차례가 와서 " : "`glock` 을 잡고 ") +
            "`global += " + v + "` → G = " + st.G + ", `local[" + cpu + "] = 0`." +
            (S === 1 ? " S=1 이면 '''증가할 때마다''' global 락을 잡으니, 결국 락 하나짜리 정확한 카운터(Precise)와 같다." : ""),
            LN.global, contended ? "spinning" : "running",
            S === 5 && ti === 5 ? "Figure 29.3 Time 6: L1 5→0, G = 5 (from L1)." :
              (S === 5 && ti === 6 ? "Figure 29.3 Time 7: L4 5→0, G = 10 (from L4)." : null));
        });
      });

      var lag = st.total - st.G;
      push("끝(t=7). 실제로 일어난 증가는 '''" + st.total + "''' 번, `get()` 이 돌려주는 G 는 '''" + st.G + "''' (오차 " + lag + "). " +
        "global 락은 '''" + st.acq + "''' 번 잡혔고 그중 " + st.wait + " 번은 다른 CPU 와 부딪혀 기다렸다. " +
        (S === 1 ? "S=1: G 는 항상 정확하지만 증가마다 공유 락을 잡으므로 CPU 가 늘수록 느려진다." :
          S === 5 ? "S=5: 16번 증가에 global 락은 2번뿐. 대신 G 는 최대 (CPU 수 × S) 만큼 뒤처질 수 있다." :
            "S=1024: global 락을 '''한 번도''' 안 잡았다. 가장 빠르지만 G 는 아직 0 — 최대 4 × 1024 까지 뒤처질 수 있다."),
        LN.unlock, "done",
        "정확도 ↔ 성능 trade-off (OSTEP 29.1): S 가 작을수록 정확하지만 느리고(non-scalable), 클수록 빠르지만 global 값이 최대 NUMCPUS × S 만큼 늦다. " +
        "Figure 29.5: 스레드마다 100만 번 증가시킬 때 Precise(락 하나) 카운터는 1 스레드 약 0.03초 → 2 스레드 5초 이상으로 폭증, " +
        "Approximate(S=1024)는 4 CPU × 100만 번이 1 CPU × 100만 번과 거의 같은 시간. Figure 29.6: S 가 커질수록 시간이 급감.");

      return {
        panels: [{ id: "code", title: "update() — Figure 29.4", lang: "c", lines: CODE }],
        vars: [
          { name: "time", label: "time (Fig 29.3 의 Time)", group: "진행" },
          { name: "L0", label: "local[0]", group: "CPU별 local (llock 으로 보호)" },
          { name: "L1", label: "local[1]", group: "CPU별 local (llock 으로 보호)" },
          { name: "L2", label: "local[2]", group: "CPU별 local (llock 으로 보호)" },
          { name: "L3", label: "local[3]", group: "CPU별 local (llock 으로 보호)" },
          { name: "G", label: "global (get() 이 읽는 값)", group: "global (glock 으로 보호)" },
          { name: "actual", label: "실제 증가 횟수", group: "정확도" },
          { name: "lag", label: "오차 = 실제 − G", group: "정확도" },
          { name: "glock_acq", label: "glock 획득 횟수", group: "경합" },
          { name: "glock_wait", label: "glock 경합 대기", group: "경합" }
        ],
        steps: steps
      };
    }
  };
})(typeof window !== "undefined" ? window : globalThis);
