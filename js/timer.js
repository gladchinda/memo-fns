(function(window, document) {
  'use strict';
  
  const {
    registerInvisibleDurationCallback: addVisibilityCallback,
    unregisterInvisibleDurationCallback: removeVisibilityCallback
  } = window;
  
  function noop() {}
  
  function isFunction(value) {
    return typeof value === 'function';
  }
  
  function isPlainObject(value) {
    return Object.prototype.toString.call(value) === '[object Object]';
  }
  
  function createTimer(...args) {
    function __timerFactory__(elementSet) {
      return __createTimer__({
        tick({ current, duration }) {
          return current <= duration;
        },

        updater({ current, duration }) {
          const remaining = Math.max(0, duration - current);
          const minutes = Math.floor(remaining / 60);
          const seconds = remaining % 60;

          const timeString = [minutes, seconds]
            .map(piece => '00'.concat(piece || 0).slice(-2))
            .join(':');

          let durationString = [];

          if (minutes > 0) {
            durationString.push(minutes + 'm');
          }

          if (seconds > 0 || minutes === 0) {
            durationString.push(seconds + 's');
          }

          durationString = durationString.join(' ');

          elementSet.forEach($element => {
            $element.innerText = timeString;
            $element.setAttribute('datetime', durationString);
          });
        }
      });
    }
    
    createTimer = function createTimer(callback, duration) {
      if (arguments.length === 1 && !isFunction(arguments[0])) {
        duration = arguments[0];
        callback = null;
      }
      
      callback = isFunction(callback) ? callback : noop;
      
      let ELEMENTS = new Set();
      
      const created = __timerFactory__(ELEMENTS)(() => {
        ELEMENTS.clear();
        ELEMENTS = undefined;
        callback();
      }, duration);
      
      if (created) {
        return Object.create(null, {
          addWatchElement: {
            enumerable: true,
            value: function ($element) {
              if (ELEMENTS && $element instanceof HTMLTimeElement) {
                !ELEMENTS.has($element) && ELEMENTS.add($element);
                return true;
              }
              
              return false;
            }
          },
          
          removeWatchElement: {
            enumerable: true,
            value: function ($element) {
              return !!ELEMENTS && ELEMENTS.has($element) && ELEMENTS.delete($element);
            }
          }
        });
      }
      
      return null;
    }
    
    return createTimer(...args);
  }
  
  function __createTimer__(init) {
    const {
      tick: __tick__,
      updater: __updater__
    } = Object.assign({}, isPlainObject(init) ? init : {});
    
    return function __createTimer__(callback, duration) {
      if (!isFunction(__tick__)) return false;

      if (arguments.length === 1 && !isFunction(arguments[0])) {
        duration = arguments[0];
        callback = null;
      }
      
      let current = 0;
      let timerID = 0;

      callback = isFunction(callback) ? callback : noop;
      duration = Math.max(0, Math.ceil(duration) || 60); // duration in seconds

      timerID = setTimeout((function() {
        const cb = addVisibilityCallback(function(data) {
          const { seconds } = data;
          current += seconds;
          timerID = setTimeout(tickTimer);
        });
      
        document.addEventListener('visibilitychange', freezeTimerWhenInvisible);

        function freezeTimerWhenInvisible() {
          if (document.visibilityState === 'hidden') {
            stopTimer();
          }
        }

        function tickTimer() {
          updateWatchers();

          if (++current && __tick__({ current, duration }) === true) {
            timerID = setTimeout(tickTimer, 1000);
          } else {
            removeVisibilityCallback(cb);
            document.removeEventListener('visibilitychange', freezeTimerWhenInvisible);
            stopTimer();
            callback();
          }
        }

        return tickTimer;
      })());

      return true;

      function stopTimer() {
        timerID && clearTimeout(timerID);
        timerID = 0;
      }

      function updateWatchers() {
        if (isFunction(__updater__)) {
          return (updateWatchers = function() {
            return __updater__({ current, duration });
          })();
        }
      }
    }
  }
  
  function __createDelay__(callback, duration) {
    callback = isFunction(callback) ? callback : noop;
    duration = Math.max(0, Math.ceil(parseFloat(duration)) || 1000); // duration in milliseconds
    
    let timerID = 0;
    
    timerID = setTimeout((function() {
      const START_TIMESTAMP = Date.now();
    
      const cb = addVisibilityCallback(function() {
        duration -= Math.round(Date.now() - START_TIMESTAMP);
        timerID = setTimeout(delayedCallback, Math.max(0, duration));
      });
      
      document.addEventListener('visibilitychange', freezeTimerWhenInvisible);
      
      function freezeTimerWhenInvisible() {
        if (document.visibilityState === 'hidden') {
          stopTimer();
        }
      }
      
      function delayedCallback() {
        removeVisibilityCallback(cb);
        document.removeEventListener('visibilitychange', freezeTimerWhenInvisible);
        stopTimer();
        callback();
      }
      
      return delayedCallback;
    })(), duration);

    return true;

    function stopTimer() {
      timerID && clearTimeout(timerID);
      timerID = 0;
    }
  }
  
  Object.defineProperties(window, {
    createTimer: {
      enumerable: true,
      value: createTimer
    },
    
    createDelay: {
      enumerable: true,
      value: __createDelay__
    }
  });
})(window, document);
