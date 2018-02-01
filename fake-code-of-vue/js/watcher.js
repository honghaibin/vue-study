'use strict'
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