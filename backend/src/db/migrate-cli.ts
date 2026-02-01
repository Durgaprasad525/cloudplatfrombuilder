
import { runMigrations } from './migrate';
import { pool } from './client';

async function main() {
    try {
        await runMigrations();
        console.log('Migration completed successfully.');
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

main();
