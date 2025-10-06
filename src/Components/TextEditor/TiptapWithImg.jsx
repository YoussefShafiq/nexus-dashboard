import { EditorProvider, useCurrentEditor, BubbleMenu, Extension } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { mergeAttributes, Node, Mark } from '@tiptap/core';
import {
    Bold, Italic, Underline as UnderlineIcon, Strikethrough, Link, Image, Code, List, ListOrdered,
    AlignLeft, AlignCenter, AlignRight, AlignJustify, Quote, Minus, Highlighter, Type,
    InfoIcon, Table, Table2, ChevronDown, Plus, Trash2, Merge, Split,
    Heading1, Heading2, Heading3, Heading4, Heading5, Heading6,
    Check,
    X,
    Code2,
    ImageIcon,
    Undo,
    Redo,
    Unlink,
    Video,
    Youtube,
    Calendar
} from 'lucide-react';
import TextAlign from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';
import ImageExtension from '@tiptap/extension-image';
import LinkExtension from '@tiptap/extension-link';
import { Table as TableExtension } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell as TableCellExtension } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';

// Custom TableCell extension with resizing support
const TableCell = TableCellExtension.extend({
    addAttributes() {
        return {
            ...this.parent?.(),
            style: {
                default: null,
                parseHTML: element => element.getAttribute('style'),
                renderHTML: attributes => {
                    return {
                        style: attributes.style,
                    };
                },
            },
            'data-colwidth': {
                default: null,
                parseHTML: element => element.getAttribute('data-colwidth'),
                renderHTML: attributes => ({
                    'data-colwidth': attributes['data-colwidth'],
                }),
            },
            'data-colindex': {
                default: null,
                parseHTML: element => element.getAttribute('data-colindex'),
                renderHTML: attributes => ({
                    'data-colindex': attributes['data-colindex'],
                }),
            },
        };
    },
    renderHTML({ node, HTMLAttributes }) {
        const attrs = {
            ...HTMLAttributes,
            class: 'tiptap-table-cell',
            'data-colwidth': node.attrs.colwidth ? node.attrs.colwidth.join(',') : null,
            'data-colindex': node.attrs['data-colindex'] || null,
        };

        return ['td', attrs, 0];
    },
    addNodeView() {
        return ({ node, getPos, editor }) => {
            const { view } = editor;
            const cell = document.createElement('td');
            const content = document.createElement('div');
            const resizeHandle = document.createElement('div');

            // Add content
            content.contentEditable = 'true';
            cell.appendChild(content);

            // Add resize handle
            resizeHandle.classList.add('column-resize-handle');
            cell.appendChild(resizeHandle);

            // Store the column index
            const colIndex = Array.from(cell.parentElement?.children || []).indexOf(cell);
            if (colIndex !== -1) {
                cell.setAttribute('data-colindex', colIndex);
            }

            // Handle resizing
            let startX, startWidth, isResizing = false;

            const onMouseDown = (e) => {
                if (e.button !== 0) return; // Only left click
                e.preventDefault();
                e.stopPropagation();

                isResizing = true;
                startX = e.clientX;
                startWidth = cell.offsetWidth;

                document.addEventListener('mousemove', onMouseMove);
                document.addEventListener('mouseup', onMouseUp);

                document.body.style.cursor = 'col-resize';
                document.body.style.userSelect = 'none';
                resizeHandle.classList.add('is-resizing');
            };

            const onMouseMove = (e) => {
                if (!isResizing) return;

                const dx = e.clientX - startX;
                const newWidth = Math.max(50, startWidth + dx);

                // Update all cells in the column
                const table = cell.closest('table');
                if (table) {
                    const colIndex = Array.from(cell.parentElement.children).indexOf(cell);
                    const rows = table.querySelectorAll('tr');

                    rows.forEach(row => {
                        const cells = row.querySelectorAll('td, th');
                        if (cells[colIndex]) {
                            cells[colIndex].style.width = `${newWidth}px`;
                            cells[colIndex].style.minWidth = `${newWidth}px`;
                        }
                    });
                }
            };

            const onMouseUp = () => {
                if (!isResizing) return;

                isResizing = false;
                document.body.style.cursor = '';
                document.body.style.userSelect = '';
                resizeHandle.classList.remove('is-resizing');

                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);

                // Update the column width in the editor state
                if (typeof getPos === 'function') {
                    const pos = getPos();
                    const colIndex = Array.from(cell.parentElement.children).indexOf(cell);
                    const width = cell.offsetWidth;

                    // Update all cells in the column
                    const transaction = view.state.tr;
                    const $pos = view.state.doc.resolve(pos);
                    const table = $pos.node(-1);
                    const tablePos = $pos.start(-1);

                    table.descendants((node, pos) => {
                        if (node.type.name === 'tableCell' || node.type.name === 'tableHeader') {
                            const cellColIndex = node.attrs.colspan > 1 ?
                                pos - 1 : // Handle merged cells
                                (node.attrs['data-colindex'] || 0);

                            if (cellColIndex === colIndex) {
                                transaction.setNodeMarkup(
                                    tablePos + pos,
                                    null,
                                    {
                                        ...node.attrs,
                                        style: `width: ${width}px; min-width: ${width}px;`,
                                        'data-colindex': colIndex,
                                    }
                                );
                            }
                        }
                    });

                    if (transaction.steps.length > 0) {
                        view.dispatch(transaction);
                    }
                }
            };

            // Add event listeners
            resizeHandle.addEventListener('mousedown', onMouseDown);

            return {
                dom: cell,
                contentDOM: content,
                destroy: () => {
                    resizeHandle.removeEventListener('mousedown', onMouseDown);
                    document.removeEventListener('mousemove', onMouseMove);
                    document.removeEventListener('mouseup', onMouseUp);
                },
            };
        };
    },
});
import { useCallback, useRef, useState, useEffect } from 'react';
import axios from 'axios';
import './styles.scss';

// Utility function to generate slug from text
const generateSlug = (text) => {
    return text
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '') // Remove special characters
        .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
        .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
};

// Custom heading extension with auto-generated IDs
import { Heading } from '@tiptap/extension-heading';
import toast from 'react-hot-toast';

const HeadingWithId = Heading.extend({
    addAttributes() {
        return {
            ...this.parent?.(),
            id: {
                default: null,
                parseHTML: element => element.getAttribute('id'),
                renderHTML: attributes => {
                    if (!attributes.id) {
                        return {};
                    }
                    return {
                        id: attributes.id,
                    };
                },
            },
        };
    },

    addCommands() {
        return {
            ...this.parent?.(),
            setHeadingWithId: (attributes) => ({ commands }) => {
                return commands.setNode(this.name, attributes);
            },
        };
    },
});

// Custom image extension with alt text, title, and content support
const CustomImageExtension = ImageExtension.extend({
    addAttributes() {
        return {
            ...this.parent?.(),
            alt: {
                default: '',
                parseHTML: element => element.getAttribute('alt'),
                renderHTML: attributes => {
                    if (!attributes.alt) {
                        return {};
                    }
                    return {
                        alt: attributes.alt,
                    };
                },
            },
            title: {
                default: '',
                parseHTML: element => element.getAttribute('title'),
                renderHTML: attributes => {
                    if (!attributes.title) {
                        return {};
                    }
                    return {
                        title: attributes.title,
                    };
                },
            },
            content: {
                default: '',
                parseHTML: element => element.getAttribute('data-content'),
                renderHTML: attributes => {
                    if (!attributes.content) {
                        return {};
                    }
                    return {
                        'data-content': attributes.content,
                    };
                },
            },
        };
    },
});

// Custom paragraph extension to handle info-box class
const CustomParagraph = {
    name: 'paragraph',
    group: 'block',
    content: 'inline*',
    parseHTML() {
        return [
            {
                tag: 'p',
                getAttrs: node => ({
                    class: node.classList.contains('info-box') ? 'info-box' : ''
                })
            }
        ];
    },
    renderHTML({ HTMLAttributes }) {
        return ['p', HTMLAttributes, 0];
    },
    addCommands() {
        return {
            setInfoBox:
                () =>
                    ({ commands }) => {
                        return commands.setNode('paragraph', { class: 'info-box' });
                    },
        };
    },
};

// Custom InfoBox extension
const InfoBox = Node.create({
    name: 'infoBox',
    group: 'block',
    content: 'inline*',
    defining: true,

    addAttributes() {
        return {
            class: {
                default: 'info-box',
            },
        };
    },

    parseHTML() {
        return [
            {
                tag: 'div[class*="info-box"]',
            },
        ];
    },

    renderHTML({ HTMLAttributes }) {
        return ['div', mergeAttributes(HTMLAttributes, { class: 'info-box' }), 0];
    },

    addCommands() {
        return {
            setInfoBox:
                () =>
                    ({ commands }) => {
                        return commands.setNode('infoBox');
                    },
        };
    },
});

// Custom Dynamic Date mark extension to wrap selected text with <span class="dynamic-date">...</span>
const DynamicDate = Mark.create({
    name: 'dynamicDate',

    inclusive() {
        return false;
    },

    parseHTML() {
        return [
            {
                tag: 'span.dynamic-date',
            },
        ];
    },

    renderHTML() {
        return ['span', { class: 'dynamic-date' }, 0];
    },

    addCommands() {
        return {
            toggleDynamicDate:
                () =>
                    ({ commands }) => {
                        return commands.toggleMark(this.name);
                    },
        };
    },
});

// Custom Video extension
const VideoExtension = Node.create({
    name: 'video',
    group: 'block',
    atom: true,
    inline: false,

    addAttributes() {
        return {
            src: {
                default: null,
            },
            alt: {
                default: '',
            },
            title: {
                default: '',
            },
            description: {
                default: '',
            },
            type: {
                default: 'local', // 'local' or 'youtube'
            },
            youtubeId: {
                default: null,
            },
            width: {
                default: '100%',
            },
            height: {
                default: 'auto',
            },
        };
    },

    parseHTML() {
        return [
            {
                tag: 'video',
                getAttrs: node => ({
                    src: node.getAttribute('src'),
                    alt: node.getAttribute('alt'),
                    title: node.getAttribute('title'),
                    description: node.getAttribute('data-description'),
                    type: node.getAttribute('data-type') || 'local',
                    youtubeId: node.getAttribute('data-youtube-id'),
                    width: node.getAttribute('width') || '100%',
                    height: node.getAttribute('height') || 'auto',
                }),
            },
            {
                tag: 'div[data-video]',
                getAttrs: node => ({
                    src: node.getAttribute('data-src'),
                    alt: node.getAttribute('data-alt'),
                    title: node.getAttribute('data-title'),
                    description: node.getAttribute('data-description'),
                    type: node.getAttribute('data-type') || 'local',
                    youtubeId: node.getAttribute('data-youtube-id'),
                    width: node.getAttribute('width') || '100%',
                    height: node.getAttribute('height') || 'auto',
                }),
            },
        ];
    },

    renderHTML({ HTMLAttributes }) {
        const { src, alt, title, description, type, youtubeId, width, height } = HTMLAttributes;

        if (type === 'youtube' && youtubeId) {
            // Render YouTube embed
            return [
                'div',
                {
                    class: 'video-container youtube-video',
                    'data-video': true,
                    'data-type': 'youtube',
                    'data-youtube-id': youtubeId,
                    'data-alt': alt,
                    'data-title': title,
                    'data-description': description,
                    'data-width': width,
                    'data-height': height,
                },
                [
                    'iframe',
                    {
                        src: `https://www.youtube.com/embed/${youtubeId}`,
                        width: width,
                        height: height === 'auto' ? '315' : height,
                        frameborder: '0',
                        allow: 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture',
                        allowfullscreen: true,
                        title: title || alt,
                    },
                ],
            ];
        } else {
            // Render local video
            return [
                'video',
                {
                    src,
                    alt,
                    title,
                    'data-description': description,
                    'data-type': 'local',
                    width,
                    height,
                    controls: true,
                    preload: 'metadata',
                    class: 'help-center-video',
                },
            ];
        }
    },

    addCommands() {
        return {
            setVideo:
                (attributes) =>
                    ({ commands }) => {
                        return commands.insertContent({
                            type: this.name,
                            attrs: attributes,
                        });
                    },
        };
    },
});

// Custom YouTube Video extension
const YouTubeVideoExtension = Node.create({
    name: 'youtubeVideo',
    group: 'block',
    atom: true,
    inline: false,
    defining: true,
    content: '',

    addAttributes() {
        return {
            videoId: {
                default: null,
            },
            alt: {
                default: '',
            },
            title: {
                default: '',
            },
            description: {
                default: '',
            },
            width: {
                default: '100%',
            },
            height: {
                default: '400',
            },
        };
    },

    parseHTML() {
        return [
            {
                tag: 'div[data-youtube-video]',
                getAttrs: node => ({
                    videoId: node.getAttribute('data-video-id'),
                    alt: node.getAttribute('data-alt'),
                    title: node.getAttribute('data-title'),
                    description: node.getAttribute('data-description'),
                    width: node.getAttribute('data-width') || '100%',
                    height: node.getAttribute('data-height') || '400',
                }),
            },
        ];
    },

    renderHTML({ HTMLAttributes }) {
        const { videoId, alt, title, description, width, height } = HTMLAttributes;

        return [
            'div',
            {
                'data-youtube-video': true,
                'data-video-id': videoId,
                'data-alt': alt,
                'data-title': title,
                'data-description': description,
                'data-width': width,
                'data-height': height,
                class: 'youtube-video-container',
            },
            [
                'iframe',
                {
                    src: `https://www.youtube.com/embed/${videoId}`,
                    title: title || 'YouTube video player',
                    alt: alt,
                    width,
                    height,
                    frameborder: '0',
                    allow: 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share',
                    referrerPolicy: 'strict-origin-when-cross-origin',
                    allowfullscreen: true,
                    class: 'youtube-iframe',
                },
            ],
        ];
    },

    addCommands() {
        return {
            setYouTubeVideo:
                (attributes) =>
                    ({ commands }) => {
                        return commands.insertContent({
                            type: this.name,
                            attrs: attributes,
                        });
                    },
        };
    },
});

const extensions = [
    StarterKit.configure({
        heading: false, // Disable default heading
        paragraph: true, // Keep default paragraph
        blockquote: true, // Keep default blockquote
        codeBlock: true, // Keep code blocks
    }),
    InfoBox,
    HeadingWithId.configure({
        levels: [1, 2, 3, 4, 5, 6],
        HTMLAttributes: {
            class: 'heading-with-id',
        },
    }),
    TextAlign.configure({
        types: ['heading', 'paragraph'],
        alignments: ['left', 'center', 'right', 'justify'],
    }),
    Underline,
    DynamicDate,
    CustomImageExtension.configure({
        inline: true,
        allowBase64: false,
        HTMLAttributes: {
            class: 'help-center-image',
        },
    }),
    LinkExtension.configure({
        openOnClick: false,
        HTMLAttributes: {
            class: 'custom-link',
            rel: 'noopener noreferrer',
        },
    }),
    TableExtension.extend({
        content: 'tableRow+',
        tableRole: 'table',
        isolating: true,
        group: 'block',
        parseHTML() {
            return [{ tag: 'table' }];
        },
        renderHTML({ HTMLAttributes }) {
            return ['div', { class: 'table-wrapper' }, ['table', { ...HTMLAttributes, class: 'tiptap-table' }, ['tbody', 0]]];
        },
        addKeyboardShortcuts() {
            return {
                'Mod-Alt-0': () => this.editor.commands.insertTable({ rows: 3, cols: 3, withHeaderRow: true }),
            };
        },
    }).configure({
        resizable: true,
        lastColumnResizable: true,
        allowTableNodeSelection: true,
        HTMLAttributes: {
            class: 'tiptap-table',
        },
    }),
    TableRow,
    TableHeader,
    TableCell.configure({
        HTMLAttributes: {
            class: 'tiptap-table-cell',
        },
    }),
    VideoExtension,
    YouTubeVideoExtension,
];

const MenuBar = ({ uploadImgUrl = '', uploadVideoUrl = 'https://api.nexus.com/api/admin/blog-media/upload-video', processYoutubeUrl = 'https://api.nexus.com/api/admin/blog-media/process-youtube' }) => {
    const { editor } = useCurrentEditor();
    const fileInputRef = useRef(null);
    const videoFileInputRef = useRef(null);
    const [isUploading, setIsUploading] = useState(false);
    const [isVideoUploading, setIsVideoUploading] = useState(false);
    const [showLinkInput, setShowLinkInput] = useState(false);
    const [linkUrl, setLinkUrl] = useState('');
    const [showImageMetaInput, setShowImageMetaInput] = useState(false);
    const [imageAltText, setImageAltText] = useState('');
    const [imageTitle, setImageTitle] = useState('');
    const [imageContent, setImageContent] = useState('');
    const [currentImagePos, setCurrentImagePos] = useState(null);
    const [showVideoMetaInput, setShowVideoMetaInput] = useState(false);
    const [videoAltText, setVideoAltText] = useState('');
    const [videoTitle, setVideoTitle] = useState('');
    const [videoDescription, setVideoDescription] = useState('');
    const [currentVideoPos, setCurrentVideoPos] = useState(null);
    const [showYoutubeInput, setShowYoutubeInput] = useState(false);
    const [youtubeUrl, setYoutubeUrl] = useState('');
    const [showTableControls, setShowTableControls] = useState(false);
    const [tableRows, setTableRows] = useState(3);
    const [tableCols, setTableCols] = useState(3);
    const linkInputRef = useRef(null);
    const altInputRef = useRef(null);
    const videoAltInputRef = useRef(null);
    const youtubeInputRef = useRef(null);

    if (!editor) {
        return null;
    }

    const handleImageUpload = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        setIsUploading(true);
        try {
            const formData = new FormData();
            formData.append('image', file);

            const response = await axios.post(
                uploadImgUrl,
                formData,
                {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                        'Authorization': `Bearer ${localStorage.getItem('userToken')}`
                    },
                }
            );

            if (response.data.success && response.data.data?.url) {
                const src = response.data.data.url;
                editor.chain().focus().setImage({ src }).run();

                // After image is inserted, show meta input
                const { state } = editor;
                const { selection } = state;
                const pos = selection.$anchor.pos - 1; // Position of the inserted image

                setCurrentImagePos(pos);
                setImageAltText('');
                setImageTitle('');
                setImageContent('');
                setShowImageMetaInput(true);
                setTimeout(() => {
                    altInputRef.current?.focus();
                }, 100);
            } else {
                throw new Error('Invalid response format');
            }
        } catch (error) {
            console.error('Image upload failed:', error);
            toast.error('Failed to upload image. Please try again.');
        } finally {
            setIsUploading(false);
            event.target.value = '';
        }
    };

    const handleVideoUpload = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        // Check file size (100MB limit)
        if (file.size > 100 * 1024 * 1024) {
            toast.error('Video file size must be less than 100MB');
            return;
        }

        // Check file type
        const allowedTypes = ['video/mp4', 'video/mov', 'video/avi', 'video/wmv', 'video/webm'];
        if (!allowedTypes.includes(file.type)) {
            toast.error('Please select a valid video file (MP4, MOV, AVI, WMV, WebM)');
            return;
        }

        setIsVideoUploading(true);
        try {
            const formData = new FormData();
            formData.append('video', file);

            const response = await axios.post(
                uploadVideoUrl,
                formData,
                {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                        'Authorization': `Bearer ${localStorage.getItem('userToken')}`
                    },
                }
            );

            if (response.data.success && response.data.data?.url) {
                const src = response.data.data.url;
                editor.chain().focus().setVideo({ src, type: 'local' }).run();

                // After video is inserted, show meta input
                const { state } = editor;
                const { selection } = state;
                const pos = selection.$anchor.pos - 1; // Position of the inserted video

                setCurrentVideoPos(pos);
                setVideoAltText('');
                setVideoTitle('');
                setVideoDescription('');
                setShowVideoMetaInput(true);
                setTimeout(() => {
                    videoAltInputRef.current?.focus();
                }, 100);
            } else {
                throw new Error('Invalid response format');
            }
        } catch (error) {
            console.error('Video upload failed:', error);
            toast.error('Failed to upload video. Please try again.');
        } finally {
            setIsVideoUploading(false);
            event.target.value = '';
        }
    };

    const handleYoutubeSubmit = async (e) => {
        e.preventDefault();
        if (!youtubeUrl.trim()) {
            toast.error('Please enter a YouTube URL');
            return;
        }

        // Extract YouTube video ID from URL
        let youtubeId = null;
        const url = youtubeUrl.trim();

        // Handle different YouTube URL formats
        if (url.includes('youtube.com/watch?v=')) {
            youtubeId = url.split('v=')[1]?.split('&')[0];
        } else if (url.includes('youtu.be/')) {
            youtubeId = url.split('youtu.be/')[1]?.split('?')[0];
        } else if (url.includes('youtube.com/embed/')) {
            youtubeId = url.split('embed/')[1]?.split('?')[0];
        }

        if (!youtubeId) {
            toast.error('Invalid YouTube URL. Please enter a valid YouTube video URL.');
            return;
        }

        // Insert YouTube video using the YouTubeVideoExtension
        try {

            // Use the YouTubeVideoExtension to insert the YouTube video
            editor.chain().focus().setYouTubeVideo({
                videoId: youtubeId,
                alt: '',
                title: 'YouTube video player',
                description: '',
                width: '100%',
                height: '400'
            }).run();


            // Debug: check what was actually inserted
            setTimeout(() => {
                const currentContent = editor.getHTML();
            }, 100);

        } catch (error) {
            console.error('Error inserting YouTube video:', error);

            // Fallback: insert as a simple text placeholder
            editor.chain().focus().insertContent(`[YouTube Video: ${youtubeId}]`).run();
            toast.error('Failed to embed YouTube video. Please try again.');
        }

        // After YouTube video is inserted, show meta input
        const { state } = editor;
        const { selection } = state;
        const pos = selection.$anchor.pos - 1; // Position of the inserted iframe

        setCurrentVideoPos(pos);
        setVideoAltText('');
        setVideoTitle('');
        setVideoDescription('');
        setShowVideoMetaInput(true);
        setTimeout(() => {
            videoAltInputRef.current?.focus();
        }, 100);

        setYoutubeUrl('');
        setShowYoutubeInput(false);
    };

    const handleImageMetaSubmit = (e) => {
        e.preventDefault();
        if (!currentImagePos) return;

        const { state } = editor;
        const node = state.doc.nodeAt(currentImagePos);

        if (node && node.type.name === 'image') {
            editor
                .chain()
                .focus()
                .command(({ tr }) => {
                    const nodeAttrs = {
                        ...node.attrs,
                        alt: imageAltText,
                        title: imageTitle,
                        content: imageContent
                    };
                    tr.setNodeMarkup(currentImagePos, undefined, nodeAttrs);
                    return true;
                })
                .run();
        }

        setShowImageMetaInput(false);
        setImageAltText('');
        setImageTitle('');
        setImageContent('');
        setCurrentImagePos(null);
    };

    const handleVideoMetaSubmit = (e) => {
        e.preventDefault();
        if (!currentVideoPos) return;

        const { state } = editor;
        const node = state.doc.nodeAt(currentVideoPos);

        // Handle video nodes
        if (node && node.type.name === 'video') {
            editor
                .chain()
                .focus()
                .command(({ tr }) => {
                    const nodeAttrs = {
                        ...node.attrs,
                        alt: videoAltText,
                        title: videoTitle,
                        description: videoDescription
                    };
                    tr.setNodeMarkup(currentVideoPos, undefined, nodeAttrs);
                    return true;
                })
                .run();
        }

        // Handle YouTube video HTML content
        const currentContent = editor.getHTML();
        if (currentContent.includes('data-youtube-video')) {
            let updatedContent = currentContent;

            // Update YouTube video attributes
            updatedContent = updatedContent.replace(
                /<div([^>]*data-youtube-video[^>]*)>/g,
                (match, attributes) => {
                    // Remove existing data-alt, data-title, data-description attributes
                    let newAttributes = attributes
                        .replace(/data-alt="[^"]*"/g, '')
                        .replace(/data-title="[^"]*"/g, '')
                        .replace(/data-description="[^"]*"/g, '');

                    // Add new attributes
                    if (videoAltText) {
                        newAttributes += ` data-alt="${videoAltText}"`;
                    }
                    if (videoTitle) {
                        newAttributes += ` data-title="${videoTitle}"`;
                    }
                    if (videoDescription) {
                        newAttributes += ` data-description="${videoDescription}"`;
                    }

                    return `<div${newAttributes}>`;
                }
            );

            // Update editor content
            editor.commands.setContent(updatedContent);
        }

        setShowVideoMetaInput(false);
        setVideoAltText('');
        setVideoTitle('');
        setVideoDescription('');
        setCurrentVideoPos(null);
    };

    const handleVideoMetaCancel = () => {
        setShowVideoMetaInput(false);
        setVideoAltText('');
        setVideoTitle('');
        setVideoDescription('');
        setCurrentVideoPos(null);
        editor.chain().focus().run();
    };

    const handleImageMetaCancel = () => {
        setShowImageMetaInput(false);
        setImageAltText('');
        setImageTitle('');
        setImageContent('');
        setCurrentImagePos(null);
        editor.chain().focus().run();
    };

    const handleLinkClick = (e) => {
        e.preventDefault();

        const { from, to } = editor.state.selection;
        const selectedText = editor.state.doc.textBetween(from, to, ' ');

        if (selectedText.trim() === '') {
            toast.error('Please select some text first');
            return;
        }

        // If link is already active, get current URL
        if (editor.isActive('link')) {
            const currentUrl = editor.getAttributes('link').href || '';
            setLinkUrl(currentUrl);
        } else {
            setLinkUrl('');
        }

        setShowLinkInput(true);
        setTimeout(() => {
            linkInputRef.current?.focus();
        }, 100);
    };

    const handleLinkSubmit = (e) => {
        e.preventDefault();

        if (linkUrl.trim() === '') {
            setShowLinkInput(false);
            return;
        }

        // Add protocol if not present
        let finalUrl = linkUrl.trim();
        if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
            finalUrl = 'https://' + finalUrl;
        }

        editor.chain().focus().setLink({ href: finalUrl }).run();
        setShowLinkInput(false);
        setLinkUrl('');
    };

    const handleLinkCancel = () => {
        setShowLinkInput(false);
        setLinkUrl('');
        editor.chain().focus().run();
    };

    const handleUnlink = (e) => {
        e.preventDefault();
        editor.chain().focus().unsetLink().run();
    };

    const handleImageClick = (e) => {
        e.preventDefault();
        const { state } = editor;
        const { selection } = state;
        const node = state.doc.nodeAt(selection.from - 1);

        if (node && node.type.name === 'image') {
            setCurrentImagePos(selection.from - 1);
            setImageAltText(node.attrs.alt || '');
            setImageTitle(node.attrs.title || '');
            setImageContent(node.attrs.content || '');
            setShowImageMetaInput(true);
            setTimeout(() => {
                altInputRef.current?.focus();
            }, 100);
        }
    };

    const handleVideoClick = (e) => {
        e.preventDefault();
        const { state } = editor;
        const { selection } = state;
        const node = state.doc.nodeAt(selection.from - 1);

        // Handle video nodes
        if (node && node.type.name === 'video') {
            setCurrentVideoPos(selection.from - 1);
            setVideoAltText(node.attrs.alt || '');
            setVideoTitle(node.attrs.title || '');
            setVideoDescription(node.attrs.description || '');
            setShowVideoMetaInput(true);
            setTimeout(() => {
                videoAltInputRef.current?.focus();
            }, 100);
        }

        // Handle YouTube video HTML content
        const currentContent = editor.getHTML();
        if (currentContent.includes('data-youtube-video')) {
            // Extract YouTube video attributes from HTML
            const videoMatch = currentContent.match(/<div[^>]*data-youtube-video[^>]*>/);
            if (videoMatch) {
                const videoHtml = videoMatch[0];
                const titleMatch = videoHtml.match(/data-title="([^"]*)"/);
                const altMatch = videoHtml.match(/data-alt="([^"]*)"/);
                const descriptionMatch = videoHtml.match(/data-description="([^"]*)"/);

                setCurrentVideoPos(selection.from);
                setVideoAltText(altMatch ? altMatch[1] : '');
                setVideoTitle(titleMatch ? titleMatch[1] : '');
                setVideoDescription(descriptionMatch ? descriptionMatch[1] : '');
                setShowVideoMetaInput(true);
                setTimeout(() => {
                    videoAltInputRef.current?.focus();
                }, 100);
            }
        }
    };

    const handleTableClick = (e) => {
        e.preventDefault();
        setShowTableControls(!showTableControls);
    };

    const handleCreateTable = (e) => {
        e.preventDefault();
        editor
            .chain()
            .focus()
            .insertTable({
                rows: tableRows,
                cols: tableCols,
                withHeaderRow: true,
            })
            .run();
        setShowTableControls(false);
    };

    const handleAddRow = (e) => {
        e.preventDefault();
        editor.chain().focus().addRowAfter().run();
    };

    const handleAddColumn = (e) => {
        e.preventDefault();
        editor.chain().focus().addColumnAfter().run();
    };

    const handleDeleteRow = (e) => {
        e.preventDefault();
        editor.chain().focus().deleteRow().run();
    };

    const handleDeleteColumn = (e) => {
        e.preventDefault();
        editor.chain().focus().deleteColumn().run();
    };

    const handleDeleteTable = (e) => {
        e.preventDefault();
        editor.chain().focus().deleteTable().run();
    };

    const handleMergeCells = (e) => {
        e.preventDefault();
        editor.chain().focus().mergeCells().run();
    };

    const handleSplitCell = (e) => {
        e.preventDefault();
        editor.chain().focus().splitCell().run();
    };

    const handleToggleHeaderRow = (e) => {
        e.preventDefault();
        editor.chain().focus().toggleHeaderRow().run();
    };

    const handleToggleHeaderColumn = (e) => {
        e.preventDefault();
        editor.chain().focus().toggleHeaderColumn().run();
    };

    // Cell alignment handlers
    const handleCellAlignLeft = (e) => {
        e.preventDefault();
        editor.chain().focus().setCellAttribute('textAlign', 'left').run();
    };

    const handleCellAlignCenter = (e) => {
        e.preventDefault();
        editor.chain().focus().setCellAttribute('textAlign', 'center').run();
    };

    const handleCellAlignRight = (e) => {
        e.preventDefault();
        editor.chain().focus().setCellAttribute('textAlign', 'right').run();
    };

    const handleToggleHeaderCell = (e) => {
        e.preventDefault();
        editor.chain().focus().toggleHeaderCell().run();
    };

    return (
        <div className="tiptap-toolbar single-line">
            <div className="toolbar-group">
                <button
                    onClick={(e) => {
                        e.preventDefault();
                        editor.chain().focus().toggleBold().run();
                    }}
                    disabled={!editor.can().chain().focus().toggleBold().run()}
                    className={editor.isActive('bold') ? 'is-active' : ''}
                    title="Bold"
                >
                    <Bold size={16} />
                </button>
                <button
                    onClick={(e) => {
                        e.preventDefault();
                        editor.chain().focus().toggleItalic().run();
                    }}
                    disabled={!editor.can().chain().focus().toggleItalic().run()}
                    className={editor.isActive('italic') ? 'is-active' : ''}
                    title="Italic"
                >
                    <Italic size={16} />
                </button>
                <button
                    onClick={(e) => {
                        e.preventDefault();
                        editor.chain().focus().toggleStrike().run();
                    }}
                    disabled={!editor.can().chain().focus().toggleStrike().run()}
                    className={editor.isActive('strike') ? 'is-active' : ''}
                    title="Strikethrough"
                >
                    <Strikethrough size={16} />
                </button>
                <button
                    onClick={(e) => {
                        e.preventDefault();
                        editor.chain().focus().toggleUnderline().run();
                    }}
                    disabled={!editor.can().chain().focus().toggleUnderline().run()}
                    className={editor.isActive('underline') ? 'is-active' : ''}
                    title="Underline"
                >
                    <UnderlineIcon size={16} />
                </button>
                <button
                    onClick={(e) => {
                        e.preventDefault();
                        editor.chain().focus().toggleDynamicDate().run();
                    }}
                    disabled={!editor.can().chain().focus().toggleDynamicDate().run()}
                    className={editor.isActive('dynamicDate') ? 'is-active' : ''}
                    title="Dynamic Date"
                >
                    <Calendar size={16} />
                </button>
            </div>

            <div className="toolbar-divider" />

            <div className="toolbar-group">
                <button
                    onClick={(e) => {
                        e.preventDefault();
                        editor.chain().focus().toggleHeading({ level: 1 }).run();
                    }}
                    className={editor.isActive('heading', { level: 1 }) ? 'is-active' : ''}
                    title="Heading 1"
                >
                    <Heading1 size={16} />
                </button>
                <button
                    onClick={(e) => {
                        e.preventDefault();
                        editor.chain().focus().toggleHeading({ level: 2 }).run();
                    }}
                    className={editor.isActive('heading', { level: 2 }) ? 'is-active' : ''}
                    title="Heading 2"
                >
                    <Heading2 size={16} />
                </button>
                <button
                    onClick={(e) => {
                        e.preventDefault();
                        editor.chain().focus().toggleHeading({ level: 3 }).run();
                    }}
                    className={editor.isActive('heading', { level: 3 }) ? 'is-active' : ''}
                    title="Heading 3"
                >
                    <Heading3 size={16} />
                </button>
                <button
                    onClick={(e) => {
                        e.preventDefault();
                        editor.chain().focus().toggleHeading({ level: 4 }).run();
                    }}
                    className={editor.isActive('heading', { level: 4 }) ? 'is-active' : ''}
                    title="Heading 4"
                >
                    <Heading4 size={16} />
                </button>
                <button
                    onClick={(e) => {
                        e.preventDefault();
                        editor.chain().focus().toggleHeading({ level: 5 }).run();
                    }}
                    className={editor.isActive('heading', { level: 5 }) ? 'is-active' : ''}
                    title="Heading 5"
                >
                    <Heading5 size={16} />
                </button>
                <button
                    onClick={(e) => {
                        e.preventDefault();
                        editor.chain().focus().toggleHeading({ level: 6 }).run();
                    }}
                    className={editor.isActive('heading', { level: 6 }) ? 'is-active' : ''}
                    title="Heading 6"
                >
                    <Heading6 size={16} />
                </button>
            </div>

            <div className="toolbar-divider" />

            <div className="toolbar-group">
                <button
                    onClick={(e) => {
                        e.preventDefault();
                        editor.chain().focus().toggleBulletList().run();
                    }}
                    className={editor.isActive('bulletList') ? 'is-active' : ''}
                    title="Bullet List"
                >
                    <List size={16} />
                </button>
                <button
                    onClick={(e) => {
                        e.preventDefault();
                        editor.chain().focus().toggleOrderedList().run();
                    }}
                    className={editor.isActive('orderedList') ? 'is-active' : ''}
                    title="Numbered List"
                >
                    <ListOrdered size={16} />
                </button>
            </div>

            <div className="toolbar-divider" />

            <div className="toolbar-group">
                <button
                    onClick={(e) => {
                        e.preventDefault();
                        if (editor.isActive('blockquote')) {
                            // If already a blockquote, remove it
                            editor.chain().focus().toggleBlockquote().run();
                        } else {
                            // Set blockquote with default class
                            editor.chain()
                                .focus()
                                .toggleBlockquote()
                                .updateAttributes('blockquote', { class: '' })
                                .run();
                        }
                    }}
                    className={editor.isActive('blockquote') && editor.getAttributes('blockquote').class !== 'info-box' ? 'is-active' : ''}
                    title="Blockquote"
                >
                    <Quote size={16} />
                </button>
                <button
                    onClick={(e) => {
                        e.preventDefault();
                        // Toggle info box on/off
                        if (editor.isActive('infoBox')) {
                            // If already an info box, remove it
                            editor.chain().focus().setParagraph().run();
                        } else {
                            // If not an info box, set it as one
                            editor.chain().focus().setInfoBox().run();
                        }
                    }}
                    className={editor.isActive('infoBox') ? 'is-active' : ''}
                    title="Info Box"
                >
                    <InfoIcon size={16} />
                </button>
                <button
                    onClick={(e) => {
                        e.preventDefault();
                        editor.chain().focus().toggleCodeBlock().run();
                    }}
                    className={editor.isActive('codeBlock') ? 'is-active' : ''}
                    title="Code Block"
                >
                    <Code2 size={16} />
                </button>
                <button
                    onClick={(e) => {
                        e.preventDefault();
                        editor.chain().focus().setHorizontalRule().run();
                    }}
                    title="Horizontal Rule"
                >
                    <Minus size={16} />
                </button>
            </div>

            <div className="toolbar-divider" />

            <div className="toolbar-group">
                <button
                    onClick={(e) => {
                        e.preventDefault();
                        editor.chain().focus().setTextAlign('left').run();
                    }}
                    className={editor.isActive({ textAlign: 'left' }) ? 'is-active' : ''}
                    title="Align Left"
                >
                    <AlignLeft size={16} />
                </button>
                <button
                    onClick={(e) => {
                        e.preventDefault();
                        editor.chain().focus().setTextAlign('center').run();
                    }}
                    className={editor.isActive({ textAlign: 'center' }) ? 'is-active' : ''}
                    title="Align Center"
                >
                    <AlignCenter size={16} />
                </button>
                <button
                    onClick={(e) => {
                        e.preventDefault();
                        editor.chain().focus().setTextAlign('right').run();
                    }}
                    className={editor.isActive({ textAlign: 'right' }) ? 'is-active' : ''}
                    title="Align Right"
                >
                    <AlignRight size={16} />
                </button>
                <button
                    onClick={(e) => {
                        e.preventDefault();
                        editor.chain().focus().setTextAlign('justify').run();
                    }}
                    className={editor.isActive({ textAlign: 'justify' }) ? 'is-active' : ''}
                    title="Justify"
                >
                    <AlignJustify size={16} />
                </button>
            </div>

            <div className="toolbar-divider" />

            <div className="toolbar-group">
                <button
                    onClick={handleLinkClick}
                    className={editor.isActive('link') ? 'is-active' : ''}
                    title="Add/Edit Link"
                >
                    <Link size={16} />
                </button>

                {editor.isActive('link') && (
                    <button
                        onClick={handleUnlink}
                        title="Remove Link"
                    >
                        <Unlink size={16} />
                    </button>
                )}
            </div>

            <div className="toolbar-divider" />

            <div className="toolbar-group">
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImageUpload}
                    accept="image/*"
                    style={{ display: 'none' }}
                    disabled={isUploading}
                />
                <button
                    onClick={(e) => {
                        e.preventDefault();
                        fileInputRef.current.click();
                    }}
                    title="Upload Image"
                    disabled={isUploading}
                    className={isUploading ? 'is-uploading' : ''}
                >
                    {isUploading ? 'Uploading...' : <ImageIcon size={16} />}
                </button>
            </div>

            <div className="toolbar-divider" />

            <div className="toolbar-group">
                <input
                    type="file"
                    ref={videoFileInputRef}
                    onChange={handleVideoUpload}
                    accept="video/*"
                    style={{ display: 'none' }}
                    disabled={isVideoUploading}
                />
                <button
                    onClick={(e) => {
                        e.preventDefault();
                        videoFileInputRef.current.click();
                    }}
                    title="Upload Video"
                    disabled={isVideoUploading}
                    className={isVideoUploading ? 'is-uploading' : ''}
                >
                    {isVideoUploading ? 'Uploading...' : <Video size={16} />}
                </button>
                <button
                    onClick={(e) => {
                        e.preventDefault();
                        setShowYoutubeInput(true);
                        setTimeout(() => {
                            youtubeInputRef.current?.focus();
                        }, 100);
                    }}
                    title="Add YouTube Video"
                >
                    <Youtube size={16} />
                </button>
            </div>

            <div className="toolbar-divider" />

            <div className="toolbar-group">
                <button
                    onClick={handleTableClick}
                    className={editor.isActive('table') ? 'is-active' : ''}
                    title="Table"
                >
                    <Table size={16} />
                </button>
            </div>

            <div className="toolbar-divider" />

            <div className="toolbar-group">
                <button
                    onClick={(e) => {
                        e.preventDefault();
                        editor.chain().focus().undo().run();
                    }}
                    disabled={!editor.can().undo()}
                    title="Undo"
                >
                    <Undo size={16} />
                </button>
                <button
                    onClick={(e) => {
                        e.preventDefault();
                        editor.chain().focus().redo().run();
                    }}
                    disabled={!editor.can().redo()}
                    title="Redo"
                >
                    <Redo size={16} />
                </button>
            </div>

            {/* Table Controls */}
            {showTableControls && (
                <div className="table-controls-modal">
                    <div className="table-controls-overlay" onClick={() => setShowTableControls(false)} />
                    <div className="table-controls-container">
                        <h4>Create Table</h4>
                        <div className="table-controls-grid">
                            <div className="table-control-row">
                                <label>Rows:</label>
                                <input
                                    type="number"
                                    min="1"
                                    max="10"
                                    value={tableRows}
                                    onChange={(e) => setTableRows(parseInt(e.target.value) || 1)}
                                />
                            </div>
                            <div className="table-control-row">
                                <label>Columns:</label>
                                <input
                                    type="number"
                                    min="1"
                                    max="10"
                                    value={tableCols}
                                    onChange={(e) => setTableCols(parseInt(e.target.value) || 1)}
                                />
                            </div>
                        </div>
                        <div className="table-controls-buttons">
                            <button onClick={handleCreateTable} className="table-create-btn">
                                Create Table
                            </button>
                            <button onClick={() => setShowTableControls(false)} className="table-cancel-btn">
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Table Editing Controls (shown when table is active) */}
            {editor?.isActive('table') && (
                <div className="table-edit-controls">
                    <div className="table-controls-group">
                        <button onClick={handleAddRow} title="Add Row">
                            <Plus size={14} />
                        </button>
                        <button onClick={handleAddColumn} title="Add Column">
                            <Plus size={14} style={{ transform: 'rotate(90deg)' }} />
                        </button>
                        <button onClick={handleDeleteRow} title="Delete Row">
                            <Trash2 size={14} />
                        </button>
                        <button onClick={handleDeleteColumn} title="Delete Column">
                            <Trash2 size={14} style={{ transform: 'rotate(90deg)' }} />
                        </button>
                    </div>

                    <div className="table-controls-divider"></div>

                    <div className="table-controls-group">
                        <button onClick={handleMergeCells} title="Merge Cells">
                            <Merge size={14} />
                        </button>
                        <button onClick={handleSplitCell} title="Split Cell">
                            <Split size={14} />
                        </button>
                    </div>

                    <div className="table-controls-divider"></div>

                    <div className="table-controls-group">
                        <button onClick={handleCellAlignLeft} title="Align Left">
                            <AlignLeft size={14} />
                        </button>
                        <button onClick={handleCellAlignCenter} title="Align Center">
                            <AlignCenter size={14} />
                        </button>
                        <button onClick={handleCellAlignRight} title="Align Right">
                            <AlignRight size={14} />
                        </button>
                    </div>

                    <div className="table-controls-divider"></div>

                    <div className="table-controls-group">
                        <button onClick={handleToggleHeaderRow} title="Toggle Header Row">
                            H
                        </button>
                        <button onClick={handleToggleHeaderColumn} title="Toggle Header Column">
                            H|
                        </button>
                        <button onClick={handleDeleteTable} title="Delete Table">
                            <Trash2 size={14} color="#ef4444" />
                        </button>
                    </div>
                </div>
            )}

            {/* Link Input Modal */}
            {showLinkInput && (
                <div className="link-input-modal">
                    <div className="link-input-overlay" onClick={handleLinkCancel} />
                    <div className="link-input-container">
                        <div>
                            <input
                                ref={linkInputRef}
                                type="text"
                                value={linkUrl}
                                onChange={(e) => setLinkUrl(e.target.value)}
                                placeholder="Enter URL (e.g., https://example.com)"
                                className="link-input"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        handleLinkSubmit(e);
                                    }
                                    if (e.key === 'Escape') {
                                        handleLinkCancel();
                                    }
                                }}
                            />
                            <div className="link-input-buttons">
                                <button type="button" onClick={handleLinkSubmit} className="link-submit-btn">
                                    {editor.isActive('link') ? 'Update' : 'Add'} Link
                                </button>
                                <button type="button" onClick={handleLinkCancel} className="link-cancel-btn">
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Image Meta Input Modal */}
            {showImageMetaInput && (
                <div className="link-input-modal">
                    <div className="link-input-overlay" onClick={handleImageMetaCancel} />
                    <div className="link-input-container">
                        <div className="image-meta-form">
                            <div className="form-group">
                                <label>Alt Text</label>
                                <input
                                    ref={altInputRef}
                                    type="text"
                                    value={imageAltText}
                                    onChange={(e) => setImageAltText(e.target.value)}
                                    placeholder="Enter alt text for accessibility"
                                    className="link-input"
                                />
                            </div>
                            <div className="form-group">
                                <label>Title</label>
                                <input
                                    type="text"
                                    value={imageTitle}
                                    onChange={(e) => setImageTitle(e.target.value)}
                                    placeholder="Enter title text (shown on hover)"
                                    className="link-input"
                                />
                            </div>
                            <div className="form-group">
                                <label>Content</label>
                                <textarea
                                    value={imageContent}
                                    onChange={(e) => setImageContent(e.target.value)}
                                    placeholder="Enter additional content or description"
                                    className="link-input textarea"
                                    rows={3}
                                />
                            </div>
                            <div className="link-input-buttons">
                                <button type="button" onClick={handleImageMetaSubmit} className="link-submit-btn">
                                    Save Image Details
                                </button>
                                <button type="button" onClick={handleImageMetaCancel} className="link-cancel-btn">
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Video Meta Input Modal */}
            {showVideoMetaInput && (
                <div className="link-input-modal">
                    <div className="link-input-overlay" onClick={handleVideoMetaCancel} />
                    <div className="link-input-container">
                        <div className="image-meta-form">
                            <div className="form-group">
                                <label>Alt Text</label>
                                <input
                                    ref={videoAltInputRef}
                                    type="text"
                                    value={videoAltText}
                                    onChange={(e) => setVideoAltText(e.target.value)}
                                    placeholder="Enter alt text for accessibility"
                                    className="link-input"
                                />
                            </div>
                            <div className="form-group">
                                <label>Title</label>
                                <input
                                    type="text"
                                    value={videoTitle}
                                    onChange={(e) => setVideoTitle(e.target.value)}
                                    placeholder="Enter title text (shown on hover)"
                                    className="link-input"
                                />
                            </div>
                            <div className="form-group">
                                <label>Description</label>
                                <textarea
                                    value={videoDescription}
                                    onChange={(e) => setVideoDescription(e.target.value)}
                                    placeholder="Enter video description"
                                    className="link-input textarea"
                                    rows={3}
                                />
                            </div>
                            <div className="link-input-buttons">
                                <button type="button" onClick={handleVideoMetaSubmit} className="link-submit-btn">
                                    Save Video Details
                                </button>
                                <button type="button" onClick={handleVideoMetaCancel} className="link-cancel-btn">
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* YouTube URL Input Modal */}
            {showYoutubeInput && (
                <div className="link-input-modal">
                    <div className="link-input-overlay" onClick={() => setShowYoutubeInput(false)} />
                    <div className="link-input-container">
                        <div>
                            <h4>Add YouTube Video</h4>
                            <p className="text-sm text-gray-600 mb-3">
                                Enter a YouTube URL to embed the video directly in your content.
                            </p>
                            <input
                                ref={youtubeInputRef}
                                type="text"
                                value={youtubeUrl}
                                onChange={(e) => setYoutubeUrl(e.target.value)}
                                placeholder="Enter YouTube URL (e.g., https://www.youtube.com/watch?v=VIDEO_ID)"
                                className="link-input"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        handleYoutubeSubmit(e);
                                    }
                                    if (e.key === 'Escape') {
                                        setShowYoutubeInput(false);
                                    }
                                }}
                            />
                            <div className="link-input-buttons">
                                <button type="button" onClick={handleYoutubeSubmit} className="link-submit-btn">
                                    Embed Video
                                </button>
                                <button type="button" onClick={() => setShowYoutubeInput(false)} className="link-cancel-btn">
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const CustomBubbleMenu = () => {
    const { editor } = useCurrentEditor();
    const [showLinkInput, setShowLinkInput] = useState(false);
    const [linkUrl, setLinkUrl] = useState('');
    const [showImageMetaInput, setShowImageMetaInput] = useState(false);
    const [imageAltText, setImageAltText] = useState('');
    const [imageTitle, setImageTitle] = useState('');
    const [imageContent, setImageContent] = useState('');
    const [currentImagePos, setCurrentImagePos] = useState(null);
    const [showVideoMetaInput, setShowVideoMetaInput] = useState(false);
    const [videoAltText, setVideoAltText] = useState('');
    const [videoTitle, setVideoTitle] = useState('');
    const [videoDescription, setVideoDescription] = useState('');
    const [currentVideoPos, setCurrentVideoPos] = useState(null);
    const linkInputRef = useRef(null);
    const altInputRef = useRef(null);
    const videoAltInputRef = useRef(null);

    // return null

    if (!editor) {
        return null;
    }

    const handleBubbleLinkClick = (e) => {
        e.preventDefault();

        if (editor.isActive('link')) {
            const currentUrl = editor.getAttributes('link').href || '';
            setLinkUrl(currentUrl);
        } else {
            setLinkUrl('');
        }

        setShowLinkInput(true);
        setTimeout(() => {
            linkInputRef.current?.focus();
        }, 100);
    };

    const handleBubbleLinkSubmit = (e) => {
        e.preventDefault();

        if (linkUrl.trim() === '') {
            setShowLinkInput(false);
            return;
        }

        let finalUrl = linkUrl.trim();
        if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
            finalUrl = 'https://' + finalUrl;
        }

        editor.chain().focus().setLink({ href: finalUrl }).run();
        setShowLinkInput(false);
        setLinkUrl('');
    };

    const handleBubbleLinkCancel = () => {
        setShowLinkInput(false);
        setLinkUrl('');
        editor.chain().focus().run();
    };

    const handleBubbleUnlink = (e) => {
        e.preventDefault();
        editor.chain().focus().unsetLink().run();
    };

    const handleBubbleImageMetaClick = (e) => {
        e.preventDefault();

        // Find the image node at the current selection
        const { state } = editor;
        const { from, to } = state.selection;

        // Check all nodes in the current selection range
        state.doc.nodesBetween(from, to, (node, pos) => {
            if (node.type.name === 'image') {
                setCurrentImagePos(pos);
                setImageAltText(node.attrs.alt || '');
                setImageTitle(node.attrs.title || '');
                setImageContent(node.attrs.content || '');
                setShowImageMetaInput(true);
                setTimeout(() => {
                    altInputRef.current?.focus();
                }, 100);
                return false; // Stop searching after first image found
            }
        });
    };

    const handleBubbleImageMetaSubmit = (e) => {
        e.preventDefault();

        if (currentImagePos === null) return;

        editor.chain().focus().command(({ tr }) => {
            const node = tr.doc.nodeAt(currentImagePos);
            if (node && node.type.name === 'image') {
                tr.setNodeMarkup(currentImagePos, undefined, {
                    ...node.attrs,
                    alt: imageAltText,
                    title: imageTitle,
                    content: imageContent
                });
            }
            return true;
        }).run();

        setShowImageMetaInput(false);
        setImageAltText('');
        setImageTitle('');
        setImageContent('');
        setCurrentImagePos(null);
    };

    const handleBubbleImageMetaCancel = () => {
        setShowImageMetaInput(false);
        setImageAltText('');
        setImageTitle('');
        setImageContent('');
        setCurrentImagePos(null);
        editor.chain().focus().run();
    };

    const handleBubbleVideoMetaClick = (e) => {
        e.preventDefault();

        // Find the video node or iframe HTML at the current selection
        const { state } = editor;
        const { from, to } = state.selection;

        // Check all nodes in the current selection range
        state.doc.nodesBetween(from, to, (node, pos) => {
            if (node.type.name === 'video') {
                setCurrentVideoPos(pos);
                setVideoAltText(node.attrs.alt || '');
                setVideoTitle(node.attrs.title || '');
                setVideoDescription(node.attrs.description || '');
                setShowVideoMetaInput(true);
                setTimeout(() => {
                    videoAltInputRef.current?.focus();
                }, 100);
                return false; // Stop searching after first video found
            }
        });

        // Also check for YouTube video content
        const selectedContent = editor.getHTML();
        if (selectedContent.includes('data-youtube-video')) {
            // Extract YouTube video attributes from HTML
            const videoMatch = selectedContent.match(/<div[^>]*data-youtube-video[^>]*>/);
            if (videoMatch) {
                const videoHtml = videoMatch[0];
                const titleMatch = videoHtml.match(/data-title="([^"]*)"/);
                const altMatch = videoHtml.match(/data-alt="([^"]*)"/);
                const descriptionMatch = videoHtml.match(/data-description="([^"]*)"/);

                setCurrentVideoPos(from);
                setVideoAltText(altMatch ? altMatch[1] : '');
                setVideoTitle(titleMatch ? titleMatch[1] : '');
                setVideoDescription(descriptionMatch ? descriptionMatch[1] : '');
                setShowVideoMetaInput(true);
                setTimeout(() => {
                    videoAltInputRef.current?.focus();
                }, 100);
            }
        }
    };

    const handleBubbleVideoMetaSubmit = (e) => {
        e.preventDefault();

        if (currentVideoPos === null) return;

        // Handle video nodes
        editor.chain().focus().command(({ tr }) => {
            const node = tr.doc.nodeAt(currentVideoPos);
            if (node && node.type.name === 'video') {
                tr.setNodeMarkup(currentVideoPos, undefined, {
                    ...node.attrs,
                    alt: videoAltText,
                    title: videoTitle,
                    description: videoDescription
                });
                return true;
            }
            return false;
        }).run();

        // Handle YouTube video HTML content
        const currentContent = editor.getHTML();
        if (currentContent.includes('data-youtube-video')) {
            let updatedContent = currentContent;

            // Update YouTube video attributes
            updatedContent = updatedContent.replace(
                /<div([^>]*data-youtube-video[^>]*)>/g,
                (match, attributes) => {
                    // Remove existing data-alt, data-title, data-description attributes
                    let newAttributes = attributes
                        .replace(/data-alt="[^"]*"/g, '')
                        .replace(/data-title="[^"]*"/g, '')
                        .replace(/data-description="[^"]*"/g, '');

                    // Add new attributes
                    if (videoAltText) {
                        newAttributes += ` data-alt="${videoAltText}"`;
                    }
                    if (videoTitle) {
                        newAttributes += ` data-title="${videoTitle}"`;
                    }
                    if (videoDescription) {
                        newAttributes += ` data-description="${videoDescription}"`;
                    }

                    return `<div${newAttributes}>`;
                }
            );

            // Update editor content
            editor.commands.setContent(updatedContent);
        }

        setShowVideoMetaInput(false);
        setVideoAltText('');
        setVideoTitle('');
        setVideoDescription('');
        setCurrentVideoPos(null);
    };

    const handleBubbleVideoMetaCancel = () => {
        setShowVideoMetaInput(false);
        setVideoAltText('');
        setVideoTitle('');
        setVideoDescription('');
        setCurrentVideoPos(null);
        editor.chain().focus().run();
    };

    return (
        <BubbleMenu
            editor={editor}
            tippyOptions={{
                duration: 100,
                onHidden: () => {
                    // Reset inputs when bubble menu hides
                    setShowLinkInput(false);
                    setShowImageMetaInput(false);
                    setShowVideoMetaInput(false);
                    setLinkUrl('');
                    setImageAltText('');
                    setImageTitle('');
                    setImageContent('');
                    setCurrentImagePos(null);
                    setVideoAltText('');
                    setVideoTitle('');
                    setVideoDescription('');
                    setCurrentVideoPos(null);
                }
            }}
        >
            <div className="bubble-menu">
                {/* Always show these buttons */}

                <div className="flex">
                    {/* <button
                        onClick={(e) => {
                            e.preventDefault();
                            editor.chain().focus().toggleBold().run();
                        }}
                        className={editor.isActive('bold') ? 'is-active' : ''}
                        title="Bold"
                    >
                        <Bold size={14} />
                    </button>
                    <button
                        onClick={(e) => {
                            e.preventDefault();
                            editor.chain().focus().toggleItalic().run();
                        }}
                        className={editor.isActive('italic') ? 'is-active' : ''}
                        title="Italic"
                    >
                        <Italic size={14} />
                    </button>
                    <button
                        onClick={(e) => {
                            e.preventDefault();
                            editor.chain().focus().toggleUnderline().run();
                        }}
                        className={editor.isActive('underline') ? 'is-active' : ''}
                        title="Underline"
                    >
                        <UnderlineIcon size={14} />
                    </button>
                    <button
                        onClick={(e) => {
                            e.preventDefault();
                            editor.chain().focus().toggleStrike().run();
                        }}
                        className={editor.isActive('strike') ? 'is-active' : ''}
                        title="Strikethrough"
                    >
                        <Strikethrough size={14} />
                    </button>
                    <button
                        onClick={(e) => {
                            e.preventDefault();
                            editor.chain().focus().toggleHeading({ level: 1 }).run();
                        }}
                        className={editor.isActive('heading', { level: 1 }) ? 'is-active' : ''}
                        title="Heading 1"
                    >
                        H1
                    </button>
                    <button
                        onClick={(e) => {
                            e.preventDefault();
                            editor.chain().focus().toggleHeading({ level: 2 }).run();
                        }}
                        className={editor.isActive('heading', { level: 2 }) ? 'is-active' : ''}
                        title="Heading 2"
                    >
                        H2
                    </button>
                    <button
                        onClick={(e) => {
                            e.preventDefault();
                            editor.chain().focus().toggleHeading({ level: 3 }).run();
                        }}
                        className={editor.isActive('heading', { level: 3 }) ? 'is-active' : ''}
                        title="Heading 3"
                    >
                        H3
                    </button>
                    <button
                        onClick={(e) => {
                            e.preventDefault();
                            editor.chain().focus().toggleHeading({ level: 4 }).run();
                        }}
                        className={editor.isActive('heading', { level: 4 }) ? 'is-active' : ''}
                        title="Heading 4"
                    >
                        H4
                    </button>
                    <button
                        onClick={(e) => {
                            e.preventDefault();
                            editor.chain().focus().toggleHeading({ level: 5 }).run();
                        }}
                        className={editor.isActive('heading', { level: 5 }) ? 'is-active' : ''}
                        title="Heading 5"
                    >
                        H5
                    </button>
                    <button
                        onClick={(e) => {
                            e.preventDefault();
                            editor.chain().focus().toggleHeading({ level: 6 }).run();
                        }}
                        className={editor.isActive('heading', { level: 6 }) ? 'is-active' : ''}
                        title="Heading 6"
                    >
                        H6
                    </button> */}

                    {/* List buttons */}
                    {/* <button
                        onClick={(e) => {
                            e.preventDefault();
                            editor.chain().focus().toggleBulletList().run();
                        }}
                        className={editor.isActive('bulletList') ? 'is-active' : ''}
                        title="Bullet List"
                    >
                        <List size={14} />
                    </button>
                    <button
                        onClick={(e) => {
                            e.preventDefault();
                            editor.chain().focus().toggleOrderedList().run();
                        }}
                        className={editor.isActive('orderedList') ? 'is-active' : ''}
                        title="Numbered List"
                    >
                        <ListOrdered size={14} />
                    </button> */}

                    {/* Link buttons */}
                    <button
                        onClick={handleBubbleLinkClick}
                        className={editor.isActive('link') ? 'is-active' : ''}
                        title="Add/Edit Link"
                    >
                        <Link size={14} />
                    </button>
                    {/* <button
                        onClick={(e) => {
                            e.preventDefault();
                            editor.chain().focus().toggleBlockquote().run();
                        }}
                        className={editor.isActive('blockquote') ? 'is-active' : ''}
                        title="info icon"
                    >
                        <InfoIcon size={16} />
                    </button> */}

                    {/* Text Alignment buttons */}
                    {/* <button
                        onClick={(e) => {
                            e.preventDefault();
                            editor.chain().focus().setTextAlign('left').run();
                        }}
                        className={editor.isActive({ textAlign: 'left' }) ? 'is-active' : ''}
                        title="Align Left"
                    >
                        <AlignLeft size={14} />
                    </button>
                    <button
                        onClick={(e) => {
                            e.preventDefault();
                            editor.chain().focus().setTextAlign('center').run();
                        }}
                        className={editor.isActive({ textAlign: 'center' }) ? 'is-active' : ''}
                        title="Align Center"
                    >
                        <AlignCenter size={14} />
                    </button>
                    <button
                        onClick={(e) => {
                            e.preventDefault();
                            editor.chain().focus().setTextAlign('right').run();
                        }}
                        className={editor.isActive({ textAlign: 'right' }) ? 'is-active' : ''}
                        title="Align Right"
                    >
                        <AlignRight size={14} />
                    </button>
                    <button
                        onClick={(e) => {
                            e.preventDefault();
                            editor.chain().focus().setTextAlign('justify').run();
                        }}
                        className={editor.isActive({ textAlign: 'justify' }) ? 'is-active' : ''}
                        title="Justify"
                    >
                        <AlignJustify size={14} />
                    </button> */}
                    {editor.isActive('link') && (
                        <button
                            onClick={handleBubbleUnlink}
                            title="Remove Link"
                        >
                            <Unlink size={14} />
                        </button>
                    )}

                    {/* Image Meta button - only shown when image is selected */}
                    {editor.isActive('image') && (
                        <button
                            onClick={handleBubbleImageMetaClick}
                            title="Edit Image Details"
                        >
                            <ImageIcon size={14} />
                        </button>
                    )}

                    {/* Video Meta button - shown when video is selected or YouTube video content is present */}
                    {(editor.isActive('video') || editor.getHTML().includes('data-youtube-video')) && (
                        <button
                            onClick={handleBubbleVideoMetaClick}
                            title="Edit Video Details"
                        >
                            <Video size={14} />
                        </button>
                    )}
                </div>

                {/* Image Meta Input */}
                {showImageMetaInput && (
                    <div className="bubble-link-input">
                        <div className="image-meta-form">
                            <div className="form-group">
                                <label>Alt:</label>
                                <input
                                    ref={altInputRef}
                                    type="text"
                                    value={imageAltText}
                                    onChange={(e) => setImageAltText(e.target.value)}
                                    placeholder="Alt text"
                                    className="bubble-link-field !w-full"
                                />
                            </div>
                            <div className="form-group">
                                <label>Title:</label>
                                <input
                                    type="text"
                                    value={imageTitle}
                                    onChange={(e) => setImageTitle(e.target.value)}
                                    placeholder="Title"
                                    className="bubble-link-field !w-full"
                                />
                            </div>
                            <div className="form-group">
                                <label>Content:</label>
                                <textarea
                                    value={imageContent}
                                    onChange={(e) => setImageContent(e.target.value)}
                                    placeholder="Content"
                                    className="bubble-link-field textarea"
                                    rows={2}
                                />
                            </div>
                            <div className="form-buttons">
                                <button
                                    type="button"
                                    onClick={handleBubbleImageMetaSubmit}
                                    className="bubble-link-submit"
                                >
                                    <Check size={16} color='green' />
                                </button>
                                <button
                                    type="button"
                                    onClick={handleBubbleImageMetaCancel}
                                    className="bubble-link-cancel"
                                >
                                    <X size={16} color='red' />
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Link Input */}
                {showLinkInput && (
                    <div className="bubble-link-input">
                        <div>
                            <input
                                ref={linkInputRef}
                                type="text"
                                value={linkUrl}
                                onChange={(e) => setLinkUrl(e.target.value)}
                                placeholder="Enter URL"
                                className="bubble-link-field"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        handleBubbleLinkSubmit(e);
                                    }
                                    if (e.key === 'Escape') {
                                        handleBubbleLinkCancel();
                                    }
                                }}
                            />
                            <button
                                type="button"
                                onClick={handleBubbleLinkSubmit}
                                className="bubble-link-submit"
                            >
                                ✓
                            </button>
                            <button
                                type="button"
                                onClick={handleBubbleLinkCancel}
                                className="bubble-link-cancel"
                            >
                                ✕
                            </button>
                        </div>
                    </div>
                )}

                {/* Video Meta Input */}
                {showVideoMetaInput && (
                    <div className="bubble-link-input">
                        <div className="image-meta-form">
                            <div className="form-group">
                                <label>Alt:</label>
                                <input
                                    ref={videoAltInputRef}
                                    type="text"
                                    value={videoAltText}
                                    onChange={(e) => setVideoAltText(e.target.value)}
                                    placeholder="Alt text"
                                    className="bubble-link-field !w-full"
                                />
                            </div>
                            <div className="form-group">
                                <label>Title:</label>
                                <input
                                    type="text"
                                    value={videoTitle}
                                    onChange={(e) => setVideoTitle(e.target.value)}
                                    placeholder="Title"
                                    className="bubble-link-field !w-full"
                                />
                            </div>
                            <div className="form-group">
                                <label>Desc:</label>
                                <textarea
                                    value={videoDescription}
                                    onChange={(e) => setVideoDescription(e.target.value)}
                                    placeholder="Description"
                                    className="bubble-link-field textarea"
                                    rows={2}
                                />
                            </div>
                            <div className="form-buttons">
                                <button
                                    type="button"
                                    onClick={handleBubbleVideoMetaSubmit}
                                    className="bubble-link-submit"
                                >
                                    <Check size={16} color='green' />
                                </button>
                                <button
                                    type="button"
                                    onClick={handleBubbleVideoMetaCancel}
                                    className="bubble-link-cancel"
                                >
                                    <X size={16} color='red' />
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </BubbleMenu>
    );
};

// Function to extract headings from HTML content and ensure IDs are present
const extractHeadings = (htmlContent) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');
    const headingElements = doc.querySelectorAll('h1, h2, h3, h4, h5, h6');

    return Array.from(headingElements).map(heading => {
        const text = heading.textContent.trim();
        const existingId = heading.id;
        const generatedId = generateSlug(text);

        return {
            id: existingId || generatedId,
            text: text,
            level: parseInt(heading.tagName.substring(1)),
            tag: heading.tagName.toLowerCase()
        };
    });
};

// Function to ensure all headings in HTML have IDs
const ensureHeadingIds = (htmlContent) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');
    const headingElements = doc.querySelectorAll('h1, h2, h3, h4, h5, h6');

    let updated = false;

    headingElements.forEach(heading => {
        const text = heading.textContent.trim();
        if (text && !heading.id) {
            heading.id = generateSlug(text);
            updated = true;
        }
    });

    return updated ? doc.body.innerHTML : htmlContent;
};

const TiptapWithImg = ({
    content = '',
    onUpdate,
    onHeadingsUpdate,
    uploadImgUrl = 'https://nexus-consults.com/api/public/api/admin/blogs/upload-content-image',
    uploadVideoUrl = 'https://api.nexus.com/api/admin/blog-media/upload-video',
    processYoutubeUrl = 'https://api.nexus.com/api/admin/blog-media/process-youtube'
}) => {
    const [initialized, setInitialized] = useState(false);
    const [editor, setEditor] = useState(null);
    const updateTimeoutRef = useRef(null);

    // Debounced function to update heading IDs
    const updateHeadingIds = useCallback((editor) => {
        if (!editor || !initialized) return;

        // Clear any existing timeout
        if (updateTimeoutRef.current) {
            clearTimeout(updateTimeoutRef.current);
        }

        // Set a new timeout to update IDs after user stops typing
        updateTimeoutRef.current = setTimeout(() => {
            const { state } = editor;
            const { tr } = state;
            let updated = false;

            state.doc.descendants((node, pos) => {
                if (node.type.name === 'heading' && node.textContent) {
                    const currentId = node.attrs.id;
                    const expectedId = generateSlug(node.textContent);

                    if (currentId !== expectedId) {
                        tr.setNodeMarkup(pos, undefined, { ...node.attrs, id: expectedId });
                        updated = true;
                    }
                }
            });

            if (updated) {
                editor.view.dispatch(tr);
            }
        }, 500); // Wait 500ms after user stops typing
    }, [initialized]);

    const handleUpdate = useCallback(({ editor }) => {
        if (initialized) {
            let html = editor.getHTML();

            // Ensure all headings have IDs in the HTML content
            html = ensureHeadingIds(html);

            // Extract headings from the HTML
            const headings = extractHeadings(html);

            // Call the update callbacks
            if (onUpdate) {
                onUpdate(html);
            }

            if (onHeadingsUpdate) {
                onHeadingsUpdate(headings);
            }

            // Update heading IDs with debounce
            updateHeadingIds(editor);
        }
    }, [onUpdate, onHeadingsUpdate, initialized, updateHeadingIds]);

    const handleCreate = useCallback(({ editor }) => {
        setEditor(editor);
    }, []);

    useEffect(() => {
        setInitialized(true);

        // Cleanup timeout on unmount
        return () => {
            if (updateTimeoutRef.current) {
                clearTimeout(updateTimeoutRef.current);
            }
        };
    }, []);

    return (
        <div className="tiptap-container">
            <EditorProvider
                extensions={extensions}
                content={content}
                onUpdate={handleUpdate}
                onCreate={handleCreate}
            >
                <MenuBar
                    uploadImgUrl={uploadImgUrl}
                    uploadVideoUrl={uploadVideoUrl}
                    processYoutubeUrl={processYoutubeUrl}
                />
                <CustomBubbleMenu />
            </EditorProvider>
        </div>
    );
};

export default TiptapWithImg;