/* Ideathon 60 — shared rendering for the home page, role book and footer. */

(function () {
  'use strict';

  var I = window.IDEATHON;
  if (!I) return;
  var cfg = I.config;

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function all(sel) {
    return Array.prototype.slice.call(document.querySelectorAll(sel));
  }

  /* ---- simple text bindings --------------------------------------------- */

  function bindText() {
    all('[data-bind="event-name"]').forEach(function (n) { n.textContent = cfg.name; });
    all('[data-bind="event-date"]').forEach(function (n) { n.textContent = cfg.date || 'TBA'; });
    all('[data-bind="event-venue"]').forEach(function (n) { n.textContent = cfg.venue || 'TBA'; });
    all('[data-bind="max-team"]').forEach(function (n) { n.textContent = String(cfg.maxTeamSize); });
    all('[data-bind="pitch-capacity"]').forEach(function (n) { n.textContent = String(I.pitchCapacity()); });
    all('[data-bind="ai-disclosure"]').forEach(function (n) { n.textContent = I.aiPolicy.disclosure; });

    all('[data-bind="footer-name"]').forEach(function (n) {
      n.textContent = cfg.name + ' · ' + cfg.tagline;
    });
    all('[data-bind="footer-contact"]').forEach(function (n) {
      n.textContent = '';
      /* Deliberately no link to admin.html from any public page. */
      if (cfg.contactEmail) {
        var a = el('a', null, cfg.contactEmail);
        a.href = 'mailto:' + cfg.contactEmail;
        n.appendChild(a);
      } else {
        n.appendChild(document.createTextNode('Questions? Ask an organiser.'));
      }
    });

    document.title = document.title.replace(/^Ideathon 60/, cfg.name);
  }

  /* ---- schedule timeline ------------------------------------------------- */

  function renderTimeline(host) {
    host.textContent = '';
    I.schedule.forEach(function (p) {
      var row = el('div', 'phase');
      row.setAttribute('data-ai', p.ai);

      var time = el('div', 'clock');
      time.appendChild(document.createTextNode(I.clock(p.start) + '–' + I.clock(p.start + p.minutes)));
      time.appendChild(el('span', 'dur', p.minutes + ' min'));
      row.appendChild(time);

      var body = el('div');
      var h = el('h3', null, p.name);
      if (p.ai === 'yes') h.appendChild(el('span', 'tag ai', 'AI allowed'));
      if (p.ai === 'no') h.appendChild(el('span', 'tag noai', 'No AI'));
      body.appendChild(h);
      body.appendChild(el('p', null, p.what));
      if (p.owner) body.appendChild(el('div', 'owner', p.owner));
      row.appendChild(body);

      host.appendChild(row);
    });
  }

  /* ---- role cards -------------------------------------------------------- */

  function renderRoleCards(host) {
    host.textContent = '';
    I.roles.forEach(function (r, i) {
      var c = el('div', 'card');
      c.appendChild(el('div', 'role-no', 'Role ' + (i + 1)));
      c.appendChild(el('h3', null, r.name));
      c.appendChild(el('p', null, r.short));
      var ul = el('ul', 'ticks');
      r.owns.slice(0, 3).forEach(function (o) { ul.appendChild(el('li', null, o)); });
      c.appendChild(ul);
      var a = el('a', null, 'Full brief →');
      a.href = 'rolebook.html#' + r.id;
      c.appendChild(a);
      host.appendChild(c);
    });
  }

  function renderTeamShapes(host) {
    host.textContent = '';
    I.teamShapes.forEach(function (s) {
      var tr = el('tr');
      var td1 = el('td');
      td1.setAttribute('data-label', 'Team size');
      td1.appendChild(el('span', 'role-name', s.label));
      tr.appendChild(td1);
      var td2 = el('td', null, s.how);
      td2.setAttribute('data-label', 'Roles');
      tr.appendChild(td2);
      host.appendChild(tr);
    });
  }

  /* ---- AI policy lists --------------------------------------------------- */

  function renderList(host, items) {
    host.textContent = '';
    items.forEach(function (t) { host.appendChild(el('li', null, t)); });
  }

  /* ---- role book --------------------------------------------------------- */

  function renderRoleBook(host) {
    host.textContent = '';
    I.roles.forEach(function (r, i) {
      var block = el('section', 'role-block');
      block.id = r.id;

      var head = el('header');
      head.appendChild(el('div', 'role-no', 'Role ' + (i + 1) + ' of ' + I.roles.length));
      head.appendChild(el('h2', null, r.name));
      head.appendChild(el('p', 'subtitle', r.short));
      block.appendChild(head);

      block.appendChild(el('p', null, r.summary));

      var cols = el('div', 'role-cols');
      cols.appendChild(column('Owns', r.owns));
      cols.appendChild(column('Delivers', r.delivers));
      cols.appendChild(column('Common failures', r.avoid));
      block.appendChild(cols);

      var mh = el('h4', null, 'Minute by minute');
      mh.style.cssText = 'font-family:var(--mono);font-size:.72rem;letter-spacing:.12em;text-transform:uppercase;color:var(--cyan);margin:26px 0 10px';
      block.appendChild(mh);

      var ml = el('ul', 'minute-list');
      r.minutes.forEach(function (m) {
        var li = el('li');
        li.appendChild(el('b', null, m.t));
        li.appendChild(el('span', null, m.do));
        ml.appendChild(li);
      });
      block.appendChild(ml);

      var ai = el('div', 'callout');
      ai.style.marginTop = '24px';
      var aih = el('h4', null, 'AI in this role');
      aih.style.cssText = 'font-family:var(--mono);font-size:.72rem;letter-spacing:.12em;text-transform:uppercase;color:var(--violet);margin:0 0 8px';
      ai.appendChild(aih);
      ai.appendChild(el('p', null, r.ai));
      block.appendChild(ai);

      host.appendChild(block);
    });
  }

  function column(title, items) {
    var d = el('div');
    d.appendChild(el('h4', null, title));
    var ul = el('ul');
    items.forEach(function (t) { ul.appendChild(el('li', null, t)); });
    d.appendChild(ul);
    return d;
  }

  function renderRoleToc(host) {
    host.textContent = '';
    I.roles.forEach(function (r) {
      var a = el('a', null, r.name);
      a.href = '#' + r.id;
      host.appendChild(a);
    });
  }

  /* ---- pod planner ------------------------------------------------------- */

  function initPlanner() {
    var input = document.getElementById('teamCount');
    if (!input) return;
    var cap = I.pitchCapacity();

    function update() {
      var teams = parseInt(input.value, 10);
      if (isNaN(teams) || teams < 1) teams = 1;
      var pods = Math.ceil(teams / cap);
      var perPod = Math.ceil(teams / pods);
      setText('podCount', pods);
      setText('judgeCount', pods);
      setText('roomCount', pods);
      setText('perPod', perPod);
    }

    function setText(id, v) {
      var n = document.getElementById(id);
      if (n) n.textContent = String(v);
    }

    input.addEventListener('input', update);
    update();
  }

  /* ---- wide tables -------------------------------------------------------- */

  /* Mark the containers that actually overflow, so the "scrolls sideways" hint
     only appears when it is true. */
  function markScrollables() {
    all('.table-scroll').forEach(function (box) {
      box.classList.toggle('is-scrollable', box.scrollWidth > box.clientWidth + 1);
    });
  }

  window.IdeathonSite = { markScrollables: markScrollables };

  /* ---- boot -------------------------------------------------------------- */

  function boot() {
    bindText();

    var t = document.querySelector('[data-render="timeline"]');
    if (t) renderTimeline(t);

    var rc = document.querySelector('[data-render="role-cards"]');
    if (rc) renderRoleCards(rc);

    var ts = document.querySelector('[data-render="team-shapes"]');
    if (ts) renderTeamShapes(ts);

    var ok = document.querySelector('[data-render="ai-allowed"]');
    if (ok) renderList(ok, I.aiPolicy.allowed);

    var no = document.querySelector('[data-render="ai-not-allowed"]');
    if (no) renderList(no, I.aiPolicy.notAllowed);

    var rb = document.querySelector('[data-render="role-book"]');
    if (rb) renderRoleBook(rb);

    var toc = document.querySelector('[data-render="role-toc"]');
    if (toc) renderRoleToc(toc);

    initPlanner();
    markScrollables();

    var pending;
    window.addEventListener('resize', function () {
      clearTimeout(pending);
      pending = setTimeout(markScrollables, 120);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
