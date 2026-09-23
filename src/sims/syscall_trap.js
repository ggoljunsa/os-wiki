// syscall_trap — user → ecall → uservec → usertrap → syscall → usertrapret → sret 왕복
// 출처: 4-Limited_Direct_Execution.pdf p.14~23, 3-From_Program_to_Process.pdf (시스템 콜 추가 절차), xv6-riscv
window.SIMS = window.SIMS || {};

(function () {
  var USER = [
    "// user/xxx.c — 평범한 C 한 줄",
    "int n = read(fd, buf, 10);",
    "",
    "// user/usys.S  (usys.pl 이 자동 생성)",
    "read:",
    "    li   a7, SYS_read    # 시스템 콜 번호를 a7 에",
    "    ecall                # user → kernel 트랩",
    "    ret                  # a0 = 커널이 돌려준 값"
  ];

  var KERNEL = [
    "# kernel/trampoline.S",
    "uservec:",
    "    csrrw a0, sscratch, a0      # TRAPFRAME 주소를 a0 로",
    "    sd ra,40(a0) ... sd t6,280(a0)   # 유저 레지스터 전부 저장",
    "    ld sp, 8(a0)                # 커널 스택으로 교체",
    "    jr t0                       # → usertrap()",
    "",
    "void usertrap(void) {",
    "  // ...",
    "  p->trapframe->epc = r_sepc();   // 유저 PC 보관",
    "  if (r_scause() == 8) {          // 8 = ecall from U-mode",
    "    p->trapframe->epc += 4;       // ecall '다음' 명령어로",
    "    intr_on();",
    "    syscall();",
    "  }",
    "  usertrapret();",
    "}",
    "",
    "void syscall(void) {",
    "  int num = p->trapframe->a7;",
    "  p->trapframe->a0 = syscalls[num]();   // 반환값을 a0 에",
    "}",
    "",
    "void usertrapret(void) {",
    "  w_sepc(p->trapframe->epc);      // 돌아갈 주소 지정",
    "  // userret: trapframe 에서 유저 레지스터 복원",
    "  //   sret  : kernel → user, pc = sepc",
    "}"
  ];

  function modeSvg(mode, label) {
    var uOn = (mode === "user");
    var s = '<svg viewBox="0 0 360 132" width="100%" style="max-width:360px">';
    s += '<rect x="8" y="10" width="160" height="52" rx="6" fill="' + (uOn ? "#2f6da8" : "#39404a") +
         '" stroke="' + (uOn ? "#7fc0ff" : "#555") + '"/>';
    s += '<text x="88" y="33" font-size="12" text-anchor="middle" fill="#fff">user mode</text>';
    s += '<text x="88" y="50" font-size="10" text-anchor="middle" fill="#cfd8e3">특권 명령 불가</text>';
    s += '<rect x="192" y="10" width="160" height="52" rx="6" fill="' + (!uOn ? "#a8642f" : "#39404a") +
         '" stroke="' + (!uOn ? "#ffc08a" : "#555") + '"/>';
    s += '<text x="272" y="33" font-size="12" text-anchor="middle" fill="#fff">kernel mode</text>';
    s += '<text x="272" y="50" font-size="10" text-anchor="middle" fill="#f0dcc8">하드웨어 전부 접근</text>';
    if (uOn) {
      s += '<path d="M272 70 L272 92 L88 92 L88 70" fill="none" stroke="#7fc0ff" stroke-width="2"/>';
      s += '<polygon points="88,64 83,74 93,74" fill="#7fc0ff"/>';
    } else {
      s += '<path d="M88 70 L88 92 L272 92 L272 70" fill="none" stroke="#ffc08a" stroke-width="2"/>';
      s += '<polygon points="272,64 267,74 277,74" fill="#ffc08a"/>';
    }
    s += '<text x="180" y="110" font-size="11" text-anchor="middle" fill="#ddd">' + label + '</text>';
    s += '<text x="180" y="126" font-size="9.5" text-anchor="middle" fill="#9aa">' +
         '모드 전환은 ecall / sret 두 명령어로만 일어난다</text>';
    s += '</svg>';
    return s;
  }

  window.SIMS["syscall_trap"] = {
    title: "시스템 콜 한 바퀴 (ecall → usertrap → syscall → sret)",
    desc: "read() 한 줄이 user mode 를 떠나 커널을 돌고 정확히 제자리로 돌아오기까지, 누가 무엇을 저장하는지 따라갑니다.",
    options: [],
    build: function () {
      var st = {
        "mode": "user",
        "pc": "read+0x04 (li a7)",
        "sepc": "—",
        "scause": "—",
        "a7": "?",
        "a0": "fd (3)",
        "trapframe->epc": "—",
        "trapframe->a0": "—",
        "trapframe->a7": "—",
        "sp": "user stack"
      };
      var steps = [];
      function snap() { var o = {}; for (var k in st) o[k] = st[k]; return o; }
      function push(desc, pc, label, note) {
        steps.push({
          desc: desc,
          pc: { user: (pc.user == null ? null : pc.user), kernel: (pc.kernel == null ? null : pc.kernel) },
          vars: snap(),
          status: { user: st.mode === "user" ? "running" : "멈춤", kernel: st.mode === "user" ? "—" : "running" },
          note: note || undefined,
          svg: modeSvg(st.mode, label)
        });
      }

      push("C 코드 `read(fd, buf, 10)` 은 사실 라이브러리 스텁을 부르는 '''보통 함수 호출'''입니다. " +
           "인자 fd, buf, 10 은 관례대로 [[a0]], a1, a2 에 실려 있습니다.",
           { user: 2 }, "user mode 에서 실행 중");

      st["a7"] = "SYS_read (5)";
      push("[[usys.pl]] 이 만들어 준 스텁이 `li a7, SYS_read` 로 '''시스템 콜 번호'''를 a7 에 넣습니다. " +
           "새 시스템 콜을 추가할 때 [[시스템 콜 추가 절차|usys.pl / syscall.h / syscall.c]] 를 같이 고쳐야 하는 이유가 이것입니다.",
           { user: 6 }, "user mode 에서 실행 중");

      push("'''ecall''' — [[트랩]] 명령입니다. 이 한 명령이 ① 모드를 kernel 로 올리고 ② pc 를 [[트랩 테이블|stvec]] 이 가리키는 곳(uservec)으로 보내고 " +
           "③ '''ecall 자신의 주소'''를 [[sepc]] 에 박아 넣습니다.",
           { user: 7 }, "곧 트랩 진입");

      st["mode"] = "kernel";
      st["sepc"] = "read+0x08 (ecall)";
      st["scause"] = "8 (ecall from U-mode)";
      st["pc"] = "uservec";
      push("하드웨어가 한 일: mode=kernel, [[sepc]]=ecall 주소, scause=8, pc=uservec. " +
           "'''여기까지는 소프트웨어가 손댈 틈이 없습니다''' — 유저가 커널 진입점을 고를 수 없게 하드웨어가 강제합니다.",
           { kernel: 2 }, "하드웨어가 모드 전환", "유저가 임의의 커널 주소로 점프할 수 있다면 [[제한적 직접 실행]] 은 무너집니다. 점프 목적지는 부팅 때 커널이 stvec 에 등록한 주소뿐입니다.");

      st["trapframe->a0"] = "fd (3)";
      st["trapframe->a7"] = "SYS_read (5)";
      push("uservec 이 유저 레지스터 32 개를 전부 [[trapframe]] 에 `sd` 로 밀어 넣습니다. " +
           "여기서 a0 와 a7 도 함께 저장되므로 커널은 나중에 '''인자와 콜 번호를 trapframe 에서 읽습니다'''.",
           { kernel: 4 }, "레지스터 저장 중");

      st["sp"] = "kernel stack (p->kstack)";
      push("`ld sp, 8(a0)` — [[스택 포인터]] 를 이 프로세스 전용 [[커널 스택]] 으로 갈아탑니다. " +
           "유저 스택을 그대로 쓰면 유저가 커널 지역 변수를 들여다보거나 망가뜨릴 수 있습니다.",
           { kernel: 5 }, "커널 스택으로 전환");

      st["pc"] = "usertrap()";
      push("`jr t0` 로 C 함수 [[usertrap]]() 에 진입합니다. 이제부터는 평범한 C 코드입니다.",
           { kernel: 6 }, "kernel mode 에서 실행 중");

      st["trapframe->epc"] = "read+0x08 (ecall)";
      push("`p->trapframe->epc = r_sepc();` — [[sepc]] 는 레지스터 하나뿐이라 다음 트랩이 덮어씁니다. " +
           "그래서 프로세스마다 하나씩 있는 [[trapframe]] 에 복사해 둡니다.",
           { kernel: 10 }, "유저 PC 보관");

      push("`if (r_scause() == 8)` — 8 이면 U-mode 에서 온 [[시스템 콜]]. " +
           "타이머였다면 [[which_dev]] 가 2 로 돌아와 [[타이머 인터럽트]] 분기로 갔을 것입니다.",
           { kernel: 11 }, "트랩 원인 판별");

      st["trapframe->epc"] = "read+0x0c (ret)";
      push("'''epc += 4''' — 여기가 핵심입니다. [[sepc]] 는 ecall '''자신'''의 주소입니다. " +
           "그대로 돌아가면 ecall 을 또 실행해 무한 반복이 됩니다. RISC-V 명령은 4 바이트이므로 4 를 더해 '''다음 명령어'''로 맞춥니다.",
           { kernel: 12 }, "복귀 주소 +4",
           "page fault 같은 '''fault''' 는 반대로 4 를 더하지 않습니다. 실패한 그 명령어를 다시 실행해야 하기 때문입니다. (4강 p.12 trap vs fault)");

      push("`intr_on()` — 시스템 콜 처리 중에도 [[인터럽트]] 를 다시 허용합니다. 오래 걸리는 콜이 타이머를 막지 않도록.",
           { kernel: 13 }, "인터럽트 재허용");

      st["pc"] = "syscall()";
      push("[[xv6 시스템 콜 경로|syscall()]] 진입.", { kernel: 14 }, "kernel mode 에서 실행 중");

      push("`int num = p->trapframe->a7;` — 저장해 둔 [[trapframe]] 에서 콜 번호를 꺼냅니다. " +
           "num 은 [[트랩 테이블|syscalls[] 배열]] 의 인덱스입니다. (4강 p.19)",
           { kernel: 20 }, "콜 번호 조회");

      st["trapframe->a0"] = "10 (읽은 바이트 수)";
      push("`p->trapframe->a0 = syscalls[num]();` — sys_read() 를 실행하고 '''반환값을 trapframe 의 a0 칸에''' 씁니다. " +
           "시스템 콜의 반환값이 항상 [[a0]] 로 나오는 이유이자, [[과제1 xv6 alarm|과제1]] 에서 [[sigreturn]] 이 " +
           "`return p->trapframe->a0;` 여야 하는 이유입니다. ([[a0 복원]])",
           { kernel: 21 }, "반환값을 a0 칸에");

      st["pc"] = "usertrapret()";
      push("[[usertrapret]]() 로 돌아갈 준비를 합니다.", { kernel: 24 }, "복귀 준비");

      st["sepc"] = "read+0x0c (ret)";
      push("`w_sepc(p->trapframe->epc);` — '''돌아갈 주소를 결정하는 유일한 지점'''입니다. " +
           "만약 여기 들어가는 [[epc]] 가 다른 값이라면 유저 코드는 '''엉뚱한 곳에서 재개'''합니다. " +
           "[[과제1 xv6 alarm|과제1]] 은 바로 이 성질을 이용해 [[usertrap]] 에서 epc 를 [[alarm_handler]] 로 바꿔치기합니다.",
           { kernel: 25 }, "sepc 설정",
           "퀴즈·시험 단골: \"When a trap on the RISC-V returns to user space, what determines the instruction address at which user-space code resumes?\" → '''sepc (= trapframe->epc)'''");

      st["a0"] = "10 (읽은 바이트 수)";
      st["a7"] = "SYS_read (5)";
      st["sp"] = "user stack";
      push("userret 이 [[trapframe]] 의 값들을 실제 레지스터로 되돌립니다. a0 에는 방금 커널이 써 둔 10 이 들어옵니다. " +
           "[[스택 포인터]] 도 유저 스택으로 복귀.",
           { kernel: 26 }, "레지스터 복원");

      st["mode"] = "user";
      st["pc"] = "read+0x0c (ret)";
      push("'''sret''' — [[return-from-trap]]. 모드를 user 로 낮추고 pc = [[sepc]] 로 점프합니다. " +
           "ecall '''다음''' 명령인 `ret` 부터 재개합니다.",
           { user: 8 }, "user mode 복귀");

      st["pc"] = "int n = ... 다음 줄";
      push("스텁이 `ret` 로 C 코드에 돌아오고, a0 에 있던 10 이 `n` 에 담깁니다. " +
           "유저 입장에선 '''그냥 함수 하나 호출한 것'''처럼 보이지만 그 사이 모드 전환이 두 번 있었습니다.",
           { user: 2 }, "user mode 에서 실행 중");

      return {
        panels: [
          { id: "user",   title: "user mode", lang: "asm", lines: USER },
          { id: "kernel", title: "kernel mode (xv6-riscv)", lang: "c", lines: KERNEL }
        ],
        vars: [
          { name: "mode",   group: "CPU" },
          { name: "pc",     group: "CPU" },
          { name: "sepc",   group: "CPU" },
          { name: "scause", group: "CPU" },
          { name: "a7",     group: "CPU" },
          { name: "a0",     group: "CPU" },
          { name: "trapframe->epc", group: "trapframe" },
          { name: "trapframe->a0",  group: "trapframe" },
          { name: "trapframe->a7",  group: "trapframe" },
          { name: "sp", group: "스택" }
        ],
        steps: steps
      };
    }
  };
})();
