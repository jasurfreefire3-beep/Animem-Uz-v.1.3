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

    const schemaPath = '/home/kali/Documents/d1_schema.sql';
    const dataPath = '/home/kali/Documents/d1_data.sql';
    const mediaPath = '/home/kali/Documents/d1_media.sql';

    const schemaOut = fs.createWriteStream(schemaPath, { encoding: 'utf8' });
    const dataOut = fs.createWriteStream(dataPath, { encoding: 'utf8' });
    const mediaOut = fs.createWriteStream(mediaPath, { encoding: 'utf8' });

    schemaOut.write('-- Cloudflare D1 Schema for Database: 11e1d448-17a4-4156-ba89-434fa4e6bb1e\n\n');
    dataOut.write('-- Cloudflare D1 Core Data for Database: 11e1d448-17a4-4156-ba89-434fa4e6bb1e\n\n');
    mediaOut.write('-- Cloudflare D1 Media Files for Database: 11e1d448-17a4-4156-ba89-434fa4e6bb1e\n\n');

    const [tables] = await conn.query('SHOW TABLES');

    for (const t of tables) {
      const tableName = Object.values(t)[0];
      const [[createRes]] = await conn.query('SHOW CREATE TABLE ' + tableName);
      const createSql = createRes['Create Table'];

      const lines = createSql.split('\n');
      const cols = [];

      for (let i = 1; i < lines.length - 1; i++) {
        const line = lines[i].trim();
        if (line.startsWith('PRIMARY KEY') && line.includes('`id`')) continue;
        if (line.startsWith('KEY ') || line.startsWith('UNIQUE KEY') || line.startsWith('CONSTRAINT ')) continue;
        const cDef = convertColumnDef(line);
        if (cDef) cols.push(cDef);
      }

      schemaOut.write(`DROP TABLE IF EXISTS "${tableName}";\n`);
      schemaOut.write(`CREATE TABLE "${tableName}" (\n  ${cols.join(',\n  ')}\n);\n\n`);

      const [rows] = await conn.query('SELECT * FROM ' + tableName);
      console.log(`Table ${tableName}: ${rows.length} rows`);

      if (rows.length === 0) continue;

      const colNames = Object.keys(rows[0]);
      const quotedCols = colNames.map(c => `"${c}"`).join(', ');

      if (tableName === 'media_files') {
        // Individual single-row inserts for media_files to respect D1 1MB packet limit
        for (const row of rows) {
          const vals = colNames.map(c => escapeSqlValue(row[c]));
          mediaOut.write(`INSERT INTO "media_files" (${quotedCols}) VALUES (${vals.join(', ')});\n`);
        }
      } else {
        // Core data: batch in 30 rows
        const BATCH = 30;
        for (let i = 0; i < rows.length; i += BATCH) {
          const chunk = rows.slice(i, i + BATCH);
          dataOut.write(`INSERT INTO "${tableName}" (${quotedCols}) VALUES\n`);
          const valLines = chunk.map(r => `  (${colNames.map(c => escapeSqlValue(r[c])).join(', ')})`);
          dataOut.write(valLines.join(',\n') + ';\n\n');
        }
      }
    }

    schemaOut.end();
    dataOut.end();
    mediaOut.end();

    await conn.end();
    console.log('✅ All 3 files generated:');
    console.log('  1. d1_schema.sql (Structure)');
    console.log('  2. d1_data.sql (All 6,000+ anime, users, episodes, comments)');
    console.log('  3. d1_media.sql (All media files)');
  } catch (err) {
    console.error('Export error:', err);
  }
})();
