# 根据库命名空间的调用导入模块

根据一个库的命名空间的调用进行按需导入。

添加依赖:
```
npm i -D babel-plugin-module-call-import
```

它能将下面代码：
```
import utils from 'utils@'
utils.downloadFile('path/to/file')
```
转换为：
```
import _downloadFile from 'utils@/downloadFile'
_downloadFile('path/to/file')
```

或者将下面代码：
```
import * as Antd from 'antd';
ReactDOM.render(<Antd.Button>xxxx</Antd.Button>);
```

转换为：
```
import Button from 'antd/lib/button';
import('antd/lib/button');
ReactDOM.render(<Button>xxxx</Button>);
```

还支持将
```
import El from 'element-ui';

export default {
  name: 'TestComponent',
  components: {
    [El.ButtonGroup.name]: El.ButtonGroup,
    [El.Button.name]: El.Button,
  },
};
```
转换为
```
import ButtonGroup from 'element-ui/lib/button-group';
import Button from 'element-ui/lib/button';

export default {
  name: 'TestComponent',
  components: {
    [ButtonGroup.name]: ButtonGroup,
    [Button.name]: Button,
  },
};
```

## 选项

### components

类型为：`{ [componentId: string]: (libraryName: string, ...modules: string[]) => {source: string, extras: string[]} }`。

库按需导入配置。

值为一个对象，每个键为库的id, 如`antd`, `@component`等，等源码中导入语句中的地址匹配库id时，就会开启按需导入。如：
```
import * as Ad from 'antd';
import Comp from '@component';
```
如果配置了`antd`, `@component`两个库的化，就会触发。

library对象的值为一个回调配置函数，函数传递的第一个参数为`libraryName`库名，其他参数都作为`modules`模块列表, 返回一个新导入的信息。
* `componentName`为导入的组件名，如`import { Button } from 'antd';`中`libraryName`会为`antd`;
* `modules`为库引用时的引用路径上的模块列表，如`import * as Ad from 'antd'; Ad.a.b.c.d`，那么`modules`会为`['a', 'b', 'c', 'd']`, 对模块列表生成动态的导入路径，可以控制那些是作为模块导入路径，那些是模块上的属性;
* 返回的一个新导入信息对象，对象的格式为：`{source: string,extras: string[]}`；
  * `source`为新导入语句的导入地址，如设置`/path/to/file.js`将会生成语句`import moduleId from '/path/to/file.js'`；
  * `extras`为额外导入地址，通常可用于UI组件库的其他资源导入，如样式资源。不配置或者配置为空不生成额外导入；



