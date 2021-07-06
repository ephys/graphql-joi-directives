import { ApolloServer, gql } from 'apollo-server';
import { getTestServer } from './__tests/test-server';

describe('@str', () => {
  let server: ApolloServer;

  beforeAll(() => {
    const typeDefs = gql`
      type Query {
        testArgument(
          min0: String @str(min: 0)
          min1: String @str(min: 1)
          max10: String @str(max: 10)
          length5: String @str(length: 5)
          alphanum: String @str(pattern: "/[a-zA-Z0-9]+/i")
          creditCard: String @str(creditCard: true)
          isoDate: String @str(isoDate: true)
          isoDuration: String @str(isoDuration: true)
        ): Boolean
        testDefaults(val: String @str): String
        testTrim(val: String @str(trim: true)): String
        testUppercase(val: String @str(case: UPPER)): String
        testLowercase(val: String @str(case: LOWER)): String
        testInputObject(input: InputObject): Boolean
      }
      
      input InputObject {
        min1: String @str(min: 1)
      }
    `;

    server = getTestServer({
      typeDefs,
      resolvers: {
        Query: {
          testArgument() {
            return true;
          },
          testDefaults(parent, params) {
            return params.val;
          },
          testTrim(parent, params) {
            return params.val;
          },
          testUppercase(parent, params) {
            return params.val;
          },
          testLowercase(parent, params) {
            return params.val;
          },
        },
      },
    });
  });

  describe('on ARGUMENT_DEFINITION', () => {
    it('does not forbid the empty string by default', async () => {
      const result = await server.executeOperation({
        query: gql`query {
          testDefaults(val: "")
        }`,
      });

      expect(result.errors).toBeUndefined();
      expect(result.data).toMatchObject({
        testDefaults: '',
      });
    });

    it('does not trim by default', async () => {
      const result = await server.executeOperation({
        query: gql`query {
          testDefaults(val: "   ")
        }`,
      });

      expect(result.errors).toBeUndefined();
      expect(result.data).toMatchObject({
        testDefaults: '   ',
      });
    });

    it('supports "min: 0"', async () => {
      const result = await server.executeOperation({
        query: gql`query {
          testArgument(min0: "")
        }`,
      });

      expect(result.errors).toBeUndefined();
    });

    it('supports "min: 1"', async () => {
      const result = await server.executeOperation({
        query: gql`query {
          testArgument(min1: "")
        }`,
      });

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toEqual('"min1" is not allowed to be empty');
    });

    it('supports "max"', async () => {
      const result = await server.executeOperation({
        query: gql`query {
          testArgument(max10: "abcdefghijk")
        }`,
      });

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toEqual('"max10" length must be less than or equal to 10 characters long');
    });

    it('supports "length"', async () => {
      const result = await server.executeOperation({
        query: gql`query {
          testArgument(length5: "123")
        }`,
      });

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toEqual('"length5" length must be 5 characters long');
    });

    it('supports "alphanum"', async () => {
      const result = await server.executeOperation({
        query: gql`query {
          testArgument(alphanum: "%%")
        }`,
      });

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toEqual('"alphanum" with value "%%" fails to match the required pattern: /[a-zA-Z0-9]+/i');
    });

    it('supports "creditCard"', async () => {
      const result = await server.executeOperation({
        query: gql`query {
          testArgument(creditCard: "123")
        }`,
      });

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toEqual('"creditCard" must be a credit card');
    });

    it('supports "isoDate"', async () => {
      const result = await server.executeOperation({
        query: gql`query {
          testArgument(isoDate: "123")
        }`,
      });

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toEqual('"isoDate" must be in iso format');
    });

    it('supports "isoDuration"', async () => {
      const result = await server.executeOperation({
        query: gql`query {
          testArgument(isoDuration: "123")
        }`,
      });

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toEqual('"isoDuration" must be a valid ISO 8601 duration');
    });

    it('supports "case: UPPER"', async () => {
      const result = await server.executeOperation({
        query: gql`query {
          testUppercase(val: "abc")
        }`,
      });

      expect(result.errors).toBeUndefined();
      expect(result.data).toMatchObject({
        testUppercase: 'ABC',
      });
    });

    it('supports "case: LOWER"', async () => {
      const result = await server.executeOperation({
        query: gql`query {
          testLowercase(val: "ABC")
        }`,
      });

      expect(result.errors).toBeUndefined();
      expect(result.data).toMatchObject({
        testLowercase: 'abc',
      });
    });

    it('supports "trim"', async () => {
      const result = await server.executeOperation({
        query: gql`query {
          testTrim(val: "  abc  ")
        }`,
      });

      expect(result.errors).toBeUndefined();
      expect(result.data).toMatchObject({
        testTrim: 'abc',
      });
    });
  });

  describe('on INPUT_FIELD_DEFINITION', () => {
    it('executes validation', async () => {
      const result = await server.executeOperation({
        query: gql`query {
          testInputObject(input: { min1: "" })
        }`,
      });

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toEqual('"min1" is not allowed to be empty');
      expect(result.data).toBeUndefined();
    });

    it('does not crash if input object is not provided', async () => {
      const result = await server.executeOperation({
        query: gql`query {
          testInputObject
        }`,
      });

      expect(result.errors).toBeUndefined();
    });
  });
});
