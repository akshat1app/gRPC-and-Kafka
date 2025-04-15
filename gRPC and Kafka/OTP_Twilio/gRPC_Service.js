const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const twilio = require("twilio");
require("dotenv").config();

// Load the .proto file
const PROTO_PATH = "./otp.proto";
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const otpProto = grpc.loadPackageDefinition(packageDefinition);

let otp = null;

const accountSid = process.env.accountSid;
const authToken = process.env.authToken;
const client = new twilio(accountSid, authToken);

function generateOTP() {
  const min = 100000;
  const max = 999999;
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

const getOtp = (call, callback) => {
  const phoneNumber = call.request.phone_number;
  otp = generateOTP(); // Generate a new OTP
  console.log(phoneNumber);
  client.messages
    .create({
      body: `OTP for verification: ${otp}`,
      from: process.env.twilioNumber,
      to: phoneNumber,
    })
    .then((message) => {
      console.log("Message sent:", message.sid);
      callback(null, { message: "OTP sent successfully via gRPC", success: true });
    })
    .catch((err) => {
      console.error("Error sending OTP:", err);
      callback(null, { message: "Error sending OTP", success: false });
    });
};

const verifyOtp = (call, callback) => {
  const otpToVerify = call.request.otp;
  console.log(otpToVerify, otp);
  if (otpToVerify == otp) {
    callback(null, { verified: true, message: "OTP verified" });
  } else {
    callback(null, { verified: false, message: "Invalid OTP" });
  }
};

// Create and start the gRPC server
const server = new grpc.Server();
server.addService(otpProto.otp.OTPService.service, { getOtp, verifyOtp });

server.bindAsync(
  "127.0.0.1:50051",
  grpc.ServerCredentials.createInsecure(),
  () => {
    console.log("OTP Service listening on 127.0.0.1:50051");
  }
);
