import mongoose, { isValidObjectId } from "mongoose"
import {Tweet} from "../models/tweets.models.js"
import {User} from "../models/user.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const createTweet = asyncHandler(async (req, res) => {
    //TODO: create tweet
    const {tweetId} = req.params

    if(!isValidObjectId(tweetId)){
        throw new ApiError(400 , "Invalid tweet id")
    }

    const tweet = await Tweet.create({
        content ,
        owner : req.user?._id
    })


    if(!tweet){
        throw new ApiError(400 , "Failed to create Tweet")
    }

    return res
    .status(200)
    .json(new ApiResponse (200 , tweet , "Tweet created successfully"))
})

const getUserTweets = asyncHandler(async (req, res) => {
    // TODO: get user tweets
    const {userId} = req.params

    if(!isValidObjectId(userId)){
        throw new ApiError(400 , "Invalid Users")
    }

    const tweets = Tweet.aggregate([
        {
            $match : {
                owner  : new mongoose.Schema.Types.ObjectId(userId)
            }
        },
        {
            $lookup : {
                from : "users",
                localField : "owner",
                foreignField : "_id",
                as : "owner"
            }
        },
        {
            $lookup : {
                from : "likes",
                localField  : "_id",
                foreignField : "tweet",
                as : "likesDetails"
            }
        },
        {
            $addFields : {
                likesCount : {
                    $size : "$likes"
                },
                owner : {
                    $first : "$owner"
                },
                isLiked : {
                    $cond : {
                        if : {
                            $in : [req.user?._id , "$likes.likedBy"]
                        },
                        then  : true,
                        else : false
                    }
                }
            }
        },
        {
            $sort  : {
                createdAt : -1
            }
        },
        {
            $project : {
                _id : 0,
                owner : {
                    username : 1,
                    "avatar.url" : 1

                },
                isLiked : 1,
                likesCount : 1,
                content

            }
        }
    ])

    return res
    .status(200)
    .json(new ApiResponse(200 , tweets , "User Tweets Fetched Successfully"))
    
})

const updateTweet = asyncHandler(async (req, res) => {
    //TODO: update tweet
    const {tweetId}  = req.params

    const {content } = req.body

    if(!tweetId){
        throw new ApiError(400 , "Invalid Tweet id")
    }

    if(!content){
        throw new ApiError(400 , "Content is Required")
    }

    const tweet = await Tweet.findById(tweetId)

    if(tweet?._id.toString() !== req.user?._id.toString()){
        throw new ApiError(400 , "Unauthorized request")
    }

    const updatedTweet = await Tweet.findByIdAndUpdate(
        tweet?._id,
        {
            $set : {
                content 
            }
        },
        {
            new : true
        }
    )

    if(!updatedTweet) { 
        throw new ApiError(400 , "Failed to update tweet")
    }

    return res
    .status(200)
    .json(new ApiResponse(200 , updatedTweet , "Tweet updated Successfully"))


})

const deleteTweet = asyncHandler(async (req, res) => {
    //TODO: delete tweet

    const {tweetId}  = req.params
    const { content } = req.body

    if(!content){
        throw new ApiError(400 , "Content is required to delete")
    }

    const tweet = await Tweet.findById(tweetId)

    if(tweet?._id.toString() !== req.user?._id.toString()){
        throw new ApiError(400 , "You are not authorized to delete tweet")
    }

    await Tweet.findByIdAndDelete(tweetId)

    return res
    .status(200)
    .json(new ApiResponse(200 , {} , "Tweet deleted successfully"))


})

export {
    createTweet,
    getUserTweets,
    updateTweet,
    deleteTweet
}