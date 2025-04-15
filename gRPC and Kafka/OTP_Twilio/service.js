const twilio=require("twilio");
const express=require("express");
const app=express();
app.use(express.json());

require('dotenv').config()
let otp=null;

const accountSid=process.env.accountSid;
const authToken=process.env.authToken;
const client=new twilio(accountSid,authToken);

function generateOTP() {
    const min = 100000; // Minimum 6-digit number
    const max = 999999; // Maximum 6-digit number
    return Math.floor(Math.random() * (max - min + 1)) + min;
}



app.post("/getOtp",(req,res)=>{

    const body=req.body;
   
    otp = generateOTP();

    client.messages.create({
        body:`otp for verification ${otp}`,
        from: process.env.twilioNumber,
        to:body.to
        // to:"+917268034706"
    }).then((messages)=>{
        console.log("message sent " + messages.sid);
        res.status(200).json({msg:"otp sent successfully"});
    }).catch((error)=>{
        console.error(error);
        res.status(400).json({msg:error});
    });
});

app.post("/verifyOtp",(req,res)=>{
    console.log(otp);
    const body=req.body;
    if(body.otp==otp){
        res.status(200).json({msg:"otp verified"});
    }
    else{
        res.status(400).json({msg:"invalid otp"});
    }
});

app.listen(4000,()=>{
    console.log("server is running at 4000");
})