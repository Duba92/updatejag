import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  Bold,
  Heading2,
  Italic,
  Link2,
  List,
  ListOrdered,
  Quote,
} from "lucide-react";
import { useEffect } from "react";
import { cn } from "@/lib/utils";

export function RichEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (html: string) => void;
}) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        link: { openOnClick: false },
      }),
    ],
    content: value,
    editorProps: {
      attributes: {
        class: "prose-jag px-4 py-3",
        "aria-label": "Post content",
      },
    },
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });
  useEffect(() => {
    if (editor && value && editor.getHTML() !== value && !editor.isFocused)
      editor.commands.setContent(value);
  }, [value, editor]);
  if (!editor)
    return <div className="h-64 animate-pulse rounded-2xl border bg-muted" />;
  const B = ({
    on,
    active,
    label,
    children,
  }: {
    on: () => void;
    active?: boolean;
    label: string;
    children: React.ReactNode;
  }) => (
    <button
      type="button"
      aria-label={label}
      onClick={on}
      className={cn(
        "grid h-8 w-8 place-items-center rounded-md",
        active ? "bg-primary text-primary-foreground" : "hover:bg-accent",
      )}
    >
      {children}
    </button>
  );
  return (
    <div className="rounded-2xl border bg-background focus-within:ring-2 focus-within:ring-ring">
      <div className="flex flex-wrap gap-1 border-b p-2">
        <B
          label="Heading"
          active={editor.isActive("heading", { level: 2 })}
          on={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          <Heading2 className="h-4 w-4" />
        </B>
        <B
          label="Bold"
          active={editor.isActive("bold")}
          on={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold className="h-4 w-4" />
        </B>
        <B
          label="Italic"
          active={editor.isActive("italic")}
          on={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic className="h-4 w-4" />
        </B>
        <B
          label="Bullet list"
          active={editor.isActive("bulletList")}
          on={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List className="h-4 w-4" />
        </B>
        <B
          label="Numbered list"
          active={editor.isActive("orderedList")}
          on={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered className="h-4 w-4" />
        </B>
        <B
          label="Quote"
          active={editor.isActive("blockquote")}
          on={() => editor.chain().focus().toggleBlockquote().run()}
        >
          <Quote className="h-4 w-4" />
        </B>
        <B
          label="Link"
          active={editor.isActive("link")}
          on={() => {
            const url = prompt(
              "Link URL",
              editor.getAttributes("link")["href"] ?? "https://",
            );
            if (url === null) return;
            if (!url) editor.chain().focus().unsetLink().run();
            else if (/^https?:\/\//.test(url))
              editor
                .chain()
                .focus()
                .extendMarkRange("link")
                .setLink({ href: url })
                .run();
          }}
        >
          <Link2 className="h-4 w-4" />
        </B>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
