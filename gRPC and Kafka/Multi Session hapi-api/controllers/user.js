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
    try {
      //check if user exist or not
      const user = await User.findOne({ email });

      if (!user) {
        return h.response({ message: "Invalid credentials" }).code(401);
      }

      //checking the password...
      const passwordMatch = await bcrypt.compare(password, user.password);

      if (passwordMatch) { //if password matches...

        // Check if deviceId exists in cookies
        let deviceId = request.state.deviceId;
        console.log("Retrieved deviceId from cookie:", deviceId); 

        //check if user already loggedIn
        const loggedInUser = await userSession.findOne({ email:email, deviceId:deviceId, activeStatus:true });

        console.log(loggedInUser);

        if (loggedInUser && deviceId) {  //if user loggedIn from same device...
          return h.response({ message: "Already LoggedIn on this Device!!"}).code(200);
        }

        //Now create a new history for the InActive user or the user logging from different device

        //if deviceId not found
        if (!deviceId) {
          deviceId = uuidv4(); // Generate a new one
    
        } 
        
        //create a user id to identify user
        const userId = uuidv4();
        
        //generating IP Address
        const ipAddress = request.headers['x-forwarded-for'] || request.info.remoteAddress;

        //JWT token generation...
        const token = jwt.sign({userId:user.userId},JWT_SECRET,{expiresIn:'1h'});
        
        //creating new login session
        const newUserActivity  = new userSession({
          email,
          userId,
          ipAddress,
          deviceId,
          activeStatus:true,
        });
  
        await newUserActivity.save();

        return h.response({ message: "Login successful", token })
        .state('deviceId', deviceId, { isHttpOnly: true, isSecure: false, path: '/',sameSite: 'Lax'}) // Set the cookie
        .code(200);
      } else {
        return h.response({ message: "Invalid credentials" }).code(401);
      }
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
    
  }
};

module.exports = UserController;
