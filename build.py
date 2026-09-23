#!/usr/bin/env python3
"""운체위키 빌드 — src/* 를 단일 index.html 로 묶는다.

사용:  python3 build.py [--slides <슬라이드 PNG 디렉터리>]

하는 일
  1. src/articles/*.wiki 를 파일명 순으로 읽어 ARTICLES JS 객체 생성
  2. category 첫 항목 기준으로 NAV_ORDER 생성 (등장 순서 유지)
  3. head.html + ARTICLES + NAV_ORDER + sims/_engine.js + sims/*.js + renderer.js 연결
  4. 본문이 참조한 [[img:NAME]] 만 슬라이드 디렉터리에서 images/ 로 복사
  5. 깨진 [[링크]] 와 없는 [[sim:]] 을 경고로 출력

헤더가 망가진 경우에만 exit 1, 그 밖의 경고는 exit 0.
"""

import json
import os
import re
import shutil
import sys

ROOT = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(ROOT, "src")
ARTICLES_DIR = os.path.join(SRC, "articles")
SIMS_DIR = os.path.join(SRC, "sims")
IMAGES_DIR = os.path.join(ROOT, "images")
OUT = os.path.join(ROOT, "index.html")

DEFAULT_SLIDES = (
    "/private/tmp/claude-501/"
    "-Users-jangminjun-Library-CloudStorage-OneDrive---------Onedrive--03--Academic-Backup-----3-2-------/"
    "96ceee28-231f-4e7d-9c18-6b6ed12a7a3e/scratchpad/slides"
)

# caption 에 ']' 가 들어갈 수 있으므로 (예: prio_to_weight[40]) 줄 단위로 lazy 매칭한다.
IMG_RE = re.compile(r"\[\[img:([^\|\]\n]+)(?:\|[^\n]*?)?(?:\|(?:small|medium|large))?\]\]")
SIM_RE = re.compile(r"\[\[sim:([^\|\]]+)\]\]")
LINK_RE = re.compile(r"\[\[([^\]]+)\]\]")
REQUIRED_KEYS = ("key", "title", "category")


def fail(msg):
    print("ERROR: %s" % msg, file=sys.stderr)
    sys.exit(1)


def parse_article(path):
    """{key,title,category[],body} 를 돌려준다. 헤더가 망가지면 즉시 종료."""
    name = os.path.basename(path)
    with open(path, encoding="utf-8") as f:
        text = f.read()

    lines = text.split("\n")
    header = {}
    body_start = None
    for i, line in enumerate(lines):
        if line.strip() == "---":
            body_start = i + 1
            break
        if line.strip() == "":
            continue
        if ":" not in line:
            fail("%s: 헤더 %d번 줄이 'key: value' 형식이 아님 → %r" % (name, i + 1, line))
        k, v = line.split(":", 1)
        header[k.strip()] = v.strip()

    if body_start is None:
        fail("%s: 헤더를 닫는 '---' 줄이 없음" % name)
    for k in REQUIRED_KEYS:
        if not header.get(k):
            fail("%s: 헤더에 '%s' 가 없거나 비어 있음" % (name, k))

    cats = [c.strip() for c in header["category"].split(",") if c.strip()]
    if not cats:
        fail("%s: category 가 비어 있음" % name)

    return {
        "file": name,
        "key": header["key"],
        "title": header["title"],
        "category": cats,
        "body": "\n".join(lines[body_start:]).strip("\n"),
    }


def js_json(obj):
    """JS <script> 안에 넣어도 안전한 JSON 리터럴."""
    s = json.dumps(obj, ensure_ascii=False, indent=1)
    return s.replace("</", "<\\/").replace("\u2028", "\\u2028").replace("\u2029", "\\u2029")


def main():
    slides_dir = DEFAULT_SLIDES
    argv = sys.argv[1:]
    if "--slides" in argv:
        slides_dir = argv[argv.index("--slides") + 1]

    if not os.path.isdir(SRC):
        fail("src/ 디렉터리가 없습니다: %s" % SRC)
    os.makedirs(ARTICLES_DIR, exist_ok=True)

    # ---------- 1. 문서 ----------
    files = sorted(f for f in os.listdir(ARTICLES_DIR) if f.endswith(".wiki"))
    arts = [parse_article(os.path.join(ARTICLES_DIR, f)) for f in files]

    articles = {}
    for a in arts:
        if a["key"] in articles:
            print("WARN: 중복 key '%s' (%s) — 나중 파일이 덮어씁니다." % (a["key"], a["file"]))
        articles[a["key"]] = {
            "title": a["title"],
            "category": a["category"],
            "body": a["body"],
        }

    # ---------- 2. NAV_ORDER ----------
    nav = []
    index = {}
    for a in arts:
        g = a["category"][0]
        if g not in index:
            index[g] = len(nav)
            nav.append({"group": g, "items": []})
        nav[index[g]]["items"].append(a["key"])

    # ---------- 3. 이미지 ----------
    os.makedirs(IMAGES_DIR, exist_ok=True)
    wanted = {}
    for a in arts:
        for m in IMG_RE.finditer(a["body"]):
            wanted.setdefault(m.group(1).strip(), set()).add(a["file"])

    copied, missing_imgs = 0, []
    for fname in sorted(wanted):
        src = os.path.join(slides_dir, fname)
        dst = os.path.join(IMAGES_DIR, fname)
        if os.path.isfile(src):
            if (not os.path.exists(dst)) or os.path.getmtime(src) > os.path.getmtime(dst):
                shutil.copy2(src, dst)
            copied += 1
        else:
            missing_imgs.append((fname, sorted(wanted[fname])))

    # ---------- 4. 링크 / sim 검사 ----------
    broken = {}
    for a in arts:
        for m in LINK_RE.finditer(a["body"]):
            raw = m.group(1)
            if raw.startswith("img:") or raw.startswith("sim:"):
                continue
            key = raw.split("|", 1)[0].strip()
            if key and key not in articles:
                broken.setdefault(key, set()).add(a["file"])

    sim_files = sorted(
        f for f in os.listdir(SIMS_DIR) if f.endswith(".js") and f != "_engine.js"
    ) if os.path.isdir(SIMS_DIR) else []

    defined_sims = set()
    for f in sim_files:
        with open(os.path.join(SIMS_DIR, f), encoding="utf-8") as fh:
            for m in re.finditer(r"""SIMS\[\s*["']([^"']+)["']\s*\]\s*=""", fh.read()):
                defined_sims.add(m.group(1))

    used_sims = {}
    for a in arts:
        for m in SIM_RE.finditer(a["body"]):
            used_sims.setdefault(m.group(1).strip(), set()).add(a["file"])
    missing_sims = {k: v for k, v in used_sims.items() if k not in defined_sims}

    # ---------- 5. 조립 ----------
    def read(p):
        with open(p, encoding="utf-8") as f:
            return f.read()

    head = read(os.path.join(SRC, "head.html"))
    engine = read(os.path.join(SIMS_DIR, "_engine.js")) if os.path.isfile(os.path.join(SIMS_DIR, "_engine.js")) else ""
    renderer = read(os.path.join(SRC, "renderer.js"))

    parts = [head, "\n<script>\n"]
    parts.append("// ===== 문서 데이터 (build.py 생성) =====\n")
    parts.append("const ARTICLES = " + js_json(articles) + ";\n")
    parts.append("const NAV_ORDER = " + js_json(nav) + ";\n")
    parts.append("\n// ===== SimEngine =====\n")
    parts.append(engine)
    for f in sim_files:
        parts.append("\n// ===== sims/%s =====\n" % f)
        parts.append(read(os.path.join(SIMS_DIR, f)))
    parts.append("\n// ===== renderer =====\n")
    parts.append(renderer)
    parts.append("\n</script>\n</body>\n</html>\n")

    with open(OUT, "w", encoding="utf-8") as f:
        f.write("".join(parts))

    # ---------- 6. 보고 ----------
    if missing_imgs:
        print("\n=== MISSING IMAGES (%d) ===" % len(missing_imgs))
        for fname, refs in missing_imgs:
            print("  %s  ← %s" % (fname, ", ".join(refs)))
        print("  (슬라이드 디렉터리: %s)" % slides_dir)

    if broken:
        print("\n=== BROKEN LINKS (%d) ===" % len(broken))
        for key in sorted(broken):
            print("  [[%s]]  ← %s" % (key, ", ".join(sorted(broken[key]))))

    if missing_sims:
        print("\n=== MISSING SIMS (%d) ===" % len(missing_sims))
        for key in sorted(missing_sims):
            print("  [[sim:%s]]  ← %s  (src/sims/%s.js 없음)"
                  % (key, ", ".join(sorted(missing_sims[key])), key))

    size_kb = os.path.getsize(OUT) / 1024.0
    print("\n=== BUILD OK ===")
    print("  articles      : %d  (nav groups %d)" % (len(articles), len(nav)))
    print("  images copied : %d  (missing %d)" % (copied, len(missing_imgs)))
    print("  sims          : %d  (missing %d)" % (len(defined_sims), len(missing_sims)))
    print("  broken links  : %d" % len(broken))
    print("  output        : %s  (%.0f KB)" % (os.path.relpath(OUT, ROOT), size_kb))
    sys.exit(0)


if __name__ == "__main__":
    main()
