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

  var COLUMNS = [
    { key: 'ref', label: 'Reference', width: 16 },
    { key: 'registeredAt', label: 'Registered at', width: 20 },
    { key: 'branch', label: 'Branch of study', width: 24 },
    { key: 'teamName', label: 'Team name', width: 26 },
    { key: 'memberCount', label: 'Members', width: 10 },
    { key: 'member1', label: 'Member 1', width: 24 },
    { key: 'member2', label: 'Member 2', width: 24 },
    { key: 'member3', label: 'Member 3', width: 24 }
  ];

  var MAX = (I && I.config.maxTeamSize) || 3;

  /* ---- record shape ------------------------------------------------------ */

  function toRow(entry) {
    return COLUMNS.map(function (c) {
      if (c.key === 'memberCount') return entry.members.length;
      if (/^member\d$/.test(c.key)) {
        return entry.members[parseInt(c.key.slice(6), 10) - 1] || '';
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
      var v = get('member' + n);
      if (v) members.push(v);
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

  return {
    COLUMNS: COLUMNS,
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
