package handlers

import (
	"log"
	"net/http"
	"sync"
	"time"

	"github.com/gorilla/websocket"
	"github.com/labstack/echo/v4"
)

var (
	// Mutex để bảo vệ các map dùng chung
	mutex = &sync.RWMutex{}
	// Map lưu trữ kết nối WebSocket theo userId
	clients = make(map[string]*websocket.Conn)
	// Map lưu trữ danh sách người dùng trong mỗi phòng
	rooms = make(map[string]map[string]bool)
)

type WebSocketMessage struct {
	Type         string      `json:"type"`
	UserId       string      `json:"userId,omitempty"`
	TargetUserId string      `json:"targetUserId,omitempty"`
	Offer        interface{} `json:"offer,omitempty"`
	Answer       interface{} `json:"answer,omitempty"`
	Candidate    interface{} `json:"candidate,omitempty"`
}

func HandleWebSocket(c echo.Context) error {
	userId := c.QueryParam("userId")
	roomId := c.QueryParam("roomId")

	if userId == "" || roomId == "" {
		return echo.NewHTTPError(http.StatusBadRequest, "userId and roomId are required")
	}

	// Nâng cấp kết nối HTTP lên WebSocket
	upgrader := websocket.Upgrader{
		CheckOrigin: func(r *http.Request) bool {
			// Cho phép kết nối từ tất cả các origin trong môi trường development
			return true
			// Trong môi trường production, bạn nên kiểm tra origin cụ thể:
			// origin := r.Header.Get("Origin")
			// return origin == "http://your-allowed-domain.com"
		},
		HandshakeTimeout: 10 * time.Second,
	}

	ws, err := upgrader.Upgrade(c.Response(), c.Request(), nil)
	if err != nil {
		return err
	}

	// Thêm client mới vào room
	mutex.Lock()
	if _, exists := rooms[roomId]; !exists {
		rooms[roomId] = make(map[string]bool)
	}
	rooms[roomId][userId] = true
	clients[userId] = ws
	mutex.Unlock()

	log.Printf("User %s joined room %s", userId, roomId)

	// Thông báo cho các user khác trong room
	broadcastUserJoined(roomId, userId)

	// Gửi danh sách người dùng hiện tại cho user mới
	sendCurrentUsers(roomId, userId)

	defer func() {
		mutex.Lock()
		delete(rooms[roomId], userId)
		delete(clients, userId)
		ws.Close()
		mutex.Unlock()
		broadcastUserLeft(roomId, userId)
		log.Printf("User %s left room %s", userId, roomId)
	}()

	for {
		var msg WebSocketMessage
		err := ws.ReadJSON(&msg)
		if err != nil {
			log.Printf("Error reading message: %v", err)
			break
		}

		log.Printf("Received message: %+v", msg)

		// Forward message to target user
		if msg.TargetUserId != "" {
			mutex.RLock()
			if targetWs, exists := clients[msg.TargetUserId]; exists {
				msg.UserId = userId // Add sender's ID
				err = targetWs.WriteJSON(msg)
				if err != nil {
					log.Printf("Error forwarding message: %v", err)
				}
			}
			mutex.RUnlock()
		}
	}

	return nil
}

func sendCurrentUsers(roomId, newUserId string) {
	mutex.RLock()
	defer mutex.RUnlock()

	if roomUsers, exists := rooms[roomId]; exists {
		for userId := range roomUsers {
			if userId != newUserId {
				if ws, exists := clients[newUserId]; exists {
					msg := WebSocketMessage{
						Type:   "user-joined",
						UserId: userId,
					}
					ws.WriteJSON(msg)
				}
			}
		}
	}
}

func broadcastUserJoined(roomId, userId string) {
	mutex.RLock()
	defer mutex.RUnlock()

	msg := WebSocketMessage{
		Type:   "user-joined",
		UserId: userId,
	}

	if roomUsers, exists := rooms[roomId]; exists {
		for memberId := range roomUsers {
			if memberId != userId {
				if ws, exists := clients[memberId]; exists {
					ws.WriteJSON(msg)
				}
			}
		}
	}
}

func broadcastUserLeft(roomId, userId string) {
	mutex.RLock()
	defer mutex.RUnlock()

	msg := WebSocketMessage{
		Type:   "user-left",
		UserId: userId,
	}

	if roomUsers, exists := rooms[roomId]; exists {
		for memberId := range roomUsers {
			if memberId != userId {
				if ws, exists := clients[memberId]; exists {
					ws.WriteJSON(msg)
				}
			}
		}
	}
}
