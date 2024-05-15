const express = require('express');
const morgan = require('morgan');

const AppError = require('./utils/appError');
const userRouter = require("./routes/userRoutes");
const globalErrorHandler = require('./controllers/errorController');

const app = express();


// 1) MIDDLEWARES
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

app.use(express.json());
app.use(express.static(`${__dirname}/public`));

// app.use((req, res, next) => {
//   console.log('Hello from the middleware 👋');
//   next();
// });

// 3) ROUTES

app.use('/api/v1/users', userRouter);

//Error handling for all undefined routes
app.all('*', (req, res, next) => {
    // res.status(404).json({
    //     status : 'fail',
    //     message : `Can't find ${req.originalUrl} on this server`
    // })

    // const err = new Error(`Can't find ${req.originalUrl} on this server!`);
    // err.status = 'fail';
    // err.statusCode = 404;

   // next(err);

   next(new AppError(`Can't find ${req.originalUrl} on this server`, 404))

})

//Global error handling middleware
app.use(globalErrorHandler);

module.exports = app;
