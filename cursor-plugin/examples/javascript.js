/**
 * JavaScript — Rule Examples (coding-standards.mdc)
 * Each block: RULE, WHY, WHY NOT, DON'T DO, PREFER
 */

// =============================================================================
// RULE: Prefer const; use let when reassignment needed; never var; one variable per line
// WHY: const signals immutability; let has block scope; var hoists and confuses closure bugs.
// WHY NOT: var leaks across blocks; reassigned const is a syntax error that catches mistakes early.
// =============================================================================

// --- DON'T DO ---
var total = 0, count = items.length;
for (var i = 0; i < count; i++) { total += items[i].price; }

// --- PREFER ---
const count = items.length;
let total = 0;
for (const item of items) {
  total += item.price;
}

// =============================================================================
// RULE: Semantic camelCase; PascalCase for classes; avoid Hungarian notation and articles
// WHY: Names read naturally in JS ecosystems and match MDN / Prettier defaults.
// WHY NOT: `strName`, `myCarArray` encode type in the name and go stale when types change.
// =============================================================================

// --- DON'T DO ---
const strUserName = user.name;
const arrOrderList = orders;

// --- PREFER ---
const userName = user.name;
const orderList = orders;

// =============================================================================
// RULE: Function names start with clear verbs; avoid vague or multi-responsibility names
// WHY: Call sites read as commands; single-purpose names simplify testing.
// WHY NOT: `handleData` tells nothing; `saveUserAndSendEmail` hides two jobs in one function.
// =============================================================================

// --- DON'T DO ---
function process(input) { /* saves and emails */ }
function user(id) { return fetch(`/users/${id}`); }

// --- PREFER ---
function saveUserAndNotify(user) { /* orchestrator calls saveUser + sendWelcomeEmail */ }
function fetchUser(id) { return fetch(`/users/${id}`); }

// =============================================================================
// RULE: Name for what you do/perform — not how, where, or why in the identifier
// WHY: Domain call sites stay stable when transport, storage, or routing changes.
// WHY NOT: Mechanism and destination in the name force every caller to know infrastructure.
// =============================================================================

// --- DON'T DO ---
function sendNotificationViaMessageQueue(user) { /* ... */ }
function loadCartFromSessionStorageOnPageLoad() { /* ... */ }
function saveProfileUsingFetchToApiV2(profile) { /* ... */ }

// --- PREFER ---
function sendOrderConfirmationNotification(user) { /* ... */ }
function loadCart() { /* ... */ }
function saveProfile(profile) { /* ... */ }

// =============================================================================
// RULE: Query names (get/is/has) must not hide mutations
// WHY: Readers assume getters are side-effect free.
// WHY NOT: `isTokenValid()` that deletes expired tokens surprises callers and breaks caching.
// =============================================================================

// --- DON'T DO ---
function isTokenValid(token) {
  if (token.expiresAt < Date.now()) {
    deleteToken(token);
    return false;
  }
  return true;
}

// --- PREFER ---
function isTokenValid(token) {
  return token.expiresAt >= Date.now();
}
function invalidateExpiredToken(token) {
  if (!isTokenValid(token)) deleteToken(token);
}

// =============================================================================
// RULE: Function declarations for named functions; arrow functions for callbacks, not methods
// WHY: Declarations hoist clearly; arrow methods break `this` binding on objects/classes.
// WHY NOT: `const foo = () => {}` as a method loses dynamic `this`; class arrow fields allocate per instance.
// =============================================================================

// --- DON'T DO ---
const calculator = {
  value: 0,
  add: (n) => { this.value += n; }, // `this` is not calculator
};

// --- PREFER ---
function createCalculator() {
  let value = 0;
  return {
    add(n) { value += n; },
    getValue() { return value; },
  };
}

// =============================================================================
// RULE: for...of / forEach over index loops; never for...in on arrays; always use braces
// WHY: for...of is readable and avoids off-by-one; for...in iterates keys including prototypes.
// WHY NOT: Index loops add noise; brace-less bodies break on the next added line.
// =============================================================================

// --- DON'T DO ---
for (let i in items) console.log(items[i]);
for (let j = 0; j < items.length; j++) console.log(items[j]);

// --- PREFER ---
for (const item of items) {
  console.log(item);
}

// =============================================================================
// RULE: After if-return, omit redundant else; use === / !==
// WHY: Flat structure reads top-to-bottom; strict equality avoids coercion surprises.
// WHY NOT: `==` coerces types (`0 == ''` is true); else-after-return adds nesting.
// =============================================================================

// --- DON'T DO ---
function isAdult(age) {
  if (age >= 18) return true;
  else return false;
}
if (value == null) { /* ambiguous: null only or null+undefined? */ }

// --- PREFER ---
function isAdult(age) {
  if (age >= 18) return true;
  return false;
}
if (value === null || value === undefined) { /* explicit */ }

// =============================================================================
// RULE: Literals not new Array/Object; ES classes; Object.hasOwn over hasOwnProperty
// WHY: Literals are idiomatic; Object.hasOwn avoids prototype pollution issues.
// WHY NOT: `new Array(3)` creates sparse arrays; calling borrowed hasOwnProperty breaks on null prototype.
// =============================================================================

// --- DON'T DO ---
const list = new Array();
const obj = new Object();
Object.prototype.hasOwnProperty.call(data, 'id');

// --- PREFER ---
const list = [];
const obj = {};
Object.hasOwn(data, 'id');

// =============================================================================
// RULE: Template literals; Number()/String() instead of + coercion
// WHY: Explicit conversion documents intent; coercion hides NaN and concatenation bugs.
// WHY NOT: `+val` turns `undefined` into NaN silently; `"" + val` always stringifies.
// =============================================================================

// --- DON'T DO ---
const label = 'Total: ' + +amount;
const id = '' + userId;

// --- PREFER ---
const label = `Total: ${Number(amount)}`;
const id = String(userId);

// =============================================================================
// RULE: Prefer async/await over raw Promise chains; no top-level await in CommonJS
// WHY: async/await reads synchronously and handles errors with try/catch.
// WHY NOT: Deep `.then()` chains obscure error paths; top-level await breaks require() consumers.
// =============================================================================

// --- DON'T DO ---
fetch('/api/user')
  .then((r) => r.json())
  .then((user) => fetch(`/api/orders?user=${user.id}`))
  .then((r) => r.json())
  .then(renderOrders);

// --- PREFER ---
async function loadOrders() {
  const userRes = await fetch('/api/user');
  if (!userRes.ok) throw new Error('Failed to load user');
  const user = await userRes.json();
  const ordersRes = await fetch(`/api/orders?user=${user.id}`);
  if (!ordersRes.ok) throw new Error('Failed to load orders');
  return ordersRes.json();
}

// =============================================================================
// RULE: Small try blocks; catch specific errors; never swallow
// WHY: Tiny try scopes pinpoint failure; broad catch masks unrelated bugs.
// WHY NOT: Empty catch hides outages; logging without rethrow loses failure signals upstream.
// =============================================================================

// --- DON'T DO ---
try {
  validateInput(data);
  const result = await gateway.charge(data);
  saveToDb(result);
} catch (e) {
  // ignored
}

// --- PREFER ---
validateInput(data);
try {
  const result = await gateway.charge(data);
  saveToDb(result);
} catch (error) {
  if (error instanceof PaymentDeclinedError) {
    return showDeclinedMessage(error);
  }
  console.error('Charge failed', { error });
  throw error;
}

// =============================================================================
// RULE: Do not mutate passed objects/arrays; return new structures
// WHY: Shared references cause action-at-a-distance bugs across modules.
// WHY NOT: In-place sort/splice on caller-owned arrays corrupts caller state unexpectedly.
// =============================================================================

// --- DON'T DO ---
function addTax(items) {
  for (const item of items) item.price *= 1.1;
  return items;
}

// --- PREFER ---
function addTax(items) {
  return items.map((item) => ({ ...item, price: item.price * 1.1 }));
}

// =============================================================================
// RULE: textContent not innerHTML for plain text; fetch not XHR; event listeners not inline
// WHY: innerHTML parses HTML and enables XSS; fetch is promise-based and standard.
// WHY NOT: Inline handlers mix concerns and block CSP; XHR is verbose legacy API.
// =============================================================================

// --- DON'T DO ---
el.innerHTML = user.name;
const xhr = new XMLHttpRequest();
button.setAttribute('onclick', 'submit()');

// --- PREFER ---
el.textContent = user.name;
const response = await fetch('/api/submit', { method: 'POST', body: formData });
button.addEventListener('click', submit);

// =============================================================================
// RULE: DRY — extract duplicated JS instead of copy-paste
// WHY: One fetch/error-handling fix should not require editing every inline script.
// WHY NOT: Same 15-line DOM setup repeated per page drifts when API contracts change.
// =============================================================================

// --- DON'T DO ---
// page-a.js: async function loadUsers() { const r = await fetch('/api/users'); if (!r.ok) throw …; return r.json(); }
// page-b.js: async function loadOrders() { const r = await fetch('/api/orders'); if (!r.ok) throw …; return r.json(); }

// --- PREFER ---
// utils/fetchJson.js: export async function fetchJson(url) { … }
// page-a.js / page-b.js: import { fetchJson } from './utils/fetchJson.js';

// =============================================================================
// RULE: No console.log in production paths; console.error for errors
// WHY: Log noise pollutes observability; structured error logging aids ops.
// WHY NOT: console.log in hot paths leaks PII to browser consoles in prod.
// =============================================================================

// --- DON'T DO ---
function checkout(cart) {
  console.log('cart', cart);
  return placeOrder(cart);
}

// --- PREFER ---
function checkout(cart) {
  return placeOrder(cart).catch((error) => {
    console.error('Checkout failed', { cartId: cart.id, error });
    throw error;
  });
}

// =============================================================================
// RULE: One variable, one meaning — no double duty (null/[] as readiness signal)
// WHY: Callers must not infer business outcome from payload nullability alone.
// WHY NOT: `items: null` can mean "not loaded", "failed", or "not all complete" — ambiguous.
// =============================================================================

// --- DON'T DO ---
function buildResult(doAllHaveItems, items) {
  return {
    items: doAllHaveItems ? items : null, // null encodes success + hides partial list
  };
}
if (result !== null && result.items !== null) {
  publish(result.items);
}

// --- PREFER ---
function buildResult(doAllHaveItems, items) {
  return {
    doAllHaveItems,
    items: doAllHaveItems ? items : null,
  };
}
if (result?.doAllHaveItems) {
  publish(result.items);
}

// =============================================================================
// RULE: Comments for non-obvious intent only
// WHY: Good names and structure should carry most meaning.
// WHY NOT: "// loop items" comments duplicate the code and rot when code changes.
// =============================================================================

// --- DON'T DO ---
// Set flag to true
isReady = true;

// --- PREFER ---
// Safari ignores autofocus inside hidden tabs — delay until panel is visible
requestAnimationFrame(() => input.focus());
