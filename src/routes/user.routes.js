import { Router } from "express";
import { loginUser, logoutUser, registerUser , refreshAccessToken, changeCurrentPassword, getCurrentUser, updateAccountDetails, updateAvatar, updateCoverImage, getUserChannelProfile, getWatchHistory } from "../controllers/userRegister.controller.js";
import  { upload } from "../middlewares/multer.middleware.js"
import { verifyJwt } from "../middlewares/auth.middleware.js";

const router = Router()

router.route("/register").post(
    upload.fields([
        {
            name : "avatar",
            maxCount : 1
        },
        {
            name: "coverImage",
            maxCount : 1
        }
    ])
    ,
    registerUser
)

router.route("/login").post(loginUser)

// secured routes 

router.route("/logout").post(verifyJwt ,logoutUser)
router.route("/refresh-token").post(refreshAccessToken)
router.route("/change-password").post(verifyJwt,changeCurrentPassword)
router.route("/current-user").get(verifyJwt,getCurrentUser)
router.route("/update-account").patch(verifyJwt,updateAccountDetails)
router.route("avatar").patch(verifyJwt,upload.single("avatar"),updateAvatar)
router.route("/coverimage").patch(verifyJwt,upload.single("coverImage"),updateCoverImage)
router.route("/c/:username").get(verifyJwt,getUserChannelProfile)
router.route("/watch-history").get(verifyJwt,getWatchHistory)

export default router