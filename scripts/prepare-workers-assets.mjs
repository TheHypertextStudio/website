import { readdir, readFile, appendFile } from 'node:fs/promises';
import path from 'node:path';

// Static Assets defaults to temporary HTML redirects. Preserve the site's
// permanent trailing-slash redirects for every generated directory index.
export async function preserveCanonicalRedirects(assets) {
  const redirectsPath = path.join(assets, '_redirects');
  const existing = await readFile(redirectsPath, 'utf8');
  const rules = [];
  async function visit(directory) {
    const entries = await readdir(directory, { withFileTypes: true });
    for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
      const filename = path.join(directory, entry.name);
      if (entry.isDirectory()) await visit(filename);
      if (entry.isFile() && entry.name === 'index.html' && directory !== assets) {
        const route = `/${encodeURI(path.relative(assets, directory).split(path.sep).join('/'))}`;
        if (!existing.split('\n').some((line) => line.trim().split(/\s+/)[0] === route)) {
          rules.push(`${route} ${route}/ 308`);
        }
      }
    }
  }
  await visit(assets);
  if (rules.length) {
    await appendFile(
      redirectsPath,
      `\n# Preserve permanent canonical page redirects.\n${rules.join('\n')}\n`,
    );
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === import.meta.filename) {
  if (!process.argv[2]) throw new Error('An assets directory is required.');
  await preserveCanonicalRedirects(path.resolve(process.argv[2]));
}
