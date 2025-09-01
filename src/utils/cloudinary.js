import {v2 as cloudinary} from "cloudinary";
import fs from "fs";

cloudinary.config(
    {
        cloud_name : process.env.CLOUDINARY_CLOUD_NAME ,
        api_key : process.env.CLOUDINARY_API_KEY ,
        api_secret : process.env.CLOUDINARY_API_SECRET 
    }
)

const uploadFileOnCloudinary = async (filePath) => {
        
    try {
        if(!filePath) return null;
        const response = await cloudinary.uploader.upload(filePath , {
            resource_type : "auto"
        })
        // console.log("File is upload on cloudinary" , response.url);
        fs.unlinkSync(filePath)
        console.log(response, "res");
        
        return response
        
    } catch (error) {
       fs.unlinkSync(filePath) // remove the locally saved file temporary as the upload operation got failed
       return null; 
    }
}

const deleteOnCloudinary = async (public_id, resource_type="image") => {
    try {
        if (!public_id) return null;

        //delete file from cloudinary
        const result = await cloudinary.uploader.destroy(public_id, {
            resource_type: `${resource_type}`
        });
    } catch (error) {
        return error;
        console.log("delete on cloudinary failed", error);
    }
};


export  {uploadFileOnCloudinary , deleteOnCloudinary}