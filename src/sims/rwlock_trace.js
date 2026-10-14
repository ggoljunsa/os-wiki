// rwlock_trace — 11강 p.31~33 (10강 p.53~55) reader-writer lock 을 줄 단위로 실행.
// 세마포어는 강의 모델(Linux): wait = 값 −1, 음수면 잠듦 / post = 값 +1, 대기자가 있으면 하나 깨움.
// 시나리오: basic(R1·R2 동시 읽기 → W 대기 → 마지막 reader 가 W 를 깨움) /
//           writer_first(W 가 먼저 → 첫 reader 가 lock 을 쥔 채 writelock 에서 잠듦 → 둘째 reader 는 lock 에서 잠듦) /
//           starvation(W 가 기다리는 동안 reader 가 계속 들어옴)
(function (global) {
  "use strict";
  global.SIMS = global.SIMS || {};

  var R_CODE = [
    "void reader(rwlock_t *rw) {",
    "  // rwlock_acquire_readlock(rw)",
    "    sem_wait(&rw->lock);",
    "    rw->readers++;",
    "    if (rw->readers == 1)",
    "      sem_wait(&rw->writelock); // 첫 reader",
    "    sem_post(&rw->lock);",
    "  /* ---- 읽기 (lookup) ---- */",
    "  // rwlock_release_readlock(rw)",
    "    sem_wait(&rw->lock);",
    "    rw->readers--;",
    "    if (rw->readers == 0)",
    "      sem_post(&rw->writelock); // 마지막 reader",
    "    sem_post(&rw->lock);",
    "}"
  ];
  var W_CODE = [
    "void writer(rwlock_t *rw) {",
    "  // rwlock_acquire_writelock(rw)",
    "    sem_wait(&rw->writelock);",
    "  /* ---- 쓰기 (insert) ---- */",
    "  // rwlock_release_writelock(rw)",
    "    sem_post(&rw->writelock);",
    "}"
  ];

  // 시나리오: [스레드, 메모(선택)] — 스레드가 자기 현재 줄 하나를 실행
  var SCEN = {
    basic: {
      threads: ["R1", "R2", "W"],
      intro: "슬라이드 p.31 의 기본 규칙 세 가지를 확인한다: ① reader 는 '''여럿이 동시에''' 읽는다 ② writer 는 reader 가 '''하나라도 있으면''' 기다린다 ③ '''마지막 reader''' 가 나가면서 writer 를 들여보낸다.",
      sched: [
        ["R1"], ["R1"], ["R1", "R1 이 '''첫 reader''' 다 (`readers == 1`). 그래서 reader 무리를 대표해 writelock 을 잡으러 간다."], ["R1"], ["R1"],
        ["R2"], ["R2"], ["R2", "R2 는 `readers == 2` 라 조건이 거짓 — '''writelock 을 다시 잡지 않고''' 그냥 통과한다. 이미 R1 이 무리를 대표해 잡아 두었기 때문."], ["R2", "이제 '''R1 과 R2 가 동시에 읽는다'''. 락 하나였다면 R2 는 R1 이 끝날 때까지 기다려야 했다 — 이것이 rwlock 을 쓰는 이유."],
        ["W", "writer 는 writelock '''하나만''' 잡으면 되는데, 그건 지금 reader 무리가 쥐고 있다 → 잠든다."],
        ["R1", "R1 이 먼저 다 읽었다."], ["R1"], ["R1"], ["R1", "`readers` 가 1 로 줄었을 뿐 0 이 아니다 → R1 은 '''writelock 을 놓지 않는다'''. 먼저 나간 reader 가 아니라 '''마지막''' reader 가 놓는다."], ["R1"],
        ["R2"], ["R2"], ["R2"], ["R2", "`readers == 0` — R2 가 '''마지막 reader''' 다."], ["R2", "writelock 을 post → 대기 중이던 W 가 깨어난다. R1 이 잡은 writelock 을 R2 가 놓았다: '''잡은 스레드와 놓는 스레드가 다르다''' — mutex 가 아니라 세마포어를 쓰는 이유."], ["R2"],
        ["W", "W 가 쓰는 동안 reader 는 아무도 없다."], ["W"]
      ]
    },
    writer_first: {
      threads: ["R1", "R2", "W"],
      intro: "writer 가 '''먼저''' 들어가 있을 때 reader 둘이 오면? 코드를 보면 첫 reader 가 '''`lock` 을 쥔 채로''' writelock 에서 잠든다 — 그래서 둘째 reader 는 writelock 이 아니라 '''`lock` 에서''' 막힌다. 줄 단위로 따라가야 보이는 장면.",
      sched: [
        ["W", "W 가 writelock 을 잡고 쓰기 시작."],
        ["R1", "R1: `lock` 을 잡는다 (1 → 0)."], ["R1"], ["R1", "R1 이 첫 reader → writelock 을 잡으러 간다."],
        ["R1", "writelock 은 W 가 쥐고 있다 → R1 은 '''여기서 잠든다'''. 그런데 R1 은 아직 7번 줄 `sem_post(&rw->lock)` 을 못 했다 → '''`lock` 을 쥔 채로 잠든 것'''."],
        ["R2", "R2 는 3번 줄 `sem_wait(&rw->lock)` 에서 잠든다 (0 → −1). R1 이 lock 을 안 놓았으니까. 즉 writer 가 쓰는 동안 '''첫 reader 는 writelock 에서, 나머지 reader 는 lock 에서''' 줄을 선다. 데드락은 아니다 — W 가 끝나면 풀린다."],
        ["W", "W 가 다 썼다."],
        ["W", "W 가 writelock 을 post (−1 → 0) → writelock 에서 자던 R1 이 깨어난다. 이제 writelock 은 reader 무리 소유."],
        ["R1", "R1 이 드디어 7번 줄 — lock 을 post (−1 → 0) → lock 에서 자던 R2 가 깨어난다. R1 은 읽기 시작."],
        ["R2", "R2: `readers` 2."], ["R2", "2 ≠ 1 → writelock 은 건너뜀."], ["R2", "R1, R2 동시에 읽는 중."],
        ["R2"], ["R2"], ["R2"], ["R2"], ["R2"],
        ["R1"], ["R1"], ["R1"], ["R1"], ["R1", "R1 이 마지막 reader → writelock 을 반납 (0 → 1)."], ["R1"]
      ]
    },
    starvation: {
      threads: ["R1", "R2", "R3", "W"],
      intro: "p.33 의 fairness 문제: reader 가 '''교대로 계속''' 들어오면 `readers` 가 한 번도 0 이 되지 않아 writer 가 굶는다. 이 구현은 writer 가 기다려도 '''새 reader 를 막지 않는다'''.",
      sched: [
        ["R1"], ["R1"], ["R1"], ["R1"], ["R1", "R1 읽는 중 (writelock = reader 무리)."],
        ["W", "W 도착 → writelock 에서 잠듦."],
        ["R2"], ["R2"], ["R2", "W 가 '''이미 기다리고 있는데도''' R2 는 `readers == 2` 라 writelock 없이 바로 통과한다. 코드 어디에도 '기다리는 writer 가 있나?' 를 보는 줄이 없다."], ["R2"],
        ["R1"], ["R1"], ["R1"], ["R1", "R1 이 나가도 `readers` = 1 (R2 가 남음) → writelock 그대로."], ["R1"],
        ["R3"], ["R3"], ["R3", "R3 도 바로 통과 — `readers` 가 0 이 될 틈이 없다."], ["R3"],
        ["R2"], ["R2"], ["R2"], ["R2", "R2 가 나가도 R3 가 남아 있다. reader 가 이렇게 '''겹쳐서''' 계속 오면 W 는 영원히 기다린다 = '''writer starvation'''."], ["R2"],
        ["R3"], ["R3"], ["R3"], ["R3", "여기서는 R3 뒤로 아무도 안 와서 `readers` 가 드디어 0."], ["R3", "그제야 마지막 reader R3 가 writelock 을 post → W 가 깨어난다."], ["R3"],
        ["W", "W 는 R1, R2, R3 세 명이 다 지나간 뒤에야 쓴다. 개선안(p.33, 수업 범위 밖): '''writer 가 기다리는 동안 새 reader 를 막는다''' — 세마포어 하나와 카운터가 더 필요."], ["W"]
      ]
    }
  };

  global.SIMS["rwlock_trace"] = {
    title: "reader-writer lock 줄 단위 디버깅",
    desc: "11강 p.32 코드를 그대로 실행한다. 변수표의 `lock`·`writelock` 은 세마포어 값(음수 = 대기자 수), 대기 줄은 누가 어느 세마포어에서 자는지. 아래 그림의 방 안 = 지금 읽거나 쓰는 스레드.",
    options: [
      {
        key: "scenario",
        label: "시나리오",
        values: [
          { value: "basic", label: "기본: R1·R2 동시 읽기 → W 대기 → 마지막 reader 가 W 를 깨움" },
          { value: "writer_first", label: "writer 먼저: 첫 reader 가 lock 을 쥔 채 잠듦" },
          { value: "starvation", label: "writer starvation: reader 가 계속 들어옴" }
        ]
      }
    ],
    build: function (opts) {
      return run(SCEN[opts.scenario] || SCEN.basic);
    }
  };

  function run(sc) {
    var sem = { lock: { v: 1, q: [] }, writelock: { v: 1, q: [] } };
    var readers = 0;
    var wlOwner = "없음";
    var th = {};
    sc.threads.forEach(function (t) {
      th[t] = { pc: 3, state: "ready", isW: t === "W" };
    });
    var steps = [];
    var lastActor = null;

    function where(t) {
      var x = th[t];
      if (x.state === "done") return "done";
      if (x.state === "sleep") return "sleep";
      if (!x.isW && x.pc === 8) return "inside";
      if (x.isW && x.pc === 4) return "inside";
      return "outside";
    }
    function stateLabel(t) {
      var x = th[t], w = where(t);
      if (w === "done") return "끝";
      if (w === "sleep") return "잠듦 (" + (x.sleepOn) + " 에서)";
      if (w === "inside") return x.isW ? "쓰는 중" : "읽는 중";
      return x.pc === 3 && !x.started ? "아직 시작 전" : "진행 중 (줄 " + x.pc + ")";
    }
    function snap() {
      var v = {
        lock: sem.lock.v, "lock.q": sem.lock.q.join(", ") || "(없음)",
        writelock: sem.writelock.v, "writelock.q": sem.writelock.q.join(", ") || "(없음)",
        readers: readers, owner: wlOwner
      };
      sc.threads.forEach(function (t) { v[t] = stateLabel(t); });
      return v;
    }
    function badges() {
      var b = {};
      sc.threads.forEach(function (t) {
        var w = where(t);
        b[t] = w === "done" ? "done" : (w === "sleep" ? "sleeping" : (w === "inside" ? "running" : (t === lastActor ? "running" : "ready")));
      });
      return b;
    }
    function pcs() {
      var p = {};
      sc.threads.forEach(function (t) {
        p[t] = th[t].state === "done" || !th[t].started ? null : th[t].pc;
      });
      return p;
    }
    function svg() {
      var W = 560, H = 190;
      var s = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + W + ' ' + H + '" style="max-width:100%;font:12px sans-serif">';
      // 방
      s += '<rect x="190" y="30" width="200" height="120" rx="8" fill="#f4f8ff" stroke="#1d65b3" stroke-width="2"/>';
      s += '<text x="290" y="22" text-anchor="middle" font-weight="700">공유 리스트 (방)</text>';
      s += '<rect x="205" y="38" width="170" height="20" rx="4" fill="' + (wlOwner === "없음" ? "#eee" : (wlOwner.indexOf("reader") >= 0 ? "#dff3df" : "#ffe1cc")) + '" stroke="#888"/>';
      s += '<text x="290" y="52" text-anchor="middle" font-size="11">문 팻말 writelock: ' + wlOwner + '</text>';
      var inside = sc.threads.filter(function (t) { return where(t) === "inside"; });
      inside.forEach(function (t, i) {
        var x = 220 + i * 50, y = 95;
        s += '<circle cx="' + (x + 15) + '" cy="' + y + '" r="16" fill="' + (th[t].isW ? "#ffb27a" : "#9fd39f") + '" stroke="#333"/>';
        s += '<text x="' + (x + 15) + '" y="' + (y + 4) + '" text-anchor="middle" font-weight="700">' + t + '</text>';
      });
      s += '<text x="290" y="140" text-anchor="middle" fill="#555" font-size="11">readers = ' + readers + (inside.length ? "" : " · 비어 있음") + '</text>';
      // 대기 줄
      function queue(label, q, y, v) {
        var out = '<text x="8" y="' + y + '" font-weight="700">' + label + ' = ' + v + '</text>';
        out += '<text x="8" y="' + (y + 16) + '" fill="#555" font-size="11">잠든 줄:</text>';
        q.forEach(function (t, i) {
          out += '<rect x="' + (60 + i * 36) + '" y="' + (y + 4) + '" width="30" height="18" rx="3" fill="#ffd9d9" stroke="#b33"/>';
          out += '<text x="' + (75 + i * 36) + '" y="' + (y + 17) + '" text-anchor="middle">' + t + '</text>';
        });
        return out;
      }
      s += queue("lock", sem.lock.q, 60, sem.lock.v);
      s += queue("writelock", sem.writelock.q, 115, sem.writelock.v);
      // 대기/밖/끝
      var outside = sc.threads.filter(function (t) { return where(t) === "outside" && th[t].started; });
      var done = sc.threads.filter(function (t) { return where(t) === "done"; });
      s += '<text x="410" y="60" font-weight="700">진행 중(코드 안)</text>';
      s += '<text x="410" y="78">' + (outside.join(", ") || "-") + '</text>';
      s += '<text x="410" y="115" font-weight="700">끝남</text>';
      s += '<text x="410" y="133">' + (done.join(", ") || "-") + '</text>';
      s += '<text x="8" y="182" fill="#777" font-size="10">초록 = 읽는 reader · 주황 = 쓰는 writer · 빨강 칸 = 그 세마포어에서 잠든 스레드</text>';
      return s + '</svg>';
    }
    function push(desc, pcOverride, note) {
      var p = pcs();
      if (pcOverride) for (var k in pcOverride) p[k] = pcOverride[k];
      steps.push({ desc: desc, pc: p, vars: snap(), status: badges(), note: note, svg: svg() });
    }

    function semWait(t, name) {
      var S = sem[name];
      var before = S.v;
      S.v -= 1;
      if (S.v < 0) {
        S.q.push(t); th[t].state = "sleep"; th[t].sleepOn = name;
        return "`sem_wait(&" + name + ")`: " + before + " → '''" + S.v + "''' (음수) → '''" + t + " 잠듦'''";
      }
      return "`sem_wait(&" + name + ")`: " + before + " → " + S.v + " → 통과";
    }
    function semPost(t, name) {
      var S = sem[name];
      var before = S.v;
      S.v += 1;
      if (S.q.length) {
        var u = S.q.shift();
        th[u].state = "ready";
        th[u].sleepOn = null;
        th[u].pc = nextAfterWait(u, th[u].pc);
        return { text: "`sem_post(&" + name + ")`: " + before + " → " + S.v + " → 대기자 '''" + u + " 깨움'''", woke: u };
      }
      return { text: "`sem_post(&" + name + ")`: " + before + " → " + S.v + " (기다리는 스레드 없음)", woke: null };
    }
    function nextAfterWait(t, pc) {
      if (th[t].isW) return 4;          // writer: 3 → 쓰기
      if (pc === 3) return 4;           // reader lock 획득
      if (pc === 6) { wlOwner = "reader 무리"; return 7; }
      if (pc === 10) return 11;
      return pc + 1;
    }

    push(sc.intro + " 초기값: `lock = 1`, `writelock = 1`, `readers = 0` (p.31 `rwlock_init`).", {});

    sc.sched.forEach(function (e) {
      var t = e[0], memo = e[1] || "", x = th[t];
      if (x.state === "sleep" || x.state === "done") throw new Error("rwlock_trace: " + t + " cannot run (" + x.state + ")");
      x.started = true;
      lastActor = t;
      var line = x.pc, msg = "", note;
      if (x.isW) {
        if (line === 3) {
          msg = semWait(t, "writelock");
          if (x.state !== "sleep") { x.pc = 4; wlOwner = "W"; }
        } else if (line === 4) { msg = "쓰기 끝 → release 로"; x.pc = 6; }
        else if (line === 6) {
          var r = semPost(t, "writelock"); msg = r.text;
          wlOwner = r.woke ? (th[r.woke].isW ? r.woke : "reader 무리") : "없음";
          x.state = "done"; x.pc = 7;
        }
      } else {
        if (line === 3) { msg = semWait(t, "lock"); if (x.state !== "sleep") x.pc = 4; }
        else if (line === 4) { readers += 1; msg = "`readers++` → " + readers; x.pc = 5; }
        else if (line === 5) {
          var c = readers === 1; msg = "`readers == 1` ? → " + (c ? "'''참''' (첫 reader)" : "거짓 → 6번 줄 건너뜀"); x.pc = c ? 6 : 7;
        } else if (line === 6) {
          msg = semWait(t, "writelock");
          if (x.state !== "sleep") { x.pc = 7; wlOwner = "reader 무리"; }
          else note = t + " 은 '''`lock` 을 아직 쥔 채로''' 잠들었다 — 다른 reader 는 이제 3번 줄 `lock` 에서 막힌다.";
        } else if (line === 7) {
          var r2 = semPost(t, "lock"); msg = r2.text + " → 읽기 시작"; x.pc = 8;
        } else if (line === 8) { msg = "읽기 끝 → release 로"; x.pc = 10; }
        else if (line === 10) { msg = semWait(t, "lock"); if (x.state !== "sleep") x.pc = 11; }
        else if (line === 11) { readers -= 1; msg = "`readers--` → " + readers; x.pc = 12; }
        else if (line === 12) {
          var c2 = readers === 0; msg = "`readers == 0` ? → " + (c2 ? "'''참''' (마지막 reader)" : "거짓 → writelock 그대로"); x.pc = c2 ? 13 : 14;
        } else if (line === 13) {
          var r3 = semPost(t, "writelock"); msg = r3.text;
          wlOwner = r3.woke ? (th[r3.woke].isW ? r3.woke : "reader 무리") : "없음";
          x.pc = 14;
        } else if (line === 14) {
          var r4 = semPost(t, "lock"); msg = r4.text + " → " + t + " 끝"; x.state = "done"; x.pc = 15;
        }
      }
      var pcShow = {}; pcShow[t] = line;
      push("'''" + t + "''' " + line + "번 줄: " + msg + (memo ? " — " + memo : ""), pcShow, note);
    });

    push("끝. `lock = " + sem.lock.v + "`, `writelock = " + sem.writelock.v + "`, `readers = " + readers + "` — 모두 초기값으로 돌아왔다.", {});

    var panels = sc.threads.map(function (t) {
      return { id: t, title: t === "W" ? "W (writer)" : t + " (reader)", lang: "c", lines: t === "W" ? W_CODE : R_CODE };
    });
    var vars = [
      { name: "lock", label: "lock (readers 보호, 값)", group: "세마포어" },
      { name: "lock.q", label: "lock 에서 잠든 스레드", group: "세마포어" },
      { name: "writelock", label: "writelock (값)", group: "세마포어" },
      { name: "writelock.q", label: "writelock 에서 잠든 스레드", group: "세마포어" },
      { name: "readers", label: "readers (읽는 중인 수)", group: "카운터" },
      { name: "owner", label: "writelock 을 쥔 쪽", group: "카운터" }
    ];
    sc.threads.forEach(function (t) { vars.push({ name: t, label: t + " 상태", group: "스레드" }); });
    return { panels: panels, vars: vars, steps: steps };
  }
})(typeof window !== "undefined" ? window : globalThis);
