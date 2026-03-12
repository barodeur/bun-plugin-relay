declare function graphql(strings: TemplateStringsArray): unknown;

export const mutation = graphql`mutation CreateUserMutation($input: CreateUserInput!) {
  createUser(input: $input) { id }
}`;

export const fragment = graphql`fragment UserFragment on User { id name email }`;
