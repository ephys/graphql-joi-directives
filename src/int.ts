import { GraphQLInt } from 'graphql';
import { SchemaDirectiveVisitorClass } from 'graphql-tools';
import Joi from 'joi';
import { buildJoiDirective, JoiConstrainedScalar } from './_internal';

class JoiConstrainedInt extends JoiConstrainedScalar {
  buildJoi(fieldName: string, args: any) {
    let schema = Joi.number().integer().label(fieldName);

    for (const argKey of Object.keys(args)) {
      const argVal = args[argKey];

      switch (argKey) {
        case 'min':
          schema = schema.min(argVal);
          break;

        case 'max':
          schema = schema.max(argVal);
          break;

        default:
          throw new Error(`Unsupported argument ${argKey}.`);
      }
    }

    return schema;
  }
}

export function buildJoiIntDirective(tag: string): SchemaDirectiveVisitorClass {
  return buildJoiDirective(tag, GraphQLInt, JoiConstrainedInt);
}

export function buildJoiIntDirectiveTypedef(directiveName: string) {
  return `
    directive @${directiveName}(
      min: Int,
      max: Int
    ) on INPUT_FIELD_DEFINITION | ARGUMENT_DEFINITION
  `;
}
