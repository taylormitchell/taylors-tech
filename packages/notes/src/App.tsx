import "./App.css";
import { env } from "./env";
import { Replicache } from "replicache";
import { useSubscribe } from "replicache-react";
import { Note } from "./types";
import { mutators, selectors } from "./mutators";

const rep = new Replicache({
  name: "taylormitchell",
  licenseKey: env.replicacheLicenseKey,
  pullURL: "https://gmhjm7swtq2txxf4p6rqtvz23q0yokyq.lambda-url.us-east-1.on.aws/pull",
  pushURL: "https://gmhjm7swtq2txxf4p6rqtvz23q0yokyq.lambda-url.us-east-1.on.aws/push",
  mutators,
});

function App() {
  const notes = useSubscribe(rep, selectors.listNote, { default: [] as Note[] }).sort((a, b) =>
    b.created_at.localeCompare(a.created_at)
  );
  return (
    <div>
      <h1>My notes</h1>
      <ul>
        {notes.map((note) => (
          <li key={note.id}>
            <input
              value={note.body || ""}
              onChange={(e) => {
                rep.mutate.updateNote({ id: note.id, body: e.target.value });
              }}
            />
          </li>
        ))}
      </ul>
      <div>
        <button
          onClick={() => {
            rep.mutate.putNote({ body: "" });
          }}
        >
          new note
        </button>
      </div>
    </div>
  );
}

export default App;
