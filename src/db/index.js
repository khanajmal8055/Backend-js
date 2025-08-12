import mongoose from "mongoose"
import {DB_NAME} from "../constants.js"

const databaseConnection = async () => {
    try {
       const connectionInstance =  await mongoose.connect(`${process.env.MONGODB_URL}/${DB_NAME}`)
       console.log(`\n MONGODB connected !! DB HOST ${connectionInstance.connection.host}`);

       

    } catch (error) {
        console.log("Database Connectivity Error :" , error);
        process.exit(1);
    }
}

export default databaseConnection