import User from "../models/User.js"

export const fetchuser=(req, res)=>{
    try{
        res.json({
            id:req.user.id,
            email: req.user.email,
            name: req.user.name            
        })
    }catch(err){
        res.status(500).json({
            message:"Error fetching details"
        })
    }
}
export const updateuser = async(req, res) =>{
    try{
        const validUpdates = ["name", "email"];
        const updates = {};

        validUpdates.forEach(e =>{
            if(req.body[e] !== undefined){
                updates[e] = req.body[e];
            }
        })

        if(Object.keys(updates).length === 0){
            return res.status(400).json({
                message:"No valid feilds are given"
            })
        }

        const user = await User.findByIdAndUpdate(
            req.user.id,
            {$set: updates},
            {   new: true, 
                runValidators:true
            }
        ).select("-password")

        res.status(200).json({
            user
        })
    }catch(err){
        res.status(400).json({
            message:"Update failed"
        })  
    }
}
export const deleteuser = async(req, res)=>{
    try{
        await User.findByIdAndDelete(req.user.id);
        res.status(200).json({message:"deleted successfully"})
    }catch(err){
        res.status(400).json({
            message:"An error occured while deleting"
        })
    }
}