const types = require('@babel/types');

/**
 * 获取链式调用最终节点
 */
exports.getAccessChain = (path) => {
  while (path.isMemberExpression()) {
    if (!path.parentPath.isMemberExpression()) {
      return path;
    }

    // eslint-disable-next-line no-param-reassign
    path = path.parentPath;
  }
  return null;
};

exports.stringifyAccess = (node, rootPath) => {
  if (types.isIdentifier(node)) {
    if (node.computed) {
      throw rootPath.buildCodeFrameError('Do not call function by dynamically');
    }
    return node.name;
  }

  if (types.isMemberExpression(node)) {
    if (node.computed) {
      throw rootPath.buildCodeFrameError('Do not call function by dynamically');
    }
    const { property, object } = node;

    if (!types.isIdentifier(property)) {
      throw rootPath.buildCodeFrameError('Do not call function by dynamically');
    }
    const currentName = property.name;
    return `${exports.stringifyAccess(object, rootPath)}.${currentName}`;
  }

  return '';
};

exports.getLevelAccessChain = (path, namespaceLevel) => {
  if (!path.isMemberExpression() && !path.isIdentifier()) {
    throw path
      .buildCodeFrameError(`member should be expression or identifier， but type is ${
        path.node.type}`);
  }
  if (namespaceLevel <= 0) {
    return path;
  }

  return exports.getLevelAccessChain(path.parentPath, namespaceLevel - 1);
};
