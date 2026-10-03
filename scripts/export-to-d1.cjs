const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

function escapeSqlValue(val) {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'number') return String(val);
  if (typeof val === 'boolean') return val ? '1' : '0';
  if (Buffer.isBuffer(val)) return "X'" + val.toString('hex') + "'";
  if (val instanceof Date) return "'" + val.toISOString().replace('T', ' ').replace('Z', '') + "'";
  const str = String(val).replace(/'/g, "''");
  return "'" + str + "'";
}

function convertColumnDef(line) {
  let l = line.trim();
  if (l.endsWith(',')) l = l.slice(0, -1).trim();

  // Primary key inline
  if (/^`id`\s+(int|bigint|tinyint).*AUTO_INCREMENT/i.test(l)) {
    return '"id" INTEGER PRIMARY KEY AUTOINCREMENT';
  }

  // Matches column: `col_name` type ...
  const m = l.match(/^`([^`]+)`\s+([a-zA-Z0-9_]+(?:\([^)]+\))?)(.*)$/);
  if (!m) return null;

  const colName = m[1];
  const type = m[2].toLowerCase();
  let rest = m[3] || '';

  let sqliteType = 'TEXT';
  if (type.includes('int') || type.includes('bool')) {
    sqliteType = 'INTEGER';
  } else if (type.includes('float') || type.includes('double') || type.includes('decimal')) {
    sqliteType = 'REAL';
  } else if (type.includes('blob') || type.includes('binary')) {
    sqliteType = 'BLOB';
  }

  // Clean rest: remove ON UPDATE CURRENT_TIMESTAMP, COLLATE ..., etc.
  rest = rest.replace(/COLLATE\s+[a-zA-Z0-9_]+/gi, '');
  rest = rest.replace(/CHARACTER\s+SET\s+[a-zA-Z0-9_]+/gi, '');
  rest = rest.replace(/ON\s+UPDATE\s+CURRENT_TIMESTAMP/gi, '');
  rest = rest.replace(/AUTO_INCREMENT/gi, '');

  return `"${colName}" ${sqliteType}${rest}`;
}

(async () => {
  try {
    const conn = await mysql.createConnection({
      host: process.env.DB_HOST || 'db.fr-pari1.bengt.wasmernet.com',
      port: Number(process.env.DB_PORT) || 10272,
      user: process.env.DB_USER || 'user_b1d5fdb1',
      password: process.env.DB_PASSWORD || 'pw_7GNRdocASAIUzobl5Ezatle9fwRC3oYq',
      database: process.env.DB_NAME || 'dataanime'
    });

    const outPath = '/home/kali/Documents/d1_migration.sql';
    const out = fs.createWriteStream(outPath, { encoding: 'utf8' });

    out.write('-- ========================================================\n');
    out.write('-- Cloudflare D1 Migration for Animem.uz\n');
    out.write('-- Database ID: 11e1d448-17a4-4156-ba89-434fa4e6bb1e\n');
    out.write('-- Generated At: ' + new Date().toISOString() + '\n');
    out.write('-- ========================================================\n\n');

    const [tables] = await conn.query('SHOW TABLES');

    for (const t of tables) {
      const tableName = Object.values(t)[0];
      console.log('Processing table:', tableName);

      const [[createRes]] = await conn.query('SHOW CREATE TABLE ' + tableName);
      const createSql = createRes['Create Table'];

      const lines = createSql.split('\n');
      const cols = [];

      for (let i = 1; i < lines.length - 1; i++) {
        const line = lines[i].trim();
        if (line.startsWith('PRIMARY KEY') && line.includes('`id`')) {
          continue;
        }
        if (line.startsWith('KEY ') || line.startsWith('UNIQUE KEY') || line.startsWith('CONSTRAINT ')) {
          continue;
        }
        const cDef = convertColumnDef(line);
        if (cDef) {
          cols.push(cDef);
        }
      }

      out.write(`DROP TABLE IF EXISTS "${tableName}";\n`);
      out.write(`CREATE TABLE "${tableName}" (\n  ${cols.join(',\n  ')}\n);\n\n`);

      // Dump table rows
      const [rows] = await conn.query('SELECT * FROM ' + tableName);
      console.log(`  Exporting ${rows.length} rows...`);

      if (rows.length > 0) {
        const colNames = Object.keys(rows[0]);
        const quotedCols = colNames.map(c => `"${c}"`).join(', ');

        const BATCH = 50;
        for (let i = 0; i < rows.length; i += BATCH) {
          const chunk = rows.slice(i, i + BATCH);
          out.write(`INSERT INTO "${tableName}" (${quotedCols}) VALUES\n`);
          const valueLines = chunk.map(row => {
            const vals = colNames.map(c => escapeSqlValue(row[c]));
            return `  (${vals.join(', ')})`;
          });
          out.write(valueLines.join(',\n') + ';\n\n');
        }
      }
    }

    out.end();
    await conn.end();
    console.log('✅ Migration SQL created successfully at:', outPath);
  } catch (err) {
    console.error('Error during migration export:', err);
  }
})();
