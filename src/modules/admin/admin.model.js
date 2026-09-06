import mongoose from 'mongoose';

const adminSchema = new mongoose.Schema({
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
        default: "admin",
        enum: {
        values: ["admin"],
        message: "Role can only be admin" // 👈 Rejects anything other than "admin"
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

export default mongoose.model("Admin", adminSchema)