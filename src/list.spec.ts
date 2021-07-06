import { ApolloServer, gql } from 'apollo-server';
import { getTestServer } from './__tests/test-server';

describe('@list', () => {
  let server: ApolloServer;

  beforeAll(() => {
    const typeDefs = gql`
      type Query {
        testArgument(
          items: [String!] @list(min: 1, max: 2)
        ): Boolean
        testInputObject(input: InputObject): Boolean
      }
      
      input InputObject {
        items: [String!] @list(min: 1, max: 2)
      }
    `;

    server = getTestServer({
      typeDefs,
      resolvers: {
        Query: {
          testArgument() {
            return true;
          },
          testInputObject() {
            return true;
          },
        },
      },
    });
  });

  describe('on ARGUMENT_DEFINITION', () => {
    it('supports "min"', async () => {
      const result = await server.executeOperation({
        query: gql`query {
          testArgument(items: [])
        }`,
      });

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toEqual('"items" must contain at least 1 items');
    });

    it('supports "max"', async () => {
      const result = await server.executeOperation({
        query: gql`query {
          testArgument(items: ["1","2","3"])
        }`,
      });

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toEqual('"items" must contain less than or equal to 2 items');
    });

    it('does not crash for null values', async () => {
      const result = await server.executeOperation({
        query: gql`query {
          testArgument(items: null)
        }`,
      });

      expect(result.errors).toBeUndefined();
    });
  });

  describe('on INPUT_FIELD_DEFINITION', () => {
    it('supports "min"', async () => {
      const result = await server.executeOperation({
        query: gql`query {
          testInputObject(input: { items: [] })
        }`,
      });

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toEqual('"input.items" must contain at least 1 items');
    });

    it('supports "max"', async () => {
      const result = await server.executeOperation({
        query: gql`query {
          testInputObject(input: { items: ["1","2","3"] })
        }`,
      });

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toEqual('"input.items" must contain less than or equal to 2 items');
    });

    it('does not crash for null input object properties', async () => {
      const result = await server.executeOperation({
        query: gql`query {
          testInputObject(input: { items: null })
        }`,
      });

      expect(result.errors).toBeUndefined();
    });

    it('does not crash for null input object', async () => {
      const result = await server.executeOperation({
        query: gql`query {
          testInputObject(input: null)
        }`,
      });

      expect(result.errors).toBeUndefined();
    });
  });
});
