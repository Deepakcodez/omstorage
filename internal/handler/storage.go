package handler

import (
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// UploadSingleFile handles a single file upload request.
// POST /v1/upload/single/:projectID
func UploadSingleFile(c *gin.Context) {
	// 1. Get Path Parameters
	projectID := c.Param("projectID")
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
	
	// Use a nested path structure for scalability (e.g., /uploads/projectID/first2/uuid.ext)
	// In a real system, you would sanitize projectID to prevent path traversal issues.
	storageRoot := os.Getenv("STORAGE_ROOT")
	if storageRoot == "" {
		storageRoot = "./uploads"
	}
	
	// Create project-specific upload directory if it doesn't exist
	// NOTE: This is where you implement the "folders for different projects" feature.
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

	// 5. Construct the Public URL (This is what you return to the client)
	// Example: /storage/proj1/52e6d62a-5a9f-43b5-9b37-d278a94663e2.jpg
	publicPrefix := os.Getenv("PUBLIC_URL_PREFIX")
	if publicPrefix == "" {
		publicPrefix = "/storage"
	}
	publicURL := fmt.Sprintf("%s/%s/%s", publicPrefix, projectID, uniqueFileName)
    
    // !!! CRITICAL NEXT STEP !!! 
    // This is where you would call your internal/service to save the metadata (publicURL, diskPath, original name, size, etc.) 
    // to your database (PostgreSQL/MySQL).

	c.JSON(http.StatusOK, gin.H{
		"message": "File uploaded successfully",
		"original_filename": file.Filename,
		"size_bytes": file.Size,
		"public_url": publicURL,
	})
}