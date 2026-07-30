import type { Problem } from '../../types';
import { mustMatch, mustNotMatch, runChecks } from '../../engine/validator';

export const softwareDesignProblems: Problem[] = [
  {
    id: 'sd-dry-1',
    ruleId: 'sd-dry',
    category: 'software-design',
    title: 'Extract duplicated money formatter',
    description:
      'Two functions duplicate the same formatting logic. Extract a shared `formatMoney(cents, currency)` helper and use it in both places.',
    language: 'javascript',
    starterCode: `function formatOrderTotal(order) {
  return (order.totalCents / 100).toFixed(2) + ' ' + order.currency;
}

function formatLineItemTotal(item) {
  return (item.totalCents / 100).toFixed(2) + ' ' + item.currency;
}

module.exports = { formatOrderTotal, formatLineItemTotal };`,
    hints: [
      'Create one function that takes cents and currency.',
      'Call that helper from both formatOrderTotal and formatLineItemTotal.',
    ],
    explanation: {
      why: 'One formatter means one place to change decimal rules or currency display.',
      whyNot: 'Duplicate format strings drift — one gets fixed, the other keeps a bug.',
      correctApproach: 'Extract formatMoney(cents, currency) and delegate both functions to it.',
      commonMistakes: [
        'Extracting to a class hierarchy when a single function suffices (KISS).',
        'Only fixing one duplicate and leaving the other.',
      ],
    },
    variants: [
      {
        id: 'sd-dry-v2',
        title: 'Shared discount calculator',
        description: 'Extract the repeated percent-off calculation used in two functions.',
        starterCode: `function checkoutDiscount(order) {
  return order.subtotal * (order.discountPercent / 100);
}

function previewDiscount(cart) {
  return cart.subtotal * (cart.discountPercent / 100);
}

module.exports = { checkoutDiscount, previewDiscount };`,
      },
    ],
    validate(code) {
      return runChecks([
        () => mustMatch(code, /function\s+formatMoney|const\s+formatMoney/, 'Add a shared formatMoney helper.'),
        () => mustMatch(code, /formatMoney\s*\(/, 'Both formatters should call formatMoney.'),
        () => mustNotMatch(code, /toFixed\(2\)[\s\S]*toFixed\(2\)/, 'Do not duplicate the toFixed formatting logic in both functions.'),
      ]);
    },
  },
  {
    id: 'sd-srp-1',
    ruleId: 'sd-srp',
    category: 'software-design',
    title: 'Split the god class',
    description:
      'UserManager does registration, newsletter sending, and PDF generation. Split responsibilities into focused classes with one job each.',
    language: 'javascript',
    starterCode: `class UserManager {
  register(user) {
    // validate and save user
    return { id: user.email, saved: true };
  }

  sendNewsletter() {
    // email all subscribers
    return { sent: 42 };
  }

  generatePdfInvoice(order) {
    return \`PDF for order \${order.id}\`;
  }
}

module.exports = { UserManager };`,
    hints: [
      'Create separate classes: registration, newsletter, invoice PDF.',
      'Each class should expose one primary method.',
    ],
    explanation: {
      why: 'Each class changes for one reason — registration rules, email transport, or PDF layout.',
      whyNot: 'God classes force unrelated teams to edit the same file and create merge conflicts.',
      correctApproach: 'UserRegistrationService, NewsletterSender, InvoicePdfGenerator — each with one public method.',
      commonMistakes: [
        'Renaming methods but keeping one class.',
        'Creating too many micro-classes for trivial one-liners (balance with KISS).',
      ],
    },
    variants: [
      {
        id: 'sd-srp-v2',
        title: 'OrderProcessor responsibilities',
        description: 'Split validation, charging, and email notification into separate services.',
        starterCode: `class OrderProcessor {
  validate(order) { return order.items.length > 0; }
  charge(order) { return { charged: order.total }; }
  notify(order) { return { emailed: order.customerEmail }; }
}

module.exports = { OrderProcessor };`,
      },
    ],
    validate(code) {
      return runChecks([
        () => mustNotMatch(code, /class\s+UserManager/, 'Remove the god class UserManager.'),
        () => mustMatch(code, /class\s+\w*Registration\w*|class\s+UserRegistration/, 'Add a registration-focused class.'),
        () => mustMatch(code, /class\s+\w*Newsletter\w*|class\s+NewsletterSender/, 'Add a newsletter-focused class.'),
        () => mustMatch(code, /class\s+\w*Invoice\w*|class\s+InvoicePdf/, 'Add an invoice PDF class.'),
      ]);
    },
  },
  {
    id: 'sd-yagni-1',
    ruleId: 'sd-yagni',
    category: 'software-design',
    title: 'Remove speculative notification channel',
    description:
      'UserService.save accepts an unused notificationChannel parameter "for later". Remove speculative API surface until it is actually needed.',
    language: 'javascript',
    starterCode: `class UserService {
  save(user, notificationChannel = null) {
    // notificationChannel unused — might add Slack later
    this.repository.persist(user);
    return user;
  }

  constructor(repository) {
    this.repository = repository;
  }
}

module.exports = { UserService };`,
    hints: ['Delete the unused parameter.', 'Keep save focused on persisting the user.'],
    explanation: {
      why: 'Unused parameters expand the API contract and require documentation and tests for no benefit.',
      whyNot: 'Speculative options become breaking changes when the real design differs from the guess.',
      correctApproach: 'save(user) only — add notification when a concrete requirement exists.',
      commonMistakes: [
        'Adding a stub Slack implementation instead of removing the parameter.',
        'Commenting the parameter out instead of deleting it.',
      ],
    },
    variants: [
      {
        id: 'sd-yagni-v2',
        title: 'Drop unused export format option',
        description: 'Remove the unused format argument from exportReport.',
        starterCode: `function exportReport(data, format = 'pdf') {
  // only JSON is implemented today
  return JSON.stringify(data);
}

module.exports = { exportReport };`,
      },
    ],
    validate(code) {
      return runChecks([
        () => mustNotMatch(code, /notificationChannel/, 'Remove the speculative notificationChannel parameter.'),
        () => mustMatch(code, /save\s*\(\s*user\s*\)/, 'save should accept only the user argument.'),
      ]);
    },
  },
  {
    id: 'sd-soc-1',
    ruleId: 'sd-soc',
    category: 'software-design',
    title: 'Move SQL out of the controller',
    description:
      'The controller runs raw SQL with user input. Move data access to a repository and keep the controller focused on HTTP/rendering.',
    language: 'javascript',
    starterCode: `class OrderController {
  list(userId) {
    const sql = \`SELECT * FROM orders WHERE user_id = \${userId}\`;
    const rows = this.db.query(sql);
    return { template: 'orders/index', rows };
  }

  constructor(db) {
    this.db = db;
  }
}

module.exports = { OrderController };`,
    hints: [
      'Create OrderRepository with findForUser(userId).',
      'Controller should call the repository, not build SQL.',
    ],
    explanation: {
      why: 'Controllers handle HTTP; repositories handle queries — each layer changes for different reasons.',
      whyNot: 'SQL in controllers is untestable, duplicated, and couples routing to schema details.',
      correctApproach: 'OrderRepository.findForUser(userId) returns rows; controller passes them to the template.',
      commonMistakes: [
        'Moving SQL to a private controller method instead of a repository.',
        'Fixing injection but leaving query logic in the controller.',
      ],
    },
    variants: [
      {
        id: 'sd-soc-v2',
        title: 'Extract product lookup from handler',
        description: 'Move the inline database fetch from ProductHandler into ProductRepository.',
        starterCode: `class ProductHandler {
  show(id) {
    const product = this.db.query(\`SELECT * FROM products WHERE id = \${id}\`)[0];
    return { view: 'product/show', product };
  }
}

module.exports = { ProductHandler };`,
      },
    ],
    validate(code) {
      return runChecks([
        () => mustMatch(code, /class\s+OrderRepository|OrderRepository/, 'Add an OrderRepository.'),
        () => mustMatch(code, /findForUser/, 'Repository should expose findForUser.'),
        () => mustNotMatch(code, /SELECT \* FROM orders/, 'Controller should not contain raw SQL.'),
      ]);
    },
  },
];
