import {
  GraphQLArgument, GraphQLError,
  GraphQLInputField,
  GraphQLList,
  GraphQLNonNull,
  GraphQLScalarType,
} from 'graphql';
import { SchemaDirectiveVisitor, SchemaDirectiveVisitorClass } from 'graphql-tools';
import type { Schema as JoiSchema } from 'joi';

function matchValidTypeName(val: string): boolean {
  return /^[_a-zA-Z][_a-zA-Z0-9]*$/.test(val);
}

const substitutionMap = new Map<string, number>();
let substitutionI = 0;

function stringifyArgs(args) {
  return Object.entries(args).map(val => {
    if (typeof val[1] === 'boolean') {
      return val[1] ? val[0] : null;
    }

    // this is a bit brittle but it replaces generated names that would not match a valid GraphQL identifier with "sub_{number}"
    // currently it's ok because the only directive that accepts strings is @str(pattern: "")
    // and pattern must always start with /
    // if other directives start accepting strings, this will become a problem.
    // alternatives:
    //  - hash all resulting inputs strings (md4) & ensure they're not colliding (append a number if they're colliding)
    if (typeof val[1] === 'string' && !matchValidTypeName(val[1])) {
      if (!substitutionMap.has(val[1])) {
        substitutionMap.set(val[1], substitutionI++);
      }

      return `${val[0]}_sub_${substitutionMap.get(val[1])}`;
    }

    return val.join('_');
  }).filter(val => val != null)
    .join('__');
}

export abstract class JoiConstrainedScalar extends GraphQLScalarType {
  constructor(scalarType: GraphQLScalarType, args: any, fieldName: string) {
    super({
      name: `Constrained${scalarType.name}__${stringifyArgs(args)}`,

      serialize: value => {
        value = scalarType.serialize(value);
        this.#validateJoi(fieldName, args, value);

        return value;
      },

      parseValue: value => {
        value = scalarType.serialize(value);

        return this.#validateJoi(fieldName, args, value);
      },

      parseLiteral: (ast, vars) => {
        const value = scalarType.parseLiteral(ast, vars);

        return this.#validateJoi(fieldName, args, value);
      },
    });
  }

  /** memoized joi schema */
  #schema: JoiSchema;
  #validateJoi(fieldName: string, args: { [key: string]: any }, value: unknown) {
    if (!this.#schema) {
      this.#schema = this.buildJoi(fieldName, args, value);
    }

    const output = this.#schema.validate(value, {
      convert: true,
    });

    if (output.error) {
      throw new GraphQLError(output.error.message);
    }

    return output.value;
  }

  abstract buildJoi(fieldName: string, args: { [key: string]: any }, value: unknown): JoiSchema;
}

export function buildJoiDirective(
  tag: string,
  scalarType: GraphQLScalarType,
  ConstrainedScalarType: typeof JoiConstrainedScalar,
): SchemaDirectiveVisitorClass {

  class JoiConstraintDirective extends SchemaDirectiveVisitor {
    // input MyInput {
    //   varOne: String! @str(min: 1)
    // }
    visitInputFieldDefinition(field: GraphQLInputField) {
      return this.#wrapField(field);
    }

    // ! Not currently supported !
    // type Object {
    //   myQuery: String! @list(min: 1)
    // }
    // visitFieldDefinition(field: GraphQLField<any, any>) {
    //   return this.wrapField(field);
    // }

    // type Query {
    //   myQuery(var: [String!]! @list(min: 1))
    // }
    visitArgumentDefinition(arg: GraphQLArgument) {
      return this.#wrapField(arg);
    }

    #wrapField(field) {
      field.type = this.#wrapType(field.type, field.name);

      return field;
    }

    #wrapType(type, fieldName) {
      if (type instanceof GraphQLNonNull) {
        return new GraphQLNonNull(this.#wrapType(type.ofType, fieldName));
      }

      if (type instanceof GraphQLList) {
        return new GraphQLList(this.#wrapType(type.ofType, fieldName));
      }

      if (type !== scalarType) {
        throw new Error(`@${tag} can only be used on type ${scalarType.name}`);
      }

      // This is a workaround to solve an issue where `JoiConstraintString` is not being declared in the gql schema
      //  but declaring it as a scalar doesn't work either because the dynamic type won't be used
      //  as types can only be declared statically:
      //  https://github.com/apollographql/apollo-server/issues/1303#issuecomment-404684981
      // Current solution is to dynamically generate their name by signifying their args

      // @ts-expect-error
      const newType = new ConstrainedScalarType(type, this.args, fieldName);
      const typeMap = this.schema.getTypeMap();
      typeMap[newType.name] = typeMap[newType.name] || newType;

      return newType;
    }
  }

  return JoiConstraintDirective;
}
