# Blog Management - Bulk Actions API Documentation

## Base URL
`https://api.nexus.com/api/admin`

## Authentication
All endpoints require authentication. Include the Bearer token in the Authorization header:
```
Authorization: Bearer your_access_token_here
```

## Bulk Delete Blogs

### Request
```http
POST /blogs/bulk/delete
```

#### Body
```json
{
    "ids": [1, 2, 3]
}
```

#### Response
```json
{
    "status": "success",
    "message": "3 blogs deleted successfully",
    "data": null
}
```

## Bulk Update Blog Status

### Request
```http
POST /blogs/bulk/update-status
```

#### Body
```json
{
    "ids": [1, 2, 3],
    "status": true
}
```

#### Response
```json
{
    "status": "success",
    "message": "Status updated for 3 blogs",
    "data": null
}
```

## Bulk Update Blog Category

### Request
```http
POST /blogs/bulk/update-category
```

#### Body
```json
{
    "ids": [1, 2, 3],
    "category": "guides"
}
```

#### Response
```json
{
    "status": "success",
    "message": "Category updated for 3 blogs",
    "data": null
}
```

## Mark Blog as Hero

### Request
```http
POST /blogs/bulk/mark-as-hero
```

#### Body
```json
{
    "id": 1
}
```

#### Response
```json
{
    "status": "success",
    "message": "Blog marked as hero successfully",
    "data": {
        // Blog resource
    }
}
```

## Bulk Update Multiple Fields

### Request
```http
POST /blogs/bulk/update
```

#### Body
```json
{
    "ids": [1, 2, 3],
    "is_active": true,
    "category": "trending"
}
```

#### Response
```json
{
    "status": "success",
    "message": "Updated 3 blogs",
    "data": null
}
```

## Error Responses

### 401 Unauthorized
```json
{
    "status": "error",
    "message": "Unauthenticated."
}
```

### 403 Forbidden
```json
{
    "status": "error",
    "message": "You do not have the required permissions."
}
```

### 422 Unprocessable Entity
```json
{
    "status": "error",
    "message": "The given data was invalid.",
    "errors": {
        "ids": ["The ids field is required."],
        "ids.0": ["The selected ids.0 is invalid."]
    }
}
```
