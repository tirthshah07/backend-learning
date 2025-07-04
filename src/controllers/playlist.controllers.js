import mongoose, {isValidObjectId} from "mongoose"
import {Playlist} from "../models/playlist.models.js"
import {ApiError} from "../utils/apiError.js"
import {ApiResponse} from "../utils/apiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import { Video } from "../models/video.models.js"


const createPlaylist = asyncHandler(async (req, res) => {
    const {name, description, videos} = req.body;
    const userId = req.user?.id;

    if([name, description].some((field) => field?.trim() === "" || field.trim() === undefined)){
        throw new ApiError(400, "Name and Description is required")
    }

    if(videos && !Array.isArray(videos)){
        throw new ApiError(400, "Video list but me in array");
    }

    if(!userId){
        throw new ApiError(400, "Invalid user Id")
    }

    const playlist = await Playlist.create({
        name,
        description,
        videos: videos || [],
        owner: userId
    });

    const isPlaylistCreated = await Playlist.findById(playlist._id).select("-owner");

     if(!isPlaylistCreated){
        throw new ApiError(500, "Something went wrong while creating new playlist")
    };

    return res.status(201).json(new ApiResponse(201, isPlaylistCreated, "Playlist created successfully"))
    //TODO: create playlist
})

const getUserPlaylists = asyncHandler(async (req, res) => {
    const {userId} = req.params;

    if(!isValidObjectId(userId)){
        throw new ApiError(400, "Invalid UserId")
    }
    const userPlaylists = await Playlist.find({
        owner: userId
    });

    if(!userPlaylists){
        throw new ApiError(404, "Something went wrong while fetching playlists")
    }

    return res.status(200).json(new ApiResponse(200, userPlaylists, "Playlist fetched successfully"))

    //TODO: get user playlists
})

const getPlaylistById = asyncHandler(async (req, res) => {
    const {playlistId} = req.params;

    if(!isValidObjectId(playlistId)){
        throw new ApiError(400, "Invalid Playlist")
    }

    const foundPlaylist = await Playlist.findById(playlistId);

    if(!foundPlaylist){
        throw new ApiError(404, "No playlist found for this Playlist Id")
    }

    return res.status(200).json(new ApiResponse(200, foundPlaylist, "Playlist fetched by Id"))
    //TODO: get playlist by id
})

const addVideoToPlaylist = asyncHandler(async (req, res) => {
    const {playlistId, videoId} = req.params;

    if(!playlistId || !videoId){
        throw new ApiError(400, "PlaylistId and VideoId is required")
    }
    if(!isValidObjectId(playlistId) || !isValidObjectId(videoId)){
        throw new ApiError(400, "Invalid Playlist Id or VideoId")
    }

    const availableVideo = await Video.findById(videoId);

    if(!availableVideo){
        throw new ApiError(404, "No Video Found")
    }

    const playListExist = await Playlist.findById(playlistId);

    if(!playListExist){
        throw new ApiError(404, "No Such Playlist found")
    }

    const sameVideoExist = playListExist.videos.includes(videoId);

    if(sameVideoExist){
        throw new ApiError(409, "Video Already exist in playlist")
    }

    playListExist.videos.push(videoId);

    await playListExist.save();

    return res.status(200).json(new ApiResponse(200, {}, "Video Added to playlist successfully"))

})

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
    const {playlistId, videoId} = req.params;

    if(!playlistId || !videoId){
        throw new ApiError(400, "PlaylistId and VideoId is required")
    }
    if(!isValidObjectId(playlistId) || !isValidObjectId(videoId)){
        throw new ApiError(400, "Invalid Playlist Id or VideoId")
    }

     const availableVideo = await Video.findById(videoId);

    if(!availableVideo){
        throw new ApiError(404, "No Video Found")
    }

    const playListExist = await Playlist.findById(playlistId);

    if(!playListExist){
        throw new ApiError(404, "No Such Playlist found")
    }


   const index = await playListExist.videos.findIndex((video) => video.toString() === videoId.toString());

   if(index === -1){
    throw new ApiError(409, "No Video found in Playlist");
   }

   playListExist.videos.splice(index, 1);

   await playListExist.save();

   return res.status(200).json(new ApiResponse(200, {}, "Video removed from playlist successfully"))


    // TODO: remove video from playlist

})

const deletePlaylist = asyncHandler(async (req, res) => {
    const {playlistId} = req.params

    if(!playlistId){
        throw new ApiError(400, "PlaylistId is required")
    }

    const isPlaylistFound = await Playlist.findOneAndDelete({
        _id: playlistId,
        owner: req.user?.id
    });

    if (!isPlaylistFound) {
        throw new ApiError(404, "Playlist not found or you're not authorized");
    }

    return res.status(200).json(new ApiResponse(200, {}, "Playlist deleted successfully"))

    // TODO: delete playlist
})

const updatePlaylist = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    const {name, description} = req.body
    //TODO: update playlist
     if(!playlistId){
        throw new ApiError(400, "PlaylistId is required")
    }

    if([name, description].some(field => !field || field.trim() === "")){
        throw new ApiError(400, "Name and Description are required");
    }

    const updatedPlaylist = await Playlist.findOneAndUpdate({
        owner: req.user?.id,
        _id: playlistId
    }, 
    {
        name,
        description
    }, 
    {
        new: true
    }
    )

    if(!updatedPlaylist){
        throw new ApiError(404, "Playlist not found or unauthorized");
    }

    return res.status(200).json(new ApiResponse(200, updatedPlaylist,"Playlist updated successfully"))
})

export {
    createPlaylist,
    getUserPlaylists,
    getPlaylistById,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    deletePlaylist,
    updatePlaylist
}