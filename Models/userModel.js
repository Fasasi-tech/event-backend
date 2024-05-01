const mongoose = require('mongoose')
const validator = require('validator')
const bcrypt = require('bcryptjs')
const crypto = require('crypto')

const userSchema = new mongoose.Schema({
    first_name:{
        type:String,
        required:[true, 'please enter your first name']
    },
    last_name:{
        type:String,
        required:[true, 'please enter your last name']
    },
    gender:{
        type:String,
        required:[true, 'please provide your gender'],
        enum:['Male', 'Female']
    },
    email:{
        type:String,
        required:[true, 'please enter an email'],
        unique:true,
        lowercase:true,
        validate:[validator.isEmail, 'please enter a valid email']
    },
    phone_number:{
        type:Number,
        min:11,
        required:[true, 'please enter your phone number']
    },
    state:{
        type:String,
        required:[true, 'please Enter your state of residence']
    },
    photo:{
        type:String,
        default:'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png '
    },
    role:{
        type:String,
        enum:['admin', 'user'],
        default:'user'
    },

    password:{
        type:String,
        
        minlength:8,
        select:false //do not get password in the response. i dont want to send the field to the frontend
       },
       
       passwordChangedAt:Date,
       passwordResetToken:String,
       passwordResetTokenExpires:Date


})

userSchema.pre('save', async function(next){
    if(!this.isModified('password'))
        next()

       this.password=await bcrypt.hash(this.password, 12)
       next()
}) 

//comparing the password in the db with the one the user has entered in the login
userSchema.methods.comparePasswordInDb = async function(pswd, pswdDb){
    return  await  bcrypt.compare(pswd, pswdDb)
  }

  userSchema.methods.isPasswordChanged = async function (JWTTimestamp){
    // only if the password was changed, that is when you will see the field passwordChangedAt
    if (this.passwordChangedAt){
         const pswdChangedTimeStamp = parseInt(this.passwordChangedAt.getTime()/10000, 10)
         return JWTTimestamp < pswdChangedTimeStamp // password was changed after jwt was issued
        }
    return false

}
userSchema.methods.createResetPasswordToken = function() {
    const resetToken = crypto.randomBytes(32).toString('hex')
    this.passwordResetToken=crypto.createHash('sha256').update(resetToken).digest('hex')
    this.passwordResetTokenExpires = Date.now() + 10*60*1000

    return resetToken
}

const User = mongoose.model('User', userSchema)

module.exports = User