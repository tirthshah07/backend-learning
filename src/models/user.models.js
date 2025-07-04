import mongoose, {Schema} from "mongoose";
import  jwt from "jsonwebtoken";
import bcrypt from "bcrypt"

const userSchema = new Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        index: true,
        trim: true,
        lowercase: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    fullname: {
        type: String,
        required: true,
        trim: true,
    },
    password: {
        type: String,
        required: [true, 'Password is required'],
    },
    watchhistory: [{
        type: Schema.Types.ObjectId,
        ref: "Video"
    }],
    refreshtoken : {
        type: String
    },
    coverimage: {
        type: String
    },
    avatar: {
        type: String,
        required: true
    } 
}, {
    timestamps: true
})
userSchema.pre("save", async function (next) {

    if(!this.isModified("password")) return next();

    this.password = await bcrypt.hash(this.password, 10)
    next();
    
})

userSchema.methods.isPasswordCorrect = async function (password) {
    return await bcrypt.compare(password, this.password)
} 

userSchema.methods.generateRefreshToken  = async function () {
   return jwt.sign({
        id: this._id
    }, process.env.REFRESH_TOKEN_SECRET, {expiresIn: process.env.REFRESH_TOKEN_EXPIRY})
}

userSchema.methods.generateAccessToken = function (){
   return jwt.sign({
        id: this._id,
        email: this.email,
        fullname: this.fullname,
        username: this.username
    }, process.env.ACCESS_TOKEN_SECRET, {expiresIn: process.env.ACCESS_TOKEN_EXPIRY})
}
export const User = mongoose.model("User", userSchema)