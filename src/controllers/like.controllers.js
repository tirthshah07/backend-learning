import mongoose, {isValidObjectId} from "mongoose"
import {Like} from "../models/like.models.js"
import {ApiError} from "../utils/apiError.js"
import {ApiResponse} from "../utils/apiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import { User } from "../models/user.models.js"

const toggleVideoLike = asyncHandler(async (req, res) => {
    const {videoId} = req.params;

    if(!isValidObjectId(videoId)){
        throw new ApiError(400, "Not a valid video Id");
    }

    const isLiked = await Like.findOneAndDelete({
        video: videoId,
        likedBy: req.user.id
    })

    if(isLiked){
        return res.status(200).json(
            new ApiResponse(200, {isLiked: false}, "Removed like successfully")
        )
    }

    const newLike = await Like.create({
        video: videoId,
        likedBy: req.user.id
    });

    if(!newLike){
        throw new ApiError(400, "Something went wrong while liking")
    };

    return res.status(200).json(new ApiResponse(200, { liked: true }, "Like added successfully"))
    //check video exist? in like
    //aggregate query
    //if not value then true or false
})

const toggleCommentLike = asyncHandler(async (req, res) => {
    const {commentId} = req.params;

    if(!isValidObjectId(commentId)){
        throw new ApiError(400, "Not a valid comment Id");
    }

    const commentLiked = await Like.findOneAndDelete({
        comment: commentId,
        likedBy: req.user.id
    })

    if(commentLiked){
        return res.status(200).json(new ApiResponse(200, {}, "Comment unlike successfully"))
    }

    const newCommentLiked = await Like.create({
        comment: commentId,
        likedBy: req.user.id
    });

    if(!newCommentLiked){
        throw new ApiError(500, "Something went wrong while liking comment")
    }

    return res.status(200).json(new ApiResponse(200, {}, "Comment liked successfully"))
})

const toggleTweetLike = asyncHandler(async (req, res) => {
    const {tweetId} = req.params;

    if(!isValidObjectId(tweetId)){
        throw new ApiError(400, "Not a valid tweet Id");
    }

    const isTweetliked = await Like.findOneAndDelete({
        tweet: tweetId,
        likedBy: req.user.id
    })

    if(isTweetliked){
        return res.status(200).json(new ApiResponse(200, {}, "Tweet unliked successfully"))
    }

    const newTweetLike = await Like.create({
        tweet: tweetId,
        likedBy: req.user.id
    })

     if(!newTweetLike){
        throw new ApiError(500, "Something went wrong while liking tweet")
    }

    return res.status(200).json(new ApiResponse(200, {}, "Tweet liked successfully"))
})

const getLikedVideos = asyncHandler(async (req, res) => {
    //TODO: get all liked videos
    //get all liked video by user logged in user
    //req.user.id check if 
    //user ma check karvanu k user exist
    //Like aggreagte ma match likedby: user id add more aggreation pipeline for owner 
    const userId = req.user?.id;

    if(!isValidObjectId(userId)){
        throw new ApiError(400, "Invalid user Id");
    }

    const user = await User.findOne({
        _id: userId
    })

    if(!user){
        throw new ApiError(404, "No user found")
    }

    const likedVideos = await Like.aggregate(
        [
            {
                $match: {
                    video: {$exists : true},
                    likedBy: new mongoose.Types.ObjectId(String(userId))
                }
            },
            {
                $lookup: {
                    from: "videos",
                    let: {videoId: "$video"},
                    as: "video",
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $eq: ["$_id", "$$videoId"]
                                }
                            }
                        },
                        {
                            $lookup: {
                                from: "users",
                                let: {ownerId: "$owner"},
                                as: "owner",
                                pipeline: [
                                    {
                                        $match: {
                                            $expr: {
                                                $eq: ["$_id", "$$ownerId"]
                                            }
                                        }
                                    },
                                    {
                                        $project: {
                                            username: 1,
                                            fullName: 1,
                                            avatar: 1
                                        }
                                    }
                                ]
                            }
                        },
                        {
                            $addFields: {
                                owner: {
                                    $first: "$owner"
                                }
                            }
                        }
                    ]
                }
            },
            {
                $addFields: {
                    video: {
                        $first: "$video"
                    }
                }
            },
            {
                $replaceRoot: {
                    newRoot: "$video"
                }
            }
        ]
    )

    if(!likedVideos.length){
        throw new ApiError(404, "Something went wrong while fetching liked videos")
    }

    return res.status(200).json(new ApiResponse(200, likedVideos, "Fetched like videos"))

})

export {
    toggleCommentLike,
    toggleTweetLike,
    toggleVideoLike,
    getLikedVideos
}