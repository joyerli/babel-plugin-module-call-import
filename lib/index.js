const _ = require('lodash');
const { addDefault, addSideEffect } = require('@babel/helper-module-imports');
const {
  getAccessChain,
  stringifyAccess,
  getLevelAccessChain,
} = require('./babel-utils');

const importComponent = _.memoize(
  (source, extras = [], path) => {
    if (_.isArray(extras) && !_.isEmpty(extras)) {
      extras.forEach((extra) => addSideEffect(path, extra));
    }
    return addDefault(path, source);
  },
  (source, extras = []) => extras.concat(source).join(','),
);
const computedComponentSource = _.memoize((getModules, ...calls) => getModules(...calls),
  (__, ...calls) => calls.join('.'));

module.exports = ({ types }) => {
  const handledSources = new Map();

  return {
    pre() {
      computedComponentSource.cache.clear();
    },
    visitor: {
      Program(root, {
        opts: {
          library = {},
        } = {},
      }) {
        importComponent.cache.clear();
        handledSources.clear();
        const componentNames = Object.keys(library);
        if (!componentNames.length) {
          return;
        }

        const imports = [];
        const { file } = root.hub;

        // 当前文件是否是一个模块
        const isModule = file.ast.program.body.find((node) => types.isModuleDeclaration(node));
        if (!isModule) {
          return;
        }

        // 得到所有的导入
        file.path.traverse({
          ImportDeclaration: {
            exit(path) {
              const { node } = path;
              const specifiers = [];

              imports.push({
                source: node.source.value,
                specifiers,
              });

              path.get('specifiers').forEach((specifier) => {
                const local = specifier.node.local.name;
                if (specifier.isImportDefaultSpecifier()) {
                  specifiers.push({
                    kind: 'named',
                    imported: 'default',
                    local,
                  });
                  return;
                }

                if (specifier.isImportSpecifier()) {
                  const importedName = specifier.node.imported.name;
                  specifiers.push({
                    kind: 'named',
                    imported: importedName,
                    local,
                  });
                }

                if (specifier.isImportNamespaceSpecifier()) {
                  specifiers.push({
                    kind: 'namespace',
                    imported: '',
                    local,
                  });
                }
              });
            },
          },
        });

        // 处理每一个导入语句
        imports.forEach((importModule) => {
          const { source, specifiers = [] } = importModule;
          if (!componentNames.includes(source)) {
            return;
          }

          const componentOpt = library[source];
          const getModules = _.isFunction(componentOpt) ? componentOpt : componentOpt.modules;
          if (!_.isFunction(getModules)) {
            throw new Error('modules should be function');
          }

          // 只处理默认导入和命名空间导入场景, 其他的都被忽略
          const spec = specifiers.find(
            (item) => item.imported === 'default' || item.kind === 'namespace',
          );
          if (!spec) {
            return;
          }
          const isOnlyDefaultImport = specifiers.length === 1;
          const { local } = spec;
          const binding = file.scope.getBinding(local);

          binding.referencePaths.forEach((refPath) => {
            const { parentPath } = refPath;
            if (parentPath.isMemberExpression()) {
              const accessChainPath = getAccessChain(parentPath);
              const callStr = stringifyAccess(accessChainPath.node, accessChainPath);
              if (!callStr) {
                throw accessChainPath.buildCodeFrameError('Failed to get call chain');
              }
              let componentSource;
              let namespaceLevel = 0;
              let extras = [];
              const customerComponentOption = computedComponentSource(
                getModules, source, ...callStr.split('.'),
              );
              if (_.isString(customerComponentOption)) {
                componentSource = customerComponentOption;
              } else {
                ({
                  namespaceLevel = 0,
                  source: componentSource,
                  extras = [],
                } = customerComponentOption);
              }

              if (!_.isInteger(namespaceLevel) || namespaceLevel < 0) {
                throw new Error('namespaceLevel needs an integer greater than or equal to 0');
              }

              const moduleNode = importComponent(componentSource, extras, file.path);

              const actualAccessPath = getLevelAccessChain(
                parentPath, namespaceLevel,
              );
              actualAccessPath.replaceWith(moduleNode);
              handledSources.set(source, isOnlyDefaultImport);
              return;
            }
            throw new Error('Conversion to on demand loading is not supported');
          });
        });
      },
      ImportDeclaration(path) {
        if (!handledSources.has(path.node.source.value)) {
          return;
        }
        const isOnlyDefaultImport = handledSources.get(path.node.source.value);
        if (isOnlyDefaultImport) {
          path.remove();
          return;
        }
        const specifierPaths = path.get('specifiers');
        specifierPaths.forEach((specifier) => {
          if (specifier.isImportDefaultSpecifier()
            || _.get(specifier, 'node.imported.name') === 'default') {
            specifier.remove();
          }
        });
      },
    },
  };
};
