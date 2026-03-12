# TODO

Missing features compared to the official [babel-plugin-relay](https://github.com/facebook/relay/tree/main/packages/babel-plugin-relay).

## Validation


## Code generation

- [ ] Generate ES module `import` instead of `require()` (`eagerEsModules`)
- [ ] Memoize require results to avoid duplicate loads
- [ ] Dev-mode staleness detection (MD5 hash check + `console.error`)
- [ ] `isDevVariableName` option to gate dev checks behind a global (e.g. `__DEV__`)
- [ ] `codegenCommand` option to customize the "run X to update" error message

## Configuration

- [x] Read config from `relay.config.js` / `relay.config.json` / `package.json` via cosmiconfig
- [ ] Support absolute `artifactDirectory` with relative path resolution from source file