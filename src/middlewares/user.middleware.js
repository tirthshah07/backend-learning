import { User } from "../models/user.models.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import ApiError from "../utils/apiError.js";
import jwt from "jsonwebtoken"

export const verifyJWT = asyncHandler(async(req, res, next) => {
    try {
        const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "");
        console.log(token, 'token');
        
        if(!token){
            throw new ApiError(401, "Unauthorized request")
        }
    
        const isValidToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
        console.log(isValidToken, 'isvalidtoken');
        
        const user = await User.findById(isValidToken?.id).select("-password -refreshtoken");
        if(!user){
            throw new ApiError(401, "Invalid access token")
        }
        req.user = user;
        next()
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid access token")
    }

})