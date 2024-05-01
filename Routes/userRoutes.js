const express = require('express')

const router = express.Router()
const authController = require('./../Controllers/authController')

router.route('/createUser').post(authController.registerEvent)
router.route('/login').post(authController.login)
router.route('/add-admin').post(authController.createAdmin.seedAdminUser)
router.route('/validate').post(authController.protect, authController.restrict('admin'),authController.validateQRCode)
router.route('/getUsers').get(authController.getUsers)
router.route('/getUsers/:id').get( authController.getSingleUser)
// router.route('/forgotPassword').post(authController.forgotPassword)
// router.route('/resetPassword/:token').patch(authController.resetPassword)
router.route('/getGenderStats').get( authController.getGenderStats)
router.route('/getStateCount').get(authController.getStateCount)
router.route('/logout').post(authController.logout)
router.route('/getUserProfile').get(authController.protect, authController.getUserProfile)
module.exports=router