// mid26_trylock — 2026F 중간고사 Problem 9: ticket lock 에 try_lock 붙이기
// 옵션 variant:
//   bad      — a) bad_try_lock: 실패한 B 가 ticket 만 올리고 떠남 → turn 1 을 아무도 unlock 못 함 → C 영원히 spin
//   correct  — b) try_lock: t = turn 을 먼저 읽고 CAS(&ticket, t, t+1), return old == t → 실패해도 ticket 그대로 → C 진입
//   race     — c) ticket = turn = 4, A·B 둘 다 t = 4 를 읽은 뒤 A 가 먼저 CAS → A 1, B 0
(function (global) {
  "use strict";
  global.SIMS = global.SIMS || {};

  var CODE = {
    bad: [
      "int bad_try_lock(lock_t *l) {",
      "    int mine = FetchAndAdd(&l->ticket);",
      "    return l->turn == mine;",
      "}"
    ],
    correct: [
      "int try_lock(lock_t *l) {",
      "    int t = l->turn;",
      "    int old = CAS(&l->ticket, t, t + 1);   // (i)",
      "    return old == t;                        // (ii)",
      "}"
    ]
  };
  var LOCK = [
    "void lock(lock_t *l) {",
    "    int mine = FetchAndAdd(&l->ticket);",
    "    while (l->turn != mine) ; // spin",
    "}",
    "void unlock(lock_t *l) { FetchAndAdd(&l->turn); }"
  ];

  function svg(s) {
    var o = '<svg viewBox="0 0 420 90" width="100%" style="max-width:460px" font-family="sans-serif">';
    o += '<rect x="10" y="10" width="120" height="44" rx="6" fill="#fdeec2" stroke="#8a6000"/><text x="70" y="28" font-size="11" text-anchor="middle" fill="#8a6000">ticket (발급기)</text><text x="70" y="47" font-size="17" text-anchor="middle" font-weight="700" fill="#8a6000">' + s.ticket + '</text>';
    o += '<rect x="150" y="10" width="120" height="44" rx="6" fill="#dbe8f7" stroke="#1d65b3"/><text x="210" y="28" font-size="11" text-anchor="middle" fill="#1d65b3">turn (전광판)</text><text x="210" y="47" font-size="17" text-anchor="middle" font-weight="700" fill="#1d65b3">' + s.turn + '</text>';
    o += '<text x="290" y="28" font-size="12" fill="#333">보유: ' + s.holder + '</text>';
    o += '<text x="290" y="47" font-size="12" fill="#333">대기: ' + s.waiting + '</text>';
    o += '<text x="10" y="78" font-size="12" fill="' + (s.warn ? "#d6465f" : "#1d6b2a") + '" font-weight="700">' + s.msg + '</text>';
    return o + '</svg>';
  }

  global.SIMS["mid26_trylock"] = {
    title: "2026F 중간 P9 — ticket lock 의 try_lock (bad vs CAS)",
    desc: "실패한 try 가 '''ticket 을 올리면''' 그 번호의 주인이 영원히 오지 않아 turn 이 멈춘다. 올바른 try_lock 은 turn 을 먼저 읽고 ticket == turn 일 때만 CAS 로 번호를 가져간다. → [[ticket lock]], [[compare-and-swap]], [[2026F 중간고사]]",
    options: [
      { key: "variant", label: "시나리오", values: [
        { value: "bad", label: "a) bad_try_lock — B 실패 후 C 가 영원히 spin" },
        { value: "correct", label: "b) 올바른 try_lock — 같은 상황에서 C 진입" },
        { value: "race", label: "c) ticket = turn = 4, A·B 동시 try_lock" }
      ] }
    ],
    build: function (opts) {
      var v = opts.variant || "bad";
      var steps = [];
      var S = { ticket: 1, turn: 0, holder: "A (번호 0)", waiting: "—", msg: "", warn: false };
      function push(desc, pcT, pcL, extra, note) {
        var vars = { "l->ticket": S.ticket, "l->turn": S.turn, "보유자": S.holder, "대기": S.waiting };
        Object.keys(extra || {}).forEach(function (k) { vars[k] = extra[k]; });
        var st = { desc: desc, pc: { TRY: pcT, LOCK: pcL }, vars: vars, svg: svg(S) };
        if (note) st.note = note;
        steps.push(st);
      }
      if (v === "race") {
        S.ticket = 4; S.turn = 4; S.holder = "없음"; S.msg = "ticket == turn → 락이 비어 있음";
        push("c) 시작: ticket = turn = 4 (락이 비어 있다). A 와 B 가 둘 다 try_lock 을 부른다.", 1, null, { "A.t": "-", "B.t": "-" });
        S.msg = "둘 다 t = 4";
        push("A 와 B 가 '''둘 다''' `t = l->turn` 으로 4 를 읽는다 (CAS 전).", 2, null, { "A.t": 4, "B.t": 4 });
        S.ticket = 5; S.holder = "A (번호 4)"; S.msg = "A: CAS 성공 (old 4)";
        push("A 가 먼저 `CAS(&ticket, 4, 5)`: ticket 이 4 = expected → 5 로 쓰고 '''old 4''' 반환 → `old == t` → '''1'''.", 3, null, { "A.t": 4, "B.t": 4, "A.old": 4, "A 반환": 1 });
        S.msg = "B: CAS 실패 (old 5), ticket 그대로 5"; S.warn = true;
        push("B 의 `CAS(&ticket, 4, 5)`: ticket 은 이미 5 ≠ 4 → 쓰지 않고 '''old 5''' 반환 → `5 == 4` 거짓 → '''0'''. 실패했지만 ticket 을 '''올리지 않았다'''.", 4, null, { "A.t": 4, "B.t": 4, "A.old": 4, "A 반환": 1, "B.old": 5, "B 반환": 0 },
          "최종: ticket 5, turn 4. A 가 락 보유. 표 정답 — A: old 4 / 반환 1, B: old 5 / 반환 0.");
        return { panels: [{ id: "TRY", title: "try_lock (정답 코드)", lang: "c", lines: CODE.correct }, { id: "LOCK", title: "ticket lock", lang: "c", lines: LOCK }],
          vars: [{ name: "l->ticket", group: "락" }, { name: "l->turn", group: "락" }, { name: "보유자", group: "락" }, { name: "대기", group: "락" },
            { name: "A.t", group: "A" }, { name: "A.old", group: "A" }, { name: "A 반환", group: "A" }, { name: "B.t", group: "B" }, { name: "B.old", group: "B" }, { name: "B 반환", group: "B" }],
          steps: steps };
      }
      var bad = v === "bad";
      S.msg = "A 보유 중: A 의 번호 0 = turn 0";
      push("시작: A 가 락을 쥐고 있다 — A 가 번호 0 을 뽑아 ticket = 1, turn = 0.", null, null, { "B.mine/t": "-", "B 반환": "-", "C.mine": "-" });
      if (bad) {
        S.ticket = 2; S.msg = "B 가 번호 1 을 뽑아 감 (ticket 2)"; S.warn = true;
        push("B 가 `bad_try_lock`: `FetchAndAdd(&ticket)` → mine = '''1''', ticket = '''2'''. 실패든 성공이든 '''이미 번호표를 뽑았다'''.", 2, null, { "B.mine/t": 1, "B 반환": "-", "C.mine": "-" });
        S.msg = "turn 0 ≠ 1 → B 는 0 반환하고 떠남";
        push("`l->turn == mine` → 0 == 1 거짓 → '''0 반환'''. B 는 기다리지 않고 떠나지만 번호 1 은 회수되지 않는다.", 3, null, { "B.mine/t": 1, "B 반환": 0, "C.mine": "-" });
      } else {
        S.msg = "B: t = turn = 0";
        push("B 가 `try_lock`: 먼저 `t = l->turn` = '''0'''.", 2, null, { "B.mine/t": 0, "B 반환": "-", "C.mine": "-" });
        S.msg = "CAS 실패 — ticket 1 ≠ 0 → 그대로"; S.warn = false;
        push("`CAS(&ticket, 0, 1)`: ticket 은 1 ≠ 0 → '''쓰지 않음''', old 1 반환. ticket 은 '''1 그대로'''.", 3, null, { "B.mine/t": 0, "B.old": 1, "B 반환": "-", "C.mine": "-" });
        push("`old == t` → 1 == 0 거짓 → '''0 반환'''. 실패한 시도가 아무 흔적도 남기지 않았다 — \"failed try never increases the ticket\".", 4, null, { "B.mine/t": 0, "B.old": 1, "B 반환": 0, "C.mine": "-" });
      }
      S.turn = 1; S.holder = bad ? "번호 1 (= 떠난 B, 아무도 없음)" : "없음"; S.msg = "A unlock → turn 1";
      push("A 가 unlock: `FetchAndAdd(&turn)` → turn = '''1'''.", null, 5, { "B 반환": 0, "C.mine": "-" });
      if (bad) {
        S.ticket = 3; S.waiting = "C (번호 2)"; S.msg = "C: mine 2, turn 1 → 영원히 spin"; S.warn = true;
        push("C 가 `lock()`: mine = '''2''', ticket = 3. `while (turn != 2)` — turn 은 1. 번호 1 의 주인 B 는 이미 떠나서 unlock 할 사람이 없다 → turn 은 '''영원히 1''' → C '''never enters'''.", null, 3, { "B 반환": 0, "C.mine": 2 },
          "a) 정답: C's ticket 2, turn 1, C can enter: No. 원인 — 실패한 try 가 ticket 을 올렸다.");
      } else {
        S.ticket = 2; S.holder = "C (번호 1)"; S.msg = "C: mine 1 == turn 1 → 진입"; S.warn = false;
        push("C 가 `lock()`: mine = '''1''', ticket = 2. turn 1 == 1 → '''바로 진입'''. 실패한 B 가 번호를 낭비하지 않았기 때문.", null, 3, { "B 반환": 0, "C.mine": 1 },
          "b) 정답 코드: (i) CAS(&l->ticket, t, t + 1)  (ii) old == t. turn 을 CAS 전에 먼저 읽어 둔 t 와 비교해야 한다 (l->turn 을 다시 읽으면 그 사이 바뀔 수 있음).");
      }
      return {
        panels: [{ id: "TRY", title: bad ? "a) bad_try_lock" : "b) try_lock (정답)", lang: "c", lines: CODE[bad ? "bad" : "correct"] }, { id: "LOCK", title: "ticket lock (강의 코드)", lang: "c", lines: LOCK }],
        vars: [{ name: "l->ticket", group: "락" }, { name: "l->turn", group: "락" }, { name: "보유자", group: "락" }, { name: "대기", group: "락" },
          { name: "B.mine/t", group: "B" }, { name: "B.old", group: "B" }, { name: "B 반환", group: "B" }, { name: "C.mine", group: "C" }],
        steps: steps
      };
    }
  };
})(typeof window !== "undefined" ? window : globalThis);
