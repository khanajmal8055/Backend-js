import mongoose, {isValidObjectId} from "mongoose"
import {Playlist} from "../models/playlist.models.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"


const createPlaylist = asyncHandler(async (req, res) => {
    const {name, description} = req.body

    //TODO: create playlist

    if(!(name && description)){
        throw new ApiError(400 , "All fields are required")
    }

    const playlist = Playlist.create({
        name,
        description,
        owner : req.user?._id
    })

    if(!playlist){
        throw new ApiError(400 , "Failed to create playlist")
    }

    return res
    .status(200)
    .json(new ApiResponse(200 , playlist , " Playlist created Successfully"))
})

const getUserPlaylists = asyncHandler(async (req, res) => {
    const {userId} = req.params
    //TODO: get user playlists

    if(!isValidObjectId(userId)){
        throw new ApiError(400 , "Inavlid User Id") 
    }

    const playlists = Playlist.aggregate([
        {
            $match : {
                owner : new mongoose.Schema.Types.ObjectId(userId)
            }
        },
        {
            $lookup : {
                from :  "videos",
                localField : "videos",
                foreignField : "_id",
                as : "videos"
            }
        },
        {
            $addFields : {
                totalVideos : {
                    $size : "$videos"
                },
                totalViews : {
                    $sum : "$videos.view"
                }
            }
        },
        {
            $project : {
                _id : 1,
                name  : 1,
                description : 1,
                totalVideos : 1,
                totalViews : 1
            }
        }
    ])

    return res
    .status(200)
    .json(new ApiResponse(200 , playlists , "User playlist by user id fetched Successfully"))
})

const getPlaylistById = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    //TODO: get playlist by id

    if(!isValidObjectId(playlistId)){
         throw new ApiError(400 , "Invalid playlist id")
    }

    const playlist = Playlist.findById(playlistId)

    if(!playlist){
        throw new ApiError(400 , "Playlist not found")
    }

    const getPlaylist = Playlist.aggregate([
        {
            $match : {
                _id : new mongoose.Schema.Types.ObjectId(playlistId)
            }
        },
        {
            $lookup : {
                from : "videos",
                localField : "videos",
                foreignField : "_id",
                as : "videos"
            }
        },
        {
            $match : {
                "vidoes.isPublished" : true
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
            $addFields : {
                totalVideos :{
                    $size : "$videos"
                },
                totalViews : {
                    $sum : "$videos.views"
                },
                owner : { 
                    $first : "$owner"
                }
            }
        },
        {
            $project : {
                _id : 0,
                owner : {
                    username : 1,
                    "avatar.url" : 1
                },
                name :1 ,
                description : 1,
                videos : {
                    _id : 1,
                    "thumbnail.url " : 1,
                    title : 1,
                    description : 1,
                    duration : 1
                },
                totalVideos : 1,
                totalViews : 1,
            }
        }
    ])

    return res
    .status(200)
    .json(new ApiResponse(200 , playlists , "Playlists by playlist id fetched Successfully"))
})

const addVideoToPlaylist = asyncHandler(async (req, res) => {
    const {playlistId, videoId} = req.params
    
    if(!isValidObjectId(playlistId)){
        throw new ApiError(400 , "Invalid Playlist Id")
    }

    if(!isValidObjectId(videoId)){
        throw new ApiError(400 , "Invalid Video Id")
    }

    const playlist = Playlist.findById(playlistId)

    const video = Playlist.findById(videoId)

    if(!playlist){
        throw new ApiError(400 , "Playlist not found")
    }

    if(!video){
        throw new ApiError(400 , "Video not Found")
    }

    if(playlist?.owner.toString() && video?.owner.toString() !== req.user?._id.toString()){
        throw new ApiError(400 , "You are not a Authorized person to add videos on playlist")
    }

    const updatedPlaylist = Playlist.findByIdAndUpdate(
        playlist?._id,
        {
            $addToSet : {
                video : videoId
            }
        },
        {
            new : true
        }
    )

    if(!updatePlaylist){
        throw new ApiError(400 , "Failed to add video on playlist")
    }

    return res
    .status(200)
    .json(new ApiResponse(200 , updatedPlaylist , "Video added to playlist successfully"))
})

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
    const {playlistId, videoId} = req.params
    // TODO: remove video from playlist

    if(!isValidObjectId(playlistId)){
        throw new ApiError(400 , "Invalid playlist id")
    }

    if(!isValidObjectId(videoId)){
        throw new ApiError(400 , "Invlaid video id")
    }

    const playlist = Playlist.findById(playlistId)

    const video = Playlist.findById(videoId)

    if(!video){
        throw new ApiError(400 , "Video Not Found")
    }

    if(!playlist){
        throw new ApiError(400 , "Video Not Found")
    }

    if(playlist?.owner.toString() && video?.owner.toString() !== req.user?._id){
        throw new ApiError(400 , "You are not authorized to remove video from playlist")
    }

    const updatedPlaylist = Playlist.findByIdAndUpdate(
        playlistId,
        {
            $pull : {
                videoId
            }
        },
        {
            new : true
        }
    )

    if(!updatedPlaylist){
        throw new ApiError(400 , "Failed to remove videos")
    }

    return res
    .status(200)
    .json(new ApiResponse(200 , updatedPlaylist , "Video Removed from Playlist Successfully"))

})

const deletePlaylist = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    // TODO: delete playlist

    if(!isValidObjectId(playlistId)){
        throw new ApiError(400 , "Invalid Playlist id")
    }

    const playlist = Playlist.findById(playlistId)

    if(playlist?.owner.toString() !== req.user?._id){
        throw new ApiError(400 , "You are not authorized to delete playlist")
    }

    const deletePlaylist = Playlist.findByIdAndDelete(playlistId)

    if(!deletePlaylist){
        throw new ApiError(400 , "Failed to delete Playlist")
    }

    return res
    .status(200)
    .json(new ApiResponse(200 , {} , "Playlist deleted Successfully"))
})

const updatePlaylist = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    const {name, description} = req.body
    //TODO: update playlist

    if(!isValidObjectId(playlistId)){
        throw new ApiError(400 , "Invalid playlist id")
    }

    if(!name || !description){
        throw new ApiError(400 , "All fields are Required")
    }

    const playlist = Playlist.findById(playlistId)

    if(!playlist){
        throw new ApiError(400 , "Playlist not found")
    }

    if(playlist?.owner.toString() !== req.user?._id){
        throw new ApiError(400 , "You are not an Authorized user to update playlist")
    }

    const updatePlaylist = Playlist.findByIdAndUpdate(
        playlist?._id,
        {
            $set : {
                name,
                description
            }
        },
        {
            new : true
        }
    )

    if(!updatePlaylist){
        throw new ApiError(400 , "Failed to update Playlist")
    }

    return res
    .status(200)
    .json(new ApiResponse(200 , updatePlaylist , "Playlist updated successfully"))

})

export {
    createPlaylist,
    getUserPlaylists,
    getPlaylistById,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    deletePlaylist,
    updatePlaylist
}