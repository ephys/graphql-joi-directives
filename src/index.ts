import { buildJoiFloatDirective, buildJoiFloatDirectiveTypedef } from './float';
import { buildJoiIntDirective, buildJoiIntDirectiveTypedef } from './int';
import { buildJoiListDirective, buildJoiListDirectiveTypedef } from './list';
import { buildJoiStrDirective, buildJoiStrDirectiveTypedef } from './str';

export {
  buildJoiStrDirective, buildJoiIntDirective, buildJoiFloatDirective, buildJoiListDirective,
  buildJoiStrDirectiveTypedef, buildJoiIntDirectiveTypedef, buildJoiFloatDirectiveTypedef, buildJoiListDirectiveTypedef
};

export const joiConstraintDirectives = {
  str: buildJoiStrDirective('str'),
  int: buildJoiIntDirective('int'),
  float: buildJoiFloatDirective('float'),
  list: buildJoiListDirective('list'),
};

export const joiContraintDirectivesTypedefs = [
  buildJoiStrDirectiveTypedef('str'),
  buildJoiIntDirectiveTypedef('int'),
  buildJoiFloatDirectiveTypedef('float'),
  buildJoiListDirectiveTypedef('list'),
];
