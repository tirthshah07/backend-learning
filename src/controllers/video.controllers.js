import mongoose, {isValidObjectId} from "mongoose"
import {Video} from "../models/video.models.js"
import {User} from "../models/user.models.js"
import {ApiError} from "../utils/apiError.js"
import {ApiResponse} from "../utils/apiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import { Like } from "../models/like.models.js"


const getAllVideos = asyncHandler(async (req, res) => {
    let { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query;

    const pageNumber = parseInt(page) || 1;
    const limitNumber = parseInt(limit) || 10;
    const skip = (pageNumber - 1) * limitNumber;
    const searchQuery = query?.trim() || "";
    const sortField = sortBy || "createdAt";
    const sortDirection = sortType === "asc" ? 1 : -1;

    const matchCondition = [];
    if(searchQuery){
        matchCondition.push(
            {
                $or: [
                    {
                        title: {$regex: searchQuery, $options: "i"}
                    },
                    {
                        description: {$regex: searchQuery, $options: "i"}
                    }
                ]
            }
        )
    };

    if(userId && isValidObjectId(userId)){
        matchCondition.push({
            owner: userId
        })
    }

    const videos = await Video.aggregate(
        [
            {
                $match: matchCondition.length > 0 ? { $and: matchCondition} : {}
            },
            {
                $lookup: {
                    from: "users",
                    foreignField: "_id",
                    localField: "owner",
                    as: "videoBy"
                }
            },
            {
                $unwind: "$videoBy"
            },
            { 
                $project: {
                    thumbnail: 1,
                    videoFile: 1,
                    title: 1,
                    description: 1,
                    duration: 1,
                    isPublished: 1,
                    views: 1,
                    videoBy: {
                        username: 1,
                        avatar: 1,
                        fullname: 1
                    }
                }
            },
            {
                $sort: {
                    [sortField]: sortDirection
                }
            },
            {
                $skip: skip
            },
            {
                $limit: limitNumber
            }
        ]
    );

    if(!videos){
        throw new ApiError(404, "Something went wrong while fetching videos")
    }

    return res.status(200).json(new ApiResponse(200, videos, "Videos fetched successfully"))

    //TODO: get all videos based on query, sort, pagination
})

const publishAVideo = asyncHandler(async (req, res) => {
    const { title, description} = req.body;

    if([title, description].some(field => field.trim() === "")){
        throw new ApiError(400, "All fields are required");
    }
    let localVideoPath;
    let localThumbnailPath;

    localVideoPath = req.files?.video[0]?.path;

    if(!localVideoPath){
        throw new ApiError(400, "Video is required");
    }

    localThumbnailPath = req.files?.thumbnail[0]?.path;

    if(!localThumbnailPath){
        throw new ApiError(400, "Thumbnail is required");
    }

    const video = await uploadOnCloudinary(localVideoPath);
    const thumbnail = await uploadOnCloudinary(localThumbnailPath);

    if(!video ||  !thumbnail){
        throw new ApiError(400, "Video or Thumbnail upload failed on cloudinary. Please try again");
    }

    const publishVideo = await Video.create({
        videoFile: video.url,
        thumbnail: thumbnail.url,
        owner: req.user?.id,
        title,
        description,
        duration: video.duration,
        isPublished: true
    });

    if(!publishVideo){
        throw new ApiError(500, "Something went wrong while creating the video");
    }

    const isPublished = await Video.findById(publishVideo._id);

    if(!isPublished){
        throw new ApiError(500, "Something went wrong while creating the video")
    }

    return res.status(201).json(new ApiResponse(201, isPublished, "Video Published successfully"));

    // TODO: get video, upload to cloudinary, create video
})

const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    //find video by id
    //now get total likes for that video\\
    // get comments for that video use aggreation for both and also join user pipeline if required

       if(!isValidObjectId(videoId)){
        throw new ApiError(400, "Invalid Video Id");
    }

    const videoAvailable = await Video.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(String(videoId))
            }
        },
        {
            $lookup: {
                from: "users",
                foreignField: "_id",
                localField: "owner",
                as: "uploadedBy"
            }
        },
        {
            $unwind: "$uploadedBy"
        },
        {
            $lookup: {
                from:"likes",
                let: {videoId : "$_id"},
                pipeline: [
                    {
                        $match: {
                            $expr: {
                                $and: [
                                    {$eq: ["$video", "$$videoId"]},
                                    {$eq: ["$comment", null]},
                                    {$eq: ["$tweet", null]}
                                ]
                            }
                        }
                    }
                ],
                as: "likedVideos"
            }
        },
        {
            $addFields: {
                totalLikes:{
                    $size: "$likedVideos"
                },
                isLiked: {
                    $gt: [
                        {
                            $size: {
                                $filter: {
                                    input: "$likedVideos",
                                    as: "like",
                                    cond: {
                                        $eq: ["$$like.likedBy", new mongoose.Types.ObjectId(String(req.user?.id))]
                                    }
                                }
                            }
                        },
                        0
                    ]
                }
            }
        },
        {
            $lookup: {
                from: "subscribers",
                localField: "owner",
                foreignField: "channel",
                as: "subscribers"
            }
        },
        {
            $addFields: {
                totalSubscriber: {
                    $size: "$subscribers"
                },
                isSubscribed: {
                    $cond: {
                        if: {$in: [
                            new mongoose.Types.ObjectId(String(req.user?.id)),
                            {
                                $map: {
                                    input: "$subscribers",
                                    as: "subs",
                                    in: "$$subs.subscriber"
                                }
                            }
                            ]},
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $project: {
                videoFile: 1,
                thumbnail: 1,
                title: 1,
                description: 1,
                duration: 1,
                views: 1,
                isPublished: 1,
                uploadedBy: {
                    fullname: 1,
                    avatar: 1
                },
                totalSubscriber: 1,
                isSubscribed: 1,
                totalLikes: 1,
                isLiked: 1
            }
        }
    ]);

    if(!videoAvailable.length){
        throw new ApiError(404, "Something went wrong while fetching video")
    }

    return res.status(200).json(new ApiResponse(200, videoAvailable[0], "Video Found Successfully"))


    //TODO: get video by id
})

const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    const {title, description} = req.body;
    let localThumbnailPath;

    if(!isValidObjectId(videoId)){
        throw new ApiError(400, "Video Id is not valid")
    }

    localThumbnailPath = req?.file?.thumbnail[0]?.path;

    if(!title && !description && !localThumbnailPath){
        throw new ApiError(400, "At least one of title, description, or thumbnail is required to update the video")
    }

    const updateData = {
        ...(title && {title}),
        ...(description && {description}),
        ...(localThumbnailPath && { thumbnail: (await uploadOnCloudinary(localThumbnailPath)).url})
    }

    const updatedVideo = await Video.findOneAndUpdate(
        {
            _id: videoId,
            owner: req.user?.id
        },
        {
            $set: updateData
        },
        {
            new: true
        }
    );

    if(!updatedVideo){
        throw new ApiError(500, "Something went wrong while updating video. Please try again");
    }

    return res.status(200).json(new ApiResponse(200, updatedVideo, "Video Uploaded successfully"))
    //TODO: update video details like title, description, thumbnail

})

const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    
    if(!isValidObjectId(videoId)){
        throw new ApiError(400, "Video Id is not valid")
    }

    const deletedVideo = await Video.findOneAndDelete(
        {
            _id: videoId,
            owner: req.user?.id
        }
    );

    if(!deletedVideo){
        throw new ApiError(500, "Something went wrong while deleting video");
    }

    await Like.updateMany({video: videoId});

    await Comment.updateMany({video: videoId});

    await User.updateMany({
        watchhistory: videoId
    },
    {
        $pull: {watchhistory: videoId}
    }
)

    return res.status(200).json(new ApiResponse(200, {}, "Video Deleted Successfully"))
    //TODO: delete video
})

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params;

    if(!isValidObjectId(videoId)){
        throw new ApiError(400, "Video Id is invalid")
    }

    const findVideo = await Video.findOne(
        {
            _id: videoId,
            owner: req.user?.id
        }
    );

    if(!findVideo){
        throw new ApiError(404, "Video not found or you are not authorised");
    }

    findVideo.isPublished = !isPublished;
    await findVideo.save();

    return res.status(200).json(new ApiResponse(200, findVideo, "Publish toggled successfully"))
})

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
}