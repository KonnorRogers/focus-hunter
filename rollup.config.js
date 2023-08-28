import { nodeResolve } from '@rollup/plugin-node-resolve';
import { rollupPluginHTML as html } from '@web/rollup-plugin-html';

export default {
  input: 'index.html',
  output: { dir: 'www' },
  plugins: [
    html({
    }),
    nodeResolve(),
  ],
};
