const dotenv = require('dotenv')
dotenv.config({path: './config.env'})
const express = require('express')
const userRoute = require('./Routes/userRoutes')

const customError = require('./utils/CustomError')
const globalErrorHandler = require('./middleware/errorMiddleware')
const mongoose = require('mongoose')
const cors = require("cors");
const app = express()
const cookieParser = require('cookie-parser');

app.use(cors({
    origin: ['http://localhost:3000', 'https://reel-event.vercel.app' ]// Replace with your frontend URL
  }));

app.use(express.json())
app.use(cookieParser());
const port = 3001
mongoose.connect(process.env.CONN_STR, {
    useNewUrlParser:true
}).then((conn) => {
    console.log(conn)
    console.log('DB Connection Successful')
}).catch((error) => {
    console.log('some error has occured')
})

app.use('/api/v1/users', userRoute)
app.all('*', (req,res, next) => {
    const err = new customError(`can't find ${req.originalUrl} on the server!`, 404)
    next(err)
})

app.use(globalErrorHandler)

app.listen(port, () => console.log(`server is running on port ${port}`))