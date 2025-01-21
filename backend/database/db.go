package database

import "go.mongodb.org/mongo-driver/mongo"

var DB *mongo.Database

func SetDB(database *mongo.Database) {
	DB = database
}
