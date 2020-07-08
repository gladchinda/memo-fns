// (function() {
//   "use strict";

//   const amountNGN = new Amount(43100.5412, "NGN");
//   console.log(amountNGN.base); // 43100.5412
//   console.log(amountNGN.currency); // "NGN"
//   console.log(amountNGN.computed); // 43100.5412
//   console.log(Number(amountNGN)); // 43100.54
//   console.log(amountNGN.valueOf()); // 43100.54
//   console.log(String(amountNGN)); // "NGN 43,100.54"
//   console.log(amountNGN.toString()); // "NGN 43,100.54"

//   const chargeAmountNGN = new ChargeAmount(1000, "NGN");
//   console.log(chargeAmountNGN.base); //1000
//   console.log(chargeAmountNGN.currency); // NGN
//   console.log(chargeAmountNGN.computed); //1000
//   console.log(Number(chargeAmountNGN)); // 1000
//   console.log(chargeAmountNGN.valueOf()); //1000
//   console.log(String(chargeAmountNGN)); // "NGN 1000"
//   console.log(chargeAmountNGN.toString()); // "NGN 1000"

//   console.log(chargeAmountNGN.updateFee(1000)); // ChargeAmount { base: 1000, currency: 'NGN', fee: 1000, discount: 0 }
//   console.log(chargeAmountNGN.updateDiscount(1000)); // ChargeAmount { base: 1000, currency: 'NGN', fee: 0, discount: 1000 }
// })();

(() => {
  const {
    createDelay,
    createTimer,
    registerInvisibleDurationCallback: addVisibilityCallback,
    unregisterInvisibleDurationCallback: removeVisibilityCallback
  } = window;
  
//   const cb = addVisibilityCallback((data) => {
//     const { exact, seconds } = data;
//     console.log(exact, seconds);
//   });
  
//   addVisibilityCallback((data) => {
//     const { seconds } = data;
//     console.log(`I have been invisible for at least ${seconds}s.`);
//   });
  
//   setTimeout(() => {
//     removeVisibilityCallback(cb);
//   }, 60 * 1000);
  
//   const iframe = document.createElement('iframe');
//   document.body.appendChild(iframe);
//   iframe.src = "https://checkout-components.glitch.me/alpha.html";
  
//   // `null` if pop-up was blocked, otherwise `Window`
//   console.log(
//     window.open("https://checkout-components.glitch.me/alpha.html", "_blank")
//   );
  
//   createDelay(() => {
//     console.log('DONE');
//   }, 15);
  
//   const timer = createTimer(180);
  
//   function createTime() {
//     const $time = document.createElement('time');
//     document.body.appendChild($time);
//     timer.addWatchElement($time);
//   }
  
//   setTimeout(createTime, 30 * 1000);
//   setTimeout(createTime, 45 * 1000);
//   setTimeout(createTime, 150 * 1000);
  
//   createTime();
})();
