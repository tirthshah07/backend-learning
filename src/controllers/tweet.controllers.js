import { isValidObjectId } from "mongoose"
import { Tweet } from "../models/tweet.models.js"
import{ ApiError } from "../utils/apiError.js"
import { ApiResponse } from "../utils/apiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"

const createTweet = asyncHandler(async (req, res) => {
    const {content} = req.body;
    const userValid = req.user?.id;
    if(!content){
        throw new ApiError(400, "Content is required");
    }

    if(!userValid){
        throw new ApiError(404, "User not found")
    }
    const newTweet = await Tweet.create({
        content,
        owner: userValid
    });

    if(!newTweet){
        throw new ApiError(400, "Error while creating new tweet please try again")
    }
    return res.status(201).json(new ApiResponse(201, newTweet, "Tweet created successfully"))


})

const getUserTweets = asyncHandler(async (req, res) => {
   const {userId} = req.params;

     if(!isValidObjectId(userId)){
        throw new ApiError(404, "User not found")
    }

    const tweets = await Tweet.find({ owner: userId});

    if(!tweets){
        throw new ApiError(404, "Tweets does not exist")
    }

   return res.status(200).json(new ApiResponse(200, tweets, "Tweets fetched Successfully"))


})

const updateTweet = asyncHandler(async (req, res) => {
    const {tweetId} = req.params;
    const {content} = req.body;
    if(!isValidObjectId(tweetId)){
        throw new ApiError(400, "Tweet Id is required")
    }

    if(!content){
        throw new ApiError(400, "Content is required")
    }

    const oldTweet = await Tweet.findOne( {
        $and: [{owner: req.user.id}, {_id: tweetId}]
    });

    if(!oldTweet){
        throw new ApiError(401, "You are not authorized to edit")
    }
    oldTweet.content = content;
    const updatedTweet = await oldTweet.save();

    if(!updatedTweet){
        throw new ApiError(500, "Tweet not updated")
    }

    return res.status(200).json(new ApiResponse(200, updateTweet, "Tweet Updated Successfully"))


})

const deleteTweet = asyncHandler(async (req, res) => {
    const {tweetId} = req.params;

     if(!isValidObjectId(tweetId)){
        throw new ApiError(400, "Tweet Id is required")
    }

    const deletedTweet = await Tweet.findOneAndDelete({
        _id: tweetId,
        owner: req.user?.id
    })

    if(!deletedTweet){
        throw new ApiError(404, "Tweet not found or you're not authorized to delete it")
    }

    return res.status(200).json(new ApiResponse(200, {}, "Tweet Deleted Successfully"))

})

export {
    createTweet,
    getUserTweets,
    updateTweet,
    deleteTweet
}