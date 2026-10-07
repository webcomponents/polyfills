// Serves wpt.live through localhost, with the built polyfill injected at the
// start of every HTML page so it loads before the test is parsed. For trying
// tests by hand; the test suite runs vendored WPTs (see wpt/).
//
//   npm run build
//   node test/wpt-proxy.mjs [--force] [--test-shims]
//   open http://localhost:8001/custom-elements/registries/
//
// --force uses the polyfill even where the browser has native support.
// --test-shims adjusts tests for documented polyfill limitations (see
// wpt/shims.mjs).
import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {
  injectAtStart,
  markNullRegistryHosts,
  polyfillScripts,
} from './wpt/shims.mjs';

const port = Number(process.env.PORT ?? 8001);
const upstream = process.env.WPT_UPSTREAM ?? 'https://wpt.live';
const force = process.argv.includes('--force');
const testShims = process.argv.includes('--test-shims');
const polyfillUrl = new URL(
  '../scoped-custom-element-registry.min.js',
  import.meta.url
);
const polyfillPath = '/__polyfill__.js';
const scripts = polyfillScripts(polyfillPath, force, testShims);

http
  .createServer(async (request, response) => {
    try {
      if (request.url === polyfillPath) {
        response.writeHead(200, {'content-type': 'text/javascript'});
        response.end(await readFile(polyfillUrl));
        return;
      }
      const chunks = [];
      for await (const chunk of request) chunks.push(chunk);
      const body =
        request.method === 'GET' || request.method === 'HEAD'
          ? undefined
          : Buffer.concat(chunks);
      const upstreamResponse = await fetch(upstream + request.url, {
        method: request.method,
        body,
        redirect: 'manual',
      });
      const headers = Object.fromEntries(upstreamResponse.headers);
      // Note, fetch has already decoded the body.
      delete headers['content-encoding'];
      delete headers['content-length'];
      if (headers.location) {
        const location = new URL(headers.location, upstream);
        if (location.origin === new URL(upstream).origin) {
          headers.location =
            location.pathname + location.search + location.hash;
        }
      }
      let content;
      if (headers['content-type']?.includes('text/html')) {
        const html = await upstreamResponse.text();
        content = injectAtStart(
          testShims ? markNullRegistryHosts(html) : html,
          scripts
        );
      } else {
        content = Buffer.from(await upstreamResponse.arrayBuffer());
      }
      response.writeHead(upstreamResponse.status, headers);
      response.end(content);
    } catch (error) {
      console.error(error);
      response.writeHead(502, {'content-type': 'text/plain'});
      response.end('Bad gateway');
    }
  })
  .listen(port, () =>
    console.log(
      `http://localhost:${port}/custom-elements/registries/ (polyfill ${
        force ? 'forced' : 'if needed'
      }${testShims ? ', test shims' : ''})`
    )
  );
