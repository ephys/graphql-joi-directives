import { ApolloServer, gql } from 'apollo-server';
import { getTestServer } from './__tests/test-server';

describe('@int', () => {
  let server: ApolloServer;

  beforeAll(() => {
    const typeDefs = gql`
      type Query {
        users(limit: Int @int(min: 1, max: 10)): [Users!]!
        users2(input: Users2Input): [Users!]!
      }
      input Users2Input {
        limit: Int @int(min: 1, max: 10)
      }
      type Users {
        id: Int!
      }
    `;

    server = getTestServer({
      typeDefs,
      resolvers: {
        Query: {
          users() {
            return [];
          },
          users2() {
            return [];
          },
        },
      },
    });
  });

  describe('on ARGUMENT_DEFINITION', () => {
    it('supports "min"', async () => {
      const result = await server.executeOperation({
        query: gql`query {
          users(limit: 0) {
            id
          }
        }`,
      });

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toEqual('"limit" must be greater than or equal to 1');
      expect(result.data).toBeUndefined();
    });

    it('supports "max"', async () => {
      const result = await server.executeOperation({
        query: gql`query {
          users(limit: 11) {
            id
          }
        }`,
      });

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toEqual('"limit" must be less than or equal to 10');
      expect(result.data).toBeUndefined();
    });

    it('does not validate null values', async () => {
      const result = await server.executeOperation({
        query: gql`query {
          users(limit: null) {
            id
          }
        }`,
      });

      expect(result.errors).toBeUndefined();
    });
  });

  describe('on INPUT_FIELD_DEFINITION', () => {
    it('supports "min"', async () => {
      const result = await server.executeOperation({
        query: gql`query {
          users2(input: { limit: 0 }) {
            id
          }
        }`,
      });

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toEqual('"limit" must be greater than or equal to 1');
      expect(result.data).toBeUndefined();
    });

    it('supports "max"', async () => {
      const result = await server.executeOperation({
        query: gql`query {
          users2(input: { limit: 11 }) {
            id
          }
        }`,
      });

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toEqual('"limit" must be less than or equal to 10');
      expect(result.data).toBeUndefined();
    });

    it('does not validate null values', async () => {
      const result = await server.executeOperation({
        query: gql`query {
          users2(input: { limit: null }) {
            id
          }
        }`,
      });

      expect(result.errors).toBeUndefined();
    });

    it('does not crash if INPUT is null', async () => {
      const result = await server.executeOperation({
        query: gql`query {
          users2(input: null) {
            id
          }
        }`,
      });

      expect(result.errors).toBeUndefined();
    });
  });
});
