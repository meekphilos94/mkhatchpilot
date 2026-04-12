import { copyFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const sourceDir = path.join(root, 'web-static');
const distDir = path.join(root, 'dist');

async function main() {
  await mkdir(distDir, { recursive: true });
  await copyFile(
    path.join(sourceDir, 'privacy-policy.html'),
    path.join(distDir, 'privacy-policy.html'),
  );
}

main().catch((error) => {
  console.error('Unable to copy web static files after export.');
  console.error(error);
  process.exit(1);
});
