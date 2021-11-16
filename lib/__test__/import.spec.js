const babel = require('@babel/core');
const _ = require('lodash');
const plugin = require('../index');

function testUnit(source,
  {
    components = {},
    callback = (libraryName, ...modules) => `${libraryName}/${_.kebabCase(modules[1])}`,
  } = {}) {
  const { code } = babel.transform(source, {
    filename: 'path/to/file.js',
    sourceType: 'module',
    plugins: [[plugin, {
      components: {
        common: callback,
        ...components,
      },
    }]],
  });
  expect(code).toMatchSnapshot();
}

test('命名空间导入', () => {
  testUnit(`
    import * as Ad from 'antd';

    console.log(Ad.Row);
    console.log(Ad.DatePicker);
  `, {
    components: {
      antd(libraryName, ...modules) {
        return {
          source: `${libraryName}/lib/${_.kebabCase(modules[1])}`,
          extras: [
            `${libraryName}/lib/${_.kebabCase(modules[1])}/style`,
          ],
        };
      },
    },
  });
});
test('默认导入', () => {
  testUnit(`
    import El from 'element-ui';

    export default {
      name: 'TestComponent',
      components: {
        [El.ButtonGroup.name]: El.ButtonGroup,
        [El.Button.name]: El.Button,
      },
      data() {
        return {};
      },
    };
  `, {
    components: {
      'element-ui': (libraryName, ...modules) => ({
        source: `${libraryName}/lib/${_.kebabCase(modules[1])}`,
        extras: [`${libraryName}/lib/theme-chalk/${_.kebabCase(modules[1])}.css`],
      }),
    },
  });
});
test('具名导入', () => {
  testUnit(`
    import { Row, DatePicker } from 'antd';

    console.log(Row);
    console.log(DatePicker);
  `);
});
test('具名和默认导入', () => {
  testUnit(`
    import { Row, default as Ad } from 'antd';

    console.log(Row);
    console.log(Ad.DatePicker);
  `, {
    components: {
      antd(libraryName, ...modules) {
        return {
          source: `${libraryName}/lib/${_.kebabCase(modules[1])}`,
        };
      },
    },
  });
});
test('定制支持深层次使用', () => {
  testUnit(`
    import common from 'common';

    console.log(common.utils.ajax.params.parse);
  `, {
    callback(libraryName, ...modules) {
      return {
        source: [libraryName, ...modules.map((mod) => _.kebabCase(mod))].join('/'),
        namespaceLevel: 3,
      };
    },
  });
});
test('当不定制更深层时，当作属性使用', () => {
  testUnit(`
    import common from 'common';

    console.log(common.baseMixin.title);
  `);
});
