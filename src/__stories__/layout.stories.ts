import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { expect, userEvent, within } from 'storybook/test';
import '../index.css';

function renderSingleMenu(open = true): HTMLDivElement {
  const wrapper = document.createElement('div');
  wrapper.innerHTML = `
    <div id="app" style="width:100vw;height:100vh;position:relative;overflow:hidden;">
      <div id="canvas-container"></div>
      <header id="top-bar">
        <div class="top-bar-left">
          <h1 class="brand">drawreerich</h1>
        </div>
        <nav class="top-bar-right">
          <details class="settings-menu" data-menu="artboard"${open ? ' open' : ''}>
            <summary class="settings-toggle top-bar-button">
              <span>Artboard</span>
              <span class="icon icon-chevron" aria-hidden="true"></span>
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

function renderFullTopBar(): HTMLDivElement {
  const wrapper = document.createElement('div');
  wrapper.innerHTML = `
    <div id="app" style="width:100vw;height:100vh;position:relative;overflow:hidden;">
      <div id="canvas-container"></div>
      <header id="top-bar">
        <div class="top-bar-left">
          <h1 class="brand">drawreerich</h1>
          <nav class="top-bar-actions">
            <div class="menu-wrapper">
              <button
                type="button"
                class="top-bar-button"
                id="file-menu-button"
                aria-haspopup="menu"
                aria-expanded="false"
                aria-controls="file-menu"
              >
                File
                <span class="icon icon-chevron" aria-hidden="true"></span>
              </button>
            </div>
          </nav>
        </div>
        <nav class="top-bar-right">
          <details class="settings-menu" data-menu="artboard">
            <summary class="settings-toggle top-bar-button">
              <span>Artboard</span>
              <span class="icon icon-chevron" aria-hidden="true"></span>
            </summary>
            <div class="settings-body"><div class="pane-container"></div></div>
          </details>
          <details class="settings-menu" data-menu="camera">
            <summary class="settings-toggle top-bar-button">
              <span>Camera</span>
              <span class="icon icon-chevron" aria-hidden="true"></span>
            </summary>
            <div class="settings-body"><div class="pane-container"></div></div>
          </details>
          <details class="settings-menu" data-menu="draw">
            <summary class="settings-toggle top-bar-button">
              <span>Draw</span>
              <span class="icon icon-chevron" aria-hidden="true"></span>
            </summary>
            <div class="settings-body"><div class="pane-container"></div></div>
          </details>
          <button
            type="button"
            class="top-bar-button icon-only about-button"
            aria-label="About drawreerich"
          >
            <span class="icon icon-info" aria-hidden="true"></span>
          </button>
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

// ─── Full top bar (visual reference) ────────────────────────────────────────

export const TopBar: Story = {
  render: () => renderFullTopBar(),
  play: async ({ canvasElement }) => {
    const brand = canvasElement.querySelector<HTMLElement>('.brand')!;
    await expect(brand).toHaveTextContent('drawreerich');

    const menus =
      canvasElement.querySelectorAll<HTMLDetailsElement>('.settings-menu');
    await expect(menus).toHaveLength(3);
    await expect(menus[0].dataset.menu).toBe('artboard');
    await expect(menus[1].dataset.menu).toBe('camera');
    await expect(menus[2].dataset.menu).toBe('draw');

    const about = canvasElement.querySelector<HTMLElement>('.about-button')!;
    await expect(about).toBeTruthy();
  },
};

// ─── Settings menu open ─────────────────────────────────────────────────────

export const SettingsMenuOpen: Story = {
  render: () => renderSingleMenu(true),
  play: async ({ canvasElement }) => {
    const menu =
      canvasElement.querySelector<HTMLDetailsElement>('.settings-menu')!;
    const body = canvasElement.querySelector<HTMLElement>('.settings-body')!;

    // Menu should be open and content visible
    await expect(menu.open).toBe(true);
    await expect(window.getComputedStyle(body).display).not.toBe('none');
  },
};

// ─── Settings menu closed ───────────────────────────────────────────────────

export const SettingsMenuClosed: Story = {
  render: () => renderSingleMenu(false),
  play: async ({ canvasElement }) => {
    const menu =
      canvasElement.querySelector<HTMLDetailsElement>('.settings-menu')!;
    const body = canvasElement.querySelector<HTMLElement>('.settings-body')!;
    const summary =
      canvasElement.querySelector<HTMLElement>('.settings-toggle')!;

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
  render: () => renderSingleMenu(true),
  play: async ({ canvasElement }) => {
    const menu =
      canvasElement.querySelector<HTMLDetailsElement>('.settings-menu')!;
    const summary =
      canvasElement.querySelector<HTMLElement>('.settings-toggle')!;

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

// ─── About dialog ───────────────────────────────────────────────────────────

function renderAboutDialog(): HTMLDivElement {
  const wrapper = document.createElement('div');
  wrapper.innerHTML = `
    <dialog id="about-dialog" class="modal" open aria-labelledby="about-title">
      <form method="dialog" class="modal-close-form">
        <button class="modal-close" aria-label="Close">
          <span class="icon icon-x" aria-hidden="true"></span>
        </button>
      </form>
      <h2 id="about-title">drawreerich</h2>
      <p class="modal-lede">
        Draw on a 2D grid. Watch it come alive as an isometric, oblique, or orthographic voxel scene.
      </p>
      <section>
        <h3>Keyboard shortcuts</h3>
        <dl class="shortcuts">
          <dt>Drag canvas</dt><dd>Rotate camera</dd>
          <dt><kbd>F</kbd></dt><dd>Toggle File menu</dd>
          <dt><kbd>A</kbd></dt><dd>Toggle Artboard menu</dd>
          <dt><kbd>C</kbd></dt><dd>Toggle Camera menu</dd>
          <dt><kbd>D</kbd></dt><dd>Toggle Draw menu</dd>
          <dt><kbd>R</kbd></dt><dd>Reset camera</dd>
          <dt><kbd>?</kbd></dt><dd>Open this dialog</dd>
          <dt><kbd>Esc</kbd></dt><dd>Close dialogs and menus</dd>
        </dl>
      </section>
    </dialog>
  `;
  return wrapper;
}

export const AboutDialog: Story = {
  render: () => renderAboutDialog(),
  play: async ({ canvasElement }) => {
    const dialog =
      canvasElement.querySelector<HTMLDialogElement>('#about-dialog')!;
    await expect(dialog.open).toBe(true);

    const inside = within(dialog);
    await expect(inside.getByText('drawreerich')).toBeInTheDocument();
    // Every advertised shortcut renders in the list
    for (const key of ['F', 'A', 'C', 'D', 'R', '?', 'Esc']) {
      await expect(inside.getByText(key)).toBeInTheDocument();
    }
  },
};
