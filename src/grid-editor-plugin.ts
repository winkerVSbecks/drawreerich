import { BladeApi, BladeController, Semver, ViewProps } from '@tweakpane/core';
import type {
  BaseBladeParams,
  Blade,
  BladePlugin,
  TpPluginBundle,
  View,
} from '@tweakpane/core';
import { GridEditor } from './grid-editor.ts';
import { getState, setActivePath, subscribe } from './state.ts';

interface GridEditorParams extends BaseBladeParams {
  view: 'grid-editor';
}

class GridEditorView implements View {
  readonly element: HTMLElement;
  readonly editor: GridEditor;
  private swatchContainer: HTMLElement;
  private unsubscribeSwatches: () => void;

  constructor(doc: Document) {
    this.element = doc.createElement('div');
    this.element.classList.add('tp-grdv');
    this.editor = new GridEditor(doc);
    this.element.appendChild(this.editor.canvas);

    this.swatchContainer = doc.createElement('div');
    this.swatchContainer.classList.add('tp-grdv-swatches');
    this.element.appendChild(this.swatchContainer);

    this.renderSwatches(doc);
    this.unsubscribeSwatches = subscribe(() => this.renderSwatches(doc));
  }

  private renderSwatches(doc: Document): void {
    const { paths, activePathId } = getState();
    this.swatchContainer.innerHTML = '';
    for (const path of paths) {
      const swatch = doc.createElement('button');
      swatch.className = 'path-swatch';
      if (path.id === activePathId) swatch.classList.add('active');
      swatch.style.backgroundColor = path.color;
      swatch.title = path.id;
      swatch.addEventListener('click', () => setActivePath(path.id));
      this.swatchContainer.appendChild(swatch);
    }
  }

  dispose(): void {
    this.editor.dispose();
    this.unsubscribeSwatches();
  }
}

class GridEditorBladeController extends BladeController<GridEditorView> {
  constructor(doc: Document, config: { blade: Blade; viewProps: ViewProps }) {
    const view = new GridEditorView(doc);
    super({ blade: config.blade, view, viewProps: config.viewProps });
    config.viewProps.handleDispose(() => view.dispose());
  }
}

const gridEditorBladePlugin: BladePlugin<GridEditorParams> = {
  id: 'grid-editor',
  type: 'blade',
  core: new Semver('2.0.0'),
  accept(params) {
    if (params['view'] !== 'grid-editor') return null;
    return { params: { view: 'grid-editor' } };
  },
  controller(args) {
    return new GridEditorBladeController(args.document, {
      blade: args.blade,
      viewProps: args.viewProps,
    });
  },
  api(args) {
    if (!(args.controller instanceof GridEditorBladeController)) return null;
    return new BladeApi(args.controller);
  },
};

export const GridEditorBladePlugin: TpPluginBundle = {
  id: 'grid-editor',
  plugin: gridEditorBladePlugin,
};
