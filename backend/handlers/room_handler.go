package handlers

import (
	"context"
	"net/http"
	"time"

	"meeting-room-system/backend/database"
	"meeting-room-system/backend/models"

	"github.com/labstack/echo/v4"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

func CreateRoom(c echo.Context) error {
	room := new(models.Room)
	if err := c.Bind(room); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	room.ID = primitive.NewObjectID()
	room.CreatedAt = time.Now()

	_, err := database.DB.Collection("rooms").InsertOne(context.Background(), room)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}

	return c.JSON(http.StatusCreated, room)
}

func GetRoom(c echo.Context) error {
	id := c.Param("id")
	objID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid room ID")
	}

	var room models.Room
	err = database.DB.Collection("rooms").FindOne(context.Background(), bson.M{"_id": objID}).Decode(&room)
	if err != nil {
		return echo.NewHTTPError(http.StatusNotFound, "Room not found")
	}

	return c.JSON(http.StatusOK, room)
}

func JoinRoom(c echo.Context) error {
	roomID := c.Param("id")
	objID, err := primitive.ObjectIDFromHex(roomID)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid room ID")
	}

	member := new(models.Member)
	if err := c.Bind(member); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	member.JoinedAt = time.Now()

	update := bson.M{
		"$push": bson.M{"members": member},
	}

	result := database.DB.Collection("rooms").FindOneAndUpdate(
		context.Background(),
		bson.M{"_id": objID},
		update,
	)

	if result.Err() != nil {
		return echo.NewHTTPError(http.StatusNotFound, "Room not found")
	}

	return c.JSON(http.StatusOK, member)
}
