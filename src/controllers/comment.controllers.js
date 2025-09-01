import mongoose , {isValidObjectId} from "mongoose"
import {Comment} from "../models/comment.models.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const getVideoComments = asyncHandler(async (req, res) => {
    //TODO: get all comments for a video
    const {videoId} = req.params
    const {page = 1, limit = 10} = req.query

    const {content} = req.body

    if(!isValidObjectId(videoId)){
        throw new ApiError(400 , "Invalid Video Id")
    }

    if(!content) {
        throw new ApiError(400 , "Content is required to comment on it")
    }

    const commentAggregate = await Comment.aggregate([
        {
            $match : {
                video : new mongoose.Schema.Types.ObjectId(videoId)
            }
        },
        {
            $lookup  : {
                from : "users",
                localField : "owner",
                foreignField : "_id",
                as : "owner"
            }
        },
        {
            $lookup : {
                from : "likes",
                localField : "_id",
                foreignField : "comment",
                as : "likes"
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
                        then :true ,
                        else : false
                    }
                }
                
            }
        },
        {
            $project : {
                content : 1,
                createdAt : 1,
                likesCount : 1,
                owner : {
                    username : 1,
                    "avatar.url" : 1,
                    fullname : 1
                },
                isLiked : 1
            }
        }
    ])

    const options = {
        page : parseInt(page ,10),
        limit : parseInt(limit , 10)
    }

    const comments = await Comment.aggregatePaginate(commentAggregate , options)

    return res
    .status(200)
    .json(new ApiResponse(200 , comments , "All Comments Fetched Successfully"))





})

const addComment = asyncHandler(async (req, res) => {
    // TODO: add a comment to a video
    const {videoId} = req.params
    const {content} = req.body

    if(!isValidObjectId(videoId)){
        throw new ApiError(400 , "Inavlid Video Id")
    }

    if(!content){
        throw new ApiError(400 ,"Content is missing")
    }

    const comment = await Comment.create({
        content,
        video : videoId,
        owner : req.user?._id
    })

    if(!comment){
        throw new ApiError(400 , "Failed to add comment")
    }

    return res
    .status(200)
    .json(new ApiResponse(200 , comment , "Comment added successfully"))
})

const updateComment = asyncHandler(async (req, res) => {
    // TODO: update a comment
    const {commentId} = req.params
    const {content} = req.body

    if(!isValidObjectId(commentId)){
        throw new ApiError(400 , "Invalid Video Id")
    }

    if(!content){
        throw new ApiError(400, "Content is required")
    }

    const comment = await Comment.findById(commentId)

    if(comment?.owner.toString() !== req.user?._id.toString()){
        throw new ApiError(400 , "Unathorized Request")
    }

    const updatedComment = await Comment.findByIdAndUpdate(
        comment?._id,
        {
            $set : {
                content
            }
        },
        {
            new : true
        }

    )

    if(!updatedComment){
        throw new ApiError(400 , "Failed to update comment")
    }

    return res
    .status(200)
    .json(new ApiResponse(200 , updatedComment , "Comment updated Successfully"))
})

const deleteComment = asyncHandler(async (req, res) => {
    // TODO: delete a comment
    const {commentId} = req.params

    const comment = await Comment.findById(commentId)

    if(!comment){
        throw new ApiError(400 , "Failed to load comment")

    }

    if(comment?.owner.toString() !== req.user?._id.toString()){
        throw new ApiError(400 , "You dont have access to delete a comment")
    }

    const commentDeleted = await Comment.findByIdAndDelete(commentId)

    await Comment.deleteMany({
        comment : commentId,
        likedBy : req.user
    })

    return res
    .status(200)
    .json(new ApiResponse(200 , {commentId} , "Comment deleted Successfully"))
})

export {
    getVideoComments, 
    addComment, 
    updateComment,
     deleteComment
    }