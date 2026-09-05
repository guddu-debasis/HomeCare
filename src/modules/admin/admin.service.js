import ApiError from "../../common/utils/api-error.js"
import { generateResetToken,generateAccessToken } from "../../common/utils/jwt.utils.js";
import Admin from "./admin.model.js"

const register = async ({name, email, password, role, dateOfBirth})=> {
    
    const existing = await Admin.findOne({email})
    if(existing) throw ApiError.conflict("Email already exisits");

    const {rawToken, hashedToken} = generateResetToken()

    const user = await Admin.create({
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
    const admin = await Admin.findOne({ email });
    if (!admin) throw ApiError.notFound("Admin not found");

    // 2. Verify password (added 'await' assuming bcrypt is used inside the method)
    const isPasswordValid = await admin.verifyPassword(password);
    if (!isPasswordValid) throw ApiError.unauthorized("Invalid credentials");

    // 3. Generate JWT access token
    const token = generateAccessToken({ 
        id: admin._id, 
        role: admin.role 
    });

    // 4. Clean up sensitive data before returning
    const adminObj = admin.toObject();
    delete adminObj.password;
    delete adminObj.verificationToken;

    // 5. Return both the admin details and the token
    return {
        user: adminObj,
        token
    };
}


export {register,login}