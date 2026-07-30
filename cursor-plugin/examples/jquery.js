/**
 * jQuery — Rule Examples (coding-standards.mdc)
 * Each block: RULE, WHY, WHY NOT, DON'T DO, PREFER
 *
 * Assumes jQuery is loaded once via CDN with local fallback (see security.md).
 */

(function ($, window, document) {
  'use strict';

  // ===========================================================================
  // RULE: CDN + local fallback; never multiple jQuery versions on one page
  // WHY: One `$` implementation; fallback keeps the app working if CDN fails.
  // WHY NOT: Duplicate versions overwrite plugins and cause "$ is not a function" errors.
  // ===========================================================================

  // --- DON'T DO (in layout HTML) ---
  // <script src="https://cdn/jquery-3.6.0.min.js"></script>
  // <script src="/assets/jquery-3.7.1.min.js"></script>

  // --- PREFER (in layout HTML) ---
  // <script src="https://code.jquery.com/jquery-3.7.1.min.js"></script>
  // <script>window.jQuery || document.write('<script src="/assets/jquery-3.7.1.min.js"><\/script>')</script>

  // ===========================================================================
  // RULE: Wrap app code in IIFE scoped to (window.jQuery, window, document)
  // WHY: `$` stays local; no global namespace pollution.
  // WHY NOT: Bare `$` aliases conflict with other libraries and strict mode linters.
  // ===========================================================================

  // --- DON'T DO ---
  // $('[data-toggle]').on('click', handler); // global $

  // --- PREFER ---
  // (function ($, window, document) { ... })(window.jQuery, window, document);

  // ===========================================================================
  // RULE: Cache selector results ($prefix) or chain; avoid repeating selectors
  // WHY: DOM queries are expensive; caching makes intent clear.
  // WHY NOT: Re-querying `$('#list .item')` on every event wastes work and can miss updates.
  // ===========================================================================

  // --- DON'T DO ---
  function highlightBad() {
    $('#cart-list .item').addClass('active');
    $('#cart-list .item').find('.price').css('color', 'red');
  }

  // --- PREFER ---
  function highlightGood() {
    const $items = $('#cart-list').find('.item');
    $items.addClass('active');
    $items.find('.price').css('color', 'red');
  }

  // ===========================================================================
  // RULE: Scope with .find() from cached parent; provide selector context when known
  // WHY: Shorter paths and bounded search reduce accidental matches.
  // WHY NOT: Global `$('.item')` hits every matching node on the page.
  // ===========================================================================

  // --- DON'T DO ---
  const $item = $('#container ul.list li.item');

  // --- PREFER ---
  const $item = $('#container').find('.item');
  // or: const $item = $('.item', '#container');

  // ===========================================================================
  // RULE: Never nest or qualify IDs; IDs are unique
  // WHY: `#outer #inner` implies invalid duplicate IDs and adds useless specificity.
  // WHY NOT: Qualified ID selectors are slower and suggest broken HTML structure.
  // ===========================================================================

  // --- DON'T DO ---
  const $panel = $('#sidebar div#settings-panel');

  // --- PREFER ---
  const $panel = $('#settings-panel');

  // ===========================================================================
  // RULE: Avoid excessive specificity — shallowest reliable selector
  // WHY: Low specificity keeps overrides and reuse possible.
  // WHY NOT: Long chains duplicate rules and fight the cascade.
  // ===========================================================================

  // --- DON'T DO ---
  $('body div.wrapper section.content ul.menu li a.link');

  // --- PREFER ---
  $('.menu__link');

  // ===========================================================================
  // RULE: Check .length before animate/act on possibly empty selections
  // WHY: jQuery returns empty sets without throwing; animations on zero nodes confuse debugging.
  // WHY NOT: Silent no-ops look like "handler broken" when the selector is wrong.
  // ===========================================================================

  // --- DON'T DO ---
  function slideBad() {
    $('#optional-banner').slideDown();
  }

  // --- PREFER ---
  function slideGood() {
    const $banner = $('#optional-banner');
    if ($banner.length) {
      $banner.slideDown();
    }
  }

  // ===========================================================================
  // RULE: Event delegation on stable parent for dynamic/many children
  // WHY: One listener scales; newly added DOM nodes are covered.
  // WHY NOT: Per-element `.on('click')` on 500 rows allocates 500 handlers and must re-bind on refresh.
  // ===========================================================================

  // --- DON'T DO ---
  function bindRowClicksBad() {
    $('#order-table tbody tr').each(function () {
      $(this).on('click', 'button.delete', deleteRow);
    });
  }

  // --- PREFER ---
  function bindRowClicksGood() {
    $('#order-table').on('click', 'button.delete', deleteRow);
  }

  // ===========================================================================
  // RULE: Named handler functions, not anonymous callbacks
  // WHY: Named functions appear in stack traces and can be removed with `.off('click', fn)`.
  // WHY NOT: Anonymous handlers cannot be unbound precisely and are harder to unit test.
  // ===========================================================================

  // --- DON'T DO ---
  $('#save').on('click', function () { saveForm(); });

  // --- PREFER ---
  function onSaveClick(event) {
    event.preventDefault();
    saveForm();
  }
  $('#save').on('click', onSaveClick);

  // ===========================================================================
  // RULE: Object literals for multi-attribute setters, not chained setter calls
  // WHY: One reflow-friendly update; easier to read and diff.
  // WHY NOT: Chained `.attr('a',1).attr('b',2)` repeats method dispatch.
  // ===========================================================================

  // --- DON'T DO ---
  function setLinkBad($el) {
    $el.attr('href', '#').attr('title', 'Home').attr('rel', 'noopener');
  }

  // --- PREFER ---
  function setLinkGood($el) {
    $el.attr({ href: '#', title: 'Home', rel: 'noopener' });
  }

  // ===========================================================================
  // RULE: Bind field listeners once — never .on() inside a submit handler
  // WHY: Re-binding on every submit stacks duplicate handlers and wastes memory.
  // WHY NOT: Each failed submit adds another change listener; validation fires N times.
  // ===========================================================================

  // --- DON'T DO ---
  $('#payment-form').on('submit', function (e) {
    fields.forEach(function ($field) {
      $field.off('input.validate').on('input.validate', function () {
        highlightEmptyField($(this));
      });
    });
  });

  // --- PREFER ---
  $(document).ready(function () {
    const $fields = $('input[name="emergencyContact[name]"], select[name="emergencyContact[relationship]"]');
    $fields.on('input change', function () {
      highlightEmptyField($(this));
    });

    $('#payment-form').on('submit', function (e) {
      // validate only — no .on() here
    });
  });

})(window.jQuery, window, document);
