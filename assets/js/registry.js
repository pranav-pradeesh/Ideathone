/* Ideathon 60 — the registration record.
 *
 * One team is one row. The same column layout is used everywhere: the
 * spreadsheet a team downloads, the CSV, the organiser's master sheet and the
 * import that merges team files back together. Change COLUMNS and every one of
 * those follows.
 */

window.Registry = (function () {
  'use strict';

  var I = window.IDEATHON;
  var STORE_KEY = 'ideathon60.registrations';
  var SHEET_NAME = 'Registrations';

  var MAX_MEMBERS = (I && I.config.maxTeamSize) || 3;

  var COLUMNS = (function () {
    var cols = [
      { key: 'ref', label: 'Reference', width: 16 },
      { key: 'registeredAt', label: 'Registered at', width: 18 },
      { key: 'branch', label: 'Branch of study', width: 24 },
      { key: 'teamName', label: 'Team name', width: 24 },
      { key: 'memberCount', label: 'Members', width: 9 }
    ];
    for (var n = 1; n <= MAX_MEMBERS; n++) {
      cols.push({ key: 'member' + n + 'Name', label: 'Member ' + n + ' name', width: 22 });
      cols.push({ key: 'member' + n + 'Phone', label: 'Member ' + n + ' phone', width: 15 });
    }
    return cols;
  })();

  var MAX = MAX_MEMBERS;

  /* ---- record shape ------------------------------------------------------ */

  function toRow(entry) {
    var members = entry.members || [];
    return COLUMNS.map(function (c) {
      if (c.key === 'memberCount') return members.length;
      var m = /^member(\d+)(Name|Phone)$/.exec(c.key);
      if (m) {
        var member = members[parseInt(m[1], 10) - 1];
        if (!member) return '';
        /* A phone stays text: leading zeros and a + prefix must survive Excel. */
        return (m[2] === 'Name' ? member.name : member.phone) || '';
      }
      return entry[c.key] == null ? '' : entry[c.key];
    });
  }

  function header() {
    return COLUMNS.map(function (c) { return c.label; });
  }

  /* Build an entry from a row, using the file's own header order so a
     re-ordered or partly-edited sheet still imports. */
  function fromRow(row, index) {
    function get(key) {
      var i = index[key];
      return (i === undefined || row[i] === undefined) ? '' : String(row[i]).trim();
    }
    var members = [];
    for (var n = 1; n <= MAX; n++) {
      var name = get('member' + n + 'Name');
      var phone = get('member' + n + 'Phone');
      if (name) members.push({ name: name, phone: phone });
    }
    if (!get('teamName') || !members.length) return null;
    return {
      ref: get('ref') || makeRef(get('teamName')),
      registeredAt: get('registeredAt'),
      branch: get('branch'),
      teamName: get('teamName'),
      members: members
    };
  }

  /* Map a header row to column keys, matching on the printed label. */
  function indexHeader(row) {
    var index = {};
    row.forEach(function (cell, i) {
      var label = String(cell || '').trim().toLowerCase();
      COLUMNS.forEach(function (c) {
        if (c.label.toLowerCase() === label) index[c.key] = i;
      });
    });
    return index;
  }

  function makeRef(teamName) {
    var slug = (String(teamName).toUpperCase().replace(/[^A-Z0-9]/g, '') + 'XXX').slice(0, 3);
    return 'ID60-' + slug + '-' + Math.floor(Math.random() * 9000 + 1000);
  }

  function stamp(d) {
    d = d || new Date();
    function p(n) { return (n < 10 ? '0' : '') + n; }
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) +
      ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
  }

  /* ---- phone numbers ------------------------------------------------------ */

  /* Accepts what people actually type: spaces, dashes, brackets, a +91 or 0
     prefix. Returns the bare 10 digits, or '' if it is not a usable number. */
  function normalisePhone(raw) {
    var d = String(raw == null ? '' : raw).replace(/\D/g, '');
    if (d.length === 12 && d.slice(0, 2) === '91') d = d.slice(2);
    else if (d.length === 11 && d[0] === '0') d = d.slice(1);
    return d.length === 10 ? d : '';
  }

  function phoneProblem(raw) {
    var d = String(raw == null ? '' : raw).replace(/\D/g, '');
    if (!d) return 'Phone number required.';
    if (!normalisePhone(raw)) {
      return d.length < 10 ? 'Too short — we need 10 digits.' : 'That is not a 10-digit number.';
    }
    return '';
  }

  /* ---- local storage ------------------------------------------------------ */

  function all() {
    try {
      var v = JSON.parse(localStorage.getItem(STORE_KEY) || '[]');
      return Array.isArray(v) ? v : [];
    } catch (e) {
      return [];
    }
  }

  function save(list) {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(list));
      return true;
    } catch (e) {
      return false;
    }
  }

  function add(entry) {
    var list = all();
    list.push(entry);
    return save(list);
  }

  function clear() {
    try { localStorage.removeItem(STORE_KEY); } catch (e) {}
  }

  function hasTeamName(name) {
    var key = String(name).trim().toLowerCase();
    return all().some(function (e) {
      return String(e.teamName).trim().toLowerCase() === key;
    });
  }

  /* ---- CSV ---------------------------------------------------------------- */

  function csv(entries) {
    var lines = [row(header())];
    entries.forEach(function (e) { lines.push(row(toRow(e))); });
    return lines.join('\r\n');

    function row(values) {
      return values.map(function (v) {
        return '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
      }).join(',');
    }
  }

  /* RFC 4180: quoted fields may contain commas, quotes and newlines. */
  function parseCsv(text) {
    var rows = [];
    var row = [];
    var field = '';
    var quoted = false;
    var i = 0;

    text = text.replace(/^﻿/, '');

    while (i < text.length) {
      var ch = text[i];
      if (quoted) {
        if (ch === '"') {
          if (text[i + 1] === '"') { field += '"'; i += 2; continue; }
          quoted = false; i++; continue;
        }
        field += ch; i++; continue;
      }
      if (ch === '"') { quoted = true; i++; continue; }
      if (ch === ',') { row.push(field); field = ''; i++; continue; }
      if (ch === '\r') { i++; continue; }
      if (ch === '\n') { row.push(field); rows.push(row); row = []; field = ''; i++; continue; }
      field += ch; i++;
    }
    if (field !== '' || row.length) { row.push(field); rows.push(row); }
    return rows.filter(function (r) {
      return r.some(function (c) { return String(c).trim() !== ''; });
    });
  }

  /* ---- spreadsheet -------------------------------------------------------- */

  function workbook(entries) {
    var rows = [header()];
    entries.forEach(function (e) { rows.push(toRow(e)); });
    return window.MiniXlsx.build([{
      name: SHEET_NAME,
      rows: rows,
      widths: COLUMNS.map(function (c) { return c.width; })
    }]);
  }

  /* ---- download ----------------------------------------------------------- */

  function download(blob, filename) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1500);
  }

  function safeName(s) {
    return String(s).replace(/[^A-Za-z0-9 _-]/g, '').trim().replace(/\s+/g, '-') || 'team';
  }

  function downloadXlsx(entries, filename) {
    download(workbook(entries), filename);
  }

  function downloadCsv(entries, filename) {
    download(new Blob(['﻿' + csv(entries)], { type: 'text/csv;charset=utf-8' }), filename);
  }

  /* ---- import ------------------------------------------------------------- */

  /* Turn a .csv or .xlsx file into entries. Returns a promise. */
  function readFile(file) {
    var name = (file.name || '').toLowerCase();

    if (/\.csv$/.test(name)) {
      return file.text().then(function (text) {
        return rowsToEntries(parseCsv(text), file.name);
      });
    }

    if (/\.xlsx$/.test(name)) {
      return file.arrayBuffer().then(function (buf) {
        var sheets = window.MiniXlsx.read(buf);
        for (var i = 0; i < sheets.length; i++) {
          var index = indexHeader(sheets[i].rows[0] || []);
          if (index.teamName !== undefined) {
            return rowsToEntries(sheets[i].rows, file.name);
          }
        }
        throw new Error('no "Team name" column found in ' + file.name);
      });
    }

    return Promise.reject(new Error(file.name + ' is not a .csv or .xlsx file'));
  }

  function rowsToEntries(rows, filename) {
    if (!rows.length) throw new Error(filename + ' is empty');
    var index = indexHeader(rows[0]);
    if (index.teamName === undefined) {
      throw new Error(filename + ' has no "Team name" column — is it a registration sheet?');
    }
    var out = [];
    for (var r = 1; r < rows.length; r++) {
      var entry = fromRow(rows[r], index);
      if (entry) out.push(entry);
    }
    if (!out.length) throw new Error(filename + ' contained no team rows');
    return out;
  }

  /* Merge incoming entries into the store, skipping ones already held.
     A team is "already held" if its reference matches, or its name matches. */
  function merge(incoming) {
    var list = all();
    var refs = {};
    var names = {};
    list.forEach(function (e) {
      refs[e.ref] = true;
      names[String(e.teamName).trim().toLowerCase()] = true;
    });

    var added = 0, skipped = 0;
    incoming.forEach(function (e) {
      var nameKey = String(e.teamName).trim().toLowerCase();
      if (refs[e.ref] || names[nameKey]) { skipped++; return; }
      refs[e.ref] = true;
      names[nameKey] = true;
      list.push(e);
      added++;
    });

    save(list);
    return { added: added, skipped: skipped, total: list.length };
  }

  /* ---- submission ---------------------------------------------------------- */

  /* Send to the API when one is reachable, otherwise keep it on this device.
     Resolves with the mode actually used so the page can say which happened. */
  function submit(entry) {
    if (typeof fetch !== 'function' || location.protocol === 'file:') {
      return Promise.resolve(localOnly(entry));
    }

    return fetch('api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry)
    }).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (body) {
        if (res.ok && body.ok) {
          add({ ref: body.ref || entry.ref, registeredAt: body.registeredAt || entry.registeredAt,
                branch: entry.branch, teamName: entry.teamName, members: entry.members });
          return { mode: 'server', ref: body.ref || entry.ref, entry: entry };
        }
        if (res.status === 409) {
          var err = new Error(body.error || 'That team name is already registered.');
          err.field = body.field || 'teamName';
          throw err;
        }
        if (res.status === 400) {
          var bad = new Error(body.error || 'The server rejected that entry.');
          bad.field = body.field;
          throw bad;
        }
        if (res.status === 429) {
          throw new Error(body.error || 'Too many registrations from this connection. Wait a few minutes.');
        }
        /* 404 (no API deployed) or 503 (no database configured): fall back so a
           registration desk still works rather than losing the entry. */
        if (res.status === 404 || res.status === 503) return localOnly(entry);
        throw new Error(body.error || ('The server replied ' + res.status + '.'));
      });
    }).catch(function (err) {
      if (err && err.field) throw err;
      if (err instanceof TypeError) return localOnly(entry);   // offline / no network
      throw err;
    });
  }

  function localOnly(entry) {
    if (!add(entry)) {
      throw new Error('This browser refused to save the entry. Try a normal (non-private) window.');
    }
    return { mode: 'local', ref: entry.ref, entry: entry };
  }

  return {
    COLUMNS: COLUMNS,
    normalisePhone: normalisePhone,
    phoneProblem: phoneProblem,
    submit: submit,
    MAX: MAX,
    header: header,
    toRow: toRow,
    makeRef: makeRef,
    stamp: stamp,
    all: all,
    add: add,
    clear: clear,
    hasTeamName: hasTeamName,
    csv: csv,
    parseCsv: parseCsv,
    workbook: workbook,
    downloadXlsx: downloadXlsx,
    downloadCsv: downloadCsv,
    safeName: safeName,
    readFile: readFile,
    merge: merge
  };
})();
