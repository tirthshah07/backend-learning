
import { Router } from "express";
import { verifyJWT } from "../middlewares/user.middleware.js";
import {getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus} from "../controllers/video.controllers.js";
import { upload } from "../middlewares/multer.middleware.js";

const router = Router();

router.use(verifyJWT);

router.route("/").get(getAllVideos).post(upload.fields(
    [
        {
            name: "video",
            maxCount: 1
        },
        {
            name: "thumbnail",
            maxCount: 1
        }
    ]
),
publishAVideo
);

router.route("/:videoId").get(getVideoById).delete(deleteVideo).patch(upload.single("thumbnail"), updateVideo);

router.route("/toggle/publish/:videoId").patch(togglePublishStatus);

export default router
