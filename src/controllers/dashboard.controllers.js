import mongoose from "mongoose";
import ApiError from "../utils/apiError";
import ApiResponse from "../utils/apiResponse";
import {asyncHandler} from "../utils/asyncHandler.js";
import { Like } from "../models/like.models.js";
import { Subscription } from "../models/subscription.models.js";
import { Video } from "../models/video.models.js";
import { User } from "../models/user.models.js";

const getChannelStats = asyncHandler(async (req, res) => {
    // TODO: Get the channel stats like total video views, total subscribers, total videos, total likes etc.
    //get video fro, req.user.id
    const channelStats = await User.aggregate(
        [
            {
                $match: {
                    _id: new mongoose.Types.ObjectId(String(req.user?.id))
                }
            },
            {
                $lookup: {
                    from: "videos",
                    localField: "_id",
                    foreignField: "owner",
                    as: "videos",
                    pipeline: [
                        {
                            $lookup: {
                                from: "likes",
                                localField: "_id",
                                foreignField: "video",
                                as: "likes"
                            }
                        },
                        {
                            $addFields: {
                                finalLikes: {
                                    $size: "$likes"
                                }
                            }
                        },
                        {
                            $project: {
                                likes: 0
                            }
                        }
                    ]
                }
            },
            {
                $lookup: {
                    from: "subscriptions",
                    localField: "_id",
                    foreignField: "channel",
                    as: "subscribers",
                }
            },
            {
                $addFields: {
                    totalSubscriber: {$size: "$subscribers"},
                    totalVideos: {$size: "videos"},
                    totalViews: {$sum: "$videos.views"},
                    totalLikes: {$sum: "$videos.finalLikes"}
                }
            },
            {
                $project: {
                    totalSubscriber: 1,
                    totalVideos: 1,
                    totalViews: 1,
                    totalLikes: 1,
                    username: 1,
                    fullname:1,
                    avatar: 1   
                }
            }
        ]
    );

    if(!channelStats.length){
        throw new ApiError(500, "Something went wrong while fetching channel stats")
    }
    return res.status(200).json(new ApiResponse(200, channelStats[0] , "Channel Stats fetched successfully"))
})

const getChannelVideos = asyncHandler(async (req, res) => {
    // TODO: Get all the videos uploaded by the channel;
    //getUser from req.user.id
    //aggregate on video model for userid and find all videos
    const userId = new mongoose.Types.ObjectId(String(req.user?.id));

    const allVideos = await Video.aggregate(
        [
            {
                $match: {
                    owner: userId
                }
            },
            {
                $lookup: {
                    from: "likes",
                    foreignField: "video",
                    localField: "_id",
                    as: "likes"
                }
            },
            {
                $addFields: {
                    likeCount:{
                        $size: "$likes"
                    }
                }
            },
            {
                $project: {
                    likes: 0
                }
            }
        ]
    )

    if(!allVideos.length){
        throw new ApiError(400, "Something went wrong while fetching videos")
    }

    return res.status(200).json(new ApiResponse(200, allVideos, "All videos fetched successfully"))
})

export {
    getChannelStats, 
    getChannelVideos
    }
