# Blog Media Integration Guide

This guide explains how to implement video uploads and YouTube embeds in the TipTap editor for the nexus blog system.

## Prerequisites

1. React 16.8+
2. TipTap 2.0+
3. Axios or your preferred HTTP client

## Installation

```bash
npm install @tiptap/react @tiptap/pm @tiptap/starter-kit @tiptap/extension-image @tiptap/extension-video
```

## API Endpoints

### 1. Upload Video
- **URL**: `POST /api/admin/blog-media/upload-video`
- **Content-Type**: `multipart/form-data`
- **Body**: `{ video: File }`
- **Max Size**: 100MB
- **Supported Formats**: MP4, MOV, AVI, WMV, WebM

### 2. Process YouTube URL
- **URL**: `POST /api/admin/blog-media/process-youtube`
- **Content-Type**: `application/json`
- **Body**: `{ url: string }`

## Implementation Steps

### 1. Create Video Extension

```typescript
// extensions/Video.ts
import { Extension } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import { VideoComponent } from '../components/VideoComponent'

export const Video = Extension.create({
  name: 'video',
  addOptions() {
    return {
      HTMLAttributes: {
        controls: true,
      },
    }
  },
  addAttributes() {
    return {
      src: { default: null },
      type: { default: 'video' },
      youtubeId: { default: null },
    }
  },
  parseHTML() {
    return [
      {
        tag: 'video[src]',
        getAttrs: (node: HTMLElement) => ({
          src: node.getAttribute('src'),
          type: 'video',
        }),
      },
      {
        tag: 'div[data-youtube-video]',
        getAttrs: (node: HTMLElement) => ({
          youtubeId: node.getAttribute('data-youtube-id'),
          type: 'youtube',
        }),
      },
    ]
  },
  renderHTML({ HTMLAttributes }) {
    if (HTMLAttributes.type === 'youtube') {
      return [
        'div',
        {
          'data-youtube-video': '',
          'data-youtube-id': HTMLAttributes.youtubeId,
          class: 'youtube-embed',
        },
        [
          'iframe',
          {
            src: `https://www.youtube.com/embed/${HTMLAttributes.youtubeId}`,
            frameborder: '0',
            allow: 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture',
            allowfullscreen: 'true',
            width: '100%',
            height: '400',
          },
        ],
      ]
    }
    return ['video', { ...this.options.HTMLAttributes, ...HTMLAttributes }]
  },
  addNodeView() {
    return ReactNodeViewRenderer(VideoComponent)
  },
  addCommands() {
    return {
      setVideo: (options) => ({ commands }) => {
        return commands.insertContent({
          type: this.name,
          attrs: options,
        })
      },
    }
  },
})
```

### 2. Create Video Component

```typescript
// components/VideoComponent.tsx
import React from 'react'
import { NodeViewWrapper, NodeViewProps } from '@tiptap/react'

export const VideoComponent = (props: NodeViewProps) => {
  const { type, src, youtubeId } = props.node.attrs

  if (type === 'youtube' && youtubeId) {
    return (
      <NodeViewWrapper className="youtube-embed">
        <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, overflow: 'hidden' }}>
          <iframe
            src={`https://www.youtube.com/embed/${youtubeId}`}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              border: 0,
            }}
            allowFullScreen
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          />
        </div>
      </NodeViewWrapper>
    )
  }

  return (
    <NodeViewWrapper>
      <video
        src={src}
        controls
        style={{ maxWidth: '100%', borderRadius: '4px' }}
      />
    </NodeViewWrapper>
  )
}
```

### 3. Create Media Upload Buttons Component

```typescript
// components/MediaButtons.tsx
import { useEditor } from '@tiptap/react'
import { Video } from '../extensions/Video'

export const MediaButtons = () => {
  const editor = useEditor()

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const formData = new FormData()
    formData.append('video', file)

    try {
      const response = await fetch('/api/admin/blog-media/upload-video', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        },
        body: formData,
      })

      const data = await response.json()

      if (data.status === 'success') {
        editor?.chain().focus()
          .setVideo({ 
            src: data.data.url,
            type: 'video'
          })
          .run()
      }
    } catch (error) {
      console.error('Error uploading video:', error)
    }
  }

  const handleYoutubeAdd = async () => {
    const url = window.prompt('Enter YouTube URL:')
    if (!url) return

    try {
      const response = await fetch('/api/admin/blog-media/process-youtube', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        },
        body: JSON.stringify({ url }),
      })

      const data = await response.json()

      if (data.status === 'success') {
        editor?.chain().focus()
          .setVideo({
            type: 'youtube',
            youtubeId: data.data.youtube_id,
          })
          .run()
      }
    } catch (error) {
      console.error('Error processing YouTube URL:', error)
    }
  }

  return (
    <div className="flex gap-2 p-2 border-b">
      <div>
        <input
          type="file"
          id="video-upload"
          accept="video/*"
          className="hidden"
          onChange={handleFileUpload}
        />
        <label
          htmlFor="video-upload"
          className="px-3 py-1 text-sm bg-gray-100 rounded cursor-pointer hover:bg-gray-200"
          title="Upload Video"
        >
          📹 Upload Video
        </label>
      </div>
      
      <button
        onClick={handleYoutubeAdd}
        className="px-3 py-1 text-sm bg-gray-100 rounded hover:bg-gray-200"
        title="Add YouTube Video"
      >
        ▶️ Add YouTube
      </button>
    </div>
  )
}
```

### 4. Create the Editor Component

```typescript
// components/Editor.tsx
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Video } from '../extensions/Video'
import { MediaButtons } from './MediaButtons'

const Editor = ({ content, onChange }: { content: string; onChange: (html: string) => void }) => {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Video,
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
  })

  return (
    <div className="border rounded">
      <MediaButtons />
      <EditorContent editor={editor} className="p-4 min-h-[300px]" />
    </div>
  )
}

export default Editor
```

### 5. Styling

Add these styles to your CSS file:

```css
/* Editor Styles */
.ProseMirror {
  min-height: 300px;
  padding: 1rem;
}

.ProseMirror:focus {
  outline: none;
}

/* Video Styling */
.ProseMirror video {
  max-width: 100%;
  border-radius: 0.375rem;
  margin: 1rem 0;
}

.youtube-embed {
  position: relative;
  padding-bottom: 56.25%; /* 16:9 Aspect Ratio */
  height: 0;
  overflow: hidden;
  margin: 1rem 0;
  border-radius: 0.375rem;
}

.youtube-embed iframe {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  border: 0;
}
```

## Usage Example

```tsx
import { useState } from 'react'
import Editor from './components/Editor'

const BlogEditor = () => {
  const [content, setContent] = useState('')

  return (
    <div className="max-w-4xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Blog Editor</h1>
      <Editor 
        content={content} 
        onChange={(html) => setContent(html)} 
      />
      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-2">Preview:</h2>
        <div 
          className="prose max-w-none border rounded p-4" 
          dangerouslySetInnerHTML={{ __html: content }} 
        />
      </div>
    </div>
  )
}

export default BlogEditor
```

## Features

1. **Video Upload**
   - Drag and drop or click to upload
   - Progress indicator during upload
   - Responsive video player

2. **YouTube Embeds**
   - Paste any YouTube URL
   - Automatic thumbnail generation
   - Responsive iframe

3. **Rich Text Editing**
   - All standard formatting options
   - Image support
   - Video support
   - YouTube embeds

## Error Handling

1. **Video Upload Errors**
   - File too large
   - Invalid file type
   - Network errors

2. **YouTube URL Errors**
   - Invalid URL
   - Private/unavailable videos
   - Network errors

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Troubleshooting

1. **Videos not uploading**
   - Check file size limits
   - Verify network connection
   - Check browser console for errors

2. **YouTube embeds not working**
   - Verify URL format
   - Check network requests in browser dev tools
   - Ensure no content blockers are interfering

## Support

For any issues or questions, please contact the development team.
