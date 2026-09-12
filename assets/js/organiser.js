/* Ideathon 60 — organiser view: merge team files, export one master sheet. */

(function () {
  'use strict';

  var I = window.IDEATHON;
  var R = window.Registry;
  if (!I || !R) return;

  var statusEl = document.getElementById('importStatus');
  var tableWrap = document.getElementById('tableWrap');
  var emptyState = document.getElementById('emptyState');

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function say(msg, isError) {
    statusEl.textContent = msg;
    statusEl.classList.toggle('error', !!isError);
  }

  function render() {
    var entries = R.all();
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

    tableWrap.hidden = entries.length === 0;
    emptyState.hidden = entries.length !== 0;
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
  }

  function importFiles(fileList) {
    var files = Array.prototype.slice.call(fileList);
    if (!files.length) return;

    say('Reading ' + files.length + ' file' + (files.length > 1 ? 's' : '') + '…');

    var added = 0, skipped = 0;
    var failures = [];

    var chain = files.reduce(function (promise, file) {
      return promise.then(function () {
        return R.readFile(file).then(function (entries) {
          var res = R.merge(entries);
          added += res.added;
          skipped += res.skipped;
        }).catch(function (err) {
          failures.push(err.message);
        });
      });
    }, Promise.resolve());

    chain.then(function () {
      render();
      var parts = [];
      parts.push(added + ' team' + (added === 1 ? '' : 's') + ' added');
      if (skipped) parts.push(skipped + ' already held');
      if (failures.length) parts.push(failures.length + ' file' + (failures.length === 1 ? '' : 's') + ' skipped');
      say(parts.join(' · ') + (failures.length ? ' — ' + failures.join('; ') : ''), failures.length > 0);
    });
  }

  function guard(action) {
    var entries = R.all();
    if (!entries.length) {
      say('Nothing to download yet.', true);
      return null;
    }
    return entries;
  }

  document.getElementById('importInput').addEventListener('change', function (e) {
    importFiles(e.target.files);
    e.target.value = '';
  });

  document.getElementById('xlsxBtn').addEventListener('click', function () {
    var entries = guard();
    if (entries) {
      R.downloadXlsx(entries, 'ideathon-registrations.xlsx');
      say('Downloaded ' + entries.length + ' team' + (entries.length === 1 ? '' : 's') + ' as Excel.');
    }
  });

  document.getElementById('csvBtn').addEventListener('click', function () {
    var entries = guard();
    if (entries) {
      R.downloadCsv(entries, 'ideathon-registrations.csv');
      say('Downloaded ' + entries.length + ' team' + (entries.length === 1 ? '' : 's') + ' as CSV.');
    }
  });

  document.getElementById('clearBtn').addEventListener('click', function () {
    var entries = R.all();
    if (!entries.length) { say('Already empty.'); return; }
    var ok = window.confirm('Delete all ' + entries.length + ' teams stored on this device?\n\n' +
      'This cannot be undone. Download the master sheet first if you have not already.');
    if (!ok) return;
    R.clear();
    render();
    say('Cleared.');
  });

  /* Drag and drop anywhere on the page. */
  ['dragover', 'drop'].forEach(function (type) {
    document.addEventListener(type, function (e) {
      e.preventDefault();
      if (type === 'drop' && e.dataTransfer && e.dataTransfer.files.length) {
        importFiles(e.dataTransfer.files);
      }
    });
  });

  render();
})();
