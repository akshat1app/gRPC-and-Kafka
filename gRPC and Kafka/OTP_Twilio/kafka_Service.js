const { Kafka } = require('kafkajs');
const twilio = require('twilio');
require('dotenv').config();

const kafka = new Kafka({ clientId: 'otp-service', brokers: ['localhost:9092'] });
const consumer = kafka.consumer({ groupId: 'otp-group' });

const accountSid = process.env.accountSid;
const authToken = process.env.authToken;
const twilioClient = new twilio(accountSid, authToken);

async function startConsumer() {
    await consumer.connect();
    await consumer.subscribe({ topic: 'otp-requests', fromBeginning: false });

    await consumer.run({
        eachMessage: async ({ message }) => {
            const { phoneNumber } = JSON.parse(message.value.toString());

            const otp = Math.floor(100000 + Math.random() * 900000);
            console.log(`Sending OTP ${otp} to ${phoneNumber}`);

            await twilioClient.messages.create({
                body: `Your OTP is: ${otp}`,
                from: process.env.twilioNumber,
                to: phoneNumber
            });

            console.log(`OTP sent to ${phoneNumber} via kafka`);
        }
    });
}

startConsumer();
