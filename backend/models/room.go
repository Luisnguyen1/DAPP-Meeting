package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type Room struct {
	ID        primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	Name      string             `bson:"name" json:"name"`
	CreatedAt time.Time          `bson:"created_at" json:"created_at"`
	Members   []Member           `bson:"members" json:"members"`
	Settings  RoomSettings       `bson:"settings" json:"settings"`
}

type Member struct {
	ID       string    `bson:"id" json:"id"`
	Name     string    `bson:"name" json:"name"`
	JoinedAt time.Time `bson:"joined_at" json:"joined_at"`
}

type RoomSettings struct {
	MaxParticipants int  `bson:"max_participants" json:"max_participants"`
	IsPrivate       bool `bson:"is_private" json:"is_private"`
}
