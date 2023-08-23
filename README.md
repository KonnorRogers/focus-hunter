## Initial install

```bash
git clone https://gist.github.com/KonnorRogers/d25bb288be3d90c1bf8208fa339ded3b.git . --depth 1
mkdir -p {exports,internal,types}
rm -rf .git
git init
mkdir -p .github/workflows
mv tests.yml ./.github/workflows/tests.yml
pnpm install -D @web/test-runner @open-wc/testing-helpers @web/test-runner-playwright 
```

## Structure

`exports/` is publicly available files
`internal/` is...well...internal.

`exports` and `internal` shouldn't write their own `.d.ts` that are co-located.

`types/` is where you place your handwritten `.d.ts` files.