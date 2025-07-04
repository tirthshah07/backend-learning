import mongoose, { isValidObjectId } from "mongoose"
import {Comment} from "../models/comment.models.js"
import {ApiError} from "../utils/apiError.js"
import {ApiResponse} from "../utils/apiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const getVideoComments = asyncHandler(async (req, res) => {
    //TODO: get all comments for a video
    const {videoId} = req.params
    const {page = 1, limit = 10} = req.query;

    if(!isValidObjectId(videoId)){
        throw new ApiError(400, "Invalid Video Id")
    };

    const comments = await Comment.aggregate(
        [
            {
                $match: {
                    video: new mongoose.Types.ObjectId(String(videoId))
                }
            },
            {
                $lookup: {
                    from: "users",
                    foreignField: "_id",
                    localField: "owner",
                    as: "owner",
                    pipeline: [
                        {
                            $project: {
                                username: 1,
                                fullname: 1,
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
    );

    if(!comments){
        throw new ApiError(500, "Something went wrong while fetching all comments")
    }

    return res.status(200).json(new ApiResponse(200, comments[0], "Comments fecthed successfully"))


})

const addComment = asyncHandler(async (req, res) => {
    const { videoId } = req.params;

    const { content } = req.body;

    if(!isValidObjectId(videoId)){
        throw new ApiError(400, "Invalid video Id");
    }

    if(!content && content.trim() === ""){
        throw new ApiError(404, "Content is required")
    }

    const newComment = await Comment.create({
        content,
        video: videoId,
        owner: req.user?.id
    });

    if(!newComment){
        throw new ApiError(500, "Something went wrong while adding comment");
    }

    return res.status(200).json(
        new ApiResponse(200, newComment, "Comment added successfully")
    )
})

const updateComment = asyncHandler(async (req, res) => {
    const { commentId } = req.params;

    const { content } = req.body;

    if(!isValidObjectId(commentId)){
        throw new ApiError(400, "Invalid comment Id");
    }

    if(!content && content.trim() === ""){
        throw new ApiError(404, "Content is required")
    }

    const oldComment = await Comment.findOneAndUpdate(
        {
            _id: commentId,
            owner: req.user?.id
        },
        {
            content
        },
        {
            new: true
        }
    );

    if(!oldComment){
        throw new ApiError(403, "You are not allowed to edit this comment")
    }

    return res.status(200).json(new ApiResponse(200, oldComment, "Comment updated successfully"))
})

const deleteComment = asyncHandler(async (req, res) => {
    const { commentId } = req.params;

    if(!isValidObjectId(commentId)){
        throw new ApiError(400, "Invalid comment Id");
    }

    const deletedComment = await Comment.findOneAndDelete(
        {
            _id: commentId,
            owner: req.user?.id
        }
    );

    if(!deletedComment){
        throw new ApiError(404, "Comment not found or you are not authorized")
    }

    return res.status(200).json(new ApiResponse(200, {}, "Comment deleted successfully"))

})

export {
    getVideoComments, 
    addComment, 
    updateComment,
     deleteComment
    }