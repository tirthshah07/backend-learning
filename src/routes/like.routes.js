import { Router } from "express";
import { verifyJWT } from "../middlewares/user.middleware.js";
import { toggleCommentLike,
    toggleTweetLike,
    toggleVideoLike,
    getLikedVideos } from "../controllers/like.controllers.js";

const router = Router();

router.use(verifyJWT);

router.route("/toggle/v/:videoId").post(toggleVideoLike);

router.route("/toggle/c/:commentId").post(toggleCommentLike);

router.route("/toggle/t/:tweetId").post(toggleTweetLike);

router.route("/videos").post(getLikedVideos);


export default router