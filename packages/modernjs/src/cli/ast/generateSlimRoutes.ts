import fs from 'fs';
import traverse from '@babel/traverse';
import * as babelParser from '@babel/parser';
import generate from '@babel/generator';
import * as t from '@babel/types';

function generateSlimRoutes({
  sourceCode,
  filePath,
  prefix,
}: {
  sourceCode: string;
  filePath: string;
  prefix: string;
}) {
  const ast = babelParser.parse(sourceCode, {
    sourceType: 'module',
  });

  const removedKeys = [
    'component',
    'shouldRevalidate',
    'lazyImport',
    '_component',
  ];

  traverse(ast, {
    ObjectExpression(path) {
      if (!Array.isArray(path.node.properties)) {
        return;
      }
      path.node.properties.forEach((prop) => {
        if (
          'key' in prop &&
          'value' in prop.key &&
          'value' in prop &&
          'value' in prop.value &&
          prop.key.value === 'id'
        ) {
          prop.value = t.stringLiteral(`${prefix}${prop.value.value}`);
        }
        path.node.properties = path.node.properties.filter((p) => {
          if ('key' in p) {
            if ('value' in p.key && typeof p.key.value === 'string') {
              return !removedKeys.includes(p.key.value);
            } else {
              return true;
            }
          } else {
            return true;
          }
        });
      });
    },
  });

  const tempCode = generate(ast).code;

  const tempAst = babelParser.parse(tempCode, {
    sourceType: 'module',
  });

  const usedIdentifiers = new Set();

  traverse(tempAst, {
    Identifier(path) {
      if (t.isProperty(path.parent)) {
        usedIdentifiers.add(path.node.name);
      }
    },
  });

  traverse(tempAst, {
    ImportDeclaration(path) {
      path.node.specifiers = path.node.specifiers.filter((specifier) =>
        usedIdentifiers.has(specifier.local.name),
      );

      if (!path.node.specifiers.length) {
        path.remove();
      }
    },
  });

  const { code: newCode } = generate(tempAst);
  fs.writeFileSync(filePath, newCode);
}

export { generateSlimRoutes };
