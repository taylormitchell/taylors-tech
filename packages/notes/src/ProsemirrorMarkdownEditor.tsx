import { EditorView } from "prosemirror-view";
import { EditorState } from "prosemirror-state";
import { Plugin } from "prosemirror-state";
import { schema, defaultMarkdownParser, defaultMarkdownSerializer } from "prosemirror-markdown";
import { exampleSetup } from "prosemirror-example-setup";
import { useRef, useEffect } from "react";

export function ProsemirrorMarkdownEditor({
  value,
  onChange,
  onFocus,
  onBlur,
  style,
}: {
  value: string;
  onChange: (value: string) => void;
  onFocus: () => void;
  onBlur: () => void;
  style?: React.CSSProperties;
}) {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView>();

  const handlerRefs = useRef({
    onChange,
    onFocus,
    onBlur,
  });
  handlerRefs.current = { onFocus, onBlur, onChange };

  useEffect(() => {
    if (!editorRef.current) return;
    const view = new EditorView(editorRef.current, {
      state: EditorState.create({
        schema,
        plugins: [
          ...exampleSetup({ schema, menuBar: false }),
          new Plugin({
            props: {
              handleDOMEvents: {
                focus: () => {
                  handlerRefs.current?.onFocus();
                  return false;
                },
                blur: () => {
                  handlerRefs.current?.onBlur();
                  return false;
                },
              },
            },
            view: () => ({
              update: (view) => {
                const editorValue = defaultMarkdownSerializer.serialize(view.state.doc);
                console.debug("Editor update", { editorValue, value });
                if (editorValue !== value) {
                  handlerRefs.current?.onChange(value);
                }
              },
            }),
          }),
        ],
        doc: defaultMarkdownParser.parse(value),
      }),
    });
    viewRef.current = view;
    return () => {
      view.destroy();
    };
  }, [value]);

  return <div ref={editorRef} style={style} />;
}
