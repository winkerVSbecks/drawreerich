import type { Meta, StoryObj } from "@storybook/web-components-vite";
import { expect, userEvent } from "storybook/test";
import "../index.css";

function renderLayout(open = true): HTMLDivElement {
  const wrapper = document.createElement("div");
  wrapper.innerHTML = `
    <div id="app" style="width:100vw;height:100vh;position:relative;overflow:hidden;">
      <div id="canvas-container"></div>
      <details id="settings-panel"${open ? " open" : ""}>
        <summary class="settings-toggle">
          <span>Settings</span>
          <span class="settings-toggle-icon" aria-hidden="true"></span>
        </summary>
        <div id="settings-body">
          <div id="tweakpane-container"></div>
        </div>
      </details>
    </div>
  `;
  return wrapper;
}

const meta: Meta = {
  title: "Layout",
};

export default meta;

type Story = StoryObj;

// ─── Settings panel open ────────────────────────────────────────────────────

export const SettingsMenuOpen: Story = {
  render: () => renderLayout(true),
  play: async ({ canvasElement }) => {
    const panel = canvasElement.querySelector<HTMLDetailsElement>("#settings-panel")!;
    const body = canvasElement.querySelector<HTMLElement>("#settings-body")!;

    // Panel should be open and content visible
    await expect(panel.open).toBe(true);
    await expect(body.offsetParent).not.toBeNull();
  },
};

// ─── Settings panel closed ──────────────────────────────────────────────────

export const SettingsMenuClosed: Story = {
  render: () => renderLayout(false),
  play: async ({ canvasElement }) => {
    const panel = canvasElement.querySelector<HTMLDetailsElement>("#settings-panel")!;
    const body = canvasElement.querySelector<HTMLElement>("#settings-body")!;
    const summary = canvasElement.querySelector<HTMLElement>(".settings-toggle")!;

    // Panel should be closed and content hidden
    await expect(panel.open).toBe(false);
    await expect(body.offsetParent).toBeNull();

    // Panel height should match summary height — it doesn't cover the full viewport
    const panelRect = panel.getBoundingClientRect();
    const summaryRect = summary.getBoundingClientRect();
    await expect(panelRect.height).toBeCloseTo(summaryRect.height, 0);
  },
};

// ─── Summary toggles the panel open and closed ──────────────────────────────

export const SettingsMenuToggle: Story = {
  render: () => renderLayout(true),
  play: async ({ canvasElement }) => {
    const panel = canvasElement.querySelector<HTMLDetailsElement>("#settings-panel")!;
    const summary = canvasElement.querySelector<HTMLElement>(".settings-toggle")!;

    // Starts open
    await expect(panel.open).toBe(true);

    // Click summary to close
    await userEvent.click(summary);
    await expect(panel.open).toBe(false);

    // Click summary to reopen
    await userEvent.click(summary);
    await expect(panel.open).toBe(true);
  },
};
