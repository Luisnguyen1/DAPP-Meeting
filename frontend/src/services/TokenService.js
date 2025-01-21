class TokenService {
  constructor() {
    this.token = null;
    this.expiresAt = null;
  }

  async getToken(userId, roomId) {
    // Kiểm tra token hiện tại còn hạn không
    if (this.isTokenValid()) {
      return this.token;
    }

    try {
      const response = await fetch('/api/tokens', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
          room_id: roomId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get token');
      }

      const data = await response.json();
      this.token = data.token;
      this.expiresAt = new Date(data.expires_at);

      return this.token;
    } catch (error) {
      console.error('Error getting token:', error);
      throw error;
    }
  }

  isTokenValid() {
    if (!this.token || !this.expiresAt) {
      return false;
    }

    // Kiểm tra token còn hạn không (thêm 5 phút buffer)
    const now = new Date();
    const bufferTime = 5 * 60 * 1000; // 5 minutes
    return now.getTime() + bufferTime < new Date(this.expiresAt).getTime();
  }

  clearToken() {
    this.token = null;
    this.expiresAt = null;
  }
}

export default new TokenService(); 