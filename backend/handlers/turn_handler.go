package handlers

import (
	"bytes"
	"encoding/json"
	"net/http"

	"log"

	"github.com/labstack/echo/v4"
)

const (
	TurnTokenID  = "38e23f8f161ce32608ef96ceb21988bb"
	TurnAPIToken = "90929190349329ce549f746877fbb05209428f73f9c9d6c007733e874033081b"
)

type TurnCredentials struct {
	IceServers struct {
		Urls       []string `json:"urls"`
		Username   string   `json:"username"`
		Credential string   `json:"credential"`
	} `json:"iceServers"`
}

func GetTurnCredentials(c echo.Context) error {
	url := "https://rtc.live.cloudflare.com/v1/turn/keys/" + TurnTokenID + "/credentials/generate"
	body := map[string]interface{}{
		"ttl": 86400, // Thời gian sống của credentials, có thể điều chỉnh
	}
	jsonBody, err := json.Marshal(body)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}

	req, err := http.NewRequest("POST", url, bytes.NewBuffer(jsonBody))
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+TurnAPIToken)

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}
	defer resp.Body.Close()

	var credentials TurnCredentials
	if err := json.NewDecoder(resp.Body).Decode(&credentials); err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}

	// Log credentials for debugging
	log.Printf("TURN Credentials - Username: %s, Credential: %s", credentials.IceServers.Username, credentials.IceServers.Credential)

	return c.JSON(http.StatusOK, credentials)
}
