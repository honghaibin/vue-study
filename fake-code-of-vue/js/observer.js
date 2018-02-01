'use strict'
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