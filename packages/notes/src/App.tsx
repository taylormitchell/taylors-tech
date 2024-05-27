import "./App.css";
import { env } from "./env";
import { Replicache, WriteTransaction } from "replicache";
import { generate } from "@rocicorp/rails";
import { useSubscribe } from "replicache-react";
import { nanoid } from "nanoid";

type Note = {
  id: string;
  title: null | string;
  body: null | string;
  created_at: string;
};

const { get: getNote, update: updateNote, list: listNote } = generate<Note>("note");

const rep = new Replicache({
  name: "taylormitchell",
  licenseKey: env.replicacheLicenseKey,
  pullURL: "https://gmhjm7swtq2txxf4p6rqtvz23q0yokyq.lambda-url.us-east-1.on.aws/pull",
  pushURL: "https://gmhjm7swtq2txxf4p6rqtvz23q0yokyq.lambda-url.us-east-1.on.aws/push",
  mutators: {
    putNote: async (tx: WriteTransaction, note: Partial<Note> = {}) => {
      note = {
        id: nanoid(),
        title: null,
        body: null,
        ...note,
        created_at: new Date().toISOString(),
      };
      await tx.set(`note/${note.id}`, note);
    },
    getNote,
    updateNote,
    listNote,
  },
});

function App() {
  const notes = useSubscribe(rep, listNote, { default: [] as Note[] }).sort((a, b) =>
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
