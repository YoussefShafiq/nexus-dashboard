# Video Upload Guide for Tiptap Editor

The Tiptap editor now supports video uploads with the same metadata fields as images (alt, title, description).

## Features

### 1. Local Video Upload
- **Supported Formats**: MP4, MOV, AVI, WMV, WebM
- **Max File Size**: 100MB
- **Upload Endpoint**: `POST /api/admin/blog-media/upload-video`

### 2. YouTube Video Integration
- **Input**: YouTube URL (e.g., `https://www.youtube.com/watch?v=VIDEO_ID`)
- **Processing**: Client-side URL parsing and iframe generation
- **Output**: Embedded YouTube iframe directly in content with metadata

### 3. Video Metadata
All videos support the following metadata fields:
- **Alt Text**: For accessibility
- **Title**: Shown on hover
- **Description**: Additional content/description

## Usage

### Basic Implementation

```jsx
import TiptapWithImg from './Components/TextEditor/TiptapWithImg';

function MyComponent() {
    const handleUpdate = (html) => {
        // console.log('Editor content:', html);
    };

    const handleHeadingsUpdate = (headings) => {
        // console.log('Headings:', headings);
    };

    return (
        <TiptapWithImg
            content="<p>Initial content</p>"
            onUpdate={handleUpdate}
            onHeadingsUpdate={handleHeadingsUpdate}
            uploadImgUrl="https://api.nexus.com/api/admin/blogs/images/upload"
            uploadVideoUrl="https://api.nexus.com/api/admin/blog-media/upload-video"
        />
    );
}
```

### Custom API Endpoints

You can override the default video upload endpoint:

```jsx
<TiptapWithImg
    uploadVideoUrl="https://your-api.com/upload-video"
    // ... other props
/>
```

## API Requirements

### Video Upload Endpoint
```http
POST /api/admin/blog-media/upload-video
Content-Type: multipart/form-data
Authorization: Bearer {token}

Body: { video: File }
```

**Response Format:**
```json
{
    "success": true,
    "data": {
        "url": "https://example.com/videos/video.mp4"
    }
}
```

### YouTube URL Processing
YouTube videos are processed client-side and embedded directly as iframes. No server endpoint is required.

**Supported URL Formats:**
- `https://www.youtube.com/watch?v=VIDEO_ID`
- `https://youtu.be/VIDEO_ID`
- `https://www.youtube.com/embed/VIDEO_ID`

## Editor Features

### Toolbar Buttons
- **Video Upload Button**: Upload local video files
- **YouTube Button**: Add YouTube videos by URL

### Bubble Menu
When a video is selected, the bubble menu shows:
- **Video Edit Button**: Edit video metadata (alt, title, description)

### Metadata Modal
After uploading/adding a video, a modal appears to set:
- Alt text for accessibility
- Title for hover display
- Description for additional context

## Video Rendering

### Local Videos
```html
<video 
    src="https://example.com/video.mp4" 
    alt="Video description" 
    title="Video title" 
    data-description="Additional details"
    data-type="local"
    controls 
    preload="metadata"
    class="help-center-video">
</video>
```

### YouTube Videos
```html
<iframe 
    class="youtube-iframe"
    src="https://www.youtube.com/embed/VIDEO_ID"
    title="YouTube video player"
    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
    referrerPolicy="strict-origin-when-cross-origin"
    allowFullScreen
    width="100%"
    height="400"
    frameborder="0">
</iframe>
```

## Styling

The editor includes CSS classes for styling videos:
- `.help-center-video`: Local video styling
- `.youtube-iframe`: YouTube iframe styling
- `.video-container.youtube-video`: Legacy YouTube video container
- `.is-uploading`: Upload button state

## Error Handling

- File size validation (100MB limit)
- File type validation (MP4, MOV, AVI, WMV, WebM)
- Network error handling with user-friendly messages
- Invalid YouTube URL handling

## Security

- Authorization header required for video uploads
- File type validation on both client and server
- File size limits enforced
- YouTube URL validation and client-side processing
