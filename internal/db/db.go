package db

import (
	"fmt"
	"log"
	"os"
	"time"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

var DB *gorm.DB

func Connect() error {
	// Allow configuring SSL mode and TimeZone, with defaults
	sslMode := os.Getenv("DB_SSLMODE")
	if sslMode == "" {
		sslMode = "require" // Default to require for NeonDB/Production
	}

	timeZone := os.Getenv("DB_TIMEZONE")
	if timeZone == "" {
		timeZone = "Asia/Kolkata" // Matching user's likely timezone
	}

	dsn := fmt.Sprintf("host=%s user=%s password='%s' dbname=%s port=%s sslmode=%s TimeZone=%s",
		os.Getenv("DB_HOST"),
		os.Getenv("DB_USER"),
		os.Getenv("DB_PASSWORD"),
		os.Getenv("DB_NAME"),
		os.Getenv("DB_PORT"),
		sslMode,
		timeZone,
	)

	// Retry logic or just simple connect
	var err error
	var db *gorm.DB

	// Initial panic protection
	defer func() {
		if r := recover(); r != nil {
			log.Printf("Recovered from GORM panic: %v", r)
			err = fmt.Errorf("panic during db connection")
		}
	}()

	db, err = gorm.Open(postgres.Open(dsn), &gorm.Config{
		NowFunc: func() time.Time {
			return time.Now().Local()
		},
	})

	if err != nil {
		log.Printf("Failed to connect to database: %v", err)
		return err
	}

	DB = db
	log.Println("✅ Database connected successfully")
	return nil
}

func GetDB() *gorm.DB {
	return DB
}
