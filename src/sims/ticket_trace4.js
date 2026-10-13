// ticket_trace4 — 문제집 u8 ④-02: ticket = 3, turn = 2, H 가 락을 쥔 상태에서 P·Q·R 이 차례로 lock/unlock.
// 매 lock() 은 ticket 만, 매 unlock() 은 turn 만 1 올린다. 번호표 순서 = 획득 순서(fairness). 옵션 ② 는 performance 'No' 의 이유.
(function (global) {
  "use strict";
  global.SIMS = global.SIMS || {};

  function code(name) {
    return [
      name + ".lock():",
      "  myturn = FetchAndAdd(&ticket);  // 뽑기",
      "  while (turn != myturn) ;  // spin",
      "  /* critical section */",
      name + ".unlock():",
      "  FetchAndAdd(&turn);  // 전광판 +1"
    ];
  }

  global.SIMS["ticket_trace4"] = {
    title: "ticket lock 추적 — 문제집 ④-02 (H·P·Q·R)",
    desc: "은행 번호표: `ticket` = 발급기에 다음에 나올 번호, `turn` = 전광판의 '지금 몇 번 손님'. lock() 은 번호표를 뽑기만 하고(ticket +1), unlock() 은 전광판만 넘긴다(turn +1). 자기 번호가 전광판에 뜰 때까지 돈다(spin). [[ticket lock]] · [[fetch-and-add]]",
    options: [
      {
        key: "sc",
        label: "시나리오",
        values: [
          { value: "events", label: "① 문제의 이벤트 1)~7) — 표 (a)·(b) 답" },
          { value: "preempt", label: "② H 가 CS 안에서 preempt 되면 — (c) performance 'No' 의 이유" }
        ]
      }
    ],
    build: function (opts) {
      var sc = opts.sc || "events";
      var S = { ticket: 3, turn: 2, owner: "H", my: { H: 2, P: "-", Q: "-", R: "-" }, spin: [], order: ["H"], wasted: 0 };
      var stt = { H: "running", P: "ready", Q: "ready", R: "ready" };
      var pc = { H: 4, P: null, Q: null, R: null };
      var steps = [];

      function snap() {
        return {
          ticket: S.ticket, turn: S.turn,
          owner: S.owner || "(없음 — free)",
          spinning: S.spin.length ? S.spin.join(", ") : "(없음)",
          "myturn.H": S.my.H, "myturn.P": S.my.P, "myturn.Q": S.my.Q, "myturn.R": S.my.R,
          "획득 순서": S.order.join(" → "),
          "spin 으로 버린 time slice": S.wasted
        };
      }
      function push(desc, note) {
        steps.push({ desc: desc, pc: { H: pc.H, P: pc.P, Q: pc.Q, R: pc.R }, vars: snap(),
          status: { H: stt.H, P: stt.P, Q: stt.Q, R: stt.R }, note: note || null });
      }
      function lock(t, n) {
        var my = S.ticket; S.my[t] = my; S.ticket++;
        S.spin.push(t); stt[t] = "spinning"; pc[t] = 3;
        push("'''" + n + ") " + t + " 가 lock()''' — `FetchAndAdd(&ticket)` 이 '''옛 값 " + my + "''' 을 돌려주고 ticket 은 " + S.ticket + " 이 된다 → myturn[" + t + "] = " + my +
          ". 전광판 turn = " + S.turn + " ≠ " + my + " 이라 '''spin'''. (turn 은 건드리지 않는다.)");
      }
      function unlock(t, n) {
        S.turn++; S.owner = null; stt[t] = "done"; pc[t] = 6;
        var next = null;
        for (var i = 0; i < S.spin.length; i++) if (S.my[S.spin[i]] === S.turn) next = S.spin[i];
        var d = "'''" + n + ") " + t + " 가 unlock()''' — `FetchAndAdd(&turn)`: turn " + (S.turn - 1) + " → '''" + S.turn + "'''. (ticket 은 그대로 " + S.ticket + ".) ";
        if (next) {
          S.spin.splice(S.spin.indexOf(next), 1); S.owner = next; S.order.push(next); stt[next] = "running"; pc[next] = 4;
          d += "myturn 이 " + S.turn + " 인 '''" + next + "''' 의 while 조건 `turn != myturn` 이 거짓이 되어 빠져나온다 → " + next + " 가 락을 잡는다.";
        } else {
          d += "turn = " + S.turn + " = ticket 이므로 기다리는 사람이 없다 → '''락이 비었다(free)'''.";
        }
        push(d);
      }

      push("시작: ticket = 3, turn = 2, '''H 가 락을 쥐고 CS 안'''에 있다(H 의 myturn = 2). 규칙 두 개만 기억하라: '''lock() 은 ticket 만 +1, unlock() 은 turn 만 +1'''. 그리고 `turn == myturn` 인 스레드가 주인이다.");

      if (sc === "events") {
        lock("P", 1);
        lock("Q", 2);
        unlock("H", 3);
        lock("R", 4);
        unlock("P", 5);
        unlock("Q", 6);
        unlock("R", 7);
        steps[steps.length - 1].note = "답 (b): 획득 순서 = '''H → P → Q → R''' — lock() 을 부른 순서(번호표 순서) 그대로다. 이것이 test-and-set 스핀락에 없던 '''Fairness: Yes''' 의 이유(FetchAndAdd 가 각자에게 고유 번호를 주므로 누구도 새치기당해 굶지 않는다). 확인 공식: 대기자 수 = ticket − turn − 1 (4) 직후 6 − 3 − 1 = 2). 마지막에 ticket == turn (6 == 6) 이면 free.";
      } else {
        lock("P", 1);
        lock("Q", 2);
        stt.H = "ready";
        stt.P = "spinning"; S.wasted++;
        push("'''timer interrupt''' — H 가 '''CS 안에서''' 쫓겨났다(preempt). 스케줄러가 P 를 고른다. P 는 time slice 내내 `while (turn != 3)` 만 확인한다 — turn 을 올릴 수 있는 건 H 의 unlock 뿐인데 H 는 실행 중이 아니다. '''time slice 1개를 통째로 낭비'''.");
        stt.P = "ready"; stt.Q = "spinning"; S.wasted++;
        push("Q 차례 — Q 도 time slice 내내 spin. '''또 1개 낭비'''. 대기자가 N 명이면 H 가 돌아오기 전까지 N 개의 time slice 가 버려진다.");
        stt.Q = "ready"; stt.H = "running";
        push("드디어 H 가 다시 CPU 를 받아 CS 를 마저 실행한다.");
        unlock("H", 3);
        steps[steps.length - 1].note = "답 (c): ticket lock 은 Fairness 를 No → Yes 로 고쳤지만 '''Performance 는 여전히 No''' — 대기자는 여전히 spin 하고, 주인이 preempt 되면 모든 대기자가 자기 time slice 를 통째로 태운다(9강 p.29 'the thread holding the lock is preempted …'). 해결은 spin 대신 잠들기 → yield / [[queue 락]](park·unpark).";
      }

      return {
        panels: ["H", "P", "Q", "R"].map(function (t) { return { id: t, title: t, lang: "c", lines: code(t) }; }),
        vars: [
          { name: "ticket", label: "ticket (발급기: 다음 번호)", group: "락" },
          { name: "turn", label: "turn (전광판: 지금 번호)", group: "락" },
          { name: "owner", label: "owner (turn == myturn 인 스레드)", group: "락" },
          { name: "spinning", label: "spinning (기다리며 도는 스레드)", group: "락" },
          { name: "myturn.H", label: "H 의 myturn", group: "번호표" },
          { name: "myturn.P", label: "P 의 myturn", group: "번호표" },
          { name: "myturn.Q", label: "Q 의 myturn", group: "번호표" },
          { name: "myturn.R", label: "R 의 myturn", group: "번호표" },
          { name: "획득 순서", label: "획득 순서", group: "결과" },
          { name: "spin 으로 버린 time slice", label: "spin 으로 버린 time slice", group: "결과" }
        ],
        steps: steps
      };
    }
  };
})(typeof window !== "undefined" ? window : globalThis);
