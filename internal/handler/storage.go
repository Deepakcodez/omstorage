package handler

import (
	"fmt"
	_ "image/jpeg" // Register JPEG format
	_ "image/png"  // Register PNG format
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"go.n16f.net/thumbhash"

	"github.com/deepakcodez/omstorage/internal/db"
	"github.com/deepakcodez/omstorage/internal/models"
	"github.com/disintegration/imaging"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

func generateBlurThumb(diskPath string) ([]byte, error) {
	// 1. Open the file
	src, err := imaging.Open(diskPath)
	if err != nil {
		return nil, err
	}

	// 2. Resize to fit in 100x100 to optimize ThumbHash generation
	// ThumbHash works best with small images (~100x100)
	src = imaging.Fit(src, 100, 100, imaging.Lanczos)

	// 3. Encode to ThumbHash
	hash := thumbhash.EncodeImage(src)

	return hash, nil
}

// generateLowRes saves a tiny low-quality blurred version to disk and returns the relative filename
func generateLowRes(diskPath string, projectDir string, uniqueName string) (string, error) {
	src, err := imaging.Open(diskPath)
	if err != nil {
		return "", err
	}

	// resizing to 20px
	lowResImg := imaging.Resize(src, 20, 0, imaging.Lanczos)
	blurred := imaging.Blur(lowResImg, 2.0)

	// Force JPG extension
	baseName := strings.TrimSuffix(uniqueName, filepath.Ext(uniqueName))
	lowResName := "low_" + baseName + ".jpg"
	lowResPath := filepath.Join(projectDir, lowResName)

	// Save with lower quality
	if err := imaging.Save(blurred, lowResPath, imaging.JPEGQuality(40)); err != nil {
		return "", err
	}

	return lowResName, nil
}

// UploadSingleFile handles a single file upload request.
// POST /v1/upload/single/:projectID
func UploadSingleFile(c *gin.Context) {
	// 1. Get Path Parameters
	projectID := c.Param("projectID")
	folderName := c.DefaultQuery("folder", "default") // logical folder support
	if projectID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Project ID is required"})
		return
	}

	// 2. Get the file from the request
	file, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No file received or wrong form key (expected 'file')"})
		return
	}

	// SECURITY: Generate a unique, secure filename
	fileExt := filepath.Ext(file.Filename)
	uniqueFileName := uuid.New().String() + fileExt
	newFileID := uuid.New() // Generate ID upfront to return even on DB failure

	// Use a nested path structure
	storageRoot := os.Getenv("STORAGE_ROOT")
	if storageRoot == "" {
		storageRoot = "./uploads"
	}

	// Create project-specific upload directory if it doesn't exist
	projectDir := filepath.Join(storageRoot, projectID)
	if err := os.MkdirAll(projectDir, os.ModePerm); err != nil {
		log.Printf("Error creating project directory: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not prepare storage path"})
		return
	}

	// 3. Define the path on the disk
	diskPath := filepath.Join(projectDir, uniqueFileName)

	// 4. Save the file to the disk
	if err := c.SaveUploadedFile(file, diskPath); err != nil {
		log.Printf("Error saving file: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Unable to save the file"})
		return
	}

	// 5. Construct the Public URL
	publicPrefix := os.Getenv("PUBLIC_URL_PREFIX")
	if publicPrefix == "" {
		publicPrefix = "/storage"
	}
	publicURL := fmt.Sprintf("%s/%s/%s", publicPrefix, projectID, uniqueFileName)

	// 6. Generate Blur Thumb and Low Res (if image)
	var blurThumb []byte
	var lowResURL string

	contentType := file.Header.Get("Content-Type")
	// Simple check based on extension or content-type
	if strings.HasPrefix(contentType, "image/") {
		// Blur Thumb (Ram)
		bt, err := generateBlurThumb(diskPath)
		if err == nil {
			blurThumb = bt
		}

		// Low Res (Disk)
		if lrName, err := generateLowRes(diskPath, projectDir, uniqueFileName); err == nil {
			lowResURL = fmt.Sprintf("%s/%s/%s", publicPrefix, projectID, lrName)
		} else {
			log.Printf("Failed to generate low res for %s: %v", uniqueFileName, err)
		}
	}

	// 7. Save Metadata to DB
	fileRecord := models.FileMetadata{
		ID:             newFileID,
		OrganizationID: projectID,
		FolderName:     folderName,
		OriginalName:   file.Filename,
		DiskPath:       diskPath,
		PublicURL:      publicURL,
		LowResURL:      lowResURL,
		BlurThumb:      blurThumb,
		MimeType:       contentType,
		Size:           file.Size,
	}

	if db.GetDB() != nil {
		if err := db.GetDB().Create(&fileRecord).Error; err != nil {
			log.Printf("Error saving metadata: %v", err)
		}
	} else {
		log.Println("⚠️ DB is nil, metadata not saved.")
	}

	c.JSON(http.StatusOK, gin.H{
		"message":           "File uploaded successfully",
		"id":                fileRecord.ID,
		"original_filename": file.Filename,
		"size_bytes":        file.Size,
		"public_url":        publicURL,
		"low_res_url":       lowResURL,
		"blur_thumb_len":    len(blurThumb),
	})
}

// UploadMultipleFiles handles multiple file (images/videos) uploads.
// POST /v1/upload/multiple/:projectID
func UploadMultipleFiles(c *gin.Context) {
	projectID := c.Param("projectID")
	folderName := c.DefaultQuery("folder", "default")
	if projectID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Project ID is required"})
		return
	}

	form, err := c.MultipartForm()
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Error parsing multipart form"})
		return
	}

	files := form.File["files"]
	if len(files) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No files found in 'files' key"})
		return
	}

	storageRoot := os.Getenv("STORAGE_ROOT")
	if storageRoot == "" {
		storageRoot = "./uploads"
	}
	projectDir := filepath.Join(storageRoot, projectID)
	if err := os.MkdirAll(projectDir, os.ModePerm); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not prepare storage path"})
		return
	}

	publicPrefix := os.Getenv("PUBLIC_URL_PREFIX")
	if publicPrefix == "" {
		publicPrefix = "/storage"
	}

	var results []gin.H

	for _, file := range files {
		fileExt := filepath.Ext(file.Filename)
		uniqueFileName := uuid.New().String() + fileExt
		newFileID := uuid.New()

		diskPath := filepath.Join(projectDir, uniqueFileName)

		if err := c.SaveUploadedFile(file, diskPath); err != nil {
			log.Printf("Error saving file %s: %v", file.Filename, err)
			continue
		}

		publicURL := fmt.Sprintf("%s/%s/%s", publicPrefix, projectID, uniqueFileName)

		// Generate Blur Thumb and Low Res if image
		var blurThumb []byte
		var lowResURL string
		contentType := file.Header.Get("Content-Type")

		if strings.HasPrefix(contentType, "image/") {
			bt, err := generateBlurThumb(diskPath)
			if err == nil {
				blurThumb = bt
			}
			if lrName, err := generateLowRes(diskPath, projectDir, uniqueFileName); err == nil {
				lowResURL = fmt.Sprintf("%s/%s/%s", publicPrefix, projectID, lrName)
			}
		}

		fileRecord := models.FileMetadata{
			ID:             newFileID,
			OrganizationID: projectID,
			FolderName:     folderName,
			OriginalName:   file.Filename,
			DiskPath:       diskPath,
			PublicURL:      publicURL,
			LowResURL:      lowResURL,
			BlurThumb:      blurThumb,
			MimeType:       contentType,
			Size:           file.Size,
		}

		if db.GetDB() != nil {
			db.GetDB().Create(&fileRecord)
		}

		results = append(results, gin.H{
			"id":            fileRecord.ID,
			"original_name": file.Filename,
			"public_url":    publicURL,
			"low_res_url":   lowResURL,
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"uploaded_files": results,
		"count":          len(results),
	})
}

// GetImagesByOrganization retrieves files for a specific organization/project.
// GET /v1/files/:projectID
// Query Params: folder (optional)
func GetImagesByOrganization(c *gin.Context) {
	projectID := c.Param("projectID")
	folderName := c.Query("folder")

	var files []models.FileMetadata
	query := db.GetDB().Where("organization_id = ?", projectID)

	if folderName != "" {
		query = query.Where("folder_name = ?", folderName)
	}

	// Optional: Filter by mime type to only get images if requested
	// query = query.Where("mime_type LIKE ?", "image/%")

	if err := query.Find(&files).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}

	c.JSON(http.StatusOK, files)
}

// GetImage retrieves metadata for a single image/file.
// GET /v1/file/:id
func GetImage(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID is required"})
		return
	}

	var file models.FileMetadata
	if err := db.GetDB().Where("id = ?", id).First(&file).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "File not found"})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		}
		return
	}

	c.JSON(http.StatusOK, file)
}
