import { Doc, Specimen, Sub } from "./Frame";

export function Space() {
  return (
    <Doc
      title="Space and shape"
      lede="A 4 px grid. Radii grow with the size of the thing. Depth is one hairline; nothing casts a shadow, nothing is raised. Layout is structural: the rail becomes a floating pill on the phone, the content column caps at 880, screens lay out by their container, and controls and sheets size by the viewport."
    >
      <Sub
        title="Spacing"
        note="Use gap on the parent, not margin on children. Related controls sit at 8; sections breathe at 32 to 48."
      >
        <Specimen className="items-end gap-6">
          {[4, 8, 16, 24, 32, 48].map((n) => (
            <div key={n} className="grid justify-items-center gap-2">
              <div className="bg-text/20" style={{ width: n, height: n }} />
              <span className="text-2xs text-muted tabular-nums">{n}</span>
            </div>
          ))}
        </Specimen>
      </Sub>

      <Sub
        title="Radius"
        note="Inner radius equals outer radius minus padding, so nested corners stay concentric. Chips are pills, the phone frame is 44."
      >
        <Specimen className="gap-6">
          {[
            ["xs", 6, "kbd, checkbox"],
            ["sm", 10, "small buttons, nav items, menu items"],
            ["md", 14, "buttons, inputs, toast, menus"],
            ["lg", 18, "deck cards, grade buttons"],
            ["xl", 22, "the card, the sheet"],
            ["2xl", 30, "the deck plate, the landing page's closing plate"],
          ].map(([name, r, use]) => (
            <div key={name} className="grid justify-items-center gap-2 text-center">
              <div className="edge-2 size-16 bg-plate-2" style={{ borderRadius: Number(r) }} />
              <span className="text-2xs text-muted">
                {name} · {r}
              </span>
              <span className="max-w-[12ch] text-2xs text-muted">{use}</span>
            </div>
          ))}
        </Specimen>
      </Sub>

      <Sub
        title="Edges, not elevation"
        note="Every surface is one of four tones: canvas, rail, plate and plate-2. A hairline separates them. Hover strengthens the hairline; focus adds the same neutral outline every control gets; nothing lifts."
      >
        <Specimen className="gap-4">
          <div className="edge grid h-24 w-40 place-items-center rounded-lg bg-plate text-sm text-muted">
            plate + edge
          </div>
          <div className="edge-2 grid h-24 w-40 place-items-center rounded-lg bg-plate text-sm text-muted">
            hover: edge-2
          </div>
          <div className="edge-2 grid h-24 w-40 place-items-center rounded-lg bg-plate text-sm text-muted outline-2 outline-offset-2 outline-ring">
            focus: outline
          </div>
          <div className="grid h-24 w-40 place-items-center rounded-lg bg-plate-2 text-sm text-muted">
            plate-2, no edge
          </div>
        </Specimen>
      </Sub>

      <Sub
        title="Layout"
        note="The rail is 240 and runs the full height of the window. The content column beside it caps at 880 and centres in what is left; it never stretches. Reading screens narrow to 672. The review column is 448 on the phone and 672 on desktop, where the card fills the height between 460 and 600 so the word has room at its size."
      >
        <Specimen layout="block">
          <div className="grid gap-2 text-2xs text-muted">
            <div className="flex gap-2">
              <div className="edge flex h-28 w-[22%] items-end rounded-sm bg-plate-2 p-2">
                rail 240
              </div>
              <div className="edge flex h-28 flex-1 items-end justify-center rounded-sm p-2">
                <div className="edge flex h-20 w-[62%] items-end justify-center rounded-sm bg-plate-2 p-2">
                  column 880, 672 when reading
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <div className="edge flex h-20 w-[36%] flex-col justify-end rounded-sm p-2">
                <div className="edge mb-1 flex h-10 items-end rounded-sm bg-plate-2 p-1">
                  phone: one column
                </div>
                <div className="h-3 rounded-sm bg-plate-2" />
              </div>
              <div className="edge flex h-20 flex-1 items-end rounded-sm p-2">
                Screens break at 768 px of the container, so a screen inside a phone frame still
                lays out as a phone. Controls and sheets use the viewport instead.
              </div>
            </div>
          </div>
        </Specimen>
      </Sub>
    </Doc>
  );
}
