// ============================================================
// SimEngine — 단계별 시뮬레이터 공용 실행기 (CONTRACT §6)
// 순수 DOM. 외부 라이브러리 없음.
// 각 sim 파일은 SIMS["이름"] = { title, desc, options, build(opts) } 만 제공.
// ============================================================
(function (global) {
  "use strict";

  global.SIMS = global.SIMS || {};

  var SPEEDS = [
    { value: "500", label: "0.5초" },
    { value: "1000", label: "1초" },
    { value: "2000", label: "2초" }
  ];

  // 마지막으로 클릭/포커스된 sim 인스턴스 (키보드 ← → 대상)
  var focused = null;
  var keyboardBound = false;

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined && text !== null) n.textContent = String(text);
    return n;
  }

  function fmtValue(v) {
    if (v === null || v === undefined) return "–";
    if (Array.isArray(v)) return "[" + v.map(fmtValue).join(", ") + "]";
    if (typeof v === "boolean") return v ? "true" : "false";
    return String(v);
  }

  function sameValue(a, b) {
    return fmtValue(a) === fmtValue(b);
  }

  // 설명 문자열을 인라인 위키 문법으로 렌더 (renderer.js 의 inlineFormat 재사용)
  function fmtDesc(s) {
    if (s === undefined || s === null) s = "";
    if (typeof global.inlineFormat === "function") {
      try { return global.inlineFormat(String(s)); } catch (e) { /* fall through */ }
    }
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function bindKeyboard() {
    if (keyboardBound) return;
    keyboardBound = true;
    document.addEventListener("keydown", function (e) {
      if (!focused || !focused.root || !focused.root.isConnected) return;
      var t = e.target;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT")) {
        if (t.className !== "sim-range") return;
      }
      if (e.key === "ArrowLeft") { focused.go(focused.idx - 1); e.preventDefault(); }
      else if (e.key === "ArrowRight") { focused.go(focused.idx + 1); e.preventDefault(); }
    });
  }

  // ------------------------------------------------------------
  // 인스턴스
  // ------------------------------------------------------------
  function Sim(root, name, spec) {
    this.root = root;
    this.name = name;
    this.spec = spec;
    this.opts = {};
    this.idx = 0;
    this.trace = null;
    this.timer = null;
    this.speed = 1000;
    this.lineNodes = {};   // panelId -> [lineEl]
    this.panelNodes = {};  // panelId -> { wrap, code, badge }
  }

  Sim.prototype.defaultOpts = function () {
    var o = {};
    (this.spec.options || []).forEach(function (opt) {
      if (opt.values && opt.values.length) o[opt.key] = opt.values[0].value;
    });
    return o;
  };

  Sim.prototype.render = function () {
    var self = this;
    var spec = this.spec;
    var root = this.root;
    root.innerHTML = "";
    root.classList.add("sim");
    if (!root.hasAttribute("tabindex")) root.setAttribute("tabindex", "0");

    root.addEventListener("mousedown", function () { focused = self; });
    root.addEventListener("focusin", function () { focused = self; });

    // 헤더
    var head = el("div", "sim-head");
    head.appendChild(el("div", "sim-title", spec.title || this.name));
    if (spec.desc) {
      var sub = el("div", "sim-subtitle");
      sub.innerHTML = fmtDesc(spec.desc);   // [[링크]] 등 인라인 위키 문법 허용
      head.appendChild(sub);
    }
    root.appendChild(head);

    var body = el("div", "sim-body");
    root.appendChild(body);

    // 옵션
    if (spec.options && spec.options.length) {
      var optBar = el("div", "sim-opts");
      spec.options.forEach(function (opt) {
        var wrap = el("span", "sim-opt");
        var lab = el("label", null, opt.label || opt.key);
        lab.setAttribute("for", "");
        wrap.appendChild(lab);
        var sel = el("select");
        (opt.values || []).forEach(function (v) {
          var o = el("option", null, v.label !== undefined ? v.label : v.value);
          o.value = v.value;
          sel.appendChild(o);
        });
        sel.value = self.opts[opt.key];
        sel.addEventListener("change", function () {
          self.opts[opt.key] = sel.value;
          self.stop();
          self.rebuild();
          self.go(0);
        });
        wrap.appendChild(sel);
        optBar.appendChild(wrap);
      });
      body.appendChild(optBar);
    }

    // 컨트롤
    var ctrl = el("div", "sim-ctrl");
    this.btnFirst = el("button", "sim-btn", "⏮");
    this.btnPrev = el("button", "sim-btn", "◀");
    this.btnNext = el("button", "sim-btn", "▶");
    this.btnLast = el("button", "sim-btn", "⏭");
    this.btnPlay = el("button", "sim-btn", "▶ 자동");
    [this.btnFirst, this.btnPrev, this.btnNext, this.btnLast, this.btnPlay].forEach(function (b) {
      b.type = "button";
      ctrl.appendChild(b);
    });
    this.btnFirst.title = "처음";
    this.btnPrev.title = "이전 (←)";
    this.btnNext.title = "다음 (→)";
    this.btnLast.title = "마지막";

    var speedSel = el("select", "sim-speed");
    SPEEDS.forEach(function (s) {
      var o = el("option", null, s.label);
      o.value = s.value;
      speedSel.appendChild(o);
    });
    speedSel.value = String(this.speed);
    speedSel.addEventListener("change", function () {
      self.speed = parseInt(speedSel.value, 10) || 1000;
      if (self.timer) { self.stop(); self.play(); }
    });
    ctrl.appendChild(speedSel);

    this.range = el("input", "sim-range");
    this.range.type = "range";
    this.range.min = "0";
    this.range.step = "1";
    this.range.addEventListener("input", function () {
      self.stop();
      self.go(parseInt(self.range.value, 10) || 0);
    });
    ctrl.appendChild(this.range);

    this.counter = el("span", "sim-count", "0 / 0");
    ctrl.appendChild(this.counter);
    body.appendChild(ctrl);

    this.btnFirst.addEventListener("click", function () { self.stop(); self.go(0); });
    this.btnPrev.addEventListener("click", function () { self.stop(); self.go(self.idx - 1); });
    this.btnNext.addEventListener("click", function () { self.stop(); self.go(self.idx + 1); });
    this.btnLast.addEventListener("click", function () { self.stop(); self.go(self.trace.steps.length - 1); });
    this.btnPlay.addEventListener("click", function () { self.timer ? self.stop() : self.play(); });

    // 동적 영역
    this.panelsBox = el("div", "sim-panels");
    body.appendChild(this.panelsBox);
    this.varsBox = el("div", "sim-varsbox");
    body.appendChild(this.varsBox);
    this.descBox = el("div", "sim-descbox");
    body.appendChild(this.descBox);
    this.noteBox = el("div", "sim-note");
    this.noteBox.style.display = "none";
    body.appendChild(this.noteBox);
    this.svgBox = el("div", "sim-svgbox");
    body.appendChild(this.svgBox);
    var hint = el("div", "sim-hint", "클릭 후 ← → 키로 단계 이동");
    body.appendChild(hint);
  };

  Sim.prototype.rebuild = function () {
    this.trace = this.spec.build(JSON.parse(JSON.stringify(this.opts))) || { panels: [], vars: [], steps: [] };
    this.trace.panels = this.trace.panels || [];
    this.trace.vars = this.trace.vars || [];
    this.trace.steps = this.trace.steps || [];
    this.buildPanels();
    this.buildVars();
    this.range.max = String(Math.max(0, this.trace.steps.length - 1));
  };

  Sim.prototype.buildPanels = function () {
    var self = this;
    this.panelsBox.innerHTML = "";
    this.lineNodes = {};
    this.panelNodes = {};
    this.trace.panels.forEach(function (p) {
      var wrap = el("div", "sim-panel");
      var ph = el("div", "sim-panel-head");
      ph.appendChild(el("span", null, p.title || p.id));
      var badge = el("span", "sim-badge", "");
      badge.style.display = "none";
      ph.appendChild(badge);
      wrap.appendChild(ph);

      var code = el("div", "sim-code");
      var nodes = [];
      (p.lines || []).forEach(function (src, i) {
        var ln = el("div", "sim-line");
        var mark = el("span", "sim-mark", " ");
        var num = el("span", "sim-ln", String(i + 1));
        var txt = el("span", "sim-src", src);
        ln.appendChild(mark);
        ln.appendChild(num);
        ln.appendChild(txt);
        code.appendChild(ln);
        nodes.push(ln);
      });
      wrap.appendChild(code);
      self.panelsBox.appendChild(wrap);
      self.lineNodes[p.id] = nodes;
      self.panelNodes[p.id] = { wrap: wrap, code: code, badge: badge };
    });
  };

  Sim.prototype.buildVars = function () {
    var self = this;
    this.varsBox.innerHTML = "";
    if (!this.trace.vars.length) return;
    var table = el("table", "sim-vars");
    var lastGroup = null;
    this.varCells = {};
    this.trace.vars.forEach(function (v) {
      var g = v.group || "";
      if (g !== lastGroup) {
        lastGroup = g;
        if (g) {
          var gr = el("tr", "sim-group");
          var gth = el("th", null, g);
          gth.colSpan = 2;
          gr.appendChild(gth);
          table.appendChild(gr);
        }
      }
      var tr = el("tr");
      tr.appendChild(el("th", null, v.label || v.name));
      var td = el("td");
      tr.appendChild(td);
      table.appendChild(tr);
      self.varCells[v.name] = td;
    });
    this.varsBox.appendChild(table);
  };

  Sim.prototype.go = function (i) {
    var steps = this.trace.steps;
    if (!steps.length) return;
    if (i < 0) i = 0;
    if (i > steps.length - 1) i = steps.length - 1;
    this.idx = i;
    this.paint();
  };

  Sim.prototype.paint = function () {
    var self = this;
    var steps = this.trace.steps;
    var step = steps[this.idx] || {};
    var prev = this.idx > 0 ? steps[this.idx - 1] : null;

    // 코드 패널
    this.trace.panels.forEach(function (p) {
      var nodes = self.lineNodes[p.id] || [];
      var pc = step.pc ? step.pc[p.id] : null;
      nodes.forEach(function (n, i) {
        var isCur = (pc !== null && pc !== undefined && i === pc - 1);
        n.classList.toggle("cur", isCur);
        n.querySelector(".sim-mark").textContent = isCur ? "▶" : " ";
      });
      if (pc !== null && pc !== undefined && nodes[pc - 1]) {
        var box = self.panelNodes[p.id].code;
        var node = nodes[pc - 1];
        var top = node.offsetTop - box.clientHeight / 2 + node.offsetHeight / 2;
        box.scrollTop = Math.max(0, top);
      }
      var badge = self.panelNodes[p.id].badge;
      var st = step.status ? step.status[p.id] : null;
      if (st) {
        badge.style.display = "";
        badge.textContent = st;
        badge.className = "sim-badge " + String(st).toLowerCase().replace(/[^a-z0-9]+/g, "-");
      } else {
        badge.style.display = "none";
      }
    });

    // 변수표
    if (this.varCells) {
      this.trace.vars.forEach(function (v) {
        var td = self.varCells[v.name];
        if (!td) return;
        var cur = step.vars ? step.vars[v.name] : undefined;
        var old = prev && prev.vars ? prev.vars[v.name] : undefined;
        td.innerHTML = "";
        var changed = prev && !sameValue(cur, old);
        td.classList.toggle("changed", !!changed);
        if (changed) {
          var p = el("span", "sim-prev", fmtValue(old) + "→");
          td.appendChild(p);
        }
        td.appendChild(document.createTextNode(fmtValue(cur)));
      });
    }

    // 설명
    this.descBox.innerHTML =
      '<span class="sim-stepno">' + (this.idx + 1) + ".</span>" + fmtDesc(step.desc);

    // note
    if (step.note) {
      this.noteBox.style.display = "";
      this.noteBox.innerHTML = fmtDesc(step.note);
    } else {
      this.noteBox.style.display = "none";
      this.noteBox.innerHTML = "";
    }

    // svg
    var svg = step.svg;
    if (typeof svg === "function") {
      try { svg = svg(step, this.idx, this.trace); } catch (e) { svg = null; }
    }
    this.svgBox.innerHTML = svg ? String(svg) : "";

    // 컨트롤 상태
    this.counter.textContent = (this.idx + 1) + " / " + steps.length;
    this.range.value = String(this.idx);
    this.btnFirst.disabled = this.btnPrev.disabled = (this.idx === 0);
    this.btnNext.disabled = this.btnLast.disabled = (this.idx === steps.length - 1);
  };

  Sim.prototype.play = function () {
    var self = this;
    if (this.timer) return;
    if (this.idx >= this.trace.steps.length - 1) this.go(0);
    this.btnPlay.classList.add("playing");
    this.btnPlay.textContent = "⏸ 정지";
    this.timer = setInterval(function () {
      if (self.idx >= self.trace.steps.length - 1) { self.stop(); return; }
      self.go(self.idx + 1);
    }, this.speed);
  };

  Sim.prototype.stop = function () {
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
    if (this.btnPlay) {
      this.btnPlay.classList.remove("playing");
      this.btnPlay.textContent = "▶ 자동";
    }
  };

  // ------------------------------------------------------------
  // public
  // ------------------------------------------------------------
  var SimEngine = {
    mount: function (container, name) {
      var spec = global.SIMS[name];
      if (!spec || typeof spec.build !== "function") {
        container.className = "sim-missing";
        container.textContent = "시뮬레이터 없음: " + name;
        return null;
      }
      var sim = new Sim(container, name, spec);
      sim.opts = sim.defaultOpts();
      sim.render();
      sim.rebuild();
      sim.go(0);
      bindKeyboard();
      return sim;
    },
    mountAll: function (scope) {
      var out = [];
      (scope || document).querySelectorAll(".sim[data-sim]").forEach(function (node) {
        out.push(SimEngine.mount(node, node.getAttribute("data-sim")));
      });
      return out;
    }
  };

  global.SimEngine = SimEngine;
})(typeof window !== "undefined" ? window : globalThis);
