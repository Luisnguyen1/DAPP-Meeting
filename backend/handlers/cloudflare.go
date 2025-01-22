package handlers

// import (
// 	"encoding/json"
// 	"fmt"
// 	"net/http"
// 	"io"
// 	"github.com/labstack/echo/v4"
// )

// const (
// 	CLOUDFLARE_APP_ID     = "fc7fdab8c9f9250624fa046ee52c3c5d"
// 	CLOUDFLARE_APP_TOKEN  = "2d503c1e7b2fd21bfee9ea52c967593b04ce352fc2ceb55031f3f41e6a9dd149"
// 	CLOUDFLARE_API_BASE   = "https://rtc.live.cloudflare.com/v1/apps"
// )

// func CreateCloudflareSession(c echo.Context) error {
// 	resp, err := http.Post(
// 		fmt.Sprintf("%s/%s/sessions/new", CLOUDFLARE_API_BASE, CLOUDFLARE_APP_ID),
// 		"application/json",
// 		nil,
// 	)
// 	if err != nil {
// 		return c.JSON(http.StatusInternalServerError, map[string]string{"error": err.Error()})
// 	}
// 	defer resp.Body.Close()

// 	var result map[string]interface{}
// 	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
// 		return c.JSON(http.StatusInternalServerError, map[string]string{"error": err.Error()})
// 	}

// 	return c.JSON(http.StatusOK, result)
// }

// func HandleCloudflareTracksPush(c echo.Context) error {
// 	sessionId := c.Param("sessionId")
// 	url := fmt.Sprintf("%s/%s/sessions/%s/tracks/new", CLOUDFLARE_API_BASE, CLOUDFLARE_APP_ID, sessionId)
	
// 	return proxyCloudflareRequest(c, url, "POST")
// }

// func HandleCloudflareRenegotiate(c echo.Context) error {
// 	sessionId := c.Param("sessionId")
// 	url := fmt.Sprintf("%s/%s/sessions/%s/renegotiate", CLOUDFLARE_API_BASE, CLOUDFLARE_APP_ID, sessionId)
	
// 	return proxyCloudflareRequest(c, url, "PUT")
// }

// func DeleteCloudflareSession(c echo.Context) error {
// 	sessionId := c.Param("sessionId")
// 	url := fmt.Sprintf("%s/%s/sessions/%s", CLOUDFLARE_API_BASE, CLOUDFLARE_APP_ID, sessionId)
	
// 	return proxyCloudflareRequest(c, url, "DELETE")
// }

// func proxyCloudflareRequest(c echo.Context, url string, method string) error {
// 	client := &http.Client{}
	
// 	req, err := http.NewRequest(method, url, c.Request().Body)
// 	if err != nil {
// 		return c.JSON(http.StatusInternalServerError, map[string]string{"error": err.Error()})
// 	}

// 	req.Header.Set("Authorization", "Bearer "+CLOUDFLARE_APP_TOKEN)
// 	req.Header.Set("Content-Type", "application/json")

// 	resp, err := client.Do(req)
// 	if err != nil {
// 		return c.JSON(http.StatusInternalServerError, map[string]string{"error": err.Error()})
// 	}
// 	defer resp.Body.Close()

// 	body, err := io.ReadAll(resp.Body)
// 	if err != nil {
// 		return c.JSON(http.StatusInternalServerError, map[string]string{"error": err.Error()})
// 	}

// 	return c.JSONBlob(resp.StatusCode, body)
// }

import (
	"encoding/json"
	"fmt"
	"net/http"
	"io"
	"github.com/labstack/echo/v4"
)

const (
	CLOUDFLARE_APP_ID     = "fc7fdab8c9f9250624fa046ee52c3c5d"
	CLOUDFLARE_APP_TOKEN  = "2d503c1e7b2fd21bfee9ea52c967593b04ce352fc2ceb55031f3f41e6a9dd149"
	CLOUDFLARE_API_BASE   = "https://rtc.live.cloudflare.com/v1/apps"
)

func CreateCloudflareSession(c echo.Context) error {
	resp, err := http.Post(
		fmt.Sprintf("%s/%s/sessions/new", CLOUDFLARE_API_BASE, CLOUDFLARE_APP_ID),
		"application/json",
		nil,
	)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": err.Error()})
	}
	defer resp.Body.Close()

	var result map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": err.Error()})
	}

	return c.JSON(http.StatusOK, result)
}

func HandleCloudflareTracksPush(c echo.Context) error {
	sessionId := c.Param("sessionId")
	url := fmt.Sprintf("%s/%s/sessions/%s/tracks/new", CLOUDFLARE_API_BASE, CLOUDFLARE_APP_ID, sessionId)
	
	return proxyCloudflareRequest(c, url, "POST")
}

func HandleCloudflareRenegotiate(c echo.Context) error {
	sessionId := c.Param("sessionId")
	url := fmt.Sprintf("%s/%s/sessions/%s/renegotiate", CLOUDFLARE_API_BASE, CLOUDFLARE_APP_ID, sessionId)
	
	return proxyCloudflareRequest(c, url, "PUT")
}

func DeleteCloudflareSession(c echo.Context) error {
	sessionId := c.Param("sessionId")
	url := fmt.Sprintf("%s/%s/sessions/%s", CLOUDFLARE_API_BASE, CLOUDFLARE_APP_ID, sessionId)
	
	return proxyCloudflareRequest(c, url, "DELETE")
}

func proxyCloudflareRequest(c echo.Context, url string, method string) error {
	client := &http.Client{}
	
	req, err := http.NewRequest(method, url, c.Request().Body)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": err.Error()})
	}

	req.Header.Set("Authorization", "Bearer "+CLOUDFLARE_APP_TOKEN)
	req.Header.Set("Content-Type", "application/json")

	resp, err := client.Do(req)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": err.Error()})
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": err.Error()})
	}

	return c.JSONBlob(resp.StatusCode, body)
}
