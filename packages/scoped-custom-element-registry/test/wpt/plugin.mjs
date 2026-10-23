// A web-test-runner plugin that runs the vendored WPTs (see README.md) as
// tests. It serves the paths they load, and in each test page injects the
// polyfill and the test shims (see shims.mjs) at the start and, at the end, a
// bridge reporting each testharness subtest as a mocha test.
//
// Subtests listed in baseline/<environment>.json are known failures: they're
// skipped, and fail once they pass, so the baseline is kept current. With
// `updateBaseline`, each page reports its failures instead, and they're
// written there.
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {
  injectAtStart,
  markNullRegistryHosts,
  polyfillScripts,
} from './shims.mjs';

const wptDir = fileURLToPath(new URL('.', import.meta.url));
const polyfillPath = '/scoped-custom-element-registry.min.js';

// Note, results differ between browser engines, so the baseline is per engine.
const bridge = (updateBaseline) => `
<script type="module">
  import {runTests} from '@web/test-runner-mocha';
  import {executeServerCommand} from '@web/test-runner-commands';
  const results = new Promise((resolve) =>
    add_completion_callback((tests, status) => resolve({tests, status}))
  );
  const userAgent = navigator.userAgent;
  const environment = /Firefox\\//.test(userAgent)
    ? 'firefox'
    : /Chrome\\//.test(userAgent)
    ? 'chromium'
    : 'webkit';
  const test = location.pathname.replace('/test/wpt/', '');
  runTests(async () => {
    const {tests, status} = await results;
    const subtests = [
      ...(status.status === status.OK
        ? []
        : [{name: '(harness)', status: 1, message: status.message}]),
      ...tests,
    ];
    if (${updateBaseline}) {
      const failures = subtests.filter((t) => t.status !== 0).map((t) => t.name);
      await executeServerCommand('wpt-baseline', {environment, test, failures});
      it('baseline updated', () => {});
      return;
    }
    const response = await fetch('/test/wpt/baseline/' + environment + '.json');
    const known = new Set(
      response.ok ? (await response.json())[test] ?? [] : []
    );
    for (const subtest of subtests) {
      const passed = subtest.status === 0;
      if (known.has(subtest.name) && !passed) {
        it.skip(subtest.name + ' (known failure)');
        continue;
      }
      it(subtest.name, () => {
        if (known.has(subtest.name)) {
          throw new Error('Passes now: update the baseline (npm run wpt:baseline)');
        }
        if (!passed) {
          throw new Error(subtest.message ?? 'Failed');
        }
      });
    }
  });
</script>
`;

export const wptPlugin = ({updateBaseline = false} = {}) => {
  // Note, pages report concurrently, so baseline writes are serialized.
  let writing = Promise.resolve();
  const writeBaseline = async ({environment, test, failures}) => {
    const file = `${wptDir}baseline/${environment}.json`;
    let baseline = {};
    try {
      baseline = JSON.parse(await readFile(file, 'utf8'));
    } catch {
      // Note, a new baseline.
    }
    if (failures.length) {
      baseline[test] = [...failures].sort();
    } else {
      delete baseline[test];
    }
    const sorted = Object.fromEntries(
      Object.keys(baseline)
        .sort()
        .map((key) => [key, baseline[key]])
    );
    await mkdir(`${wptDir}baseline`, {recursive: true});
    await writeFile(file, JSON.stringify(sorted, null, 2) + '\n');
  };
  return {
    name: 'wpt',
    async serve(context) {
      if (/^\/(resources|common)\//.test(context.path)) {
        return {
          body: await readFile(wptDir + context.path.slice(1), 'utf8'),
          type: context.path.endsWith('.html') ? 'html' : 'js',
        };
      }
    },
    transform(context) {
      if (
        context.path.startsWith('/test/wpt/') &&
        context.path.endsWith('.html')
      ) {
        const html = markNullRegistryHosts(context.body);
        return {
          body:
            injectAtStart(html, polyfillScripts(polyfillPath, false, true)) +
            bridge(updateBaseline),
        };
      }
    },
    async executeCommand({command, payload}) {
      if (command !== 'wpt-baseline') {
        return;
      }
      writing = writing.then(() => writeBaseline(payload));
      await writing;
      return true;
    },
  };
};
