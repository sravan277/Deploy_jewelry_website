import {body, validationResult} from 'express-validator'


export const registerValidate = [
    body('email').isEmail().withMessage("please provide valid email"),
    body("password").isLength({min:6})
    .withMessage("Provide password with least length 6 characters")
    .matches(/\d/)
    .withMessage("Password must contain atleast one digit")
    .matches(/[a-zA-z]/)
    .withMessage("password must contain atlest one letter"),
    (req, res, next)=>{
        const err = validationResult(req);
        if(!err.isEmpty()){
            return res.status(400).json({error: err.array()})
        }
        next();
    }

    
]

export const loginValidate = [
    body('email').isEmail().withMessage("please provide valid email"),
    body('password').notEmpty().withMessage("Fill in the password"),
    (req, res, next)=>{
        const err = validationResult(req);
        if(!err.isEmpty()){
            return res.status(400).json({error:err.array()})
        }
        next();
    }
]