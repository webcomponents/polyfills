// Vendors WPT's custom element registry tests (and what they load) into
// test/wpt/, from a given WPT commit, or the latest, and generates a page for
// each .window.js test, as WPT's server does.
//
//   npm run wpt:update [-- <commit>]
import {execFileSync} from 'node:child_process';
import {cp, mkdtemp, readdir, readFile, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';

const wptDir = fileURLToPath(new URL('.', import.meta.url));
const testsPath = 'custom-elements/registries';
const paths = [
  testsPath,
  'resources/testharness.js',
  'resources/testharnessreport.js',
  'common/object-association.js',
  'common/blank.html',
];

// https://web-platform-tests.org/writing-tests/testharness.html#window-tests
const windowTestPage = (file, source) => {
  const meta = [...source.matchAll(/^\/\/ META: (\w+)=(.*)$/gm)];
  const title = meta.find(([, key]) => key === 'title')?.[2].trim();
  const scripts = meta
    .filter(([, key]) => key === 'script')
    .map(([, , src]) => `<script src="${src.trim()}"></script>\n`)
    .join('');
  return (
    '<!doctype html>\n<meta charset="utf-8">\n' +
    (title ? `<title>${title}</title>\n` : '') +
    '<script src="/resources/testharness.js"></script>\n' +
    '<script src="/resources/testharnessreport.js"></script>\n' +
    scripts +
    '<div id="log"></div>\n' +
    `<script src="${file}"></script>\n`
  );
};

const checkout = await mkdtemp(join(tmpdir(), 'wpt-'));
const git = (...args) =>
  execFileSync('git', args, {cwd: checkout}).toString().trim();
try {
  git('init', '-q');
  git(
    'remote',
    'add',
    'origin',
    'https://github.com/web-platform-tests/wpt.git'
  );
  git('sparse-checkout', 'set', '--no-cone', ...paths);
  git(
    'fetch',
    '-q',
    '--depth',
    '1',
    '--filter=blob:none',
    'origin',
    process.argv[2] ?? 'HEAD'
  );
  git('checkout', '-q', 'FETCH_HEAD');
  const commit = git('rev-parse', 'HEAD');
  for (const dir of ['custom-elements', 'resources', 'common']) {
    await rm(join(wptDir, dir), {recursive: true, force: true});
  }
  for (const path of paths) {
    await cp(join(checkout, path), join(wptDir, path), {recursive: true});
  }
  const testsDir = join(wptDir, testsPath);
  for (const file of await readdir(testsDir)) {
    if (file.endsWith('.window.js')) {
      const source = await readFile(join(testsDir, file), 'utf8');
      await writeFile(
        join(testsDir, file.replace(/\.js$/, '.html')),
        windowTestPage(file, source)
      );
    }
  }
  await writeFile(
    join(wptDir, 'README.md'),
    `# Web platform tests

Vendored from https://github.com/web-platform-tests/wpt at
${commit} by \`npm run wpt:update\`. Don't edit these files: the
\`*.window.html\` pages are generated for the \`*.window.js\` tests.
\`baseline/\` lists known failures; regenerate it with
\`npm run wpt:baseline\`.
`
  );
  console.log(`Vendored WPT ${commit}. Regenerate the baseline if needed.`);
} finally {
  await rm(checkout, {recursive: true, force: true});
}
