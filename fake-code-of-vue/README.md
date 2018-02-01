# fake-code-of-vue
伪代码实现vue框架原理，适合vue初学者学习。

# 写在前面
Vue框架是典型的前端MVVM框架，最近在国内的热度也是相当之高。

Vue框架的底层是使用es5的`Object.defineProperty()`方法来实现观察者模式的。

Vue原理图：

![观察者模式之Vue原理](https://github.com/honghaibin/vue-study/tree/master/fake-code-of-vue/vue原理.png)

# 功能分析
这次主要针对Vue的数据双向绑定（v-model），指令和生命周期`mounted`功能的实现。我们都知道，Vue的使用很简单，直接`new Vue(options)`new一个vue实例。所以我们需要分清楚功能文件：

* index.js：Vue构造函数
* observer.js：监听器（Observer）和观察者列表（Dep）；
* compile.js：实现模板编译功能，完成事件绑定和页面的渲染；
* watcher.js：观察者构造函数；

# 代码分析

1. index.js

先看代码：
```
function Vue (options) {
  var self = this;
  this.data = options.data;
  this.methods = options.methods;

  // Vue框架中，可以通过Vue实例vm直接访问到data数据，这是因为Vue做了一个代理来实现这个功能的
  Object.keys(this.data).forEach(function (key) {
      self.proxyKeys(key)
  })

  // 对data实现监听操作
  observe(this.data);

  // 编译模板，针对指令、双向绑定和事件作出处理，最后完成渲染操作
  new Compile(options.el, this);

  // 渲染结束之后执行声明周期mounted
  options.mounted.call(this);
}

Vue.prototype = {
  proxyKeys: function (key) {
    var self = this;
    Object.defineProperty(this, key, {
      enumerable: false,
      configurable: true,
      get: function () {
        return self.data[key];
      },
      set: function (newVal) {
        self.data[key] = newVal;
      }
    })
  }
}
```
解析：
>在new一个实例的时候，首先，要在实例vm上对data的所有属性做一个代理，这样对vm实例的数据读取和重新赋值都能映射到data上了。

>实例化的时候还要进行监听操作，和编译模板并渲染操作，最后触发生命周期函数。

2. observer.js

先看代码：
```
function Observer (data) {
  this.data = data;
  // 对data数据的每个属性都做出监听
  this.walk(data);
}

Observer.prototype = {
  walk: function (data) {
    var self = this;
    Object.keys(data).forEach(function (key) {
        // 每一个属性都有一个观察者列表
        self.defineReactive(data, key, data[key]);
    })
  },
  defineReactive: function (data, key, val) {
    // 为这个属性创建一个观察者列表
    var dep = new Dep();

    // observe函数判断val是否为子对象，是子对象就递归调用对子对象也进行监听
    observe(val);

    // 监听的核心代码
    Object.defineProperty(data, key, {
      enumerable: true,
      configurable: true,
      get: function () {
        if (Dep.target) {
          dep.addSub(Dep.target);
        };
        return val;
      },
      // 监听数据变化，通知观察者列表
      set: function (newVal) {
        if (val === newVal) return;
        val = newVal;
        dep.notify()
      }
    })
  }
}

function observe (value, vm) {
  // 判断value是否为对象，是对象就进行监听
  if (!value || typeof value !== 'object') return;
  return new Observer(value);
}

function Dep () {
  // 观察者列表里面都是观察者（watcher）,每一个watcher有一个update方法去更新视图
  this.subs = [];
  var target = null;
}

Dep.prototype = {
  addSub: function (sub) {
    this.subs.push(sub);
  },
  notify: function () {
    this.subs.forEach(function (sub) {
      sub.update();
    })
  }
}
```
解析：
>监听器监听的是一个对象，如果属性值还是一个对象就继续监听这个子对象。

>每个属性都有一个观察者列表，观察者列表里面的每一个观察者都是在属性的get方法执行时被添加。Dep.target其实就是观察者实例，这个在创建Watcher实例的时候会把实例赋值给Dep.target，之后又马上强行触发属性的get方法把这个watcher实例添加进观察者列表，完成之后就释放Dep.target。（一个观察者只会被添加一次）

>每个属性的set方法被触发的时候都会判断值有没有被改变，被改变的话就去遍历观察者列表，执行每个观察者实例的update方法更新页面。

3. watcher.js

代码：
```
function Watcher (vm, exp, callback) {

  // 三个参数：
  // vm: vue实例对象
  // exp: 模板里面的变量名，即属性名
  // callback: 回调函数，主要执行更新页面操作

  this.callback = callback;
  this.vm = vm;
  this.exp = exp;
  this.value = this.get(); // 这部操作很关键，将自己添加进观察者列表中
}

Watcher.prototype = {
  update: function () {
    this.run();
  },
  run: function () {
    // 新的属性值
    var value = this.vm.data[this.exp];
    // 老的属性值
    var oldVal = this.value;
    if (value !== oldVal) {
      this.value = value;
      this.callback.call(this.vm, value, oldVal);
    }
  },
  get: function () {
    Dep.target = this;  // 缓存自己
    // 强制执行监听器里的get函数，又因为Dep.target此时不为null，所以这一步做的就是把当前观察者实例添加进观察者列表。
    var value = this.vm.data[this.exp];
    // 添加成功之后释放自己，因为只需要添加一次就够了
    Dep.target = null;
    return value;
  }
}
```
解析：
>在创建观察者实例的时候都要把创建的观察者实例添加到观察者列表中（通过调用属性强行触发属性的get方法进行添加）；

>每一个观察者（watcher实例）都有一个uodate方法去调用callback回调函数去做出应对操作（例如修改页面内容）；

4. compile.js

先看代码：
```
function Compile (el, vm) {
  // el是模板容器id， vm是vue实例
  this.vm = vm;
  this.el = document.querySelector(el);
  this.fragment = null;
  this.init();
}

Compile.prototype = {
  init: function () {
    if (this.el) {
      // 把容器下面的所有节点依次添加到代码片段中
      this.fragment = this.nodeToFragment(this.el);

      // 编译这个代码片段
      this.compileElement(this.fragment);

      // 把代码片段添加进DOM中的容器中
    }
  },
  nodeToFragment: function (el) {
    var fragment = document.createDocumentFragment();
    var child = el.firstChild;
    while (child) {
      fragment.appendChild(child);
      child = el.firstChild;
    }
    return fragment;
  },
  compileElement: function (el) {
    var childNodes = el.childNodes;
    var self = this;
    childNodes.forEach(function (node) {
      var reg = /\{\{(.*)\}\}/;
      var text = node.textContent;

      if (self.isElementNode(node)) {
        // 如果是标签节点      
        self.compile(node);    
      } else if (self.isTextNode(node) && reg.test(text)) {
        // 如果是文字节点，并且有模板标识'{{}}'
        self.compileText(node, reg.exec(text)[1]);
      }

      // 如果当前节点有子节点，还得继续使用递归的方式对子节点进行编译
      if (node.childNodes && node.childNodes.length) {
        self.compileElement(node);
      }

    })
  },
  compile: function (node) {
    var nodeAttrs = node.attributes;
    var self = this;
    // nodeAttrs是一个类数组，所以能直接使用forEach进行遍历
    Array.prototype.forEach.call(nodeAttrs, function (attr) {
      // attr是一个键值对，例如 v-model="name"
      var attrName = attr.name;
      // 只有指令属性才做处理
      if (self.isDirective(attrName)) {
        var exp = attr.value;
        var dir = attrName.substring(2);
        if (self.isEventDirective(dir)) {
          // 如果是事件指令
          self.compileEvent(node, self.vm, exp, dir);
        } else {
          // v-model指令
          self.compileModel(node, self.vm, exp, dir);
        }
        // 处理完之后删除节点上的指令属性
        node.removeAttribute(attrName);
      }
    })
  },
  compileText: function (node, exp) {
    var self = this;
    var initText = this.vm[exp];
    this.updateText(node, initText);
    // 给属性添加观察者
    new Watcher(this.vm, exp, function (value) {
      self.updateText(node, value);
    })
  },
  compileEvent: function (node, vm, exp, dir) {
    var eventType = dir.split(':')[1];
    var callback = vm.methods && vm.methods[exp];

    if (eventType && callback) {
      node.addEventListener(eventType, callback.bind(vm), false);
    }
  },
  compileModel: function (node, vm, exp, dir) {
    var self = this;
    var val = this.vm[exp];
    this.modelUpdater(node, val);
    // 给属性添加观察者
    new Watcher(this.vm, exp, function (value) {
      self.modelUpdater(node, value);
    })

    // 添加input事件
    node.addEventListener('input', function (e) {
      var newVal = e.target.value;
      if (val === newVal) return;
      self.vm[exp] = newVal;
      val = newVal;
    })
  },
  updateText: function (node, value) {
    node.textContent = typeof value === 'undefined' ? '' : value;
  },
  modelUpdater: function (node, value, oldVal) {
    node.value = typeof value === 'undefined' ? '' : value;
  },
  isDirective: function (attr) {
    return attr.indexOf('v-') === 0;
  },
  isEventDirective: function (dir) {
    return dir.indexOf('on:') === 0;
  },
  isElementNode: function (node) {
    return node.nodeType === 1;
  },
  isTextNode: function (node) {
    return node.nodeType === 3;
  }
}
```

解析：
>Compile实现初始化有3个步骤：1.把容器下面的所有节点依次添加到代码片段中；2.编译这个代码片段，其中包含监听事件等操作；3.把编译好的代码片段放入页面容器中。

>编译节点的时候分三种，一是文字节点，二是标签节点，三是表单节点

>1.文字节点主要操作就是把内容初始化，并且添加一个观察者提供一个回调函数，只要这个属性一变化，监听器就会提示观察者列表遍历每一个观察者并执行回调函数。回调函数做的事就是修改这个节点的textContent

>2.标签节点编译的时候需要检查属性，根据指令属性获取事件类型，然后给节点添加事件监听，回调函数是methods里的方法。

>3.表单节点需要做双向绑定的处理，所以不仅要给属性添加观察者，还要监听表单的input事件，回调函数的作用就是获取表单的newValue去重新赋值。

# 总结
new 一个Vue实例的时候，必须要做三件事：1.完成实例vm到data的映射关系；2.对data的属性进行监听；3.编译模板并渲染（编译的时候要添加观察者，每个观察者都会提供一个回调函数去更新数据）。生命周期函数其实就是在不同时间进行调用的函数。每一个观察者（watcher）在被创建（被实例化）的时候，都要去调用一次属性，通过设置Dep.target为watcher实例本身把实例添加进观察者列表中。