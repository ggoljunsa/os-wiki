// ============================================================
// AnimEngine — 움직이는 그림(SVG + SMIL) 공용 재생기 (CONTRACT §7)
// 순수 DOM. 외부 라이브러리 없음.
// 각 anim 파일은 ANIMS["이름"] = { title, desc, duration, build() } 만 제공한다.
//   build() 는 <svg …> 문자열을 돌려준다. 안의 <animate>/<animateTransform>/<set> 이
//   시간축을 만들고, 엔진이 svg.setCurrentTime(t) 로 그 시간축을 직접 몬다.
//   → 재생/정지/처음부터/배속/스크러버가 모든 anim 에 공통으로 붙는다.
// ============================================================
(function (global) {
  "use strict";

  global.ANIMS = global.ANIMS || {};

  var SPEEDS = [
    { value: "0.5", label: "0.5×" },
    { value: "1", label: "1×" },
    { value: "2", label: "2×" }
  ];

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined && text !== null) n.textContent = String(text);
    return n;
  }

  function fmtDesc(s) {
    if (s === undefined || s === null) s = "";
    if (typeof global.inlineFormat === "function") {
      try { return global.inlineFormat(String(s)); } catch (e) { /* fall through */ }
    }
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function fmtTime(t) {
    return (Math.round(t * 10) / 10).toFixed(1) + "s";
  }

  // 화면에 보일 때만 돈다 (한 문서에 애니메이션이 여럿이어도 CPU 를 아낀다)
  var observer = null;
  function observe(anim) {
    if (typeof IntersectionObserver === "undefined") { anim.visible = true; return; }
    if (!observer) {
      observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          var a = en.target.__anim;
          if (!a) return;
          a.visible = en.isIntersecting;
          if (a.visible) a.resume(); else a.suspend();
        });
      }, { threshold: 0.15 });
    }
    anim.root.__anim = anim;
    observer.observe(anim.root);
  }

  // ------------------------------------------------------------
  // 인스턴스
  // ------------------------------------------------------------
  function Anim(root, name, spec, caption) {
    this.root = root;
    this.name = name;
    this.spec = spec;
    this.caption = caption || "";
    this.duration = Math.max(0.5, Number(spec.duration) || 8);
    this.t = 0;
    this.speed = 1;
    this.playing = false;     // 사용자가 원하는 상태
    this.visible = true;      // 화면 안에 있는가
    this.raf = null;
    this.last = null;
    this.svg = null;
  }

  Anim.prototype.render = function () {
    var self = this;
    var spec = this.spec;
    var root = this.root;
    root.innerHTML = "";
    root.classList.add("anim");

    var head = el("div", "anim-head");
    head.appendChild(el("div", "anim-title", spec.title || this.name));
    if (spec.desc) {
      var sub = el("div", "anim-subtitle");
      sub.innerHTML = fmtDesc(spec.desc);
      head.appendChild(sub);
    }
    root.appendChild(head);

    this.stage = el("div", "anim-stage");
    root.appendChild(this.stage);

    var ctrl = el("div", "anim-ctrl");
    this.btnPlay = el("button", "anim-btn anim-play", "⏸ 정지");
    this.btnReset = el("button", "anim-btn", "↺ 처음부터");
    this.btnPlay.type = this.btnReset.type = "button";
    this.btnReset.title = "처음부터";
    ctrl.appendChild(this.btnPlay);
    ctrl.appendChild(this.btnReset);

    var speedSel = el("select", "anim-speed");
    SPEEDS.forEach(function (s) {
      var o = el("option", null, s.label);
      o.value = s.value;
      speedSel.appendChild(o);
    });
    speedSel.value = "1";
    speedSel.title = "배속";
    speedSel.addEventListener("change", function () {
      self.speed = parseFloat(speedSel.value) || 1;
    });
    ctrl.appendChild(speedSel);

    this.range = el("input", "anim-range");
    this.range.type = "range";
    this.range.min = "0";
    this.range.max = "1000";
    this.range.step = "1";
    this.range.value = "0";
    this.range.addEventListener("input", function () {
      self.seek((parseInt(self.range.value, 10) || 0) / 1000 * self.duration);
    });
    ctrl.appendChild(this.range);

    this.clock = el("span", "anim-clock", "0.0s / " + fmtTime(this.duration));
    ctrl.appendChild(this.clock);
    root.appendChild(ctrl);

    if (this.caption) {
      var cap = el("div", "anim-caption");
      cap.innerHTML = fmtDesc(this.caption);
      root.appendChild(cap);
    }

    this.btnPlay.addEventListener("click", function () { self.playing ? self.pause() : self.play(); });
    this.btnReset.addEventListener("click", function () { self.seek(0); if (!self.playing) self.play(); });
  };

  Anim.prototype.mountSvg = function () {
    var markup = "";
    try { markup = String(this.spec.build() || ""); } catch (e) { markup = ""; }
    this.stage.innerHTML = markup;
    this.svg = this.stage.querySelector("svg");
    if (!this.svg) {
      this.stage.className = "anim-stage anim-missing";
      this.stage.textContent = "그림을 만들 수 없음: " + this.name;
      return;
    }
    // 시간축은 엔진이 잡는다
    try { this.svg.pauseAnimations(); this.svg.setCurrentTime(0); } catch (e) { /* 지원 안 하면 SMIL 자체가 돈다 */ }
  };

  Anim.prototype.paintClock = function () {
    this.range.value = String(Math.round(this.t / this.duration * 1000));
    this.clock.textContent = fmtTime(this.t) + " / " + fmtTime(this.duration);
  };

  Anim.prototype.seek = function (t) {
    if (t < 0) t = 0;
    if (t > this.duration) t = t % this.duration;
    this.t = t;
    if (this.svg && this.svg.setCurrentTime) {
      try { this.svg.setCurrentTime(this.t); } catch (e) { /* ignore */ }
    }
    this.paintClock();
  };

  Anim.prototype.tick = function (now) {
    var self = this;
    if (!this.root.isConnected) {          // 문서를 떠났다 → 루프 종료, 옵저버에서도 제거
      if (observer) { try { observer.unobserve(this.root); } catch (e) { /* ignore */ } }
      this.raf = null; this.playing = false; return;
    }
    if (!this.playing || !this.visible) { this.raf = null; return; }
    if (this.last === null) this.last = now;
    var dt = (now - this.last) / 1000 * this.speed;
    this.last = now;
    var t = this.t + dt;
    if (t >= this.duration) t = t - this.duration;   // 무한 반복
    this.seek(t);
    this.raf = global.requestAnimationFrame(function (n) { self.tick(n); });
  };

  Anim.prototype.play = function () {
    var self = this;
    this.playing = true;
    this.btnPlay.textContent = "⏸ 정지";
    this.btnPlay.classList.add("playing");
    if (!this.raf && this.visible) {
      this.last = null;
      this.raf = global.requestAnimationFrame(function (n) { self.tick(n); });
    }
  };

  Anim.prototype.pause = function () {
    this.playing = false;
    this.btnPlay.textContent = "▶ 재생";
    this.btnPlay.classList.remove("playing");
    if (this.raf) { global.cancelAnimationFrame(this.raf); this.raf = null; }
  };

  // 화면 밖 → 잠시 멈춤 (사용자 상태는 유지)
  Anim.prototype.suspend = function () {
    if (this.raf) { global.cancelAnimationFrame(this.raf); this.raf = null; }
  };
  Anim.prototype.resume = function () {
    var self = this;
    if (this.playing && !this.raf) {
      this.last = null;
      this.raf = global.requestAnimationFrame(function (n) { self.tick(n); });
    }
  };

  // ------------------------------------------------------------
  // public
  // ------------------------------------------------------------
  var AnimEngine = {
    mount: function (container, name, caption) {
      var spec = global.ANIMS[name];
      if (!spec || typeof spec.build !== "function") {
        container.className = "anim-missing";
        container.textContent = "움직이는 그림 없음: " + name;
        return null;
      }
      var anim = new Anim(container, name, spec, caption);
      anim.render();
      anim.mountSvg();
      anim.seek(0);
      observe(anim);
      var freeze = global.ANIM_FREEZE_AT;
      if (typeof freeze === "number" && !isNaN(freeze)) {   // 검증용: 멈춘 채로 특정 시각
        anim.seek(freeze);
        anim.pause();
      } else {
        anim.play();
      }
      return anim;
    },
    mountAll: function (scope) {
      var out = [];
      (scope || document).querySelectorAll(".anim[data-anim]").forEach(function (node) {
        out.push(AnimEngine.mount(node, node.getAttribute("data-anim"), node.getAttribute("data-caption") || ""));
      });
      return out;
    }
  };

  global.AnimEngine = AnimEngine;
})(typeof window !== "undefined" ? window : globalThis);
