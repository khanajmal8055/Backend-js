import mongoose from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken"

const userSchema = new mongoose.Schema(
    {
        username : {
            type : String,
            required : true,
            lowercase : true,
            unique : true,
            trim : true,
            index : true,
        },
        email : {
            type : String,
            required : true,
            unique : true,
            lowercase : true,
            trim : true
        },
        fullName : {
            type : String,
            required : true,
            index : true,
            trim  : true
        },
        avatar : {
            type : String,
            required : true
        },
        coverImage : {
            type : String
        },
        watchHistory : [
            {
                type : mongoose.Schema.Types.ObjectId,
                ref : 'Video'
            }
        ],
        password : {
            type : String,
            required : [true, "Password is required"] ,
            
        },
        refreshTokens : {
            type : String
        }
    },
    {timestamps : true}
)

// middleware : it checks in between process that is when we create model but before the model is save into DB it will hash the password 
userSchema.pre("save" , async function (next) {
    // this if conditon checked whenever the password is modified then only the password encrypt otherwise it will retrun to the next middleware
    if(!this.isModified("password")) return next();
    
    this.password = await bcrypt.hash(this.password,10)
    next();
})

// our own method to check is the encrypted password and the password enter by the user is same or not
userSchema.methods.isPasswordCorrect = async function(password) {
    return await bcrypt.compare(password,this.password)
}

userSchema.methods.generateAccessToken = function () {
    return jwt.sign(
        {
            _id : this._id,
            email : this.email,
            username : this.username,
            fullName : this.fullName
        },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn : process.env.ACCESS_TOKEN_EXPIRY
        }
    )
}

userSchema.methods.generateRefreshToken = function () {
    return jwt.sign(
        {
            _id : this._id,
            email : this.email,
            username : this.username,
            fullName : this.fullName
        },
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn : process.env.REFRESH_TOKEN_EXPIRY
        }
    )
}

export const User = mongoose.model('User' , userSchema)