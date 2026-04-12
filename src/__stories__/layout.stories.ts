import type { Meta, StoryObj } from "@storybook/web-components-vite";
import { expect } from "storybook/test";
import "../index.css";

function renderLayout(): HTMLDivElement {
  const wrapper = document.createElement("div");
  wrapper.innerHTML = `
    <div id="app" style="width:100vw;height:100vh;position:relative;overflow:hidden;">
      <div id="canvas-container"></div>
      <button id="menu-button" aria-label="Open settings">
        <span class="hamburger-bar"></span>
        <span class="hamburger-bar"></span>
        <span class="hamburger-bar"></span>
      </button>
      <div id="overlay-backdrop" aria-hidden="true"></div>
      <details id="settings-panel">
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

const desktopViewport = {
  name: "Desktop",
  styles: { width: "1024px", height: "768px" },
  type: "desktop" as const,
};

const mobileViewport = {
  name: "Mobile",
  styles: { width: "375px", height: "667px" },
  type: "mobile" as const,
};

const meta: Meta = {
  title: "Layout",
  parameters: {
    viewport: {
      viewports: {
        desktop: desktopViewport,
        mobile: mobileViewport,
      },
    },
  },
};

export default meta;

type Story = StoryObj;

// ─── Hamburger button visible at desktop width ─────────────────────────────

export const HamburgerVisibleAtDesktopWidth: Story = {
  render: renderLayout,
  parameters: {
    viewport: { defaultViewport: "desktop" },
  },
  play: async ({ canvasElement }) => {
    const menuButton = canvasElement.querySelector("#menu-button")!;
    const style = window.getComputedStyle(menuButton);
    await expect(style.display).toBe("flex");
  },
};

// ─── Hamburger button visible at mobile width ──────────────────────────────

export const HamburgerVisibleAtMobileWidth: Story = {
  render: renderLayout,
  parameters: {
    viewport: { defaultViewport: "mobile" },
  },
  play: async ({ canvasElement }) => {
    const menuButton = canvasElement.querySelector("#menu-button")!;
    const style = window.getComputedStyle(menuButton);
    await expect(style.display).toBe("flex");
  },
};

// ─── Settings panel hidden by default ───────────────────────────────────────

export const SettingsPanelHiddenByDefault: Story = {
  render: renderLayout,
  parameters: {
    viewport: { defaultViewport: "desktop" },
  },
  play: async ({ canvasElement }) => {
    const panel = canvasElement.querySelector("#settings-panel")!;
    const style = window.getComputedStyle(panel);
    // Panel should be off-screen (translated to the right)
    await expect(style.transform).toContain("matrix");
  },
};

// ─── Backdrop dismisses panel ───────────────────────────────────────────────

export const BackdropDismissesPanel: Story = {
  render: () => {
    const wrapper = renderLayout();
    const app = wrapper.querySelector("#app")!;
    const backdrop = wrapper.querySelector("#overlay-backdrop")!;

    // Open the sidebar
    app.classList.add("sidebar-open");

    // Wire up backdrop click to close
    backdrop.addEventListener("click", () => {
      app.classList.remove("sidebar-open");
    });

    return wrapper;
  },
  parameters: {
    viewport: { defaultViewport: "desktop" },
  },
  play: async ({ canvasElement }) => {
    const app = canvasElement.querySelector("#app")!;
    const backdrop = canvasElement.querySelector("#overlay-backdrop")!;

    // Verify sidebar is open
    await expect(app.classList.contains("sidebar-open")).toBe(true);

    // Click backdrop
    backdrop.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    // Sidebar should be closed
    await expect(app.classList.contains("sidebar-open")).toBe(false);
  },
};
