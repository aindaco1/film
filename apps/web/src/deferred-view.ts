import { escapeHtml } from "./presentation-format";

type Renderer<State> = (state: State) => string;

export function createDeferredViewGroup<State extends { section: string }>(options: {
  titles: Record<State["section"], string>;
  reloadAction: string;
  load: () => Promise<Renderer<State>>;
}) {
  const views = new Map<State["section"], ReturnType<typeof createDeferredView<State>>>();
  return {
    mount(container: HTMLElement, state: State, bind: (scope: HTMLElement) => void) {
      let view = views.get(state.section);
      if (!view) {
        view = createDeferredView<State>({
          title: options.titles[state.section as State["section"]], heading: "h1",
          reloadAction: options.reloadAction, load: options.load,
        });
        views.set(state.section, view);
      }
      view.mount(container, state, bind);
    },
  };
}

export function createDeferredView<State>(options: {
  title: string;
  heading: "h1" | "h3";
  reloadAction: string;
  load: () => Promise<Renderer<State>>;
}) {
  let loaded: Renderer<State> | null = null;
  let pending: Promise<Renderer<State>> | null = null;
  const mounts = new WeakMap<HTMLElement, object>();
  const title = escapeHtml(options.title);
  const heading = `<${options.heading} tabindex="-1">${title}</${options.heading}>`;
  const header = `<div class="${options.heading === "h1" ? "slate-head" : "section-head row"}">${heading}</div>`;
  const placeholder = (content: string) => options.heading === "h1"
    ? `${header}${content}`
    : `<section class="inspector-section inspector-section-first">${header}${content}</section>`;

  function request(): Promise<Renderer<State>> {
    pending ??= Promise.resolve().then(options.load).then((render) => {
      loaded = render;
      return render;
    }).finally(() => { pending = null; });
    return pending;
  }

  function mount(container: HTMLElement, state: State, bind: (scope: HTMLElement) => void): void {
    const ticket = {};
    mounts.set(container, ticket);
    const current = () => container.isConnected && mounts.get(container) === ticket;
    function show(render: Renderer<State>): void {
      const restoreFocus = container.contains(document.activeElement);
      container.innerHTML = render(state);
      bind(container);
      if (restoreFocus) {
        const nextHeading = container.querySelector<HTMLElement>(options.heading);
        if (nextHeading) {
          nextHeading.tabIndex = -1;
          nextHeading.focus({ preventScroll: true });
        }
      }
    }

    if (loaded) {
      show(loaded);
      return;
    }

    container.innerHTML = placeholder(`<p role="status">Loading ${title.toLowerCase()}...</p>`);
    void request().then((render) => {
      // Only the current mount may replace content; surrounding drafts and focus are untouched.
      if (current()) show(render);
    }).catch(() => {
      if (!current()) return;
      const restoreFocus = container.contains(document.activeElement);
      container.innerHTML = placeholder(`<div class="empty-inline" role="alert"><p>${title} could not load. Reconnect, then reload this page. Saved local data is unchanged; unsaved form entries will be lost.</p><button type="button" data-action="${escapeHtml(options.reloadAction)}">Reload ${title}</button></div>`);
      const retry = container.querySelector<HTMLButtonElement>("button");
      // Failed module imports are cached by browsers. Only an explicit reload clears that failure.
      retry?.addEventListener("click", () => window.location.reload(), { once: true });
      if (restoreFocus) retry?.focus({ preventScroll: true });
    });
  }

  return { mount };
}
