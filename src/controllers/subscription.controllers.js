import mongoose, {isValidObjectId} from "mongoose"
import {User} from "../models/user.models.js"
import { Subscription } from "../models/subscription.models.js"
import {ApiError} from "../utils/apiError.js"
import {ApiResponse} from "../utils/apiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"


const toggleSubscription = asyncHandler(async (req, res) => {
    const {channelId} = req.params
    const subscriberId = req.user?.id;

    if(!(isValidObjectId(channelId) || isValidObjectId(subscriberId))){
        throw new ApiError(400, "Invalid Channel Id")
    }

    if(subscriberId.toString() === channelId){
        throw new ApiError(400, "You cannot subscribe to your own channel");
    }

    const foundChannel = await User.findOne(channelId);

    if(!foundChannel){
        throw new ApiError(404, "No Channel found");
    }

    const existingSub = await Subscription.findOneAndDelete({
        subscriber: subscriberId,
        channel: channelId
    });

    if(existingSub){
        return res.status(200).json(new ApiResponse(200, {}, "Unsubscribed successfully"))
    }

    const newSub = await Subscription.create({
        subscriber: subscriberId,
        channel: channelId
    });

    if(!newSub){
        throw new ApiError(500, "Some error happend while subscribing / unsubscribing")
    }

    return res.status(200).json(
        new ApiResponse(200, newSub, "Subscribed Successfully")
    )


    //if foundchhanle from subscription then update boolean value to true or false
    //send response to user
    // TODO: toggle subscription
})

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {

    const { channelId } = req.params;

    if(!isValidObjectId(channelId)){
        throw new ApiError(400, "Invalid Channel Id");
    }
    const user = User.findById(channelId);

    if(!user){
        throw new ApiError(404, "No channel found")
    }

    const subscription = await Subscription.aggregate(
        [
            {
                $match: {
                    channel: new mongoose.Types.ObjectId(String(channelId))
                }  
            },
            {
                $lookup: {
                    from: "users",
                    localField: "subscriber",
                    foreignField: "_id",
                    as: "subscriberDetails",
                    pipeline: [
                        {
                            $project: {
                                avatar: 1,
                                username: 1,
                                fullname: 1
                            }
                        }
                    ]
                }
            },
            { 
                $addFields: {
                    subscriber: {
                        $first: "$subscriberDetails"
                    } 
                }
            },
            {
                $project: {
                    subscriberDetails: 0
                }
            },
            {
                $match: {
                    subscriber: { $ne: null}
                }
            }
        ]
    )

    if(!subscription){
        throw new ApiError(500, "Something went wrong while fetching subscribers")
    }

    return res.status(200).json(new ApiResponse(200, subscription, "Fetched all subscriber successfully"))


    //get chhanelid from queryparams
    //chhanelid exist kare che?
    //if chhanleid eist 
    // user.aggreation.
    //lookup 
    // ref id - chhanleid
    // channel - $size 

})

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
    const { subscriberId } = req.params;

    if(isValidObjectId(subscriberId)){
        throw new ApiError(400, "Invalid Subscriber Id")
    }

     const user = User.findById(subscriberId);

    if(!user){
        throw new ApiError(404, "No channel found")
    }    

    const channels = Subscription.aggregate([
        {
            $match: {
                subscriber: new mongoose.Types.ObjectId(String(subscriberId))
            }
        },
        {
            $lookup: {
                from: "users",
                foreignField: "_id",
                localField: "channel",
                as: "channelSubscribed",
                pipeline: [
                    {
                        $project: {
                            avatar: 1,
                            fullname: 1,
                            username: 1
                        }
                    }
                ]
            }
        },
        {
            $addFields: {
                channel: {
                    $first: "$channelSubscribed"
                }
            }
        },
          {
                $project: {
                    channelSubscribed: 0
                }
            },
            {
                $match: {
                    channel: { $ne: null}
                }
            }
    ]);

    if(!channels){
        throw new ApiError(500, "Something went wrong while fetching channels")
    }

    return res.status(200).json(new ApiResponse(200, channels, "Channels Fetched Successfully"))
})

export {
    toggleSubscription,
    getUserChannelSubscribers,
    getSubscribedChannels
}