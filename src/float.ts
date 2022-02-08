import { GraphQLFloat } from 'graphql';
import { SchemaDirectiveVisitorClass } from 'graphql-tools';
import Joi from 'joi';
import { buildJoiDirective, JoiConstrainedScalar } from './_internal';

class JoiConstrainedFloat extends JoiConstrainedScalar {
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

        case 'minExclusive':
          schema = schema.greater(argVal);
          break;

        case 'maxExclusive':
          schema = schema.less(argVal);
          break;

        case 'precision':
          schema = schema.precision(argVal);
          break;

        default:
          throw new Error(`Unsupported argument ${argKey}.`);
      }
    }

    return schema;
  }
}

export function buildJoiFloatDirective(directiveName: string): SchemaDirectiveVisitorClass {
  return buildJoiDirective(directiveName, GraphQLFloat, JoiConstrainedFloat);
}

export function buildJoiFloatDirectiveTypedef(directiveName: string) {
  return `
    directive @${directiveName}(
      # value must be greater than or equal to {min}
      min: Float,
      # value must be less than or equal to {max}
      max: Float,
      # value must be greater than {minExclusive}
      # Joi: number.greater - https://joi.dev/api/?v=17.4.0#numbergreaterlimit
      minExclusive: Float,
      # value must be less than {maxExclusive}
      # Joi: number.less - https://joi.dev/api/?v=17.4.0#numberlesslimit
      maxExclusive: Float,
      # sets a maximum number of decimal places allowed
      precision: Int,
    ) on INPUT_FIELD_DEFINITION | ARGUMENT_DEFINITION
  `;
}
