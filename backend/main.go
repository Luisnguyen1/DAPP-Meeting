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

const (
	CLOUDFLARE_APP_ID     = "fc7fdab8c9f9250624fa046ee52c3c5d"
	CLOUDFLARE_APP_TOKEN  = "2d503c1e7b2fd21bfee9ea52c967593b04ce352fc2ceb55031f3f41e6a9dd149"
	CLOUDFLARE_API_BASE   = "https://rtc.live.cloudflare.com/v1/apps"
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
		AllowHeaders:     []string{
			echo.HeaderOrigin, 
			echo.HeaderContentType, 
			echo.HeaderAccept, 
			echo.HeaderAuthorization,
			"Sec-WebSocket-Key",
			"Sec-WebSocket-Version",
			"Sec-WebSocket-Extensions",
			"Sec-WebSocket-Protocol",
			"Upgrade",
			"Connection",
		},
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

	// WebSocket route - make sure this is before other routes
	e.GET("/ws", handlers.HandleWebSocket)

	// Cloudflare proxy routes
	e.Any("/cloudflare/*", handlers.ProxyCloudflareRequest)

	// Add Cloudflare proxy routes
	e.POST("/api/cloudflare/sessions/new", handlers.CreateCloudflareSession)
	e.POST("/api/cloudflare/sessions/:sessionId/tracks/new", handlers.HandleCloudflareTracksPush)
	e.PUT("/api/cloudflare/sessions/:sessionId/renegotiate", handlers.HandleCloudflareRenegotiate)
	e.DELETE("/api/cloudflare/sessions/:sessionId", handlers.DeleteCloudflareSession)
}

// Remove the old TURN credentials route as it's no longer needed
// e.GET("/api/turn-credentials", handlers.GetTurnCredentials)
