import dotenv from "dotenv"
import databaseConnection from "./db/index.js";
import {app} from "./app.js" 

dotenv.config(
    {
        path : "./env"
    }
)

databaseConnection()
.then(()=>{

    app.on("error" , (error) => {
            console.log("Error" , error);
            throw err
        })
       
    app.listen(process.env.PORT || 8000 , () => {
        console.log(`Server is running at  port ${process.env.PORT}`);
        
    })
})
.catch((err) => {
    console.log('Database Connection failed' , err);
    
})




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