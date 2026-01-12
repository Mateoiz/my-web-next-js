"use client";

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import { FaBold, FaItalic, FaUnderline, FaListUl, FaListOl, FaQuoteRight, FaUndo, FaRedo } from 'react-icons/fa';

// --- TOOLBAR BUTTON COMPONENT ---
const ToolbarButton = ({ onClick, isActive, icon }: { onClick: () => void, isActive: boolean, icon: React.ReactNode }) => (
  <button
    onClick={(e) => { e.preventDefault(); onClick(); }}
    className={`p-2 rounded flex items-center justify-center transition-colors ${
      isActive 
        ? 'text-green-600 bg-green-100 dark:bg-green-900/30' 
        : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
    }`}
  >
    {icon}
  </button>
);

interface TiptapProps {
  content: string;
  onChange: (richText: string) => void;
}

export default function TiptapEditor({ content, onChange }: TiptapProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
    ],
    content: content,
    immediatelyRender: false, // <--- CRITICAL FIX for Next.js SSR errors
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose-base dark:prose-invert focus:outline-none max-w-none min-h-[300px] p-4 text-zinc-800 dark:text-zinc-200',
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  if (!editor) {
    return null;
  }

  return (
    <div className="w-full border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden bg-white dark:bg-zinc-900/50">
      {/* TOOLBAR */}
      <div className="flex flex-wrap gap-2 p-2 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900">
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          isActive={editor.isActive('bold')}
          icon={<FaBold />}
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          isActive={editor.isActive('italic')}
          icon={<FaItalic />}
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          isActive={editor.isActive('underline')}
          icon={<FaUnderline />}
        />
        <div className="w-px h-6 bg-zinc-300 dark:bg-zinc-700 mx-1 self-center" />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          isActive={editor.isActive('bulletList')}
          icon={<FaListUl />}
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          isActive={editor.isActive('orderedList')}
          icon={<FaListOl />}
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          isActive={editor.isActive('blockquote')}
          icon={<FaQuoteRight />}
        />
        <div className="w-px h-6 bg-zinc-300 dark:bg-zinc-700 mx-1 self-center" />
        <ToolbarButton
          onClick={() => editor.chain().focus().undo().run()}
          isActive={false}
          icon={<FaUndo />}
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().redo().run()}
          isActive={false}
          icon={<FaRedo />}
        />
      </div>

      {/* EDITOR AREA */}
      <EditorContent editor={editor} />
    </div>
  );
}