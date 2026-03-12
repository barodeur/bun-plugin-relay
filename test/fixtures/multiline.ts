declare function graphql(strings: TemplateStringsArray): unknown;

export const query = graphql`query LongQuery {
  viewer {
    id
    name
    email
    posts {
      edges {
        node {
          id
          title
        }
      }
    }
  }
}`;
