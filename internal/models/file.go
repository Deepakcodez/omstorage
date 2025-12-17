package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type FileMetadata struct {
	ID             uuid.UUID `gorm:"type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	OrganizationID string    `gorm:"index" json:"organization_id"` // Also functions as ProjectID/Folder grouping
	FolderName     string    `gorm:"index" json:"folder_name"`     // logical folder
	OriginalName   string    `json:"original_name"`
	DiskPath       string    `json:"-"` // Internal path, do not expose
	PublicURL      string    `json:"public_url"`
	LowResURL      string    `json:"low_res_url"`
	BlurThumb      []byte    `json:"blur_thumb"` // stored as byte array (bytea)
	MimeType       string    `json:"mime_type"`
	Size           int64     `json:"size"`
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`
}

func (f *FileMetadata) BeforeCreate(tx *gorm.DB) (err error) {
	if f.ID == uuid.Nil {
		f.ID = uuid.New()
	}
	return
}
