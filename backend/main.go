package main

import (
	"context"
	"log"
	"net/http"

	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"

	"meeting-room-system/backend/database"
	"meeting-room-system/backend/handlers"
)

func main() {
	// Kết nối MongoDB
	client, err := mongo.Connect(context.Background(), options.Client().ApplyURI("mongodb+srv://meeting:admin@cluster0.pdbzo.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"))
	if err != nil {
		log.Fatal(err)
	}
	defer client.Disconnect(context.Background())

	// Kiểm tra kết nối
	err = client.Ping(context.Background(), nil)
	if err != nil {
		log.Fatal("Could not connect to MongoDB:", err)
	}
	log.Println("Connected to MongoDB successfully")

	database.SetDB(client.Database("meeting_room"))

	// Khởi tạo Echo
	e := echo.New()

	// Middleware
	e.Use(middleware.Logger())
	e.Use(middleware.Recover())
	e.Use(middleware.CORSWithConfig(middleware.CORSConfig{
		AllowOrigins:     []string{"*"},
		AllowMethods:     []string{http.MethodGet, http.MethodPost, http.MethodPut, http.MethodDelete, http.MethodOptions},
		AllowHeaders:     []string{echo.HeaderOrigin, echo.HeaderContentType, echo.HeaderAccept, echo.HeaderAuthorization},
		AllowCredentials: true,
	}))

	// Routes
	setupRoutes(e)

	// Thay thế phần start server với SSL bằng HTTP thông thường
	serverAddr := ":8080"
	e.Logger.Fatal(e.Start(serverAddr)) // Sử dụng HTTP thay vì HTTPS
}

func setupRoutes(e *echo.Echo) {
	// Room routes
	e.POST("/api/rooms", handlers.CreateRoom)
	e.GET("/api/rooms/:id", handlers.GetRoom)
	e.POST("/api/rooms/:id/join", handlers.JoinRoom)

	// Token routes
	e.POST("/api/tokens", handlers.GenerateTemporaryToken)
	e.GET("/api/tokens/validate", handlers.ValidateToken)

	e.GET("/ws", handlers.HandleWebSocket)

	// Cloudflare proxy routes
	e.Any("/cloudflare/*", handlers.ProxyCloudflareRequest)

	// TURN credentials route
	e.GET("/api/turn-credentials", handlers.GetTurnCredentials)
}
