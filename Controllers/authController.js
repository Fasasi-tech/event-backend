const CustomError = require('../utils/CustomError')
const User = require('./../Models/userModel')
const QRCode = require('qrcode');
const asyncErrorHandler = require('./../utils/asyncErrorHandler')
const {sendEmail} = require('../utils/email')
const jwt = require('jsonwebtoken')
const bcrypt=require('bcryptjs')
const crypto = require('crypto')
const util = require('util')
const {generatePasswordResetTemplate} = require('../utils/mail')

const signToken = id => {
    return jwt.sign({id}, process.env.SECRET_STR, {
        expiresIn: process.env.LOGIN_EXPIRES

})
}

const createSendResponse = (user, statusCode, res ) =>{

    const token = signToken(user._id)

    const options={
        maxAge: process.env.LOGIN_EXPIRES,
        //it should be applied only on production mode 
        // secure:true,
        httpOnly:true
    }

    if (process.env.NODE_ENV ==='production'){
        options.secure = true
    }
    res.cookie('jwt', token, options )
    user.password= undefined
    res.status(statusCode).json({
        status:'success',
         token,
        data:{
            user
         }
       })

}


exports.registerEvent = asyncErrorHandler(async(req, res, next) =>{
    const {email, first_name, last_name, gender, photo, phone_number, state} = req.body
    const existingUser = await User.findOne({email})
    if(existingUser){
        const error = new CustomError('Email address already registered')
        return next(error)
    }
    if (!email || !first_name || !last_name || !gender ||!phone_number ||!state){
        const error = new CustomError('please provide the required information', 400)
        return next(error)
    }
    
    
const newUser = new User({
    email, first_name, last_name, gender, photo, phone_number, state
})

await newUser.save()

const qrData = `id: ${newUser._id}, First Name: ${newUser.first_name}, Last Name: ${newUser.last_name}, Email: ${newUser.email} `
const qrCode = await QRCode.toDataURL(qrData)
console.log("QR code", qrCode)

const sent_to = newUser.email
const sent_from = process.env.EMAIL_OWNER
const reply_to = newUser.email
const subject = 'Event Registration QR Code'
const message = `<p>Dear ${newUser.first_name},</p><p>Please find your QR code attached below:</p>`
attachments= [
    {
        filename: 'Event.png',
        content: qrCode.split(',')[1],
        encoding: 'base64',
    },
],
await sendEmail(subject, message, sent_to, sent_from, reply_to, attachments)

res.status(201).json({
    status:'success',
    newUser
})
    
})



exports.createAdmin=  {
    seedAdminUser: asyncErrorHandler(async(req, res, next) =>{
    const existingsuperAdmin= await User.findOne({role:'admin'})
    
    if (existingsuperAdmin){
        const error = new CustomError('superAdmin user already exists', 400)
        return next(error);
    }

    const newUser = new User({
        first_name:'Ridwan',
        last_name:"Fasasi",
        email:'rfasasi@reeltechsolutions.com',
        role:'admin',
        password:'Fasasi09160598619',
        state:'lagos',
        gender:'Male',
        phone_number:"09090042494"
    })

    await newUser.save()
    createSendResponse(newUser, 201, res)
    
 }) 
}

// exports.forgotPassword = asyncErrorHandler(async (req, res, next) =>{
//     //Get user based on posted email
//     const user = await User.findOne({email:req.body.email})
//     if(!user){
//         const error = new CustomError('We could not find the user with given email', 404)
//         return next(error)
//     }

//     // Generate a random reset token if users exists
//     const resetToken = user.createResetPasswordToken()

//     await user.save({validateBeforeSave:false})
//     // send the token back to the user email
//     const resetUrl=`${req.protocol}://${req.get('host')}/api/v1/users/resetPassword/${resetToken}`
//     // const message = `We have received a password reset request. Please use the below link to reset your password \n \n ${resetUrl} \n\n This reset password link will be valid on for 10 minutes.`
//     const sent_to = user.email;
//      const sent_from = process.env.EMAIL_USER;
//     const reply_to = user.email;
//     const subject = "PASSWORD RESET";
//     const message = generatePasswordResetTemplate(resetUrl)

//     await sendEmail(subject, message, sent_to, sent_from, reply_to)
//     try{

//     // await new Email(user,resetUrl).sendPasswordReset()
//     res.status(200).json({
//         status:'success',
//         message:'Password reset link sent to the user'
//     })
// } catch(err){
//     user.passwordResetToken = undefined;
//     user.passwordResetTokenExpires = undefined;
//     user.save({validateBeforeSave:false})

//     return next(new CustomError('There was an error sending password reset email. Please try again later', 500))
// }
//  })

//  exports.resetPassword = asyncErrorHandler (async (req, res, next) =>{
//     // IF THE USER EXISTS WITH THE GIVEN TOKEN AND TOKEN HAS NOT EXPIRED
//     const token = crypto.createHash('sha256').update(req.params.token).digest('hex')
//     const user = await User.findOne({passwordResetToken:token, passwordResetTokenExpires: {$gt:Date.now()}});
//     if(!user){
//         const error = new CustomError('Token is inValid or has expired', 400)
//         next(error)
//     }

    
//     console.log("User before password reset:", user); 
//     // RESETTING THE USER PASSWORD
//     user.password = req.body.password
//     //user.confirmPassword = req.body.confirmPassword
//     user.passwordResetToken = undefined;
//     user.passwordResetTokenExpires = undefined;
//     user.passwordChangedAt = Date.now()

//     user.save()

//     createSendResponse(user, 200, res)

// //     const loginToken = signToken(user._id)

// //     res.status(200).json({
// //         status:'success',
// //         token:loginToken
       
// //     })
//  })




exports.login =asyncErrorHandler(async(req, res, next) =>{
    const {email, password} = req.body;

    if(!email || !password){
        const error = new CustomError('Please provide email ID & Password', 404)
        return next(error);
    }

    //if user exist in this given db
    // showing the password in the payload
    const user = await User.findOne({email}).select('+password')
    //const isMatch = await user.comparePasswordInDb(password, user.password)
    //check if the user exists & password matches
    // const url=`${req.protocol}://${req.get('host')}`
    // console.log(url)
    // await new Email(createUser, url).sendWelcome()

    if(!user || !(await user.comparePasswordInDb(password, user.password))){
        const error = new CustomError('Incorrect email or password', 400)
        return next(error)
    }

    
    createSendResponse(user, 200, res)

  
})



exports.validateQRCode =asyncErrorHandler(async(req,res, next) =>{
    const {qrData} = req.body;
    const userId = qrData.split('id: ')[1].split(',')[0].trim()

    const user = await User.findById(userId)

    if (!user){
        new CustomError('You are not part of the invitee', 404)
    }

    res.status(200).json({
        status:'success',
       user
    })
})

exports.getUsers= asyncErrorHandler(async(req, res, next) => {

    const user = await User.find({})

    createSendResponse(user, 200, res)
})


exports.getSingleUser= asyncErrorHandler(async(req, res, next) => {

    const {id} = req.params
    const user = await User.findById(id)

    createSendResponse(user, 200, res)
})

exports.protect = asyncErrorHandler(async (req, res, next) =>{
    //Read the token & check if the token actually exists 
    const testToken = req.headers.authorization;
    let token
    if(testToken && testToken.startsWith('Bearer')){
        token= testToken.split(' ')[1]
    }
    if(!token){
        next(new CustomError('You are not logged in', 401))
    }
    //validate the token
    const decodedToken=  await util.promisify(jwt.verify)(token, process.env.SECRET_STR)
    // if the user exists in the db

    const user = await User.findById(decodedToken.id) // getting the id of the user through the decodedToken
    if(!user){
        next(new CustomError('The user with the given token does not exist', 401))
    }

    const isPasswordChanged = await user.isPasswordChanged(decodedToken.iat)
    //if the user changed password after the token was issued, you would not be able to access the route.
    if(isPasswordChanged){
        const error = new CustomError('The password has been changed recently, please login again', 401)
        return next(error)
    }
    // // allow user to access route
    req.user = user
    next()

})
exports.restrict = (...roles) =>{
    return (req, res, next) =>{
        if(!roles.includes(req.user.role)){
            const error = new CustomError('You do not have permission to perform this action', 403);
            next(error)
        }
        next()
    }
  
}

exports.getGenderStats = asyncErrorHandler(async(req, res, next) =>{
    const stats = await User.aggregate([
        {
            $group:{
                _id:"$gender",
                count:{$sum:1}
            }
        }
    ])
    createSendResponse(stats, 200, res)
})

exports.getStateCount = asyncErrorHandler(async(req, res, next) =>{
    const stats= await User.aggregate([
        {
            $group:{
                _id: '$state',
                count:{$sum:1}
            }
        }
    ])

    createSendResponse(stats, 200, res)
})
exports.getUserProfile= asyncErrorHandler(async (req, res, next) =>{
    const user = await User.findById(req.user._id)

    if(!user){
        return next(new CustomError('User not found!'))
    }

   createSendResponse(user, 200, res)
})



exports.logout = asyncErrorHandler(async (req, res, next) =>{

    res.cookie('jwt', '', {
        httpOnly: true,
        expires: new Date(0),
      });

      res.status(200).json({
        status:'Logged out successfully',
      
    })
})

