import mongoose, {isValidObjectId} from "mongoose"
import {Like} from "../models/likes.models.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import { title } from "process"

const toggleVideoLike = asyncHandler(async (req, res) => {
    const {videoId} = req.params
    //TODO: toggle like on video

    if(!isValidObjectId(videoId)){
        throw new ApiError(400 , "Invalid Video Id")
    }

    const isVideoLiked = await Like.findOne({
        video : videoId,
        likedBy : req.user?._id

    })

    if(isVideoLiked){
        await Like.findByIdAndDelete(isVideoLiked?._id)

        return res
        .status(200)
        .json(new ApiResponse(200 , {isVideoLiked : false} , "Liked deleted successfully"))
    }

    await Like.create({
        video : videoId,
        likedBy :  req.user?._id
    }
    )

    return res
    .status(200)
    .json(new ApiResponse(200, {isVideoLiked :  true}, "Video liked successfully"))


})

const toggleCommentLike = asyncHandler(async (req, res) => {
    const {commentId} = req.params
    //TODO: toggle like on comment
    if(!isValidObjectId(commentId)){
         throw new ApiError(400 , "Inavlid Comment id")
    }

    const isCommentLiked = await Like.findOne({
        comment : commentId,
        likedBy : req.user?._id
    })

    if(isCommentLiked){
        await Like.findByIdAndDelete(isCommentLiked?._id)
        return res
        .status(200)
        .json(new ApiResponse(200 , {isCommentLiked : false}))
    }

    await Like.create({
        comment : commentId,
        likedBy : req.user?._id
    })

    return res
    .status(200)
    .json(new ApiResponse(200 , {isCommentLiked : true}))


})

const toggleTweetLike = asyncHandler(async (req, res) => {
    const {tweetId} = req.params
    //TODO: toggle like on tweet

    if(!isValidObjectId(tweetId)){
        throw new ApiError(400 , "Invalid Tweet Id")
    }

    const isTweetLiked = await Like.findOne({
        tweet : tweetId,
        likedBy : req.user?._id
    })

    if(isTweetLiked){
        await Like.findByIdAndDelete(isTweetLiked?._id)

        return res
        .status(200)
        .json(new ApiResponse(200 , {isTweetLiked : false}))
    }

    await Like.create({
        tweet : tweetId,
        likedBy : req.user?._id
    })

    return res
        .status(200)
        .json(new ApiResponse(200 , {isTweetLiked : true}))


}
)

const getLikedVideos = asyncHandler(async (req, res) => {
    //TODO: get all liked videos
    const allLikedVideos = Like.aggregate([
        {
            $match : {
                likedBy : mongoose.Schema.Types.ObjectId(req.user?._id)
            }
        },
        {
            $lookup : {
                from : "videos",
                localField:"video",
                foreignField:"_id",
                as: "likedVideos",
                pipeline : [
                    {
                        $lookup : {
                            from : "users",
                            localField : "likedBy",
                            foreignField:"_id",
                            as : "ownerDetails"
                        }
                    },
                    {
                        $unwind : "$ownerDetails"
                    }
                ]

            }
        },
        {
            $unwind : "$likedVideos"
        },
        {
            $sort : {
                createdAt : -1
            }
        },
        {
            $project : {
                _id : 0,
                likedVideos : {
                    "video.url" : 1,
                    "thumbnail.url" : 1,
                    title : 1,
                    descriptiion : 1,
                    owner : 1,
                    views : 1,
                    duration :1

                },
                
                ownerDetails : {
                    username : 1,
                    fullname : 1,
                    "avatar.url" : 1
                }
                
            }
        }
    ])

    return res
    .status(200)
    .json(new ApiResponse(200 , allLikedVideos , "All liked videos Fetched Successfully"))
})

export {
    toggleCommentLike,
    toggleTweetLike,
    toggleVideoLike,
    getLikedVideos
}