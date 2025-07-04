import { Router } from "express";
import { verifyJWT } from "../middlewares/user.middleware.js";
import { 
    toggleSubscription,
    getUserChannelSubscribers,
    getSubscribedChannels
 } from "../controllers/subscription.controllers.js";


 const router = Router();

 router.use(verifyJWT);

 router.route("/c/:channelId").get(getSubscribedChannels).post(toggleSubscription);

 router.route("/u/:subscriberId").get(getUserChannelSubscribers);

 export default router