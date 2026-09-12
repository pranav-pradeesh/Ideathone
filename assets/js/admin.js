/* Ideathon 60 — admin view.
 *
 * Nothing here is a security boundary: hiding the table until "signed in" is a
 * convenience. The data only ever arrives if the API accepts the session
 * cookie, and the API is what enforces that.
 */

(function () {
  'use strict';

  var I = window.IDEATHON;
  var R = window.Registry;
  if (!I || !R) return;

  var loginView = document.getElementById('loginView');
  var adminView = document.getElementById('adminView');
  var loginForm = document.getElementById('loginForm');
  var loginStatus = document.getElementById('loginStatus');
  var loginBtn = document.getElementById('loginBtn');
  var passwordInput = document.getElementById('password');
  var setupNote = document.getElementById('setupNote');
  var adminStatus = document.getElementById('adminStatus');
  var logoutBtn = document.getElementById('logoutBtn');

  var entries = [];

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function say(node, msg, isError) {
    node.textContent = msg || '';
    node.classList.toggle('error', !!isError);
  }

  function api(path, options) {
    return fetch(path, Object.assign({ credentials: 'same-origin' }, options || {}))
      .then(function (res) {
        return res.json().catch(function () { return {}; }).then(function (body) {
          return { status: res.status, ok: res.ok, body: body };
        });
      });
  }

  /* ---- views -------------------------------------------------------------- */

  function showLogin(message, isError) {
    loginView.hidden = false;
    adminView.hidden = true;
    logoutBtn.hidden = true;
    if (message) say(loginStatus, message, isError);
    passwordInput.focus();
  }

  function showAdmin() {
    loginView.hidden = true;
    adminView.hidden = false;
    logoutBtn.hidden = false;
  }

  /* ---- boot --------------------------------------------------------------- */

  function start() {
    if (location.protocol === 'file:') {
      showLogin('', false);
      setupNote.hidden = false;
      setupNote.textContent = 'Opened from the filesystem, so there is no API to sign in to. ' +
        'Deploy to Vercel, or run "vercel dev", to use this page.';
      loginBtn.disabled = true;
      return;
    }

    api('api/admin/login').then(function (r) {
      if (r.body && r.body.authed) {
        showAdmin();
        load();
        return;
      }
      showLogin();
      if (r.body && r.body.configured === false) {
        setupNote.hidden = false;
        setupNote.textContent = 'No ADMIN_PASSWORD is set on this deployment, so sign-in is ' +
          'closed. Add it in Vercel → Settings → Environment Variables, then redeploy.';
        loginBtn.disabled = true;
      } else if (r.body && r.body.database === false) {
        setupNote.hidden = false;
        setupNote.textContent = 'No database is connected, so there is nothing to collect yet. ' +
          'Add a Postgres store in Vercel → Storage, then redeploy.';
      }
    }).catch(function () {
      showLogin('Could not reach the server.', true);
    });
  }

  loginForm.addEventListener('submit', function (e) {
    e.preventDefault();
    var pw = passwordInput.value;
    if (!pw) { say(loginStatus, 'Enter the password.', true); return; }

    loginBtn.disabled = true;
    say(loginStatus, 'Checking…');

    api('api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: pw })
    }).then(function (r) {
      loginBtn.disabled = false;
      passwordInput.value = '';
      if (r.ok && r.body.ok) {
        say(loginStatus, '');
        showAdmin();
        load();
        return;
      }
      say(loginStatus, r.body.error || 'Sign-in failed.', true);
    }).catch(function () {
      loginBtn.disabled = false;
      say(loginStatus, 'Could not reach the server.', true);
    });
  });

  logoutBtn.addEventListener('click', function () {
    api('api/admin/logout', { method: 'POST' }).then(function () {
      entries = [];
      showLogin('Signed out.');
    });
  });

  /* ---- data --------------------------------------------------------------- */

  function load() {
    say(adminStatus, 'Loading…');
    api('api/admin/registrations').then(function (r) {
      if (r.status === 401) { showLogin('Your session expired. Sign in again.', true); return; }
      if (!r.ok || !r.body.ok) { say(adminStatus, r.body.error || 'Could not load.', true); return; }
      entries = r.body.entries || [];
      render();
      say(adminStatus, entries.length + ' team' + (entries.length === 1 ? '' : 's') + ' loaded.');
    }).catch(function () {
      say(adminStatus, 'Could not reach the server.', true);
    });
  }

  function render() {
    var people = entries.reduce(function (a, e) { return a + e.members.length; }, 0);
    var branches = {};
    entries.forEach(function (e) {
      var b = e.branch || 'Not stated';
      if (!branches[b]) branches[b] = { teams: 0, people: 0 };
      branches[b].teams++;
      branches[b].people += e.members.length;
    });

    document.getElementById('statTeams').textContent = entries.length;
    document.getElementById('statPeople').textContent = people;
    document.getElementById('statBranches').textContent = Object.keys(branches).length;
    document.getElementById('statPods').textContent =
      entries.length ? Math.ceil(entries.length / I.pitchCapacity()) : 0;

    document.getElementById('adminTables').hidden = entries.length === 0;
    document.getElementById('adminEmpty').hidden = entries.length !== 0;
    if (!entries.length) return;

    var head = document.getElementById('tableHead');
    head.textContent = '';
    R.header().forEach(function (label) { head.appendChild(el('th', null, label)); });

    var body = document.getElementById('tableBody');
    body.textContent = '';
    entries.forEach(function (e) {
      var tr = el('tr');
      R.toRow(e).forEach(function (v, i) {
        var td = el('td', null, String(v == null ? '' : v));
        td.setAttribute('data-label', R.COLUMNS[i].label);
        tr.appendChild(td);
      });
      body.appendChild(tr);
    });

    var bBody = document.getElementById('branchBody');
    bBody.textContent = '';
    Object.keys(branches).sort().forEach(function (name) {
      var tr = el('tr');
      var td = el('td');
      td.setAttribute('data-label', 'Branch of study');
      td.appendChild(el('span', 'role-name', name));
      tr.appendChild(td);
      [['Teams', branches[name].teams], ['Participants', branches[name].people]].forEach(function (pair) {
        var c = el('td', null, String(pair[1]));
        c.setAttribute('data-label', pair[0]);
        tr.appendChild(c);
      });
      bBody.appendChild(tr);
    });

    if (window.IdeathonSite) window.IdeathonSite.markScrollables();
  }

  function guard() {
    if (!entries.length) { say(adminStatus, 'Nothing to download yet.', true); return null; }
    return entries;
  }

  document.getElementById('xlsxBtn').addEventListener('click', function () {
    var list = guard();
    if (list) {
      R.downloadXlsx(list, 'ideathon-registrations.xlsx');
      say(adminStatus, 'Downloaded ' + list.length + ' teams as Excel.');
    }
  });

  document.getElementById('csvBtn').addEventListener('click', function () {
    var list = guard();
    if (list) {
      R.downloadCsv(list, 'ideathon-registrations.csv');
      say(adminStatus, 'Downloaded ' + list.length + ' teams as CSV.');
    }
  });

  document.getElementById('refreshBtn').addEventListener('click', load);

  start();
})();
