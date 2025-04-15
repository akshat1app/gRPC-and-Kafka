const grpc = require('grpc');
const protoLoader = require('@grpc/proto-loader');
require("dotenv").config();

const PROTO_PATH = "./otp.proto"; // Path to the OTP proto file
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});
const otpProto = grpc.loadPackageDefinition(packageDefinition);

// gRPC Client Setup
const client = new otpProto.otp.OTPService('127.0.0.1:50051', grpc.credentials.createInsecure());
// ---------------------------------------------------------------------------------------------------------


const User = require('../models/user');
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require('uuid');
const userSession = require('../models/userSession');
require("dotenv").config();

const JWT_SECRET = process.env.JWT_SECRET;

const UserController = {
  
  signUpUser: async (request, h) => {
    const { email, password, name } = request.payload;

    try {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return h.response({ message: "Email already exists" }).code(409); 
      }
      const hashedPassword = await bcrypt.hash(password, 12);

      
      const newUser = new User({
        email,
        password: hashedPassword,
        name
      });

      await newUser.save();

      return h.response({ message: "Signup successful" }).code(201);
    } catch (err) {
      console.error("Signup error:", err);
      return h.response({ message: "Signup failed" }).code(500);
    }
  },
  logInUser: async (request, h) => {
    const { email, password } = request.payload;
    const phoneNumber = request.payload.phoneNumber;
  
    try {
      // Check if user exists
      const user = await User.findOne({ email });
      if (!user) {
        return h.response({ message: "Invalid credentials" }).code(401);
      }
  
      // Validate password
      const passwordMatch = await bcrypt.compare(password, user.password);
      if (!passwordMatch) {
        return h.response({ message: "Invalid credentials" }).code(401);
      }
  
      // Generate JWT Token
      const token = jwt.sign({ userId: user.userId }, JWT_SECRET, { expiresIn: '1h' });
  
      // Get deviceId from cookies
      let deviceId = request.state.deviceId;
      if (!deviceId) {
        deviceId = uuidv4(); // Generate a new deviceId if not found
      }
  
      // Check if user is already logged in
      const loggedInUser = await userSession.findOne({ email, deviceId, activeStatus: true });
  
      if (loggedInUser) {
        return h.response({ message: "Already LoggedIn on this Device!!", token }).code(200);
      }
  
      // If not logged in, send OTP via gRPC
      client.getOtp({ phone_number: phoneNumber }, (error, response) => {
        if (error) {
          console.error("OTP Service Error:", error);
        } else {
            console.log("hello");
          console.log(response.message);
        }
      });
  
      return h.response({
        message: "OTP Sent for Verification",
        token,
      })
        .state('deviceId', deviceId, { isHttpOnly: true, isSecure: false, path: '/', sameSite: 'Lax' })
        .code(200);
      
    } catch (err) {
      console.error("Login error:", err);
      return h.response({ message: "Login failed" }).code(500);
    }
  },
  

  logOutUser :async (request,h) =>{
    const email = request.payload.email;
    console.log(email);
    try {
      const token=request.headers.authorization;
      if (!token) {
        return h.response({ message: 'Authorization header missing' }).code(401);
      }
      const  data= await jwt.verify(token.replace("Bearer ",''),JWT_SECRET);
      if(data.error) {
        return h.response({ message: "Invalid User" }).code(401);
      }
      const deviceId = request.state.deviceId;

      const loggedInUser = await userSession.findOne({ email:email, deviceId:deviceId, activeStatus:true });

      if (loggedInUser) {
        await userSession.updateOne({ email: email, deviceId:deviceId, activeStatus: true }, { $set: { activeStatus: false } });
        return h.response({ message: "Logout successful" }).code(200);
          
      }
      return h.response({ message: "Invalid credentials" }).code(401);
      
    } catch (error) {
      console.error("Logout error:", error);
      return h.response({ message: "Logout failed" }).code(500);
    }
    
  },

  verifyOtp: async (request, h) => {
    const { otp } = request.payload;
  
    return new Promise((resolve, reject) => {
      client.verifyOtp({ otp }, (error, response) => {
        if (error) {
          console.error("OTP Verification Error:", error);
          return resolve(h.response({ message: "OTP Verification Failed" }).code(500));
        }
  
        if (response.verified) {
          resolve(h.response({ message: "OTP Verified Successfully" }).code(200));
        } else {
          resolve(h.response({ message: "Invalid OTP" }).code(400));
        }
      });
    });
  }
  
};

module.exports = UserController;


// {
//     "email":"aks@gmail.com",
//     "password":"Akshat9090",
//     "name":"Akshat",
//     "phoneNumber":"+917268034706",
//     "otp":"154818"
// }
