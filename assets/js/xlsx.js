/* Minimal .xlsx writer and reader — no dependencies.
 *
 * An .xlsx file is a ZIP of XML parts. This writes that ZIP with STORED
 * (uncompressed) entries, which keeps the code to a CRC32 table and three
 * record headers. Excel, LibreOffice, Numbers and Google Sheets all open it.
 *
 * The reader is deliberately narrow: it reads back files this writer produced,
 * which is what the organiser page needs when merging team submissions. A file
 * that has been re-saved by Excel is deflated, and the reader says so clearly
 * instead of returning nonsense.
 */

window.MiniXlsx = (function () {
  'use strict';

  var enc = new TextEncoder();

  /* ---- CRC32 ------------------------------------------------------------- */

  var CRC = (function () {
    var t = new Uint32Array(256);
    for (var i = 0; i < 256; i++) {
      var c = i;
      for (var k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      t[i] = c >>> 0;
    }
    return t;
  })();

  function crc32(bytes) {
    var c = 0xFFFFFFFF;
    for (var i = 0; i < bytes.length; i++) c = CRC[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8);
    return (c ^ 0xFFFFFFFF) >>> 0;
  }

  /* ---- ZIP (store only) --------------------------------------------------- */

  function dosTime(d) {
    return ((d.getHours() << 11) | (d.getMinutes() << 5) | (Math.floor(d.getSeconds() / 2))) & 0xFFFF;
  }
  function dosDate(d) {
    return (((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate()) & 0xFFFF;
  }

  function zip(entries) {
    var now = new Date();
    var time = dosTime(now), date = dosDate(now);
    var parts = [];
    var central = [];
    var offset = 0;

    entries.forEach(function (e) {
      var name = enc.encode(e.name);
      var data = e.data;
      var crc = crc32(data);

      var lh = new Uint8Array(30 + name.length);
      var lv = new DataView(lh.buffer);
      lv.setUint32(0, 0x04034b50, true);
      lv.setUint16(4, 20, true);          // version needed
      lv.setUint16(6, 0, true);           // flags
      lv.setUint16(8, 0, true);           // method: stored
      lv.setUint16(10, time, true);
      lv.setUint16(12, date, true);
      lv.setUint32(14, crc, true);
      lv.setUint32(18, data.length, true);
      lv.setUint32(22, data.length, true);
      lv.setUint16(26, name.length, true);
      lv.setUint16(28, 0, true);
      lh.set(name, 30);

      parts.push(lh, data);

      var ch = new Uint8Array(46 + name.length);
      var cv = new DataView(ch.buffer);
      cv.setUint32(0, 0x02014b50, true);
      cv.setUint16(4, 20, true);          // version made by
      cv.setUint16(6, 20, true);          // version needed
      cv.setUint16(8, 0, true);
      cv.setUint16(10, 0, true);
      cv.setUint16(12, time, true);
      cv.setUint16(14, date, true);
      cv.setUint32(16, crc, true);
      cv.setUint32(20, data.length, true);
      cv.setUint32(24, data.length, true);
      cv.setUint16(28, name.length, true);
      cv.setUint32(42, offset, true);
      ch.set(name, 46);
      central.push(ch);

      offset += lh.length + data.length;
    });

    var cdSize = central.reduce(function (a, c) { return a + c.length; }, 0);
    var end = new Uint8Array(22);
    var ev = new DataView(end.buffer);
    ev.setUint32(0, 0x06054b50, true);
    ev.setUint16(8, entries.length, true);
    ev.setUint16(10, entries.length, true);
    ev.setUint32(12, cdSize, true);
    ev.setUint32(16, offset, true);

    return new Blob(parts.concat(central, [end]), {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
  }

  /* ---- workbook XML ------------------------------------------------------- */

  function esc(s) {
    return String(s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      /* strip control characters Excel rejects outright */
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');
  }

  function colName(n) {
    var s = '';
    n += 1;
    while (n > 0) {
      var r = (n - 1) % 26;
      s = String.fromCharCode(65 + r) + s;
      n = Math.floor((n - 1) / 26);
    }
    return s;
  }

  function sheetXml(sheet) {
    var rows = sheet.rows || [];
    var widths = sheet.widths || [];

    var cols = '';
    if (widths.length) {
      cols = '<cols>' + widths.map(function (w, i) {
        return '<col min="' + (i + 1) + '" max="' + (i + 1) + '" width="' + w + '" customWidth="1"/>';
      }).join('') + '</cols>';
    }

    var body = rows.map(function (row, r) {
      var cells = row.map(function (val, c) {
        if (val === null || val === undefined || val === '') return '';
        var ref = colName(c) + (r + 1);
        var style = r === 0 ? ' s="1"' : '';
        if (typeof val === 'number' && isFinite(val)) {
          return '<c r="' + ref + '"' + style + '><v>' + val + '</v></c>';
        }
        return '<c r="' + ref + '" t="inlineStr"' + style +
          '><is><t xml:space="preserve">' + esc(val) + '</t></is></c>';
      }).join('');
      return '<row r="' + (r + 1) + '">' + cells + '</row>';
    }).join('');

    var freeze = '<sheetViews><sheetView workbookViewId="0">' +
      '<pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/>' +
      '</sheetView></sheetViews>';

    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
      freeze + cols + '<sheetData>' + body + '</sheetData></worksheet>';
  }

  var STYLES =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    '<fonts count="2">' +
      '<font><sz val="11"/><name val="Calibri"/></font>' +
      '<font><b/><sz val="11"/><color rgb="FF1A1205"/><name val="Calibri"/></font>' +
    '</fonts>' +
    '<fills count="3">' +
      '<fill><patternFill patternType="none"/></fill>' +
      '<fill><patternFill patternType="gray125"/></fill>' +
      '<fill><patternFill patternType="solid"><fgColor rgb="FFFFB020"/><bgColor indexed="64"/></patternFill></fill>' +
    '</fills>' +
    '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>' +
    '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
    '<cellXfs count="2">' +
      '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>' +
      '<xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/>' +
    '</cellXfs>' +
    '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>' +
    '</styleSheet>';

  function build(sheets) {
    var files = [];

    var types = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
      '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
      '<Default Extension="xml" ContentType="application/xml"/>' +
      '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
      '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
      sheets.map(function (s, i) {
        return '<Override PartName="/xl/worksheets/sheet' + (i + 1) + '.xml" ' +
          'ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>';
      }).join('') +
      '</Types>';

    var rels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
      '</Relationships>';

    var wb = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" ' +
      'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>' +
      sheets.map(function (s, i) {
        return '<sheet name="' + esc(s.name) + '" sheetId="' + (i + 1) + '" r:id="rId' + (i + 1) + '"/>';
      }).join('') +
      '</sheets></workbook>';

    var wbRels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      sheets.map(function (s, i) {
        return '<Relationship Id="rId' + (i + 1) + '" ' +
          'Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" ' +
          'Target="worksheets/sheet' + (i + 1) + '.xml"/>';
      }).join('') +
      '<Relationship Id="rId' + (sheets.length + 1) + '" ' +
      'Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>' +
      '</Relationships>';

    files.push({ name: '[Content_Types].xml', data: enc.encode(types) });
    files.push({ name: '_rels/.rels', data: enc.encode(rels) });
    files.push({ name: 'xl/workbook.xml', data: enc.encode(wb) });
    files.push({ name: 'xl/_rels/workbook.xml.rels', data: enc.encode(wbRels) });
    files.push({ name: 'xl/styles.xml', data: enc.encode(STYLES) });
    sheets.forEach(function (s, i) {
      files.push({ name: 'xl/worksheets/sheet' + (i + 1) + '.xml', data: enc.encode(sheetXml(s)) });
    });

    return zip(files);
  }

  /* ---- reader (stored entries only) --------------------------------------- */

  function unzip(buffer) {
    var bytes = new Uint8Array(buffer);
    var view = new DataView(buffer);

    // Walk back from the end to find the end-of-central-directory record.
    var eocd = -1;
    for (var i = bytes.length - 22; i >= 0 && i > bytes.length - 65558; i--) {
      if (view.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
    }
    if (eocd < 0) throw new Error('not a zip archive');

    var count = view.getUint16(eocd + 10, true);
    var p = view.getUint32(eocd + 16, true);
    var out = {};
    var dec = new TextDecoder();

    for (var n = 0; n < count; n++) {
      if (view.getUint32(p, true) !== 0x02014b50) throw new Error('damaged central directory');
      var method = view.getUint16(p + 10, true);
      var size = view.getUint32(p + 24, true);
      var nameLen = view.getUint16(p + 28, true);
      var extraLen = view.getUint16(p + 30, true);
      var commentLen = view.getUint16(p + 32, true);
      var local = view.getUint32(p + 42, true);
      var name = dec.decode(bytes.subarray(p + 46, p + 46 + nameLen));

      if (method !== 0) {
        throw new Error('this spreadsheet is compressed (it was re-saved by a ' +
          'spreadsheet app). Export it as CSV and import that instead.');
      }

      var lNameLen = view.getUint16(local + 26, true);
      var lExtraLen = view.getUint16(local + 28, true);
      var start = local + 30 + lNameLen + lExtraLen;
      out[name] = dec.decode(bytes.subarray(start, start + size));

      p += 46 + nameLen + extraLen + commentLen;
    }
    return out;
  }

  function unesc(s) {
    return s.replace(/&lt;/g, '<').replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"').replace(/&apos;/g, "'")
      .replace(/&#(\d+);/g, function (_, d) { return String.fromCharCode(+d); })
      .replace(/&amp;/g, '&');
  }

  function colIndex(ref) {
    var m = /^([A-Z]+)/.exec(ref || '');
    if (!m) return 0;
    var n = 0;
    for (var i = 0; i < m[1].length; i++) n = n * 26 + (m[1].charCodeAt(i) - 64);
    return n - 1;
  }

  function parseSheet(xml) {
    var rows = [];
    var rowRe = /<row[^>]*>([\s\S]*?)<\/row>/g;
    var rm;
    while ((rm = rowRe.exec(xml))) {
      var cells = [];
      var cellRe = /<c\s([^>]*?)\/?>(?:([\s\S]*?)<\/c>)?/g;
      var cm;
      while ((cm = cellRe.exec(rm[1]))) {
        var attrs = cm[1] || '';
        var inner = cm[2] || '';
        var refM = /r="([A-Z]+\d+)"/.exec(attrs);
        var idx = colIndex(refM ? refM[1] : '');
        var val = '';
        var isM = /<t[^>]*>([\s\S]*?)<\/t>/.exec(inner);
        if (isM) {
          val = unesc(isM[1]);
        } else {
          var vM = /<v>([\s\S]*?)<\/v>/.exec(inner);
          if (vM) val = unesc(vM[1]);
        }
        while (cells.length < idx) cells.push('');
        cells[idx] = val;
      }
      rows.push(cells);
    }
    return rows;
  }

  /* Returns [{ name, rows }] in workbook order. */
  function read(buffer) {
    var files = unzip(buffer);
    var wb = files['xl/workbook.xml'] || '';
    var names = [];
    var re = /<sheet\s[^>]*name="([^"]*)"/g;
    var m;
    while ((m = re.exec(wb))) names.push(unesc(m[1]));

    var sheets = [];
    for (var i = 1; ; i++) {
      var key = 'xl/worksheets/sheet' + i + '.xml';
      if (!files[key]) break;
      sheets.push({ name: names[i - 1] || ('Sheet' + i), rows: parseSheet(files[key]) });
    }
    if (!sheets.length) throw new Error('no worksheets found in this file');
    return sheets;
  }

  return { build: build, read: read, escapeXml: esc, colName: colName };
})();
