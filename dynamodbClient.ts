// NEVER TOUCH


require('dotenv').config()
// const {DynamoDBClient} = require("@aws-sdk/client-dynamodb")
import {DynamoDBClient} from "@aws-sdk/client-dynamodb"
// const {DynamoDBDocumentClient} = require("@aws-sdk/lib-dynamodb")
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb"

const accessKeyId = process.env.ACCESSKEY;
const secretAccessKey = process.env.SECRETACCESSKEY;

if (!accessKeyId || !secretAccessKey) {
    throw new Error("AWS credentials are not set in environment variables.");
}

const dbClient = new DynamoDBClient({
    region: "us-east-1",
    credentials: {
        accessKeyId,
        secretAccessKey
    }
})


const marshallOptions = {
    convertEmptyValues: false,
    removeUndefinedValues: false,
    convertClassInstanceToMap: false,
}

const unmarshallOptions = {
    wrapNumbers: false,
}

const translateConfig = { marshallOptions, unmarshallOptions}



export const documentClient = DynamoDBDocumentClient.from(dbClient, translateConfig)


// module.exports = documentClient;