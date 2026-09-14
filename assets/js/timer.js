/* Run-of-show timer for the projector.
 *
 * Anchored to the moment an organiser presses Start, not to the wall clock.
 * Events do not begin on the minute, and a clock-anchored timer would quietly
 * take the late start out of the last block — which is the block that decides
 * how many teams get to pitch. The scheduled times are still shown, so the
 * room can see how far behind it is running.
 *
 * State lives in localStorage, so a refresh, a locked screen or a browser
 * crash mid-event does not lose the clock.
 */

(function () {
  'use strict';

  var KEY = 'ideathon.timer.v1';

  /* ---- which event ------------------------------------------------------- */

  function params() {
    var out = {}, q = window.location.search.replace(/^\?/, '');
    q.split('&').forEach(function (pair) {
      if (!pair) return;
      var kv = pair.split('=');
      out[decodeURIComponent(kv[0])] = decodeURIComponent(kv[1] || '');
    });
    return out;
  }

  /* Both events are normalised to { name, minutes, start, what, ai }. */
  function load(which) {
    if (which === 'bridge' && window.BRIDGE) {
      var at = 0;
      return {
        id: 'bridge',
        title: window.BRIDGE.config.name,
        window: window.BRIDGE.config.timeRange,
        startsAt: '13:30',
        phases: window.BRIDGE.phases.map(function (p) {
          var row = { name: p.name, minutes: p.minutes, start: at, what: p.note || '', ai: 'n/a' };
          at += p.minutes;
          return row;
        })
      };
    }
    var I = window.IDEATHON;
    return {
      id: 'ideathon',
      title: I.config.name,
      window: I.config.timeRange,
      startsAt: I.config.startsAt,
      phases: I.schedule.map(function (p) {
        return { name: p.name, minutes: p.minutes, start: p.start, what: p.what, ai: p.ai };
      })
    };
  }

  var EV = load(params().event);
  var TOTAL = EV.phases.reduce(function (a, p) { return a + p.minutes; }, 0) * 60000;

  /* ---- persisted state --------------------------------------------------- */

  var state = { startedAt: null, pausedAt: null, lost: 0 };

  function read() {
    try {
      var raw = window.localStorage.getItem(KEY + '.' + EV.id);
      if (!raw) return;
      var o = JSON.parse(raw);
      if (o && typeof o === 'object') {
        state.startedAt = o.startedAt || null;
        state.pausedAt = o.pausedAt || null;
        state.lost = o.lost || 0;
      }
    } catch (e) { /* private mode, cleared storage — run without persistence */ }
  }

  function save() {
    try {
      window.localStorage.setItem(KEY + '.' + EV.id, JSON.stringify(state));
    } catch (e) { /* nothing to do; the timer still runs in memory */ }
  }

  function elapsed() {
    if (!state.startedAt) return 0;
    var end = state.pausedAt || Date.now();
    return Math.max(0, end - state.startedAt - state.lost);
  }

  function running() { return !!state.startedAt && !state.pausedAt; }
  function finished() { return !!state.startedAt && elapsed() >= TOTAL; }

  /* ---- phase lookup ------------------------------------------------------ */

  function phaseAt(ms) {
    var mins = ms / 60000;
    for (var i = 0; i < EV.phases.length; i++) {
      var p = EV.phases[i];
      if (mins < p.start + p.minutes) return { index: i, phase: p };
    }
    return { index: EV.phases.length - 1, phase: EV.phases[EV.phases.length - 1] };
  }

  /* ---- formatting -------------------------------------------------------- */

  function mmss(ms) {
    var t = Math.max(0, Math.ceil(ms / 1000));
    var m = Math.floor(t / 60), s = t % 60;
    return m + ':' + (s < 10 ? '0' : '') + s;
  }

  function wall(minutesIn) {
    var base = EV.startsAt.split(':');
    var total = Number(base[0]) * 60 + Number(base[1]) + minutesIn;
    var h24 = Math.floor(total / 60) % 24, m = total % 60;
    var h = h24 % 12; if (h === 0) h = 12;
    return h + ':' + (m < 10 ? '0' : '') + m;
  }

  /* ---- sound ------------------------------------------------------------- */
  /* A short tone at each phase change. Created on the Start click so the
     browser's autoplay rules count it as user-initiated. */

  var audio = null;

  function unlockAudio() {
    if (audio) return;
    var Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    try { audio = new Ctx(); } catch (e) { audio = null; }
  }

  function chime(count) {
    if (!audio || muted) return;
    for (var i = 0; i < count; i++) {
      (function (n) {
        var osc = audio.createOscillator(), gain = audio.createGain();
        var t = audio.currentTime + n * 0.28;
        osc.frequency.value = 660;
        osc.connect(gain); gain.connect(audio.destination);
        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.exponentialRampToValueAtTime(0.25, t + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
        osc.start(t); osc.stop(t + 0.24);
      })(i);
    }
  }

  var muted = false;

  /* ---- rendering --------------------------------------------------------- */

  var $ = function (id) { return document.getElementById(id); };
  var lastPhase = -1;
  var lastWarn = null;

  function render() {
    var ms = elapsed();
    var done = finished();
    var cur = phaseAt(ms);
    var p = cur.phase;
    var body = document.body;

    if (!state.startedAt) {
      body.setAttribute('data-timer', 'idle');
      $('phaseName').textContent = 'Ready';
      $('countdown').textContent = mmss(TOTAL);
      $('phaseWhat').textContent = 'Press Start when the briefing actually begins.';
      $('upNext').textContent = 'First up: ' + EV.phases[0].name;
      $('elapsedTotal').textContent = '0:00 of ' + mmss(TOTAL);
      $('bar').style.width = '0%';
      $('phaseIndex').textContent = '— of ' + EV.phases.length;
      paintList(-1);
      return;
    }

    if (done) {
      body.setAttribute('data-timer', 'done');
      $('phaseName').textContent = 'Time';
      $('countdown').textContent = '0:00';
      $('phaseWhat').textContent = 'The hour is over.';
      $('upNext').textContent = '';
      $('elapsedTotal').textContent = mmss(TOTAL) + ' of ' + mmss(TOTAL);
      $('bar').style.width = '100%';
      $('phaseIndex').textContent = EV.phases.length + ' of ' + EV.phases.length;
      paintList(EV.phases.length);
      if (lastPhase !== 999) { chime(3); lastPhase = 999; }
      return;
    }

    var intoPhase = ms - p.start * 60000;
    var leftInPhase = p.minutes * 60000 - intoPhase;

    /* a tone when the phase turns over, and one at the last minute */
    if (cur.index !== lastPhase) {
      if (lastPhase !== -1) chime(2);
      lastPhase = cur.index;
      lastWarn = null;
    }
    if (leftInPhase <= 60000 && lastWarn !== cur.index) {
      chime(1);
      lastWarn = cur.index;
    }

    body.setAttribute('data-timer',
      state.pausedAt ? 'paused' : (leftInPhase <= 60000 ? 'ending' : 'running'));

    $('phaseName').textContent = p.name;
    $('countdown').textContent = mmss(leftInPhase);
    $('phaseWhat').textContent = p.what || '';
    $('phaseIndex').textContent = (cur.index + 1) + ' of ' + EV.phases.length;
    $('elapsedTotal').textContent = mmss(ms) + ' of ' + mmss(TOTAL);
    $('bar').style.width = Math.min(100, (ms / TOTAL) * 100) + '%';

    var nxt = EV.phases[cur.index + 1];
    $('upNext').textContent = nxt ? 'Next: ' + nxt.name + ' (' + nxt.minutes + ' min)' : 'Last block';

    paintList(cur.index);
  }

  function paintList(activeIndex) {
    var rows = document.querySelectorAll('#phaseList li');
    for (var i = 0; i < rows.length; i++) {
      rows[i].setAttribute('data-state',
        i < activeIndex ? 'past' : (i === activeIndex ? 'now' : 'ahead'));
    }
  }

  function buildList() {
    var ul = $('phaseList');
    EV.phases.forEach(function (p) {
      var li = document.createElement('li');
      var t = document.createElement('span');
      t.className = 'tl-clock';
      t.textContent = wall(p.start) + ' – ' + wall(p.start + p.minutes);
      var n = document.createElement('span');
      n.className = 'tl-name';
      n.textContent = p.name;
      var m = document.createElement('span');
      m.className = 'tl-min';
      m.textContent = p.minutes + ' min';
      li.appendChild(t); li.appendChild(n); li.appendChild(m);
      if (p.ai === 'no') li.setAttribute('data-ai', 'no');
      ul.appendChild(li);
    });
  }

  /* ---- controls ---------------------------------------------------------- */

  function start() {
    unlockAudio();
    if (!state.startedAt) {
      state.startedAt = Date.now();
      state.pausedAt = null;
      state.lost = 0;
    } else if (state.pausedAt) {
      state.lost += Date.now() - state.pausedAt;
      state.pausedAt = null;
    }
    save(); render(); syncButtons();
  }

  function pause() {
    if (!state.startedAt || state.pausedAt) return;
    state.pausedAt = Date.now();
    save(); render(); syncButtons();
  }

  function toggle() { running() ? pause() : start(); }

  /* Jump to the top of the next block by moving the anchor, so every later
     block keeps its full length. */
  function skip() {
    if (!state.startedAt) return;
    var cur = phaseAt(elapsed());
    var nxt = EV.phases[cur.index + 1];
    var target = nxt ? nxt.start * 60000 : TOTAL;
    state.startedAt = Date.now() - target;
    state.lost = 0;
    if (state.pausedAt) state.pausedAt = Date.now();
    save(); render(); syncButtons();
  }

  function reset() {
    if (state.startedAt && !window.confirm('Reset the timer to zero?')) return;
    state.startedAt = null; state.pausedAt = null; state.lost = 0;
    lastPhase = -1; lastWarn = null;
    save(); render(); syncButtons();
  }

  function fullscreen() {
    var d = document;
    if (d.fullscreenElement) { d.exitFullscreen(); return; }
    var el = d.documentElement;
    if (el.requestFullscreen) el.requestFullscreen();
  }

  function syncButtons() {
    var go = $('btnStart');
    go.textContent = running() ? 'Pause' : (state.startedAt ? 'Resume' : 'Start');
    $('btnSkip').disabled = !state.startedAt || finished();
    $('btnReset').disabled = !state.startedAt;
  }

  /* ---- wiring ------------------------------------------------------------ */

  function init() {
    if (!$('countdown')) return;
    $('evTitle').textContent = EV.title;
    $('evWindow').textContent = EV.window + ' · scheduled';
    buildList();
    read();
    /* A tab reopened mid-event should not replay every chime it missed. */
    if (state.startedAt) lastPhase = phaseAt(elapsed()).index;
    render();
    syncButtons();

    $('btnStart').addEventListener('click', toggle);
    $('btnSkip').addEventListener('click', skip);
    $('btnReset').addEventListener('click', reset);
    $('btnFull').addEventListener('click', fullscreen);
    $('btnMute').addEventListener('click', function () {
      muted = !muted;
      $('btnMute').textContent = muted ? 'Sound off' : 'Sound on';
      $('btnMute').setAttribute('aria-pressed', muted ? 'true' : 'false');
    });

    document.addEventListener('keydown', function (e) {
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
      if (e.key === ' ') { e.preventDefault(); toggle(); }
      else if (e.key === 'n' || e.key === 'N') skip();
      else if (e.key === 'f' || e.key === 'F') fullscreen();
    });

    setInterval(render, 250);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
