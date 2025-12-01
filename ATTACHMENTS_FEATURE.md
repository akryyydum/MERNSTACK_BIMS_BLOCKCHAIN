# Attachments Feature for Reports & Complaints

## Overview
Added file attachment functionality allowing residents and admins to upload images and videos when creating/editing complaints and reports. Attachments are visible in the view modals for both admin and resident interfaces.

## Changes Made

### Backend Changes

#### 1. Model (complaint.model.js)
- Already had `attachments: [{ type: String }]` field to store filenames

#### 2. Controllers

**residentComplaintController.js:**
- Added file handling in `createComplaint()` - saves uploaded files to complaints folder
- Added file handling in `updateComplaint()` - allows adding more files to existing complaints
- Updated `deleteComplaint()` - cleans up associated files when complaint is deleted
- Added `downloadAttachment()` - endpoint for downloading/viewing attachments

**adminComplaintController.js:**
- Added file handling in `create()` - saves uploaded files
- Updated `delete()` - cleans up associated files when complaint is deleted
- Added `downloadAttachment()` - endpoint for admin to download/view attachments

#### 3. Routes

**residentComplaintRoutes.js:**
- Added multer configuration for file uploads
- Configured storage to `uploads/complaints/` directory
- Set file size limit to 10MB per file
- Added file filter to accept only images and videos (jpeg, jpg, png, gif, mp4, mov, avi, webm)
- Updated POST route to accept up to 5 files using `upload.array('attachments', 5)`
- Updated PUT route to accept additional files
- Added GET route for downloading attachments: `/:id/attachments/:filename`

**adminComplaintRoutes.js:**
- Added same multer configuration as resident routes
- Updated POST route to accept up to 5 files
- Added GET route for downloading attachments: `/:id/attachments/:filename`

### Frontend Changes

#### 1. Resident Interface (ResidentReportsComplaints.jsx)

**State Management:**
- Added `fileList` state for create form
- Added `editFileList` state for edit form

**Create Form:**
- Imported `Upload` and `UploadOutlined` from antd
- Added Upload component with picture-card layout
- Configured to accept up to 5 files
- Shows thumbnail previews of uploaded files
- Updated `handleCreate()` to send FormData with multipart/form-data

**Edit Form:**
- Added Upload component for adding additional attachments
- Updated `handleEdit()` to send new files along with form data

**View Modal:**
- Added attachments display section
- Shows image thumbnails in a grid (clickable to view full size)
- Shows video players with controls for video files
- Download option on hover for each attachment
- Uses API endpoint: `/api/resident/complaints/${id}/attachments/${filename}`

#### 2. Admin Interface (AdminReportsComplaints.jsx)

**State Management:**
- Added `fileList` state for create form

**Create Form:**
- Imported `Upload` and `UploadOutlined`
- Added Upload component with same configuration as resident form
- Updated `handleCreate()` to send FormData with files

**View Modal:**
- Added attachments display in Descriptions component
- Shows grid of image thumbnails and video players
- Links to download: `/api/admin/complaints/${id}/attachments/${filename}`

## File Upload Specifications

- **Allowed File Types:** Images (jpeg, jpg, png, gif) and Videos (mp4, mov, avi, webm)
- **Max Files:** 5 files per complaint/report
- **Max File Size:** 10MB per file
- **Storage Location:** `back/uploads/complaints/`
- **Filename Format:** `timestamp-randomstring.extension`

## API Endpoints

### Resident
- `POST /api/resident/complaints` - Create complaint with attachments
- `PUT /api/resident/complaints/:id` - Update complaint, add more attachments
- `GET /api/resident/complaints/:id/attachments/:filename` - Download/view attachment

### Admin
- `POST /api/admin/complaints` - Create complaint with attachments
- `GET /api/admin/complaints/:id/attachments/:filename` - Download/view attachment

## Usage

### For Residents:
1. Click "Submit New Report/Complaint"
2. Fill out the form
3. Click the upload area to add images/videos
4. Submit the form
5. View attachments in the complaint details

### For Admins:
1. Click "Create Report/Complaint"
2. Select resident and fill form
3. Upload attachments if needed
4. View all resident attachments in complaint details

## Security Notes
- Files are validated by extension and MIME type
- Only authenticated users can upload/download
- Residents can only access their own complaint attachments
- Admins can access all attachments
- File cleanup happens automatically on complaint deletion
