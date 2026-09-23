# 운체위키 (OS Wiki)

DGIST **CSE304 운영체제** (Prof. Yongwoo Lee, OSTEP) 중간고사·퀴즈·과제1 범위를 나무위키 스타일로 정리한 단일 페이지 위키.
코드가 나오는 곳마다 **C 디버거처럼 한 단계씩 변수 변화를 보는 시뮬레이터**가 붙어 있고, 모든 변수·용어는 사전 문서로 하이퍼링크된다.

**라이브**: https://ggoljunsa.github.io/os-wiki/

## 범위

1. Intro / What is OS — 가상화·동시성·영속성
2. From Program to Process — fork/exec/wait, struct proc, 시스템 콜 추가
3. Limited Direct Execution — trap, trapframe, epc/sepc, timer interrupt, context switch
4. **Assignment 1 (xv6 alarm)** — sigalarm/sigreturn, alarm_saved, a0 복원, 재진입 금지 + **퀴즈1 복기**
5. Process Scheduling — FIFO/SJF/STCF/RR/MLFQ
6. Proportional Share — Lottery/Stride/CFS/EEVDF
7. Multi-CPU Scheduling — cache affinity, SQMS/MQMS, work stealing
8. Concurrency — thread, TCB, race condition, counter 예제
9. Lock — flag → test-and-set → CAS/LL-SC → ticket → park/unpark → futex

## 구조

```
.
├── index.html        # 생성물 (단일 HTML — CSS/JS/문서/시뮬레이터 전부 인라인)
├── images/           # 참조된 강의 슬라이드 캡처
├── build.py          # src/ → index.html (슬라이드 PNG 원본은 _slides/, git 제외)
└── src/
    ├── CONTRACT.md   # 문법·문서 키·시뮬레이터 API 규약
    ├── head.html     # CSS + 레이아웃
    ├── renderer.js   # 위키 문법 렌더러
    ├── sims/         # _engine.js + 시뮬레이터 (순수 데이터 + build())
    └── articles/     # 문서 (.wiki, 파일당 1문서)
```

## 빌드

```sh
python3 build.py        # index.html 재생성, 깨진 링크/누락 이미지 보고
node src/test_sims.js   # 시뮬레이터 자동 검사
node src/test_render.js index.html   # 142개 문서 전수 렌더 → 원시 마크업 잔존 검사
```

문서 편집은 `src/articles/*.wiki`, 문법은 `src/CONTRACT.md` 참고.

## 출처

강의 슬라이드 이미지는 DGIST CSE304 (Prof. Yongwoo Lee) 강의 자료의 캡처이며 교육 목적의 학습 정리용이다. 학습 목적 비상업적 사용. 저작권은 원저작자에게 있다.
