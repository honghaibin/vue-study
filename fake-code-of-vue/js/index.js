'use strict'
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