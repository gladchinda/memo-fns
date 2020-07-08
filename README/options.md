# PaymentOptionsManager

## Interfaces

### 1. Amount

#### Methods

- `constructor(amount, currency)`
  - both arguments are required, otherwise throw Error
  - `amount` >= 0, otherwise throw Error
  - `currency` must be in list of available currencies, otherwise throw Error
- `valueOf()`

  - defined on the prototype not on the instance
  - it returns the `computed` amount coerced to a Number and with a maximum of 2 decimal-places
  - `currency` of instance is in the list of rounded currencies, then amount decimals must be rounded up to nearest whole number

- `toString()`
  - defined on the prototype not on the instance
  - it returns a formatted string containing currency and amount
  - the amount returned must be the amount returned by `valueOf()`
  - amount in the returned string must be comma-separated and have 2 decimal-places (if `currency` of instance is not in the list of rounded currencies)

#### Properties

- `base`

  - The amount passed in the constructor but coerced to a Number

- `currency`

  - The currency passed in the constructor as an uppercase string without spaces

- `computed`
  - This is an accessor property, defined on the prototype not on the instance
  - `computed` cannot be set, it is read-only
  - `computed` must be coerced to a Number (and have a maximum of 2 decimal-places)

```js
const amountNGN = new Amount("43100.5412", " Ngn ");
const amountUGX = new Amount(43100.547, "ugx");

console.log(amountNGN.base); // 43100.5412
console.log(amountNGN.currency); // "NGN"
console.log(amountNGN.computed); // 43100.5412

console.log(Number(amountNGN)); // 43100.54
console.log(amountNGN.valueOf()); // 43100.54

console.log(String(amountNGN)); // "NGN 43,100.54"
console.log(amountNGN.toString()); // "NGN 43,100.54"

console.log(amountUGX.base); // 43100.547
console.log(amountUGX.currency); // "UGX"
console.log(amountUGX.computed); // 43100.547

console.log(Number(amountUGX)); // 43101
console.log(amountUGX.valueOf()); // 43101

console.log(String(amountUGX)); // "UGX 43,101"
console.log(amountUGX.toString()); // "UGX 43,101"
```

### 2. ChargeAmount (extends Amount)

#### Methods

- `constructor(amount, currency)`
  - inherits behavior from `Amount` interface
  - initializes additional properties
- `valueOf()`

  - inherits behavior from `Amount` interface

- `toString()`

  - inherits behavior from `Amount` interface

- `updateFee(amount)`

  - if `amount` is passed and `amount` >= 0, set the `fee` property
  - return `this` - the instance

- `updateDiscount(amount)`
  - if `amount` is passed and `amount` >= 0, set the `discount` property
  - return `this` - the instance

#### Properties

- `base`

  - same as in `Amount` interface

- `currency`

  - same as in `Amount` interface

- `fee`

  - Initially set to `0`
  - The amount passed in the `updateFee()` method but coerced to a Number

- `discount`

  - Initially set to `0`
  - The amount passed in the `updateDiscount()` method but coerced to a Number

- `computed`
  - same as in `Amount` interface
  - The value of `computed` must account for the effect of `fee` and `discount` amounts on the `base` amount

```js
const amountNGN = new ChargeAmount("43100.5412", " Ngn ");
const amountUGX = new ChargeAmount(43100.547, "ugx");

amountNGN.updateFee(250.45).updateDiscount("1500");
amountUGX.updateFee("360.7512");

console.log(amountNGN.base); // 43100.5412
console.log(amountNGN.fee); // 250.45
console.log(amountNGN.discount); // 1500
console.log(amountNGN.currency); // "NGN"
console.log(amountNGN.computed); // 41850.9912

console.log(Number(amountNGN)); // 41850.99
console.log(amountNGN.valueOf()); // 41850.99

console.log(String(amountNGN)); // "NGN 41,850.99"
console.log(amountNGN.toString()); // "NGN 41,850.99"

console.log(amountUGX.base); // 43100.547
console.log(amountUGX.fee); // 360.7512
console.log(amountUGX.discount); // 0
console.log(amountUGX.currency); // "UGX"
console.log(amountUGX.computed); // 43461.2982

console.log(Number(amountUGX)); // 43462
console.log(amountUGX.valueOf()); // 43462

console.log(String(amountUGX)); // "UGX 43,462"
console.log(amountUGX.toString()); // "UGX 43,462"
```

### 3. AmountManager

#### Methods

- `constructor(currency)`
  - `currency` is required, otherwise throw Error
  - `currency` must be in list of available currencies (`AmountManager.currencies`), otherwise throw Error
  - set the `conversionsTable` protected property based on the `currency`

#### Protected Properties

- `initialAmount`

  - An instance of `Amount` reset each time you update the `initialAmount` accessor property

- `chargeAmount`

  - An instance of `ChargeAmount` reset each time you update the `currency` accessor property

- `initalCurrency`

  - The currency passed in the constructor as an uppercase string without spaces
  - It will never change for the same manager instance (it is fixed)

- `conversionsTable`
  - A dictionary (object) that contains all the convertable currencies as keys and their equivalent conversion rates with reference to the initial currency
  - It will never change for the same manager instance (it is fixed)

#### Public (Accessor) Properties

- `currency`

  - The getter, returns the protected `initialCurrency` property
  - The setter, resets the instance of `ChargeAmount` set on the `chargeAmount` protected property with a converted charge amount based on the `conversionsTable` and the new currency

- `initialAmount`

  - The getter, returns the instance of `Amount` set on the `initialAmount` protected property
  - The setter, resets the instance of `Amount` set on the `initialAmount` protected property

- `chargeAmount`
  - The getter, returns the instance of `ChargeAmount` set on the `chargeAmount` protected property
  - It is read-only, hence no setter

#### Static Properties

- `currencies`

  - An array containing the list of available currencies

- `roundedCurrencies`

  - An array containing the list of rounded currencies

- `convertableCurrencies`
  - An array containing the list of convertable currencies

```js
console.log(AmountManager.currencies); // ['NGN', "USD", "UGX", "TZS"]
console.log(AmountManager.roundedCurrencies); // ['TZS', 'UGX']
console.log(AmountManager.convertableCurrencies); // ['NGN', 'USD']

const manager = new AmountManager("NGN");

// setter for accessor property
// equivalent => (
//   initialAmount: new Amount("43100.5412", "NGN")
//   chargeAmount: new ChargeAmount("43100.5412", "NGN")
// )
manager.initialAmount = "43100.5412";

// setter for accessor property
// equivalent => (
//   convert chargeAmount.base based on new currency (USD)
//   chargeAmount: new ChargeAmount(convertedAmount, "USD")
// )
manager.currency = "USD";
```
