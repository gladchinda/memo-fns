!(function(window, document) {
  'use strict';
  
  const INVISIBLE_CALLBACK = Symbol('invisible:callback');
  const INVISIBLE_DURATION = Symbol('invisible:duration');
  
  const canUsePerformance =
    ('performance' in window) &&
    isFunction(performance.now);
  
  document.addEventListener('visibilitychange', (() => {
    const { visible, invisible } = (
      function createWatcher() {
        if (canUsePerformance) {
          return createPerformanceWatcher();
        }

        try {
          const item = `___${Date.now()}${String(Math.random() * 1e5).split('.')[1]}___`;

          window.localStorage.setItem(item, 1);
          window.localStorage.removeItem(item);

          return createStorageWatcher();
        } catch(e) {}

        return createFallbackWatcher();
      }
    )();
    
    return function() {
      (document.visibilityState === 'hidden' ? invisible : visible)();
    }
  })());
  
  function noop() {}
  
  function isFunction(value) {
    return typeof value === 'function';
  }
  
  function isPlainObject(value) {
    return Object.prototype.toString.call(value) === '[object Object]';
  }
  
  function createFallbackWatcher() {
    let TIMESTAMP;
    
    return __createWatcher__({
      create(label, timestamp) {
        TIMESTAMP = timestamp;
      },
      
      revoke(label, timestamp) {
        TIMESTAMP = undefined;
      },
      
      elapsedTime(label, timestamp) {
        if (TIMESTAMP) {
          return timestamp - TIMESTAMP;
        }
      }
    });
  }
  
  function createPerformanceWatcher() {
    return __createWatcher__({
      create(label, timestamp) {
        return performance.mark(label);
      },
      
      revoke(label, timestamp) {
        return performance.clearMarks(label);
      },
      
      elapsedTime(label, timestamp) {
        const mark = performance.getEntriesByType('mark')
          .filter(({ name }) => name === label)[0];
      
        if (mark) {
          return performance.now() - mark.startTime;
        }
      }
    });
  }
  
  function createStorageWatcher() {
    return __createWatcher__({
      create(label, timestamp) {
        return localStorage.setItem(label, timestamp);
      },
      
      revoke(label, timestamp) {
        return localStorage.removeItem(label);
      },
      
      elapsedTime(label, timestamp) {
        const mark = localStorage.getItem(label);
      
        if (mark) {
          return timestamp - mark;
        }
      }
    });
  }
  
  function __createWatcher__(init) {
    let MARKER;
    let TIMESTAMP;
    
    const {
      create: __create__,
      revoke: __revoke__,
      elapsedTime: __getElapsedTime__
    } = Object.assign({}, isPlainObject(init) ? init : {});
    
    if ([ __create__, __revoke__, __getElapsedTime__ ].every(isFunction)) {
      return {
        invisible() {
          createMarker();
        },

        visible() {
          const invisibleDuration = +getMarkerElapsedTime();

          if (invisibleDuration) {
            const detail = Object.create(
              Object.create(null, {
                [INVISIBLE_DURATION]: {
                  get() { return invisibleDuration }
                }
              })
            );
            
            const evt = new CustomEvent('invisible:duration', {
              bubbles: false,
              cancelable: false,
              
              detail: Object.defineProperties(detail, {
                exact: {
                  enumerable: true,
                  value: invisibleDuration
                },

                seconds: {
                  enumerable: true,
                  value: Math.round(invisibleDuration / 1000)
                },
                
                timestamp: {
                  enumerable: true,
                  value: TIMESTAMP
                }
              })
            });
            
            document.dispatchEvent(evt);
          }

          revokeMarker();
        }
      };
    }
    
    return { invisible: noop, visible: noop };
    
    function createMarker() {
      if (!MARKER) {
        MARKER = `__${
          btoa(String(Math.random()))
            .replace(/[+=\/]/g, '')
            .slice(-3)
        }__`;
      }
      
      __create__(MARKER, TIMESTAMP = Date.now());
    }
    
    function revokeMarker() {
      if (MARKER) {
        __revoke__(MARKER, Date.now());
      }
      
      MARKER = TIMESTAMP = undefined;
    }
    
    function getMarkerElapsedTime() {
      return __getElapsedTime__(MARKER, Date.now());
    }
  }
  
  function __registerInvisibleDurationCallback__(fn) {
    if (isFunction(fn)) {
      const __handler__ = (evt) => {
        const detail = evt.detail;

        if (isPlainObject(detail) && evt.target === document) {
          const { exact, ...props } = detail;
          
          if (exact && exact === detail[INVISIBLE_DURATION]) {
            fn({ exact, ...props });
          }
        }
      };

      document.addEventListener('invisible:duration', __handler__);

      return Object.defineProperties(Object.create(null), {
        [INVISIBLE_CALLBACK]: {
          value: function() {
            document.removeEventListener('invisible:duration', __handler__);
            return true;
          }
        }
      });
    }
    
    return null;
  }

  function __unregisterInvisibleDurationCallback__(callbackObject) {
    if (isPlainObject(callbackObject) && isFunction(callbackObject[INVISIBLE_CALLBACK])) {
      return callbackObject[INVISIBLE_CALLBACK]();
    }
    
    return false;
  }

  Object.defineProperties(window, {
    registerInvisibleDurationCallback: {
      enumerable: true,
      value: __registerInvisibleDurationCallback__
    },
    
    unregisterInvisibleDurationCallback: {
      enumerable: true,
      value: __unregisterInvisibleDurationCallback__
    }
  });
})(window, document);
