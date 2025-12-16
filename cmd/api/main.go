package main;

import (
	"log"
	"os"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	"github.com/deepakcodez/omstorage/internal/handler" 
)

func main() {
	// 1. Load Environment Variables
	if err := godotenv.Load(); err != nil {
		log.Println("Note: No .env file found. Using environment variables.")
	}

	// 2. Setup Gin Router
	router := gin.Default()

	// Setting a higher limit for multipart forms (e.g., 64 MiB) for videos.
	// Default is 32 MiB. Adjust based on your server capacity and needs.
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

	// 3. Define Routes

	// UPLOAD Route (Accepts file and stores it)
	router.POST("/v1/upload/single/:projectID", handler.UploadSingleFile)

	// RETRIEVAL Route (Serves the file at a public URL)
	// We use Gin's Static function for simple serving, but the handler approach 
	// (shown in storage.go) is better for security/DB lookup.
	// This creates a route like: /storage/proj1/file-hash.jpg
	router.Static(publicPrefix, storageRoot)


	// 4. Run Server
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