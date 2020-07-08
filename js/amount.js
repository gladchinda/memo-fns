;(function(global) {
  'use strict';

  // AmountManager single instance
  let __instance__;

  const CURRENCIES = [
    'AED', 'ARS', 'AUD', 'BIF', 'CAD', 'CDF', 'CFA', 'CHF', 'CVE', 'CZK',
    'DKK', 'DOP', 'ETB', 'EUR', 'GBP', 'GHS', 'GMD', 'GNF', 'HKD', 'IDR',
    'ILS', 'JPY', 'KES', 'KRW', 'LKR', 'LRD', 'MOP', 'MUR', 'MWK', 'MYR',
    'MZN', 'NGN', 'NOK', 'NZD', 'PHP', 'RUB', 'RWF', 'SAR', 'SEK', 'SGD',
    'SLL', 'STD', 'THB', 'TWD', 'TZS', 'UGX', 'USD', 'XAF', 'XOF', 'ZAR',
    'ZMK', 'ZMW', 'ZWD'
  ];

  const ROUNDED_CURRENCIES = [
    'BIF', 'CLP', 'DJF', 'GNF', 'ISK', 'JPY', 'KMF', 'KRW', 'PYG', 'RWF',
    'UGX', 'UYI', 'VND', 'VUV', 'XAF', 'XOF', 'XPF'
  ];

  const DCC_CURRENCIES = [
    'EUR', 'GBP', 'NGN', 'USD', 'ZAR'
  ];

  // Helper functions
  function noop() {}

  function parseAmount(value) {
    value = Number((typeof value === 'string') ? value.trim() : value);

    if (Number.isNaN(value) || value < 0) {
      throw new TypeError('Invalid amount');
    }

    return value;
  }

  function parseCurrency(value, list) {
    if (typeof value === 'string' && (value = value.trim().toUpperCase())) {
      list = (Array.isArray(list) && list.length) ? list : CURRENCIES;
      if (list.includes(value)) return value;
    }

    throw new TypeError('Invalid currency');
  }

  function defineAccessorProperty(property, accessors) {
    const { getter, setter, extendable = arguments[2] } = (typeof accessors === 'function')
      ? (accessors.length) ? { setter: accessors } : { getter: accessors }
      : (Object.prototype.toString.call(accessors) === '[object Object]') ? accessors : {};

    Object.defineProperty(this, property, {
      enumerable: true,
      configurable: extendable === true,
      get: (typeof getter === 'function') ? getter.bind(this) : noop,
      set: (typeof setter === 'function') ? setter.bind(this) : noop
    });
  }

  function amountUpdaterDescriptor(property) {
    return {
      enumerable: true,
      value: function (amount) {
        try {
          this[property] = parseAmount(amount);
        } finally { return this; }
      }
    }
  }

  function exposeAsProperties(object, properties) {
    return Object.defineProperties(object, Object.fromEntries(
      Object.entries(properties)
        .map(([prop, value]) => [prop, { enumerable: true, value }])
    ));
  }

  // Amount Class
  function Amount(amount, currency) {
    this.base = parseAmount(amount);
    this.currency = parseCurrency(currency);
    const property = defineAccessorProperty.bind(this);

    property('computed', function() { return this.base }, true);
  }

  // Augment Amount prototype
  Object.defineProperties(Amount.prototype, {
    valueOf: {
      enumerable: true,
      value: function () {
        const digits = ROUNDED_CURRENCIES.includes(this.currency) ? 0 : 2;

        return Number(new Intl.NumberFormat('en-US', {
          style: 'decimal',
          useGrouping: false,
          minimumFractionDigits: digits,
          maximumFractionDigits: digits
        }).format(this.computed));
      }
    },

    toString: {
      enumerable: true,
      value: function () {
        const amount = new Intl.NumberFormat('en-US', {
          style: 'decimal',
          useGrouping: true
        }).format(this.valueOf());

        return `${this.currency} ${amount}`;
      }
    }
  });

  // ChargeAmount Class
  function ChargeAmount(amount, currency) {
    Amount.call(this, amount, currency);

    this.fee = 0;
    this.discount = 0;
    const property = defineAccessorProperty.bind(this);

    property('computed', function() { return this.base + this.fee - this.discount }, true);
  }

  // Augment ChargeAmount prototype
  ChargeAmount.prototype = Object.create(Amount.prototype, {
    constructor: { value: ChargeAmount },
    updateFee: amountUpdaterDescriptor('fee'),
    updateDiscount: amountUpdaterDescriptor('discount')
  });

  // AmountManager Class
  function AmountManager(currency) {
    if (__instance__ instanceof AmountManager) {
      return __instance__;
    }

    if (!(this instanceof AmountManager)) {
      return new AmountManager(currency);
    }

    const property = defineAccessorProperty.bind(__instance__ = this);

    let chargeAmount;
    let initialAmount;
    let initialCurrency;
    let conversionsTable;
    let convertableCurrencies;

    property('currency', {
      getter: function () { return initialCurrency },
      setter: function (currency) {
        if (!initialCurrency) {
          initialCurrency = parseCurrency(currency);
          conversionsTable = {};

          convertableCurrencies = Array.from(
            new Set([ ...DCC_CURRENCIES, initialCurrency ])
          );
        } else {
          try {
            currency = parseCurrency(currency, convertableCurrencies);
            const amount = initialAmount.base;

            let rate = Number(conversionsTable[currency]);
            rate = (currency === initialCurrency || Number.isNaN(rate)) ? 1 : rate;

            chargeAmount = new ChargeAmount(amount * rate, currency);
          } catch (e) {}
        }
      }
    });

    property('initialAmount', {
      getter: function () { return initialAmount },
      setter: function (amount) {
        if (!initialCurrency) {
          throw new Error('Currency not defined');
        }

        initialAmount = new Amount(amount, initialCurrency);
        chargeAmount = new ChargeAmount(amount, initialCurrency);
      }
    });

    property('chargeAmount', {
      getter: function () { return chargeAmount },
      setter: function () {
        if (!initialCurrency) {
          throw new Error('Currency not defined');
        }
      }
    });
  }

  // Expose AmountManager static properties
  exposeAsProperties(AmountManager, { CURRENCIES, DCC_CURRENCIES, ROUNDED_CURRENCIES });

  // Expose manager instance on the global object
  exposeAsProperties(global, { $manager: new AmountManager });
})(typeof self !== 'undefined' ? self : this);
