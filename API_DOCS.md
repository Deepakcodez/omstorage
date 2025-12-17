# OmStorage API Documentation

This service handles file uploads (images/videos), storage, and metadata management using PostgreSQL.

## Base URL
Defaults to `http://localhost:8080`

## Endpoints

### 1. Upload Single File
Uploads a single file to a specific project.

- **URL**: `/v1/upload/single/:projectID`
- **Method**: `POST`
- **Query Params**: 
  - `folder` (optional): Logical folder name to group files (default: "default")
- **Content-Type**: `multipart/form-data`

**Request Body:**
| Key | Type | Description |
|-----|------|-------------|
| `file` | File | The file binary to upload |

**Response (200 OK):**
```json
{
  "message": "File uploaded successfully",
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "original_filename": "image.png",
  "size_bytes": 10240,
  "public_url": "/storage/proj_123/uuid.png",
  "low_res_url": "/storage/proj_123/low_uuid.png",
  "blur_thumb_len": 345
}
```

---

### 2. Upload Multiple Files
Uploads multiple files at once.

- **URL**: `/v1/upload/multiple/:projectID`
- **Method**: `POST`
- **Query Params**:
  - `folder` (optional): Logical folder name to group files
- **Content-Type**: `multipart/form-data`

**Request Body:**
| Key | Type | Description |
|-----|------|-------------|
| `files` | File[] | Multiple files selected for upload |

**Response (200 OK):**
```json
{
  "count": 2,
  "uploaded_files": [
    {
      "id": "uuid-1",
      "original_name": "pic1.jpg",
      "public_url": "/storage/proj_123/uuid-1.jpg",
      "low_res_url": "/storage/proj_123/low_uuid-1.jpg"
    },
    {
      "id": "uuid-2",
      "original_name": "video.mp4",
      "public_url": "/storage/proj_123/uuid-2.mp4",
      "low_res_url": ""
    }
  ]
}
```

---

### 3. Get Files by Organization/Project
Retrieve a list of files uploaded to a specific project.

- **URL**: `/v1/files/:projectID`
- **Method**: `GET`
- **Query Params**:
  - `folder` (optional): Filter by folder name

**Response (200 OK):**
```json
[
  {
    "id": "uuid-1",
    "organization_id": "proj_123",
    "folder_name": "marketing",
    "original_name": "banner.jpg",
    "public_url": "/storage/proj_123/banner-uuid.jpg",
    "low_res_url": "/storage/proj_123/low_banner-uuid.jpg",
    "blur_thumb": "base64_encoded_string_or_byte_array",
    "mime_type": "image/jpeg",
    "size": 50000,
    "created_at": "2025-12-17T10:00:00Z",
    "updated_at": "2025-12-17T10:00:00Z"
  }
]
```

**Note on Images**:
- `public_url`: The original full-resolution image.
- `low_res_url`: A simplified, compressed version (max 600px width) suitable for grid views.
- `blur_thumb`: Raw bytes of a tiny (32px) heavily blurred version for immediate "blur-up" loading.

---

### 4. Get Single File Metadata
Retrieve metadata for a specific file by its unique ID.

- **URL**: `/v1/file/:id`
- **Method**: `GET`

**Response (200 OK):**
```json
{
  "id": "uuid-1",
  "public_url": "/storage/proj_123/uuid-1.jpg",
  "low_res_url": "/storage/proj_123/low_uuid-1.jpg",
  ...
}
```
