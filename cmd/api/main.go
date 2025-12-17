package main

import (
	"log"
	"os"

	"github.com/deepakcodez/omstorage/internal/db"
	"github.com/deepakcodez/omstorage/internal/handler"
	"github.com/deepakcodez/omstorage/internal/models"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

func main() {
	// 1. Load Environment Variables
	// Try loading from .env, but don't crash if it's missing (Docker/Prod environment)
	if err := godotenv.Load(); err != nil {
		log.Println("Note: No .env file found or error loading it. Using environment variables.")
	}

	// 2. Setup Database
	if err := db.Connect(); err != nil {
		log.Printf("⚠️ Database connection failed: %v", err)
		log.Println("Server will start but DB features will fail.")
	} else if db.GetDB() != nil {
		log.Println("Running AutoMigrate...")
		if err := db.GetDB().AutoMigrate(&models.FileMetadata{}); err != nil {
			log.Printf("Migration failed: %v", err)
		}
	}

	// 3. Setup Gin Router
	router := gin.Default()

	// Setting a higher limit for multipart forms (e.g., 64 MiB) for videos.
	router.MaxMultipartMemory = 64 << 20 // 64 MiB

	// Retrieve config from .env or OS environment
	storageRoot := os.Getenv("STORAGE_ROOT")
	if storageRoot == "" {
		storageRoot = "./uploads"
	}
	publicPrefix := os.Getenv("PUBLIC_URL_PREFIX")
	if publicPrefix == "" {
		publicPrefix = "/storage"
	}

	// 4. Define Routes

	// UPLOAD Routes
	router.POST("/v1/upload/single/:projectID", handler.UploadSingleFile)
	router.POST("/v1/upload/multiple/:projectID", handler.UploadMultipleFiles)

	// RETRIEVAL Routes (Metadata/API)
	router.GET("/v1/files/:projectID", handler.GetImagesByOrganization)
	router.GET("/v1/file/:id", handler.GetImage)

	// Static File Serving
	router.Static(publicPrefix, storageRoot)

	// 5. Run Server
	port := os.Getenv("SERVER_PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("🚀 Server running on :%s", port)
	log.Printf("📂 Public storage prefix: %s", publicPrefix)
	if err := router.Run(":" + port); err != nil {
		log.Fatal("Server failed to start:", err)
	}
}
