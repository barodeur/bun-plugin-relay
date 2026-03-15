function graphql(strings) {
  return strings;
}

export const query = graphql`query MyQuery { viewer { id name } }`;
