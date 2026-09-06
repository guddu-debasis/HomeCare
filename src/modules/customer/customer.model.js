import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        trim: true,
        minlength: 2,
        maxlength: 50,
        required: [true, "Name is required"]
    },
    email: {
        type: String,
        trim: true,
        
        required: [true, "Email is required"],
        unique: true,
        lowercase: true
    },
    password: {
        type: String,
        required: [true, "Password is required"],
        minlength: 8,
        select: false
        //We know ;)
    },
    role: {
        type: String,
        default: "customer",
        enum: {
        values: ["customer"],
        message: "Role can only be customer" // 👈 Rejects anything other than "customer"
    },
        immutable: true,
    },
    dateOfBirth: {
        type: Date,
        required: [true, "Date of Birth is required"]
    },
    verificationToken: {type: String, select: false},
    refreshToken: {type: String, select: false},
    resetPasswordToken: {type: String, select: false},
    resetPasswordExpires: {type: Date, select: false},
}, {timestamps: true})


export default mongoose.model("User", userSchema)