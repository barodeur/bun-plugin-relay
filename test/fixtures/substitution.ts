declare function graphql(
  strings: TemplateStringsArray,
  ...args: unknown[]
): unknown;

const field = "id";
export const query = graphql`query MyQuery { viewer { ${field} } }`;
