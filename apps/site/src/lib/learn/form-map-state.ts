import {
  type FormId,
  formsOf,
  kindOf,
  type MapKind,
  type UseId,
  useById,
  WORDS,
  type WordId,
} from "./form-map";

export type MapView = "branches" | "table";

interface Shown {
  view: MapView;
  word: WordId;
}

export type MapState =
  | (Shown & { status: "closed" })
  | (Shown & { status: "form"; form: FormId })
  | (Shown & { status: "use"; form: FormId; use: UseId });

export type MapEvent =
  | { type: "kind"; kind: MapKind }
  | { type: "word"; word: WordId }
  | { type: "view"; view: MapView }
  | { type: "form"; form: FormId }
  | { type: "use"; use: UseId };

export interface MapStart {
  word: WordId;
  use?: UseId | undefined;
  view?: MapView | undefined;
}

const closed = (view: MapView, word: WordId): MapState => ({ status: "closed", view, word });

const belongs = (word: WordId, form: FormId) =>
  formsOf(kindOf(word)).some((each) => each.id === form);

export function startMap({ word, use, view = "branches" }: MapStart): MapState {
  const state = closed(view, word);
  return use ? mapReducer(state, { type: "use", use }) : state;
}

export function mapReducer(state: MapState, event: MapEvent): MapState {
  switch (event.type) {
    case "kind": {
      const word = WORDS[event.kind][0];
      return !word || kindOf(state.word) === event.kind ? state : closed(state.view, word);
    }
    case "word":
      return kindOf(event.word) === kindOf(state.word)
        ? { ...state, word: event.word }
        : closed(state.view, event.word);
    case "view":
      return { ...state, view: event.view };
    case "form": {
      if (!belongs(state.word, event.form)) return state;
      const { view, word } = state;
      return state.status !== "closed" && state.form === event.form
        ? closed(view, word)
        : { status: "form", view, word, form: event.form };
    }
    case "use": {
      const { form } = useById(event.use);
      if (!belongs(state.word, form)) return state;
      const { view, word } = state;
      return state.status === "use" && state.use === event.use
        ? { status: "form", view, word, form }
        : { status: "use", view, word, form, use: event.use };
    }
  }
}
