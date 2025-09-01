import asyncHandler from "../utils/asyncHandler.js";
import {User} from "../models/user.models.js";
import  {ApiError} from "../utils/ApiError.js";
import {uploadFileOnCloudinary} from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
 
const generateAccessAndRefreshToken = async(userId) => {
    try {
        const user = await User.findById(userId)
        const refreshToken = user.generateRefreshToken()
        const accessToken = user.generateAccessToken()

        user.refreshToken = refreshToken

        await user.save({validateBeforeSave : false})

        return {refreshToken , accessToken}


    } catch (error) {
        throw new ApiError(500,"Something went wrong while generating access and refresh tokens")
    }
}

const registerUser = asyncHandler( async (req,res) => {
    
    // get user details from the frontend
    // validate the user details - not empty
    // check if user is alreday existed - using username and email
    // check for images
    // check for avatar
    // upload then to cloudinary , check avatar
    // create user object - to upload on db - .create method
    // remove password and refreh token field from response
    // check for user creation
    // retrun response

    const {fullName, email , username, password} =  req.body
   
    console.log(req.body , "body");
    

    if ([ fullName,email,username,password ].some((field) => field?.trim() === "" )) {
        throw new ApiError(400,"All fields are Required")
    }
    
    const existedUser = await User.findOne({
        $or: [{ username } , { email }]
    })

    if(existedUser){
        throw new ApiError(409,"User with username is alreday Existed")
    }

    console.log(req.files, "files");
    

    const avatarLocalPath =  req.files?.avatar[0]?.path
    console.log(avatarLocalPath);

    // const coverImageLocalPath = req.files?.coverImage[0]?.path
    
    let coverImageLocalPath;
    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0){
        coverImageLocalPath = req.files.coverImage[0].path
    }

    if (!avatarLocalPath) {
        throw new ApiError(400,"Avatar needed")
    }

    const avatar = await uploadFileOnCloudinary(avatarLocalPath)

    const coverImage = await uploadFileOnCloudinary(coverImageLocalPath)

    if (!avatar) {
        throw new ApiError(400,"Avatar is required")
    }

    const user = await User.create({
        fullName,
        username : username.toLowerCase(),
        email,
        password,
        avatar : avatar.url,
        coverImage : coverImage?.url || ""
    })

    const createdUser = await User.findById(user._id).select("-password -refreshToken" )

    if (!createdUser) {
        throw new ApiError(500, "Something went wrong while registring  a user")
    }


    return res.status(201).json(
        new ApiResponse(200,createdUser,"User registered Successfully")
    )
    
    

   
} )

const loginUser  = asyncHandler( async (req, res) => {

    // req.body -> data
    // username or email need for login
    // find the user
    // check password
    // if password match then generate access and refresh token
    // send cookie
    // retrun response



    // access data
    const {email , username , password} = req.body;

    // check for username or email
    if(!email && !username){
        throw new ApiError(400 , "username or emai is required")
    }

    // finding the user from database 
    const user = await User.findOne({
        $or : [{email} , {username}]
    })

    if(!user){
        throw new ApiError(404, "User does not exists")
    }

    const isPasswordValid = await user.isPasswordCorrect(password)

    if(!isPasswordValid){
        throw new ApiError(401, "Password is incorrect")
    }

    const {refreshToken , accessToken} = await generateAccessAndRefreshToken(user._id)

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

    const option = {
        httpOnly : true,
        secure : true
    }

    return res
    .status(200)
    .cookie("accessToken", accessToken,option)
    .cookie("refreshToken", refreshToken,option)
    .json(
        new ApiResponse(200,
            {
            user : loggedInUser, refreshToken, accessToken
            },
            "User logged In Succesfully"
        )
        

    )





})

const logoutUser = asyncHandler(async(req,res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $unset : {refreshToken : 1}
        },
        {
            new : true
        }
    )

    const option = {
        httpOnly : true,
        secure : true
    }

    return res
    .status(200)
    .clearCookie("accessToken" , option)
    .clearCookie("refreshToken" , option)
    .json(
         new ApiResponse(200 , {} , "User logged out")
    )
})

const refreshAccessToken = asyncHandler(async (req, res) => {
    console.log(req.cookies);
    console.log(req.body);
    console.log(req.cookies.refreshToken);
    
    
    
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

    console.log(incomingRefreshToken);
    
    
    if(!incomingRefreshToken){
        throw new ApiError(401, "Unauthorized access")
    }

    try {
        const decodedToken = jwt.verify(incomingRefreshToken,process.env.REFRESH_TOKEN_SECRET)
    
        const user = await User.findById(decodedToken?._id)
    
        if (!user) {
            throw new ApiError(401,"Inavlid refresh token")
        }
    
        if(incomingRefreshToken !== user?.refreshToken){
            throw new ApiError(401 , "Refresh Token is expired or Used")
        }
    
        const {newRefreshToken , accessToken } = await generateAccessAndRefreshToken(user._id)
    
        const option = {
            httpOnly : true,
            secure : true
        }
    
        return res
        .status(200)
        .cookie("accessToken" , accessToken , option)
        .cookie("refreshToken" , newRefreshToken,option)
        .json(
            new ApiResponse(
                200 ,
                {
                    accessToken,
                    refreshToken: newRefreshToken
                },
                "Refresh Token Generated"
    
            )
        )
    } catch (error) {
        throw new ApiError(401 , error?.message || "Invalid Request")
    }



})

const changeCurrentPassword = asyncHandler(async(req,res) => {
    const {oldPassword , newPassword} = req.body
    console.log(req.user?._id);
    

    const user = await User.findById(req.user?._id)

    if(!user){
        throw new ApiError(400, "Invalid User")
    }

    const isPasswordCorrect = user.isPasswordCorrect(oldPassword)

    if(!isPasswordCorrect){
        throw new ApiError(400, "Inavlid old Password")
    }

    user.password = newPassword
    user.save({validateBeforeSave : false})

    return res
    .status(200)
    .json(
        new ApiResponse(200 , {} , "Password Changed Successfully")
    )
})

const getCurrentUser = asyncHandler(async (req,res) => {
    return res
    .status(200)
    .json(new ApiResponse(200 , req.user, "Current User Fetched Succesfully"))
})

const updateAccountDetails = asyncHandler(async(req,res) => {
    const { fullName, email , username } = req.body

    if(!fullName && !email && !username){
        throw new ApiError(400, "All Fields are Required")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set : {
                fullName,
                email,
                username
            }
        },
        {
            new : true
        }
    ).select("-password")

    return res
    .status(200)
    .json(
        new ApiResponse(200,user,"Account Details Update Successfully")
    )
})

const updateAvatar = asyncHandler(async(req,res) => {
    const avatarLocalPath = req.file?.path

    if(!avatarLocalPath){
        throw new ApiError(400, "Avatar is missing")
    }

    const avatar = uploadFileOnCloudinary(avatarLocalPath)

    if (!avatar.url) {
        throw new ApiError(400, "Error while uploading on cloudinary")
    }

    const user = await User.findById(
        req.user?._id,
        {
            $set:{
                avatar : avatar.url
            }
        },
        {
            new :true
        }
    ).select("-password")

    return res
    .status(200)
    .json(
        new ApiResponse(200,user,"Avatar Updated Successfully")
    )

})

const updateCoverImage = asyncHandler(async(req,res) => {
    const coverImageLocalPath = req.file?.path

    if(!coverImageLocalPath){
        throw new ApiError(400, "coverImage is missing")
    }

    const coverImage = uploadFileOnCloudinary(coverImageLocalPath)

    if (!coverImage.url) {
        throw new ApiError(400, "Error while uploading on cloudinary")
    }

    const user = await User.findById(
        req.user?._id,
        {
            $set:{
                coverImage : coverImage.url
            }
        },
        {
            new :true
        }
    ).select("-password")

    return res
    .status(200)
    .json(
        new ApiResponse(200,user,"Cover Image Updated Successfully")
    )

})

const getUserChannelProfile = asyncHandler(async (req,res) =>{
    const {username} = req.params

    if(!username){
        throw new ApiError(400, "username does not exists")
    }

    const channel = await User.aggregate([
        {
            $match : {
                username : username?.toLowerCase()
            }
        },
        {
            $lookup: {
                from : "subscriptions",
                localField : "_id",
                foreignField : "channel",
                as: "subscribers"
            }
        },
        {
            $lookup : {
                from : "subscriptions",
                localField : "_id",
                foreignField : "subscriber",
                as : "subscribedTo"
            }
        },
        {
            $addFields : {
                subscribersCount : {
                    $size : "$subscribers"
                } ,
                subscribedToCount : {
                    $size : "$subscribedTo"
                },
                isSubscribed : {
                    $cond : {
                        if : {$in : [req.user?._id , "$subscribers.subscriber"]},
                        then : true,
                        else: false
                    }
                }
            }
        },
        {
            $project : {
                fullName : 1,
                username : 1,
                subscribersCount : 1,
                subscribedToCount : 1,
                isSubscribed : 1,
                avatar : 1,
                coverImage : 1,

            }
        }

    ])

    console.log(channel);
    

    if(!channel?.length){
        throw new ApiError(404 ,  "Channel does not exists")
    }

    return res
    .status(200)
    .json(
        new ApiResponse(200,channel[0],"User profile fetched Successfully")
    )
})

const getWatchHistory = asyncHandler(async(req,res) => {
    const user = User.aggregate([
        {
            $match : {
                _id : new mongoose.Types.ObjectId(req.user._id)
            }
        },
        {
            $lookup : {
                from: "videos",
                localField : "watchHistory",
                foreignField : "_id",
                as : "watchHistory",
                pipeline : [
                    {
                        $lookup : {
                            from : "users",
                            localField : "owner",
                            foreignField : "_id",
                            as : "owner",
                            pipeline : [
                                {
                                    $project : {
                                        fullName : 1,
                                        avatar : 1,
                                        username : 1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields : {
                            owner : {
                                $first : "$owner"
                            }
                        }
                    }
                ]
            }
        }
    ])

    console.log(user);
    
    return res
    .status(200)
    .json(
        new ApiResponse(200 , user[0].watchHistory , "Watch History Fetched Successfully")
    )
})

export  {
    registerUser , 
    loginUser , 
    logoutUser , 
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateAvatar,
    updateCoverImage,
    getUserChannelProfile,
    getWatchHistory
}