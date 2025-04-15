const Hapi = require('@hapi/hapi');
const mongoose = require('mongoose');
const routes = require('./routes/url');

const mongoURI = process.env.MONGODB_URI;
console.log(process.env.MONGODB_URI);
mongoose.connect(mongoURI)
  .then(() => console.log('MongoDB Connected'))
  .catch(err => console.error('MongoDB Connection Error:', err));

const init = async () => {
  const server = Hapi.server({
    port: process.env.PORT || 3000,
    host: 'localhost',
  });

  server.route(routes);

  await server.start();
  console.log('Server running on %s', server.info.uri);
};

process.on('unhandledRejection', (err) => {
  console.error(err);
  process.exit(1);
});

init();