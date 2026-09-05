import ApiError from "../../common/utils/api-error.js"
import { generateResetToken,generateAccessToken } from "../../common/utils/jwt.utils.js";
import Seller from "./seller.model.js"

const register = async ({name, email, password, role, dateOfBirth})=> {
    
    const existing = await Seller.findOne({email})
    if(existing) throw ApiError.conflict("Email already exisits");

    const {rawToken, hashedToken} = generateResetToken()

    const user = await Seller.create({
        name,
        email,
        password,
        role,
        dateOfBirth,
        verificationToken: hashedToken
    })

    // TODO: send an email to user with token: rawToken

    const userObj = user.toObject()
    delete userObj.password
    delete userObj.verificationToken

    return userObj
}

const login = async ({email, password}) => {
    // 1. Find user and explicitly select password if it's hidden by default in your schema
    const user = await Seller.findOne({ email });
    if (!user) throw ApiError.notFound("User not found");

    // 2. Verify password (added 'await' assuming bcrypt is used inside the method)
    const isPasswordValid = await user.verifyPassword(password);
    if (!isPasswordValid) throw ApiError.unauthorized("Invalid credentials");

    // 3. Generate JWT access token
    const token = generateAccessToken({ 
        id: user._id, 
        role: user.role 
    });

    // 4. Clean up sensitive data before returning
    const userObj = user.toObject();
    delete userObj.password;
    delete userObj.verificationToken;

    // 5. Return both the user details and the token
    return {
        user: userObj,
        token
    };
}


export {register,login}