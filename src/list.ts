import {
  defaultFieldResolver,
  DirectiveNode,
  GraphQLArgument,
  GraphQLError,
  GraphQLInputField,
  GraphQLInputObjectType,
  GraphQLInputType,
  GraphQLList,
  GraphQLNonNull,
  isInputObjectType,
  isListType,
  isNonNullType,
  isObjectType,
  ValueNode,
} from 'graphql';
import { SchemaDirectiveVisitor, SchemaDirectiveVisitorClass } from 'graphql-tools';
import Joi from 'joi';
import get from 'lodash/get';

export function buildJoiListDirective(directiveName: string): SchemaDirectiveVisitorClass {
  class JoiConstraintListDirective extends SchemaDirectiveVisitor {
    #processedSchemas = new WeakSet();

    // input MyInput {
    //   varOne: [String!]! @list(min: 1)
    // }
    visitInputFieldDefinition(field: GraphQLInputField) {
      this.#assertIsListType(field.type);

      // we need to process the whole schema to find which resolver accept this Input
      this.#processSchema();
    }

    // type Query {
    //   myQuery(var: [String!]! @list(min: 1))
    // }
    visitArgumentDefinition(arg: GraphQLArgument, details) {
      const { field } = details;
      const { resolve = defaultFieldResolver } = field;

      const directiveArguments = this.args;
      const resolverArgumentName = arg.name;
      const joiSchema = this.#getSchema(directiveArguments, resolverArgumentName);

      // TODO:
      //  only set field.resolve the first time & put argName + schema in an internal map
      //  same for processSchema().
      //  this way we only ever have one .resolve wrapper (instead of one per @list)
      //  --
      //  then do the same thing for @nonNull
      field.resolve = function resolveWrapper(...resolverArgs) {
        const fieldArgs = resolverArgs[1];

        const theList = fieldArgs[arg.name];
        if (theList != null) {
          runJoi(joiSchema, theList);
        }

        return resolve.apply(this, resolverArgs);
      };

      return arg;
    }

    #processSchema() {
      if (this.#processedSchemas.has(this.schema)) {
        return;
      }

      const typeMap = this.schema.getTypeMap(); // checking `input {}` definition

      for (const type of Object.values(typeMap)) {
        if (!isObjectType(type)) {
          continue;
        }

        for (const field of Object.values(type.getFields())) {
          const taggedInputs: TaggedInput[] = [];

          for (const arg of field.args) {
            let argType = arg.type;

            // Unpack the "!" operator
            // NB. we're not unpacking lists because @nonNull does not make sense inside the list, use "!" for that.
            //  so @nonNull only tags the list itself
            if (isNonNullType(argType)) {
              argType = argType.ofType;
            }

            if (isInputObjectType(argType)) {
              const foundInputFields = findTaggedInputFields(
                argType,
                directiveName,
                [arg.name],
              );

              taggedInputs.push(...foundInputFields);
            }
          }

          if (taggedInputs.length > 0) {
            taggedInputs.sort((a, b) => a.path.length - b.path.length);
            const { resolve = defaultFieldResolver } = field;

            const schemas = new WeakMap<TPath, Joi.Schema>();
            for (const taggedInput of taggedInputs) {
              const joiSchema = this.#getSchema(taggedInput.directiveArgs, taggedInput.path.join('.'));
              schemas.set(taggedInput.path, joiSchema);
            }

            // eslint-disable-next-line @typescript-eslint/no-loop-func
            field.resolve = function resolveWrapper(...resolverArgs) {
              const fieldArgs = resolverArgs[1];

              for (const taggedInput of taggedInputs) {
                const theList = get(fieldArgs, taggedInput.path);

                // nullability is handled by ! or @nonNull
                if (theList == null) {
                  continue;
                }

                const joiSchema = schemas.get(taggedInput.path);

                runJoi(joiSchema, theList);
              }

              return resolve.apply(this, resolverArgs);
            };
          }
        }
      }

      this.#processedSchemas.add(this.schema);
    }

    #getSchema(args: DirectiveArgs, propertyName: string): Joi.Schema {
      let joiSchema = Joi.array().label(propertyName);

      for (const argKey of Object.keys(args)) {
        const argVal = args[argKey];

        switch (argKey) {
          case 'min':
            joiSchema = joiSchema.min(argVal);
            break;

          case 'max':
            joiSchema = joiSchema.max(argVal);
            break;

          default:
            throw new Error(`Unsupported argument ${argKey}.`);
        }
      }

      return joiSchema;
    }

    #assertIsListType(type: GraphQLInputType): asserts type is GraphQLList<any> {
      if (isNonNullType(type)) {
        type = type.ofType;
      }

      if (!isListType(type)) {
        throw new Error(`@${directiveName} can only be used on type GraphQLList. It was used on ${type.name}`);
      }
    }
  }

  return JoiConstraintListDirective;
}

function runJoi(joiSchema, value) {
  const output = joiSchema.validate(value, { convert: false });

  if (output.error) {
    throw new GraphQLError(output.error.message);
  }
}

type TPath = string[];
type TaggedInput = { path: TPath, directiveArgs: DirectiveArgs };
type DirectiveArgs = { [key: string]: any };

function findTaggedInputFields(inputType: GraphQLInputObjectType, directiveName: string, path = []): TaggedInput[] {
  const matchedFields: TaggedInput[] = [];

  for (const field of Object.values(inputType.getFields())) {
    // find nested objects
    // unpack "!" operator
    let fieldType = field.type;

    if (fieldType instanceof GraphQLNonNull) {
      fieldType = fieldType.ofType;
    }

    if (fieldType instanceof GraphQLInputObjectType) {
      // sub-input objects
      findTaggedInputFields(fieldType, directiveName, [...path, field.name]);
    } // find @nonNull directives
    // this is the tagged input property!

    const foundDirective = field.astNode.directives.find(d => d.name.value === directiveName);

    if (foundDirective != null) {
      matchedFields.push({
        path: [...path, field.name],
        directiveArgs: getDirectiveArgs(foundDirective),
      });
    }
  }

  return matchedFields;
}

function getDirectiveArgs(directive: DirectiveNode): DirectiveArgs {
  const out = Object.create(null);

  if (!directive.arguments) {
    return out;
  }

  for (const { name: nameNode, value } of directive.arguments) {
    const name = nameNode.value;

    out[name] = getValueNodeValue(value, directive.name.value, [name]);
  }

  return out;
}

function getValueNodeValue(node: ValueNode, directiveName: string, argumentPath: string[]) {
  if (node.kind === 'Variable') {
    throw new Error(`Directive @${directiveName} does not accept Variable arguments (argument ${argumentPath.join(' -> ')})`);
  }

  if (node.kind === 'NullValue') {
    return null;
  }

  if (node.kind === 'ListValue') {
    return node.values.map(valueNode => getValueNodeValue(valueNode, directiveName, argumentPath));
  }

  if (node.kind === 'ObjectValue') {
    const out = Object.create(null);

    for (const field of node.fields) {
      const fieldName = field.name.value;

      out[fieldName] = getValueNodeValue(field.value, directiveName, [...argumentPath, fieldName]);
    }

    return out;
  }

  if (node.kind === 'IntValue' || node.kind === 'FloatValue') {
    return Number(node.value);
  }

  return node.value;
}

export function buildJoiListDirectiveTypedef(directiveName: string) {
  return `
directive @${directiveName}(
  # requires a minimum of {min} items in the list
  min: Int,
  # requires a maximum of {max} items in the list
  max: Int,
  # requires exactly {length} items in the list
  length: Int,
  # removes duplicate items from the list
  unique: Boolean,
) on INPUT_FIELD_DEFINITION | ARGUMENT_DEFINITION
  `;
}
