import "./App.css";
import { env } from "./env";
import { Replicache } from "replicache";
import { useSubscribe } from "replicache-react";
import { Note } from "./types";
import { mutators, selectors } from "./mutators";
import { nanoid } from "nanoid";

const rep = new Replicache({
  name: "taylormitchell",
  licenseKey: env.replicacheLicenseKey,
  pullURL: "https://gmhjm7swtq2txxf4p6rqtvz23q0yokyq.lambda-url.us-east-1.on.aws/pull",
  pushURL: "https://gmhjm7swtq2txxf4p6rqtvz23q0yokyq.lambda-url.us-east-1.on.aws/push",
  mutators,
});
(window as any).rep = rep;

function App() {
  const notes = useSubscribe(rep, selectors.listNote, { default: [] as Note[] }).sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt)
  );
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
      </div>
      <div>
        {notes.map((note) => (
          <div key={note.id}>
            <input
              style={{
                width: "100%",
              }}
              value={note.body || ""}
              onChange={(e) => {
                rep.mutate.updateNote({ id: note.id, body: e.target.value });
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;
