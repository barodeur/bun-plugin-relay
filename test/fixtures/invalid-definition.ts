declare function graphql(strings: TemplateStringsArray): unknown;

export const schema = graphql`schema { query: Query }`;
