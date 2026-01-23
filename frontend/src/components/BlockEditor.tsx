'use client';

import { useMemo } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import Youtube from '@tiptap/extension-youtube';
import {
    Bold, Italic, List, ListOrdered, Image as ImageIcon,
    Link as LinkIcon, Heading1, Heading2, Quote, Youtube as YoutubeIcon,
    Undo, Redo
} from 'lucide-react';
import { useTranslations } from 'next-intl';

interface BlockEditorProps {
    content: any;
    onChange: (json: any) => void;
    placeholder?: string;
}

export function BlockEditor({ content, onChange, placeholder }: BlockEditorProps) {
    const t = useTranslations('BlockEditor');
    const extensions = useMemo(() => [
        StarterKit.configure({
            // Disable StarterKit's built-in link to use our custom one
            link: false,
        }),
        Image.configure({
            allowBase64: true,
            HTMLAttributes: {
                class: 'rounded-lg border border-border max-w-full h-auto',
            },
        }),
        Link.configure({
            openOnClick: false,
            HTMLAttributes: {
                class: 'text-accent hover:underline cursor-pointer',
            },
        }),
        Placeholder.configure({
            placeholder,
        }),
        Youtube.configure({
            controls: false,
            nocookie: true,
            HTMLAttributes: {
                class: 'rounded-lg overflow-hidden border border-border aspect-video w-full',
            },
        }),
    ], [placeholder]);

    const editor = useEditor({
        extensions,
        content: content || '',
        onUpdate: ({ editor }) => {
            onChange(editor.getJSON());
        },
        immediatelyRender: false,
        editorProps: {
            attributes: {
                class: 'prose prose-lg dark:prose-invert max-w-none focus:outline-none min-h-[400px] p-4',
            },
        },
    });

    if (!editor) return null;

    const addImage = () => {
        const url = window.prompt(t('imageUrlPrompt'));
        if (url) {
            editor.chain().focus().setImage({ src: url }).run();
        }
    };

    const addYoutubeVideo = () => {
        const url = window.prompt(t('youtubeUrlPrompt'));
        if (url) {
            editor.commands.setYoutubeVideo({ src: url });
        }
    };

    const setLink = () => {
        const previousUrl = editor.getAttributes('link').href;
        const url = window.prompt(t('linkUrlPrompt'), previousUrl);
        if (url === null) return;
        if (url === '') {
            editor.chain().focus().extendMarkRange('link').unsetLink().run();
            return;
        }
        editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
    };

    return (
        <div className="border border-border rounded-lg overflow-hidden bg-card transition-all duration-300 focus-within:ring-2 focus-within:ring-accent focus-within:border-transparent">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-1 p-2 border-bottom border-border bg-muted/30">
                <button
                    onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                    className={`p-2 rounded hover:bg-muted transition-colors ${editor.isActive('heading', { level: 1 }) ? 'bg-muted text-accent' : ''}`}
                    title={t('h1')}
                >
                    <Heading1 size={20} />
                </button>
                <button
                    onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                    className={`p-2 rounded hover:bg-muted transition-colors ${editor.isActive('heading', { level: 2 }) ? 'bg-muted text-accent' : ''}`}
                    title={t('h2')}
                >
                    <Heading2 size={20} />
                </button>
                <div className="w-px h-6 bg-border mx-1" />
                <button
                    onClick={() => editor.chain().focus().toggleBold().run()}
                    className={`p-2 rounded hover:bg-muted transition-colors ${editor.isActive('bold') ? 'bg-muted text-accent' : ''}`}
                    title={t('bold')}
                >
                    <Bold size={20} />
                </button>
                <button
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                    className={`p-2 rounded hover:bg-muted transition-colors ${editor.isActive('italic') ? 'bg-muted text-accent' : ''}`}
                    title={t('italic')}
                >
                    <Italic size={20} />
                </button>
                <div className="w-px h-6 bg-border mx-1" />
                <button
                    onClick={() => editor.chain().focus().toggleBulletList().run()}
                    className={`p-2 rounded hover:bg-muted transition-colors ${editor.isActive('bulletList') ? 'bg-muted text-accent' : ''}`}
                    title={t('bulletList')}
                >
                    <List size={20} />
                </button>
                <button
                    onClick={() => editor.chain().focus().toggleOrderedList().run()}
                    className={`p-2 rounded hover:bg-muted transition-colors ${editor.isActive('orderedList') ? 'bg-muted text-accent' : ''}`}
                    title={t('orderedList')}
                >
                    <ListOrdered size={20} />
                </button>
                <button
                    onClick={() => editor.chain().focus().toggleBlockquote().run()}
                    className={`p-2 rounded hover:bg-muted transition-colors ${editor.isActive('blockquote') ? 'bg-muted text-accent' : ''}`}
                    title={t('quote')}
                >
                    <Quote size={20} />
                </button>
                <div className="w-px h-6 bg-border mx-1" />
                <button
                    onClick={setLink}
                    className={`p-2 rounded hover:bg-muted transition-colors ${editor.isActive('link') ? 'bg-muted text-accent' : ''}`}
                    title={t('link')}
                >
                    <LinkIcon size={20} />
                </button>
                <button
                    onClick={addImage}
                    className="p-2 rounded hover:bg-muted transition-colors"
                    title={t('image')}
                >
                    <ImageIcon size={20} />
                </button>
                <button
                    onClick={addYoutubeVideo}
                    className="p-2 rounded hover:bg-muted transition-colors"
                    title={t('youtube')}
                >
                    <YoutubeIcon size={20} />
                </button>
                <div className="flex-grow" />
                <button
                    onClick={() => editor.chain().focus().undo().run()}
                    disabled={!editor.can().undo()}
                    className="p-2 rounded hover:bg-muted transition-colors disabled:opacity-30"
                    title={t('undo')}
                >
                    <Undo size={20} />
                </button>
                <button
                    onClick={() => editor.chain().focus().redo().run()}
                    disabled={!editor.can().redo()}
                    className="p-2 rounded hover:bg-muted transition-colors disabled:opacity-30"
                    title={t('redo')}
                >
                    <Redo size={20} />
                </button>
            </div>

            {/* Editor Content */}
            <EditorContent editor={editor} className="bg-background min-h-[400px]" />

            <style jsx global>{`
        .tiptap p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: var(--muted-foreground);
          pointer-events: none;
          height: 0;
        }
      `}</style>
        </div>
    );
}
