# 模块1: 函数式编程与JS异步，实现Promise

## 简答题

谈如何理解JS异步编程的，EventLoop，消息队列都是做什么的，什么是宏任务，什么是微任务

**1.为什么需要异步编程**
由于是单线程而且在执行同步任务的时候会出现堵塞的现象，JS的异步是为了让一些耗时代码在回调函数内执行，而不影响其他代码的执行。

**2.EventLoop**
是js代码的执行机制，也是执行规则。入栈和出栈，以及消息队列执行的顺序

**3.消息队列**
异步方法执行过后，把需要执行的代码块( 回调函数 )按照规定的先后顺序执行。形成一组队列等待被浏览器调用。宏任务放在回调队列，微任务放在微任务队列。

**4.宏任务与微任务**
宏任务会在微任务执行之前执行，然后将回调函数放入消息队列中，接着再去执行微任务。但是回调队列的执行会再微任务之后执行。
常见的微任务：Promise new 之后的方法 then, catch, finally , MutationObserver,  Nodejs中的 process.nextTick
宏任务: 定时器系列，requestAnimationFrame

## 代码题

```javascript
const fp = require('lodash/fp')
// 一.
const queueOfOne = ["hello", "lagou", "I love U"];
const task1 = (nextValue = '') => {
    return new Promise((resolve, reject) =>{
        setTimeout(resolve, 10, nextValue + (queueOfOne.shift()) + ' ')
    })
}

task1('').then(task1).then(task1).then(console.log)

// 二.
// 1. 
const isLastInStock = fp.flowRight(fp.prop('in_stock'), fp.last)
// 2.
const isFirstName = fp.flowRight(fp.prop('name'), fp.first)
// 3.
const _average = (xs) => fp.reduce(fp.add, 0, xs) / xs.length
const averageDollarValue = fp.flowRight(_average, fp.map(car => car.dollar_values))

// 4.
const _undersource = fp.replace(/\W+/g, '_')
const sanitizeNames = fp.flowRight(fp.split(','), _undersource, fp.toLower, fp.join(''))

// 三.
// 1.
const likeFunctor = [5, 6, 1]
const ex1 = (addCont) => {
    // 如果使用 Functor:  Maybe.map(fp.map(fp.add(addCont)))
    return fp.map(fp.add(addCont))(likeFunctor)
}

// 2.
const ex2 = () => {
    // 如果使用 Functor:  Container.map(fp.first)
    return fp.first(likeFunctor)
}

// 3.
const likeObjFunctor = {id: 2, name: 'Albert'}
const safeProp = fp.curry((x, o) => x[o])
const ex3 = (propName) => { 
    // 如果使用 Functor: Maybe.map((v)=>fp.flowRight(fp.first, safeProp(v))(propName))
    return fp.flowRight(fp.first, safeProp(likeObjFunctor))(propName)
}
// 4.
const ex4 = (n) => {
    // 如果使用 Functor: Maybe.of(n).map(parseInt)
    if (n) {
        parseInt(n)
    }
}

const results = [
    averageDollarValue([{dollar_values: 1}]),
    sanitizeNames(['Hellow World']),
    ex1(4),
    ex2(),
    ex3('name'),
    ex4(null)
]
results.forEach((x) => console.log(x))
```

## 自定义Promise

```javascript
const PENDING = "pending";
const FULFILLED = "fulfilled";
const REJECTED = "rejected";

const isFnType = (variable) => typeof variable === "function";

class MyPromise {
  constructor(executor) {
    if (!isFnType(executor)) {
      throw new Error("MyPromise 必须用一个function来作为参数");
    }
    try {
      executor && executor(this._resolve, this._reject);
    } catch (e) {
      this.reject(e);
    }
  }
  status = PENDING;
  // 成功值
  value = undefined;
  // 失败原因
  reason = undefined;
  // 成功回调
  successCB = [];
  // 失败回调
  failedCB = [];

  _resolve = (val) => {
    const run = () => {
      if (this.status !== PENDING) return;
      this.status = FULFILLED;
      // 执行成功队列
      const runSuccess = (value) => {
        let cb;
        while ((cb = this.successCB.shift())) {
          cb(value);
        }
      };
      // 执行失败队列
      const runFailed = (error) => {
        let cb;
        while ((cb = this.failedCB.shift())) {
          cb(error);
        }
      };

      /**
       * resolve值为promise对象续等待promise的状态改变
       */
      if (val instanceof MyPromise) {
        value
          .then((value) => {
            this.value = value;
            runSuccess(value);
          })
          .catch((reason) => {
            this.reason = reason;
            runFailed(reason);
          });
      } else {
        this.value = val;
        runSuccess(val);
      }
    };

    setTimeout(run, 0);
  };

  _reject = (reason) => {
    const run = () => {
      if (this.status !== PENDING) return;
      this.status = REJECTED;
      this.reason = reason;
      let cb;
      while ((cb = this.failedCB.shift())) {
        cb(reason);
      }
    };

    setTimeout(run, 0);
  };

  then = (successCB, failedCB) => {
    const { reason, value, status } = this;
    const nextMyPromise = new MyPromise((nextResolve, nextReject) => {
      // 成功时执行的函数
      let fulfilled = (value) => {
        try {
          // 如果返回的不是function调用上一个promise的值
          if (!isFnType(successCB)) {
            nextResolve(value);
          } else {
            let res = successCB(value);
            if (nextMyPromise === res) {
              throw new TypeError("promise 被循环调用");
            } else if (res instanceof MyPromise) {
              res.then(nextResolve, nextReject);
            } else {
              nextResolve(value);
            }
          }
        } catch (err) {
          // 如果函数执行出错，新的Promise对象的状态为失败
          nextReject(err);
        }
      };

      let rejected = (err) => {
        try {
          if (!isFnType(failedCB)) {
            nextReject(err);
          } else {
            let res = failedCB(err);
            if (nextMyPromise === res) {
              throw new TypeError("promise 被循环调用");
            } else if (res instanceof MyPromise) {
              res.then(nextResolve, nextReject);
            } else {
              nextResolve(err);
            }
          }
        } catch (err) {
          nextReject(err);
        }
      };

      switch (status) {
        // 如果是异步任务就放入队列
        case PENDING:
          this.successCB.push(fulfilled);
          this.failedCB.push(rejected);
          break;
        case FULFILLED:
          // 同步执行的reslove
          setTimeout(fulfilled, 0, value);
          break;
        case REJECTED:
          // 同步执行的reject
          setTimeout(rejected, 0, reason);
          break;
      }
    });
    return nextMyPromise;
  };

  // catch内主要交给then负责, 有了错误信息可以继续传到下一个promise
  catch(rejectFn) {
    return this.then(undefined, rejectFn);
  }

  // 静态resolve方法
  static resolve(value) {
    // 如果参数是MyPromise实例，直接返回
    if (value instanceof MyPromise) return value;
    return new MyPromise((resolve) => resolve(value));
  }

  // 静态reject方法
  static reject(value) {
    return new MyPromise((_, reject) => reject(value));
  }

  // 静态all方法
  static all(list) {
    return new MyPromise((resolve, reject) => {
      let values = [];
      let count = 0;
      for (let [i, p] of list.entries()) {
        // 如果不是MyPromise实例，先调用resolve
        this.resolve(p).then((res) => {
          values[i] = res;
          count++;
          // 必须都成功才能调用 resolve
          if (count === list.length) resolve(values);
        }, reject);
      }
    });
  }

  // 静态race方法
  static race(list) {
    return new MyPromise((resolve, reject) => {
      for (let p of list) {
        // 只要改变状态了就返回
        this.resolve(p).then(resolve, reject);
      }
    });
  }

  finally = (cb) => {
    // 为当前promise的任何状态响应执行, 需要这种方式依然来保持 finally 之前promise的结果
    return this.then(
      (value) => MyPromise.resolve(cb()).then(() => value),
      (reason) => MyPromise.resolve(cb()).then(() => reason)
    );
  };
}

module.exports = MyPromise
```

