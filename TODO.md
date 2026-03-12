# TODO

Missing features compared to the official [babel-plugin-relay](https://github.com/facebook/relay/tree/main/packages/babel-plugin-relay).

## Validation

- [ ] Parse graphql tags with the `graphql` library instead of regex
- [ ] Error on empty graphql tags
- [ ] Error on template substitutions (`${}`)
- [ ] Error on multiple definitions in a single tag
- [ ] Error on unnamed operations/fragments

## Code generation

- [ ] Generate ES module `import` instead of `require()` (`eagerEsModules`)
- [ ] Memoize require results to avoid duplicate loads
- [ ] Dev-mode staleness detection (MD5 hash check + `console.error`)
- [ ] `isDevVariableName` option to gate dev checks behind a global (e.g. `__DEV__`)
- [ ] `codegenCommand` option to customize the "run X to update" error message

## Configuration

- [ ] Read config from `relay.config.js` / `relay.config.json` / `package.json` via cosmiconfig
- [ ] Support absolute `artifactDirectory` with relative path resolution from source file