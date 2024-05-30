import "./App.css";
import { env } from "./env";
import { Replicache } from "replicache";
import { useSubscribe } from "replicache-react";
import { Note } from "./types";
import { mutators, selectors } from "./mutators";
import { nanoid } from "nanoid";
import { useEffect, useRef, useState } from "react";
import { useDebouncedCallback } from "use-debounce";
import { atom, getDefaultStore } from "jotai";

const rep = new Replicache({
  name: "taylormitchell",
  licenseKey: env.replicacheLicenseKey,
  // pullURL: env.replicachePullURL,
  // pushURL: env.replicachePushURL,
  pushDelay: 5_000,
  mutators,
});
(window as any).rep = rep;

function usePullOnPoke(rep: Replicache) {
  useEffect(() => {
    const ws = new WebSocket(env.wsURL);
    ws.onopen = () => {
      console.debug("Listening for pokes...");
    };
    ws.onmessage = (event) => {
      try {
        console.debug("Received message from server:", event.data);
        if (JSON.parse(event.data).message === "poke") {
          console.debug("Received poke from server. Pulling...");
          rep.pull();
        }
      } catch (e) {
        console.warn("Failed to parse message from server:", e);
      }
    };
    return () => {
      if (ws.readyState === ws.OPEN) {
        ws.close();
      }
    };
  }, [rep]);
}

const viewStateAtom = atom<{ id: string }>({ id: "" });
// const useIsFocused = (id: string) => {
//   const [isFocused, setIsFocused] = useState(false);
//   const viewState = useAtomValue(viewStateAtom);
//   useEffect(() => {
//     const newIsFocused = viewState.id === id;
//     if (newIsFocused !== isFocused) {
//       console.log("Setting focus", id, newIsFocused);
//       setIsFocused(newIsFocused);
//     }
//   }, [viewState, id, isFocused]);
//   return isFocused;
// };
const isFocused = (id: string | undefined) => {
  return getDefaultStore().get(viewStateAtom).id === id;
};
const setFocus = (id: string | null) => {
  getDefaultStore().set(viewStateAtom, { id: id || "" });
};

(window as any).getViewState = () => getDefaultStore().get(viewStateAtom);

function App() {
  usePullOnPoke(rep);

  // Subscribe to the list of note IDs, sorted by creation date. We don't query the full
  // notes here, because if we did, the whole list would re-render on every note content change.
  const noteIds = useSubscribe(
    rep,
    async (tx) => {
      const arr = (await tx.scan({ prefix: "note/" }).values().toArray()) as Note[];
      arr.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      return arr.map((n) => n.id);
    },
    { default: [] as string[] }
  );

  console.debug("Rendering App");
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        width: "100%",
        padding: "1em 1em 10em",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
        }}
      >
        <button
          onClick={() => {
            const id = nanoid();
            rep.mutate.putNote({
              id,
              title: null,
              body: "",
              createdAt: new Date().toISOString(),
            });
            console.log("Created note", id);
            setFocus(id);
          }}
        >
          new note
        </button>
        <button
          onClick={() => {
            rep.pull();
          }}
        >
          Pull
        </button>
        <button
          onClick={() => {
            rep.push();
          }}
        >
          Push
        </button>
      </div>
      <div>
        {noteIds.map((id) => (
          <Editor key={id} noteId={id} />
        ))}
      </div>
    </div>
  );
}

function Editor({ noteId }: { noteId: string }) {
  const ref = useRef<HTMLInputElement>(null);
  const note = useSubscribe(rep, (tx) => selectors.getNote(tx, noteId));

  // Set text to the note body when the note changes. We don't update the note
  // body on every keystroke though, to avoid spamming the server. So the text
  // state will be out of sync with the note body until the user stops typing,
  // at which point we update the note body.
  const [text, setText] = useState(note?.body || "");
  useEffect(() => {
    setText(note?.body || "");
  }, [note]);
  const debouncedUpdateNote = useDebouncedCallback((body: string) => {
    rep.mutate.updateNote({ id: noteId, body });
  }, 1000);

  // After the initial render, focus the input if this note is focused
  useEffect(() => {
    if (isFocused(note?.id) && ref.current !== document.activeElement) {
      ref.current?.focus();
    }
  }, [note]);

  if (!note) {
    return null;
  }
  console.debug("Rendering Editor", note.id);
  return (
    <div
      style={{
        display: "flex",
        width: "100%",
      }}
    >
      <input
        ref={ref}
        style={{
          flexBasis: 0,
          flexGrow: 1,
          fontSize: "1.2em",
        }}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          debouncedUpdateNote(e.target.value);
        }}
        // on backspace while empty, delete the note
        onKeyDown={(e) => {
          if (e.key === "Backspace" && text === "") {
            rep.mutate.deleteNote(noteId);
          }
        }}
        onFocus={() => {
          if (!isFocused(noteId)) {
            setFocus(noteId);
          }
        }}
        onBlur={() => {
          if (isFocused(noteId)) {
            setFocus(null);
          }
        }}
      />
      <button onClick={() => rep.mutate.deleteNote(noteId)}>X</button>
    </div>
  );
}

export default App;
