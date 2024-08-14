import fs from 'fs';
import traverse from '@babel/traverse';
import * as babelParser from '@babel/parser';
import generate from '@babel/generator';
import * as t from '@babel/types';
import {
  COMPONENT,
  ID,
  SHOULD_REVALIDATE,
  LAZY_COMPONENT,
  PRIVATE_COMPONENT,
} from './constant';

function generateSlimRoutes({
  sourceCode,
  filePath,
  prefix,
  baseName,
}: {
  sourceCode: string;
  filePath: string;
  prefix: string;
  baseName: string;
}) {
  const ast = babelParser.parse(sourceCode, {
    sourceType: 'module',
  });

  const removedKeys = [
    COMPONENT,
    SHOULD_REVALIDATE,
    LAZY_COMPONENT,
    PRIVATE_COMPONENT,
  ];

  traverse(ast, {
    ImportDeclaration(path) {
      const source = path.node.source.value;
      const routeIdMatch = source.match(/routeId=([^&]+)/);
      if (routeIdMatch) {
        const originalRouteId = routeIdMatch[1];
        const newRouteId = `${prefix}${originalRouteId}`;
        const newSource = source.replace(
          /routeId=[^&]+/,
          `routeId=${newRouteId}`,
        );
        path.node.source = t.stringLiteral(newSource);
      }
    },
    ObjectExpression(path) {
      if (!Array.isArray(path.node.properties)) {
        return;
      }
      path.node.properties.forEach((prop) => {
        if (
          t.isObjectProperty(prop) &&
          t.isStringLiteral(prop.key) &&
          t.isStringLiteral(prop.value) &&
          prop.key.value === ID
        ) {
          prop.value = t.stringLiteral(`${prefix}${prop.value.value}`);
        }
      });

      path.node.properties = path.node.properties.filter((p) => {
        if (t.isObjectProperty(p) && t.isStringLiteral(p.key)) {
          return !removedKeys.includes(p.key.value);
        } else {
          return true;
        }
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
  const finalCode = `${newCode}export const baseName = '${baseName}';`;
  fs.writeFileSync(filePath, finalCode);
}

export { generateSlimRoutes };
