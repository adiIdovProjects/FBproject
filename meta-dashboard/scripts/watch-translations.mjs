import chokidar from 'chokidar';
import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const EN_FILE = path.join(__dirname, '../messages/en.json');

console.log(chalk.blue.bold('\n👀 Translation Watch Mode\n'));
console.log(chalk.gray(`Watching: ${EN_FILE}`));
console.log(chalk.cyan('✨ Ready for changes... (Press Ctrl+C to stop)\n'));

// Create watcher
const watcher = chokidar.watch(EN_FILE, {
  ignoreInitial: true,
  awaitWriteFinish: {
    stabilityThreshold: 500,  // Wait 500ms after last change
    pollInterval: 100
  }
});

// Handle changes
watcher.on('change', (filePath) => {
  const timestamp = new Date().toLocaleTimeString();

  console.log(chalk.yellow(`\n[${timestamp}] 🔄 Change detected in en.json`));
  console.log(chalk.cyan('Starting translation sync...\n'));

  try {
    execSync('node scripts/sync-translations.mjs', {
      stdio: 'inherit',
      cwd: path.join(__dirname, '..')
    });

    console.log(chalk.green(`[${timestamp}] ✅ Sync complete! Watching for changes...\n`));
  } catch (error) {
    console.error(chalk.red(`\n❌ Translation sync failed`));
    console.error(chalk.gray('Fix the error and save en.json again to retry.\n'));
  }
});

// Handle errors
watcher.on('error', (error) => {
  console.error(chalk.red('❌ Watcher error:'), error.message);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log(chalk.yellow('\n\n👋 Stopping watch mode...'));
  watcher.close();
  process.exit(0);
});
