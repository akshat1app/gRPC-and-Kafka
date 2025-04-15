const UserController = require('../controllers/user');
const gRPCController = require('../controllers/gRPCUser');
const kafkaController = require('../controllers/kafkaUser');

const routes = [
  { method: 'POST', path: '/user/signup', handler: UserController.signUpUser },
  { method: 'POST', path: '/user/login', handler: UserController.logInUser },
  { method: 'POST', path: '/user/logout', handler: UserController.logOutUser },
  { method: 'POST', path: '/user/api/login', handler: gRPCController.logInUser },
  { method: 'POST', path: '/user/api/verify', handler: gRPCController.verifyOtp },
  { method: 'POST', path: '/user/api/api/login', handler: kafkaController.logInUser },



];

module.exports = routes;