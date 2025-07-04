import { v2 as cloudinary } from 'cloudinary';
import fs from "fs"
import ApiError from './apiError.js';

// (async function() {

    // Configuration
    cloudinary.config({ 
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
        api_key: process.env.CLOUDINARY_API_KEY, 
        api_secret: process.env.CLOUDINARY_API_SECRET // Click 'View API Keys' above to copy your API secret
    });
    
    // // Upload an image
    //  const uploadResult = await cloudinary.uploader
    //    .upload(
    //        'https://res.cloudinary.com/demo/image/upload/getting-started/shoes.jpg', {
    //            public_id: 'shoes',
    //        }
    //    )
    //    .catch((error) => {
    //        console.log(error);
    //    });
    
    // console.log(uploadResult);
    
    // // Optimize delivery by resizing and applying auto-format and auto-quality
    // const optimizeUrl = cloudinary.url('shoes', {
    //     fetch_format: 'auto',
    //     quality: 'auto'
    // });
    
    // console.log(optimizeUrl);
    
    // Transform the image: auto-crop to square aspect_ratio
    // const autoCropUrl = cloudinary.url('shoes', {
    //     crop: 'auto',
    //     gravity: 'auto',
    //     width: 500,
    //     height: 500,
    // });
    
    // console.log(autoCropUrl);    
// })();
const uploadOnCloudinary = async(filePath) => {
    try {
        if(!filePath) return null
       const response = await cloudinary.uploader.upload(filePath, {resource_type: "auto"});
        console.log("File us uploaded on cloudinary", response.url);
        fs.unlinkSync(filePath)
        return response
        
    } catch (error) {
        fs.unlinkSync(filePath)
        return null
    }
}

const deleteFromCloudinary =async(publicId) => {
    try {
        if(!publicId) return null;
        const actualPublicId = publicId.split("/").pop().split(".")[0];
        if(!actualPublicId){
            throw new ApiError(404, "Public Id not found");
        }
        const deletedResponse = await cloudinary.uploader.destroy(actualPublicId, {resource_type: "auto"});
        if(deletedResponse.result !== "ok"){
            throw new ApiError(401, 'Error deleting from Cloudinary');
        }
        return deletedResponse
    } catch (error) {
        return null
    }
}

export { uploadOnCloudinary, deleteFromCloudinary}