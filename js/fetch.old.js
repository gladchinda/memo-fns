;(function(global){
  'use strict';
  
  const DEFAULT_DELAY = 100;
  const DEFAULT_RETRIES = 1;
  const DEFAULT_TIMEOUT = 5000;
  const DEFAULT_MAX_RETRIES = 12;
  
  function constant(value) {
    return function _constantFn() {
      return value;
    }
  }

  function isFunction(value) {
    return typeof value === 'function';
  }

  function isObject(value) {
    return Object.prototype.toString.call(value) === '[object Object]';
  }

  function getNumber(value, defaultNumber = Infinity) {
    return Number.isInteger(value = +value)
      ? value
      : Number.isInteger(defaultNumber) ? defaultNumber : Infinity;
  }

  function getBoundedNumber(value, min = 0, max = Infinity) {
    value = getNumber(value);
    min = getNumber(min);
    max = getNumber(max);

    if (min > max) {
      [min, max] = [max, min];
    }

    return Math.min(Math.max(min, value), max);
  }
  
  function delay(ms, callback) {
    ms = (!Number.isNaN(ms = +ms) && ms >= 0) ? ms : 1000;
    
    let timeout = 0;
    
    const promise = new Promise(resolve => {
      timeout = setTimeout(() => {
        resolve(Promise.resolve().then(() => {
          if (timeout && isFunction(callback)) {
            return callback();
          }
        }))
      }, ms);
    });

    return exposeAsProperties(promise, {
      end: function (callback) {
        clearTimeout(timeout) && (timeout = 0);
        return Promise.resolve().then(callback);
      }
    });
  }
  
  function exposeAsProperties(object, properties) {
    return Object.defineProperties(object, Object.fromEntries(
      Object.entries(properties)
        .map(([prop, value]) => [prop, { enumerable: true, value }])
    ));
  }
  
  function Fetch() {
    let __timeout__,
        __maxRetries__,
        __delaySequence__,
        __onAbort__,
        __onRetry__,
        __onTimeout__;
    
    exposeAsProperties(this, {
      abort: (function (callback) {
        __onAbort__ = isFunction(callback) ? callback : undefined;
        return this;
      }).bind(this),
      
      retry: (function() {
        const __default__ = constant(DEFAULT_DELAY);
        const __immediately__ = constant(0);
        
        const __fibonacci__ = function(retry) {
          return Math.min(fibonacci(retry) * retry, 1000);
        };
        
        const __progressive__ = function(retry) {
          return Math.min(Math.pow(2, retry >> 2), 5) * 100;
        };
        
        const __withMaxRetries__ = (fn, retries) => {
          return exposeAsProperties(fn, {
            maxRetries: getNumber(retries, DEFAULT_MAX_RETRIES)
          });
        }
        
        const __retryFactory__ = (sequence) => {
          sequence = isFunction(sequence) ? sequence : __default__;
          
          return (count, callback) => {
            if (isFunction(count) && (arguments.length === 1 || isFunction(callback))) {
              [count, callback] = [callback, count];
            }
            
            __delaySequence__ = sequence;

            if (isFunction(callback)) {
              __maxRetries__ = getBoundedNumber(
                getNumber(count, DEFAULT_RETRIES),
                sequence.minRetries || 0,
                sequence.maxRetries || Infinity
              );
              
              __onRetry__ = callback;
            } else {
              __maxRetries__ = __onRetry__ = undefined;
            }

            return this;
          }
        };
        
        const __retry__ = __retryFactory__(__default__);
        
        function fibonacci(n) {
          const cache = [];

          return (fibonacci = function fib(n) {
              if (n > 0 && cache[n]) return cache[n];
              if (n <= 0) return (cache[n] = 0);
              if (n <= 2) return (cache[n] = 1);
              return (cache[n] = fib(n - 1) + fib(n - 2));
          })(n);
        }
        
        exposeAsProperties(__retry__, Object.fromEntries(
          Object.entries({
            default: __default__,
            fibonacci: __fibonacci__,
            immediately: __immediately__,
            progressive: __progressive__
          })
          .map(([prop, fn]) => {
            fn = exposeAsProperties(__withMaxRetries__(fn), { type: prop })
            return [ prop, __retryFactory__(fn) ];
          })
        ));
        
        return __retry__;
      }).call(this),
      
      timeout: (function (timeout, callback) {
        if (isFunction(timeout) && arguments.length === 1) {
          [timeout, callback] = [callback, timeout];
        }
        
        if (timeout === null) {
          __timeout__ = __onTimeout__ = undefined;
        } else {
          timeout = isFunction(timeout) ? timeout() : timeout;
          timeout = getNumber(timeout)
        }
        
        if (isFunction(callback)) {
          __timeout__ = getBoundedNumber(getNumber(timeout, DEFAULT_TIMEOUT));
          __onTimeout__ = callback;
        } else {
          __timeout__ = __onTimeout__ = undefined;
        }
        
        return this;
      }).bind(this),
      
      clone: (function() {
        const f = new Fetch;
        const sequence = __delaySequence__.type;
        
        (isFunction(__onAbort__)) && f.abort(__onAbort__);
        
        (typeof __timeout__ === 'number') && (
          isFunction(__onTimeout__)
            ? f.timeout(__timeout__, __onTimeout__)
            : f.timeout(__timeout__)
        );
        
        (typeof __maxRetries__ === 'number') && (
          isFunction(__onRetry__)
            ? f.retry[sequence](__maxRetries__, __onRetry__)
            : f.retry[sequence](__maxRetries__)
        );
        
        return f;
      }).bind(this),
      
      yield: (function() {
        const F = {
          abort: function () {
            this.controller && this.controller.abort();
          },

          fetch: function (resource, init) {
            this.abort();

            this.delay = 0;
            this.retries = 0;
            this.controller = new AbortController();

            const { signal } = this.controller;
            const ABORT_ERROR = new DOMException('Aborted', 'AbortError');
            const FETCH_OPTIONS = { ...(isObject(init) ? init : {}), signal };

            const delaySequence = isFunction(__delaySequence__)
              ? __delaySequence__
              : constant(DEFAULT_DELAY);

            const __fetch__ = () => {
              const __delay__ = delay(this.delay, () => {
                isFunction(__onRetry__) && this.retries > 0 && __onRetry__({
                  count: this.retries,
                  delay: this.delay,
                  max: __maxRetries__
                });

                return fetch(resource, FETCH_OPTIONS)
                  .then(response => response.ok ? response : Promise.reject(response))
                  .catch(err => {
                    if (err.name !== 'AbortError' && __maxRetries__ && this.retries++ < __maxRetries__) {
                      this.delay = delaySequence(this.retries);
                      return __fetch__();
                    }

                    return Promise.reject(err);
                  });
              });

              // This aborted promise ensures that the timeout created for the delay promise
              // is cleared when the signal aborts.
              // The AbortError is also returned in an already rejected promise.
              const __aborted__ = new Promise((resolve, reject) => {
                signal.addEventListener('abort', () => {
                  __delay__.end(() => reject(ABORT_ERROR));
                });
              });

              // Race between the delay and aborted promises.
              return Promise.race([ __delay__, __aborted__ ]);
            };

            return (
              signal.aborted
                ? Promise.reject(ABORT_ERROR)
                : new Promise((resolve, reject) => {
                  let __delay__;

                  const __aborted__ = new Promise((resolve, reject) => {
                    signal.addEventListener('abort', () => reject(ABORT_ERROR));
                  });

                  if (typeof __timeout__ === 'number') {
                    __delay__ = delay(__timeout__, () => {
                      this.abort();
                      isFunction(__onTimeout__) && __onTimeout__();
                    });
                  }

                  Promise.race([ __aborted__, __fetch__() ])
                    .catch(err => {
                      // This ensures that the timeout created for the delay promise
                      // is cleared when any of the above promises fulfills.
                      // Also, automatically reject the promise with the error.
                      return (typeof __delay__ !== 'undefined' && isFunction(__delay__.end))
                        ? __delay__.end(() => Promise.reject(err))
                        : Promise.reject(err);
                    })
                    .then(resolve, reject);
                })
            ).catch(err => {
              if (err.name === 'AbortError') {
                isFunction(__onAbort__) && __onAbort__();
                return false;
              }

              return Promise.reject(err);
            });
          }
        };
        
        return exposeAsProperties(Object.create(null), {
          abort: F.abort.bind(F),
          fetch: F.fetch.bind(F)
        });
      }).bind(this)
    });
  }
  
  const $fetch = Object.create(null, Object.fromEntries(
    (function() {
      const f = new Fetch;
      const props = Object.keys(f).filter(prop => isFunction(f[prop]));

      return props.map(prop => [prop, {
        get() {
          const f = new Fetch;
          return f[prop];
        },
        enumerable: true
      }]);
    })()
  ));
  
  // Expose manager instance on the global object
  exposeAsProperties(global, { $fetch });
})(typeof self !== 'undefined' ? self : this);
