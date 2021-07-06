# graphql-joi-directives

Add constraint validation to your GraphQL Inputs using [Joi](https://www.npmjs.com/package/joi)

# Install

Add the package using [`npm i @ephys/graphql-joi-directives`](https://www.npmjs.com/package/@ephys/graphql-joi-directives)

*This package was built with graphql-tools and supports Apollo.*

Add the directives and the type definitions to your GraphQL schema:

```typescript
import { joiConstraintDirectives, joiContraintDirectivesTypedefs } from '@ephys/graphql-joi-directives';

// ...

const schema = makeExecutableSchema({
  //            V this is an array
  typeDefs: [...joiContraintDirectivesTypedefs],
  schemaDirectives: {
    // V this is an object
    ...joiConstraintDirectives,
  },
});

const server = new ApolloServer({ schema });

// ...
```

# The directives

By default, the following directives are exposed.

They can be used on **fields in inputs** & on **arguments definitions**

## Strings: @str

Can be used on the `String` & `[String]` types

```graphql
directive @str(
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
) on INPUT_FIELD_DEFINITION | ARGUMENT_DEFINITION

enum JoiDirectiveCaseEnum {
  UPPER
  LOWER
}
```

## Ints: @int

Can be used on the `Int` & `[Int]` types

```graphql
directive @int(
  min: Int,
  max: Int
) on INPUT_FIELD_DEFINITION | ARGUMENT_DEFINITION
```

## Floats: @float

Can be used on the `Float` & `[Float]` types

```graphql
directive @float(
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
```

## Lists: @list

Can be used on any list type

```graphql
directive @list(
  # requires a minimum of {min} items in the list
  min: Int,
  # requires a maximum of {max} items in the list
  max: Int,
  # requires exactly {length} items in the list
  length: Int,
  # removes duplicate items from the list
  unique: Boolean,
) on INPUT_FIELD_DEFINITION | ARGUMENT_DEFINITION
```
