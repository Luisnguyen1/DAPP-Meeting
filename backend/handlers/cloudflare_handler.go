package handlers

import (
	"bytes"
	"io"
	"log"
	"net/http"

	"github.com/labstack/echo/v4"
)

const (
	CloudflareBaseURL = "https://api.cloudflare.com"
	CloudflareEmail   = "luisaccforwork@gmail.com"
	CloudflareAPIKey  = "e62bb5ac15ba910c0cb41df6ec2d96ebca26d1b9642c3c55ce85e15519a12d5f"
	CloudflareAppID   = "92d2718adcea86e6e7ec920579d96932"
)

func ProxyCloudflareRequest(c echo.Context) error {
	// Log request details
	log.Printf("Received request: %s %s", c.Request().Method, c.Request().URL.Path)

	// Đọc body từ request gốc
	body, err := io.ReadAll(c.Request().Body)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}
	log.Printf("Request body: %s", string(body))

	// Tạo request mới đến Cloudflare
	path := c.Param("*")
	url := CloudflareBaseURL + "/" + path
	log.Printf("Forwarding to Cloudflare: %s", url)
	req, err := http.NewRequest(c.Request().Method, url, bytes.NewBuffer(body))
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}

	// Thêm headers xác thực
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+CloudflareAPIKey)

	// Gửi request
	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}
	defer resp.Body.Close()

	// Đọc response
	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}
	log.Printf("Cloudflare response: %s", string(respBody))

	// Copy response headers
	for k, v := range resp.Header {
		c.Response().Header()[k] = v
	}
	return c.Blob(resp.StatusCode, "application/json", respBody)
}
