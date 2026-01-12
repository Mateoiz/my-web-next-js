"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import ImageExtension from "@tiptap/extension-image";
import { 
  Bold, Italic, Strikethrough, List, ListOrdered, 
  Quote, Heading1, Heading2, Undo, Redo, Image as ImageIcon 
} from "lucide-react";

// --- 1. INTERFACE DEFINITION ---
interface TiptapEditorProps {
  content: string;
  onChange: (content: string) => void;
}

// --- 2. TOOLBAR COMPONENT ---
const MenuBar = ({ editor }: { editor: any }) => {
  if (!editor) {
    return null;
  }

  // Helper to check active state for styling
  const isActive = (type: string, opts?: any) => 
    editor.isActive(type, opts) 
      ? "bg-green-600 text-white shadow-[0_0_10px_rgba(34,197,94,0.5)]" 
      : "bg-transparent text-zinc-400 hover:bg-zinc-800 hover:text-white";

  // Generic Button Style
  const btnClass = "p-2 rounded-lg transition-all duration-200";

  const addImage = () => {
    const url = window.prompt("Enter the URL of the image:");
    if (url) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  };

  return (
    <div className="flex flex-wrap gap-1 p-2 bg-zinc-900/50 border-b border-zinc-800 mb-4 sticky top-0 z-10 backdrop-blur-md">
      
      {/* TEXT FORMATTING */}
      <button onClick={() => editor.chain().focus().toggleBold().run()} className={`${btnClass} ${isActive("bold")}`} title="Bold">
        <Bold className="w-4 h-4" />
      </button>
      
      <button onClick={() => editor.chain().focus().toggleItalic().run()} className={`${btnClass} ${isActive("italic")}`} title="Italic">
        <Italic className="w-4 h-4" />
      </button>

      <button onClick={() => editor.chain().focus().toggleStrike().run()} className={`${btnClass} ${isActive("strike")}`} title="Strikethrough">
        <Strikethrough className="w-4 h-4" />
      </button>

      {/* HEADINGS */}
      <div className="w-px h-6 bg-zinc-700 mx-1 self-center" /> 

      <button onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} className={`${btnClass} ${isActive("heading", { level: 1 })}`} title="Heading 1">
        <Heading1 className="w-4 h-4" />
      </button>

      <button onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={`${btnClass} ${isActive("heading", { level: 2 })}`} title="Heading 2">
        <Heading2 className="w-4 h-4" />
      </button>

      {/* LISTS */}
      <div className="w-px h-6 bg-zinc-700 mx-1 self-center" /> 

      <button onClick={() => editor.chain().focus().toggleBulletList().run()} className={`${btnClass} ${isActive("bulletList")}`} title="Bullet List">
        <List className="w-4 h-4" />
      </button>

      <button onClick={() => editor.chain().focus().toggleOrderedList().run()} className={`${btnClass} ${isActive("orderedList")}`} title="Ordered List">
        <ListOrdered className="w-4 h-4" />
      </button>

      {/* EXTRAS */}
      <div className="w-px h-6 bg-zinc-700 mx-1 self-center" /> 

      <button onClick={() => editor.chain().focus().toggleBlockquote().run()} className={`${btnClass} ${isActive("blockquote")}`} title="Quote">
        <Quote className="w-4 h-4" />
      </button>

      <button onClick={addImage} className={`${btnClass} hover:bg-zinc-800 text-zinc-400`} title="Insert Image URL">
        <ImageIcon className="w-4 h-4" />
      </button>

      {/* HISTORY */}
      <div className="flex-grow" /> 

      <button onClick={() => editor.chain().focus().undo().run()} className={`${btnClass} text-zinc-500 hover:text-white`}>
        <Undo className="w-4 h-4" />
      </button>
      
      <button onClick={() => editor.chain().focus().redo().run()} className={`${btnClass} text-zinc-500 hover:text-white`}>
        <Redo className="w-4 h-4" />
      </button>

    </div>
  );
};

// --- 3. MAIN EDITOR COMPONENT ---
export const TiptapEditor = ({ content, onChange }: TiptapEditorProps) => {
  const editor = useEditor({
    extensions: [
      StarterKit,
      ImageExtension,
    ],
    content: content,
    
    // ✅ ADD THIS LINE TO FIX THE ERROR:
    immediatelyRender: false, 

    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: "prose prose-invert max-w-none focus:outline-none min-h-[300px] px-4",
      },
    },
  });

  return (
    <div className="w-full h-full flex flex-col">
      <MenuBar editor={editor} />
      <div className="overflow-y-auto flex-1 custom-scrollbar">
        <EditorContent editor={editor} />
      </div>
      
      {/* Global Style overrides for Tiptap internal elements */}
      <style jsx global>{`
        .ProseMirror p { margin-bottom: 1em; }
        .ProseMirror h1 { font-size: 2em; font-weight: bold; margin-top: 1em; color: white; }
        .ProseMirror h2 { font-size: 1.5em; font-weight: bold; margin-top: 1em; color: #d4d4d8; }
        .ProseMirror ul { list-style-type: disc; padding-left: 1.5em; }
        .ProseMirror ol { list-style-type: decimal; padding-left: 1.5em; }
        .ProseMirror blockquote { border-left: 4px solid #22c55e; padding-left: 1em; font-style: italic; color: #a1a1aa; }
        .ProseMirror img { max-width: 100%; border-radius: 8px; border: 1px solid #3f3f46; }
      `}</style>
    </div>
  );
};