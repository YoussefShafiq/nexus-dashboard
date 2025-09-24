// src/components/TextEditor/Tiptap.jsx
import { EditorProvider, useCurrentEditor, BubbleMenu } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import {
    Bold, Italic, Strikethrough, List, ListOrdered,
    Heading1, Heading2, Heading3, Quote, Code,
    Undo, Redo, Code2, Minus, AlignLeft,
    AlignCenter, AlignRight
} from 'lucide-react';
import TextAlign from '@tiptap/extension-text-align';
import { useCallback } from 'react';
import './styles.scss';

const extensions = [
    StarterKit.configure({
        heading: {
            levels: [1, 2, 3],
        },
    }),
    TextAlign.configure({
        types: ['heading', 'paragraph'],
    }),
];

const MenuBar = () => {
    const { editor } = useCurrentEditor();

    if (!editor) {
        return null;
    }

    return (
        <div className="tiptap-toolbar single-line">
            <div className="toolbar-group">
                <button
                    onClick={(e) => { e.preventDefault(); editor.chain().focus().toggleBold().run() }}
                    disabled={!editor.can().chain().focus().toggleBold().run()}
                    className={editor.isActive('bold') ? 'is-active' : ''}
                    title="Bold"
                >
                    <Bold size={16} />
                </button>
                <button
                    onClick={(e) => { e.preventDefault(); editor.chain().focus().toggleItalic().run() }}
                    disabled={!editor.can().chain().focus().toggleItalic().run()}
                    className={editor.isActive('italic') ? 'is-active' : ''}
                    title="Italic"
                >
                    <Italic size={16} />
                </button>
                <button
                    onClick={(e) => { e.preventDefault(); editor.chain().focus().toggleStrike().run() }}
                    disabled={!editor.can().chain().focus().toggleStrike().run()}
                    className={editor.isActive('strike') ? 'is-active' : ''}
                    title="Strikethrough"
                >
                    <Strikethrough size={16} />
                </button>
            </div>

            <div className="toolbar-divider" />

            <div className="toolbar-group">
                <button
                    onClick={(e) => { e.preventDefault(); editor.chain().focus().toggleHeading({ level: 1 }).run() }}
                    className={editor.isActive('heading', { level: 1 }) ? 'is-active' : ''}
                    title="Heading 1"
                >
                    <Heading1 size={16} />
                </button>
                <button
                    onClick={(e) => { e.preventDefault(); editor.chain().focus().toggleHeading({ level: 2 }).run() }}
                    className={editor.isActive('heading', { level: 2 }) ? 'is-active' : ''}
                    title="Heading 2"
                >
                    <Heading2 size={16} />
                </button>
                <button
                    onClick={(e) => { e.preventDefault(); editor.chain().focus().toggleHeading({ level: 3 }).run() }}
                    className={editor.isActive('heading', { level: 3 }) ? 'is-active' : ''}
                    title="Heading 3"
                >
                    <Heading3 size={16} />
                </button>
            </div>

            <div className="toolbar-divider" />

            <div className="toolbar-group">
                <button
                    onClick={(e) => { e.preventDefault(); editor.chain().focus().toggleBulletList().run() }}
                    className={editor.isActive('bulletList') ? 'is-active' : ''}
                    title="Bullet List"
                >
                    <List size={16} />
                </button>
                <button
                    onClick={(e) => { e.preventDefault(); editor.chain().focus().toggleOrderedList().run() }}
                    className={editor.isActive('orderedList') ? 'is-active' : ''}
                    title="Numbered List"
                >
                    <ListOrdered size={16} />
                </button>
            </div>

            <div className="toolbar-divider" />

            <div className="toolbar-group">
                <button
                    onClick={(e) => { e.preventDefault(); editor.chain().focus().toggleBlockquote().run() }}
                    className={editor.isActive('blockquote') ? 'is-active' : ''}
                    title="Blockquote"
                >
                    <Quote size={16} />
                </button>
                <button
                    onClick={(e) => { e.preventDefault(); editor.chain().focus().toggleCodeBlock().run() }}
                    className={editor.isActive('codeBlock') ? 'is-active' : ''}
                    title="Code Block"
                >
                    <Code2 size={16} />
                </button>
                <button
                    onClick={(e) => { e.preventDefault(); editor.chain().focus().setHorizontalRule().run() }}
                    title="Horizontal Rule"
                >
                    <Minus size={16} />
                </button>
            </div>

            <div className="toolbar-divider" />

            <div className="toolbar-group">
                <button
                    onClick={(e) => { e.preventDefault(); editor.chain().focus().setTextAlign('left').run() }}
                    className={editor.isActive({ textAlign: 'left' }) ? 'is-active' : ''}
                    title="Align Left"
                >
                    <AlignLeft size={16} />
                </button>
                <button
                    onClick={(e) => { e.preventDefault(); editor.chain().focus().setTextAlign('center').run() }}
                    className={editor.isActive({ textAlign: 'center' }) ? 'is-active' : ''}
                    title="Align Center"
                >
                    <AlignCenter size={16} />
                </button>
                <button
                    onClick={(e) => { e.preventDefault(); editor.chain().focus().setTextAlign('right').run() }}
                    className={editor.isActive({ textAlign: 'right' }) ? 'is-active' : ''}
                    title="Align Right"
                >
                    <AlignRight size={16} />
                </button>
            </div>

            <div className="toolbar-divider" />

            <div className="toolbar-group">
                <button
                    onClick={(e) => { e.preventDefault(); editor.chain().focus().undo().run() }}
                    disabled={!editor.can().undo()}
                    title="Undo"
                >
                    <Undo size={16} />
                </button>
                <button
                    onClick={(e) => { e.preventDefault(); editor.chain().focus().redo().run() }}
                    disabled={!editor.can().redo()}
                    title="Redo"
                >
                    <Redo size={16} />
                </button>
            </div>
        </div>
    );
};

const CustomBubbleMenu = () => {
    const { editor } = useCurrentEditor();

    if (!editor) {
        return null;
    }

    return (
        <BubbleMenu editor={editor} tippyOptions={{ duration: 100 }}>
            <div className="bubble-menu">
                <button
                    onClick={(e) => { e.preventDefault(); editor.chain().focus().toggleBold().run() }}
                    className={editor.isActive('bold') ? 'is-active' : ''}
                >
                    <Bold size={16} />
                </button>
                <button
                    onClick={(e) => { e.preventDefault(); editor.chain().focus().toggleItalic().run() }}
                    className={editor.isActive('italic') ? 'is-active' : ''}
                >
                    <Italic size={16} />
                </button>
                <button
                    onClick={(e) => { e.preventDefault(); editor.chain().focus().toggleHeading({ level: 1 }).run() }}
                    className={editor.isActive('heading', { level: 1 }) ? 'is-active' : ''}
                >
                    H1
                </button>
                <button
                    onClick={(e) => { e.preventDefault(); editor.chain().focus().toggleHeading({ level: 2 }).run() }}
                    className={editor.isActive('heading', { level: 2 }) ? 'is-active' : ''}
                    title="Heading 2"
                >
                    <Heading2 size={16} />
                </button>
                <button
                    onClick={(e) => { e.preventDefault(); editor.chain().focus().toggleHeading({ level: 3 }).run() }}
                    className={editor.isActive('heading', { level: 3 }) ? 'is-active' : ''}
                    title="Heading 3"
                >
                    <Heading3 size={16} />
                </button>
                <button
                    onClick={(e) => { e.preventDefault(); editor.chain().focus().toggleBulletList().run() }}
                    className={editor.isActive('bulletList') ? 'is-active' : ''}
                    title="Bullet List"
                >
                    <List size={16} />
                </button>
                <button
                    onClick={(e) => { e.preventDefault(); editor.chain().focus().toggleOrderedList().run() }}
                    className={editor.isActive('orderedList') ? 'is-active' : ''}
                    title="Numbered List"
                >
                    <ListOrdered size={16} />
                </button>
            </div>
        </BubbleMenu>
    );
};

const Tiptap = ({ content = '', onUpdate }) => {
    const handleUpdate = useCallback(({ editor }) => {
        if (onUpdate) {
            const html = editor.getHTML();
            onUpdate(html);
        }
    }, [onUpdate]);

    return (
        <div className="tiptap-container">
            <EditorProvider
                extensions={extensions}
                content={content}
                onUpdate={handleUpdate}
            >
                <MenuBar />
                <CustomBubbleMenu />
            </EditorProvider>
        </div>
    );
};

export default Tiptap;