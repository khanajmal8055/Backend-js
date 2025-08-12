import dotenv from "dotenv"
import databaseConnection from "./db/index.js";

dotenv.config(
    {
        path : "./env"
    }
)

databaseConnection()




/*
import express from "express"
const app = express()

;(async ()=> {
    try {
        await mongoose.connect(`${process.env.MONGODB_URL}/${DB_NAME}`)
        app.on("error" , (error) => {
            console.log("Error" , error);
            throw err
        })
        app.listen(process.env.PORT , () => {
            console.log(`App listening on port : ${process.env.PORT}` );
            
        })
    } catch (error) {
        console.log("Error" , error);
        
    }
})()

*/