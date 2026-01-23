'use client';

import { useMemo } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Youtube from '@tiptap/extension-youtube';

interface BlockRendererProps {
    content: any;
}

export function BlockRenderer({ content }: BlockRendererProps) {
    const extensions = useMemo(() => [
        StarterKit.configure({
            // Disable StarterKit's built-in link to use our custom one
            link: false,
        }),
        Image.configure({
            HTMLAttributes: {
                class: 'rounded-lg border border-border max-w-full h-auto mx-auto',
            },
        }),
        Link.configure({
            HTMLAttributes: {
                class: 'text-accent hover:underline',
            },
        }),
        Youtube.configure({
            nocookie: true,
            HTMLAttributes: {
                class: 'rounded-lg overflow-hidden border border-border aspect-video w-full',
            },
        }),
    ], []);

    const editor = useEditor({
        editable: false,
        extensions,
        immediatelyRender: false,
        content: content || '',
        editorProps: {
            attributes: {
                class: 'prose prose-lg dark:prose-invert max-w-none focus:outline-none',
            },
        },
    });

    if (!editor) return null;

    return <EditorContent editor={editor} />;
}
