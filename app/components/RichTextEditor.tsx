"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import { 
  FaBold, FaItalic, FaUnderline, FaStrikethrough, 
  FaListUl, FaListOl, FaQuoteRight, FaHeading, FaUndo, FaRedo 
} from "react-icons/fa";
import { useEffect } from "react";

interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
}

const RichTextEditor = ({ content, onChange }: RichTextEditorProps) => {
  const editor = useEditor({
    extensions: [StarterKit, Underline],
    content: content,
    // ✅ FIX: This tells Tiptap to wait for the client (browser) before rendering
    immediatelyRender: false, 
    editorProps: {
      attributes: {
        class: "prose prose-sm sm:prose-base dark:prose-invert focus:outline-none max-w-none min-h-[200px] px-4 py-3 text-zinc-700 dark:text-zinc-300",
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  // Optional: Update editor content if external 'content' prop changes programmatically
  useEffect(() => {
    if (editor && content && editor.getHTML() !== content) {
       editor.commands.setContent(content);
    }
  }, [content, editor]);

  if (!editor) return null;

  const getButtonClass = (isActive: boolean) => 
    `p-2 rounded-md transition-colors text-sm ${
      isActive 
        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 font-bold" 
        : "text-zinc-500 hover:text-green-600 dark:text-zinc-400 dark:hover:text-green-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
    }`;

  return (
    <div className="w-full border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden bg-white/50 dark:bg-zinc-900/50 backdrop-blur-sm focus-within:border-green-500/50 transition-colors shadow-sm">
      
      {/* TOOLBAR */}
      <div className="flex flex-wrap items-center gap-1 p-2 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-black/20">
        
        <button
          onClick={(e) => { e.preventDefault(); editor.chain().focus().toggleBold().run(); }}
          className={getButtonClass(editor.isActive("bold"))}
          title="Bold"
        >
          <FaBold />
        </button>
        
        <button
          onClick={(e) => { e.preventDefault(); editor.chain().focus().toggleItalic().run(); }}
          className={getButtonClass(editor.isActive("italic"))}
          title="Italic"
        >
          <FaItalic />
        </button>

        <button
          onClick={(e) => { e.preventDefault(); editor.chain().focus().toggleUnderline().run(); }}
          className={getButtonClass(editor.isActive("underline"))}
          title="Underline"
        >
          <FaUnderline />
        </button>

        <button
          onClick={(e) => { e.preventDefault(); editor.chain().focus().toggleStrike().run(); }}
          className={getButtonClass(editor.isActive("strike"))}
          title="Strikethrough"
        >
          <FaStrikethrough />
        </button>

        <div className="w-px h-4 bg-zinc-300 dark:bg-zinc-700 mx-1" />

        <button
          onClick={(e) => { e.preventDefault(); editor.chain().focus().toggleHeading({ level: 2 }).run(); }}
          className={getButtonClass(editor.isActive("heading", { level: 2 }))}
          title="Heading"
        >
          <FaHeading />
        </button>

        <button
          onClick={(e) => { e.preventDefault(); editor.chain().focus().toggleBulletList().run(); }}
          className={getButtonClass(editor.isActive("bulletList"))}
          title="Bullet List"
        >
          <FaListUl />
        </button>

        <button
          onClick={(e) => { e.preventDefault(); editor.chain().focus().toggleOrderedList().run(); }}
          className={getButtonClass(editor.isActive("orderedList"))}
          title="Ordered List"
        >
          <FaListOl />
        </button>

        <button
          onClick={(e) => { e.preventDefault(); editor.chain().focus().toggleBlockquote().run(); }}
          className={getButtonClass(editor.isActive("blockquote"))}
          title="Quote"
        >
          <FaQuoteRight />
        </button>

        <div className="flex-grow" />

        <button
          onClick={(e) => { e.preventDefault(); editor.chain().focus().undo().run(); }}
          className={getButtonClass(false)}
          title="Undo"
        >
          <FaUndo />
        </button>
        
        <button
          onClick={(e) => { e.preventDefault(); editor.chain().focus().redo().run(); }}
          className={getButtonClass(false)}
          title="Redo"
        >
          <FaRedo />
        </button>

      </div>

      <EditorContent editor={editor} />
    </div>
  );
};

export default RichTextEditor;