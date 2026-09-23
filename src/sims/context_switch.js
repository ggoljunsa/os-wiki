// context_switch — timer interrupt 로 프로세스 A → B 컨텍스트 스위치
// 출처: 4-Limited_Direct_Execution.pdf p.27~33 (LDE 프로토콜, timer interrupt), xv6 kernel/swtch.S
window.SIMS = window.SIMS || {};

(function () {
  var PROTO = [
    "[Program (user)]  Process A running",
    "[Hardware]        timer interrupt",
    "[Hardware]        save regs(A) to k-stack(A)",
    "[Hardware]        move to kernel mode",
    "[Hardware]        jump to trap handler",
    "[OS (kernel)]     Handle the trap",
    "[OS (kernel)]     Call switch() routine",
    "[OS (kernel)]       save regs(A) to proc-struct(A)",
    "[OS (kernel)]       restore regs(B) from proc-struct(B)",
    "[OS (kernel)]       switch to k-stack(B)",
    "[OS (kernel)]     return-from-trap (into B)",
    "[Hardware]        restore regs(B) from k-stack(B)",
    "[Hardware]        move to user mode",
    "[Hardware]        jump to B's PC",
    "[Program (user)]  Process B running"
  ];

  var SWTCH = [
    "# kernel/swtch.S  —  swtch(&A->context, &B->context)",
    "#   a0 = &A.context (저장할 곳),  a1 = &B.context (복원할 곳)",
    "swtch:",
    "    sd ra,  0(a0)      # A 의 복귀 주소",
    "    sd sp,  8(a0)      # A 의 커널 스택 포인터",
    "    sd s0, 16(a0)",
    "    #  ... s1 ~ s11 도 같은 방식 (callee-saved 14개만) ...",
    "",
    "    ld ra,  0(a1)      # B 의 복귀 주소",
    "    ld sp,  8(a1)      # B 의 커널 스택 포인터",
    "    ld s0, 16(a1)",
    "    #  ... s1 ~ s11 복원 ...",
    "    ret                # ra(= B 의 복귀 주소) 로 점프"
  ];

  function twoColSvg(st, owner, caption) {
    // owner: "A" | "B" | "sched"
    function col(x, name, kstack, ctx, hot) {
      var s = '';
      s += '<rect x="' + x + '" y="24" width="132" height="126" rx="6" fill="' +
           (hot ? "#2f6da8" : "#343a42") + '" stroke="' + (hot ? "#7fc0ff" : "#4b535d") + '"/>';
      s += '<text x="' + (x + 66) + '" y="42" font-size="12" text-anchor="middle" fill="#fff">Process ' + name + '</text>';
      s += '<text x="' + (x + 8) + '" y="62" font-size="9.5" fill="#cbd5e0">k-stack(' + name + ')</text>';
      s += '<rect x="' + (x + 8) + '" y="68" width="116" height="30" rx="3" fill="#1e232a" stroke="#4b535d"/>';
      s += '<text x="' + (x + 12) + '" y="86" font-size="9" fill="#9fd0a0">' + esc(kstack) + '</text>';
      s += '<text x="' + (x + 8) + '" y="114" font-size="9.5" fill="#cbd5e0">proc-struct(' + name + ').context</text>';
      s += '<rect x="' + (x + 8) + '" y="120" width="116" height="22" rx="3" fill="#1e232a" stroke="#4b535d"/>';
      s += '<text x="' + (x + 12) + '" y="135" font-size="9" fill="#e0c08a">' + esc(ctx) + '</text>';
      return s;
    }
    function esc(t) {
      t = String(t);
      if (t.length > 22) t = t.slice(0, 21) + "…";
      return t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }
    var s = '<svg viewBox="0 0 360 196" width="100%" style="max-width:360px">';
    s += '<text x="4" y="14" font-size="11" fill="#9aa">CPU 는 한 순간에 하나만 실행한다</text>';
    s += col(14, "A", st["k-stack(A)"], "ra=" + st["A.context.ra"], owner === "A");
    s += col(214, "B", st["k-stack(B)"], "ra=" + st["B.context.ra"], owner === "B");
    var cx = owner === "A" ? 80 : owner === "B" ? 280 : 180;
    s += '<rect x="' + (cx - 34) + '" y="160" width="68" height="22" rx="4" fill="#a8642f" stroke="#ffc08a"/>';
    s += '<text x="' + cx + '" y="175" font-size="11" text-anchor="middle" fill="#fff">CPU</text>';
    s += '<polygon points="' + cx + ',150 ' + (cx - 7) + ',160 ' + (cx + 7) + ',160" fill="#ffc08a"/>';
    s += '<text x="180" y="194" font-size="9.5" text-anchor="middle" fill="#9aa">' + caption + '</text>';
    s += '</svg>';
    return s;
  }

  window.SIMS["context_switch"] = {
    title: "컨텍스트 스위치 (timer interrupt → A에서 B로)",
    desc: "레지스터가 '두 번' 저장된다는 것이 핵심입니다. 하드웨어는 trapframe/커널 스택에, 소프트웨어(swtch)는 proc 구조체에 저장합니다.",
    options: [],
    build: function () {
      var st = {
        "mode": "user",
        "pc": "A 의 유저 코드",
        "sp": "A 의 user stack",
        "ra": "—",
        "s0": "A 의 프레임 포인터",
        "k-stack(A)": "(비어 있음)",
        "k-stack(B)": "B 의 유저 문맥 + scheduler 프레임",
        "A.context.ra": "—",
        "A.context.sp": "—",
        "B.context.ra": "forkret/sched 복귀점",
        "B.context.sp": "k-stack(B) 중간"
      };
      var steps = [];
      function snap() { var o = {}; for (var k in st) o[k] = st[k]; return o; }
      function push(desc, pc, owner, caption, note) {
        steps.push({
          desc: desc,
          pc: { proto: (pc.proto == null ? null : pc.proto), swtch: (pc.swtch == null ? null : pc.swtch) },
          vars: snap(),
          status: {
            proto: st.mode === "user" ? "user mode" : "kernel mode",
            swtch: (pc.swtch != null) ? "running" : "—"
          },
          note: note || undefined,
          svg: twoColSvg(st, owner, caption)
        });
      }

      push("프로세스 A 가 user mode 에서 자기 코드를 돌고 있습니다. " +
           "'''이 순간 OS 는 CPU 에서 실행되고 있지 않습니다''' — 그럼 OS 는 어떻게 다시 제어권을 가져올까요? (4강 p.25)",
           { proto: 1 }, "A", "A 실행 중 (user mode)");

      push("&#9200; '''timer interrupt''' 발생. 부팅 때 OS 가 타이머를 켜 두었기 때문에 " +
           "수 ms 마다 하드웨어가 강제로 끼어듭니다. 이것이 [[비협력적 방식]] 이고, " +
           "[[협력적 방식]](yield 를 기다리기)과 달리 '''무한 루프에 빠진 프로세스도 잡을 수 있습니다'''.",
           { proto: 2 }, "A", "하드웨어가 A 를 정지",
           "[[협력적 방식]] 만 쓰던 초기 Macintosh / Xerox Alto 에서는 프로세스가 무한 루프에 빠지면 재부팅밖에 답이 없었습니다. (4강 p.26)");

      st["k-stack(A)"] = "A 의 유저 문맥 (pc, sp, flags, 범용 레지스터)";
      push("&#9312; 하드웨어가 A 의 유저 레지스터를 '''[[커널 스택]](A)''' 에 저장합니다. " +
           "(xv6-riscv 에서는 [[trapframe]] 에 저장) — 소프트웨어가 개입하기 '''전'''에 하드웨어가 자동으로 하는 일입니다.",
           { proto: 3 }, "A", "① HW: 유저 레지스터 → k-stack(A)");

      st["mode"] = "kernel";
      st["sp"] = "k-stack(A)";
      push("모드를 kernel 로 올리고, [[스택 포인터]] 를 A 의 커널 스택으로 바꿉니다.", { proto: 4 }, "A", "커널 모드 진입");

      st["pc"] = "trap handler (usertrap)";
      push("[[트랩 테이블]] 에 등록해 둔 타이머 핸들러로 점프. 이제 OS 가 다시 CPU 를 쥐었습니다.",
           { proto: 5 }, "A", "trap handler 실행");

      push("[[usertrap]]() 이 원인을 확인하고 ([[which_dev]] == 2) [[yield]]() 를 호출합니다. " +
           "[[스케줄러]] 가 '''계속 A 를 돌릴지, 바꿀지''' 결정합니다. 여기서는 B 로 바꾸기로 했습니다. (4강 p.28)",
           { proto: 6 }, "A", "스케줄링 결정");

      st["pc"] = "swtch()";
      st["ra"] = "sched() 안의 복귀 지점";
      push("&#9313; `swtch(&A->context, &B->context)` 호출 — '''[[컨텍스트 스위치]]''' 의 실체는 " +
           "어셈블리 수십 줄입니다. (4강 p.29~30)",
           { proto: 7, swtch: 3 }, "A", "② swtch() 호출");

      st["A.context.ra"] = "sched() 안의 복귀 지점";
      push("&#9314; `sd ra, 0(a0)` — A 의 복귀 주소를 '''proc-struct(A).context''' 에 저장합니다. " +
           "이것이 '''두 번째 저장'''입니다. 첫 번째(하드웨어→[[커널 스택]])는 '''유저''' 레지스터, " +
           "이번(소프트웨어→proc 구조체)은 '''커널''' 레지스터입니다.",
           { proto: 8, swtch: 4 }, "A", "③ SW: 커널 레지스터 → proc(A)",
           "시험 단골 구분: 하드웨어가 저장하는 것 = 유저 문맥([[trapframe]]/커널 스택), swtch 가 저장하는 것 = 커널 문맥(struct context, callee-saved 14개). 둘을 섞어 쓰면 틀립니다.");

      st["A.context.sp"] = "k-stack(A) 중간";
      push("`sd sp, 8(a0)` — A 의 커널 [[스택 포인터]] 도 저장. 나중에 A 가 다시 뽑히면 " +
           "'''이 커널 스택 위치에서''' 이어서 돌아야 합니다.",
           { proto: 8, swtch: 5 }, "A", "③ SW: sp 저장");

      push("`sd s0, 16(a0)` … s1~s11 까지. struct context 에는 '''callee-saved 레지스터만''' 들어갑니다. " +
           "caller-saved 는 이미 C 컴파일러가 스택에 밀어 넣었기 때문입니다.",
           { proto: 8, swtch: 6 }, "A", "③ SW: s0~s11 저장");

      st["ra"] = "forkret/sched 복귀점";
      push("&#9315; `ld ra, 0(a1)` — 이번엔 '''B''' 의 문맥을 proc-struct(B) 에서 꺼내 옵니다. " +
           "ra 가 바뀌었으므로 이 함수의 `ret` 은 '''B 가 마지막에 멈췄던 커널 코드'''로 돌아갑니다.",
           { proto: 9, swtch: 9 }, "sched", "④ SW: proc(B) → 레지스터");

      st["sp"] = "k-stack(B)";
      push("&#9316; `ld sp, 8(a1)` — [[스택 포인터]] 가 '''k-stack(B)''' 로 바뀌는 순간, " +
           "CPU 는 사실상 B 의 커널 문맥 위에 올라탄 것입니다. " +
           "swtch 안에서 '''어느 프로세스인지가 바뀌는''' 지점이 바로 여기입니다.",
           { proto: 10, swtch: 10 }, "B", "⑤ 커널 스택 교체");

      st["s0"] = "B 의 프레임 포인터";
      push("`ld s0, 16(a1)` … s11 까지 복원.", { proto: 10, swtch: 11 }, "B", "⑤ s0~s11 복원");

      st["pc"] = "B 의 커널 코드 (sched 복귀점)";
      push("`ret` — ra 가 B 의 것이므로 '''B 의 커널 코드'''로 돌아갑니다. " +
           "함수 하나 들어갔는데 '''나올 때는 다른 프로세스''' 라는 점이 swtch 의 묘미입니다.",
           { proto: 10, swtch: 13 }, "B", "swtch 에서 B 로 나옴");

      push("B 의 [[usertrapret]] 이 [[return-from-trap]] 을 준비합니다.", { proto: 11 }, "B", "복귀 준비");

      st["k-stack(B)"] = "(비워짐 — 레지스터로 복원됨)";
      push("&#9317; 하드웨어가 k-stack(B) ([[trapframe]]) 에서 B 의 '''유저''' 레지스터를 되돌립니다.",
           { proto: 12 }, "B", "⑥ HW: k-stack(B) → 레지스터");

      st["mode"] = "user";
      st["sp"] = "B 의 user stack";
      push("[[sret]] 로 모드를 user 로 낮춥니다.", { proto: 13 }, "B", "user mode 복귀");

      st["pc"] = "B 의 유저 코드";
      push("pc = B 의 [[epc]] 로 점프. B 는 '''자기가 멈췄던 자리''' 에서 아무 일 없었던 듯 이어집니다.",
           { proto: 14 }, "B", "B 의 PC 로 점프");

      push("프로세스 B 실행 중. 1996 년 200MHz P6 기준 [[컨텍스트 스위치]] 는 약 6 마이크로초, " +
           "시스템 콜은 약 4 마이크로초였습니다. (4강 p.34)",
           { proto: 15 }, "B", "B 실행 중 (user mode)");

      return {
        panels: [
          { id: "proto", title: "LDE 프로토콜 (timer interrupt)", lang: "txt", lines: PROTO },
          { id: "swtch", title: "xv6 kernel/swtch.S", lang: "asm", lines: SWTCH }
        ],
        vars: [
          { name: "mode", group: "CPU" },
          { name: "pc",   group: "CPU" },
          { name: "sp",   group: "CPU" },
          { name: "ra",   group: "CPU" },
          { name: "s0",   group: "CPU" },
          { name: "k-stack(A)", group: "커널 스택" },
          { name: "k-stack(B)", group: "커널 스택" },
          { name: "A.context.ra", group: "proc-struct(A).context" },
          { name: "A.context.sp", group: "proc-struct(A).context" },
          { name: "B.context.ra", group: "proc-struct(B).context" },
          { name: "B.context.sp", group: "proc-struct(B).context" }
        ],
        steps: steps
      };
    }
  };
})();
