import "./App.css";
import { env } from "./env";
import { Replicache } from "replicache";
import { useSubscribe } from "replicache-react";
import { Note } from "./types";
import { mutators, selectors } from "./mutators";
import { nanoid } from "nanoid";
import { useEffect, useState } from "react";
import { useDebouncedCallback } from "use-debounce";

const rep = new Replicache({
  name: "taylormitchell",
  licenseKey: env.replicacheLicenseKey,
  // pullURL: "https://gmhjm7swtq2txxf4p6rqtvz23q0yokyq.lambda-url.us-east-1.on.aws/pull",
  // pushURL: "https://gmhjm7swtq2txxf4p6rqtvz23q0yokyq.lambda-url.us-east-1.on.aws/push",
  pullURL: env.replicachePullURL,
  pushURL: env.replicachePushURL,
  pullInterval: null,
  pushDelay: Infinity,
  mutators,
});
(window as any).rep = rep;

function App() {
  const notes = useSubscribe(rep, selectors.listNote, { default: [] as Note[] }).sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt)
  );
  // listen for websocket poke and pull
  useEffect(() => {
    const ws = new WebSocket(env.wsURL);
    ws.onopen = () => {
      console.log("Listening for pokes...");
    };
    ws.onmessage = (event) => {
      try {
        console.log("Received message from server:", event.data);
        if (JSON.parse(event.data).message === "poke") {
          console.log("Received poke from server. Pulling...");
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
  }, []);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        padding: "1rem",
        height: "100%",
        width: "100%",
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
            rep.mutate.putNote({
              id: nanoid(),
              title: null,
              body: "",
              createdAt: new Date().toISOString(),
            });
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
        {notes.map((note) => (
          <Editor key={note.id} note={note} />
        ))}
      </div>
    </div>
  );
}

function Editor({ note }: { note: Note }) {
  const [text, setText] = useState(note.body || "");
  const updateNote = useDebouncedCallback((body: string) => {
    rep.mutate.updateNote({ id: note.id, body });
  }, 1000);
  return (
    <div>
      <input
        style={{
          width: "100%",
        }}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          updateNote(e.target.value);
        }}
      />
    </div>
  );
}

export default App;
