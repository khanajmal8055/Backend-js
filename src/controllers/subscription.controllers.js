import mongoose, {isValidObjectId} from "mongoose"
import {User} from "../models/user.models.js"

import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import {Subscription} from "../models/subscription.models.js"


const toggleSubscription = asyncHandler(async (req, res) => {
    const {channelId} = req.params
    // TODO: toggle subscription
    
    if(!isValidObjectId(channelId)){
        throw new ApiError(400 , "Invalid Channel Id")
    }

    const user = await User.findById(req.user?._id)

    if(!user){
        throw new ApiError(400 , "Inavlid User")
    }

    const isSubscribed = await Subscription.findOne({
        subscriber : req.user?._id,
        channel : channelId
    })

    if(isSubscribed){
        await Subscription.findByIdAndDelete(isSubscribed?._id)

    return res
    .status(200)
    .json(new ApiResponse(200 ,{ subscribed : false }, "Unsubscribed successfllly" ))
    }

    



    
    await Subscription.create({
        subscriber : req.user?._id,
        channel : channelId
    })

    return res
    .status(200)
    .json(new ApiResponse(200 ,{ subscribed : true }, "Subscribed successfllly" ))



    

    
})

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
    const {channelId} = req.params

    if(!isValidObjectId(channelId)){
        throw new ApiError(400, "Inavlid Channel Id")
    }

    const subscribers = await Subscription.aggregate([
        {
            $match : {
                channel : channelId
            }
        },
        {
            $lookup : {
                from : "users",
                localField : "subscriber",
                foreignField : "_id",
                as : "subscriber",
                pipeline : [
                    {
                        $lookup : {
                            from : "subscription",
                            localField : "_id",
                            foreignField : "channel",
                            as : "subscribedToSubscriber"
                        }
                    },
                    {
                        $addFields : {
                            subscribedToSubscriber : {
                                $cond : {
                                    if : {
                                        $in : [channelId , "$subscribedToSubscriber.subscriber"]
                                    },
                                    then : true,
                                    else : false
                                }
                            }
                        },
                        subscriberCount : {
                            $size : "$subscribedToSubscriber"
                        }
                    }
                ]
            }
        },
        {
            $unwind : "$subscriber"
        },
        {
            $project : {
                _id : 0,
                subscriber : {
                    _id : 1,
                    username : 1,
                    fullname : 1,
                    "avatar.url " : 1,
                    subscribedToSubscriber : 1,
                    subscriberCount : 1
                }
            }
        }
    ])

    return res
    .status(200)
    .json(new ApiResponse(200 , subscribers , "Subscribers Fetched Successfully"))
})

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
    const { subscriberId } = req.params

    if(!isValidObjectId(subscriberId)){
        throw new ApiError(400 , "Inavlid Subscriber Id")
    }

    const subscribed = await Subscription.aggregate([
        {
            $match : {
                subscriber : new mongoose.Schema.Types.ObjectId(subscriberId)
            }
        },
        {
            $lookup : {
                from : "users",
                localField : "channel",
                foreignField : "_id",
                as : "subscribedChannel",
                pipeline : [
                    {
                        $lookup : {
                            from : "videos",
                            localField : "_id",
                            foreignField : "owner",
                            as : "videos"
                        }
                    },
                    {
                        $addFields : {
                            latestVideos : {
                                $last : "$videos"
                            }
                        }
                    }
                ]
            }
        },
        {
            $unwind : "$subscribedChannel"
        },
        {
            $project : {
                _id : 0 ,
                subscribedChannel : {
                    _id :1,
                    fullname : 1, 
                    username : 1 , 
                    "avatar.url" : 1 ,
                    latestVideos : {
                        _id : 1,
                        "video.url " : 1,
                        "thumbnail.url " : 1 ,
                        owner : 1,
                        title : 1,
                        description : 1,
                        views : 1,
                        duration :1,
                        createdAt : 1,

                    }
                }
            }
        }
    ])

    return res
    .status(200)
    .json(new ApiResponse(200 , subscribed , "Subscribed Channel Fetched Successfully"))
})

export {
    toggleSubscription,
    getUserChannelSubscribers,
    getSubscribedChannels
}