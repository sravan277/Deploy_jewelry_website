import User from "../models/User.js";
import { generateToken } from '../middleware/auth.js';


export const register = async(req, res) =>{
    try {
        const {email, password, name} = req.body;
        const existingUser = await User.findOne({email});
        if(existingUser){
                return res.status(400).json({
                    status: 'error',
                    message: 'Email is already registered'
                })
        }

        const user = new User({email, password, name})
        await user.save();

        const token = generateToken(user._id.toString());
        res.status(201).json({
            status: "success",
            data:{
                token,
                user:{
                    id:user._id.toString(),
                    email:user.email,
                    name:user.name
                }
            }
        })
        
    } catch (error) {
        console.log("Error", error)
        res.status(500).json({
            status:"error",
            message: "An error has occured during Registation. Please, try again!"
        })
    }
} 

export const login = async(req, res)=>{
    try{
        const {email, password} = req.body;
        const user = await User.findOne({email});
        if(!user){
            return res.status(404).json({
                status:"error",
                message:"Invalid email or password"
            })
        }

        const validatePass = await user.comparePassword(password);
        if(!validatePass){
            return res.status(400).json({
                status:"error",
                message: "Invalid email or password"
            })
        }

        const token = generateToken(user._id.toString());
        res.status(200).json({
            status: "success",
            data:{
                token,
                user:{
                    id:user._id.toString(),
                    email:user.email,
                    name:user.name
                }
            }
        })

    }catch(error){
        console.log("Error", error)
        res.status(400).json({
            status:"error",
            message:"An error has occured, try again later"
        })
    }
}