package models

import (
	"time"
	"gorm.io/gorm"
)

type BusinessRecord struct {
	ID          uint           `json:"id" gorm:"primaryKey"`
	Title       string         `json:"title" gorm:"not null"`
	Description string         `json:"description"`
	Category    string         `json:"category"`
	Status      string         `json:"status" gorm:"default:active"`
	Priority    int            `json:"priority" gorm:"default:1"`
	UserID      string         `json:"user_id" gorm:"not null"`
	Metadata    string         `json:"metadata" gorm:"type:json"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `json:"-" gorm:"index"`
}

type CreateBusinessRecordRequest struct {
	Title       string `json:"title" validate:"required"`
	Description string `json:"description"`
	Category    string `json:"category"`
	Priority    int    `json:"priority"`
	Metadata    string `json:"metadata"`
}

type UpdateBusinessRecordRequest struct {
	Title       string `json:"title"`
	Description string `json:"description"`
	Category    string `json:"category"`
	Status      string `json:"status"`
	Priority    int    `json:"priority"`
	Metadata    string `json:"metadata"`
}