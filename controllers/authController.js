const User = require("../models/userModel");
const Otp = require("../models/otpModel");
const util = require("util");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const {
  CustomAPIError,
  UNAUTHORIZED_USER,
  BAD_REQUEST,
  NOT_FOUND,
} = require("../errors");
const { sendEmailToUser, sendOTP } = require("../utils/email");

function generateRandomKey(length) {
  // Use only numbers for simplicity and to avoid confusion
  const charset = "0123456789";
  let password = "";

  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * charset.length);
    password += charset[randomIndex];
  }

  return password;
}

const sendRes = async (res, statusCode, token, user, msg) => {
  if (token)
    res.cookie("token", token, {
      expires: new Date(
        Date.now() + process.env.JWT_COOKIE_EXPIRE * 24 * 60 * 60 * 1000
      ),
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
    });

  const accessedCourses = await user.getAccessedCourses();

  res.status(statusCode).send({
    status: "success",
    message: msg,
    user: user,
    accessedCourses,
  });
};

const createJWT = (user) =>
  jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_COOKIE_EXPIRE * 24 * 60 * 60,
  });

module.exports.registerAdmin = async (req, res, next) => {
  try {
    console.log("Register admin request body:", JSON.stringify(req.body));
    
    // 1. Validate required fields
    const { email, otp, name, password } = req.body;
    
    if (!email || !otp || !name || !password) {
      console.log("Missing required fields:", {
        email: Boolean(email),
        otp: Boolean(otp),
        name: Boolean(name),
        password: Boolean(password)
      });
      return res.status(400).json({
        status: "error",
        message: "Missing required fields. Please provide email, OTP, name, and password."
      });
    }
    
    // 2. Check for existing user before OTP verification
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.log(`User already exists with email: ${email}`);
      return res.status(400).json({
        status: "error",
        message: "A user with this email already exists"
      });
    }
    
    // 3. Normalize OTP
    const normalizedOtp = String(otp).trim();
    console.log(`Verifying OTP: ${normalizedOtp} for email: ${email}`);
    
    // 4. Verify OTP without immediately deleting it
    const otpDoc = await Otp.findOne({ email });
    
    if (!otpDoc) {
      console.log(`No OTP record found for email: ${email}`);
      return res.status(400).json({
        status: "error",
        message: "No OTP found for this email. Please request a new OTP."
      });
    }
    
    // 5. Check OTP expiration
    const otpCreationTime = new Date(otpDoc.time).getTime();
    const currentTime = new Date().getTime();
    const twentyMinutesInMs = 20 * 60 * 1000;
    
    if (currentTime - otpCreationTime > twentyMinutesInMs) {
      console.log(`OTP expired. Created: ${new Date(otpCreationTime).toISOString()}, Current: ${new Date(currentTime).toISOString()}`);
      await Otp.deleteOne({ _id: otpDoc._id });
      return res.status(400).json({
        status: "error",
        message: "OTP has expired. Please request a new OTP."
      });
    }
    
    // 6. Verify OTP value
    const storedOtp = String(otpDoc.otp).trim();
    if (normalizedOtp !== storedOtp) {
      console.log(`OTP mismatch. Expected: "${storedOtp}", Received: "${normalizedOtp}"`);
      return res.status(400).json({
        status: "error",
        message: "Invalid OTP. Please check and try again."
      });
    }
    
    // 7. If OTP validation successful, create user
    console.log("OTP verification successful, creating new admin user");
    
    // Delete the OTP document now that we've verified it
    await Otp.deleteOne({ _id: otpDoc._id });
    
    // 8. Create the user account
    try {
      // Generate a username from the email if needed
      const username = email.split('@')[0];
      
      const newUser = await User.create({
        name,
        email,
        password,
        role: "administrator",
        username: username // Add username to avoid null username issue
      });
      
      // 9. Create JWT and send response
      const token = createJWT(newUser);
      
      // 10. Format user data for response
      const userData = { ...newUser._doc };
      delete userData.password;
      
      // Set the cookie
      res.cookie("token", token, {
        expires: new Date(
          Date.now() + process.env.JWT_COOKIE_EXPIRE * 24 * 60 * 60 * 1000
        ),
        secure: process.env.NODE_ENV === "production",
        httpOnly: true,
      });
      
      // Format response to match what the client expects
      return res.status(201).json({
        status: "success",
        message: "Registration successful",
        user: userData,
        accessedCourses: []
      });
      
    } catch (userCreationError) {
      console.error("Error creating user:", userCreationError);
      
      // Check if this is a duplicate key error
      if (userCreationError.code === 11000) {
        // Handle duplicate key error specifically
        const keyPattern = userCreationError.keyPattern;
        const keyValue = userCreationError.keyValue;
        
        console.error("Duplicate key error:", { keyPattern, keyValue });
        
        return res.status(400).json({
          status: "error",
          message: `A user with this ${Object.keys(keyPattern).join(', ')} already exists.`
        });
      }
      
      return res.status(400).json({
        status: "error",
        message: `Failed to create user: ${userCreationError.message}`
      });
    }
    
  } catch (error) {
    console.error("Error in registerAdmin:", error);
    return res.status(500).json({
      status: "error",
      message: "An unexpected error occurred during registration"
    });
  }
};

module.exports.preRegisterDev = async (req, res, next) => {
  try {
    const { name, email, role, mailText } = req.body;
    if (!["expert", "faculty"].includes(req.body.role)) {
      return next(new BAD_REQUEST("role can only include 'expert' or 'faculty'"));
    }

    // Generate a username from the email
    const username = email.split('@')[0];

    //If user already in database
    let newPass;
    const query = User.findOne({ email }).select(
      "name email preRegistered password username"
    );
    query.skipPreMiddleware = true;
    let user = await query;
    
    //If user is an PreRegistered user
    if (user && !user.preRegistered)
      throw new BAD_REQUEST("User with this Email already exists");

    newPass = generateRandomKey(process.env.USER_PASSWORD_LEN);
    if (!user) {
      user = new User({
        name: name,
        email: email,
        role: role,
        preRegistered: true,
        username: username
      });
      user.password = newPass;
      await user.save();
    }
    //if user is in database but not preRegistered
    else {
      const encryptPass = await bcrypt.hash(newPass, 12);
      const query = User.findOneAndUpdate(
        { email },
        { name, role, password: encryptPass, username },
        { new: true }
      );
      query.skipPreMiddleware = true;
      user = await query;
    }

    //email the new user credentials to user.email
    const mailUser = { ...user._doc, password: newPass };
    await sendEmailToUser(mailUser, mailText);

    res.status(200).json({
      status: "success",
      message: "login credential has been send to user on provided email",
      data: { ...mailUser, password: undefined },
    });
  } catch (error) {
    console.error("Error in preRegisterDev:", error);
    
    // Handle duplicate key error
    if (error.code === 11000) {
      return res.status(400).json({
        status: "error",
        message: `A user with this ${Object.keys(error.keyPattern).join(', ')} already exists.`
      });
    }
    
    return next(error);
  }
};

module.exports.registerDev = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    if (!email || !name || !password) {
      return next(new BAD_REQUEST("Invalid request body"));
    }

    // Generate a username from the email
    const username = email.split('@')[0];

    let query = User.findOne({ email }).select("+password +preRegistered");
    query.skipPreMiddleware = true;
    let user = await query;

    if (!user) return next(new UNAUTHORIZED_USER("user mail id does not match"));

    if (!user.preRegistered)
      return next(new UNAUTHORIZED_USER("user already registered"));

    const isMatch = await user.checkPassword(password, user.password);
    if (!isMatch)
      return next(new UNAUTHORIZED_USER("user password does not match"));

    query = User.findOneAndUpdate(
      { email },
      { name, preRegistered: false, username },
      { new: true }
    );
    query.skipPreMiddleware = true;
    await query;
    user = await User.findOne({ email });

    const token = createJWT(user);
    user._doc.password = undefined;
    user._doc._id = undefined;
    await sendRes(res, 200, token, user);
  } catch (error) {
    console.error("Error in registerDev:", error);
    
    // Handle duplicate key error
    if (error.code === 11000) {
      return res.status(400).json({
        status: "error",
        message: `A user with this ${Object.keys(error.keyPattern).join(', ')} already exists.`
      });
    }
    
    return next(error);
  }
};

module.exports.verifyByToken = async (req, res, next) => {
  const token = req.cookies.token;
  if (!token) {
    throw new UNAUTHORIZED_USER("Invalid Authentication! No token provided.");
  }
  
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.id);

    if (!user) {
      throw new UNAUTHORIZED_USER("User not found. Please login again.");
    }
    
    if (payload.role !== user.role) {
      throw new UNAUTHORIZED_USER("User role mismatch. Please login again.");
    }

    const newToken = createJWT(user);
    sendRes(res, 200, newToken, user);
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      throw new UNAUTHORIZED_USER("Invalid token. Please login again.");
    }
    if (error.name === 'TokenExpiredError') {
      throw new UNAUTHORIZED_USER("Token expired. Please login again.");
    }
    throw error;
  }
};

module.exports.login = async (req, res, next) => {
  const { email, password } = req.body;
  if (!email || !password)
    return next(new BAD_REQUEST("User mail-id or password not provide"));
  const newUser = await User.findOne({ email }).select("+password");

  if (!newUser)
    return next(
      new UNAUTHORIZED_USER("user mail id or password does not match")
    );

  const isMatch = await newUser.checkPassword(password, newUser.password);
  if (!isMatch)
    return next(new UNAUTHORIZED_USER("user password does not match"));

  const token = createJWT(newUser);
  newUser.password = undefined;
  await sendRes(res, 200, token, newUser);
};

module.exports.logout = async (req, res) => {
  res
    .clearCookie("token", { expires: new Date(0) })
    .status(200)
    .send({ status: "success", message: "Logout successful" });
};

module.exports.protect = async (req, res, next) => {
  //Checking that token exists
  let token = req.cookies?.token;

  //Verifying Token
  if (!token) return next(new UNAUTHORIZED_USER("User not logged in"));
  const decoded = await util.promisify(jwt.verify)(
    token,
    process.env.JWT_SECRET
  );

  //Checking that user still exists.
  const freshUser = await User.findById(decoded.id);

  if (!freshUser)
    return next(
      new UNAUTHORIZED_USER("User belonging to token no longer exits")
    );

  //Check if user changed password after token was issued
  if (freshUser.isPasswordChangedAfter(decoded.iat)) {
    return next(
      new UNAUTHORIZED_USER(
        "User recently changed password! please log in again"
      )
    );
  }

  req.user = freshUser; // May be used in future
  const accessedCourse = await freshUser.getAccessedCourses();
  res.accessedCourse = accessedCourse;

  next();
};

module.exports.restrictTo = function (...roles) {
  if (
    !roles.every((el) => ["administrator", "faculty", "expert"].includes(el))
  ) {
    throw new Error("Operationl Erorr - Invalid roles");
  }

  return (req, res, next) => {
    if (
      req.user?.email &&
      req.body?.email &&
      req.user.email === req.body.email
    ) {
      return next();
    }
    if (!req.user || !roles.includes(req.user.role)) {
      return next(
        new CustomAPIError(
          "You don't have acess to performe this action\nFORBIDDEN",
          403
        )
      );
    }
    next();
  };
};

module.exports.updatePassword = async function (req, res, next) {
  //Checking user
  const user = await User.findOne({ email: req.user.email }).select(
    "+password"
  );
  //Cofirming the current Password
  const match = await user.checkPassword(
    req.body.currentPassword,
    user.password
  );
  if (!match) {
    return next(new NOT_FOUND("Incorect current Password"));
  }
  //updating the user
  user.password = req.body.newPassword;
  await user.save();

  //loging in user with new password and send response
  const token = createJWT(user);

  // ----------------------------- TESTING REMAINING ---------------------------
  user.password = undefined;
  await sendRes(res, 200, token, user);
};

module.exports.sendOTP = async (req, res) => {
  try {
    // 1. Validate email
    const { email } = req.body;
    
    if (!email) {
      console.log("Missing email in OTP request");
      return res.status(400).json({
        status: "error",
        message: "Email is required to send OTP"
      });
    }
    
    console.log(`Processing OTP request for email: ${email}`);
    
    // 2. Check if user with this email already exists
    const existingUser = await User.findOne({ email, preRegistered: false });
    if (existingUser) {
      console.log(`Cannot send OTP - User already exists with email: ${email}`);
      return res.status(400).json({
        status: "error",
        message: "A user with this email already exists. Please login instead."
      });
    }
    
    // 3. Generate OTP (4-digit numeric only)
    const otpLength = Math.max(4, Number(process.env.OTP_LEN) || 4);
    const OTP = generateRandomKey(otpLength);
    
    console.log(`Generated OTP for ${email}: ${OTP}`);
    
    // 4. Save OTP to database with current timestamp
    const currentTime = new Date();
    
    // First, delete any existing OTP for this email to prevent conflicts
    await Otp.deleteOne({ email });
    
    // Then create a new OTP document
    const newOtpDoc = new Otp({
      email,
      otp: OTP,
      time: currentTime
    });
    
    await newOtpDoc.save();
    console.log(`Saved OTP document: ${JSON.stringify(newOtpDoc)}`);
    
    // 5. Send OTP via email
    await sendOTP(email, OTP);
    console.log(`OTP email sent to ${email}`);
    
    // 6. Send success response
    return res.status(200).json({
      status: "success",
      message: "OTP has been sent to your email. Valid for 20 minutes."
    });
    
  } catch (error) {
    console.error("Error sending OTP:", error);
    return res.status(500).json({
      status: "error",
      message: "Failed to send OTP. Please try again."
    });
  }
};

const verifyOtp = async (otp, email) => {
  try {
    if (!otp || !email) {
      console.log("Missing otp or email for verification");
      return false;
    }
    
    console.log(`Attempting to verify OTP: ${otp} for email: ${email}`);
    const otpObj = await Otp.findOne({ email });
    console.log(`Found OTP document:`, otpObj);

    if (!otpObj) {
      console.log(`No OTP found for email: ${email}`);
      return false; // No OTP found for this email
    }

    // Check if OTP has expired (20 minutes)
    const otpCreationTime = new Date(otpObj.time).getTime();
    const currentTime = new Date().getTime();
    const twentyMinutesInMs = 20 * 60 * 1000;
    
    if (currentTime - otpCreationTime > twentyMinutesInMs) {
      console.log(`OTP expired. Created: ${new Date(otpCreationTime).toISOString()}, Current: ${new Date(currentTime).toISOString()}`);
      await Otp.deleteOne({ _id: otpObj._id });
      return false; // OTP expired
    }

    // Normalize both OTPs for comparison (trim whitespace, convert to string)
    const normalizedInputOtp = String(otp).trim();
    const normalizedStoredOtp = String(otpObj.otp).trim();
    
    console.log(`Comparing OTPs - Input: "${normalizedInputOtp}", Stored: "${normalizedStoredOtp}"`);
    
    if (normalizedInputOtp === normalizedStoredOtp) {
      console.log(`OTP verification successful`);
      await Otp.deleteOne({ _id: otpObj._id });
      return true;
    }
    
    console.log(`OTP verification failed. Expected: "${normalizedStoredOtp}", Received: "${normalizedInputOtp}"`);
    return false;
  } catch (error) {
    console.error("Error in verifyOtp:", error);
    return false;
  }
};
