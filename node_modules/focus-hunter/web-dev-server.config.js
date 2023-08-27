// import { playwrightLauncher } from '@web/test-runner-playwright';
// import { esbuildPlugin } from '@web/dev-server-esbuild';

/** @type {import("@web/dev-server").DevServerConfig} */
export default {
  rootDir: '.',
  // nodeResolve: true,
  open: true,
  http2: true,
  watch: process.argv.includes("--watch"),

}
