/* Quiz Forum — True or False?  Main application logic (vanilla JS, no build step). */
(function () {
  "use strict";

  var PENDING_KEY = "qf_pending_v1";
  var NAME_RE = /^[A-Za-zÀ-ÖØ-öø-ÿ][A-Za-zÀ-ÖØ-öø-ÿ .'’\-]*$/;

  var $ = function (id) { return document.getElementById(id); };
  function cfg() { return window.QF_CONFIG; }
  function bank() { return window.QF_QUESTIONS; }
  function byId(id) {
    var list = bank();
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }

  /* ---------------- state ---------------- */
  var S = null;           // current attempt (see newAttempt)
  var timerHandle = null; // the ONE interval handle
  var transitionHandle = null;

  function newAttempt(name) {
    var C = cfg();
    var ids = bank().map(function (q) { return q.id; });
    if (C.randomizeQuestions) ids = shuffle(ids);
    ids = ids.slice(0, C.questionsPerQuiz);
    return {
      attemptId: makeId(),
      name: name,
      order: ids,
      answers: {},          // qid -> "TRUE" | "FALSE" | null (timeout)
      idx: 0,
      locked: true,         // locked until a question is displayed
      deadline: 0,
      token: 0,             // increments per question; stale callbacks compare against it
      finished: false,
      completedAt: null,
      save: { status: "idle", certId: null, server: null, message: "" }
    };
  }

  function makeId() {
    try {
      if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
      var a = new Uint8Array(16); crypto.getRandomValues(a);
      return Array.prototype.map.call(a, function (b) { return ("0" + b.toString(16)).slice(-2); }).join("");
    } catch (e) {
      return "a" + Date.now().toString(16) + Math.random().toString(16).slice(2, 12) + Math.random().toString(16).slice(2, 12);
    }
  }

  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function nowMs() { return (window.performance && performance.now) ? performance.now() : Date.now(); }

  /* ---------------- scoring (single source of truth for the UI) ---------------- */
  function computeResults(attempt) {
    var C = cfg(), correct = 0, incorrect = 0, timedOut = 0, rows = [];
    attempt.order.forEach(function (qid, i) {
      var q = byId(qid), given = attempt.answers.hasOwnProperty(qid) ? attempt.answers[qid] : null;
      var state;
      if (given === null) { timedOut++; state = "late"; }
      else if (given === q.answer) { correct++; state = "ok"; }
      else { incorrect++; state = "no"; }
      rows.push({ n: i + 1, q: q, given: given, state: state });
    });
    var total = attempt.order.length;
    var max = total * C.pointsPerCorrect;
    var score = correct * C.pointsPerCorrect;
    return {
      score: score, max: max, total: total, correct: correct, incorrect: incorrect, timedOut: timedOut,
      percentage: max ? Math.round((score / max) * 1000) / 10 : 0, rows: rows
    };
  }

  function bandFor(score) {
    var bands = cfg().bands.slice().sort(function (a, b) { return b.min - a.min; });
    for (var i = 0; i < bands.length; i++) if (score >= bands[i].min) return bands[i];
    return bands[bands.length - 1];
  }

  /* ---------------- screens ---------------- */
  function show(id) {
    ["screen-welcome", "screen-quiz", "screen-results", "screen-cert"].forEach(function (s) {
      $(s).hidden = (s !== id);
    });
    window.scrollTo(0, 0);
  }

  function isDemo() { return !String(cfg().scriptUrl || "").trim(); }

  function initWelcome() {
    var C = cfg();
    document.title = C.quizTitle;
    $("welcome-title").textContent = C.quizTitle;
    $("welcome-subtitle").textContent = C.subtitle + " — " + C.editionLabel;
    $("welcome-tagline").textContent = C.tagline;
    $("edition-badge").textContent = C.editionLabel + " edition";
    $("name-input").maxLength = C.nameMaxLength;
    $("footer-text").textContent = C.organizerName + " · " + C.editionLabel;
    $("demo-flag").hidden = !isDemo();

    var total = Math.min(C.questionsPerQuiz, bank().length);
    var rules = $("rules-list");
    rules.innerHTML = "";
    [
      total + " questions, one at a time.",
      C.timerSeconds + " seconds per question. If time runs out it counts as a timeout (0 points).",
      C.pointsPerCorrect + " point for every correct answer. Maximum score: " + (total * C.pointsPerCorrect) + ".",
      "No going back: once you answer, the answer is locked.",
      "Stay on this tab. Switching away does not pause the timer."
    ].forEach(function (t) { var li = document.createElement("li"); li.textContent = t; rules.appendChild(li); });

    var pending = readPending();
    $("pending-banner").hidden = !pending;
  }

  /* ---------------- name validation ---------------- */
  function normaliseName(raw) {
    return String(raw || "").replace(/’/g, "'").replace(/\s+/g, " ").trim();
  }
  function validateName(name) {
    var C = cfg();
    if (!name) return "Please enter your full name to begin.";
    if (name.length < 2) return "That name looks too short.";
    if (name.length > C.nameMaxLength) return "Please keep your name under " + (C.nameMaxLength + 1) + " characters.";
    if (!NAME_RE.test(name)) return "Please use English letters, spaces, dots, hyphens or apostrophes only (it is printed on your certificate).";
    return "";
  }

  function onStartSubmit(ev) {
    ev.preventDefault();
    var input = $("name-input");
    var name = normaliseName(input.value);
    input.value = name;
    var err = validateName(name);
    var box = $("name-error");
    if (err) {
      box.textContent = err; box.hidden = false;
      input.setAttribute("aria-invalid", "true"); input.focus();
      return;
    }
    box.hidden = true; input.removeAttribute("aria-invalid");
    startQuiz(name);
  }

  /* ---------------- quiz flow ---------------- */
  function startQuiz(name) {
    stopTimer(); clearTransition();
    var C = cfg();
    if (!bank().length) { alert("No questions are configured."); return; }
    S = newAttempt(name);
    $("score-pill").textContent = "";
    show("screen-quiz");
    $("tab-warning").hidden = true;
    window.addEventListener("beforeunload", beforeUnload);
    showQuestion();
  }

  function showQuestion() {
    var C = cfg();
    var qid = S.order[S.idx], q = byId(qid), total = S.order.length;
    S.token++;
    S.locked = false;

    $("progress-text").textContent = "Question " + (S.idx + 1) + " of " + total;
    $("score-pill").textContent = "Score: " + currentScore();
    $("progress-fill").style.width = ((S.idx) / total * 100) + "%";
    $("q-topic").textContent = q.topic;
    $("q-statement").textContent = q.statement;

    var answers = $("answers");
    var swap = C.randomizeButtons && Math.random() < 0.5;
    answers.classList.toggle("swap", swap);

    ["btn-true", "btn-false"].forEach(function (id) {
      var b = $(id); b.disabled = false; b.classList.remove("picked");
    });

    // reaction from the previous question stays visible on top as context, cleared on next answer
    $("q-statement").focus({ preventScroll: true });
    startTimer();
  }

  function currentScore() {
    var C = cfg(), s = 0;
    S.order.forEach(function (qid) {
      if (S.answers.hasOwnProperty(qid) && S.answers[qid] === byId(qid).answer) s += C.pointsPerCorrect;
    });
    return s;
  }

  /* ONE timer: a single interval, deadline based, always cleared before a new one starts */
  function startTimer() {
    stopTimer();
    var C = cfg();
    S.deadline = nowMs() + C.timerSeconds * 1000;
    renderTimer(C.timerSeconds * 1000);
    var token = S.token;
    timerHandle = setInterval(function () {
      if (!S || S.token !== token) { stopTimer(); return; }  // stale callback guard
      tick();
    }, 100);
  }

  function stopTimer() {
    if (timerHandle !== null) { clearInterval(timerHandle); timerHandle = null; }
  }
  function clearTransition() {
    if (transitionHandle !== null) { clearTimeout(transitionHandle); transitionHandle = null; }
  }

  function tick() {
    if (!S || S.locked) return;
    var remaining = S.deadline - nowMs();   // robust to throttled background-tab timers
    if (remaining <= 0) { renderTimer(0); lock(null); return; }
    renderTimer(remaining);
  }

  function renderTimer(remainingMs) {
    var C = cfg();
    var secs = Math.max(0, Math.ceil(remainingMs / 1000));
    $("timer-num").textContent = secs;
    $("timer").classList.toggle("low", secs <= 3 && remainingMs > 0);
    $("timer").setAttribute("aria-label", secs + " seconds remaining");
    $("timer-fill").style.width = Math.max(0, Math.min(100, remainingMs / (C.timerSeconds * 1000) * 100)) + "%";
  }

  /* The only place an answer or a timeout is recorded. Idempotent via S.locked. */
  function lock(choice) {
    if (!S || S.locked || S.finished) return;
    S.locked = true;
    stopTimer();

    var qid = S.order[S.idx], q = byId(qid);
    S.answers[qid] = choice;                   // null = timeout

    $("btn-true").disabled = true;
    $("btn-false").disabled = true;
    if (choice) $(choice === "TRUE" ? "btn-true" : "btn-false").classList.add("picked");

    var kind = choice === null ? "late" : (choice === q.answer ? "ok" : "no");
    showReaction(kind);
    $("score-pill").textContent = "Score: " + currentScore();
    $("progress-fill").style.width = ((S.idx + 1) / S.order.length * 100) + "%";

    var token = S.token;
    clearTransition();
    transitionHandle = setTimeout(function () {
      transitionHandle = null;
      if (!S || S.token !== token) return;     // only the transition for THIS question may advance
      advance();
    }, cfg().transitionMs);
  }

  function advance() {
    S.idx++;
    if (S.idx >= S.order.length) { finishQuiz(); return; }
    showQuestion();
  }

  var REACTIONS = {
    ok: ["Big brain energy! 🧠", "Chef's kiss. Correct! 👌", "Facts: 1, Doubt: 0 ✅", "Look at you go! 🔥"],
    no: ["Oof, the facts disagree! 😬", "Close, but the facts said no. 🙈", "Plot twist! That was not it. 🌀", "Respectfully, the facts disagree. 🧐"],
    late: ["Time's up — even Google would be sweating! ⏰", "The clock won that round. ⌛", "Blink and it's gone! 💨"]
  };
  function showReaction(kind) {
    var list = REACTIONS[kind], text = list[Math.floor(Math.random() * list.length)];
    var el = $("reaction");
    el.className = "reaction " + kind;
    el.textContent = text;
    void el.offsetWidth;
    el.classList.add("pop");
  }

  function onAnswerClick(ev) {
    var btn = ev.currentTarget;
    if (btn.disabled) return;
    lock(btn.getAttribute("data-value"));
  }

  function onKey(ev) {
    if (!S || S.finished || $("screen-quiz").hidden || ev.repeat) return;
    if (ev.ctrlKey || ev.metaKey || ev.altKey) return;
    var k = (ev.key || "").toLowerCase();
    if (k === "t") { ev.preventDefault(); lock("TRUE"); }
    else if (k === "f") { ev.preventDefault(); lock("FALSE"); }
  }

  function onVisibility() {
    if (!S || S.finished || $("screen-quiz").hidden) return;
    if (document.hidden) { $("tab-warning").hidden = false; }
    else { tick(); }   // catch up immediately: deadline may have passed while hidden
  }

  function beforeUnload(ev) {
    var inProgress = S && !S.finished;
    var unsaved = S && S.finished && S.save.status !== "saved" && !isDemo();
    if (inProgress || unsaved) { ev.preventDefault(); ev.returnValue = ""; return ""; }
  }

  /* ---------------- finishing ---------------- */
  function finishQuiz() {
    stopTimer(); clearTransition();
    S.finished = true;
    S.completedAt = new Date();
    $("progress-fill").style.width = "100%";

    if (isDemo()) {
      S.save = { status: "demo", certId: "DEMO-" + S.attemptId.replace(/[^A-Za-z0-9]/g, "").slice(0, 8).toUpperCase(), server: null, message: "" };
    } else {
      writePending();
    }
    renderResults();
    show("screen-results");
    var r = computeResults(S);
    if (r.score >= Math.ceil(r.total * 0.6) && window.QFConfetti) window.QFConfetti.burst(r.score >= bandFor(r.max).min && bandFor(r.max).min > 0 ? 160 : 90);
    if (!isDemo()) saveResult();
  }

  function renderResults() {
    var C = cfg(), r = computeResults(S), band = bandFor(r.score);
    $("result-emoji").textContent = band.emoji;
    $("result-title").textContent = band.title;
    $("result-blurb").textContent = band.blurb;
    $("result-score").textContent = r.score;
    $("result-total").textContent = r.max;
    $("stat-pct").textContent = r.percentage + "%";
    $("stat-correct").textContent = r.correct;
    $("stat-incorrect").textContent = r.incorrect;
    $("stat-timeout").textContent = r.timedOut;

    var ol = $("review");
    ol.innerHTML = "";
    r.rows.forEach(function (row) {
      var li = document.createElement("li");
      li.className = row.state;
      var p = document.createElement("p"); p.className = "rq";
      p.textContent = row.n + ". " + row.q.statement;
      var chips = document.createElement("div"); chips.className = "chips";
      chips.appendChild(chip("Correct answer: " + row.q.answer, "right"));
      chips.appendChild(row.given === null ? chip("You: no answer (timed out)", "none")
        : chip("You: " + row.given + (row.state === "ok" ? " ✓" : " ✗"), row.state === "ok" ? "right" : "wrong"));
      var why = document.createElement("p"); why.className = "why";
      why.textContent = row.q.explanation;
      li.appendChild(p); li.appendChild(chips); li.appendChild(why);
      if (row.q.source) {
        var a = document.createElement("a");
        a.href = row.q.source; a.target = "_blank"; a.rel = "noopener noreferrer"; a.textContent = "Source";
        li.appendChild(a);
      }
      ol.appendChild(li);
    });
    renderSaveStatus();
  }

  function chip(text, cls) {
    var s = document.createElement("span"); s.className = "chip " + cls; s.textContent = text; return s;
  }

  /* ---------------- saving to Google Sheets ---------------- */
  function renderSaveStatus() {
    var C = cfg(), st = S.save, panel = $("save-panel"), msg = $("save-message");
    var retry = $("btn-retry"), certBtn = $("btn-cert"), policy = $("cert-policy");
    retry.hidden = true;
    panel.className = "notice";

    if (st.status === "demo") {
      panel.classList.add("warn");
      msg.textContent = "Demo mode: this result is not recorded anywhere. Your certificate will be marked as a demo copy.";
      certBtn.disabled = false;
      policy.textContent = "Demo certificates are for testing only.";
    } else if (st.status === "saving") {
      msg.textContent = "Saving your result… please keep this page open.";
      certBtn.disabled = true;
      policy.textContent = "Your certificate unlocks once your result is safely recorded.";
    } else if (st.status === "saved") {
      panel.classList.add("good");
      msg.textContent = (st.server && st.server.duplicate)
        ? "✅ Your result was already recorded earlier. No duplicate was created."
        : "✅ Your result has been saved by the server.";
      if (st.server && st.server.sheetSync === "pending") {
        msg.textContent += st.server.sheetSyncEnabled === false
          ? " Your result is safely stored; Google Sheets syncing is not enabled for this deployment."
          : " Your result is safely stored; the Google Sheets copy is pending.";
      }
      if (st.server && st.mismatch) {
        msg.textContent += " Note: the server recalculated your score as " + st.server.score + " / " + st.server.maxScore + ". The certificate uses the server's figure.";
      }
      certBtn.disabled = false;
      policy.textContent = "Certificate ID: " + st.certId;
    } else if (st.status === "failed") {
      panel.classList.add("bad");
      msg.textContent = "⚠️ Your result has NOT been saved. " + st.message + " Your answers are kept on this device, so you can retry.";
      retry.hidden = false;
      certBtn.disabled = C.requireSaveBeforeCertificate;
      policy.textContent = C.requireSaveBeforeCertificate
        ? "Certificates are only issued after the result is saved, so that your name and score on the certificate match the official record."
        : "You may generate a certificate without saving, but it will be marked as unrecorded.";
    } else {
      msg.textContent = "";
      certBtn.disabled = true;
    }
  }

  function saveResult() {
    if (!S || !S.finished || S.save.status === "saving" || S.save.status === "saved") return;
    var C = cfg();
    S.save.status = "saving"; S.save.message = "";
    renderSaveStatus();

    var payload = {
      action: "submit",
      attemptId: S.attemptId,
      name: S.name,
      edition: C.editionLabel,
      order: S.order,
      answers: S.order.map(function (qid) { return S.answers.hasOwnProperty(qid) ? S.answers[qid] : null; })
    };

    var controller = (typeof AbortController !== "undefined") ? new AbortController() : null;
    var timer = setTimeout(function () { if (controller) controller.abort(); }, C.saveTimeoutMs);
    var attempt = S;

    fetch(C.scriptUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      redirect: "follow",
      signal: controller ? controller.signal : undefined
    }).then(function (res) {
      if (!res.ok) throw new Error("The server answered with an error (" + res.status + ").");
      return res.json();
    }).then(function (data) {
      clearTimeout(timer);
      if (attempt !== S) return;
      if (!data || data.ok !== true) {
        throw new Error(friendlyServerError(data && data.error));
      }
      var r = computeResults(attempt);
      attempt.save = {
        status: "saved", certId: data.certificateId, server: data, message: "",
        mismatch: (data.score !== r.score)
      };
      if (data.completedAt) attempt.completedAt = new Date(data.completedAt);
      clearPending();
      renderSaveStatus();
    }).catch(function (err) {
      clearTimeout(timer);
      if (attempt !== S) return;
      var m = (err && err.name === "AbortError") ? "The request timed out."
        : (err instanceof TypeError ? "Could not reach the server (check your internet connection)." : (err && err.message) || "Unknown error.");
      attempt.save = { status: "failed", certId: null, server: null, message: m };
      writePending();
      renderSaveStatus();
    });
  }

  function friendlyServerError(code) {
    var map = {
      invalid_name: "The server did not accept the name.",
      edition_mismatch: "This page and the server are set to different quiz editions. Please tell the organiser.",
      invalid_answers: "The server could not validate the answers. Please tell the organiser.",
      invalid_attempt: "The attempt ID was rejected.",
      already_participated: "This name has already been recorded for this edition.",
      busy: "The server is busy. Please retry in a few seconds.",
      storage_unavailable: "Secure result storage is temporarily unavailable. Please retry shortly.",
      invalid_request: "The submission could not be read. Please reload the page and retry.",
      forbidden: "This submission must come from the quiz website."
    };
    return map[code] || ("The server rejected the submission" + (code ? " (" + code + ")." : "."));
  }

  /* pending result survives a refresh so it is never silently lost */
  function writePending() {
    try {
      localStorage.setItem(PENDING_KEY, JSON.stringify({
        attemptId: S.attemptId, name: S.name, order: S.order, answers: S.answers, completedAt: S.completedAt
      }));
    } catch (e) { /* storage may be unavailable; non-fatal */ }
  }
  function clearPending() { try { localStorage.removeItem(PENDING_KEY); } catch (e) {} }
  function readPending() {
    try {
      var raw = localStorage.getItem(PENDING_KEY);
      if (!raw) return null;
      var p = JSON.parse(raw);
      if (!p || !p.attemptId || !Array.isArray(p.order)) return null;
      for (var i = 0; i < p.order.length; i++) if (!byId(p.order[i])) return null;
      return p;
    } catch (e) { return null; }
  }

  function resumePending() {
    var p = readPending();
    if (!p) { $("pending-banner").hidden = true; return; }
    S = newAttempt(p.name);
    S.attemptId = p.attemptId; S.order = p.order; S.answers = p.answers || {};
    S.finished = true; S.completedAt = p.completedAt ? new Date(p.completedAt) : new Date();
    window.addEventListener("beforeunload", beforeUnload);
    renderResults();
    show("screen-results");
    saveResult();
  }

  /* ---------------- certificate ---------------- */
  function certificateData() {
    var C = cfg(), r = computeResults(S), srv = S.save.server;
    return {
      name: S.name,
      score: srv ? srv.score : r.score,
      total: srv ? srv.maxScore : r.max,
      percentage: srv ? srv.percentage : r.percentage,
      completedAt: S.completedAt || new Date(),
      certId: S.save.certId || ("UNSAVED-" + S.attemptId.slice(0, 8).toUpperCase()),
      edition: C.editionLabel,
      quizName: C.subtitle,
      organizer: C.organizerName,
      certificateTitle: C.certificateTitle,
      coordinatorTitle: C.coordinatorTitle,
      demo: S.save.status !== "saved"
    };
  }

  function canIssueCertificate() {
    var st = S && S.save.status;
    if (st === "saved" || st === "demo") return true;
    return !!(S && st === "failed" && !cfg().requireSaveBeforeCertificate);
  }

  function openCertificate() {
    if (!S || !S.finished || !canIssueCertificate()) return;
    var d = certificateData();
    $("cp-org").textContent = d.organizer;
    $("cp-title").textContent = d.certificateTitle;
    $("cp-name").textContent = d.name;
    $("cp-line").textContent = "for taking part in the " + d.quizName + " — " + d.edition;
    $("cp-meta").textContent = "Score " + d.score + " / " + d.total + " (" + d.percentage + "%) · Certificate ID " + d.certId;
    $("cert-error").hidden = true;
    show("screen-cert");
  }

  function pdfBlob() {
    var doc = QFCertificate.build(certificateData());
    return { doc: doc, blob: doc.output("blob") };
  }

  function downloadCertificate() {
    try {
      var d = certificateData(), built = pdfBlob();
      var url = URL.createObjectURL(built.blob);
      var a = document.createElement("a");
      a.href = url; a.download = QFCertificate.fileName(d);
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 10000);
    } catch (e) { certError(e); }
  }

  function printCertificate() {
    try {
      var built = pdfBlob();
      built.doc.autoPrint();
      var url = built.doc.output("bloburl");
      var w = window.open(url, "_blank");
      if (!w) { downloadCertificate(); certError(new Error("Pop-up blocked, so the PDF was downloaded instead. Open it and print from there.")); }
    } catch (e) { certError(e); }
  }

  function certError(e) {
    var el = $("cert-error");
    el.textContent = "Could not create the certificate: " + (e && e.message ? e.message : e);
    el.hidden = false;
  }

  /* ---------------- boot ---------------- */
  function init() {
    initWelcome();
    $("start-form").addEventListener("submit", onStartSubmit);
    $("btn-true").addEventListener("click", onAnswerClick);
    $("btn-false").addEventListener("click", onAnswerClick);
    $("btn-retry").addEventListener("click", saveResult);
    $("btn-cert").addEventListener("click", openCertificate);
    $("btn-download").addEventListener("click", downloadCertificate);
    $("btn-print").addEventListener("click", printCertificate);
    $("btn-back-results").addEventListener("click", function () { show("screen-results"); });
    $("btn-resume").addEventListener("click", resumePending);
    $("btn-discard").addEventListener("click", function () {
      if (confirm("Discard the unsaved result? It cannot be recovered.")) { clearPending(); $("pending-banner").hidden = true; }
    });
    document.addEventListener("keydown", onKey);
    document.addEventListener("visibilitychange", onVisibility);
    $("name-input").focus();
  }

  // Test hook (read-only helpers). Harmless in production.
  window.__QF = { computeResults: computeResults, state: function () { return S; }, timerActive: function () { return timerHandle !== null; } };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
