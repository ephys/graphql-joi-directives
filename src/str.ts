import { GraphQLString } from 'graphql';
import { SchemaDirectiveVisitorClass } from 'graphql-tools';
import * as Joi from 'joi';
import { buildJoiDirective, JoiConstrainedScalar } from './_internal';

class JoiConstrainedString extends JoiConstrainedScalar {
  buildJoi(fieldName: string, args: any) {
    let schema = Joi.string().label(fieldName);

    const min = args.min ?? 0;
    if (min === 0) {
      schema = schema.allow('');
    }

    for (const argKey of Object.keys(args)) {
      const argVal = args[argKey];

      switch (argKey) {
        case 'min':
          schema = schema.min(argVal);
          break;

        case 'max':
          schema = schema.max(argVal);
          break;

        case 'length':
          schema = schema.length(argVal);
          break;

        case 'trim':
          schema = schema.trim(argVal);
          break;

        case 'pattern':
          schema = schema.pattern(parseRegExp(argVal));
          break;

        case 'creditCard': {
          if (argVal) {
            schema = schema.creditCard();
          }

          break;
        }

        case 'case':
          schema = schema.case(argVal.toLowerCase());
          break;

        case 'isoDate': {
          if (argVal) {
            schema = schema.isoDate();
          }

          break;
        }

        case 'isoDuration': {
          if (argVal) {
            schema = schema.isoDuration();
          }

          break;
        }

        default:
          throw new Error(`Unsupported argument ${argKey}.`);
      }
    }

    return schema;
  }
}

export function buildJoiStrDirective(tag: string): SchemaDirectiveVisitorClass {
  return buildJoiDirective(tag, GraphQLString, JoiConstrainedString);
}

function parseRegExp(regExpStr) {
  if (typeof regExpStr !== 'string') {
    throw new TypeError('Invalid argument: not a string.');
  }

  const start = regExpStr.indexOf('/');
  const end = regExpStr.lastIndexOf('/');

  if (start === -1 || start === end) {
    throw new TypeError('Invalid RegExp syntax, matcher should be surrounded with slashes.');
  }

  const matcher = regExpStr.substring(start + 1, end);

  if (matcher === '') {
    throw new TypeError('Invalid RegExp syntax, empty matcher.');
  }

  const options = regExpStr.substr(end + 1);

  return new RegExp(matcher, options);
}

export function buildJoiStrDirectiveTypedef(directiveName: string) {
  return `
    directive @${directiveName}(
      # requires a minimum length of {min}
      min: Int,
      # requires a maximum length of {max}
      max: Int,
      # requires a length of exactly {length}
      length: Int,
      # trims the string before validation
      trim: Boolean,
      # ensure the string matches the provided regexp.
      # example
      # | pattern: "/[a-zA-Z0-9]/i"
      pattern: String,
      # requires the string to match a credit card format
      creditCard: Boolean,
      # converts casing, can be 'UPPER' or 'LOWER'
      case: JoiDirectiveCaseEnum
      # format must be a valid ISO date
      isoDate: Boolean,
      # format must be a valid ISO duration
      isoDuration: Boolean,

      # email: EmailInput
      # uuid: UuidInput
    ) on INPUT_FIELD_DEFINITION | ARGUMENT_DEFINITION

    enum JoiDirectiveCaseEnum {
      UPPER
      LOWER
    }
  `;
}
