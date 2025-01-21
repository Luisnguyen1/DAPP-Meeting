package handlers

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"net/http"
	"time"

	"github.com/labstack/echo/v4"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"

	"meeting-room-system/backend/database"
	"meeting-room-system/backend/models"
)

const (
	TokenExpiration = 24 * time.Hour
	TokenLength     = 32
)

func generateToken() (string, error) {
	bytes := make([]byte, TokenLength)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	return hex.EncodeToString(bytes), nil
}

func GenerateTemporaryToken(c echo.Context) error {
	// Lấy thông tin từ request
	type TokenRequest struct {
		UserID string `json:"user_id"`
		RoomID string `json:"room_id"`
	}

	req := new(TokenRequest)
	if err := c.Bind(req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	// Tạo token mới
	tokenStr, err := generateToken()
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Error generating token")
	}

	// Tạo document token
	token := &models.Token{
		ID:        primitive.NewObjectID(),
		Token:     tokenStr,
		UserID:    req.UserID,
		RoomID:    req.RoomID,
		ExpiresAt: time.Now().Add(TokenExpiration),
		CreatedAt: time.Now(),
	}

	// Lưu token vào database
	_, err = database.DB.Collection("tokens").InsertOne(context.Background(), token)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Error saving token")
	}

	return c.JSON(http.StatusOK, token)
}

func ValidateToken(c echo.Context) error {
	token := c.QueryParam("token")
	if token == "" {
		return echo.NewHTTPError(http.StatusBadRequest, "Token is required")
	}

	// Tìm token trong database
	var tokenDoc models.Token
	err := database.DB.Collection("tokens").FindOne(context.Background(), bson.M{
		"token": token,
		"expires_at": bson.M{
			"$gt": time.Now(),
		},
	}).Decode(&tokenDoc)

	if err != nil {
		return echo.NewHTTPError(http.StatusUnauthorized, "Invalid or expired token")
	}

	return c.JSON(http.StatusOK, tokenDoc)
}
