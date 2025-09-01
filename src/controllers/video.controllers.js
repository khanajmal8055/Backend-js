import mongoose, {isValidObjectId} from "mongoose"
import {Video} from "../models/video.models.js"
import {User} from "../models/user.models.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import {deleteOnCloudinary, uploadOnCloudinary} from "../utils/cloudinary.js"
import {Like} from "../models/likes.models.js"
import {Comment} from "../models/comment.models.js"



const getAllVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query
    //TODO: get all videos based on query, sort, pagination

    const pipeline = []

    if(query){
        pipeline.push({
            $search : {
                index : "search-index",
                text : {
                    query : query,
                    path : ["title ", "description"]
                }
            }
        })
    }

    if(userId){
        if(!userId){
            throw new ApiError(400 , "Inavlid User Id")
        }
        pipeline.push({
            $match : {
                owner : new mongoose.Schema.Types.ObjectId(userId)
            }
        })
    }

    pipeline.push(
        {
            $match : {
                isPublished : true
            }
        }
    )

    if(sortBy && sortType){
        pipeline.push({
            $sort : {
                [sortBy] : sortType === "asc" ? 1 : -1
            }
        });

    }
    else(
        pipeline.push(
            {
                $sort : {
                    createdAt : -1
                }
            }
        )
    )

    pipeline.push(
        {
            $lookup : {
                from : "users",
                localField : "owner",
                foreignField : "_id",
                as : "ownerDetails",
                pipeline : [
                    {
                        $project : {
                        username : 1,
                        "avatar.url" : 1
                    }
                    }
                ]
            }
        },
        {
            $unwind : "$ownerDetails"
        }
    )

    const videoAggregate = await Video.aggregate(pipeline)

    const options = {
        page : parseInt(page , 10),
        limit : parseInt(limit, 10)
    }
        

    const video = await Video.aggregatePaginate(videoAggregate, options)

    return res
    .status(200)
    .json( new ApiResponse(200 , video , "Videos fetched Successfully") )

    


})

const publishAVideo = asyncHandler(async (req, res) => {
    const { title, description} = req.body
    // TODO: get video, upload to cloudinary, create video

    if([title,description].some((field) => field?.trim() === "" )){
        throw new ApiError(400 , "All fields are required")
    }

    const videoFilePath = req.files?.video[0]?.path;
    const thumbnailFilePath = req.files?.thumbnail[0]?.path

    if(!videoFilePath){
        throw new ApiError(400 , "Video file path is missing")
    }

    if(!thumbnailFilePath){
        throw new ApiError(400 , "Thumbnail file path is missing")
    }

    const videoFile = await uploadOnCloudinary(videoFilePath)

    const thumbnail = await uploadOnCloudinary(thumbnailFilePath)

    if(!videoFile){
        throw new ApiError(400 , "Video file not found")
    }

    if(!thumbnail){
        throw new ApiError(400 , "Thumbnail is not found")
        
    }

    const video  = await Video.create({
        title,
        description,
        duration : videoFile.duration,
        videoFile : {
            url : videoFile.url,
            public_id : videoFile.public_id
        },
        thumbnail : {
            url : thumbnail.url,
            public_id : thumbnail.public_id
        },

        owner : req.user?._id,
        isPublished : false,
        views : videoFile.views

    })

    return res
    .status(200)
    .json(new ApiResponse(200 , video , "Video and Thumbnail Uploaded Successfully"))



})

const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: get video by id

    if(!isValidObjectId(videoId)){
        throw new ApiError(400 , "Invalid Video id")
    }

    if(!isValidObjectId(req.user?._id)){
        throw new ApiError(400 , "Inavlid User")
    }

    const video = await Video.aggregate([
        {
            $match : {
                _id : new  mongoose.Schema.Types.ObjectId(videoId)
            }
        },
        {
            $lookup : {
                from : "likes",
                localField : "_id",
                foreignField : "video",
                as : "likes"
            }
        },
        {
            $lookup : {
                from : "users",
                localField : "owner",
                foreignField : "_id",
                as : "owner",
                pipeline : [
                    {
                        $lookup : {
                            from : "subscriptions",
                            localField : "_id",
                            foreignField : "channel",
                            as : "subscribers"
                        }
                    },
                    {
                        $addFields : {
                            subscribersCount : {
                                $size : "$subscribers" 
                            },
                            isSubscribed : {
                                $cond : {
                                    if : {
                                        $in : [req.user?._id , "$subscribers.subscriber"]
                                    },
                                    then : true,
                                    else : false
                                }
                            }
                        },
                        
                    },
                    {
                        $project : {
                            username : 1,
                            "avatar.url"  : 1,
                            subscribersCount : 1,
                            isSubscribed : 1
                        }
                    }
                ]
            }
        },
        {
            $addFields : {
                likeCount : {
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
                        then : true,
                        else : false
                    }
                }
            }
        },
        {
            $project : {
                "videoFile.url" : 1,
                title : 1,
                description : 1 ,
                duration : 1,
                views : 1 ,
                isLiked : 1,
                likedCount : 1,
                createdAt : 1,
                comments : 1,
            }
        }

    ])

    if(!video) {
        throw new ApiError(400 , "Invalid video")
    }

    await Video.findByIdAndUpdate(videoId , {
        $inc : {
            views : 1
        }
    })

    await User.findByIdAndUpdate(req.user?._id , {
        $addToSet : {
            watchHistory : videoId
        }
    })

    return res
    .status(200)
    .json(new ApiResponse(200 , video[0] , "Video Fetched Successfully"))
})

const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: update video details like title, description, thumbnail

    const {title , description} = req.body

    if(!isValidObjectId(videoId)){
        throw new ApiError(400, "Invalid video Id")
    }

    if(!(title && description)){
        throw new ApiError(500 , "Title and Description are Required")
    }

    const video = await Video.findById(videoId)

    if(!video) {
        throw new ApiError(400 , "Video not found")
    }

    if(video?.owner.toString() !== req.user?._id.toString()){
        throw new ApiError(400 , "You are not a authorized user to update the video")
    }

    const thumbnailToDelete = video.thumbnail.public_id

    const thumbnailFilePath = req.files?.path

    if(!thumbnailFilePath){
        throw new ApiError(400 , "Unable to find the thumbnail file path")
    }

    const thumbnail = await uploadOnCloudinary(thumbnailFilePath)

    if(!thumbnail){
        throw new ApiError(400, "Thumbnail not found")
    }

    const updateVideo = await Video.findByIdAndUpdate(videoId , 
        {
            $set : {
                title,
                description,
                thumbnail : {
                    public_id  : thumbnail.public_id,
                    url : thumbnail.url
                }

            },
           
        },
            {
                new  : true
            }
    )

    if(!updateVideo){
        throw new ApiError(400 , "Failed to update Video please try again !!!")
    }

    if(updateVideo){
        deleteOnCloudinary(thumbnailToDelete)
    }

    return res
    .status(200)
    .json(new ApiResponse(200 , updateVideo , "Video update Successfully"))



    

    



})

const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: delete video

    if(!isValidObjectId(videoId)){
        throw new ApiError(400 , "Invalid video Id")
    }

    const video = await Video.findById(videoId)

    if(video?.owner.toString() !== req.user?._id.toString()){
        throw new ApiError(400 , "You are not a authorized person to delete a video")
    }

    const thumbnailToDelete = await Video.thumbnail.public_id
    const videoToDelete = await Video.videoFile.public_id

    const videoDelete = await Video.findById(videoId)

    if(!videoDelete){
        throw new ApiError(400 , "Failed to delete Video")
    }

    await deleteOnCloudinary(thumbnailToDelete)
    await deleteOnCloudinary(videoToDelete)

    await Like.deleteMany({
        video : videoId
    })    

    await Comment.deleteMany({
        video : videoId
    })

    return res
    .status(200)
    .json(200,{}, "Video delete Successfully")
})

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params

    if(!isValidObjectId(videoId)){
        throw new ApiError(400 , "Ivalid video Id")
    }

    const video = await Video.findById(videoId)

    if(video?.owner.toString() !== req.user?._id.toString()){
        throw new ApiError(400 , "You are not authenticated owner")
    }

    const toggleVideoPublish = await Video.findByIdAndUpdate(
        videoId,
        {
            $set : {
                isPublished : !video?.isPublished
            }
        },
        {
            new : true
        }
    )

    if(!toggleVideoPublish){
        throw new ApiError(400 , "Failed to Publish the Video")
    }

    return res
    .status(200)
    .json(200 ,toggleVideoPublish.isPublished , "Video Published Successfully")
})

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
}