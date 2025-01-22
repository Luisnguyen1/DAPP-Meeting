package handlers

import (
    "log"
    "net/http"
    "sync"
    "github.com/gorilla/websocket"
    "github.com/labstack/echo/v4"
)

var (
    upgrader = websocket.Upgrader{
        CheckOrigin: func(r *http.Request) bool {
            return true // Allow all origins in development
        },
        ReadBufferSize:  1024,
        WriteBufferSize: 1024,
    }
    
    rooms      = make(map[string]map[string]*websocket.Conn)
    roomsMutex sync.RWMutex
)

type Message struct {
    Type        string      `json:"type"`
    RoomId      string      `json:"roomId"`
    UserId      string      `json:"userId"`
    TargetUserId string     `json:"targetUserId,omitempty"`
    Offer       interface{} `json:"offer,omitempty"`
    Answer      interface{} `json:"answer,omitempty"`
    Candidate   interface{} `json:"candidate,omitempty"`
}

func HandleWebSocket(c echo.Context) error {
    ws, err := upgrader.Upgrade(c.Response(), c.Request(), nil)
    if err != nil {
        log.Printf("WebSocket upgrade error: %v", err)
        return err
    }
    
    log.Printf("New WebSocket connection established")
    
    // Keep the connection alive
    go func() {
        defer ws.Close()
        for {
            var msg Message
            err := ws.ReadJSON(&msg)
            if err != nil {
                log.Printf("WebSocket read error: %v", err)
                handleUserDisconnect(ws)
                break
            }

            // Process the message based on its type
            switch msg.Type {
            case "join":
                handleJoinRoom(msg.RoomId, msg.UserId, ws)
            case "offer":
                handleOffer(msg, ws)
            case "answer":
                handleAnswer(msg, ws)
            case "ice-candidate":
                handleIceCandidate(msg, ws)
            }
        }
    }()

    return nil
}

// handleUserDisconnect removes the user from their room when they disconnect
func handleUserDisconnect(ws *websocket.Conn) {
    roomsMutex.Lock()
    defer roomsMutex.Unlock()

    // Find and remove user from their room
    for roomId, users := range rooms {
        for userId, conn := range users {
            if conn == ws {
                delete(rooms[roomId], userId)
                
                // Notify other users in the room about the disconnection
                for _, otherConn := range rooms[roomId] {
                    otherConn.WriteJSON(Message{
                        Type:   "user-left",
                        UserId: userId,
                        RoomId: roomId,
                    })
                }

                // Clean up empty room
                if len(rooms[roomId]) == 0 {
                    delete(rooms, roomId)
                }
                
                log.Printf("User %s disconnected from room %s", userId, roomId)
                return
            }
        }
    }
}

func handleJoinRoom(roomId string, userId string, ws *websocket.Conn) {
    roomsMutex.Lock()
    defer roomsMutex.Unlock()

    if rooms[roomId] == nil {
        rooms[roomId] = make(map[string]*websocket.Conn)
    }

    // Add new user to room
    rooms[roomId][userId] = ws

    // Notify existing users about new user and vice versa
    for existingUserId, conn := range rooms[roomId] {
        if existingUserId != userId {
            // Notify existing user about new user
            conn.WriteJSON(Message{
                Type:   "user-joined",
                UserId: userId,
                RoomId: roomId,
            })

            // Notify new user about existing user
            ws.WriteJSON(Message{
                Type:   "user-joined",
                UserId: existingUserId,
                RoomId: roomId,
            })
        }
    }

    log.Printf("User %s joined room %s", userId, roomId)
}

func handleOffer(msg Message, ws *websocket.Conn) {
    roomsMutex.RLock()
    defer roomsMutex.RUnlock()

    if targetConn := rooms[msg.RoomId][msg.TargetUserId]; targetConn != nil {
        targetConn.WriteJSON(msg)
    }
}

func handleAnswer(msg Message, ws *websocket.Conn) {
    roomsMutex.RLock()
    defer roomsMutex.RUnlock()

    if targetConn := rooms[msg.RoomId][msg.TargetUserId]; targetConn != nil {
        targetConn.WriteJSON(msg)
    }
}

func handleIceCandidate(msg Message, ws *websocket.Conn) {
    roomsMutex.RLock()
    defer roomsMutex.RUnlock()

    if targetConn := rooms[msg.RoomId][msg.TargetUserId]; targetConn != nil {
        targetConn.WriteJSON(msg)
    }
}
