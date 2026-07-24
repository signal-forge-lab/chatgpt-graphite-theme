(() => {
  'use strict';

  const GAP_VERSION = '0.1.0';
  const BASE_KEY = '__chatgptOriginalStyleProbe';
  const GAP_KEY = '__chatgptOriginalStyleGapProbe';
  const ROOT_ATTRIBUTE = 'data-chatgpt-original-style-gap-probe';
  const BASE_ROOT_ATTRIBUTE = 'data-chatgpt-original-style-probe';

  if (window[GAP_KEY]?.destroy) {
    window[GAP_KEY].destroy();
  }

  const base = window[BASE_KEY];
  if (!base?.capture || !base?.exportPayload || !base?.state) {
    const message = [
      'Original Style Gap Probe requires the base probe first.',
      'Run chatgpt-original-style-probe v0.1.1, then run this snippet.',
    ].join('\n');
    console.error(`[Original Style Gap Probe] ${message}`);
    window.alert(message);
    return;
  }

  const EXPECTED_KEYS = [
    'sidebar-row-idle',
    'sidebar-row-selected',
    'sidebar-row-hover',
    'composer-shell',
    'composer-editor',
    'composer-editor-focus',
    'composer-action-idle',
    'composer-action-hover',
    'code-surface',
    'code-action-idle',
    'code-action-hover',
    'work-panel',
    'work-row-idle',
    'work-row-hover',
    'segmented-control',
    'segmented-option-selected',
    'segmented-option-unselected',
    'model-trigger-idle',
    'model-trigger-open',
    'model-listbox',
    'model-option-idle',
    'model-option-hover',
    'model-option-selected',
    'menu-surface',
    'menu-item-idle',
    'menu-item-hover',
    'menu-item-selected',
    'dialog-surface',
    'tooltip-surface',
  ];

  const state = {
    capturedKeys: new Set(),
    watching: true,
    hoveredElement: null,
    hoverTimer: null,
    observer: null,
    panel: null,
    status: null,
    checklist: null,
    basePanel: null,
    basePanelDisplay: '',
  };

  function isElement(value) {
    return value instanceof Element;
  }

  function isProbeElement(element) {
    return Boolean(
      element?.closest?.(`[${ROOT_ATTRIBUTE}], [${BASE_ROOT_ATTRIBUTE}]`),
    );
  }

  function visible(element) {
    if (!isElement(element) || isProbeElement(element)) return false;
    const style = getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    return (
      style.display !== 'none' &&
      style.visibility !== 'hidden' &&
      Number(style.opacity || 1) !== 0 &&
      rect.width > 0 &&
      rect.height > 0
    );
  }

  function allVisible(selector, root = document) {
    try {
      return [...root.querySelectorAll(selector)].filter(visible);
    } catch {
      return [];
    }
  }

  function firstVisible(selectors, root = document) {
    for (const selector of selectors) {
      const element = allVisible(selector, root)[0];
      if (element) return element;
    }
    return null;
  }

  function transparentColor(value) {
    return (
      !value ||
      value === 'transparent' ||
      value === 'rgba(0, 0, 0, 0)' ||
      value === 'hsla(0, 0%, 0%, 0)'
    );
  }

  function hasPaint(element) {
    if (!visible(element)) return false;
    const style = getComputedStyle(element);
    return Boolean(
      !transparentColor(style.backgroundColor) ||
      style.backgroundImage !== 'none' ||
      style.boxShadow !== 'none' ||
      style.outlineStyle !== 'none' ||
      [style.borderTopWidth, style.borderRightWidth, style.borderBottomWidth, style.borderLeftWidth]
        .some((value) => Number.parseFloat(value) > 0),
    );
  }

  function nearestPaintOwner(element, maxDepth = 7) {
    let current = element;
    for (let depth = 0; current && depth <= maxDepth; depth += 1) {
      if (hasPaint(current)) return current;
      current = current.parentElement;
    }
    return element;
  }

  function paintedDescendant(root) {
    if (!isElement(root)) return null;
    const candidates = [root, ...root.querySelectorAll('*')]
      .filter((element) => {
        if (!visible(element) || !hasPaint(element)) return false;
        if (element.matches('button, input, textarea, [contenteditable="true"]')) return false;
        const rect = element.getBoundingClientRect();
        return rect.width >= 180 && rect.height >= 36;
      })
      .map((element) => {
        const rect = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        const paintWeight =
          (!transparentColor(style.backgroundColor) ? 5 : 0) +
          (style.backgroundImage !== 'none' ? 3 : 0) +
          (style.boxShadow !== 'none' ? 2 : 0);
        return { element, score: paintWeight * 1_000_000 + rect.width * rect.height };
      })
      .sort((left, right) => right.score - left.score);
    return candidates[0]?.element || null;
  }

  function capture(key, element, detail = '') {
    if (!key || !visible(element) || state.capturedKeys.has(key)) return false;
    const suffix = detail ? `:${detail}` : '';
    base.capture(element, `gap:${key}${suffix}`);
    state.capturedKeys.add(key);
    renderStatus(`Captured ${key}.`);
    renderChecklist();
    return true;
  }

  function findSidebarRows() {
    const rows = allVisible(
      '#stage-slideover-sidebar a[data-sidebar-item="true"][href*="/c/"]',
    ).filter((element) => !element.hasAttribute('data-testid'));
    const selected = rows.find((element) => element.hasAttribute('data-active')) || null;
    const idle = rows.find((element) => !element.hasAttribute('data-active')) || null;
    capture('sidebar-row-selected', selected);
    capture('sidebar-row-idle', idle);
  }

  function findComposer() {
    const form = firstVisible([
      'form.group\\/composer',
      'form:has(#prompt-textarea)',
    ]);
    if (!form) return;
    capture('composer-shell', paintedDescendant(form) || nearestPaintOwner(form));
    const editor = firstVisible([
      '#prompt-textarea',
      '[contenteditable="true"][data-virtualkeyboard="true"]',
      'form.group\\/composer [contenteditable="true"]',
    ], form);
    capture('composer-editor', editor);
    const action = allVisible('button', form).find((button) => {
      const rect = button.getBoundingClientRect();
      return rect.width >= 24 && rect.height >= 24;
    });
    capture('composer-action-idle', action);
  }

  function findCodeBlock() {
    const pre = firstVisible(['pre', '#code-block-viewer']);
    if (!pre) return;
    const surface = nearestPaintOwner(pre, 8);
    capture('code-surface', surface);
    const action = allVisible('button', surface).find((button) => !button.contains(pre));
    capture('code-action-idle', action);
  }

  function findWorkPanel() {
    const panel = firstVisible([
      '#page-header aside:has(button.group\\/section-toggle)',
      '#page-header aside',
    ]);
    if (!panel) return;
    capture('work-panel', panel);
    const row = allVisible('ul > li > :is(button, a), a[role="link"]', panel)
      .find((element) => !element.matches('.group\\/section-toggle'));
    capture('work-row-idle', row);
  }

  function findSegmentedControl() {
    const group = firstVisible([
      '#page-header [role="group"]:has(button[role="radio"])',
      '[role="group"]:has(button[role="radio"])',
    ]);
    if (!group) return;
    capture('segmented-control', group);
    const selected = firstVisible(['button[role="radio"][aria-checked="true"]'], group);
    const unselected = firstVisible(['button[role="radio"][aria-checked="false"]'], group);
    capture('segmented-option-selected', selected);
    capture('segmented-option-unselected', unselected);
  }

  function findModelTrigger() {
    const trigger = firstVisible([
      '#page-header button[aria-haspopup="listbox"]',
      '#page-header button[aria-haspopup="menu"][aria-expanded]',
      'header button[aria-haspopup="listbox"]',
      'header button[aria-haspopup="menu"][aria-expanded]',
    ]);
    capture('model-trigger-idle', trigger);
    if (
      trigger &&
      (trigger.getAttribute('aria-expanded') === 'true' || trigger.getAttribute('data-state') === 'open')
    ) {
      capture('model-trigger-open', trigger);
    }
  }

  function scanOverlay(surface) {
    if (!visible(surface)) return;
    const role = surface.getAttribute('role');
    if (role === 'listbox') {
      capture('model-listbox', surface);
      const options = allVisible('[role="option"]', surface);
      capture('model-option-idle', options.find((option) => option.getAttribute('aria-selected') !== 'true'));
      capture('model-option-selected', options.find((option) => option.getAttribute('aria-selected') === 'true'));
      return;
    }
    if (role === 'menu' || surface.hasAttribute('data-radix-menu-content')) {
      capture('menu-surface', surface);
      const items = allVisible(
        '[role="menuitem"], [role="menuitemradio"], [role="menuitemcheckbox"]',
        surface,
      );
      capture(
        'menu-item-idle',
        items.find((item) =>
          item.getAttribute('aria-checked') !== 'true' &&
          item.getAttribute('aria-selected') !== 'true' &&
          item.getAttribute('data-state') !== 'checked'),
      );
      capture(
        'menu-item-selected',
        items.find((item) =>
          item.getAttribute('aria-checked') === 'true' ||
          item.getAttribute('aria-selected') === 'true' ||
          item.getAttribute('data-state') === 'checked'),
      );
      return;
    }
    if (role === 'dialog') capture('dialog-surface', surface);
    if (role === 'tooltip') capture('tooltip-surface', surface);
  }

  function scanOverlays() {
    allVisible(
      '[role="menu"], [role="listbox"], [role="dialog"], [role="tooltip"], [data-radix-menu-content], [data-radix-select-content]',
    ).forEach(scanOverlay);
    findModelTrigger();
  }

  function scanVisibleGaps() {
    findSidebarRows();
    findComposer();
    findCodeBlock();
    findWorkPanel();
    findSegmentedControl();
    findModelTrigger();
    scanOverlays();
    renderStatus(`Visible-gap scan complete: ${state.capturedKeys.size}/${EXPECTED_KEYS.length}.`);
    return coverage();
  }

  function classifyInteractive(element) {
    if (!visible(element)) return null;

    const sidebarRow = element.closest(
      '#stage-slideover-sidebar a[data-sidebar-item="true"][href*="/c/"]',
    );
    if (sidebarRow && !sidebarRow.hasAttribute('data-testid')) {
      return { key: 'sidebar-row-hover', element: sidebarRow };
    }

    const listbox = element.closest('[role="listbox"], [data-radix-select-content]');
    const option = element.closest('[role="option"]');
    if (listbox && option) return { key: 'model-option-hover', element: option };

    const menu = element.closest('[role="menu"], [data-radix-menu-content]');
    const menuItem = element.closest(
      '[role="menuitem"], [role="menuitemradio"], [role="menuitemcheckbox"]',
    );
    if (menu && menuItem) return { key: 'menu-item-hover', element: menuItem };

    const composer = element.closest('form.group\\/composer, form:has(#prompt-textarea)');
    const composerButton = element.closest('button');
    if (composer && composerButton) return { key: 'composer-action-hover', element: composerButton };

    const codeButton = element.closest('button');
    if (codeButton && codeButton.closest(':has(> pre), #code-block-viewer, [class~="overflow-clip"]')) {
      return { key: 'code-action-hover', element: codeButton };
    }

    const workPanel = element.closest('#page-header aside');
    const workRow = element.closest('ul > li > :is(button, a), a[role="link"]');
    if (workPanel && workRow && !workRow.matches('.group\\/section-toggle')) {
      return { key: 'work-row-hover', element: workRow };
    }

    return null;
  }

  function onPointerMove(event) {
    if (!state.watching || isProbeElement(event.target)) return;
    state.hoveredElement = event.target;
    clearTimeout(state.hoverTimer);
    state.hoverTimer = window.setTimeout(() => {
      const target = classifyInteractive(state.hoveredElement);
      if (target) capture(target.key, target.element, 'auto-hover');
    }, 220);
  }

  function onFocusIn(event) {
    if (!state.watching || isProbeElement(event.target)) return;
    const editor = event.target.closest?.(
      '#prompt-textarea, form.group\\/composer [contenteditable="true"]',
    );
    if (editor) capture('composer-editor-focus', editor, 'auto-focus');
  }

  function scanMutationTarget(element) {
    if (!isElement(element) || isProbeElement(element)) return;
    if (
      element.getAttribute('aria-expanded') === 'true' ||
      element.getAttribute('data-state') === 'open'
    ) {
      const trigger = element.closest('button[aria-haspopup], [role="button"][aria-haspopup]');
      if (trigger) capture('model-trigger-open', trigger, 'attribute-open');
    }
    scanOverlays();
  }

  function startObserver() {
    state.observer = new MutationObserver((mutations) => {
      if (!state.watching) return;
      for (const mutation of mutations) {
        if (mutation.type === 'attributes') scanMutationTarget(mutation.target);
        for (const node of mutation.addedNodes || []) {
          if (isElement(node)) scanMutationTarget(node);
        }
      }
    });
    state.observer.observe(document.documentElement, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: [
        'aria-expanded',
        'aria-selected',
        'aria-checked',
        'data-state',
        'data-highlighted',
      ],
    });
  }

  function coverage() {
    const capturedKeys = [...state.capturedKeys].sort();
    return {
      expectedKeys: EXPECTED_KEYS,
      capturedKeys,
      missingKeys: EXPECTED_KEYS.filter((key) => !state.capturedKeys.has(key)),
    };
  }

  function downloadGapJson() {
    const basePayload = base.exportPayload();
    const report = {
      schema: 'chatgpt-original-style-gap-probe/v1',
      gapProbeVersion: GAP_VERSION,
      generatedAt: new Date().toISOString(),
      sourceReportAssessment: {
        sourceCaptureCount: 51,
        sourceUniqueBaselineTypes: 10,
        sourceStatefulCaptureCount: 0,
        purpose: 'Collect only the paint owners and stateful UI missing from the supplied Light report.',
      },
      coverage: coverage(),
      baseProbeReport: basePayload,
    };
    const appearance = basePayload.session.appearance.inferredAppearance;
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `chatgpt-original-style-gaps-${appearance}-${stamp}.json`;
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    renderStatus(`Downloaded ${filename}.`);
    return report;
  }

  function reset() {
    base.state.captures.length = 0;
    state.capturedKeys.clear();
    renderChecklist();
    renderStatus('Gap captures cleared.');
  }

  function button(text, handler) {
    const element = document.createElement('button');
    element.type = 'button';
    element.textContent = text;
    Object.assign(element.style, {
      border: '1px solid #48515e',
      borderRadius: '7px',
      padding: '6px 9px',
      background: '#252b33',
      color: '#eef1f5',
      cursor: 'pointer',
      font: '12px/1.2 system-ui, sans-serif',
    });
    element.addEventListener('click', handler);
    return element;
  }

  function renderStatus(message) {
    if (state.status) state.status.textContent = message;
    console.info(`[Original Style Gap Probe] ${message}`);
  }

  function renderChecklist() {
    if (!state.checklist) return;
    const missing = EXPECTED_KEYS.filter((key) => !state.capturedKeys.has(key));
    state.checklist.textContent = missing.length
      ? `Missing (${missing.length}): ${missing.join(', ')}`
      : 'All expected gap categories captured.';
  }

  function onKeyDown(event) {
    if (!(event.altKey && event.shiftKey)) return;
    const key = event.key.toLowerCase();
    if (key === 'k') {
      event.preventDefault();
      scanVisibleGaps();
    }
    if (key === 'g') {
      const target = classifyInteractive(state.hoveredElement);
      if (target) {
        event.preventDefault();
        capture(target.key, target.element, 'manual-hover');
      }
    }
    if (key === 'u') {
      event.preventDefault();
      downloadGapJson();
    }
  }

  function createPanel() {
    state.basePanel = document.querySelector(`[${BASE_ROOT_ATTRIBUTE}="panel"]`);
    if (state.basePanel) {
      state.basePanelDisplay = state.basePanel.style.display;
      state.basePanel.style.display = 'none';
    }

    const panel = document.createElement('section');
    panel.setAttribute(ROOT_ATTRIBUTE, 'panel');
    Object.assign(panel.style, {
      position: 'fixed',
      right: '14px',
      bottom: '14px',
      zIndex: '2147483647',
      width: '420px',
      maxHeight: '70vh',
      overflow: 'auto',
      padding: '12px',
      border: '1px solid #586574',
      borderRadius: '12px',
      background: '#15191f',
      color: '#eef1f5',
      boxShadow: '0 18px 48px rgba(0, 0, 0, .42)',
      font: '12px/1.45 system-ui, sans-serif',
    });

    const title = document.createElement('strong');
    title.textContent = `Original Style Gap Probe v${GAP_VERSION}`;
    title.style.display = 'block';
    title.style.marginBottom = '7px';

    const guide = document.createElement('div');
    guide.textContent =
      'Open menus/dialogs and hover sidebar rows, menu items, composer buttons, code actions, and Work rows for about 0.3 seconds.';
    Object.assign(guide.style, { color: '#b8c2ce', marginBottom: '8px' });

    const controls = document.createElement('div');
    Object.assign(controls.style, {
      display: 'flex',
      flexWrap: 'wrap',
      gap: '6px',
      marginBottom: '8px',
    });

    const watchButton = button('State watch: ON', () => {
      state.watching = !state.watching;
      watchButton.textContent = `State watch: ${state.watching ? 'ON' : 'OFF'}`;
      renderStatus(`State watch ${state.watching ? 'enabled' : 'disabled'}.`);
    });

    controls.append(
      button('Scan visible gaps', scanVisibleGaps),
      watchButton,
      button('Download gap JSON', downloadGapJson),
      button('Clear', reset),
      button('Close', destroy),
    );

    state.status = document.createElement('div');
    state.status.textContent = 'Ready. Existing baseline captures were cleared.';
    Object.assign(state.status.style, {
      minHeight: '22px',
      color: '#aeb8c4',
      marginBottom: '6px',
    });

    state.checklist = document.createElement('div');
    Object.assign(state.checklist.style, {
      color: '#8793a2',
      fontSize: '11px',
      overflowWrap: 'anywhere',
    });

    const shortcuts = document.createElement('div');
    shortcuts.textContent = 'Alt+Shift+K scan · Alt+Shift+G capture hovered · Alt+Shift+U download';
    Object.assign(shortcuts.style, {
      marginTop: '7px',
      color: '#788493',
      fontSize: '11px',
    });

    panel.append(title, guide, controls, state.status, state.checklist, shortcuts);
    panel.addEventListener('pointerdown', (event) => event.stopPropagation());
    panel.addEventListener('click', (event) => event.stopPropagation());
    document.documentElement.append(panel);
    state.panel = panel;
    renderChecklist();
  }

  function destroy() {
    clearTimeout(state.hoverTimer);
    state.observer?.disconnect();
    document.removeEventListener('pointermove', onPointerMove, true);
    document.removeEventListener('focusin', onFocusIn, true);
    document.removeEventListener('keydown', onKeyDown, true);
    state.panel?.remove();
    if (state.basePanel) state.basePanel.style.display = state.basePanelDisplay;
    if (window[GAP_KEY]) delete window[GAP_KEY];
    console.info('[Original Style Gap Probe] Removed.');
  }

  reset();
  base.rebuildRuleIndex();
  createPanel();
  document.addEventListener('pointermove', onPointerMove, true);
  document.addEventListener('focusin', onFocusIn, true);
  document.addEventListener('keydown', onKeyDown, true);
  startObserver();
  scanVisibleGaps();

  window[GAP_KEY] = {
    version: GAP_VERSION,
    state,
    scanVisibleGaps,
    download: downloadGapJson,
    coverage,
    reset,
    destroy,
  };
})();
