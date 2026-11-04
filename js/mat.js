/* Malé zobrazovanie matematiky bez internetu: text s úsekmi $...$ v zjednodušenom LaTeXu.
   Podporuje: \frac{a}{b}, x^{n}, x_{n}, \sqrt{x}, \sqrt[n]{x}, \left( ... \right) (naťahovacie zátvorky),
   \cdot \times \div \pm \le \ge \ne \approx \pi \circ \square ... a gréčtinu.
   Použitie: P.matNode("Vypočítajte $\\frac{1}{3}+\\frac{3}{6}$.") -> DOM uzol. */
(function () {
  const P = (window.PYT = window.PYT || {});
  const SYM = {
    cdot: "·", times: "×", div: ":", pm: "±", mp: "∓", le: "≤", leq: "≤", ge: "≥", geq: "≥", ne: "≠", neq: "≠",
    approx: "≈", doteq: "≐", lt: "<", gt: ">", pi: "π", circ: "°", degree: "°", square: "□", blacksquare: "■",
    triangle: "△", angle: "∢", perp: "⊥", parallel: "∥", infty: "∞", heartsuit: "♥", diamondsuit: "♦",
    clubsuit: "♣", spadesuit: "♠", star: "*", ldots: "…", dots: "…", cdots: "⋯", percent: "%",
    alpha: "α", beta: "β", gamma: "γ", delta: "δ", epsilon: "ε", varepsilon: "ε", lambda: "λ", mu: "μ",
    omega: "ω", phi: "φ", varphi: "φ", sigma: "σ", rho: "ρ", tau: "τ", Delta: "Δ", Omega: "Ω", Theta: "Θ",
    smiley: "☺", rightarrow: "→", to: "→", Rightarrow: "⇒", in: "∈", cap: "∩", cup: "∪", prime: "′",
    "{": "{", "}": "}", "%": "%", "$": "$", "#": "#", "&": "&", ",": " ", ";": " ", ":": " ", " ": " ", quad: " ",
  };
  const PAIR = { "(": ")", "[": "]", "{": "}", "|": "|", ".": "" };

  function parse(src) {
    let i = 0;
    const skip = () => { while (src[i] === " ") i++; };
    function readArg() {                    // {..} alebo jeden atóm
      skip();
      if (src[i] === "{") { i++; const g = seq((c) => c === "}"); i++; return g; }
      const a = atom(); return a ? [a] : [];
    }
    function readOpt() {                    // [..] (stupeň odmocniny)
      if (src[i] !== "[") return null;
      i++; const g = seq((c) => c === "]"); i++; return g;
    }
    function readDelim() {
      skip();
      if (src[i] === "\\") { i++; const m = /^[a-zA-Z]+|^./.exec(src.slice(i)); i += m[0].length; return { lbrace: "{", rbrace: "}", "{": "{", "}": "}", vert: "|" }[m[0]] || "|"; }
      return src[i++];
    }
    // sekvencia atómov s mocninami/indexmi, kým stop(znak) nepovie dosť
    function seq(stop) {
      const out = [];
      for (;;) {
        skip();
        if (i >= src.length || stop(src[i], i)) break;
        const c = src[i];
        if (c === "^" || c === "_") {
          i++; const arg = readArg();
          const base = out.pop() || { t: "txt", v: "" };
          out.push({ t: c === "^" ? "sup" : "sub", base, arg });
          continue;
        }
        const a = atom();
        if (!a) continue;
        // mínus ako znamienko (na začiatku, za operátorom alebo zátvorkou) sa píše bez medzier: −2
        const prev = out[out.length - 1];
        if (a.t === "op" && a.v === "−" && (!prev || prev.t === "op" || (prev.t === "txt" && /[(\[{]/.test(prev.v)))) a.unary = true;
        out.push(a);
      }
      return out;
    }
    function atom() {
      const c = src[i];
      if (c === "{") { i++; const k = seq((ch) => ch === "}"); i++; return { t: "grp", k }; }
      if (c === "\\") {
        i++;
        const m = /^[a-zA-Z]+|^./.exec(src.slice(i)); i += m[0].length;
        const cmd = m[0];
        if (cmd === "frac" || cmd === "dfrac" || cmd === "tfrac") { const a = readArg(), b = readArg(); return { t: "frac", a, b }; }
        if (cmd === "sqrt") { const n = readOpt(); return { t: "sqrt", n, a: readArg() }; }
        if (cmd === "left") {
          const l = readDelim();
          const k = seq((ch, j) => src.startsWith("\\right", j));
          let r = "";
          if (src.startsWith("\\right", i)) { i += 6; r = readDelim(); }
          return { t: "lr", l, r, k };
        }
        if (cmd === "stlpec") {             // písomné sčítanie/odčítanie pod sebou: \stlpec{9A7}{−B23}{86C}
          const riadky = [];
          for (;;) { skip(); if (src[i] !== "{") break; const j = src.indexOf("}", i); riadky.push(src.slice(i + 1, j)); i = j + 1; }
          return { t: "col", riadky };
        }
        if (cmd === "text" || cmd === "mathrm" || cmd === "textrm") return { t: "text", k: readArg() };
        if (cmd === "overline") return { t: "over", a: readArg() };
        if (SYM[cmd] != null) return { t: "op", v: SYM[cmd] };
        return { t: "txt", v: cmd };
      }
      {
        // čísla (aj s desatinnou čiarkou a medzerou medzi tisícami: "4 400") spolu
        const num = /^[0-9]+(?:(?:[.,]| | (?=[0-9]{3}(?![0-9])))[0-9]+)*/.exec(src.slice(i));
        if (num) { i += num[0].length; return { t: "num", v: num[0].replace(/ /g, " ") }; }
        i++;
        if (/[+\-−=<>·:×]/.test(c)) return { t: "op", v: c === "-" ? "−" : c };
        if (c === "~") return { t: "op", v: " " };
        return { t: /[a-zA-Z]/.test(c) ? "var" : "txt", v: c };
      }
    }
    return seq(() => false);
  }

  function svgDelim(ch, side) {
    // naťahovacia zátvorka ako SVG (výška = výška obsahu)
    const ns = "http://www.w3.org/2000/svg";
    const s = document.createElementNS(ns, "svg");
    s.setAttribute("viewBox", "0 0 10 100"); s.setAttribute("preserveAspectRatio", "none");
    s.setAttribute("class", "m-delim"); s.setAttribute("aria-hidden", "true");
    const p = document.createElementNS(ns, "path");
    const D = {
      "(": "M8 2 C1 25 1 75 8 98", ")": "M2 2 C9 25 9 75 2 98",
      "[": "M8 2 L3 2 L3 98 L8 98", "]": "M2 2 L7 2 L7 98 L2 98",
      "{": "M8 2 C4 2 5 8 5 20 C5 40 5 46 1 50 C5 54 5 60 5 80 C5 92 4 98 8 98",
      "}": "M2 2 C6 2 5 8 5 20 C5 40 5 46 9 50 C5 54 5 60 5 80 C5 92 6 98 2 98",
      "|": "M5 2 L5 98",
    };
    if (!D[ch]) return null;
    p.setAttribute("d", D[ch]); p.setAttribute("fill", "none"); p.setAttribute("stroke", "currentColor");
    p.setAttribute("stroke-width", "1.4"); p.setAttribute("vector-effect", "non-scaling-stroke");
    s.append(p); return s;
  }

  function hasTall(nodes) { return nodes.some((n) => n.t === "frac" || (n.t === "lr" && hasTall(n.k)) || (n.t === "grp" && hasTall(n.k)) || ((n.t === "sup" || n.t === "sub") && hasTall([n.base]))); }

  function build(nodes) {
    const h = P.h, frag = document.createDocumentFragment();
    nodes.forEach((n) => {
      switch (n.t) {
        case "num": frag.append(h("span", { class: "m-num" }, n.v)); break;
        case "var": frag.append(h("i", { class: "m-var" }, n.v)); break;
        case "txt": frag.append(document.createTextNode(n.v)); break;
        case "op": frag.append(h("span", { class: !n.unary && /[=<>≤≥≠≈+−±·×:]/.test(n.v) ? "m-op" : "m-sym" }, n.v)); break;
        case "grp": frag.append(build(n.k)); break;
        case "text": frag.append(h("span", { class: "m-text" }, flat(n.k))); break;
        case "frac": frag.append(h("span", { class: "m-frac" }, h("span", { class: "m-n" }, build(n.a)), h("span", { class: "m-d" }, build(n.b)))); break;
        case "sup": frag.append(h("span", { class: "m-base" }, build([n.base])), h("sup", { class: "m-sup" }, build(n.arg))); break;
        case "sub": frag.append(h("span", { class: "m-base" }, build([n.base])), h("sub", { class: "m-sub" }, build(n.arg))); break;
        case "col": frag.append(h("span", { class: "m-col" }, n.riadky.map((r, k) =>
          h("span", { class: "m-col-r" + (k === n.riadky.length - 1 ? " m-col-sum" : "") }, r.replace(/-/g, "−"))))); break;
        case "over": frag.append(h("span", { class: "m-over" }, build(n.a))); break;
        case "sqrt": frag.append(h("span", { class: "m-sqrt" }, n.n ? h("sup", { class: "m-root" }, build(n.n)) : null, h("span", { class: "m-rad" }, "√"), h("span", { class: "m-radicand" }, build(n.a)))); break;
        case "lr": {
          const tall = hasTall(n.k);
          if (!tall) { frag.append(n.l === "." ? "" : n.l, build(n.k), PAIR[n.l] !== undefined && n.r === "." ? "" : n.r); break; }
          frag.append(h("span", { class: "m-lr" }, svgDelim(n.l, "l") || "", h("span", { class: "m-lr-in" }, build(n.k)), svgDelim(n.r, "r") || ""));
          break;
        }
      }
    });
    return frag;
  }
  const flat = (nodes) => nodes.map((n) => n.v || (n.k ? flat(n.k) : "")).join("");

  P.matNode = function (text) {
    const span = P.h("span", { class: "mtext" });
    String(text || "").split(/(\$[^$]*\$)/).forEach((part) => {
      if (part.length > 1 && part[0] === "$" && part[part.length - 1] === "$") {
        let m;
        try { m = build(parse(part.slice(1, -1))); } catch (e) { m = document.createTextNode(part); }
        span.append(P.h("span", { class: "m" }, m));
      } else if (part) span.append(document.createTextNode(part));
    });
    return span;
  };
  // obyčajný text (pre vyhľadávanie): \frac{1}{3} -> 1/3
  P.matPlain = (t) => String(t || "").replace(/\\d?frac\{([^{}]*)\}\{([^{}]*)\}/g, "$1/$2").replace(/\\left|\\right|[${}\\]/g, "");
  // zadanie úlohy: prepis s matematikou, ak existuje
  P.zadanieNode = (u) => (u.zadanie_mat ? P.matNode(u.zadanie_mat) : document.createTextNode(u.zadanie));
})();
