declare function graphql(strings: TemplateStringsArray): unknown;

export const query = graphql`
  query MyQuery { viewer { id } }
  query AnotherQuery { viewer { name } }
`;
