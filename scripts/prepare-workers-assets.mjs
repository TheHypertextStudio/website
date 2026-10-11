import { readdir, readFile, writeFile, appendFile } from 'node:fs/promises';
import path from 'node:path';

// Static Assets defaults to temporary HTML redirects. Preserve the site's
// permanent trailing-slash redirects for every generated directory index.
export async function preserveCanonicalRedirects(assets) {
  const redirectsPath = path.join(assets, '_redirects');
  const source = await readFile(redirectsPath, 'utf8');
  const existing = source
    .split('\n')
    .filter((line) => {
      const rule = line.trim();
      if (!rule || rule.startsWith('#')) return true;
      const fields = rule.split(/\s+/);
      const [from, to, status] = fields;
      if (from.startsWith('/')) return true;
      // Workers Static Assets rejects Pages domain-level rules. The separate
      // www Worker already owns this exact redirect, including path and query.
      if (
        fields.length === 3 &&
        from === 'https://www.hypertext.studio/*' &&
        to === 'https://hypertext.studio/:splat' &&
        status === '301'
      ) {
        return false;
      }
      throw new Error(`Workers redirects require a relative source: ${from}`);
    })
    .join('\n');
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
  if (existing !== source) await writeFile(redirectsPath, existing);
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
