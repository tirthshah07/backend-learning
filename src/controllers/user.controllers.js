import { asyncHandler } from "../utils/asyncHandler.js";
import ApiError from "../utils/apiError.js";
import { User } from "../models/user.models.js";
import {uploadOnCloudinary, deleteFromCloudinary} from "../utils/cloudinary.js"
import ApiResponse from "../utils/apiResponse.js"
import jwt from "jsonwebtoken"
import mongoose from "mongoose";

const registerUser = asyncHandler(async (req, res) => {
    const {username, email, fullname, password} = req.body;
    console.log(req.body, "request body");
    
    if([fullname, username, email, password].some(field => field?.trim() === "")){
        throw new ApiError(400, "All fields are required");
        
    }
    const existedUser = await User.findOne({
        $or: [{username}, {email}]
    });

    if(existedUser){
        throw new ApiError(409, "Username or Email already exist."); 
    }
    console.log(req.files);
    
    const avatarLocalPath = req.files?.avatar[0]?.path;
    // const coverImageLocalPath = req.files?.coverimage[0]?.path;

    if(!avatarLocalPath){
        throw new ApiError(400, "Avatar File is required");
    }
    let coverImageLocalPath;
    if(req.files && req.files.coverimage && req.files.coverimage.length > 0 ){
        coverImageLocalPath = req.files?.coverimage[0]?.path;
    }


    const avatarUploadedFile = await uploadOnCloudinary(avatarLocalPath);
    const coverImageUploadedFile = await uploadOnCloudinary(coverImageLocalPath)

    if(!avatarUploadedFile){
        throw new ApiError(400, "Avatar File is required")
    }

    const user =await User.create({
        fullname,
        email,
        password,
        username: username.toLowerCase(),
        avatar: avatarUploadedFile.url,
        coverimage: coverImageUploadedFile?.url ?? ""
    });

    const createdUser = await User.findById(user._id).select(
        ["-password -refreshtoken"]
    )
    if(!createdUser){
        throw new ApiError(500, "Something went wrong while registering user")
    }
    return res.status(201).json(new ApiResponse(200, createdUser, "User Registered Successfully"))

})

const loginUser = asyncHandler(async (req, res) => {
    const {email, password, username} = req.body;

    if(!(username || email)){
        throw new ApiError(400, "Username or email is required")
    }
    const user = await User.findOne({
        $or: [{username}, {email}]
    });

    if(!user){
    throw new ApiError(404, "User not found")
    }
    const passwordValid = await user.isPasswordCorrect(password);
    if(!passwordValid){
        throw new ApiError(401, "Invalid user credentials")
    }

    const {accessToken, refreshToken} = await generateAccessTokenAndRefreshToken(user._id);

    const loggedInUser = await User.findById(user._id).select("-password -refreshtoken");
    
    const options = {
        httpOnly: true,
        secure: true
    };
    
    res.status(200).cookie("accessToken", accessToken, options).cookie("refreshToken", refreshToken, options).json(new ApiResponse(200, {
        user: loggedInUser, accessToken, refreshToken
    }));

});

const logoutUser =asyncHandler(async(req, res) => {
    const updatedUser = User.findByIdAndUpdate(req.user._id, {
        $set: {
            refreshtoken: undefined
        }

    },{
        new: true
    });
    const options = {
        httpOnly: true,
        secure: true
    };

   return res.status(200).clearCookie("accessToken", options).clearCookie("refreshToken", options).json(new ApiResponse(200, {}, "User Logged Out successfully"))
})

const generateNewRefreshToken = asyncHandler(async(req, res) => {
    const incomingToken = req.cookie?.refreshToken || req.body.refreshToken;
    if(!incomingToken){
        throw new ApiError(401, "Unauthorized request");
    }

    try {
        const decodedToken = jwt.verify(incomingToken, process.env.REFRESH_TOKEN_SECRET);
        
        const user = await User.findById(decodedToken.id).select("-password -refreshtoken");

        if(!user){
            throw new ApiError(401, "Invalid refresh token")
        }

        if(incomingToken !== user?.refreshtoken){
            throw new ApiError(401, "Refresh token is expired or used")
        }

    const {accessToken, newRefreshToken} = await generateAccessTokenAndRefreshToken(user._id);

    const options = {
        httpOnly: true,
        secure: true
    };

       return res.status(200).cookie("accessToken", accessToken,options).cookie("refreshToken", refreshToken,options).json(new ApiResponse(200, 
        {accessToken, refreshToken: newRefreshToken}
        , "Access Token Generated Succssfully"))
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid Refresh token")
    }  
});

const changeCurrentPassword = asyncHandler(async(req, res) => {
    const {oldPassword, newPassword} = req.body;
    if(!oldPassword && !newPassword){
        throw ApiError(400, "Old Password and new Password is required");
    }
    const user = await User.findById(req.user?.id);

    const isPasswordValid = user.isPasswordCorrect(oldPassword);
    if(!isPasswordValid){
        throw new ApiError(400, "Old Password not matched");
    }

    user.password = newPassword;
    user.save({validateBeforeSave: false});

    return res.status(200).json(new ApiResponse(200, {}, "Password changed successfully"));

});

const getCurrentUser = asyncHandler(async(req, res) => {
    return res.status(200).json(new ApiResponse(200, req.user, "User Details fetched successfully"));
});

const updateAccountDetails = asyncHandler(async(req,res) => {
    const {fullname, email} = req.body;

     if (!fullname || !email) {
        throw new ApiError(400, "All fields are required")
    }

    const user = await User.findByIdAndUpdate(req.user.id, 
        {
            $set: {
                fullname,
                email
            }
        }, 
        {
            new: true
        }
    ).select("-password");

    return res.status(200).json(new ApiResponse(200, user, "User updated successfully"))
});

const updateUserAvatar = asyncHandler(async(req, res) => {
    const avatarLocalPath = req.file?.path;
    if(!avatarLocalPath){
        throw new ApiError(400, "Avatar Image not found");
    }

    
    const deletePreviousAvatar = await deleteFromCloudinary(req.user?.avatar);

    if(!deletePreviousAvatar){
        throw new ApiError("400", "Error while deleting previous avatar")
    }
    
    const avatar = await uploadOnCloudinary(avatarLocalPath);

    if(!avatar.url){
        throw new ApiError(400, "Some error occured while uploading avatar image")
    };

    const user = await User.findByIdAndUpdate(req.user?.id, 
        {
            $set: {
                avatar: avatar.url
            }
        },
        {new: true}
    ).select("-password");

    return res.status(200).json(new ApiResponse(200, user, "Avatar file updated successfully"))

});

const updateUserCoverImage =  asyncHandler(async(req, res) => {
    const coverimageLocalPath = req.file?.path;
    if(!coverimageLocalPath){
        throw new ApiError(400, "Cover Image not found");
    }

    const isDeletedCoverImage = await deleteFromCloudinary(req.user?.coverimage);

    if(!isDeletedCoverImage){
        throw new ApiError(400, "error while deleting previous cover Image")
    }

    const coverimage = await uploadOnCloudinary(coverimageLocalPath);

    if(!coverimage.url){
        throw new ApiError(400, "Some error occured while uploading coverimage image")
    };

    const user = await User.findByIdAndUpdate(req.user?.id, 
        {
            $set: {
             coverimage: coverimage.url
            }
        },
        {new: true}
    ).select("-password")

    return res.status(200).json(new ApiResponse(200, user, "Coverimage file updated successfully"))
});

const getUserChannelProfile = asyncHandler(async(req, res) =>{
    const {username} = req.params;

    if(!username?.trim()){
        throw new ApiError(400, "Username is missing");
    }

  const channel = await User.aggregate([
        {
            $match: {
            username: username?.toLowerCase()
        }
    },
        {
            $lookup: {
            from: "subscriptions",
            foreignField: "$channel",
            localField: "_id",
            as: "subscribers"
        }
    },
    {
        $lookup: {
            from: "subscriptions",
            foreignField: "$subscriber",
            localField: "_id",
            as: "subscribedTo"
        }
    },
    {
        $addFields: {
            subscribersCount: {
                $size: "$subscribers"
            },
            channelSubscribedTo: {
                $size: "$subscribedTo"
            },
            isSubscribed: {
                $cond: 
                {
                    if: {
                        $in: [req.user?.id, "$subscribers.subscriber"]
                    },
                    then: true,
                    else: false
                }
            }
        }
    },
    {$project: 
        {
        username: 1,
        email: 1,
        fullname: 1,
        coverimage: 1,
        avatar: 1,
        subscribersCount: 1,
        channelSubscribedTo: 1,
        isSubscribed: 1
        }
    }
    ])
    console.log(channel, "channel");
    if(!channel.length){
        throw new ApiError(404, "Channel does not exist")
    }
    return res.status(200).json(new ApiResponse(200, channel[0], "User chhanel fetched successfully"))
})

const generateAccessTokenAndRefreshToken = async function(userId){
    try {
        const user = await User.findById(userId);
        const accessToken = await user.generateAccessToken();
        const refreshToken = await user.generateRefreshToken();
        user.refreshtoken = refreshToken;
        await user.save({validateBeforeSave: false});
        return {accessToken, refreshToken}
    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating referesh and access token")
    }
}

const getWatchHistory = asyncHandler(async (req, res) => {
    const user = await User.aggregate([
        {
            $match: {
            _id: new mongoose.Types.ObjectId(String(req.user.id))
                    }
        },
        {
            $lookup: {
                from: "videos",
                localField: "watchhistory",
                foreignField: "_id",
                as: "watchHistory",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            pipeline: [
                                {
                                    $project: {
                                        username: 1,
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
        }
    ]);
    if(!user){
        throw new ApiError(404, "User not found")
    }
    return res.status(200).json(
        new ApiResponse(200, user[0].watchhistory, "Watch history fecthed successfully")
        // new ApiResponse(200, user[0].watchHistory, "watchHistory")
    )
})



export {registerUser, loginUser, logoutUser, generateNewRefreshToken, changeCurrentPassword, getCurrentUser, updateAccountDetails, updateUserCoverImage, updateUserAvatar, getUserChannelProfile, getWatchHistory}