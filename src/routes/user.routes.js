import { Router } from "express";
import { registerUser, loginUser, logoutUser, generateNewRefreshToken, changeCurrentPassword, getCurrentUser, updateAccountDetails, updateUserCoverImage, updateUserAvatar, getUserChannelProfile, getWatchHistory } from "../controllers/user.controllers.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/user.middleware.js";


const router = Router();

router.route("/register").post(
    upload.fields([
        {name: "avatar",
        maxCount: 1
        },
        {name: "coverimage",
        maxCount: 1
        }
    ])
    ,registerUser);

router.route("/login").post(loginUser)

router.route("/logout").post(verifyJWT ,logoutUser)

router.route("/refresh-token").post(generateNewRefreshToken)

router.route("/change-password").post(verifyJWT, changeCurrentPassword)

router.route("/get-user").get(verifyJWT,getCurrentUser)

router.route("/update-user").patch(verifyJWT, updateAccountDetails)

router.route("/avatar").patch(verifyJWT, upload.single("avatar") ,updateUserAvatar);

router.route("/coverimage").patch(verifyJWT, upload.single("coverimage") ,updateUserCoverImage);

router.route("/c/:username").get(verifyJWT, getUserChannelProfile)

router.route("/watchHistory").get(verifyJWT, getWatchHistory)


export default router