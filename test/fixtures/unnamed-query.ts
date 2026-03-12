declare function graphql(strings: TemplateStringsArray): unknown;

export const query = graphql`query { viewer { id } }`;
