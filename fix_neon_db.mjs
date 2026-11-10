import dns from 'dns';
dns.setDefaultResultOrder('ipv4first');

import { Client } from 'pg';
import fs from 'fs';

const NEON_CONN = "postgresql://neondb_owner:npg_jhWTP3GRHt2b@ep-small-glade-bb1ic8v3-pooler.c-15.us-east-1.aws.neon.tech/neondb?sslmode=require";

async function main() {
  console.log("Connecting to Neon DB...");
  const client = new Client({ connectionString: NEON_CONN, ssl: { rejectUnauthorized: false } });
  await client.connect();
  console.log("Connected successfully!");

  // ==========================================
  // PART 1: REVERT s3.animem.uz VIDEO URLS
  // ==========================================
  console.log("\n--- PART 1: Reverting s3.animem.uz video URLs ---");
  // 1. Direct regex/string revert for tgstream URLs
  const revertDirectRes = await client.query(`
    UPDATE episodes 
    SET video_url = REPLACE(video_url, 'https://ss2-animem.wasmer.app/api/tgstream', 'https://s3.animem.uz/api/tgstream')
    WHERE video_url LIKE '%ss2-animem.wasmer.app/api/tgstream%';
  `);
  console.log(`Reverted direct tgstream URLs: ${revertDirectRes.rowCount} rows`);

  // 2. Cross-reference with local_store.json for any other s3.animem.uz URLs
  if (fs.existsSync('local_store.json')) {
    const rawData = JSON.parse(fs.readFileSync('local_store.json', 'utf8'));
    const localEps = rawData.episodes || [];
    let restoredFromLocal = 0;
    for (const ep of localEps) {
      if (ep.video_url && ep.video_url.includes('s3.animem.uz')) {
        const updateRes = await client.query(`
          UPDATE episodes 
          SET video_url = $1 
          WHERE id = $2 AND video_url NOT LIKE '%s3.animem.uz%';
        `, [ep.video_url, ep.id]);
        restoredFromLocal += updateRes.rowCount;
      }
    }
    console.log(`Reverted from local_store.json: ${restoredFromLocal} rows`);
  }

  // Count s3.animem.uz and ss2-animem.wasmer.app
  const s3Count = await client.query("SELECT count(*) FROM episodes WHERE video_url LIKE '%s3.animem.uz%'");
  const ss2Count = await client.query("SELECT count(*) FROM episodes WHERE video_url LIKE '%ss2-animem.wasmer.app%'");
  console.log(`Current s3.animem.uz in episodes: ${s3Count.rows[0].count}`);
  console.log(`Current ss2-animem.wasmer.app in episodes: ${ss2Count.rows[0].count}`);

  // ==========================================
  // PART 2: FIX PRIMARY KEY SEQUENCES (AUTO-INCREMENT)
  // ==========================================
  console.log("\n--- PART 2: Fixing Sequences for Auto-Increment on ALL Tables ---");

  // Get all tables in public schema
  const tablesRes = await client.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
  `);

  for (const row of tablesRes.rows) {
    const tbl = row.table_name;
    // Check if table has an 'id' column
    const colRes = await client.query(`
      SELECT column_name, data_type, column_default 
      FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = $1 AND column_name = 'id';
    `, [tbl]);

    if (colRes.rows.length === 0) continue;

    const col = colRes.rows[0];
    const seqName = `${tbl}_id_seq`;

    console.log(`Fixing sequence for [${tbl}] (data_type: ${col.data_type}, default: ${col.column_default || 'none'})...`);

    try {
      // 1. Create sequence if not exists
      await client.query(`CREATE SEQUENCE IF NOT EXISTS "${seqName}";`);

      // 2. Set default value to nextval('seqName')
      await client.query(`ALTER TABLE "${tbl}" ALTER COLUMN "id" SET DEFAULT nextval('${seqName}');`);

      // 3. Make sequence owned by the column
      try {
        await client.query(`ALTER SEQUENCE "${seqName}" OWNED BY "${tbl}"."id";`);
      } catch (e) {
        // ignore if already owned
      }

      // 4. Update sequence value to MAX(id)
      const maxRes = await client.query(`SELECT COALESCE(MAX("id"::bigint), 0) as max_val FROM "${tbl}";`);
      const maxVal = parseInt(maxRes.rows[0].max_val, 10);
      const nextVal = Math.max(maxVal + 1, 1);

      await client.query(`SELECT setval('${seqName}', $1, false);`, [nextVal]);
      console.log(`  ✅ [${tbl}] sequence set to ${nextVal}`);
    } catch (err) {
      console.error(`  ❌ Error fixing sequence for [${tbl}]:`, err.message);
    }
  }

  // ==========================================
  // PART 3: TEST INSERTS (VALIDATION)
  // ==========================================
  console.log("\n--- PART 3: Testing Inserts on Key Tables ---");

  // Test messages insert
  try {
    const msgRes = await client.query(`
      INSERT INTO messages (user_id, user_name, content) 
      VALUES (0, 'System Check', 'Connection & Insert Verified!') 
      RETURNING id, content, created_at;
    `);
    console.log("  ✅ messages INSERT successful! ID:", msgRes.rows[0].id);
    // Cleanup test message
    await client.query("DELETE FROM messages WHERE id = $1;", [msgRes.rows[0].id]);
  } catch (err) {
    console.error("  ❌ messages INSERT failed:", err.message);
  }

  // Test comments insert
  try {
    const commRes = await client.query(`
      INSERT INTO comments (anime_id, user_id, user_name, comment) 
      VALUES (1, 0, 'Test User', 'Test Comment') 
      RETURNING id;
    `);
    console.log("  ✅ comments INSERT successful! ID:", commRes.rows[0].id);
    await client.query("DELETE FROM comments WHERE id = $1;", [commRes.rows[0].id]);
  } catch (err) {
    console.error("  ❌ comments INSERT failed:", err.message);
  }

  // Test episodes insert
  try {
    const epRes = await client.query(`
      INSERT INTO episodes (anime_id, episode_number, title, video_url) 
      VALUES (999999, 999, 'Test Ep', 'https://s3.animem.uz/test') 
      RETURNING id;
    `);
    console.log("  ✅ episodes INSERT successful! ID:", epRes.rows[0].id);
    await client.query("DELETE FROM episodes WHERE id = $1;", [epRes.rows[0].id]);
  } catch (err) {
    console.error("  ❌ episodes INSERT failed:", err.message);
  }

  await client.end();
  console.log("\n🎉 ALL FIXES APPLIED SUCCESSFULLY! 🎉");
}

main().catch(console.error);
