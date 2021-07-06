import { ApolloServer, makeExecutableSchema } from 'apollo-server';
import { joiConstraintDirectives, joiContraintDirectivesTypedefs } from '../index';

export function getTestServer(opts: Parameters<typeof makeExecutableSchema>[0]) {
  const schema = makeExecutableSchema({
    ...opts,
    typeDefs: [...toArray(opts.typeDefs), ...joiContraintDirectivesTypedefs],
    schemaDirectives: {
      ...opts.schemaDirectives,
      ...joiConstraintDirectives
    },
  });

  return new ApolloServer({ schema });
}

function toArray<T>(val: T | T[]): T[] {
  return Array.isArray(val) ? val : [val];
}
