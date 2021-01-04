# 手写 Vue Router、手写响应式实现、虚拟 DOM 和 Diff 算法

## 简答题

### 1、当我们点击按钮的时候动态给 data 增加的成员是否是响应式数据，如果不是的话，如何把新增成员设置成响应式数据，它的内部原理是什么。

```javascript
let vm = new Vue({
 el: '#el'
 data: {
  o: 'object',
  dog: {}
 },
 method: {
  clickHandler () {
   // 该 name 属性是否是响应式的
   this.dog.name = 'Trump'
  }
 }
})
```

答： 不是响应式，根据 Vue2.x 的响应式规则, `this.dog.name = 'Trump'` 并没有调用 `Object.defineProperty` 的 setter 方法, 改写方式 `this.dog = { name: 'Trump' }`, 或者使用 `Vue.set(this.dog, 'name', 'Trump')`

#### Vue.set 实现

```javascript
class Vue {
  static set(target, key, value) {
    Object.defineProperty(target, key, {
      configurable: true, //可配置
      enumerable: true, // 可迭代
      set(newValue) {
        if (target[key] === newValue) {
          return;
        }

        target[key] = value;

        if (typeof newValue === "object") {
          Object.key(newValue).forEach((index) => {
            Vue.set(value, index, value[name]);
          });
        }

        Dep.notify();
      },
      get() {
        Dep.target && Dep.addSub(Dep.target);

        return value;
      },
    });
  }
}
```

### 2、请简述 Diff 算法的执行过程

比较 新旧 vnode 中的差异，有差异就会用 vnode 替换 oldVnode，没有的话进行递归比较 执行 `patchVnode` 如果节点相同, 则进行子节点比较。
如果子节点都存在，则执行 `updateChildren` 函数比较子节点.

## 编程题

### 1、模拟 VueRouter 的 hash 模式的实现，实现思路和 History 模式类似，把 URL 中的 # 后面的内容作为路由的地址，可以通过 hashchange 事件监听路由地址的变化

直接帖代码 ⬇️

```javascript
class VueRouter {
  get [Symbol.toStringTag]() {
    return "VueRouter";
  }
  install(Vue) {
    // 1.判断当前组件是否已经安装
    if (VueRouter.installed) {
      return;
    }
    VueRouter.installed = true;
    // 2.把vue构造函数记录到全局变量
    this.Vue = Vue;
    this.data = Vue.observable({ current: "/" });
    // 3.把创建的Vue实例传入的router对象注入到Vue实例上
    Vue.mixin({
      beforeCreate() {
        if (this.$options.router) {
          Vue.prototype.$router = this.$options.router;
          this.$options.router.init();
        }
      },
    });
  }

  constructor(options) {
    this.options = options;
    this.routerMap = {};
  }

  init() {
    this.createRouterMap();
    this.initComponents();
    this.initEvents();
  }

  initEvents() {
    const { mode } = this.options;
    if (mode === "hash") {
      const setHashCurtURL = () =>
        (this.data.current = window.location.hash.replace("#", ""));

      window.addEventListener("hashchange", () => {
        setHashCurtURL();
      });
      setHashCurtURL();
    } else if (mode === "history") {
      window.addEventListener("popstate", () => {
        this.data.current = window.location.pathname;
      });
    }
  }

  createRouterMap() {
    // 便利所有路由规则，把规则存储为键值对的形式，存储于routeMap中
    this.options.routes.forEach(({ path, component }) => {
      this.routerMap[path] = component;
    });
  }

  initComponents() {
    const { mode } = this.options;
    this.Vue.component("router-link", {
      props: {
        to: String,
      },
      render(h) {
        return h(
          "a",
          {
            attrs: {
              href: this.to,
            },
            on: {
              click: this[`${mode}Click`],
            },
          },
          [this.$slots.default]
        );
      },
      methods: {
        historyClick(e) {
          // 1. 传给事件的参数, 2.网页标题， 3. 地址
          window.history.pushState({}, "", this.to);
          this.$router.data.current = this.to;
          e.preventDefault();
        },
        hashClick(e) {
          window.location.hash = this.to;
          this.$router.data.current = this.to;
          e.preventDefault();
        },
      },
    });

    this.Vue.component("router-view", {
      render: (h) => {
        console.log(this.data.current);
        const component = this.routerMap[this.data.current];
        const Comp =
          (typeof component === "function" && component().default) || component;
        return h(Comp);
      },
    });
  }
}
```

### 2、在模拟 Vue.js 响应式源码的基础上实现 v-html 指令，以及 v-on 指令

直接帖代码 ⬇️, 只帖了需要的部分

```javascript
// complier.js
class Compiler {
  constructor(vm) {
    this.el = vm.$el;
    this.vm = vm;
    this.compile(this.el);
  }
  // 编译模版，处理文本和元素节点
  compile(el) {
    const childNode = [].slice.apply(el.childNodes);

    childNode.forEach((node) => {
      if (this.isTextNode(node)) {
        this.compileText(node);
      } else if (this.isElementNode(node)) {
        // 处理元素节点
        this.compileElement(node);
      }
      // 递归调用子节点
      if (node.childNodes && node.childNodes.length) {
        this.compile(node);
      }
    });
  }
  // 编译元素节点，处理指令
  compileElement(node) {
    const attrs = [].slice.apply(node.attributes);
    attrs.forEach((attr) => {
      const eventType = this.isEvent(attr.name);
      // 事件
      if (eventType) {
        this.injectEvent(node, eventType, attr.value);
      } else if (this.isDirective(attr.name)) {
        const attrName = attr.name.substr(2);
        const key = attr.value;
        this.update(node, key, attrName);
      }
  }
  update(node, key, attrName) {
    const updateFn = this[`${attrName}Updater`];
    updateFn && updateFn.call(this, node, this.vm[key], key);
  }
  injectEvent(node, eventType, attrContent) {
    const parenthesesReg = /\((.+?)\)/i;
    const args = attrContent.match(parenthesesReg);
    const fnName = attrContent.replace(parenthesesReg, "");
    const fn = this.vm[fnName];
    if (fn) {
      if (args) {
        const params = args[1].split(",");
        // 只处理了number 和 s t r
        params.forEach((item, index) => {
          params[index] = Number(item) || item;
        });
        node.addEventListener(eventType, () => {
          fn.bind(this.vm)(...params);
        });
      } else {
        node.addEventListener(eventType, fn.bind(this.vm));
      }
    }
  }

   // 处理 v-html
  htmlUpdater(node, value, key) {
    node.innerHTML = value;
    new Watcher(this.vm, key, (newValue) => {
      node.innerHTML = newValue;
    });
  }
  // 判断是否是事件
  isEvent(attrName) {
    if (attrName.startsWith("v-on:")) {
      return attrName.substr(5);
    }
    if (attrName.startsWith("@")) {
      return attrName.substr(1);
    }
    return false;
  }

    // 判断元素属性是否是指令
  isDirective(attrName) {
    return attrName.startsWith("v-");
  }
}

```

### 3、参考 Snabbdom 提供的电影列表的示例，利用 Snabbdom 实现类似的效果

```typescript
import { init } from "snabbdom/build/package/init";
import { h } from "snabbdom/build/package/h";

import { styleModule } from "snabbdom/build/package/modules/style";
import { eventListenersModule } from "snabbdom/build/package/modules/eventlisteners";
import { attributesModule } from "snabbdom/build/package/modules/attributes";
import { propsModule } from "snabbdom/build/package/modules/props";

import data from "./data.json";

import "./index.scss";

const patch = init([
  styleModule,
  eventListenersModule,
  attributesModule,
  propsModule,
]);

let vnode: any = document.querySelector("#list");

// 删除
const removeRecord = (index) => {
  data.splice(index, 1);
  render();
};
// 排序
const sortRecord = (prop) => {
  data.sort((a, b) => {
    if (a[prop] > b[prop]) {
      return b[prop] - a[prop];
    }
    if (a[prop] < b[prop]) {
      return a[prop] - b[prop];
    }
    return 0;
  });
  render();
};
// 渲染
const render = () => {
  vnode = patch(
    vnode,
    h("div.table", null, [
      h(
        "button",
        {
          on: {
            click: () => {
              sortRecord("id");
            },
          },
        },
        "通过 id 排序"
      ),
      h(
        "table",
        {
          attrs: {
            width: "100%",
            border: 1,
            cellspacing: 0,
          },
        },
        [
          h(
            "thead",
            null,
            ["id", "名称", "类型", "评分", "操作"].map((col) =>
              h("th", null, col)
            )
          ),
          h(
            "tbody",
            null,
            data?.map((item, index) =>
              h(
                "tr",
                {
                  props: {
                    key: item.id,
                  },
                },
                [
                  ...Object.keys(item)?.map((key) => h("td", {}, item[key])),
                  h("td", null, [
                    h(
                      "button",
                      {
                        on: {
                          click: () => {
                            removeRecord(index);
                          },
                        },
                      },
                      "删除"
                    ),
                  ]),
                ]
              )
            )
          ),
        ]
      ),
    ])
  );
};

render();

```
