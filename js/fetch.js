;(function(global){
  'use strict';
  
  const DEFAULT_DELAY = 100;
  const DEFAULT_TIMEOUT = 5000;
  const DEFAULT_MAX_RETRIES = 12;

  const Retry = (function () {
    const __default__ = constant(DEFAULT_DELAY);
    const __immediately__ = constant(0);

    const __fibonacci__ = function (retry) {
      return Math.min(fibonacci(retry) * retry, 1000);
    };

    const __progressive__ = function (retry) {
      return Math.min(Math.pow(2, retry >> 2), 5) * 100;
    };

    const __withRetries__ = (fn, retries) => {
      return exposeAsProperties(fn, {
        retries: getNumber(retries, DEFAULT_MAX_RETRIES)
      });
    }

    function fibonacci(n) {
      const cache = [];

      return (fibonacci = function fib(n) {
        if (n > 0 && cache[n]) return cache[n];
        if (n <= 0) return (cache[n] = 0);
        if (n <= 2) return (cache[n] = 1);
        return (cache[n] = fib(n - 1) + fib(n - 2));
      })(n);
    }

    return exposeAsProperties(Object.create(null), {
      default: __withRetries__(__default__),
      fibonacci: __withRetries__(__fibonacci__),
      immediately: __withRetries__(__immediately__),
      progressive: __withRetries__(__progressive__)
    });
  })();
  
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

  function getNumber(value, defaultNumber) {
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

  function resolveCallback(callback, fallback) {
    return (callback === null) ? undefined : (isFunction(callback) ? callback : fallback);
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
    const enumerable = arguments[2] !== false;
    return Object.defineProperties(object, Object.fromEntries(
      Object.entries(properties)
        .map(([prop, value]) => [prop, { enumerable, value }])
    ));
  }
  
  function Fetch(config) {
    let __timeout__,
        __maxRetries__,
        __delaySequence__,
        __onAbort__,
        __onRetry__,
        __onTimeout__;
    
    let { timeout, retries, onabort, onretry, ontimeout } = isObject(config) ? config : {};

    let { max, sequence } = isObject(retries) ? retries : (
      isFunction(retries) ? { sequence: retries } : { max: retries }
    );

    isFunction(onabort) && (__onAbort__ = onabort);
    isFunction(onretry) && (__onRetry__ = onretry);
    isFunction(ontimeout) && (__onTimeout__ = ontimeout);

    __delaySequence__ = isFunction(sequence) ? sequence : Retry.default;

    max = getNumber(max);
    timeout = getNumber(timeout);

    if (max === Infinity || max < 1) {
      isFunction(sequence) && (__maxRetries__ = 1);
    } else {
      __maxRetries__ = getBoundedNumber(max, 1, __delaySequence__.retries);
    }

    if (!(timeout === Infinity || timeout < 0)) {
      __timeout__ = getBoundedNumber(timeout);
    }

    Object.defineProperty(this, 'fetch', {
      get() {
        let $delay,
            $retries,
            $controller,
            $delaySequence = __delaySequence__;

        function $abort() {
          $controller && $controller.abort();
        }

        return exposeAsProperties(function (resource, init) {
          $abort();

          $delay = 0;
          $retries = 0;
          $controller = new AbortController();

          const { signal } = $controller;
          const ABORT_ERROR = new DOMException('Aborted', 'AbortError');
          const FETCH_OPTIONS = { ...(isObject(init) ? init : {}), signal };

          const __fetch__ = () => {
            const __delay__ = delay($delay, () => {
              isFunction(__onRetry__) && $retries > 0 && __onRetry__({
                count: $retries,
                delay: $delay,
                max: __maxRetries__
              });

              return fetch(resource, FETCH_OPTIONS)
                .then(response => response.ok ? response : Promise.reject(response))
                .catch(err => {
                  if (err.name !== 'AbortError' && __maxRetries__ && $retries++ < __maxRetries__) {
                    $delay = $delaySequence($retries);
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
            return Promise.race([__delay__, __aborted__]);
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
                    $abort();
                    isFunction(__onTimeout__) && __onTimeout__();
                  });
                }

                Promise.race([__aborted__, __fetch__()])
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
        }, { abort: $abort });
      }
    });
    
    exposeAsProperties(this, {
      fresh: function (config) {
        return new Fetch(config);
      },

      extend: function (config) {
        let { timeout, retries, onabort, onretry, ontimeout } = isObject(config) ? config : {};

        let { max, sequence } = isObject(retries) ? retries : (
          isFunction(retries) ? { sequence: retries } : { max: retries }
        );

        sequence = isFunction(sequence) ? sequence : __delaySequence__;

        if (max === null) {
          max = undefined;
        } else {
          max = getNumber(max);
          max = getBoundedNumber((max === Infinity || max < 1) ? __maxRetries__ : max, 1, sequence.retries);
        }

        if (timeout === null) {
          timeout = undefined;
        } else {
          timeout = getNumber(timeout);
          timeout = (timeout === Infinity || timeout < 0) ? __timeout__ : getBoundedNumber(timeout);
        }

        return new Fetch({
          timeout,
          retries: { max, sequence },
          onabort: resolveCallback(onabort, __onAbort__),
          onretry: resolveCallback(onretry, __onRetry__),
          ontimeout: resolveCallback(ontimeout, __onTimeout__)
        });
      }
    }, false);
  }

  function refetch(config) {
    return new Fetch(config);
  }

  // Expose Retry (function) properties as static properties on the refetch function
  // Expose timeout static property as the DEFAULT_TIMEOUT on the refetch function
  exposeAsProperties(refetch, {
    ...Retry,
    timeout: DEFAULT_TIMEOUT
  }, false);
  
  // Expose refetch on the global object
  exposeAsProperties(global, { refetch });
})(typeof self !== 'undefined' ? self : this);
