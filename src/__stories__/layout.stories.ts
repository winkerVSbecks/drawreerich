import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { expect, userEvent } from 'storybook/test';
import '../index.css';

function renderLayout(open = true): HTMLDivElement {
  const wrapper = document.createElement('div');
  wrapper.innerHTML = `
    <div id="app" style="width:100vw;height:100vh;position:relative;overflow:hidden;">
      <div id="canvas-container"></div>
      <header id="top-bar">
        <div class="top-bar-left">
          <h1 class="brand">drawreerich</h1>
        </div>
        <nav class="top-bar-right">
          <details class="settings-menu" data-menu="canvas"${open ? ' open' : ''}>
            <summary class="settings-toggle top-bar-button">
              <span>Canvas</span>
              <span class="caret settings-toggle-icon" aria-hidden="true"></span>
            </summary>
            <div class="settings-body">
              <div class="pane-container"></div>
            </div>
          </details>
        </nav>
      </header>
    </div>
  `;
  return wrapper;
}

const meta: Meta = {
  title: 'Layout',
};

export default meta;

type Story = StoryObj;

// ─── Settings menu open ─────────────────────────────────────────────────────

export const SettingsMenuOpen: Story = {
  render: () => renderLayout(true),
  play: async ({ canvasElement }) => {
    const menu = canvasElement.querySelector<HTMLDetailsElement>('.settings-menu')!;
    const body = canvasElement.querySelector<HTMLElement>('.settings-body')!;

    // Menu should be open and content visible
    await expect(menu.open).toBe(true);
    await expect(window.getComputedStyle(body).display).not.toBe('none');
  },
};

// ─── Settings menu closed ───────────────────────────────────────────────────

export const SettingsMenuClosed: Story = {
  render: () => renderLayout(false),
  play: async ({ canvasElement }) => {
    const menu = canvasElement.querySelector<HTMLDetailsElement>('.settings-menu')!;
    const body = canvasElement.querySelector<HTMLElement>('.settings-body')!;
    const summary = canvasElement.querySelector<HTMLElement>('.settings-toggle')!;

    // Menu should be closed and content hidden
    await expect(menu.open).toBe(false);
    await expect(window.getComputedStyle(body).display).toBe('none');

    // Menu height should match summary height — it doesn't cover the full viewport
    const menuRect = menu.getBoundingClientRect();
    const summaryRect = summary.getBoundingClientRect();
    await expect(menuRect.height).toBeCloseTo(summaryRect.height, -1);
  },
};

// ─── Summary toggles the menu open and closed ──────────────────────────────

export const SettingsMenuToggle: Story = {
  render: () => renderLayout(true),
  play: async ({ canvasElement }) => {
    const menu = canvasElement.querySelector<HTMLDetailsElement>('.settings-menu')!;
    const summary = canvasElement.querySelector<HTMLElement>('.settings-toggle')!;

    // Starts open
    await expect(menu.open).toBe(true);

    // Click summary to close
    await userEvent.click(summary);
    await expect(menu.open).toBe(false);

    // Click summary to reopen
    await userEvent.click(summary);
    await expect(menu.open).toBe(true);
  },
};
