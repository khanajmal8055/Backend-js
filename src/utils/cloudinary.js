import {v2 as cloudinary} from "cloudinary";
import fs from "fs";

cloudinary.config(
    {
        cloud_name : process.env.CLOUDINARY_CLOUD_NAME ,
        api_key : process.env.CLOUDINARY_API_KEY ,
        api_secret : CLOUDINARY_API_SECRET 
    }
)

const uploadFileOnCloudinary = async (filePath) => {
    try {
        if(!filePath) return null;
        const response = await cloudinary.uploader.upload(filePath , {
            resource_type : "auto"
        })
        console.log("File is upload on cloudinary" , response.url);
        return response
        
    } catch (error) {
       fs.unlinkSync(filePath) // remove the locally saved file temporary as the upload operation got failed
       return null; 
    }
}


export  {uploadFileOnCloudinary}