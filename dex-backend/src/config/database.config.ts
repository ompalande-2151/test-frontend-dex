export default () => ({
  port: parseInt(process.env.PORT || '5000', 10),

  mongoUri: process.env.MONGO_URI,
});
