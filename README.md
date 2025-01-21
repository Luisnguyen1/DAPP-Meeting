# Hệ Thống Phòng Họp Trực Tuyến

Hệ thống phòng họp trực tuyến cho phép người dùng tạo và tham gia các phòng họp video với các tính năng như chat, chia sẻ màn hình và điều khiển âm thanh/video.

## Kiến Trúc Hệ Thống

### Backend (Golang)
- Server xử lý API RESTful và WebSocket
- Sử dụng MongoDB để lưu trữ dữ liệu
- Tích hợp với Cloudflare để xử lý video stream

### Frontend (ReactJS)
- Giao diện người dùng được xây dựng bằng Material-UI
- Quản lý state và routing
- Xử lý WebRTC và WebSocket để kết nối video

## API Endpoints

### Quản Lý Phòng Họp
- `POST /api/rooms` - Tạo phòng họp mới
- `GET /api/rooms/:id` - Lấy thông tin phòng họp
- `POST /api/rooms/:id/join` - Tham gia phòng họp

### Xác Thực
- `POST /api/tokens` - Tạo token tạm thời
- `GET /api/tokens/validate` - Xác thực token

### Kết Nối Video
- `GET /ws` - WebSocket endpoint cho kết nối video
- `GET /api/turn-credentials` - Lấy thông tin TURN server
- `ANY /cloudflare/*` - Proxy cho Cloudflare API

## Luồng Hoạt Động

1. **Tạo Phòng**
   - Người dùng tạo phòng mới từ trang chủ
   - Backend tạo phòng trong MongoDB và trả về ID

2. **Tham Gia Phòng**
   - Người dùng nhập ID phòng
   - Backend xác thực và cho phép tham gia
   - Frontend khởi tạo kết nối WebSocket

3. **Kết Nối Video**
   - Frontend lấy stream video/audio từ thiết bị
   - Thiết lập kết nối WebRTC qua TURN server
   - Trao đổi SDP và ICE candidates qua WebSocket

4. **Chat và Điều Khiển**
   - Tin nhắn chat được gửi qua WebSocket
   - Điều khiển âm thanh/video được xử lý cục bộ
   - Chia sẻ màn hình thông qua WebRTC

## Cài Đặt và Chạy

1. **Backend**
```sh
cd backend
go mod download
go run main.go
``` 
2. **Frontend**
Yêu Cầu Hệ Thống
Go 1.23.5 trở lên
Node.js 14 trở lên
MongoDB
Tài khoản Cloudflare (cho TURN server)

```sh
cd frontend
npm install
npm start
```