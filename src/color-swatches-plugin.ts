import {
  BladeApi,
  BladeController,
  Semver,
  ViewProps,
} from "@tweakpane/core";
import type {
  BaseBladeParams,
  Blade,
  BladePlugin,
  TpPluginBundle,
  View,
} from "@tweakpane/core";

interface ColorSwatchesParams extends BaseBladeParams {
  view: "color-swatches";
  label?: string;
}

type ColorProvider = () => string;
type PaletteProvider = () => readonly string[];
type ColorChangeHandler = (color: string) => void;

let registeredProviders: {
  palette: PaletteProvider;
  current: ColorProvider;
  onChange: ColorChangeHandler;
} | null = null;

/**
 * Register the palette source + change handler used by color-swatches blades.
 * Call once during app setup. Subsequent calls replace the previous registration.
 */
export function registerColorSwatchesSource(opts: {
  palette: PaletteProvider;
  current: ColorProvider;
  onChange: ColorChangeHandler;
}): void {
  registeredProviders = opts;
  for (const view of liveViews) view.refresh();
}

/** Ask all mounted swatch blades to refresh (e.g. after palette regeneration). */
export function refreshColorSwatches(): void {
  for (const view of liveViews) view.refresh();
}

const liveViews = new Set<ColorSwatchesView>();

class ColorSwatchesView implements View {
  readonly element: HTMLElement;
  private trigger: HTMLButtonElement;
  private chip: HTMLElement;
  private popover: HTMLElement;
  private docClickHandler: (e: MouseEvent) => void;

  constructor(doc: Document, label: string) {
    this.element = doc.createElement("div");
    this.element.classList.add("tp-clrsw");

    const row = doc.createElement("div");
    row.className = "tp-clrsw_l";
    row.textContent = label;
    this.element.appendChild(row);

    const valueWrap = doc.createElement("div");
    valueWrap.className = "tp-clrsw_v";
    this.element.appendChild(valueWrap);

    this.trigger = doc.createElement("button");
    this.trigger.type = "button";
    this.trigger.className = "tp-clrsw-trigger";
    this.trigger.setAttribute("aria-haspopup", "true");
    this.trigger.setAttribute("aria-expanded", "false");
    valueWrap.appendChild(this.trigger);

    this.chip = doc.createElement("span");
    this.chip.className = "tp-clrsw-chip";
    this.trigger.appendChild(this.chip);

    this.popover = doc.createElement("div");
    this.popover.className = "tp-clrsw-popover";
    this.popover.hidden = true;
    valueWrap.appendChild(this.popover);

    this.trigger.addEventListener("click", (e) => {
      e.stopPropagation();
      this.toggleOpen();
    });

    this.docClickHandler = (e: MouseEvent) => {
      if (this.popover.hidden) return;
      const target = e.target as Node;
      if (!this.element.contains(target)) this.setOpen(false);
    };
    doc.addEventListener("click", this.docClickHandler);

    liveViews.add(this);
    this.refresh();
  }

  refresh(): void {
    if (!registeredProviders) return;
    const current = registeredProviders.current();
    this.chip.style.backgroundColor = current;

    const palette = registeredProviders.palette();
    this.popover.innerHTML = "";
    for (const color of palette) {
      const swatch = this.popover.ownerDocument.createElement("button");
      swatch.type = "button";
      swatch.className = "tp-clrsw-swatch";
      swatch.style.backgroundColor = color;
      swatch.title = color;
      swatch.addEventListener("click", (e) => {
        e.stopPropagation();
        registeredProviders?.onChange(color);
        this.setOpen(false);
      });
      this.popover.appendChild(swatch);
    }
  }

  private toggleOpen(): void {
    this.setOpen(Boolean(this.popover.hidden));
  }

  private setOpen(open: boolean): void {
    this.popover.hidden = !open;
    this.trigger.setAttribute("aria-expanded", String(open));
  }

  dispose(): void {
    liveViews.delete(this);
    this.element.ownerDocument.removeEventListener("click", this.docClickHandler);
  }
}

class ColorSwatchesController extends BladeController<ColorSwatchesView> {
  constructor(
    doc: Document,
    config: { blade: Blade; viewProps: ViewProps; label: string },
  ) {
    const view = new ColorSwatchesView(doc, config.label);
    super({ blade: config.blade, view, viewProps: config.viewProps });
    config.viewProps.handleDispose(() => view.dispose());
  }
}

const colorSwatchesBladePlugin: BladePlugin<ColorSwatchesParams> = {
  id: "color-swatches",
  type: "blade",
  core: new Semver("2.0.0"),
  accept(params) {
    if (params["view"] !== "color-swatches") return null;
    return {
      params: {
        view: "color-swatches",
        label: typeof params["label"] === "string" ? (params["label"] as string) : "color",
      },
    };
  },
  controller(args) {
    return new ColorSwatchesController(args.document, {
      blade: args.blade,
      viewProps: args.viewProps,
      label: (args.params as { label: string }).label,
    });
  },
  api(args) {
    if (!(args.controller instanceof ColorSwatchesController)) return null;
    return new BladeApi(args.controller);
  },
};

export const ColorSwatchesBladePlugin: TpPluginBundle = {
  id: "color-swatches",
  plugin: colorSwatchesBladePlugin,
};
