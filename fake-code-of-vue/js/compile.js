'use strict'
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
      this.el.appendChild(this.fragment);
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